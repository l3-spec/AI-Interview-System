import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { gunzipSync, inflateSync } from 'zlib';
import { logger } from './logger';

/**
 * 火山引擎 ASR 客户端 (V2 协议)
 * 参考文档: https://www.volcengine.com/docs/6561/80818
 * 
 * 鉴权说明: 
 * 1. 在 WebSocket 建立连接时，需在 Header 中添加 Authorization: Bearer;<token>
 * 2. 在握手 JSON 中，也需包含 app.token
 */
export interface VolcASRConfig {
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
  onTranscriptionText: (text: string, stash?: string) => void;
  onTranscriptionCompleted: (transcript: string) => void;
  onSessionFinished: () => void;
  onError: (error: string) => void;
}

interface StreamingMessage {
  header: Buffer;
  messageType: number;
  flags: number;
  serialization: number;
  compression: number;
  payload: Buffer;
}

export class VolcASRClient {
  // 单帧音频上限 64KB（火山引擎 V2 协议建议值，避免触发 1007 帧过大错误）
  private static readonly MAX_AUDIO_FRAME_BYTES = 64 * 1024;
  // 握手总超时（包含 WebSocket 建链 + JSON 握手往返）
  private static readonly HANDSHAKE_TIMEOUT_MS = 15000;

  private ws: WebSocket | null = null;
  private appId: string;
  private token: string;
  private cluster: string;
  private config: VolcASRConfig;
  private callbacks: ASREventCallbacks;
  private sessionId: string | null = null;
  private reqId: string;
  private isConnected = false;
  private awaitingHandshake = false;

  private readonly ENDPOINT = process.env.VOLC_ASR_ADDRESS || 'wss://openspeech.bytedance.com/api/v2/asr';

