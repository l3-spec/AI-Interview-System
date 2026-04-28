import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Qwen3-ASR DashScope WebSocket 客户端
 * 与 DashScope 实时 ASR API 建立 WebSocket 长连接，实现流式语音识别
 *
 * 协议流程:
 *   connect → session.update → input_audio_buffer.append (多次) → session.finish
 *   server:  session.created → speech_started → transcription.text → speech_stopped → transcription.completed → session.finished
 */
export interface Qwen3ASRConfig {
  language: string;
  sampleRate: number;
  inputFormat: string;
  vadMode: 'server_vad' | 'manual';
  vadSilenceDurationMs: number;
}

export interface ASREventCallbacks {
  onSessionCreated: (sessionInfo: any) => void;
  onSpeechStarted: () => void;
  onSpeechStopped: () => void;
  /** 中间识别结果（实时部分文本） */
  onTranscriptionText: (text: string, stash?: string) => void;
  /** 最终识别结果 */
  onTranscriptionCompleted: (transcript: string) => void;
  onSessionFinished: () => void;
  onError: (error: string) => void;
}

export class Qwen3ASRClient {
  private static globalModelIndex = 0;
  
  private ws: WebSocket | null = null;
  private dashscopeUrl: string;
  private apiKey: string;
  private models: string[];
  private currentModelIndex = 0;
  private config: Qwen3ASRConfig;
  private callbacks: ASREventCallbacks;
  private sessionId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  /** 限流：「未连接」警告每 5 秒最多打印一次 */
  private lastDisconnectWarnAt = 0;
  private disconnectWarnCount = 0;

