/**
 * 第三方RTC+ASR服务集成
 * 支持火山引擎和声网两种服务商
 */

import axios from 'axios';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { gunzipSync, inflateSync } from 'zlib';

export interface ASRResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  duration?: number;
  raw?: any;
}

export interface RTCConfig {
  provider: 'volcengine' | 'agora';
  appId: string;
  appKey?: string;
  token?: string;
  authorization?: string;
  region?: string;
  cluster?: string;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sampleRate: number;
}

const VOLC_WS_ENDPOINT = 'wss://openspeech.bytedance.com/api/v2/asr';

const ensureAuthorizationHeader = (value?: string): string => {
  const token = (value ?? '').trim();
  if (!token.length) {
    return '';
  }
  return token.toLowerCase().startsWith('bearer;') ? token : `Bearer;${token}`;
};

const stripAuthorizationHeader = (value?: string): string => {
  const token = (value ?? '').trim();
  if (!token.length) {
    return '';
  }
  return token.toLowerCase().startsWith('bearer;')
    ? token.slice('bearer;'.length).trim()
    : token;
};

type StreamingResolver = (result: ASRResult | null) => void;

interface StreamingMessage {
  header: Buffer;
  messageType: number;
  flags: number;
  serialization: number;
  compression: number;
  payload: Buffer;
}

interface StreamingSession {
  ws: WebSocket;
  ready: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
  awaitingHandshake: boolean;
  resolvers: StreamingResolver[];
  bufferedResults: (ASRResult | null)[];
  closed: boolean;
  reqId: string;
  sampleRate: number;
  chunkIndex: number;
  sessionId: string;
}

/**
 * 火山引擎ASR服务
 */
export class VolcEngineASRService {
  private appId: string;
  private token: string;
  private authorization: string;
  private cluster: string;
  private sessions: Map<string, StreamingSession>;
  private userAgent: string;

  constructor(config: { appId: string; appKey?: string; token?: string; authorization?: string; cluster?: string }) {
    this.appId = config.appId;
    const initialToken = config.token ?? config.appKey ?? '';
    this.token = stripAuthorizationHeader(initialToken);
    this.authorization = config.authorization
      ? ensureAuthorizationHeader(config.authorization)
      : ensureAuthorizationHeader(initialToken);
    if (!this.token && this.authorization) {
      this.token = stripAuthorizationHeader(this.authorization);
    }
    if (!this.authorization && this.token) {
      this.authorization = ensureAuthorizationHeader(this.token);
    }
    this.cluster = config.cluster || 'cn-north-1';
    this.sessions = new Map();
    this.userAgent = 'ai-interview-backend/volcengine-asr';
  }

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

  private createHandshakePayload(session: StreamingSession): Buffer {
    if (!this.token) {
      throw new Error('火山引擎ASR缺少 token，请先配置 VOLC_TOKEN 或有效的鉴权凭证');
    }

    const payload = {
      app: {
        appid: this.appId,
        token: this.token,
        cluster: this.cluster,
      },
      user: {
        uid: session.sessionId,
      },
      audio: {
        format: 'raw',
        codec: 'raw',
        rate: session.sampleRate,
        bits: 16,
        channel: 1,
        language: 'zh-CN',
      },
      request: {
        reqid: session.reqId,
        workflow: 'audio_in,resample,partition,vad,fe,decode',
        sequence: 1,
        nbest: 1,
        show_utterances: true,
        vad_signal: false,
      },
    };

    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const header = this.buildHeader({
      messageType: 0b0001,
      serialization: 0b0001,
    });
    return this.encodeMessage(header, payloadBuffer);
  }

  private parseServerMessage(data: WebSocket.RawData): StreamingMessage {
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else if (Array.isArray(data)) {
      buffer = Buffer.concat(data);
    } else {
      buffer = Buffer.from(data as Uint8Array);
    }
    if (buffer.length < 8) {
      throw new Error('无效的ASR响应：长度不足');
    }

    const header = buffer.slice(0, 4);
    const payloadLength = buffer.readUInt32BE(4);
    const payload = buffer.slice(8, 8 + payloadLength);
    const messageType = (header[1] & 0b11110000) >> 4;
    const flags = header[1] & 0b00001111;
    const serialization = (header[2] & 0b11110000) >> 4;
    const compression = header[2] & 0b00001111;

    return {
      header,
      messageType,
      flags,
      serialization,
      compression,
      payload,
    };
  }

  private decodePayloadBuffer(message: StreamingMessage): Buffer {
    if (!message.payload || message.payload.length === 0) {
      return message.payload;
    }

    let payload = message.payload;

    if (message.compression && message.compression !== 0) {
      payload = this.decompressPayload(payload, message.compression, true);
    }

    const detectedCompression = this.detectCompression(payload);
    if (detectedCompression !== null && detectedCompression !== message.compression) {
      payload = this.decompressPayload(payload, detectedCompression, false);
    }

    return payload;
  }

