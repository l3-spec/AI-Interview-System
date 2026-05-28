import Redis from 'ioredis';
import { logger } from './logger';

/** TTS 待执行指令持久化 Key 前缀 */
const TTS_PENDING_KEY_PREFIX = 'tts:pending:';
/** TTS 待执行指令的 TTL（秒），每次写入会刷新过期时间 */
const TTS_PENDING_TTL_SECONDS = 600;

/**
 * Redis 事件总线
 * 用于 TTS 微服务与 backend-api 之间的跨服务事件通信
 *
 * 发布频道:
 *   tts:events — TTS 相关事件（audio_chunk, response_done 等）
 *
 * 订阅频道:
 *   tts:commands — 来自 backend-api 的控制指令（synthesize, clear, close 等）
 */
export class RedisEventBus {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;
  private commandHandler: ((cmd: any) => void | Promise<void>) | null = null;
  private outboundHandler: ((sessionId: string, type: string, payload: any) => void | Promise<void>) | null = null;
  /** 面试控制消息处理器：interview-service 通过 interview:control:{sessionId} 频道推送的原始 JSON */
  private controlHandler: ((sessionId: string, rawMessage: string) => void | Promise<void>) | null = null;
  /** 串行处理 Redis 指令，避免 synthesize 与 commit 并发导致 commit 先于 append 到达 DashScope */
  private commandChain: Promise<void> = Promise.resolve();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn('[Redis] REDIS_URL 未配置，跨服务通信不可用。TTS 服务仍可独立工作。');
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Allow queuing commands during reconnection
        retryStrategy: (times) => Math.min(times * 200, 3000),
        lazyConnect: true,
      });

      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        lazyConnect: true,
      });

      // Handle Redis errors to prevent "Unhandled error event"
      this.publisher.on('error', (err) => logger.error(`[Redis Publisher] Error: ${err.message}`));
      this.subscriber.on('error', (err) => logger.error(`[Redis Subscriber] Error: ${err.message}`));

      this.init();
    } catch (err: any) {
      logger.warn(`[Redis] 初始化失败: ${err.message}`);
    }
  }

  private async init(): Promise<void> {
    try {
      await this.publisher?.connect();
      await this.subscriber?.connect();
      this.isConnected = true;

      await this.subscriber?.subscribe('tts:commands', 'platform:ai_settings');
      this.subscriber?.on('message', (channel, message) => {
        if (channel === 'platform:ai_settings') {
          this.applyPlatformAiSettings(message);
          return;
        }
        if (channel.startsWith('interview:events:outbound:session:')) {
          this.handleOutboundEvent(channel, message);
          return;
        }
        if (channel.startsWith('interview:control:')) {
          this.handleControlMessage(channel, message);
          return;
        }
        this.handleCommand(channel, message);
      });

      logger.info('[Redis] 事件总线已连接');
    } catch (err: any) {
      logger.warn(`[Redis] 连接失败: ${err.message}，TTS 服务将在无 Redis 模式运行`);
      this.isConnected = false;
    }
  }

  /** 管理台保存平台 AI 配置后，同步到本进程环境变量（新 DashScope 连接生效） */
  private applyPlatformAiSettings(message: string): void {
    try {
      const patch = JSON.parse(message) as Record<string, string>;

      // 音色白名单 - 只允许 qwen3-tts-instruct-flash-realtime 支持的音色
      // 不在白名单内的值（如旧版 loongdavid_v3）会导致 DashScope 连接失败，强制回退为 Ethan
      const VALID_VOICES = ['Ethan', 'Cherry', 'Serena', 'Chelsie', 'Neil', 'ethan', 'cherry', 'serena', 'chelsie', 'neil'];
      if (patch.TTS_VOICE || (patch as any).ttsVoice) {
        const voice = patch.TTS_VOICE || (patch as any).ttsVoice;
        if (!VALID_VOICES.includes(voice)) {
          logger.warn(`[Redis] 音色 "${voice}" 不被 qwen3-tts-instruct-flash-realtime 模型支持，强制使用 Ethan`);
          patch.TTS_VOICE = 'Ethan';
          if ((patch as any).ttsVoice) (patch as any).ttsVoice = 'Ethan';
        }
      }

      const keys = [
        'DASHSCOPE_API_KEY',
        'DASHSCOPE_WS_URL',
        'QWEN_TTS_MODEL',
        'QWEN_ASR_MODEL',
        'TTS_VOICE',
        'TTS_LANGUAGE',
      ];
      for (const k of keys) {
        if (patch[k] != null && String(patch[k]).length > 0) {
          process.env[k] = String(patch[k]);
        }
      }
      logger.info('[Redis] 已应用 platform:ai_settings → 环境变量（TTS）');
    } catch (err: any) {
      logger.error(`[Redis] platform:ai_settings 解析失败: ${err.message}`);
    }
  }

  onCommand(handler: (cmd: any) => void | Promise<void>): void {
    this.commandHandler = handler;
  }

  onOutboundEvent(handler: (sessionId: string, type: string, payload: any) => void | Promise<void>): void {
    this.outboundHandler = handler;
  }

  /**
   * 注册面试控制消息处理器
   * 控制消息由 interview-service 发布到 interview:control:{sessionId} 频道，
   * 由 TTS 服务转发给对应 App 的 WebSocket 连接（单向：Redis → TTS → App）
   */
  onControlMessage(handler: (sessionId: string, rawMessage: string) => void | Promise<void>): void {
    this.controlHandler = handler;
  }

  /** 订阅指定会话的面试控制消息频道 */
  async subscribeControl(sessionId: string): Promise<void> {
    if (!this.isConnected || !this.subscriber) return;
    const channel = `interview:control:${sessionId}`;
    try {
      await this.subscriber.subscribe(channel);
      logger.info(`[TTS-Control] 已订阅控制频道: ${channel}`);
    } catch (err: any) {
      // 控制频道订阅失败不应影响 TTS 核心功能（语音合成）
      logger.warn(`[TTS-Control] 订阅控制频道失败 ${channel}: ${err?.message || err}`);
    }
  }

  /** 取消订阅指定会话的面试控制消息频道 */
  async unsubscribeControl(sessionId: string): Promise<void> {
    if (!this.isConnected || !this.subscriber) return;
    const channel = `interview:control:${sessionId}`;
    try {
      await this.subscriber.unsubscribe(channel);
      logger.info(`[TTS-Control] 已取消订阅控制频道: ${channel}`);
    } catch (err: any) {
      logger.warn(`[TTS-Control] 取消订阅控制频道失败 ${channel}: ${err?.message || err}`);
    }
  }

  private handleControlMessage(channel: string, message: string): void {
    try {
      const sessionId = channel.replace('interview:control:', '');
      if (!sessionId) return;
      if (this.controlHandler) {
        // 直接透传原始 JSON 字符串，避免反序列化-序列化往返开销
        Promise.resolve(this.controlHandler(sessionId, message)).catch((err: any) => {
          logger.error(`[TTS-Control] 控制消息处理器执行失败: ${err?.message || err}`);
        });
      }
    } catch (err: any) {
      logger.error(`[TTS-Control] 处理控制消息失败: ${err?.message || err}`);
    }
  }

  async subscribeSession(sessionId: string): Promise<void> {
    if (!this.isConnected || !this.subscriber) return;
    const channel = `interview:events:outbound:session:${sessionId}`;
    await this.subscriber.subscribe(channel);
    logger.info(`[Redis] Subscribed to session channel: ${channel}`);
  }

  async unsubscribeSession(sessionId: string): Promise<void> {
    if (!this.isConnected || !this.subscriber) return;
    const channel = `interview:events:outbound:session:${sessionId}`;
    await this.subscriber.unsubscribe(channel);
    logger.info(`[Redis] Unsubscribed from session channel: ${channel}`);
  }

  publish(channel: string, data: any): void {
    if (!this.isConnected || !this.publisher) return;

    try {
      this.publisher.publish(channel, JSON.stringify(data));
    } catch (err: any) {
      logger.error(`[Redis] 发布事件失败: ${err.message}`);
    }
  }

  /**
   * 处理来自 backend-api 的 TTS 控制指令
   *
   * 支持的指令:
   *   synthesize — 发送文本到指定 TTS 会话进行合成
   *   commit — 提交文本缓冲区
   *   clear — 清空当前合成（中断）
   *   close — 关闭 TTS 会话
   */
  private handleCommand(_channel: string, message: string): void {
    try {
      const cmd = JSON.parse(message);
      logger.debug(`[Redis] 收到指令: ${cmd.command} for session ${cmd.sessionId}`);

      if (this.commandHandler) {
        const handler = this.commandHandler;
        this.commandChain = this.commandChain
          .then(() => Promise.resolve(handler(cmd)))
          .catch((err: any) => {
            logger.error(`[Redis] 指令执行失败 (${cmd.command}): ${err?.message || err}`);
          });
      }
    } catch (err: any) {
      logger.error(`[Redis] 处理指令失败: ${err.message}`);
    }
  }

  private handleOutboundEvent(channel: string, message: string): void {
    try {
      const sessionId = channel.split(':').pop() || '';
      const data = JSON.parse(message);
      if (this.outboundHandler) {
        this.outboundHandler(sessionId, data.type, data.payload);
      }
    } catch (err: any) {
      logger.error(`[Redis] Failed to handle outbound event: ${err.message}`);
    }
  }

  disconnect(): void {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
    this.isConnected = false;
  }

  /** 是否已可用于持久化操作 */
  get available(): boolean {
    return this.isConnected && this.publisher !== null;
  }

  /**
   * 将 TTS 待执行指令持久化到 Redis（崩溃恢复用）
   *
   * 使用 Redis List 存储同一 session 下按时间顺序的暂存指令，
   * 每次写入都刷新 TTL，避免会话长时间未建连导致永久堆积。
   */
  async persistPendingCommand(sessionId: string, command: any): Promise<void> {
    if (!this.available || !this.publisher) return;
    const key = `${TTS_PENDING_KEY_PREFIX}${sessionId}`;
    await this.publisher.rpush(key, JSON.stringify(command));
    await this.publisher.expire(key, TTS_PENDING_TTL_SECONDS);
  }

  /**
   * 原子地获取并清空某个 session 的所有待执行指令
   *
   * 通过 pipeline 串联 lrange + del，保证读取与清空在同一批次完成，
   * 避免与新写入之间出现竞争（重复重放）。
   */
  async consumePendingCommands(sessionId: string): Promise<any[]> {
    if (!this.available || !this.publisher) return [];
    const key = `${TTS_PENDING_KEY_PREFIX}${sessionId}`;
    const pipeline = this.publisher.pipeline();
    pipeline.lrange(key, 0, -1);
    pipeline.del(key);
    const results = await pipeline.exec();

    if (!results || !results[0] || !results[0][1]) return [];

    const rawCommands = results[0][1] as string[];
    return rawCommands
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter((v) => v !== null);
  }

  /** 清除某个 session 的待执行指令（会话销毁/已重放后调用） */
  async clearPendingCommands(sessionId: string): Promise<void> {
    if (!this.available || !this.publisher) return;
    const key = `${TTS_PENDING_KEY_PREFIX}${sessionId}`;
    await this.publisher.del(key);
  }

  /** 列出所有仍存在待执行指令的 session ID */
  async getAllPendingSessions(): Promise<string[]> {
    if (!this.available || !this.publisher) return [];
    const keys = await this.publisher.keys(`${TTS_PENDING_KEY_PREFIX}*`);
    return keys.map((k) => k.replace(TTS_PENDING_KEY_PREFIX, ''));
  }

  /**
   * 清除所有 TTS 暂存指令（服务启动时调用）
   *
   * 用途：避免上次进程崩溃 / 异常退出导致 Redis 中残留的旧暂存指令
   * 在新客户端建连后被错误重放，造成「过期音频」混入。
   *
   * 返回被清理的 key 数量，便于启动日志观察。
   */
  async clearAllPendingCommands(): Promise<number> {
    if (!this.available || !this.publisher) return 0;
    // 使用 SCAN 而非 KEYS 以减少对 Redis 主线程的阻塞影响
    const stream = this.publisher.scanStream({
      match: `${TTS_PENDING_KEY_PREFIX}*`,
      count: 200,
    });
    let removed = 0;
    return new Promise<number>((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (!keys || keys.length === 0) return;
        // 暂停消费、批量删除完成后再恢复
        stream.pause();
        this.publisher!.del(...keys)
          .then((count) => {
            removed += count;
            stream.resume();
          })
          .catch((err: any) => {
            logger.warn(`[Redis] 批量删除暂存 key 失败: ${err?.message || err}`);
            stream.resume();
          });
      });
      stream.on('end', () => resolve(removed));
      stream.on('error', (err: any) => reject(err));
    });
  }
}
