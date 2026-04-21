import Redis from 'ioredis';

/**
 * Qwen3 TTS 微服务客户端
 * backend-api 通过此客户端与独立的 TTS 微服务交互
 *
 * 通信方式：
 *   - Redis pub/sub: 发布 tts:commands 发送合成指令
 *   - Redis pub/sub: 订阅 tts:events 接收音频数据和状态事件
 *   - HTTP POST /synthesize: 触发文本合成
 */

interface TTSEvent {
  sessionId: string;
  event: string;
  payload: any;
  timestamp: number;
  source: string;
}

type TTSEventHandler = (event: TTSEvent) => void;

export class Qwen3TTSServiceClient {
  private static instance: Qwen3TTSServiceClient;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private eventHandlers = new Map<string, TTSEventHandler[]>();
  private sessionHandlers = new Map<string, TTSEventHandler>();
  private ttsServiceUrl: string;
  private isConnected = false;

  private constructor() {
    this.ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://localhost:3003';
    this.initRedis();
  }

  static getInstance(): Qwen3TTSServiceClient {
    if (!Qwen3TTSServiceClient.instance) {
      Qwen3TTSServiceClient.instance = new Qwen3TTSServiceClient();
    }
    return Qwen3TTSServiceClient.instance;
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[TTS-Client] REDIS_URL 未配置，TTS 微服务集成不可用');
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

      await this.subscriber.subscribe('tts:events');
      this.subscriber.on('message', (_channel, message) => {
        this.handleEvent(message);
      });

      this.isConnected = true;
      console.log('[TTS-Client] Redis 已连接，订阅 tts:events');
    } catch (err: any) {
      console.warn(`[TTS-Client] Redis 连接失败: ${err.message}`);
    }
  }

  private handleEvent(message: string): void {
    try {
      const event: TTSEvent = JSON.parse(message);

      const sessionHandler = this.sessionHandlers.get(event.sessionId);
      if (sessionHandler) {
        sessionHandler(event);
      }

      const handlers = this.eventHandlers.get(event.event) || [];
      for (const handler of handlers) {
        handler(event);
      }
    } catch (err: any) {
      console.error(`[TTS-Client] 解析事件失败: ${err.message}`);
    }
  }

  /**
   * 注册特定 session 的事件处理器
   */
  onSessionEvent(sessionId: string, handler: TTSEventHandler): void {
    this.sessionHandlers.set(sessionId, handler);
  }

  removeSessionHandler(sessionId: string): void {
    this.sessionHandlers.delete(sessionId);
  }

  on(event: string, handler: TTSEventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * 通过 Redis 发送文本合成指令到 TTS 微服务
   * 适合 LLM 生成文本后的流式 TTS 场景
   *
   * @param sessionId TTS 会话 ID
   * @param text 要合成的文本（可以是部分文本，多次调用实现流式输入）
   * @param commit 是否立即提交合成（commit 模式下需要显式提交）
   */
  synthesize(sessionId: string, text: string, commit = false): void {
    if (!this.isConnected || !this.publisher) {
      console.warn('[TTS-Client] Redis 未连接，尝试 HTTP 回退');
      this.synthesizeHttp(sessionId, text, commit).catch(err => {
        console.error(`[TTS-Client] HTTP 合成失败: ${err.message}`);
      });
      return;
    }

    this.publisher.publish('tts:commands', JSON.stringify({
      sessionId,
      command: 'synthesize',
      text,
      commit,
      timestamp: Date.now(),
      source: 'backend-api',
    }));
  }

  /**
   * 通过 HTTP 发送合成请求（Redis 不可用时的回退方案）
   */
  async synthesizeHttp(sessionId: string, text: string, commit = false): Promise<void> {
    await fetch(`${this.ttsServiceUrl}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, text, commit }),
    });
  }

  /**
   * 提交文本缓冲区（commit 模式）
   */
  commitText(sessionId: string): void {
    this.sendCommand(sessionId, 'commit');
  }

  /**
   * 清空当前合成（中断）
   */
  clearSynthesis(sessionId: string): void {
    this.sendCommand(sessionId, 'clear');
  }

  /**
   * 关闭 TTS 会话
   */
  closeSession(sessionId: string): void {
    this.sendCommand(sessionId, 'close');
    this.removeSessionHandler(sessionId);
  }

  private sendCommand(sessionId: string, command: string, payload?: any): void {
    if (!this.isConnected || !this.publisher) return;

    this.publisher.publish('tts:commands', JSON.stringify({
      sessionId,
      command,
      payload,
      timestamp: Date.now(),
      source: 'backend-api',
    }));
  }

  /**
   * 检查 TTS 服务健康状态
   */
  async checkHealth(): Promise<{ status: string; activeSessions: number } | null> {
    try {
      const response = await fetch(`${this.ttsServiceUrl}/health`);
      const data = await response.json() as { status: string; activeSessions: number };
      return data;
    } catch {
      return null;
    }
  }

  /**
   * 获取 TTS 服务 WebSocket 地址（供客户端直连）
   */
  getWebSocketUrl(): string {
    const wsUrl = this.ttsServiceUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws/tts`;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const qwen3TTSClient = Qwen3TTSServiceClient.getInstance();