  constructor(config: Qwen3ASRConfig, callbacks: ASREventCallbacks) {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    const modelEnv = process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime';
    this.models = modelEnv.split(',').map(m => m.trim()).filter(Boolean);
    
    const defaultFallbacks = [
      'qwen3-asr-flash-realtime-2025-10-27',
      'qwen3-asr-flash-realtime-2026-02-10',
      'qwen3-asr-flash-2026-02-10',
      'qwen3-asr-flash-2025-09-08'
    ];
    
    if (this.models.length <= 1) {
      for (const fallback of defaultFallbacks) {
        if (!this.models.includes(fallback)) {
          this.models.push(fallback);
        }
      }
    }
    
    // 初始化为全局索引
    this.currentModelIndex = Qwen3ASRClient.globalModelIndex % this.models.length;
    this.dashscopeUrl = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
    this.config = config;
    this.callbacks = callbacks;

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
    }
  }

  /**
   * 建立与 DashScope Qwen3-ASR 的 WebSocket 连接
   * 若当前模型失败，则轮换至下一个备用模型
   */
  async connect(): Promise<void> {
    let lastError: Error | null = null;
    
    // 尝试列表中每个模型，最多尝试 models.length 次
    for (let i = 0; i < this.models.length; i++) {
      const currentModel = this.models[this.currentModelIndex];
      try {
        await this.connectWithModel(currentModel);
        if (i > 0) {
          logger.info(`[Qwen3-ASR] 轮换成功：当前使用模型 ${currentModel}`);
          Qwen3ASRClient.globalModelIndex = this.currentModelIndex;
        }
        return; // 连接成功
      } catch (err: any) {
        lastError = err;
        logger.warn(`[Qwen3-ASR] 模型 ${currentModel} 连接失败: ${err.message}`);
        
        // 轮换至下一个模型
        this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
        if (i === 0) {
          Qwen3ASRClient.globalModelIndex = this.currentModelIndex;
        }
        if (i < this.models.length - 1) {
          logger.info(`[Qwen3-ASR] 尝试轮换至下一个备选模型: ${this.models[this.currentModelIndex]}`);
        }
      }
    }
    
    throw lastError || new Error('所有 ASR 模型均连接失败');
  }

  /**
   * 使用指定模型建立 WebSocket 连接
   */
  private connectWithModel(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.dashscopeUrl}?model=${modelName}`;

      logger.info(`[Qwen3-ASR] 正在连接 DashScope: ${url}`);
      logger.info(`[Qwen3-ASR] model=${modelName}, apiKey=${this.apiKey ? 'sk-***' + this.apiKey.slice(-4) : '未设置'}`);
      if (this.apiKey) {
        const intl = this.apiKey.startsWith('sk-intl');
        logger.info(
          `[Qwen3-ASR] Key 区域提示: ${intl ? '国际区 sk-intl-（WebSocket 需与国际区文档一致）' : '国内区（常见 sk- 非 intl）'}`,
        );
      }

      let settled = false;

      const timeout = setTimeout(() => {
        logger.error('[Qwen3-ASR] 连接 DashScope 超时 (10s)');
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        if (!settled) { settled = true; reject(new Error('连接 DashScope 超时')); }
      }, 10000);

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.ws.on('open', () => {
        clearTimeout(timeout);
        logger.info('[Qwen3-ASR] DashScope WebSocket 连接成功');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this.sendSessionUpdate();
        if (!settled) { settled = true; resolve(); }
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        // 预检消息以捕获早期错误
        try {
          const json = JSON.parse(raw);
          if (json.type === 'error' && !settled) {
            const errMsg = json.error?.message || json.message || JSON.stringify(json);
            logger.error(`[Qwen3-ASR] 会话建立前收到错误: ${errMsg}`);
            settled = true;
            reject(new Error(`DashScope ASR 握手失败: ${errMsg}`));
          }
        } catch (_e) {}
        
        this.handleMessage(raw);
      });

      this.ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        logger.info(`[Qwen3-ASR] DashScope 连接关闭: code=${code}, reason=${reasonStr}`);
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.ws = null;

        const authLike =
          /access\s*denied|unauthorized|invalid\s*api|api\s*key|forbidden|authentication\s*failed/i.test(
            reasonStr,
          );
        if (code === 1007 && authLike) {
          logger.error(`[Qwen3-ASR] DashScope 鉴权/访问被拒: ${reasonStr}`);
          if (!settled) {
            settled = true;
            reject(new Error(`DashScope 鉴权失败 (code=${code}): ${reasonStr}`));
          } else {
            this.callbacks.onError(`DashScope 鉴权失败 (code=${code}): ${reasonStr}`);
            this.callbacks.onSessionFinished();
          }
          return;
        }
        if (code === 1007) {
          logger.error(
            `[Qwen3-ASR] DashScope 关闭连接 code=1007（以 reason 为准，不一定是 Key 问题）: ${reasonStr}`,
          );
          if (!settled) {
            settled = true;
            reject(new Error(`DashScope 关闭连接 (code=1007): ${reasonStr}`));
          } else {
            this.callbacks.onError(`DashScope: ${reasonStr}`);
            this.callbacks.onSessionFinished();
          }
          return;
        }

        if (wasConnected && code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = 1000 * this.reconnectAttempts;
          logger.info(`[Qwen3-ASR] 将在 ${delay}ms 后自动重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
          this.callbacks.onError(`DashScope 连接断开，正在重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(() => {
            this.connect().then(() => {
              logger.info('[Qwen3-ASR] 自动重连成功');
              this.callbacks.onSessionCreated({ id: this.sessionId });
            }).catch(err => {
              logger.error(`[Qwen3-ASR] 自动重连失败: ${err.message}`);
              this.callbacks.onError(`DashScope 重连失败: ${err.message}`);
              if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
                this.callbacks.onSessionFinished();
              }
            });
          }, delay);
        } else if (wasConnected && code !== 1000) {
          logger.error('[Qwen3-ASR] 重连次数已用尽，通知会话结束');
          this.callbacks.onError('DashScope 连接丢失，重连次数已用尽');
          this.callbacks.onSessionFinished();
        }
      });

      this.ws.on('error', (err: any) => {
        clearTimeout(timeout);
        const details = err.code ? ` (code=${err.code})` : '';
        logger.error(`[Qwen3-ASR] DashScope WebSocket 错误: ${err.message}${details}`);
        logger.error(`[Qwen3-ASR] 连接参数: url=${url}, model=${modelName}, apiKey=${this.apiKey ? 'sk-***' + this.apiKey.slice(-4) : '未设置'}`);
        this.isConnected = false;
        if (!settled) { settled = true; reject(err); }
      });
    });
  }

  /**
   * 发送 session.update 事件配置 ASR 参数
   */
  private sendSessionUpdate(): void {
    const turnDetection = this.config.vadMode === 'server_vad'
      ? {
          type: 'server_vad',
          threshold: 0.0,
          silence_duration_ms: this.config.vadSilenceDurationMs,
        }
      : null; // manual 模式不设置 turn_detection

    const event = {
      event_id: `evt_${uuidv4().slice(0, 8)}`,
      type: 'session.update',
      session: {
        modalities: ['text'],
        input_audio_format: this.config.inputFormat,
        sample_rate: this.config.sampleRate,
        input_audio_transcription: {
          language: this.config.language,
        },
        turn_detection: turnDetection,
      },
    };

    this.send(event);
    logger.debug(`[Qwen3-ASR] 已发送 session.update, VAD=${this.config.vadMode}, lang=${this.config.language}`);
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
          logger.info(`[Qwen3-ASR] 会话已创建: ${this.sessionId}`);
          this.callbacks.onSessionCreated(data.session);
          break;

        case 'input_audio_buffer.speech_started':
          logger.debug('[Qwen3-ASR] 检测到语音开始');
          this.callbacks.onSpeechStarted();
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug('[Qwen3-ASR] 检测到语音结束');
          this.callbacks.onSpeechStopped();
          break;

        case 'conversation.item.input_audio_transcription.text':
          // 中间识别结果
          this.callbacks.onTranscriptionText(data.text || '', data.stash || '');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // 最终识别结果
          logger.info(`[Qwen3-ASR] 识别完成: "${data.transcript}"`);
          this.callbacks.onTranscriptionCompleted(data.transcript || '');
          break;

        case 'session.finished':
          logger.info('[Qwen3-ASR] 会话已结束');
          this.callbacks.onSessionFinished();
          break;

        case 'error':
          logger.error(`[Qwen3-ASR] DashScope error 事件(原始JSON): ${JSON.stringify(data)}`);
          {
            const errMsg =
              data.error?.message ||
              data.message ||
              (typeof data.error === 'string' ? data.error : JSON.stringify(data.error ?? data));
            logger.error(`[Qwen3-ASR] DashScope 错误(可读): ${errMsg}`);
            this.callbacks.onError(errMsg);
          }
          break;

        default:
          logger.debug(`[Qwen3-ASR] 未处理事件: ${eventType}`);
      }
    } catch (err: any) {
      logger.error(`[Qwen3-ASR] 解析消息失败: ${err.message}`);
    }
  }

  /**
   * 追加音频数据（Base64 编码的 PCM）
   */
  appendAudio(audioBase64: string): void {
    if (!this.isConnected || !this.ws) {
      this.disconnectWarnCount++;
      const now = Date.now();
      if (now - this.lastDisconnectWarnAt > 5000) {
        logger.warn(`[Qwen3-ASR] 未连接 DashScope，丢弃 ${this.disconnectWarnCount} 个音频块`);
        this.lastDisconnectWarnAt = now;
        this.disconnectWarnCount = 0;
      }
      return;
    }

    const event = {
      event_id: `evt_${Date.now()}`,
      type: 'input_audio_buffer.append',
      audio: audioBase64,
    };

    this.send(event);
  }

  /**
   * 手动模式下提交音频缓冲区
   */
  commitAudio(): void {
    const event = {
      event_id: `evt_commit_${Date.now()}`,
      type: 'input_audio_buffer.commit',
    };
    this.send(event);
  }

  /**
   * 结束 ASR 会话
   */
  finish(): void {
    if (this.config.vadMode === 'manual') {
      this.commitAudio();
    }

    const event = {
      event_id: `evt_finish_${Date.now()}`,
      type: 'session.finish',
    };
    this.send(event);
    logger.info('[Qwen3-ASR] 已发送 session.finish');
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
}
