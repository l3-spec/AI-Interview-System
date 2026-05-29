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
  state: 'connecting' | 'active' | 'suspended' | 'finishing' | 'closed';
  /**
   * 是否已与 DashScope 建立上游连接。
   * 延迟连接：避免客户端建会话后长时间只有「服务端 URL 播放」、无文本上行时触发上游 Idle timeout。
   */
  dashscopeConnected: boolean;
  /** 并发 append 时共用的上游连接 Promise，避免重复 connect */
  dashscopeConnectPromise: Promise<boolean> | null;
  suspendedAt?: number;
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

  // 合法参数定义：用于校验客户端传入的 session 配置
  private static readonly VALID_SAMPLE_RATES = [8000, 16000, 24000];
  private static readonly VALID_VOICES = [
    'Cherry', 'Serena', 'Ethan', 'Chelsie',
    'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
    // 可根据实际支持的音色列表扩充
  ];
  private static readonly VALID_MODES = ['server_commit', 'commit'];

  private constructor() {}

  /**
   * 校验 TTS session 创建参数
   * - 采样率/模式校验为强校验（不通过则拒绝创建）
   * - 音色校验采用宽松策略：未知音色仅打 warning 并回退到默认 Cherry，避免阻塞未来新增音色
   */
  private validateSessionConfig(config: CreateTTSSessionOptions): { valid: boolean; error?: string } {
    // 采样率校验
    if (config.sampleRate && !TTSSessionManager.VALID_SAMPLE_RATES.includes(config.sampleRate)) {
      return {
        valid: false,
        error: `无效的采样率: ${config.sampleRate}, 支持: ${TTSSessionManager.VALID_SAMPLE_RATES.join('/')}`,
      };
    }

    // 音色校验（宽松：未知音色仅记录警告，不强行重置，以支持自定义克隆音色）
    if (config.voice && !TTSSessionManager.VALID_VOICES.includes(config.voice)) {
      logger.warn(`[TTS-Manager] 未知音色 "${config.voice}"，可能是自定义克隆音色或百炼新支持音色，继续使用`);
    }

    // 模式校验
    if (config.mode && !TTSSessionManager.VALID_MODES.includes(config.mode)) {
      return {
        valid: false,
        error: `无效的 TTS 模式: "${config.mode}", 支持: ${TTSSessionManager.VALID_MODES.join('/')}`,
      };
    }

    return { valid: true };
  }

  static getInstance(): TTSSessionManager {
    if (!TTSSessionManager.instance) {
      TTSSessionManager.instance = new TTSSessionManager();
    }
    return TTSSessionManager.instance;
  }

  setRedisBus(bus: RedisEventBus) {
    this.redisBus = bus;
    
    // Handle outbound events from interview-service
    this.redisBus.onOutboundEvent((sessionId, type, payload) => {
      this.sendToClient(sessionId, {
        type,
        sessionId,
        payload
      });
    });

    // 面试控制消息转发：interview:control:{sessionId} → 对应 App 的 WebSocket
    // 控制消息作为文本 WebSocket 帧下发（App 通过帧类型区分：二进制=音频，文本=JSON 控制/转录）
    this.redisBus.onControlMessage((sessionId, rawMessage) => {
      const session = this.sessions.get(sessionId);
      if (!session || session.clientWs.readyState !== WebSocket.OPEN) {
        logger.warn(`[TTS-Control] 会话不存在或 WebSocket 未连接，丢弃控制消息 session=${sessionId}`);
        return;
      }
      let event = 'unknown';
      try {
        const parsed = JSON.parse(rawMessage);
        event = parsed?.event || parsed?.type || 'unknown';
      } catch {
        // 解析失败不阻断转发：原始报文仍可作为文本帧下发
      }
      try {
        // 直接透传原始 JSON，默认 send(string) 会走文本帧
        session.clientWs.send(rawMessage);
        logger.info(`[TTS-Control] 转发控制消息给会话 ${sessionId}: ${event}`);
      } catch (err: any) {
        logger.error(`[TTS-Control] 转发控制消息失败 (${sessionId}): ${err?.message || err}`);
      }
    });
  }

  /**
   * 创建新的 TTS 会话
   *
   * 会话建立时会同步清理该 sessionId 在内存与 Redis 中的旧暂存指令，
   * 避免上轮会话 / 服务重启遗留的 synthesize 指令被重放导致客户端收到过期音频。
   */
  async createSession(clientWs: WebSocket, options: CreateTTSSessionOptions): Promise<string> {
    const sessionId = options.sessionId || uuidv4();
  
    // 清理旧暂存指令：包含内存 Map 与 Redis List 两处
    // 设计意图：避免上次会话崩溃 / 服务重启后残留的过期指令被新客户端重放。
    // 如需重发，应由 interview-service 重新生成文本，而非依赖这里的暂存重放。
    this.pendingRedisCommands.delete(sessionId);
    if (this.redisBus) {
      this.redisBus.clearPendingCommands(sessionId).catch((err: any) => {
        logger.warn(`[TTS-Manager] 清理 Redis 旧暂存指令失败 (${sessionId}): ${err?.message || err}`);
      });
    }
    logger.info(`[TTS-Manager] 清理旧暂存指令: sessionId=${sessionId}`);
  
    // 参数校验：sampleRate / mode 强校验，voice 宽松（已在 validate 内做了回退）
    const validation = this.validateSessionConfig(options);
    if (!validation.valid) {
      logger.warn(`[TTS-Manager] 参数校验失败 (${sessionId}): ${validation.error}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify({
            type: 'tts.error',
            sessionId,
            error: 'invalid_config',
            message: validation.error,
          }));
        } catch (e: any) {
          logger.warn(`[TTS-Manager] 回送 invalid_config 失败 (${sessionId}): ${e?.message || e}`);
        }
      }
      // 不创建会话，直接抛错由调用方决定是否进一步关闭客户端连接
      throw new Error(validation.error);
    }

    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId);
      if (existing && existing.state === 'suspended') {
        logger.info(`[TTS-Manager] 恢复挂起的 TTS 会话: ${sessionId}`);
        existing.clientWs = clientWs;
        existing.state = 'active';
        delete existing.suspendedAt;
        
        // 重新订阅 Session 和 Control（必须 await，避免消息丢失）
        if (this.redisBus) {
          try {
            await Promise.all([
              this.redisBus.subscribeSession(sessionId),
              this.redisBus.subscribeControl(sessionId),
            ]);
          } catch (err: any) {
            logger.error(`[TTS-Manager] 恢复会话 Redis 订阅失败 (${sessionId}): ${err?.message || err}`);
          }
        }

        // 通知客户端会话已恢复
        if (clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.send(JSON.stringify({
              type: 'session.created',
              sessionId,
              message: 'TTS 会话已恢复，可以继续发送文本',
              isResumed: true,
            }));
          } catch (e: any) {
            logger.warn(`[TTS-Manager] 回送 session.created 失败 (${sessionId}): ${e?.message || e}`);
          }
        }
        await this.replayPendingRedisCommands(sessionId);
        return sessionId;
      }
      await this.destroySession(sessionId);
    }

    const resolvedVoice = (options.voice || process.env.TTS_VOICE || 'Ethan').trim();
    let resolvedLang = (options.language || process.env.TTS_LANGUAGE || 'zh').trim();
    
    // Map human readable names to ISO codes expected by DashScope
    if (resolvedLang.toLowerCase() === 'chinese') resolvedLang = 'zh';
    if (resolvedLang.toLowerCase() === 'english') resolvedLang = 'en';

    const ttsConfig: Qwen3TTSConfig = {
      voice: resolvedVoice,
      sampleRate: options.sampleRate || parseInt(process.env.TTS_SAMPLE_RATE || '24000', 10),
      responseFormat: options.responseFormat || process.env.TTS_RESPONSE_FORMAT || 'pcm',
      mode: (options.mode as 'server_commit' | 'commit') || (process.env.TTS_MODE as any) || 'server_commit',
      language: resolvedLang,
      instructions: options.instructions || process.env.TTS_INSTRUCTIONS || undefined,
    };

    logger.info(
      `[TTS-Manager] createSession: sessionId=${sessionId} voice(客户端)=${options.voice ?? '未传'} TTS_VOICE(env)=${process.env.TTS_VOICE ?? '未设'} model(env)=${process.env.QWEN_TTS_MODEL ?? 'default'} → 实际 voice="${ttsConfig.voice}" language_type="${ttsConfig.language}"`,
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

      onTranscriptDelta: (text, audioTime, responseId) => {
        // 下发增量文本及其音频时间戳（用于客户端实现 KTV 字幕同步）
        this.sendToClient(sessionId, {
          type: 'tts.transcript_delta',
          sessionId,
          text,
          audioTime,
          responseId,
          timestamp: Date.now(),
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
        if (session) {
          session.dashscopeConnected = false;
        }
      },

      onError: (error) => {
        this.sendToClient(sessionId, {
          type: 'tts.error',
          sessionId,
          error,
        });
        const session = this.sessions.get(sessionId);
        if (session) {
          session.dashscopeConnected = false;
        }
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
    
    // Subscribe to session-specific outbound channel for signal proxying
    // 必须 await：interview-service 可能在 App 连接 TTS 后立即发布 voice_response，
    // 若此处不等待订阅完成，Pub/Sub 消息会在订阅生效前到达 Redis 而被丢弃，
    // 导致 App 永远收不到 question_start，卡死在"面试官正在准备面试"页面。
    if (this.redisBus) {
      try {
        await Promise.all([
          this.redisBus.subscribeSession(sessionId),
          this.redisBus.subscribeControl(sessionId),
        ]);
      } catch (err: any) {
        logger.error(`[TTS-Manager] Redis 订阅失败 (sessionId=${sessionId}): ${err?.message || err}`);
      }
    }
    logger.info(
      `[TTS-Manager] 会话 ${sessionId} 已注册，开始后台异步预热连接 DashScope`,
    );

    // 性能优化：异步预热连接 DashScope，防止在首次发送文字时才连接导致的数秒延迟，显著降低进入页面时的首包播放等待时间。
    this.ensureDashScopeConnected(session).catch(err => {
      logger.warn(`[TTS-Manager] 预热连接 DashScope 失败 (sessionId=${sessionId}): ${err?.message || err}`);
    });

    await this.replayPendingRedisCommands(sessionId);

    return sessionId;
  }

  /**
   * backend-api 比 App 更早发出 Redis synthesize 时暂存指令，待同一 sessionId 的 WebSocket 建连后顺序执行。
   *
   * 暂存采用「内存 + Redis 双写」：
   *  - 内存：进程未崩溃时的快速访问与重放
   *  - Redis List：tts-service 进程崩溃 / 重启后仍可在客户端重连时恢复指令
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

    // Redis 持久化：fire-and-forget，失败仅告警，不影响主流程
    if (this.redisBus) {
      this.redisBus.persistPendingCommand(sessionId, cmd).catch((err: any) => {
        logger.warn(`[TTS-Manager] Redis 持久化暂存指令失败 (${sessionId}): ${err?.message || err}`);
      });
    }
  }

  /**
   * 重放暂存 Redis 指令
   *
   * 场景：interview-service 在 App 连接 TTS 之前就发布了 synthesize 指令，
   * 这些指令被暂存在内存 Map 中。当客户端 WebSocket 建连后，需要重放这些指令
   * 以确保用户能听到面试题目。
   *
   * 安全保证：
   *  - createSession 开头已清理旧的 Redis 持久化指令和内存 Map
   *  - 此处重放的仅是 createSession 执行期间新到达的指令
   *  - DashScope 连接在 createSession 中已异步启动，重放时 ensureDashScopeConnected 会等待就绪
   */
  private async replayPendingRedisCommands(sessionId: string): Promise<void> {
    const commands = this.pendingRedisCommands.get(sessionId);
    this.pendingRedisCommands.delete(sessionId);
    if (!commands || commands.length === 0) return;

    logger.info(`[TTS-Manager] 重放 ${commands.length} 条暂存指令: sessionId=${sessionId}`);
    for (const cmd of commands) {
      try {
        if (cmd.command === 'synthesize' && cmd.text) {
          await this.handleRedisTextCommand(sessionId, cmd.text, cmd.commit);
        } else if (cmd.command === 'commit') {
          await this.commitText(sessionId);
        }
      } catch (err: any) {
        logger.warn(`[TTS-Manager] 重放指令失败 (${sessionId}, ${cmd.command}): ${err?.message || err}`);
      }
    }
  }

  /**
   * 首次需要向上游送文本时再连接 DashScope，避免「仅建立会话、无文本」导致 Idle timeout。
   *
   * 增加超时保护与有限重试：
   *  - 单次 connect 超过 DASHSCOPE_CONNECT_TIMEOUT_MS 视为失败
   *  - 最多重试 MAX_CONNECT_RETRIES 次，失败间隔逐次拉长
   *  - 全部失败后向客户端下发可识别的降级错误，并保留会话以便后续再次触发
   */
  private async ensureDashScopeConnected(session: TTSSession): Promise<boolean> {
    if (session.dashscopeConnected && session.ttsClient.connected) return true;
    if (session.state === 'closed') return false;

    // 已有连接 Promise 在执行，直接复用，避免并发重复 connect
    if (session.dashscopeConnectPromise) {
      return session.dashscopeConnectPromise;
    }

    const DASHSCOPE_CONNECT_TIMEOUT_MS = 15000; // 单次连接超时（15 秒）
    const MAX_CONNECT_RETRIES = 2; // 失败后最多重试 2 次（合计最多尝试 3 次）

    session.dashscopeConnectPromise = (async () => {
      for (let attempt = 0; attempt <= MAX_CONNECT_RETRIES; attempt++) {
        try {
          await Promise.race([
            session.ttsClient.connect(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`DashScope 连接超时 (${DASHSCOPE_CONNECT_TIMEOUT_MS}ms)`)),
                DASHSCOPE_CONNECT_TIMEOUT_MS,
              ),
            ),
          ]);
          session.dashscopeConnected = true;
          logger.info(
            `[TTS-Manager] 会话 ${session.sessionId} 已连接 DashScope (尝试 ${attempt + 1}/${MAX_CONNECT_RETRIES + 1})`,
          );
          return true;
        } catch (err: any) {
          logger.warn(
            `[TTS-Manager] DashScope 连接失败 (${session.sessionId}) 尝试 ${attempt + 1}/${MAX_CONNECT_RETRIES + 1}: ${err?.message || err}`,
          );
          // 超时或异常后清理底层连接状态，避免下次复用半开 WebSocket
          session.dashscopeConnected = false;
          try {
            session.ttsClient.close?.();
          } catch (_) {
            // 忽略清理过程中的异常
          }

          if (attempt < MAX_CONNECT_RETRIES) {
            // 重试前等待，按尝试次数线性退避（1s、2s）
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      // 所有重试均失败，降级通知客户端，但保留会话本身以支持下次再次触发
      logger.error(`[TTS-Manager] DashScope 连接彻底失败 (${session.sessionId})，已通知客户端降级`);
      session.dashscopeConnected = false;
      this.notifyClientError(
        session,
        'dashscope_connect_failed',
        'TTS 上游服务暂时不可用，请稍后重试',
      );
      return false;
    })();

    try {
      return await session.dashscopeConnectPromise;
    } finally {
      // 不论成功失败都清空 Promise 引用，允许后续再次触发连接尝试
      session.dashscopeConnectPromise = null;
    }
  }

  /**
   * 向客户端 WebSocket 发送结构化错误通知（用于上游连接失败等可降级场景）
   */
  private notifyClientError(session: TTSSession, errorCode: string, message: string): void {
    if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
      try {
        session.clientWs.send(
          JSON.stringify({
            type: 'tts.error',
            error: errorCode,
            message,
            sessionId: session.sessionId,
          }),
        );
      } catch (e: any) {
        logger.warn(`[TTS-Manager] 发送错误通知失败 (${session.sessionId}): ${e?.message || e}`);
      }
    }
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
   * 清空文本缓冲区（中断当前合成）并发送确认
   */
  async clearText(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return;

    // 广播中断指令到客户端（移动端收到后立即清理缓冲区和 AudioTrack）
    this.sendToClient(sessionId, { type: 'tts.clear', sessionId });

    // 清理 DashScope 上游（如果正在合成）
    if (session.dashscopeConnected) {
      try {
        session.ttsClient.clearTextBuffer();
      } catch (e: any) {
        logger.warn(`[TTS-Manager] 清理上游失败 (${sessionId}): ${e?.message || e}`);
      }
    }

    // 发送 interrupt_ack 给客户端确认中断已完成
    this.sendToClient(sessionId, {
      type: 'tts.interrupt_ack',
      sessionId,
      charCount: session.charCount,
      audioChunkCount: session.audioChunkCount,
      timestamp: Date.now(),
    });
    logger.info(`[TTS-Manager] 中断确认已发送 (${sessionId}) - chars=${session.charCount} chunks=${session.audioChunkCount}`);

    // 通过 Redis 通知 interview-service 中断已完成
    this.publishEvent(sessionId, 'interrupt_ack', {
      charCount: session.charCount,
      audioChunkCount: session.audioChunkCount,
      timestamp: Date.now(),
    });
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
    // 同步清除 Redis 中持久化的暂存指令，避免下次同 sessionId 建连时被错误重放
    if (this.redisBus) {
      try {
        await this.redisBus.clearPendingCommands(sessionId);
      } catch (err: any) {
        logger.warn(
          `[TTS-Manager] 清除 Redis 暂存指令失败 (${sessionId}): ${err?.message || err}`,
        );
      }
    }
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.ttsClient.close();
    session.state = 'closed';
    if (this.redisBus) {
      this.redisBus.unsubscribeSession(sessionId).catch(err => {
        logger.error(`[TTS-Manager] unsubscribeSession 异步失败: ${err?.message || err}`);
      });
      this.redisBus.unsubscribeControl(sessionId).catch(err => {
        logger.error(`[TTS-Manager] unsubscribeControl 异步失败: ${err?.message || err}`);
      });
    }
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

  /**
   * 将会话置于挂起状态（弱网断连宽限期），启动 30 秒倒计时清理
   */
  async suspendSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return;

    session.state = 'suspended';
    const timestamp = Date.now();
    session.suspendedAt = timestamp;
    logger.info(`[TTS-Manager] TTS 会话 ${sessionId} 已挂起（进入 30 秒重连宽限期）`);

    setTimeout(async () => {
      const current = this.sessions.get(sessionId);
      if (current && current.state === 'suspended' && current.suspendedAt === timestamp) {
        logger.info(`[TTS-Manager] TTS 会话 ${sessionId} 宽限期满未重连，执行销毁`);
        await this.destroySession(sessionId);
      }
    }, 30000);
  }
}
