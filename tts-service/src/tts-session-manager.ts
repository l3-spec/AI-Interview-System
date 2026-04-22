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
  /**
   * 是否已与 DashScope 建立上游连接。
   * 延迟连接：避免客户端建会话后长时间只有「服务端 URL 播放」、无文本上行时触发上游 Idle timeout。
   */
  dashscopeConnected: boolean;
  /** 并发 append 时共用的上游连接 Promise，避免重复 connect */
  dashscopeConnectPromise: Promise<boolean> | null;
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
/** backend-api 经 Redis 下达的指令，在客户端 WebSocket 尚未 session.create 时暂存于此，建连后重放 */
type PendingRedisCmd =
  | { command: 'synthesize'; text: string; commit?: boolean }
  | { command: 'commit' }
  | { command: 'clear' };

export class TTSSessionManager {
  private static instance: TTSSessionManager;
  private sessions = new Map<string, TTSSession>();
  private redisBus: RedisEventBus | null = null;
  /** sessionId -> 等待移动端建连的 Redis 指令（避免「后端已 synthesize、TTS 侧尚无会话」丢字） */
  private pendingRedisCommands = new Map<string, PendingRedisCmd[]>();

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

    const resolvedVoice = (options.voice || process.env.TTS_VOICE || 'Cherry').trim();
    const resolvedLang = (options.language || process.env.TTS_LANGUAGE || 'Chinese').trim();

    const ttsConfig: Qwen3TTSConfig = {
      voice: resolvedVoice,
      sampleRate: options.sampleRate || parseInt(process.env.TTS_SAMPLE_RATE || '24000', 10),
      responseFormat: options.responseFormat || process.env.TTS_RESPONSE_FORMAT || 'pcm',
      mode: (options.mode as 'server_commit' | 'commit') || (process.env.TTS_MODE as any) || 'server_commit',
      language: resolvedLang,
      instructions: options.instructions || process.env.TTS_INSTRUCTIONS || undefined,
    };

    logger.info(
      `[TTS-Manager] createSession: sessionId=${sessionId} voice(客户端)=${options.voice ?? '未传'} TTS_VOICE(env)=${process.env.TTS_VOICE ?? '未设'} → 实际 voice="${ttsConfig.voice}" language_type="${ttsConfig.language}"`,
    );

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