  private detectCompression(payload: Buffer): number | null {
    if (payload.length < 2) {
      return null;
    }

    const first = payload[0];
    const second = payload[1];
    if (first === 0x1f && second === 0x8b) {
      return 0b0001; // gzip
    }
    if (first === 0x78 && (second === 0x01 || second === 0x9c || second === 0xda)) {
      return 0b0010; // zlib/deflate
    }
    return null;
  }

  private decompressPayload(payload: Buffer, compression: number, strict: boolean): Buffer {
    try {
      switch (compression) {
        case 0b0001:
          return gunzipSync(payload);
        case 0b0010:
          return inflateSync(payload);
        default:
          if (strict) {
            throw new Error(`未知压缩格式: ${compression}`);
          }
          return payload;
      }
    } catch (error: any) {
      if (strict) {
        const reason = error?.message ?? String(error);
        throw new Error(`火山引擎ASR响应解压失败: ${reason}`);
      }
      return payload;
    }
  }

  private normalizePayloadText(payload: Buffer): string {
    if (!payload || payload.length === 0) {
      return '';
    }

    let text = payload.toString('utf8');
    if (text && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    if (text) {
      text = text.replace(/^[\u0000-\u001F]+/, '');
      text = text.replace(/^\uFFFD+/, '');

      const jsonStart = text.search(/[{\[]/);
      if (jsonStart > 0) {
        text = text.slice(jsonStart);
      }

      text = text.replace(/[\u0000-\u001F]+$/, '');
      text = text.replace(/\uFFFD+$/, '');
      text = text.trim();
    }
    return text;
  }

  private transformPayload(payload: any): ASRResult {
    const sequence: number = payload.sequence ?? 0;
    const resultText = payload.result?.[0]?.text ?? payload.text ?? '';

    const utterances = payload.result?.[0]?.utterances ?? [];
    let partialText = resultText;
    if (!partialText && Array.isArray(utterances) && utterances.length > 0) {
      partialText = utterances.map((u: any) => u.text).join('');
    }

    const isFinal = sequence < 0 || utterances.some((u: any) => u.definite === true);
    return {
      text: (partialText || '').trim(),
      confidence: 1,
      isFinal,
      raw: payload,
    };
  }

  private async getSession(sessionId: string, sampleRate: number): Promise<StreamingSession> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const reqId = uuidv4();

    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;

    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    if (!this.authorization) {
      throw new Error('火山引擎ASR缺少鉴权信息，请配置 VOLC_TOKEN、VOLC_ACCESS_KEY 或 RTC_APP_KEY');
    }
    if (!this.token) {
      throw new Error('火山引擎ASR缺少 token，无法建立连接');
    }

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      Authorization: this.authorization,
    };

    const ws = new WebSocket(VOLC_WS_ENDPOINT, {
      headers,
    });

    const session: StreamingSession = {
      ws,
      ready,
      resolveReady,
      rejectReady,
      awaitingHandshake: true,
      resolvers: [],
      bufferedResults: [],
      closed: false,
      reqId,
      sampleRate,
      chunkIndex: 0,
      sessionId,
    };

    ws.on('open', () => {
      try {
        const handshake = this.createHandshakePayload(session);
        ws.send(handshake);
      } catch (error: any) {
        session.rejectReady(error);
      }
    });

    ws.on('message', (data) => {
      try {
        const message = this.parseServerMessage(data);
        const decodedPayload = this.decodePayloadBuffer(message);
        const payloadText = this.normalizePayloadText(decodedPayload);

        if (message.messageType === 0b1111) {
          const errorPayload = payloadText ? JSON.parse(payloadText) : {};
          const error = new Error(errorPayload?.message || '火山引擎ASR服务端错误');
          if (session.awaitingHandshake) {
            session.awaitingHandshake = false;
            session.rejectReady(error);
          }
          this.rejectPending(session, error);
          return;
        }

        if (message.messageType !== 0b1001) {
          // 忽略非响应消息
          return;
        }

        if (!payloadText) {
          return;
        }

        if (payloadText[0] !== '{' && payloadText[0] !== '[') {
          console.warn('忽略非JSON格式的ASR响应:', payloadText.slice(0, 64));
          return;
        }

        const payload = JSON.parse(payloadText);
        const result = this.transformPayload(payload);

        if (session.awaitingHandshake) {
          session.awaitingHandshake = false;
          session.resolveReady();
          // 首次响应可能不包含识别文本，直接返回
          if (!result.text) {
            return;
          }
        }

        this.dispatchResult(session, result);
      } catch (error: any) {
        console.error('解析火山引擎ASR响应失败:', error);
        this.rejectPending(session, error);
      }
    });

    ws.on('error', (error) => {
      console.error('火山引擎ASR WebSocket错误:', error);
      if (session.awaitingHandshake) {
        session.awaitingHandshake = false;
        session.rejectReady(error instanceof Error ? error : new Error(String(error)));
      }
      this.rejectPending(session, error instanceof Error ? error : new Error(String(error)));
    });

    ws.on('close', () => {
      session.closed = true;
      this.sessions.delete(sessionId);
      this.rejectPending(session, new Error('火山引擎ASR连接已关闭'));
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  private dispatchResult(session: StreamingSession, result: ASRResult | null) {
    if (session.resolvers.length > 0) {
      const resolver = session.resolvers.shift();
      resolver?.(result);
    } else {
      session.bufferedResults.push(result);
    }

    const isFinal = result?.isFinal ?? false;
    if (isFinal) {
      session.ws.close();
    }
  }

  private rejectPending(session: StreamingSession, error: Error) {
    while (session.resolvers.length > 0) {
      const resolver = session.resolvers.shift();
      resolver?.(null);
    }
    session.bufferedResults = [];
    if (!session.closed) {
      session.ws.close();
    }
  }

  private queueResult(session: StreamingSession): Promise<ASRResult | null> {
    if (session.bufferedResults.length > 0) {
      const result = session.bufferedResults.shift() ?? null;
      return Promise.resolve(result);
    }

    return new Promise<ASRResult | null>((resolve) => {
      session.resolvers.push(resolve);
    });
  }

  async streamRecognize(sessionId: string, audioChunk: Buffer, options: { sampleRate: number; isFinal: boolean }): Promise<ASRResult | null> {
    const session = await this.getSession(sessionId, options.sampleRate);
    await session.ready;

    const header = this.buildHeader({
      messageType: 0b0010,
      isFinal: options.isFinal,
    });

    session.chunkIndex += 1;
    const message = this.encodeMessage(header, audioChunk);
    session.ws.send(message);

    return this.queueResult(session);
  }

  async recognize(audioBuffer: Buffer, sampleRate: number = 16000): Promise<ASRResult> {
    const sessionId = uuidv4();
    try {
      const result = await this.streamRecognize(sessionId, audioBuffer, {
        sampleRate,
        isFinal: true,
      });

      if (!result || !result.text) {
        throw new Error('未识别到有效语音内容');
      }

      return {
        text: result.text,
        confidence: result.confidence,
        isFinal: true,
        raw: result.raw,
      };
    } finally {
      await this.closeSession(sessionId);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.closed) {
      session.closed = true;
      session.ws.close();
    }

    this.sessions.delete(sessionId);
  }
}

/**
 * 声网ASR服务（通过RTC SDK）
 */
export class AgoraASRService {
  private appId: string;
  private appCertificate: string;
  private token: string;

  constructor(config: { appId: string; appCertificate: string; token: string }) {
    this.appId = config.appId;
    this.appCertificate = config.appCertificate;
    this.token = config.token;
  }

  /**
   * 识别音频（需要配合声网RTC SDK使用）
   */
  async recognize(audioBuffer: Buffer, sampleRate: number = 16000): Promise<ASRResult> {
    // 注意：声网的ASR通常通过RTC SDK集成，这里提供HTTP API方式
    try {
      const response = await axios.post('https://api.agora.io/v1/projects/project_id/asr', {
        audio: audioBuffer.toString('base64'),
        sample_rate: sampleRate,
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        text: response.data.text || '',
        confidence: response.data.confidence || 0.8,
        isFinal: true,
        duration: response.data.duration,
      };
    } catch (error: any) {
      console.error('声网ASR识别失败:', error.message);
      throw new Error(`ASR识别失败: ${error.message}`);
    }
  }
}

/**
 * RTC服务工厂
 */
export class RTCServiceFactory {
  static createASRService(config: RTCConfig): VolcEngineASRService | AgoraASRService {
    switch (config.provider) {
      case 'volcengine':
        return new VolcEngineASRService({
          appId: config.appId,
          appKey: config.appKey,
          token: config.token,
          authorization: config.authorization,
          cluster: config.cluster || config.region,
        });
      
      case 'agora':
        if (!config.appKey || !config.token) {
          throw new Error('声网需要appKey和token');
        }
        return new AgoraASRService({
          appId: config.appId,
          appCertificate: config.appKey,
          token: config.token,
        });
      
      default:
        throw new Error(`不支持的RTC服务商: ${config.provider}`);
    }
  }
}
