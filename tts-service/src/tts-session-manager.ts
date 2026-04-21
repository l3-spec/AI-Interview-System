import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Qwen3TTSClient, Qwen3TTSConfig } from './qwen3-tts-client';
import { RedisEventBus } from './redis-event-bus';
import { logger } from './logger';

/**
 * TTS 会话实体：管理一个客户端连接 ↔ 一个 DashScope Qwen3-TTS 连接
 *
 * 双轨混合流式架构下的数据流：
 *   客户端/Backend → [text chunks] → TTS Service → [text chunks] → DashScope Qwen3-TTS
 *                                   TTS Service ← [audio chunks] ← DashScope Qwen3-TTS
 *   客户端         ← [audio chunks] ← TTS Service
 */
interface TTSSession {
  sessionId: string;
  /** 客户端 WebSocket（可能是移动端直连，也可能是 backend-api 转发） */
  clientWs: WebSocket;
  ttsClient: Qwen3TTSClient;
  createdAt: Date;
  /** 已合成的文本字符数 */
  charCount: number;
  /** 已发送的音频块数 */
  audioChunkCount: number;
  state: 'connecting' | 'active' | 'finishing' | 'closed';
}

export interface CreateTTSSessionOptions {
  sessionId?: string;
  voice?: string;
  sampleRate?: number;
  responseFormat?: string;
  mode?: string;
  language?: string;
  instructions?: string;
}

/**
 * TTS 会话管理器（单例）
 *
 * 支持两种使用模式：
 * 1. 客户端直连模式：客户端通过 WebSocket 直接发送文本、接收音频
 * 2. Backend 触发模式：backend-api 通过 Redis 发送文本，音频通过 Redis/WebSocket 回传
 */
export class TTSSessionManager {
  private static instance: TTSSessionManager;
  private sessions = new Map<string, TTSSession>();
  private redisBus: RedisEventBus | null = null;

  private constructor() {}

  static getInstance(): TTSSessionManager {
    if (!TTSSessionManager.instance) {
      TTSSessionManager.instance = new TTSSessionManager();
    }
    return TTSSessionManager.instance;
  }

  setRedisBus(bus: RedisEventBus) {
    this.redisBus = bus;
  }

  /**
   * 创建新的 TTS 会话
   */
  async createSession(clientWs: WebSocket, options: CreateTTSSessionOptions): Promise<string> {
    const sessionId = options.sessionId || uuidv4();

    if (this.sessions.has(sessionId)) {
      await this.destroySession(sessionId);
    }

    const ttsConfig: Qwen3TTSConfig = {
      voice: options.voice || process.env.TTS_VOICE || 'Cherry',
      sampleRate: options.sampleRate || parseInt(process.env.TTS_SAMPLE_RATE || '24000', 10),
      responseFormat: options.responseFormat || process.env.TTS_RESPONSE_FORMAT || 'pcm',
      mode: (options.mode as 'server_commit' | 'commit') || (process.env.TTS_MODE as any) || 'server_commit',
      language: options.language || process.env.TTS_LANGUAGE || 'Auto',
      instructions: options.instructions || process.env.TTS_INSTRUCTIONS || undefined,
    };

    const ttsClient = new Qwen3TTSClient(ttsConfig, {
      onSessionCreated: (sessionInfo) => {
        this.sendToClient(sessionId, {
          type: 'tts.session_created',
          sessionId,
          dashscopeSessionId: sessionInfo?.id,
        });
      },

      onAudioDelta: (audioBase64, responseId) => {
        const session = this.sessions.get(sessionId);
        if (session) session.audioChunkCount++;

        // 将音频数据块实时推送给客户端（双轨 Track 2）
        this.sendToClient(sessionId, {
          type: 'tts.audio_chunk',
          sessionId,
          audio: audioBase64,
          responseId,
          timestamp: Date.now(),
        });

        // 同时通过 Redis 发布（backend-api 可订阅用于数字人唇形同步等）
        this.publishEvent(sessionId, 'audio_chunk', {
          audio: audioBase64,
          responseId,
        });
      },

      onResponseDone: (responseId) => {
        this.sendToClient(sessionId, {
          type: 'tts.response_done',
          sessionId,
          responseId,
        });
        this.publishEvent(sessionId, 'response_done', { responseId });
      },

      onSessionFinished: () => {
        this.sendToClient(sessionId, {
          type: 'tts.session_finished',
          sessionId,
        });
        const session = this.sessions.get(sessionId);
        if (session) session.state = 'closed';
      },

      onError: (error) => {
        this.sendToClient(sessionId, {
          type: 'tts.error',
          sessionId,
          error,
        });
      },
    });

    const session: TTSSession = {
      sessionId,
      clientWs: clientWs,
      ttsClient,
      createdAt: new Date(),
      charCount: 0,
      audioChunkCount: 0,
      state: 'connecting',
    };

    this.sessions.set(sessionId, session);

    try {
      await ttsClient.connect();
      session.state = 'active';
      logger.info(`[TTS-Manager] 会话 ${sessionId} 已创建并激活`);
    } catch (err: any) {
      session.state = 'closed';
      this.sessions.delete(sessionId);
      throw new Error(`建立 DashScope TTS 连接失败: ${err.message}`);
    }

    return sessionId;
  }

