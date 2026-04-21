import Redis from 'ioredis';
import { logger } from './logger';

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
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        lazyConnect: true,
      });

      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        lazyConnect: true,
      });

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

  disconnect(): void {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
    this.isConnected = false;
  }
}
