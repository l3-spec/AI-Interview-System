import axios from 'axios';
import { requestAliyunToken } from '../utils/aliyunTokenClient';
import { ASRResult } from './rtc-asr.service';

export interface AliyunASRServiceOptions {
  appKey: string;
  accessKeyId: string;
  accessKeySecret: string;
  region?: string;
  endpoint?: string;
  enablePunctuation?: boolean;
  enableInverseTextNormalization?: boolean;
  enableVoiceDetection?: boolean;
  defaultFormat?: string;
  defaultSampleRate?: number;
  timeoutMs?: number;
}

const SUCCESS_CODE = 20000000;

export class AliyunASRService {
  private readonly appKey: string;
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly enablePunctuation: boolean;
  private readonly enableITN: boolean;
  private readonly enableVAD: boolean;
  private readonly defaultFormat: string;
  private readonly defaultSampleRate: number;
  private readonly timeoutMs: number;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: AliyunASRServiceOptions) {
    this.appKey = options.appKey.trim();
    this.accessKeyId = options.accessKeyId.trim();
    this.accessKeySecret = options.accessKeySecret.trim();
    this.region = (options.region || 'cn-shanghai').trim();
    this.endpoint = (options.endpoint?.trim().length
      ? options.endpoint.trim()
      : `https://nls-gateway.${this.region}.aliyuncs.com/stream/v1/asr`);
    this.enablePunctuation = options.enablePunctuation ?? true;
    this.enableITN = options.enableInverseTextNormalization ?? true;
    this.enableVAD = options.enableVoiceDetection ?? false;
    this.defaultFormat = options.defaultFormat || 'pcm';
    this.defaultSampleRate = options.defaultSampleRate || 16000;
    this.timeoutMs = options.timeoutMs || 25000;
  }

  async recognize(audioBuffer: Buffer, sampleRate: number = this.defaultSampleRate): Promise<ASRResult> {
    if (!audioBuffer?.length) {
      throw new Error('Aliyun ASR: 无音频数据');
    }

    const token = await this.ensureToken();
    const params = new URLSearchParams({
      appkey: this.appKey,
      format: this.defaultFormat,
      sample_rate: String(sampleRate || this.defaultSampleRate),
      enable_punctuation_prediction: String(this.enablePunctuation),
      enable_inverse_text_normalization: String(this.enableITN),
    });

    if (this.enableVAD) {
      params.append('enable_voice_detection', 'true');
    }

    const requestUrl = `${this.endpoint}?${params.toString()}`;

    const response = await axios.post(requestUrl, audioBuffer, {
      responseType: 'json',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-NLS-Token': token,
      },
      timeout: this.timeoutMs,
      maxContentLength: 20 * 1024 * 1024,
    });

    const data = response.data || {};
    if (data.status !== SUCCESS_CODE) {
      const message = data.message || data.msg || 'Aliyun ASR 识别失败';
      throw new Error(`${message} (status=${data.status ?? 'unknown'})`);
    }

    const text: string = data.result || '';
    const confidence: number = typeof data.confidence === 'number' ? data.confidence : 0;

    return {
      text,
      confidence,
      isFinal: true,
      raw: data,
    };
  }

  private async ensureToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 60_000) {
      return this.cachedToken;
    }

    const tokenResult = await requestAliyunToken({
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      region: this.region,
      timeout: Math.min(this.timeoutMs, 10000)
    });

    this.cachedToken = tokenResult.token;
    this.tokenExpiresAt = tokenResult.expireTime;
    return tokenResult.token;
  }
}
