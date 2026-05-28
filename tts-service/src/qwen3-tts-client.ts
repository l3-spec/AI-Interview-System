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
  /** 收到增量文本翻译/转写（用于 KTV 字幕同步） */
  onTranscriptDelta: (text: string, audioTime?: number, responseId?: string) => void;
  /** 单次响应完成（对应一段文本的合成完成） */
  onResponseDone: (responseId?: string) => void;
  /** 整个会话结束 */
  onSessionFinished: () => void;
  onError: (error: string) => void;
}

export class Qwen3TTSClient {
  /**
   * DashScope 对单条 input_text_buffer.append 有「折算长度」上限（约 2000），中文权重更高。
   * 保守按原始字符数切块，避免 invalid_value / CLIENT_ERROR。
   */
  private static readonly MAX_APPEND_RAW_CHARS = 900;

  private static globalModelIndex = 0;
  private static lastGlobalFailureAt = 0;

  // ============== 并发安全：模型轮换互斥与健康度追踪 ==============
  /** 模型轮换互斥锁（Promise 链）：避免多个会话同时修改 globalModelIndex 造成错乱 */
  private static modelRotationLock: Promise<void> = Promise.resolve();
  /** 各模型最近一次失败时间戳（毫秒） */
  private static modelFailureTimestamps: Map<string, number> = new Map();
  /** 模型失败后的冷却期：30 秒内不重复选中同一模型 */
  private static readonly MODEL_COOLDOWN_MS = 30_000;

  /**
   * 安全地将全局模型索引轮换到下一个模型。
   * 通过 Promise 链实现互斥，确保并发调用时按顺序执行。
   */
  private static async rotateModelSafely(modelsLength: number): Promise<number> {
    let resolveRelease: () => void = () => {};
    const prevLock = Qwen3TTSClient.modelRotationLock;
    Qwen3TTSClient.modelRotationLock = new Promise<void>((resolve) => {
      resolveRelease = resolve;
    });

    await prevLock; // 等待前一个轮换完成
    try {
      const newIndex = (Qwen3TTSClient.globalModelIndex + 1) % modelsLength;
      Qwen3TTSClient.globalModelIndex = newIndex;
      return newIndex;
    } finally {
      resolveRelease();
    }
  }

  /**
   * 从全局索引开始，找出第一个不在冷却期的模型；若全部在冷却中，返回最早失败的。
   */
  private static getHealthyModelIndex(models: string[]): number {
    const now = Date.now();
    const len = models.length;
    for (let i = 0; i < len; i++) {
      const idx = (Qwen3TTSClient.globalModelIndex + i) % len;
      const modelName = models[idx];
      const lastFailure = Qwen3TTSClient.modelFailureTimestamps.get(modelName);
      if (!lastFailure || now - lastFailure > Qwen3TTSClient.MODEL_COOLDOWN_MS) {
        return idx;
      }
    }
    // 所有模型均处于冷却期，回退到最早失败的（通常即最久没失败的）
    let oldestFailureIdx = Qwen3TTSClient.globalModelIndex;
    let oldestTime = Infinity;
    for (let i = 0; i < len; i++) {
      const failTime = Qwen3TTSClient.modelFailureTimestamps.get(models[i]) ?? 0;
      if (failTime < oldestTime) {
        oldestTime = failTime;
        oldestFailureIdx = i;
      }
    }
    return oldestFailureIdx;
  }

  /** 记录模型失败时间戳并打印健康度日志 */
  private static recordModelFailure(modelName: string): void {
    Qwen3TTSClient.modelFailureTimestamps.set(modelName, Date.now());
    logger.warn(
      `[模型健康][TTS] 模型 ${modelName} 标记为失败, 冷却 ${Qwen3TTSClient.MODEL_COOLDOWN_MS / 1000}s`,
    );
  }

  /** 输出当前模型健康度汇总日志 */
  private static logModelHealthSummary(): void {
    const failures: Record<string, number> = {};
    Qwen3TTSClient.modelFailureTimestamps.forEach((ts, name) => {
      failures[name] = ts;
    });
    logger.info(
      `[模型健康][TTS] 状态汇总: ${JSON.stringify({
        currentIndex: Qwen3TTSClient.globalModelIndex,
        failures,
      })}`,
    );
  }
  // ===============================================================

