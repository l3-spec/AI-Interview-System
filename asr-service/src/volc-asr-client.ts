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

      const timeout = setTimeout(() => {
        if (this.awaitingHandshake) {
          logger.error('[Volc-ASR-V2] 连接超时 (10s)');
          this.close();
          reject(new Error('火山引擎 V2 ASR 连接超时 (10s)，请检查网络或 Token 是否正确'));
        }
      }, 15000); // 稍微加长总超时

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
        try {
          const buffer = data as Buffer;
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
          logger.error(`[Volc-ASR-V2] 处理消息失败: ${err.message}`);
        }
      });

      this.ws.on('close', (code, reason) => {
        const reasonStr = reason?.toString() || '';
        logger.info(`[Volc-ASR-V2] 连接已关闭: code=${code}, reason=${reasonStr}`);
        this.isConnected = false;
        if (this.awaitingHandshake) {
          clearTimeout(timeout);
          this.awaitingHandshake = false;
          reject(new Error(`火山引擎 ASR 连接被关闭: code=${code} ${reasonStr}`));
        } else {
          this.callbacks.onSessionFinished();
        }
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
    if (!this.isConnected || !this.ws) return;

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const header = this.buildHeader({
      messageType: 0x02, // Audio Data
      isFinal: false,
    });

    const message = this.encodeMessage(header, audioBuffer);
    this.ws.send(message);
  }

  commitAudio(): void {
    if (!this.isConnected || !this.ws) return;
    
    const header = this.buildHeader({
      messageType: 0x02,
      isFinal: true, // NEG_SEQUENCE 标志
    });
    const message = this.encodeMessage(header, Buffer.alloc(0));
    this.ws.send(message);
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
    if (buffer.length < 8) {
      throw new Error('无效的火山引擎 ASR 响应：长度不足');
    }

    const header = buffer.slice(0, 4);
    const payloadLength = buffer.readUInt32BE(4);
    const payload = buffer.slice(8, 8 + payloadLength);
    const messageType = (header[1] & 0b11110000) >> 4;
    const flags = header[1] & 0b00001111;
    const serialization = (header[2] & 0b11110000) >> 4;
    const compression = header[2] & 0b00001111;

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
