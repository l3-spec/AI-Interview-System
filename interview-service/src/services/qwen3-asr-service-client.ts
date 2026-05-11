import { Redis } from 'ioredis';

/**
 * Qwen3 ASR 微服务客户端
 * backend-api 通过此客户端与独立的 ASR 微服务交互
 *
 * 通信方式：
 *   - Redis pub/sub: 订阅 asr:events 接收识别结果
 *   - Redis pub/sub: 发布 asr:commands 发送控制指令
 *   - HTTP: 健康检查、会话查询
 */

interface ASREvent {
  sessionId: string;
  event: string;
  payload: any;
  timestamp: number;
  source: string;
}

type ASREventHandler = (event: ASREvent) => void;

export class Qwen3ASRServiceClient {
  private static instance: Qwen3ASRServiceClient;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private eventHandlers = new Map<string, ASREventHandler[]>();
  private sessionHandlers = new Map<string, ASREventHandler>();
  private asrServiceUrl: string;
  private isConnected = false;

  private constructor() {
    this.asrServiceUrl = process.env.ASR_SERVICE_URL || 'http://localhost:3002';
    this.initRedis();
  }

  static getInstance(): Qwen3ASRServiceClient {
    if (!Qwen3ASRServiceClient.instance) {
      Qwen3ASRServiceClient.instance = new Qwen3ASRServiceClient();
    }
    return Qwen3ASRServiceClient.instance;
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[ASR-Client] REDIS_URL 未配置，ASR 微服务集成不可用');
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.publisher.connect();
      await this.subscriber.connect();

      // 订阅 ASR 事件
      await this.subscriber.subscribe('asr:events');
      this.subscriber.on('message', (_channel, message) => {
        this.handleEvent(message);
      });

      this.isConnected = true;
      console.log('[ASR-Client] Redis 已连接，订阅 asr:events');
    } catch (err: any) {
      console.warn(`[ASR-Client] Redis 连接失败: ${err.message}`);
    }
  }

  /**
   * 处理来自 ASR 微服务的事件
   */
  private handleEvent(message: string): void {
    try {
      const event: ASREvent = JSON.parse(message);

      // 触发 session 级别的处理器
      const sessionHandler = this.sessionHandlers.get(event.sessionId);
      if (sessionHandler) {
        sessionHandler(event);
      }

      // 触发事件类型级别的处理器
      const handlers = this.eventHandlers.get(event.event) || [];
      for (const handler of handlers) {
        handler(event);
      }
    } catch (err: any) {
      console.error(`[ASR-Client] 解析事件失败: ${err.message}`);
    }
  }

  /**
   * 注册特定 session 的事件处理器
   * 当该 session 的 ASR 产生结果时回调
   */
  onSessionEvent(sessionId: string, handler: ASREventHandler): void {
    this.sessionHandlers.set(sessionId, handler);
  }

  /**
   * 移除 session 事件处理器
   */
  removeSessionHandler(sessionId: string): void {
    this.sessionHandlers.delete(sessionId);
  }

  /**
   * 注册全局事件处理器
   */
  on(event: string, handler: ASREventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * 发送控制指令到 ASR 微服务
   */
  sendCommand(sessionId: string, command: string, payload?: any): void {
    if (!this.isConnected || !this.publisher) {
      console.warn('[ASR-Client] Redis 未连接，无法发送指令');
      return;
    }

    this.publisher.publish('asr:commands', JSON.stringify({
      sessionId,
      command,
      payload,
      timestamp: Date.now(),
      source: 'backend-api',
    }));
  }

  /**
   * 强制关闭某个 ASR 会话
   */
  forceCloseSession(sessionId: string): void {
    this.sendCommand(sessionId, 'force_close');
    this.removeSessionHandler(sessionId);
  }

  /**
   * 检查 ASR 服务健康状态
   */
  async checkHealth(): Promise<{ status: string; activeSessions: number } | null> {
    try {
      const response = await fetch(`${this.asrServiceUrl}/health`);
      const data = await response.json() as { status: string; activeSessions: number };
      return data;
    } catch {
      return null;
    }
  }

  /**
   * 获取 ASR 服务 WebSocket 地址（供客户端直连）
   */
  getWebSocketUrl(): string {
    const wsUrl = this.asrServiceUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws/asr`;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const qwen3ASRClient = Qwen3ASRServiceClient.getInstance();