  private ws: WebSocket | null = null;
  private dashscopeUrl: string;
  private apiKey: string;
  private models: string[];
  private currentModelIndex = 0;
  private config: Qwen3TTSConfig;
  private callbacks: TTSEventCallbacks;
  private sessionId: string | null = null;
  private currentResponseId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 3;
  private firstAudioTime: number | null = null;
  private connectTime: number | null = null;
  private responseStartTime: number | null = null;

  constructor(config: Qwen3TTSConfig, callbacks: TTSEventCallbacks) {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    const modelEnv = process.env.QWEN_TTS_MODEL || 'qwen3-tts-flash-realtime';
    this.models = modelEnv.split(',').map(m => m.trim()).filter(Boolean);
    
    // 核心兜底逻辑：如果用户只配置了一个模型，
    // 且该模型已经欠费或不可用，我们需要确保有备选模型可以轮换。
    const defaultFallbacks = [
      'qwen3-tts-instruct-flash-realtime-2026-01-22',
      'qwen3-tts-flash-realtime-2025-11-27',
      'qwen3-tts-flash-realtime-2025-09-18'
    ];
    
    const disableFallback = process.env.QWEN_TTS_DISABLE_FALLBACK === 'true';
    if (!disableFallback && this.models.length <= 1) {
      // 将备选模型追加到列表，除非它们已经存在
      for (const fallback of defaultFallbacks) {
        if (!this.models.includes(fallback)) {
          this.models.push(fallback);
        }
      }
    }
    this.dashscopeUrl = process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
    this.config = config;
    this.callbacks = callbacks;
    
    // 初始化当前实例的模型索引为“健康模型”（避开冷却期内的失败模型）
    this.currentModelIndex = Qwen3TTSClient.getHealthyModelIndex(this.models);

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
    }
  }

  /**
   * 建立与 DashScope Qwen3-TTS 的 WebSocket 连接
   * 如果首选模型连接失败且配置了备选模型，会自动轮换降级
   */
  async connect(): Promise<void> {
    let lastError: Error | null = null;

    // 入口先选一个健康模型（避开冷却期内的失败模型）
    this.currentModelIndex = Qwen3TTSClient.getHealthyModelIndex(this.models);

    // 尝试列表中每个模型，最多尝试 models.length 次
    for (let i = 0; i < this.models.length; i++) {
      const currentModel = this.models[this.currentModelIndex];
      try {
        await this.connectWithModel(currentModel);
        // 连接成功：同步更新全局索引，让后续新会话直接使用此模型
        Qwen3TTSClient.globalModelIndex = this.currentModelIndex;
        if (i > 0) {
          logger.info(`[Qwen3-TTS] 轮换成功：当前使用模型 ${currentModel}`);
        }
        logger.info(`[模型健康][TTS] 模型 ${currentModel} 连接成功`);
        Qwen3TTSClient.logModelHealthSummary();
        return; // 连接成功
      } catch (err: any) {
        lastError = err;
        logger.warn(`[Qwen3-TTS] 模型 ${currentModel} 连接失败: ${err.message}`);

        // 记录失败时间戳，进入冷却期
        Qwen3TTSClient.recordModelFailure(currentModel);
        Qwen3TTSClient.lastGlobalFailureAt = Date.now();

        // 通过互斥锁安全地轮换全局索引到下一个模型，避免并发会话竞争
        const newIndex = await Qwen3TTSClient.rotateModelSafely(this.models.length);
        this.currentModelIndex = newIndex;

        if (i < this.models.length - 1) {
          logger.info(`[Qwen3-TTS] 尝试轮换至下一个备选模型: ${this.models[this.currentModelIndex]}`);
        }
      }
    }

    Qwen3TTSClient.logModelHealthSummary();
    throw lastError || new Error('所有 TTS 模型均连接失败');
  }

  /**
   * 使用指定模型建立 WebSocket 连接
   */
  private connectWithModel(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.dashscopeUrl}?model=${modelName}`;

      logger.info(`[Qwen3-TTS] 正在连接 DashScope: ${url}`);
      logger.info(`[Qwen3-TTS] model=${modelName}, apiKey=${this.apiKey ? 'sk-***' + this.apiKey.slice(-4) : '未设置'}`);
      if (this.apiKey) {
        const intl = this.apiKey.startsWith('sk-intl');
        logger.info(
          `[Qwen3-TTS] Key 区域提示: ${intl ? '国际区 sk-intl-（WebSocket 需与国际区文档一致）' : '国内区（常见 sk- 非 intl）'}`,
        );
      }
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
        perMessageDeflate: false,
      });

      this.ws.on('open', () => {
        logger.info(`[Qwen3-TTS] DashScope WebSocket 连接成功 (model=${modelName})`);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // DashScope Realtime 协议要求连接建立后先发送 session.update，
        // 服务端随后返回 session.created / session.updated。
        this.sendSessionUpdate();
        // 注意：这里不立即 resolve，等待 session.updated 确认配置已被服务端接受。
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        // 预检消息以确认会话建立或捕获早期错误
        try {
          const json = JSON.parse(raw);
          if (json.type === 'session.created') {
            this.sessionId = json.session?.id;
          } else if (json.type === 'session.updated' && !settled) {
            clearTimeout(timeout);
            settled = true;
            resolve();
          } else if (json.type === 'error' && !settled) {
            const errMsg = json.error?.message || json.message || JSON.stringify(json);
            logger.error(`[Qwen3-TTS] 会话建立前收到错误: ${errMsg}`);
            clearTimeout(timeout);
            settled = true;
            reject(new Error(`DashScope TTS 握手失败: ${errMsg}`));
          }
        } catch (_e) {}
        
        this.handleMessage(raw);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        const reasonStr = reason.toString();
        logger.info(`[Qwen3-TTS] DashScope 连接关闭: code=${code}, reason=${reasonStr}`);
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.ws = null;

        // DashScope 对 WebSocket 的 code=1007 既可能是鉴权失败，也可能是策略类关闭（idle、参数错误等），勿混为一谈
        const authLike =
          /access\s*denied|unauthorized|invalid\s*api|api\s*key|forbidden|authentication\s*failed/i.test(
            reasonStr,
          );
        if (code === 1007 && authLike) {
          logger.error(
            `[Qwen3-TTS] DashScope 鉴权/访问被拒 (model=${modelName}): ${reasonStr}`,
          );
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
            `[Qwen3-TTS] DashScope 关闭连接 code=1007（以 reason 为准，不一定是 Key 问题）: ${reasonStr}`,
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

        if (!settled) {
          settled = true;
          reject(new Error(`DashScope 连接在会话配置完成前关闭 (code=${code}): ${reasonStr}`));
          return;
        }

        // 其他非正常关闭 → 尝试自动重连
        if (wasConnected && code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT) {
          this.reconnectAttempts++;
          const delay = 1000 * this.reconnectAttempts;
          logger.info(`[Qwen3-TTS] 将在 ${delay}ms 后自动重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT})`);
          this.callbacks.onError(`DashScope TTS 连接断开，正在重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT})...`);
          setTimeout(() => {
            this.connect().then(() => {
              logger.info('[Qwen3-TTS] 自动重连成功');
            }).catch(err => {
              logger.error(`[Qwen3-TTS] 自动重连失败: ${err.message}`);
              this.callbacks.onError(`DashScope TTS 重连失败: ${err.message}`);
              if (this.reconnectAttempts >= this.MAX_RECONNECT) {
                this.callbacks.onSessionFinished();
              }
            });
          }, delay);
        } else {
          // 即使是正常关闭 (code=1000)，也需要通知管理器，以便重置连接状态
          this.callbacks.onSessionFinished();
        }
      });

      this.ws.on('error', (err: any) => {
        clearTimeout(timeout);
        const details = err.code ? ` (code=${err.code})` : '';
        logger.error(`[Qwen3-TTS] DashScope WebSocket 错误: ${err.message}${details}`);

        const isInvalidControlPayload =
          err.code === 'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH' ||
          (typeof err.message === 'string' && err.message.includes('invalid payload length 126'));

        // 无论是普通连接出错，还是由于超长关闭原因（如额度耗尽）导致协议帧解析出错 (isInvalidControlPayload)，
        // 只要是刚建立连接（5s 内）就被关闭或出错，都应当将其视为当前模型当前不可用，记录失败并触发轮换。
        if (this.isConnected && (Date.now() - (this.connectTime || 0) < 5000)) {
          logger.warn(`[Qwen3-TTS] 检测到模型 ${modelName} 无法正常服务（短时间内连接出错/断开），将全局轮换至下一个模型`);
          // 记录失败时间戳并通过互斥锁安全轮换（异步触发，不阻塞 error 回调）
          Qwen3TTSClient.recordModelFailure(modelName);
          Qwen3TTSClient.lastGlobalFailureAt = Date.now();
          Qwen3TTSClient.rotateModelSafely(this.models.length).catch(() => {});
        }
        
        // 针对 WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH 错误提供详细的排查诊断引导
        if (isInvalidControlPayload) {
          logger.error('[Qwen3-TTS] 诊断：DashScope 返回了超长关闭原因（超过 125 字节），ws 库由于 RFC 6455 限制无法解析真实错误。');
          logger.error('此超长关闭原因通常为【模型免费额度已耗尽 (The free tier of the model has been exhausted)】或【session.update 会话配置参数错误】。');
          logger.error('请到阿里云百炼控制台进行核对：若为额度用尽，请关闭“仅使用免费额度”模式，并确保账号内有充足余额。');
          logger.error(`[Qwen3-TTS] 当前客户端连接参数: voice="${this.config.voice}", language_type="${this.config.language}"`);
        }
        
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
    // 历史上部分音色在个别地域曾触发 DashScope 报错，仅对仍不稳定的旧名做回退；Neil 等已在百炼 Qwen3 实时 TTS 文档中支持，勿再拦截。
    // 历史上部分音色在个别地域曾触发 DashScope 报错，仅对仍不稳定的旧名做回退
    const invalidVoices = ['bill', 'george', 'ben', 'steven', 'xiaoxiao', 'siri', 'moon', 'loongdavid_v3', 'loongdavid'];
    if (invalidVoices.includes(this.config.voice.toLowerCase())) {
      logger.warn(`[Qwen3-TTS] 检测到不合规或未授权的音色: "${this.config.voice}"，强制回退到官方标准音色 "Ethan" 以确保连接通畅。`);
      this.config.voice = 'Ethan';
    }
    // DashScope 要求音色首字母大写（如 Cherry、Ethan、Serena），保持原始大小写
    const safeVoice = this.config.voice;

    const sessionConfig: any = {
      modalities: ['text', 'audio'],
      incremental_output: true,
      mode: this.config.mode,
      voice: safeVoice,
      response_format: this.config.responseFormat,
      sample_rate: this.config.sampleRate,
      language_type: this.config.language,
    };

    // 仅当使用支持 instructions 的 instruct 或 vd 专属模型时，才在 session.update 中注入该控制指令，避免普通模型（如 vc、flash 等）因不兼容该参数报错。
    if (this.config.instructions && (this.activeModel.includes('instruct') || this.activeModel.includes('vd'))) {
      sessionConfig.instructions = this.config.instructions;
      sessionConfig.optimize_instructions = true;
    }

    const event = {
      event_id: `evt_${uuidv4()}`, // 使用完整 UUID
      type: 'session.update',
      session: sessionConfig,
    };

    this.send(event);
    logger.info(
      `[Qwen3-TTS] session.update 已发送: ${JSON.stringify(sessionConfig)}`,
    );
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
          this.responseStartTime = Date.now(); // 记录响应开始时间，用于精准统计首包延迟
          logger.debug(`[Qwen3-TTS] 响应已创建: ${this.currentResponseId}`);
          break;

        case 'response.audio.delta':
          // 核心：接收流式音频数据块
          if (!this.firstAudioTime) {
            this.firstAudioTime = Date.now();
            // 优先计算从文本提交/响应创建到首包的延迟（最精准的业务感知延迟）
            const refTime = this.responseStartTime || this.connectTime || this.firstAudioTime;
            const latency = this.firstAudioTime - refTime;
            logger.info(`[Qwen3-TTS] 首包音频延迟: ${latency}ms (响应ID: ${this.currentResponseId || 'N/A'})`);
          }
          this.callbacks.onAudioDelta(data.delta || '', this.currentResponseId || undefined);
          break;
        
        case 'response.audio_transcript.delta':
          // 核心：接收增量文本时间戳（KTV 字幕效果）
          logger.info(`[Qwen3-TTS] 收到增量文本: "${data.delta}" audio_time=${data.audio_time}ms`);
          this.callbacks.onTranscriptDelta(
            data.delta || '', 
            data.audio_time, 
            this.currentResponseId || undefined
          );
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
          // 完整打印服务端返回，便于与阿里云文档/工单对照（含 error.code / type 等）
          logger.error(`[Qwen3-TTS] DashScope error 事件(原始JSON): ${JSON.stringify(data)}`);
          {
            const errMsg =
              data.error?.message ||
              data.message ||
              (typeof data.error === 'string' ? data.error : JSON.stringify(data.error ?? data));
            logger.error(`[Qwen3-TTS] DashScope 错误(可读): ${errMsg}`);

            // 核心容错：若合成阶段报错（说明该模型不支持当前配置或存在额度问题），立即将当前模型记为失败，触发冷却轮换
            const currentModel = this.activeModel;
            Qwen3TTSClient.recordModelFailure(currentModel);
            Qwen3TTSClient.lastGlobalFailureAt = Date.now();
            Qwen3TTSClient.rotateModelSafely(this.models.length).catch(() => {});

            this.callbacks.onError(errMsg);
          }
          break;

        default:
          logger.info(`[Qwen3-TTS] 未处理事件: ${eventType} - ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      logger.error(`[Qwen3-TTS] 解析消息失败: ${err.message}`);
    }
  }

  /**
   * 将长文本切成多段 append，满足「单片段折算长度」限制（官方报错约 2000，中文计权更高）。
   */
  private splitTextForAppend(text: string): string[] {
    const t = text;
    const max = Qwen3TTSClient.MAX_APPEND_RAW_CHARS;
    if (!t) return [];
    if (t.length <= max) return [t];

    const out: string[] = [];
    let i = 0;
    const breakChars = ['\n\n', '\n', '。', '！', '？', '；', '，', '、', '. ', '! ', '? ', '; ', ', ', ' '];

    while (i < t.length) {
      let end = Math.min(i + max, t.length);
      if (end < t.length) {
        const window = t.slice(i, end);
        let bestIdx = -1;
        let bestSepLen = 1;
        for (const sep of breakChars) {
          const idx = window.lastIndexOf(sep);
          if (idx > bestIdx) {
            bestIdx = idx;
            bestSepLen = sep.length;
          }
        }
        const minPiece = Math.floor(max * 0.4);
        if (bestIdx >= minPiece) {
          end = i + bestIdx + bestSepLen;
        }
      }
      const piece = t.slice(i, end);
      if (piece.length > 0) {
        out.push(piece);
      }
      i = end;
    }
    return out;
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

    const pieces = this.splitTextForAppend(text);
    if (pieces.length > 1) {
      logger.info(
        `[Qwen3-TTS] 单段过长，已拆成 ${pieces.length} 次 append（每段≤${Qwen3TTSClient.MAX_APPEND_RAW_CHARS} 原始字符）`,
      );
    }

    for (const piece of pieces) {
      const event = {
        event_id: `evt_${uuidv4()}`,
        type: 'input_text_buffer.append',
        text: piece,
      };
      this.send(event);
    }
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
   * 注意：DashScope 仅在 client commit 模式（mode=commit）下支持 clear；server_commit 会报错。
   */
  clearTextBuffer(): void {
    if (this.config.mode === 'server_commit') {
      logger.debug(
        '[Qwen3-TTS] 已跳过 input_text_buffer.clear：server_commit 模式不支持该操作（请改用 session.finish 或仅停止下行）',
      );
      return;
    }
    if (!this.isConnected || !this.ws) {
      return;
    }
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
    return this.models[this.currentModelIndex];
  }

  /** 是否已降级到 fallback 模型 */
  get isFallback(): boolean {
    return this.currentModelIndex > 0;
  }
}
