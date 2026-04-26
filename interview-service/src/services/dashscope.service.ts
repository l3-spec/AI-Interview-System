import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DashScopeService - 阿里灵积 (DashScope) 语音服务集成
 * 支持 Qwen-Audio 系列 ASR 和 TTS
 */
export class DashScopeService {
  private apiKey: string;
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1';

  constructor() {
    this.apiKey = (process.env.DASHSCOPE_API_KEY || '').trim();
    if (!this.apiKey) {
      console.warn('⚠️ DASHSCOPE_API_KEY 未配置，DashScope 服务将无法正常工作');
    }
  }

  /** 系统管理端更新平台配置后刷新内存中的 Key */
  refreshFromPlatformConfig(config: { dashscopeApiKey?: string }): void {
    const k = (config.dashscopeApiKey || '').trim();
    if (k) {
      this.apiKey = k;
      console.log('✅ DashScope API Key 已从平台配置刷新');
    }
  }

  /**
   * Qwen-TTS 流式语音合成本地处理
   * 采用双轨架构：将 SSE 流转换为纯音频流输出
   */
  async synthesizeStreaming(text: string, options: {
    voice?: string;
    format?: string;
    sampleRate?: number;
    emotion?: string;
  } = {}) {
    const endpoint = `${this.baseUrl}/services/audio/tts/cosy-voice/synthesis`;
    const emotionInstruction = options.emotion || '专业且亲切的面试官语气';

    try {
      const response = await axios.post(endpoint, {
        model: 'cosyvoice-v1',
        input: { text: text },
        parameters: {
          voice: options.voice || 'longxiaoxi',
          format: options.format || 'pcm',
          sample_rate: options.sampleRate || 16000,
          instruction: emotionInstruction
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-DashScope-SSE': 'enable',
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      const Readable = require('stream').Readable;
      const audioEmitter = new Readable({ read() {} });

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.substring(5).trim();
              if (jsonStr === '[DONE]') continue;
              
              // 实际在 CosyVoice SSE 中，音频数据可能直接在流中，也可能在 JSON 的某个字段
              // 根据 DashScope SSE 标准，有时候它是 binary frame。
              // 如果是文本 SSE 模式，音频通常在 json.output.audio 中 (Base64)
              const data = JSON.parse(jsonStr);
              if (data.output && data.output.audio) {
                 const audioBuffer = Buffer.from(data.output.audio, 'base64');
                 audioEmitter.push(audioBuffer);
              }
            } catch (e) {
              // 如果不是 JSON，尝试直接透传（有些分片是纯二进制）
              // audioEmitter.push(chunk); 
            }
          }
        }
      });

      response.data.on('end', () => {
        audioEmitter.push(null);
      });

      return audioEmitter;
    } catch (error) {
      console.error('DashScope TTS Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Qwen-ASR 实时语音识别
   */
  async recognizeStreaming(audioStream: any) {
    // 调用 DashScope 实时语音识别 WebSocket 接口
    // 模型：qwen-audio-asr
    // 过程简述：建立 WS 连接 -> 发送音频分片 -> 接收实时文本
    console.log('DashScope ASR Streaming initialized (placeholder)');
    // 实际实现需要 ws 库集成，此处为架构预留
  }
}

export const dashScopeService = new DashScopeService();