        if (session && session.audioChunkCount % 20 === 0) {
          logger.info(`[TTS-Session] 会话 ${sessionId} 推送音频分片: count=${session.audioChunkCount}, bytes=${Math.round(audioBase64.length * 0.75)}`);
        }

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
      state: 'active',
      dashscopeConnected: false,
      dashscopeConnectPromise: null,
    };

    this.sessions.set(sessionId, session);
    logger.info(
      `[TTS-Manager] 会话 ${sessionId} 已注册（DashScope 将在首次 append/commit 时按需连接，避免空闲超时）`,
    );

    await this.replayPendingRedisCommands(sessionId);

    return sessionId;
  }

  /**
   * backend-api 比 App 更早发出 Redis synthesize 时暂存指令，待同一 sessionId 的 WebSocket 建连后顺序执行。
   */
  enqueueRedisCommand(sessionId: string, cmd: PendingRedisCmd): void {
    const max = parseInt(process.env.TTS_PENDING_REDIS_MAX || '128', 10);
    const list = this.pendingRedisCommands.get(sessionId) ?? [];
    if (list.length >= max) {
      logger.warn(`[TTS-Manager] Redis 暂存队列已满 (${sessionId})，丢弃最旧一条`);
      list.shift();
    }
    list.push(cmd);
    this.pendingRedisCommands.set(sessionId, list);
    logger.info(
      `[TTS-Manager] Redis 指令已暂存（等待客户端建连）session=${sessionId} cmd=${cmd.command} queueLen=${list.length}`,
    );
  }

  private async replayPendingRedisCommands(sessionId: string): Promise<void> {
    const list = this.pendingRedisCommands.get(sessionId);
    if (!list?.length) {
      return;
    }
    this.pendingRedisCommands.delete(sessionId);
    logger.info(`[TTS-Manager] 重放暂存 Redis 指令 session=${sessionId} count=${list.length}`);
    for (const item of list) {
      try {
        if (item.command === 'synthesize') {
          await this.handleRedisTextCommand(sessionId, item.text, item.commit);
        } else if (item.command === 'commit') {
          await this.commitText(sessionId);
        } else if (item.command === 'clear') {
          await this.clearText(sessionId);
        }
      } catch (err: any) {
        logger.error(`[TTS-Manager] 重放 Redis 指令失败 (${item.command}): ${err?.message || err}`);
      }
    }
  }

  /**
   * 首次需要向上游送文本时再连接 DashScope，避免「仅建立会话、无文本」导致 Idle timeout。
   */
  private async ensureDashScopeConnected(session: TTSSession): Promise<boolean> {
    if (session.dashscopeConnected) return true;
    if (session.state !== 'active') return false;

    if (session.dashscopeConnectPromise) {
      return session.dashscopeConnectPromise;
    }

    session.dashscopeConnectPromise = (async () => {
      try {
        await session.ttsClient.connect();
        session.dashscopeConnected = true;
        logger.info(`[TTS-Manager] 会话 ${session.sessionId} 已连接 DashScope`);
        return true;
      } catch (err: any) {
        logger.error(`[TTS-Manager] DashScope 连接失败 (${session.sessionId}): ${err.message}`);
        this.sendToClient(session.sessionId, {
          type: 'tts.error',
          sessionId: session.sessionId,
          error: `建立上游 TTS 失败: ${err.message}`,
        });
        return false;
      } finally {
        session.dashscopeConnectPromise = null;
      }
    })();

    return session.dashscopeConnectPromise;
  }

  /**
   * 追加文本到指定会话（双轨 Track 1：文本流式输入）
   * 可从客户端 WebSocket 或 Redis 指令触发
   * @returns true 如果成功追加，false 如果会话不可用
   */
  async appendText(sessionId: string, text: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      return false;
    }

    const chunk = (text || '').trim();
    if (!chunk) {
      logger.debug(`[TTS-Manager] appendText 跳过空文本 - ${sessionId}`);
      return true;
    }

    const upstreamOk = await this.ensureDashScopeConnected(session);
    if (!upstreamOk) return false;

    logger.info(`[TTS-Manager] 会话 ${sessionId} 收到合成请求: "${chunk.substring(0, 30)}${chunk.length > 30 ? '...' : ''}" (${chunk.length} chars)`);
    session.ttsClient.appendText(chunk);
    session.charCount += chunk.length;
    return true;
  }

  /**
   * 手动提交文本缓冲区（commit 模式下使用）
   * @returns true 如果成功提交，false 如果会话不可用
   */
  async commitText(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') {
      return false;
    }
    const upstreamOk = await this.ensureDashScopeConnected(session);
    if (!upstreamOk) return false;

    session.ttsClient.commitText();
    return true;
  }

  /**
   * 清空文本缓冲区（中断当前合成）
   */
  async clearText(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return;
    if (!session.dashscopeConnected) return;
    session.ttsClient.clearTextBuffer();
  }

  /**
   * 结束 TTS 会话
   */
  async finishSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'finishing';
    if (session.dashscopeConnected) {
      session.ttsClient.finish();
    } else {
      session.ttsClient.close();
    }
    logger.info(`[TTS-Manager] 会话 ${sessionId} 正在结束`);
  }

  /**
   * 销毁指定会话
   */
  async destroySession(sessionId: string): Promise<void> {
    this.pendingRedisCommands.delete(sessionId);
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
    this.pendingRedisCommands.clear();
    logger.info('[TTS-Manager] 所有会话已清理');
  }

  /**
   * 通过 sessionId 查找会话并追加文本（供 Redis 指令调用）
   * @returns true 如果成功，false 如果会话不存在
   */
  async handleRedisTextCommand(sessionId: string, text: string, commit?: boolean): Promise<boolean> {
    const ok = await this.appendText(sessionId, text);
    if (!ok) {
      logger.warn(`[TTS-Manager] Redis 指令: 会话 ${sessionId} 不存在，丢弃文本 (${text.length} chars)`);
      return false;
    }
    if (commit) {
      await this.commitText(sessionId);
    }
    return true;
  }

  /** 检查会话是否存在且活跃 */
  hasActiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session && session.state === 'active';
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
