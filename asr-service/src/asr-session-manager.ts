import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Qwen3ASRClient, Qwen3ASRConfig } from './qwen3-asr-client';
import { RedisEventBus } from './redis-event-bus';
import { logger } from './logger';

/**
 * ASR 会话实体：管理一个客户端 WebSocket ↔ 一个 DashScope Qwen3-ASR 连接
 */
interface ASRSession {
  sessionId: string;
  clientWs: WebSocket;
  asrClient: Qwen3ASRClient;
  createdAt: Date;
  /** 累计已发送的音频时长(ms)估算 */
  audioMs: number;
  state: 'connecting' | 'active' | 'finishing' | 'closed';
}

export interface CreateSessionOptions {
  sessionId?: string;
  language?: string;
  sampleRate?: number;
  inputFormat?: string;
  vadMode?: string;
  vadSilenceDurationMs?: number;
}

/**
 * ASR 会话管理器（单例）
 * 负责管理所有活跃的 ASR 会话，每个会话维护：
 *   客户端 WebSocket ↔ ASR Service ↔ DashScope Qwen3-ASR WebSocket
 */
export class ASRSessionManager {
  private static instance: ASRSessionManager;
  private sessions = new Map<string, ASRSession>();
  private redisBus: RedisEventBus | null = null;

  private constructor() {}

  static getInstance(): ASRSessionManager {
    if (!ASRSessionManager.instance) {
      ASRSessionManager.instance = new ASRSessionManager();
    }
    return ASRSessionManager.instance;
  }

  setRedisBus(bus: RedisEventBus) {
    this.redisBus = bus;
  }

  /**
   * 创建新的 ASR 会话
   * 1. 为客户端分配 sessionId
   * 2. 建立到 DashScope Qwen3-ASR 的 WebSocket 连接
   * 3. 将两侧的数据流桥接起来
   */
  async createSession(clientWs: WebSocket, options: CreateSessionOptions): Promise<string> {
    const sessionId = options.sessionId || uuidv4();

    // 如果该 session 已存在，先销毁旧连接
    if (this.sessions.has(sessionId)) {
      await this.destroySession(sessionId);
    }

    const asrConfig: Qwen3ASRConfig = {
      language: options.language || 'zh',
      sampleRate: options.sampleRate || 16000,
      inputFormat: options.inputFormat || 'pcm',
      vadMode: (options.vadMode as 'server_vad' | 'manual') || 'server_vad',
      vadSilenceDurationMs: options.vadSilenceDurationMs || 500,
    };
    
    logger.info(
      `[ASR-Manager] createSession: sessionId=${sessionId} lang=${asrConfig.language} format=${asrConfig.inputFormat} model(env)=${process.env.QWEN_ASR_MODEL ?? 'default'}`,
    );

    // 创建 Qwen3-ASR 客户端，注册回调 → 将识别结果转发给客户端 WebSocket
    const asrClient = new Qwen3ASRClient(asrConfig, {
      onSessionCreated: (sessionInfo) => {
        this.sendToClient(sessionId, {
          type: 'asr.session_created',
          sessionId,
          dashscopeSessionId: sessionInfo?.id,
        });
      },

      onSpeechStarted: () => {
        this.sendToClient(sessionId, {
          type: 'asr.speech_started',
          sessionId,
          timestamp: Date.now(),
        });
        // 通过 Redis 发布事件，通知 backend-api 用户开始说话
        this.publishEvent(sessionId, 'speech_started', {});
      },

      onSpeechStopped: () => {
        this.sendToClient(sessionId, {
          type: 'asr.speech_stopped',
          sessionId,
          timestamp: Date.now(),
        });
        this.publishEvent(sessionId, 'speech_stopped', {});
      },

      onTranscriptionText: (text, stash) => {
        // 中间结果（流式部分文本）→ 客户端可用于实时字幕
        this.sendToClient(sessionId, {
          type: 'asr.transcription_partial',
          sessionId,
          text,
          stash,
          isFinal: false,
          timestamp: Date.now(),
        });
      },

      onTranscriptionCompleted: (transcript) => {
        // 最终识别结果 → 转发给客户端 + 通过 Redis 发布给 backend-api
        this.sendToClient(sessionId, {
          type: 'asr.transcription_final',
          sessionId,
          text: transcript,
          isFinal: true,
          timestamp: Date.now(),
        });
        this.publishEvent(sessionId, 'transcription_completed', { text: transcript });
      },

      onSessionFinished: () => {
        this.sendToClient(sessionId, {
          type: 'asr.session_finished',
          sessionId,
        });
        const session = this.sessions.get(sessionId);
        if (session) {
          session.state = 'closed';
        }
      },

      onError: (error) => {
        this.sendToClient(sessionId, {
          type: 'asr.error',
          sessionId,
          error,
        });
      },
    });

    const session: ASRSession = {
      sessionId,
      clientWs: clientWs,
      asrClient,
      createdAt: new Date(),
      audioMs: 0,
      state: 'connecting',
    };

    this.sessions.set(sessionId, session);

    try {
      await asrClient.connect();
      session.state = 'active';
      logger.info(`[ASR-Manager] 会话 ${sessionId} 已创建并激活`);
    } catch (err: any) {
      session.state = 'closed';
      this.sessions.delete(sessionId);
      throw new Error(`建立 DashScope 连接失败: ${err.message}`);
    }

    return sessionId;
  }

