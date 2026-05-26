import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ASREventCallbacks, Qwen3ASRClient, Qwen3ASRConfig } from './qwen3-asr-client';
import { VolcASRClient, VolcASRConfig } from './volc-asr-client';
import { RedisEventBus } from './redis-event-bus';
import { logger } from './logger';

/**
 * ASR 会话实体：管理一个客户端 WebSocket ↔ 一个 ASR 服务连接
 */
interface ASRSession {
  sessionId: string;
  clientWs: WebSocket;
  asrClient: Qwen3ASRClient | VolcASRClient;
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
 *   客户端 WebSocket ↔ ASR Service ↔ ASR Provider (Volcengine/DashScope)
 */
export class ASRSessionManager {
  private static instance: ASRSessionManager;
  private sessions = new Map<string, ASRSession>();
  private redisBus: RedisEventBus | null = null;

  // 合法参数定义：用于校验客户端传入的 session 配置
  private static readonly VALID_VAD_MODES = ['server_vad', 'manual'];
  private static readonly VALID_SAMPLE_RATES = [8000, 16000, 24000];
  private static readonly VALID_LANGUAGES = ['zh', 'en', 'ja', 'ko'];

  private constructor() {
    this.startZombieSessionCleaner();
  }

  /**
   * 校验 session 创建参数
   * 返回 valid=false 时附带可读的中文错误信息，用于回传客户端
   */
  private validateSessionConfig(config: CreateSessionOptions): { valid: boolean; error?: string } {
    // VAD 模式校验
    if (config.vadMode && !ASRSessionManager.VALID_VAD_MODES.includes(config.vadMode)) {
      return {
        valid: false,
        error: `无效的 VAD 模式: "${config.vadMode}", 支持: ${ASRSessionManager.VALID_VAD_MODES.join('/')}`,
      };
    }

    // 采样率校验
    if (config.sampleRate && !ASRSessionManager.VALID_SAMPLE_RATES.includes(config.sampleRate)) {
      return {
        valid: false,
        error: `无效的采样率: ${config.sampleRate}, 支持: ${ASRSessionManager.VALID_SAMPLE_RATES.join('/')}`,
      };
    }

    // 语言校验
    if (config.language && !ASRSessionManager.VALID_LANGUAGES.includes(config.language)) {
      return {
        valid: false,
        error: `无效的语言: "${config.language}", 支持: ${ASRSessionManager.VALID_LANGUAGES.join('/')}`,
      };
    }

    return { valid: true };
  }

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
   * 2. 建立到 ASR 服务商的 WebSocket 连接
   * 3. 将两侧的数据流桥接起来
   */
  async createSession(clientWs: WebSocket, options: CreateSessionOptions): Promise<string> {
    const sessionId = options.sessionId || uuidv4();

    // 参数校验：vadMode / sampleRate / language 必须落在白名单内
    const validation = this.validateSessionConfig(options);
    if (!validation.valid) {
      logger.warn(`[ASR-Manager] 参数校验失败 (${sessionId}): ${validation.error}`);
      // 发送错误给客户端
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify({
            type: 'asr.error',
            sessionId,
            error: 'invalid_config',
            message: validation.error,
          }));
        } catch (e: any) {
          logger.warn(`[ASR-Manager] 回送 invalid_config 失败 (${sessionId}): ${e?.message || e}`);
        }
      }
      throw new Error(validation.error);
    }

    // 幂等检测：如果已存在相同 sessionId 的会话，先销毁旧的
    if (this.sessions.has(sessionId)) {
      logger.warn(`[ASR-Manager] 检测到重复 sessionId: ${sessionId}, 先销毁旧会话`);
      await this.destroySession(sessionId);
    }

    const provider = process.env.ASR_PROVIDER || 'volcengine';
    const language = options.language || process.env.ASR_LANGUAGE || 'zh';
    const sampleRate = options.sampleRate || parseInt(process.env.ASR_SAMPLE_RATE || '16000', 10);
    const inputFormat = options.inputFormat || process.env.ASR_INPUT_FORMAT || 'pcm';
    const vadMode = (options.vadMode || process.env.ASR_VAD_MODE || 'server_vad') as 'server_vad' | 'manual';
    const vadSilenceDurationMs = options.vadSilenceDurationMs || parseInt(process.env.ASR_VAD_SILENCE_DURATION_MS || '500', 10);

    logger.info(
      `[ASR-Manager] createSession: sessionId=${sessionId} provider=${provider} lang=${language} format=${inputFormat}`,
    );

    let asrClient: Qwen3ASRClient | VolcASRClient;

    // 注册回调 → 将识别结果转发给客户端 WebSocket
    const callbacks: ASREventCallbacks = {
      onSessionCreated: (sessionInfo) => {
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.session_created',
          sessionId,
          providerSessionId: sessionInfo?.id,
          provider,
        });
      },

      onSpeechStarted: () => {
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.speech_started',
          sessionId,
          timestamp: Date.now(),
        });
        // 通过 Redis 发布事件，通知 backend-api 用户开始说话
        this.publishEvent(sessionId, 'speech_started', {});
      },

      onSpeechStopped: () => {
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.speech_stopped',
          sessionId,
          timestamp: Date.now(),
        });
        this.publishEvent(sessionId, 'speech_stopped', {});
      },

      onTranscriptionText: (text, stash) => {
        // 中间结果（流式部分文本）→ 客户端可用于实时字幕
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
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
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.transcription_final',
          sessionId,
          text: transcript,
          isFinal: true,
          timestamp: Date.now(),
        });
        this.publishEvent(sessionId, 'transcription_completed', { text: transcript });
      },

      onSessionFinished: () => {
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.session_finished',
          sessionId,
        });
        session.state = 'closed';
        this.sessions.delete(sessionId);
      },

      onError: (error) => {
        const session = this.getCurrentSession(sessionId, asrClient);
        if (!session) return;
        this.sendToSession(session, {
          type: 'asr.error',
          sessionId,
          error,
        });
      },
    };

    if (provider === 'volcengine') {
      const volcConfig: VolcASRConfig = { language, sampleRate, inputFormat, vadMode, vadSilenceDurationMs };
      asrClient = new VolcASRClient(volcConfig, callbacks);
    } else {
      const qwenConfig: Qwen3ASRConfig = { language, sampleRate, inputFormat, vadMode, vadSilenceDurationMs };
      asrClient = new Qwen3ASRClient(qwenConfig, callbacks);
    }

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
      logger.info(`[ASR-Manager] 会话 ${sessionId} (${provider}) 已创建并激活`);
    } catch (err: any) {
      session.state = 'closed';
      this.sessions.delete(sessionId);
      // 确保 asrClient 也被正确关闭
      try { asrClient.close?.(); } catch (_) {}
      throw new Error(`建立 ASR 连接失败 (${provider}): ${err.message}`);
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
   * 安全地关闭所有资源，不向已关闭的 clientWs 发送消息
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 先标记为关闭，防止回调继续发送消息
    session.state = 'closed';
    this.sessions.delete(sessionId);

    // 安全关闭 asrClient 连接
    try {
      session.asrClient.close();
    } catch (err: any) {
      logger.warn(`[ASR-Manager] 关闭 asrClient 时出错 (sessionId=${sessionId}): ${err.message}`);
    }

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

    this.sendToSession(session, data);
  }

  /**
   * 只允许创建该回调的 ASR 客户端修改自己的会话，避免旧连接延迟回调污染新会话。
   */
  private getCurrentSession(sessionId: string, asrClient: Qwen3ASRClient | VolcASRClient): ASRSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.asrClient !== asrClient) {
      return null;
    }
    return session;
  }

  private sendToSession(session: ASRSession, data: any): void {
    if (session.clientWs.readyState !== WebSocket.OPEN) return;

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

  /**
   * 僵尸会话定时清理器
   * 每 5 分钟检查一次，清理创建时间超过 30 分钟的会话
   */
  private startZombieSessionCleaner(): void {
    setInterval(() => {
      const now = Date.now();
      const MAX_SESSION_AGE_MS = 30 * 60 * 1000; // 30分钟
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.createdAt.getTime() > MAX_SESSION_AGE_MS) {
          logger.warn(`[ASR-Manager] 清理僵尸会话: ${sessionId}, 存活时间: ${Math.round((now - session.createdAt.getTime()) / 60000)}分钟`);
          this.destroySession(sessionId);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟检查
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