  /**
   * 追加文本到指定会话（双轨 Track 1：文本流式输入）
   * 可从客户端 WebSocket 或 Redis 指令触发
   */
  async appendText(sessionId: string, text: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      throw new Error(`TTS 会话 ${sessionId} 不存在或已关闭`);
    }

    session.ttsClient.appendText(text);
    session.charCount += text.length;
  }

  /**
   * 手动提交文本缓冲区（commit 模式下使用）
   */
  async commitText(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      throw new Error(`TTS 会话 ${sessionId} 不存在或已关闭`);
    }
    session.ttsClient.commitText();
  }

  /**
   * 清空文本缓冲区（中断当前合成）
   */
  async clearText(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return;
    session.ttsClient.clearTextBuffer();
  }

  /**
   * 结束 TTS 会话
   */
  async finishSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'finishing';
    session.ttsClient.finish();
    logger.info(`[TTS-Manager] 会话 ${sessionId} 正在结束`);
  }

  /**
   * 销毁指定会话
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.ttsClient.close();
    session.state = 'closed';
    this.sessions.delete(sessionId);
    logger.info(`[TTS-Manager] 会话 ${sessionId} 已销毁`);
  }

  /**
   * 销毁所有会话
   */
  async destroyAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.destroySession(id);
    }
    logger.info('[TTS-Manager] 所有会话已清理');
  }

  /**
   * 通过 sessionId 查找会话并追加文本（供 Redis 指令调用）
   */
  async handleRedisTextCommand(sessionId: string, text: string, commit?: boolean): Promise<void> {
    await this.appendText(sessionId, text);
    if (commit) {
      await this.commitText(sessionId);
    }
  }

  private sendToClient(sessionId: string, data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.clientWs.readyState !== WebSocket.OPEN) return;

    try {
      session.clientWs.send(JSON.stringify(data));
    } catch (err: any) {
      logger.error(`[TTS-Manager] 发送消息到客户端失败: ${err.message}`);
    }
  }

  private publishEvent(sessionId: string, event: string, payload: any): void {
    if (!this.redisBus) return;

    this.redisBus.publish('tts:events', {
      sessionId,
      event,
      payload,
      timestamp: Date.now(),
      source: 'tts-service',
    });
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getSessionList(): Array<{ sessionId: string; state: string; createdAt: Date; charCount: number; audioChunks: number }> {
    return Array.from(this.sessions.values()).map(s => ({
      sessionId: s.sessionId,
      state: s.state,
      createdAt: s.createdAt,
      charCount: s.charCount,
      audioChunks: s.audioChunkCount,
    }));
  }
}
