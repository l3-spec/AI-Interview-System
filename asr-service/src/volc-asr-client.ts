import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { gunzipSync, inflateSync } from 'zlib';
import { logger } from './logger';

/**
 * 火山引擎 ASR 客户端
 * 基于 Bytedance OpenSpeech 协议 (v2)
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
  private sequence = 1;

  private readonly ENDPOINT = process.env.VOLC_ASR_ADDRESS || 'wss://openspeech.bytedance.com/api/v2/asr';

  constructor(config: VolcASRConfig, callbacks: ASREventCallbacks) {
    this.appId = process.env.VOLC_APP_ID || '';
    this.token = process.env.VOLC_TOKEN || '';
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
      logger.info(`[Volc-ASR] 正在连接火山引擎: ${this.ENDPOINT}`);
      
      const headers = {
        'Authorization': this.token.startsWith('Bearer;') ? this.token : `Bearer;${this.token}`,
      };

      this.ws = new WebSocket(this.ENDPOINT, { headers });
      this.awaitingHandshake = true;

      const timeout = setTimeout(() => {
        if (this.awaitingHandshake) {
          this.close();
          reject(new Error('火山引擎 ASR 连接超时'));
        }
      }, 10000);

      this.ws.on('open', () => {
        logger.info('[Volc-ASR] WebSocket 已打开，发送握手协议...');
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
          const message = this.parseServerMessage(data as Buffer);
          const decodedPayload = this.decodePayloadBuffer(message);
          const payloadText = decodedPayload.toString('utf8');

          if (message.messageType === 0x0f) { // Error
            const errorPayload = JSON.parse(payloadText);
            const errMsg = errorPayload?.message || '火山引擎 ASR 服务端错误';
            logger.error(`[Volc-ASR] 收到错误消息: ${errMsg}`);
            if (this.awaitingHandshake) {
              clearTimeout(timeout);
              this.awaitingHandshake = false;
              reject(new Error(errMsg));
            } else {
              this.callbacks.onError(errMsg);
            }
            return;
          }

          if (message.messageType === 0x09) { // Full Response
            const payload = JSON.parse(payloadText);
            
            if (this.awaitingHandshake) {
              clearTimeout(timeout);
              this.awaitingHandshake = false;
              this.isConnected = true;
              this.sessionId = this.reqId; // 火山引擎使用 reqId 跟踪
              logger.info(`[Volc-ASR] 握手成功, sessionId=${this.sessionId}`);
              this.callbacks.onSessionCreated({ id: this.sessionId });
              resolve();
            }

            this.handleResponse(payload);
          }
        } catch (err: any) {
          logger.error(`[Volc-ASR] 解析消息失败: ${err.message}`);
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.info(`[Volc-ASR] 连接已关闭: code=${code}, reason=${reason}`);
        this.isConnected = false;
        this.callbacks.onSessionFinished();
      });

      this.ws.on('error', (err) => {
        logger.error(`[Volc-ASR] WebSocket 错误: ${err.message}`);
        if (this.awaitingHandshake) {
          clearTimeout(timeout);
          reject(err);
        } else {
          this.callbacks.onError(err.message);
        }
      });
    });
  }

  private handleResponse(payload: any): void {
    // 火山引擎响应结构解析
    // sequence < 0 表示最终结果
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
    // 手动提交，火山引擎协议中通过 isFinal 标志位处理
    if (!this.isConnected || !this.ws) return;
    
    const header = this.buildHeader({
      messageType: 0x02,
      isFinal: true,
    });
    const message = this.encodeMessage(header, Buffer.alloc(0));
    this.ws.send(message);
  }

  finish(): void {
    this.commitAudio();
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  // --- 火山引擎协议助手方法 ---

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
        token: this.token.startsWith('Bearer;') ? this.token.split(';')[1] : this.token,
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
        vad_signal: true,
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
