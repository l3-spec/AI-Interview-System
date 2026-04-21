import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Redis 事件总线
 * 用于 ASR 微服务与 backend-api 之间的跨服务事件通信
 *
 * 发布频道:
 *   asr:events — ASR 相关事件（speech_started, speech_stopped, transcription_completed 等）
 *
 * 订阅频道:
 *   asr:commands — 来自 backend-api 的控制指令（如强制结束会话等）
 */
export class RedisEventBus {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn('[Redis] REDIS_URL 未配置，跨服务通信不可用。ASR 服务仍可独立工作。');
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

      await this.subscriber?.subscribe('asr:commands', 'platform:ai_settings');
      this.subscriber?.on('message', (channel, message) => {
        if (channel === 'platform:ai_settings') {
          this.applyPlatformAiSettings(message);
          return;
        }
        this.handleCommand(channel, message);
      });

      logger.info('[Redis] 事件总线已连接');
    } catch (err: any) {
      logger.warn(`[Redis] 连接失败: ${err.message}，ASR 服务将在无 Redis 模式运行`);
      this.isConnected = false;
    }
  }

  /**
   * 发布事件
   */
  publish(channel: string, data: any): void {
    if (!this.isConnected || !this.publisher) return;

    try {
      this.publisher.publish(channel, JSON.stringify(data));
    } catch (err: any) {
      logger.error(`[Redis] 发布事件失败: ${err.message}`);
    }
  }

  private applyPlatformAiSettings(message: string): void {
    try {
      const patch = JSON.parse(message) as Record<string, string>;
      const keys = [
        'DASHSCOPE_API_KEY',
        'DASHSCOPE_WS_URL',
        'QWEN_ASR_MODEL',
        'QWEN_TTS_MODEL',
        'TTS_VOICE',
        'TTS_LANGUAGE',
      ];
      for (const k of keys) {
        if (patch[k] != null && String(patch[k]).length > 0) {
          process.env[k] = String(patch[k]);
        }
      }
      logger.info('[Redis] 已应用 platform:ai_settings → 环境变量（ASR）');
    } catch (err: any) {
      logger.error(`[Redis] platform:ai_settings 解析失败: ${err.message}`);
    }
  }

  /**
   * 处理来自 backend-api 的控制指令
   */
  private handleCommand(_channel: string, message: string): void {
    try {
      const cmd = JSON.parse(message);
      logger.debug(`[Redis] 收到指令: ${cmd.command} for session ${cmd.sessionId}`);

      switch (cmd.command) {
        case 'force_close':
          // backend-api 要求强制关闭某个 ASR 会话
          const { ASRSessionManager } = require('./asr-session-manager');
          ASRSessionManager.getInstance().destroySession(cmd.sessionId);
          break;

        default:
          logger.debug(`[Redis] 未知指令: ${cmd.command}`);
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