  constructor(config: VolcASRConfig, callbacks: ASREventCallbacks) {
    this.appId = process.env.VOLC_APP_ID || '';
    // 如果 token 以 Bearer; 开头，去掉它以便后续统一处理
    const rawToken = process.env.VOLC_TOKEN || '';
    this.token = rawToken.replace(/^Bearer;/i, '').trim();
    this.cluster = process.env.VOLC_CLUSTER || 'volcengine_streaming_common';
    this.config = config;
    this.callbacks = callbacks;
    this.reqId = uuidv4();

    if (!this.appId || !this.token) {
      throw new Error('VOLC_APP_ID 或 VOLC_TOKEN 环境变量未配置');
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`[Volc-ASR-V2] 正在连接: ${this.ENDPOINT}`);
      
      const headers = {
        'Authorization': `Bearer;${this.token}`,
        'User-Agent': 'ai-interview-asr-service/volcengine-v2',
      };

      try {
        this.ws = new WebSocket(this.ENDPOINT, { 
          headers,
          handshakeTimeout: 10000, // 10s 握手超时
        });
      } catch (err: any) {
        return reject(new Error(`创建 WebSocket 失败: ${err.message}`));
      }
      
      this.awaitingHandshake = true;

      // 握手超时保护：如在 HANDSHAKE_TIMEOUT_MS 内仍未完成 JSON 握手，则主动关闭并 reject
      const timeout = setTimeout(() => {
        if (this.awaitingHandshake) {
          logger.error(`[Volc-ASR-V2] 握手超时 (${VolcASRClient.HANDSHAKE_TIMEOUT_MS}ms)`);
          try {
            this.ws?.close(4001, '握手超时');
          } catch (e) {}
          this.close();
          reject(new Error(`火山引擎 V2 ASR 握手超时 (${VolcASRClient.HANDSHAKE_TIMEOUT_MS}ms)，请检查网络或 Token 是否正确`));
        }
      }, VolcASRClient.HANDSHAKE_TIMEOUT_MS);

      this.ws.on('open', () => {
        logger.info('[Volc-ASR-V2] WebSocket 已打开，发送握手请求...');
        try {
          const handshake = this.createHandshakePayload();
          this.ws?.send(handshake);
        } catch (err: any) {
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.ws.on('message', (data) => {
        const buffer = data as Buffer;
        try {
          const message = this.parseServerMessage(buffer);
          const decodedPayload = this.decodePayloadBuffer(message);
          const payloadText = decodedPayload.toString('utf8');

          if (message.messageType === 0x0f) { // Error Response
            let errMsg = payloadText;
            try {
              const errorPayload = JSON.parse(payloadText);
              errMsg = errorPayload?.message || errorPayload?.error_msg || JSON.stringify(errorPayload);
            } catch (e) {}
            
            logger.error(`[Volc-ASR-V2] 收到服务端错误: ${errMsg}`);
            if (this.awaitingHandshake) {
              clearTimeout(timeout);
              this.awaitingHandshake = false;
              reject(new Error(errMsg));
            } else {
              this.callbacks.onError(errMsg);
            }
            return;
          }

          if (message.messageType === 0x09) { // Full Server Response
            let payload: any;
            try {
              payload = JSON.parse(payloadText);
            } catch (e) {
              logger.warn(`[Volc-ASR-V2] 无法解析 JSON 响应: ${payloadText.slice(0, 100)}`);
              return;
            }
            
            if (this.awaitingHandshake) {
              if (payload.code === 1000 || payload.message === 'Success') {
                clearTimeout(timeout);
                this.awaitingHandshake = false;
                this.isConnected = true;
                this.sessionId = this.reqId;
                logger.info(`[Volc-ASR-V2] 握手成功, sessionId=${this.sessionId}`);
                this.callbacks.onSessionCreated({ id: this.sessionId });
                resolve();
              } else {
                const errMsg = payload.message || `握手失败 (code=${payload.code})`;
                this.handleHandshakeError(errMsg, timeout, reject);
                return;
              }
            }

            this.handleResponse(payload);
          }
        } catch (err: any) {
          // 协议解析异常：附带前 32 字节原始数据 hex，便于排查二进制协议问题
          const headHex = buffer && buffer.length > 0
            ? buffer.slice(0, Math.min(32, buffer.length)).toString('hex')
            : '<empty>';
          logger.error(`[Volc-ASR-V2] 协议解析异常: ${err.message}, 帧长度: ${buffer?.length ?? 0}, 原始数据(前32字节): ${headHex}`);
        }
      });

      this.ws.on('close', (code, reason) => {
        const reasonStr = (typeof reason === 'string' ? reason : reason?.toString('utf8')) || '';
        this.isConnected = false;

        // 握手阶段被关闭：保持原 reject 行为，避免破坏 connect() 调用方的 Promise 语义
        if (this.awaitingHandshake) {
          clearTimeout(timeout);
          this.awaitingHandshake = false;
          logger.error(`[Volc-ASR-V2] 握手期间连接被关闭: code=${code}, reason=${reasonStr}`);
          reject(new Error(`火山引擎 ASR 连接被关闭: code=${code} ${reasonStr}`));
          return;
        }

        // 已握手成功后的关闭：按 code 分类处理
        this.handleWsClose(code, reasonStr);
      });

      this.ws.on('error', (err) => {
        logger.error(`[Volc-ASR-V2] WebSocket 错误: ${err.message}`);
        if (this.awaitingHandshake) {
          clearTimeout(timeout);
          reject(err);
        } else {
          this.callbacks.onError(err.message);
        }
      });
    });
  }

  private handleHandshakeError(errMsg: string, timeout: NodeJS.Timeout, reject: (err: Error) => void): void {
    clearTimeout(timeout);
    this.awaitingHandshake = false;
    this.close();
    reject(new Error(errMsg));
  }

  /**
   * 已握手成功后的 WebSocket 关闭分类处理。
   * 重点优化 code=1007 的判断：精确区分鉴权失败、协议错误、未知原因，
   * 避免笼统当作鉴权问题误导上层调用方。
   */
  private handleWsClose(code: number, reasonStr: string): void {
    if (code === 1007) {
      // 精确匹配鉴权失败关键词
      const AUTH_FAILURE_PATTERNS = [
        /access\s*denied/i,
        /unauthorized/i,
        /forbidden/i,
        /authentication\s*failed/i,
        /invalid\s*(token|credential|key)/i,
      ];
      if (AUTH_FAILURE_PATTERNS.some((p) => p.test(reasonStr))) {
        logger.error(`[Volc-ASR-V2] 鉴权失败 (code=1007): ${reasonStr}`);
        this.callbacks.onError(`[AUTH_FAILURE] Volcengine 鉴权失败: ${reasonStr}`);
        this.callbacks.onSessionFinished();
        return;
      }

      // 协议错误：参数错误、帧过大、编码异常等
      const PROTOCOL_ERROR_PATTERNS = [
        /invalid.*payload/i,
        /frame.*too.*large/i,
        /protocol/i,
        /encoding/i,
      ];
      if (PROTOCOL_ERROR_PATTERNS.some((p) => p.test(reasonStr))) {
        logger.error(`[Volc-ASR-V2] 协议错误 (code=1007): ${reasonStr}`);
        this.callbacks.onError(`[PROTOCOL_ERROR] 协议错误: ${reasonStr}`);
        this.callbacks.onSessionFinished();
        return;
      }

      // 原因不明确的 1007：仅告警，交由上层决定后续策略
      logger.warn(`[Volc-ASR-V2] 未知原因断开 (code=1007): "${reasonStr}"`);
      this.callbacks.onSessionFinished();
      return;
    }

    if (code === 1000) {
      // 正常关闭
      logger.info(`[Volc-ASR-V2] 连接正常关闭 (code=1000): ${reasonStr}`);
      this.callbacks.onSessionFinished();
      return;
    }

    if (code >= 4000) {
      // 应用层自定义错误码（包含本端主动 close(4001,'握手超时') 等）
      logger.error(`[Volc-ASR-V2] 应用错误 (code=${code}): ${reasonStr}`);
      const retriable = code < 4400; // 4xx 类错误通常不可重试
      this.callbacks.onError(`[APP_ERROR_${code}${retriable ? '' : '_NON_RETRIABLE'}] ${reasonStr}`);
      this.callbacks.onSessionFinished();
      return;
    }

    // 其他标准 WebSocket 关闭码
    logger.warn(`[Volc-ASR-V2] 连接断开 (code=${code}): ${reasonStr}`);
    this.callbacks.onSessionFinished();
  }

  private handleResponse(payload: any): void {
    const sequence = payload.sequence ?? 0;
    const isFinal = sequence < 0;
    const resultText = payload.result?.[0]?.text ?? payload.text ?? '';

    // VAD 事件映射
    if (payload.event === 'speech_start') {
      this.callbacks.onSpeechStarted();
    } else if (payload.event === 'speech_end') {
      this.callbacks.onSpeechStopped();
    }

    if (resultText) {
      if (isFinal) {
        logger.info(`[Volc-ASR-V2] 识别完成: "${resultText}"`);
        this.callbacks.onTranscriptionCompleted(resultText);
      } else {
        this.callbacks.onTranscriptionText(resultText);
      }
    }
  }

  appendAudio(audioBase64: string): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (audioBuffer.length === 0) return;

    // 单帧未超上限：直接发送
    if (audioBuffer.length <= VolcASRClient.MAX_AUDIO_FRAME_BYTES) {
      this.sendAudioFrame(audioBuffer, false);
      return;
    }

    // 超过单帧上限：拆分为多个 ≤64KB 的子帧顺序发送
    const totalChunks = Math.ceil(audioBuffer.length / VolcASRClient.MAX_AUDIO_FRAME_BYTES);
    logger.debug(`[Volc-ASR-V2] 音频分块发送: ${audioBuffer.length} bytes → ${totalChunks} 块`);
    for (let offset = 0; offset < audioBuffer.length; offset += VolcASRClient.MAX_AUDIO_FRAME_BYTES) {
      const end = Math.min(offset + VolcASRClient.MAX_AUDIO_FRAME_BYTES, audioBuffer.length);
      const chunk = audioBuffer.slice(offset, end);
      this.sendAudioFrame(chunk, false);
    }
  }

