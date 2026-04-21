import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Qwen3-TTS DashScope WebSocket 客户端
 * 双轨混合流式架构（Dual-Track Hybrid Streaming）：
 *   - Track 1: 文本流式输入 → 服务端实时接收文本片段
 *   - Track 2: 音频流式输出 → 服务端实时返回合成音频块
 *
 * 两条轨道可以并行运行，实现真正的端到端低延迟：
 *   文本还在输入的同时，已合成的音频就在输出
 *   首包延迟可低至 ~97ms
 *
 * 协议流程:
 *   connect → session.update → input_text_buffer.append (多次) → [input_text_buffer.commit] → session.finish
 *   server:  session.created → response.created → response.audio.delta (多次) → response.done → session.finished
 *
 * 合成模式:
 *   server_commit: 服务端自动判断分段，适合流式 LLM 输出场景
 *   commit: 客户端手动触发合成，适合需要精确控制断句的场景
 */
export interface Qwen3TTSConfig {
  voice: string;
  sampleRate: number;
  responseFormat: string;
  mode: 'server_commit' | 'commit';
  language: string;
  /** 自然语言指令（仅 qwen3-tts-instruct-flash-realtime 模型生效） */
  instructions?: string;
}

export interface TTSEventCallbacks {
  onSessionCreated: (sessionInfo: any) => void;
  /** 收到音频数据块（Base64 编码） */
  onAudioDelta: (audioBase64: string, responseId?: string) => void;
  /** 单次响应完成（对应一段文本的合成完成） */
  onResponseDone: (responseId?: string) => void;
  /** 整个会话结束 */
  onSessionFinished: () => void;
  onError: (error: string) => void;
}

export class Qwen3TTSClient {
  private ws: WebSocket | null = null;
  private dashscopeUrl: string;
  private apiKey: string;
  private model: string;
  private fallbackModel: string | null;
  private config: Qwen3TTSConfig;
  private callbacks: TTSEventCallbacks;
  private sessionId: string | null = null;
  private currentResponseId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 3;
  private firstAudioTime: number | null = null;
  private connectTime: number | null = null;
  /** 当前是否已降级到 fallback 模型 */
  private usingFallback = false;

