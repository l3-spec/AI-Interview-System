import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 火山引擎TTS语音合成服务
 * 用于数字人面试官的语音生成
 */

interface VolcengineTtsConfig {
  apiKey: string;
  appId: string;
  voiceType: string;
  format: 'mp3' | 'wav' | 'pcm';
  sampleRate: number;
  speechRate: number;
  pitchRate: number;
}

interface TtsResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioPath?: string;
  audioUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

export class VolcengineTtsService {
  private config: VolcengineTtsConfig;
  private isEnabled: boolean;
  private uploadDir: string;

  constructor() {
    this.config = {
      apiKey: process.env.VOLCENGINE_TTS_API_KEY || process.env.VOLCENGINE_API_KEY || '',
      appId: process.env.VOLCENGINE_TTS_APP_ID || '',
      voiceType: process.env.VOLCENGINE_TTS_VOICE || 'zh_female_qingxin',
      format: (process.env.VOLCENGINE_TTS_FORMAT as any) || 'mp3',
      sampleRate: parseInt(process.env.VOLCENGINE_TTS_SAMPLE_RATE || '24000', 10),
      speechRate: parseFloat(process.env.VOLCENGINE_TTS_SPEED || '1.0'),
      pitchRate: parseFloat(process.env.VOLCENGINE_TTS_PITCH || '1.0'),
    };

    this.uploadDir = process.env.AUDIO_UPLOAD_DIR || 'uploads/audio';
    this.isEnabled = !!this.config.apiKey;

    this.ensureUploadDir();

    if (!this.isEnabled) {
      console.warn('⚠️ 火山引擎TTS未配置（VOLCENGINE_API_KEY 等），合成将返回失败');
    } else {
      console.log(`✅ 火山引擎TTS服务已配置，音色: ${this.config.voiceType}`);
    }
  }

  private ensureUploadDir() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建上传目录失败:', error);
    }
  }

  /**
   * 文本转语音
   */
  async synthesize(params: {
    text: string;
    voice?: string;
    emotion?: string;
    sessionId?: string;
    saveToFile?: boolean;
  }): Promise<TtsResult> {
    const { text, voice, emotion, sessionId, saveToFile = true } = params;

    if (!this.isEnabled) {
      return {
        success: false,
        error: '火山引擎 TTS 未配置，请设置 VOLCENGINE_API_KEY（或 VOLCENGINE_TTS_API_KEY）',
      };
    }

    try {
      const audioBuffer = await this.callVolcengineTtsAPI(text, voice || this.config.voiceType, emotion);

      let result: TtsResult = {
        success: true,
        audioBuffer,
        duration: this.estimateDuration(text),
        fileSize: audioBuffer.length,
      };

      if (saveToFile) {
        const fileResult = this.saveAudioToFile(audioBuffer);
        result = { ...result, ...fileResult };
      }

      console.log(`✅ 火山引擎TTS合成成功: ${text.substring(0, 30)}..., 大小: ${Math.round(audioBuffer.length / 1024)}KB`);
      return result;
    } catch (error: any) {
      console.error('火山引擎TTS合成失败:', error.message);
      return {
        success: false,
        error: error?.message || '火山引擎 TTS 合成失败',
      };
    }
  }

  /**
   * 调用火山引擎TTS API
   */
  private async callVolcengineTtsAPI(text: string, voice: string, emotion?: string): Promise<Buffer> {
    // 火山引擎TTS API端点
    const endpoint = 'https://openspeech.bytedance.com/api/v1/tts';

    const requestBody = {
      app: {
        appid: this.config.appId,
        token: this.config.apiKey,
        cluster: 'volcano_tts',
      },
      user: {
        uid: 'ai-interview-system',
      },
      audio: {
        voice_type: voice,
        encoding: this.config.format,
        speed_ratio: this.config.speechRate,
        pitch_ratio: this.config.pitchRate,
        sample_rate: this.config.sampleRate,
      },
      request: {
        reqid: uuidv4(),
        text: text,
        text_type: 'plain',
        operation: 'query',
      },
    };

    if (emotion) {
      (requestBody.audio as any).emotion = emotion;
    }

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    // 检查响应格式
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const errorResponse = JSON.parse(Buffer.from(response.data).toString());
      throw new Error(`火山引擎TTS API错误: ${errorResponse.message || errorResponse}`);
    }

    return Buffer.from(response.data);
  }

  /**
   * 保存音频到文件
   */
  private saveAudioToFile(audioBuffer: Buffer): { audioPath: string; audioUrl: string } {
    const fileName = `volc_tts_${uuidv4()}.${this.config.format}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, audioBuffer);
    return {
      audioPath: filePath,
      audioUrl: `/uploads/audio/${fileName}`,
    };
  }

  /**
   * 估算音频时长
   */
  private estimateDuration(text: string): number {
    const wordsPerMinute = 220; // 中文每分钟约220字
    const minutes = text.length / wordsPerMinute;
    return Math.max(1, Math.round(minutes * 60));
  }

  /**
   * 获取支持的音色列表
   */
  getSupportedVoices(): { id: string; name: string; type: string; language: string }[] {
    return [
      { id: 'zh_female_qingxin', name: '清新女声', type: 'female', language: 'zh-CN' },
      { id: 'zh_female_wanrou', name: '温柔女声', type: 'female', language: 'zh-CN' },
      { id: 'zh_female_tianmei', name: '甜美女声', type: 'female', language: 'zh-CN' },
      { id: 'zh_male_chunhou', name: '醇厚男声', type: 'male', language: 'zh-CN' },
      { id: 'zh_male_zhuangzhong', name: '庄重男声', type: 'male', language: 'zh-CN' },
      { id: 'zh_female_zhiyin', name: '知性女声', type: 'female', language: 'zh-CN' },
      { id: 'zh_female_jingpin', name: '精品女声', type: 'female', language: 'zh-CN' },
      { id: 'zh_male_jingpin', name: '精品男声', type: 'male', language: 'zh-CN' },
    ];
  }

  /**
   * 获取支持的情感类型
   */
  getSupportedEmotions(): string[] {
    return [
      'neutral',
      'happy',
      'sad',
      'angry',
      'fear',
      'surprise',
      'friendly',
      'serious',
    ];
  }
}

export const volcengineTtsService = new VolcengineTtsService();
