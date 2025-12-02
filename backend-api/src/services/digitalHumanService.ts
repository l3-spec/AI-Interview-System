import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ossService } from './ossService';

interface GenerateVideoByPromptParams {
  prompt: string;
  sessionId: string;
  questionIndex: number;
  audioPath?: string;
  audioUrl?: string;
}

export interface GenerateVideoResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * 数字人视频生成服务 - 集成 Wav2Lip 服务
 */
class DigitalHumanService {
  private wav2LipServiceUrl = (process.env.WAV2LIP_SERVICE_URL || '').trim();
  private wav2LipApiKey = (process.env.WAV2LIP_API_KEY || '').trim();
  private templateVideoPath = (process.env.WAV2LIP_TEMPLATE_VIDEO || '').trim();
  private templateImagePath = (process.env.WAV2LIP_TEMPLATE_IMAGE || '').trim();
  private templateId = (process.env.WAV2LIP_TEMPLATE_ID || '').trim();
  private fallbackVideoUrl = (process.env.WAV2LIP_FALLBACK_VIDEO_URL || '').trim();
  private allowRemoteReferenceOnly = (process.env.WAV2LIP_PERSIST_REMOTE_ONLY || '').toLowerCase() === 'true';
  private requestTimeout = parseInt(process.env.WAV2LIP_TIMEOUT || '120000', 10);

  async generateVideo(params: GenerateVideoByPromptParams): Promise<GenerateVideoResult> {
    if (!this.wav2LipServiceUrl) {
      if (this.fallbackVideoUrl) {
        return { success: true, videoUrl: this.fallbackVideoUrl };
      }
      return { success: false, error: 'Wav2Lip服务未配置' };
    }

    const { prompt, sessionId, questionIndex, audioPath, audioUrl } = params;

    if ((!audioPath || !fs.existsSync(audioPath)) && !audioUrl) {
      return { success: false, error: '缺少可用的音频资源用于生成视频' };
    }

    try {
      const endpoint = this.wav2LipServiceUrl.replace(/\/$/, '');
      const form = new FormData();

      if (audioPath && fs.existsSync(audioPath)) {
        form.append('audio', fs.createReadStream(audioPath), {
          filename: path.basename(audioPath),
        });
      } else if (audioUrl) {
        form.append('audio_url', audioUrl);
      }

      if (this.templateVideoPath && fs.existsSync(this.templateVideoPath)) {
        form.append('template_video', fs.createReadStream(this.templateVideoPath), {
          filename: path.basename(this.templateVideoPath),
        });
      } else if (this.templateImagePath && fs.existsSync(this.templateImagePath)) {
        form.append('template_image', fs.createReadStream(this.templateImagePath), {
          filename: path.basename(this.templateImagePath),
        });
      } else if (this.templateId) {
        form.append('template_id', this.templateId);
      }

      form.append('prompt', prompt);
      form.append('session_id', sessionId);
      form.append('question_index', String(questionIndex));

      const headers = {
        ...form.getHeaders(),
        ...(this.wav2LipApiKey ? { Authorization: `Bearer ${this.wav2LipApiKey}` } : {}),
      };

      const response = await axios.post(`${endpoint}/generate`, form, {
        headers,
        responseType: 'arraybuffer',
        timeout: this.requestTimeout,
      });

      const contentType = (response.headers['content-type'] || '') as string;
      let buffer: Buffer | null = null;
      let remoteUrl: string | undefined;

      if (contentType.includes('application/json')) {
        const payload = JSON.parse(Buffer.from(response.data).toString('utf-8'));
        remoteUrl = payload.videoUrl || payload.video_url;
        if (!remoteUrl) {
          const errorMessage = payload.error || 'Wav2Lip响应缺少视频URL';
          return { success: false, error: errorMessage };
        }
      } else {
        buffer = Buffer.from(response.data);
      }

      if (!buffer && remoteUrl) {
        if (this.allowRemoteReferenceOnly) {
          return { success: true, videoUrl: remoteUrl };
        }
        const downloadResp = await axios.get(remoteUrl, {
          responseType: 'arraybuffer',
          timeout: this.requestTimeout,
        });
        buffer = Buffer.from(downloadResp.data);
      }

      if (!buffer) {
        return { success: false, error: '未从Wav2Lip获取到有效视频数据' };
      }

      const objectKey = `videos/interviewer/${sessionId}_${questionIndex}_${uuidv4()}.mp4`;
      const uploadRes = await ossService.uploadBuffer(buffer, objectKey);

      return { success: true, videoUrl: uploadRes.url };
    } catch (err: any) {
      const message = err?.response?.data
        ? err.response.data.toString()
        : err?.message || 'Wav2Lip视频生成失败';
      console.error('[DigitalHuman] Wav2Lip调用失败:', message);

      if (this.fallbackVideoUrl) {
        console.warn('[DigitalHuman] 使用备用视频资源:', this.fallbackVideoUrl);
        return { success: true, videoUrl: this.fallbackVideoUrl };
      }

      return { success: false, error: message };
    }
  }
}

export const digitalHumanService = new DigitalHumanService();