  constructor(config: Qwen3TTSConfig, callbacks: TTSEventCallbacks) {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    this.model = process.env.QWEN_TTS_MODEL || 'qwen3-tts-flash-realtime';
    this.fallbackModel = process.env.QWEN_TTS_FALLBACK_MODEL || null;
    this.dashscopeUrl = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
    this.config = config;
    this.callbacks = callbacks;

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
    }
  }

  /**
   * 建立与 DashScope Qwen3-TTS 的 WebSocket 连接
   * 如果首选模型连接失败且配置了 fallback 模型，会自动降级
   */
  async connect(): Promise<void> {
    try {
      await this.connectWithModel(this.model);
    } catch (err: any) {
      // 首选模型失败，尝试 fallback
      if (this.fallbackModel && this.fallbackModel !== this.model && !this.usingFallback) {
        logger.warn(`[Qwen3-TTS] 首选模型 ${this.model} 连接失败: ${err.message}`);
        logger.info(`[Qwen3-TTS] 尝试降级到备选模型: ${this.fallbackModel}`);
        this.usingFallback = true;
        const originalModel = this.model;
        this.model = this.fallbackModel;
        try {
          await this.connectWithModel(this.model);
          logger.info(`[Qwen3-TTS] 降级成功：${originalModel} → ${this.model}`);
          // 降级到 flash 模型时，instructions 不生效，清除避免误解
          if (!this.model.includes('instruct')) {
            logger.warn('[Qwen3-TTS] 备选模型不支持 instructions 情感指令，已忽略');
          }
          return;
        } catch (fallbackErr: any) {
          logger.error(`[Qwen3-TTS] 备选模型也失败: ${fallbackErr.message}`);
          this.model = originalModel;
          throw fallbackErr;
        }
      }
      throw err;
    }
  }

  /**
   * 使用指定模型建立 WebSocket 连接
   */
  private connectWithModel(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.dashscopeUrl}?model=${modelName}`;

      logger.info(`[Qwen3-TTS] 正在连接 DashScope: ${url}`);
      logger.info(`[Qwen3-TTS] model=${modelName}, apiKey=${this.apiKey ? 'sk-***' + this.apiKey.slice(-4) : '未设置'}`);
      this.connectTime = Date.now();

      /** 标记 connect Promise 是否已 settled，避免 close 事件重复触发 */
      let settled = false;

      const timeout = setTimeout(() => {
        logger.error('[Qwen3-TTS] 连接 DashScope 超时 (10s)');
        if (this.ws) { this.ws.close(); this.ws = null; }
        if (!settled) { settled = true; reject(new Error('连接 DashScope TTS 超时')); }
      }, 10000);

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      this.ws.on('open', () => {
        clearTimeout(timeout);
        logger.info(`[Qwen3-TTS] DashScope WebSocket 连接成功 (model=${modelName})`);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this.sendSessionUpdate();
        if (!settled) { settled = true; resolve(); }
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        logger.info(`[Qwen3-TTS] DashScope 连接关闭: code=${code}, reason=${reasonStr}`);
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.ws = null;

        // Access denied → 如果 connect 还未 settle，reject 让外层 fallback 处理
        if (code === 1007 || reasonStr.toLowerCase().includes('access denied')) {
          logger.error(`[Qwen3-TTS] DashScope 拒绝访问 (model=${modelName})，请检查账号状态和 API Key 权限`);
          if (!settled) {
            settled = true;
            reject(new Error(`DashScope 拒绝访问 (code=${code}): ${reasonStr}`));
          } else {
            this.callbacks.onError(`DashScope 拒绝访问 (code=${code}): ${reasonStr}`);
            this.callbacks.onSessionFinished();
          }
          return;
        }

        // 其他非正常关闭 → 尝试自动重连
        if (wasConnected && code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT) {
          this.reconnectAttempts++;
          const delay = 1000 * this.reconnectAttempts;
          logger.info(`[Qwen3-TTS] 将在 ${delay}ms 后自动重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT})`);
          this.callbacks.onError(`DashScope TTS 连接断开，正在重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT})...`);
          setTimeout(() => {
            this.connectWithModel(this.model).then(() => {
              logger.info('[Qwen3-TTS] 自动重连成功');
            }).catch(err => {
              logger.error(`[Qwen3-TTS] 自动重连失败: ${err.message}`);
              this.callbacks.onError(`DashScope TTS 重连失败: ${err.message}`);
              if (this.reconnectAttempts >= this.MAX_RECONNECT) {
                this.callbacks.onSessionFinished();
              }
            });
          }, delay);
        } else if (wasConnected && code !== 1000) {
          logger.error('[Qwen3-TTS] 重连次数已用尽，通知会话结束');
          this.callbacks.onError('DashScope TTS 连接丢失，重连次数已用尽');
          this.callbacks.onSessionFinished();
        }
      });

      this.ws.on('error', (err: any) => {
        clearTimeout(timeout);
        const details = err.code ? ` (code=${err.code})` : '';
        logger.error(`[Qwen3-TTS] DashScope WebSocket 错误: ${err.message}${details}`);
        logger.error(`[Qwen3-TTS] 连接参数: url=${url}, model=${modelName}`);
        this.isConnected = false;
        if (!settled) { settled = true; reject(err); }
      });
    });
  }

  /**
   * 发送 session.update 配置 TTS 参数
   */
  private sendSessionUpdate(): void {
    const sessionConfig: any = {
      mode: this.config.mode,
      voice: this.config.voice,
      response_format: this.config.responseFormat,
      sample_rate: this.config.sampleRate,
      language_type: this.config.language,
    };

    // 如果使用 instruct 模型且配置了指令
    if (this.config.instructions) {
      sessionConfig.instructions = this.config.instructions;
      sessionConfig.optimize_instructions = true;
    }

    const event = {
      event_id: `evt_${uuidv4().slice(0, 8)}`,
      type: 'session.update',
      session: sessionConfig,
    };

    this.send(event);
    logger.debug(`[Qwen3-TTS] 已发送 session.update, voice=${this.config.voice}, mode=${this.config.mode}`);
  }

  /**
   * 处理 DashScope 返回的消息
   */
  private handleMessage(raw: string): void {
    try {
      const data = JSON.parse(raw);
      const eventType = data.type;

      switch (eventType) {
        case 'session.created':
          this.sessionId = data.session?.id;
          logger.info(`[Qwen3-TTS] 会话已创建: ${this.sessionId}`);
          this.callbacks.onSessionCreated(data.session);
          break;

        case 'session.updated':
          logger.debug(`[Qwen3-TTS] 会话配置已更新`);
          break;

        case 'input_text_buffer.committed':
          logger.debug(`[Qwen3-TTS] 文本缓冲区已提交, itemId=${data.item_id}`);
          break;

        case 'response.created':
          this.currentResponseId = data.response?.id;
          this.firstAudioTime = null; // 重置首包计时
          logger.debug(`[Qwen3-TTS] 响应已创建: ${this.currentResponseId}`);
          break;

        case 'response.audio.delta':
          // 核心：接收流式音频数据块
          if (!this.firstAudioTime) {
            this.firstAudioTime = Date.now();
            const latency = this.connectTime ? this.firstAudioTime - this.connectTime : 0;
            logger.info(`[Qwen3-TTS] 首包音频延迟: ${latency}ms`);
          }
          this.callbacks.onAudioDelta(data.delta || '', this.currentResponseId || undefined);
          break;

        case 'response.audio.done':
          logger.debug('[Qwen3-TTS] 音频生成完成');
          break;

        case 'response.done':
          logger.info(`[Qwen3-TTS] 响应完成: ${this.currentResponseId}`);
          this.callbacks.onResponseDone(this.currentResponseId || undefined);
          this.currentResponseId = null;
          break;

        case 'session.finished':
          logger.info('[Qwen3-TTS] 会话已结束');
          this.callbacks.onSessionFinished();
          break;

        case 'error':
          const errMsg = data.error?.message || JSON.stringify(data);
          logger.error(`[Qwen3-TTS] DashScope 错误: ${errMsg}`);
          this.callbacks.onError(errMsg);
          break;

        default:
          logger.debug(`[Qwen3-TTS] 未处理事件: ${eventType}`);
      }
    } catch (err: any) {
      logger.error(`[Qwen3-TTS] 解析消息失败: ${err.message}`);
    }
  }

  /**
   * 追加文本（双轨 Track 1：文本流式输入）
   * 可以多次调用，文本会追加到缓冲区
   * 在 server_commit 模式下，服务端会自动判断合成时机
   */
  appendText(text: string): void {
    if (!this.isConnected || !this.ws) {
      logger.warn(`[Qwen3-TTS] 未连接 DashScope，无法发送文本: "${text.substring(0, 30)}..."`);
      return;
    }

    const event = {
      event_id: `evt_${Date.now()}`,
      type: 'input_text_buffer.append',
      text,
    };

    this.send(event);
  }

  /**
   * 手动提交文本缓冲区（commit 模式下使用）
   * 触发服务端合成已缓冲的文本
   */
  commitText(): void {
    const event = {
      event_id: `evt_commit_${Date.now()}`,
      type: 'input_text_buffer.commit',
    };
    this.send(event);
  }

  /**
   * 清空文本缓冲区（用于中断当前合成）
   */
  clearTextBuffer(): void {
    const event = {
      event_id: `evt_clear_${Date.now()}`,
      type: 'input_text_buffer.clear',
    };
    this.send(event);
  }

  /**
   * 结束 TTS 会话
   */
  finish(): void {
    const event = {
      event_id: `evt_finish_${Date.now()}`,
      type: 'session.finish',
    };
    this.send(event);
    logger.info('[Qwen3-TTS] 已发送 session.finish');
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closing');
      } catch (err) {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 获取首包音频延迟（ms）
   */
  get firstAudioLatency(): number | null {
    if (!this.firstAudioTime || !this.connectTime) return null;
    return this.firstAudioTime - this.connectTime;
  }

  /** 当前实际使用的模型名称（可能因降级而与配置不同） */
  get activeModel(): string {
    return this.model;
  }

  /** 是否已降级到 fallback 模型 */
  get isFallback(): boolean {
    return this.usingFallback;
  }
}