  /**
   * 追加音频数据到指定会话
   */
  async appendAudio(sessionId: string, audioBase64: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      // 静默丢弃：会话不存在或已关闭时不再抛异常
      // 由调用方决定是否通知客户端
      return false;
    }

    session.asrClient.appendAudio(audioBase64);

    const audioBytes = Buffer.from(audioBase64, 'base64').length;
    const sampleRate = parseInt(process.env.ASR_SAMPLE_RATE || '16000', 10);
    session.audioMs += (audioBytes / (sampleRate * 2)) * 1000;
    return true;
  }

  /**
   * 手动提交音频缓冲区
   */
  async commitAudio(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      throw new Error(`会话 ${sessionId} 不存在或已关闭`);
    }
    session.asrClient.commitAudio();
  }

  /**
   * 结束指定会话
   */
  async finishSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'finishing';
    session.asrClient.finish();
    logger.info(`[ASR-Manager] 会话 ${sessionId} 正在结束`);
  }

  /**
   * 销毁指定会话（强制断开连接并清理）
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.asrClient.close();
    session.state = 'closed';
    this.sessions.delete(sessionId);
    logger.info(`[ASR-Manager] 会话 ${sessionId} 已销毁`);
  }

  /**
   * 销毁所有会话
   */
  async destroyAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.destroySession(id);
    }
    logger.info('[ASR-Manager] 所有会话已清理');
  }

  /**
   * 向客户端 WebSocket 发送消息
   */
  private sendToClient(sessionId: string, data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.clientWs.readyState !== WebSocket.OPEN) return;

    try {
      session.clientWs.send(JSON.stringify(data));
    } catch (err: any) {
      logger.error(`[ASR-Manager] 发送消息到客户端失败: ${err.message}`);
    }
  }

  /**
   * 通过 Redis 发布 ASR 事件（供 backend-api 订阅）
   */
  private publishEvent(sessionId: string, event: string, payload: any): void {
    if (!this.redisBus) return;

    this.redisBus.publish('asr:events', {
      sessionId,
      event,
      payload,
      timestamp: Date.now(),
      source: 'asr-service',
    });
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getSessionList(): Array<{ sessionId: string; state: string; createdAt: Date; audioMs: number }> {
    return Array.from(this.sessions.values()).map(s => ({
      sessionId: s.sessionId,
      state: s.state,
      createdAt: s.createdAt,
      audioMs: Math.round(s.audioMs),
    }));
  }
}