  commitAudio(): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // 发送空 payload + NEG_SEQUENCE 标志，通知服务端音频结束
    this.sendAudioFrame(Buffer.alloc(0), true);
  }

  /**
   * 发送单个音频数据帧（messageType=0x02）。
   * 统一在此处理 ws send 的异常，避免分块循环中部分失败导致状态不一致。
   */
  private sendAudioFrame(audioData: Buffer, isFinal: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const header = this.buildHeader({
      messageType: 0x02,
      isFinal,
    });
    const message = this.encodeMessage(header, audioData);
    try {
      this.ws.send(message);
    } catch (err: any) {
      logger.error(`[Volc-ASR-V2] 发送音频帧失败: ${err.message}`);
    }
  }

  finish(): void {
    this.commitAudio();
  }

  close(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  // --- 助手方法 ---

  private buildHeader(options: { messageType: number; isFinal?: boolean; serialization?: number; compression?: number }): Buffer {
    const protocolVersion = 0b0001;
    const headerSize = 0b0001; // 4 bytes
    const messageType = options.messageType & 0b1111;
    const flags = options.isFinal ? 0b0010 : 0b0000;
    const serialization = options.serialization ?? 0b0000;
    const compression = options.compression ?? 0b0000;

    const buffer = Buffer.alloc(4);
    buffer[0] = (protocolVersion << 4) | headerSize;
    buffer[1] = (messageType << 4) | flags;
    buffer[2] = (serialization << 4) | compression;
    buffer[3] = 0;
    return buffer;
  }

  private encodeMessage(header: Buffer, payload: Buffer): Buffer {
    const payloadLengthBuffer = Buffer.alloc(4);
    payloadLengthBuffer.writeUInt32BE(payload.length, 0);
    return Buffer.concat([header, payloadLengthBuffer, payload]);
  }

  private createHandshakePayload(): Buffer {
    const payload = {
      app: {
        appid: this.appId,
        token: this.token,
        cluster: this.cluster,
      },
      user: {
        uid: uuidv4(),
      },
      audio: {
        format: 'raw',
        codec: 'raw',
        rate: this.config.sampleRate,
        bits: 16,
        channel: 1,
        language: this.config.language === 'zh' ? 'zh-CN' : this.config.language,
      },
      request: {
        reqid: this.reqId,
        workflow: 'audio_in,resample,partition,vad,fe,decode',
        sequence: 1,
        nbest: 1,
        show_utterances: true,
        // 根据 rtc-asr.service.ts, vad_signal 为 false 可能更稳定
        vad_signal: false,
      },
    };

    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const header = this.buildHeader({
      messageType: 0x01, // Full Client Request
      serialization: 0x01, // JSON
    });
    return this.encodeMessage(header, payloadBuffer);
  }

  private parseServerMessage(buffer: Buffer): StreamingMessage {
    // 至少需要 4 字节头部 + 4 字节 payload 长度
    if (buffer.length < 4) {
      throw new Error(`响应帧过短: ${buffer.length} bytes (最少需要4字节头部)`);
    }
    if (buffer.length < 8) {
      throw new Error(`响应帧过短: ${buffer.length} bytes (缺少 payload 长度字段, 头部hex: ${buffer.slice(0, buffer.length).toString('hex')})`);
    }

    const header = buffer.slice(0, 4);
    const payloadLength = buffer.readUInt32BE(4);

    // 帧不完整：声明长度大于实际剩余字节
    if (buffer.length < 8 + payloadLength) {
      throw new Error(`帧不完整: 声明 ${payloadLength} bytes payload, 实际只有 ${buffer.length - 8} bytes (头部hex: ${header.toString('hex')})`);
    }

    const payload = buffer.slice(8, 8 + payloadLength);
    const messageType = (header[1] & 0b11110000) >> 4;
    const flags = header[1] & 0b00001111;
    const serialization = (header[2] & 0b11110000) >> 4;
    const compression = header[2] & 0b00001111;

    // 记录非预期消息类型，便于排查（0x09 Full Server Response，0x0F Error Response）
    if (messageType !== 0x09 && messageType !== 0x0f) {
      logger.warn(`[Volc-ASR-V2] 未知消息类型: 0x${messageType.toString(16)}, 帧长度: ${buffer.length}, 头部hex: ${header.toString('hex')}`);
    }

    return { header, messageType, flags, serialization, compression, payload };
  }

  private decodePayloadBuffer(message: StreamingMessage): Buffer {
    let payload = message.payload;
    if (message.compression === 0x01) { // GZIP
      payload = gunzipSync(payload);
    } else if (message.compression === 0x02) { // DEFLATE
      payload = inflateSync(payload);
    }
    return payload;
  }
}
