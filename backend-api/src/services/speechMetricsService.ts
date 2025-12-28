import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { AliyunASRService } from './aliyun-asr.service';
import { resolveVideoAccessUrl } from '../utils/videoUrlResolver';

const execFileAsync = promisify(execFile);

export interface SpeechMetricsSample {
  questionIndex?: number;
  transcript: string;
  durationSec?: number | null;
  speechRate?: number | null; // 字/分钟
  pauseRatio?: number | null; // 0-1
  fillerRatio?: number | null; // 0-1
  volumeStability?: number | null; // 0-100
  speechQuality?: number | null; // 0-100
}

export interface SpeechMetricsSummary {
  transcript: string;
  sampleCount: number;
  avgSpeechRate?: number | null;
  avgPauseRatio?: number | null;
  avgFillerRatio?: number | null;
  avgVolumeStability?: number | null;
  speechQuality?: number | null;
  samples: SpeechMetricsSample[];
}

interface AudioExtractResult {
  buffer: Buffer;
  sampleRate: number;
  durationSec?: number | null;
}

class SpeechMetricsService {
  private asrService: AliyunASRService | null = null;
  private asrEnabled = false;

  constructor() {
    const appKey = process.env.ALIYUN_NLS_APP_KEY;
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    if (appKey && accessKeyId && accessKeySecret) {
      this.asrService = new AliyunASRService({
        appKey,
        accessKeyId,
        accessKeySecret,
        region: process.env.ALIYUN_NLS_REGION,
        endpoint: process.env.ALIYUN_NLS_ENDPOINT,
        defaultFormat: process.env.ALIYUN_NLS_FORMAT || 'pcm',
        defaultSampleRate: Number(process.env.ALIYUN_NLS_SAMPLE_RATE || 16000),
        enablePunctuation: process.env.ALIYUN_NLS_ENABLE_PUNCTUATION !== 'false',
        enableInverseTextNormalization: process.env.ALIYUN_NLS_ENABLE_ITN !== 'false',
        enableVoiceDetection: process.env.ALIYUN_NLS_ENABLE_VAD === 'true',
        timeoutMs: Number(process.env.ALIYUN_NLS_TIMEOUT_MS || 25000)
      });
      this.asrEnabled = true;
    }
  }

  async analyzeQuestions(
    sessionId: string,
    questions: Array<{
    questionIndex?: number;
    answerText?: string | null;
    answerVideoPath?: string | null;
    answerVideoUrl?: string | null;
    answerDuration?: number | null;
  }>
  ): Promise<SpeechMetricsSummary> {
    const samples: SpeechMetricsSample[] = [];
    let fullTranscript = '';

    for (const question of questions) {
      const answerText = question.answerText?.trim() || '';
      let transcript = answerText;
      let audioResult: AudioExtractResult | null = null;

      if (!transcript && (question.answerVideoPath || question.answerVideoUrl)) {
        audioResult = await this.extractAudio(sessionId, question.answerVideoPath, question.answerVideoUrl, question.questionIndex);
        if (audioResult && this.asrEnabled && this.asrService) {
          try {
            const asrResult = await this.asrService.recognize(audioResult.buffer, audioResult.sampleRate);
            transcript = asrResult.text || '';
          } catch (error) {
            console.warn('[SpeechMetrics] ASR识别失败，跳过该题:', error);
          }
        }
      } else if (question.answerVideoPath || question.answerVideoUrl) {
        audioResult = await this.extractAudio(sessionId, question.answerVideoPath, question.answerVideoUrl, question.questionIndex);
      }

      const durationSec = question.answerDuration
        ? Number(question.answerDuration)
        : audioResult?.durationSec ?? null;

      const metrics = this.calculateSpeechMetrics(transcript, durationSec, audioResult);
      samples.push({
        questionIndex: question.questionIndex,
        transcript,
        durationSec,
        speechRate: metrics.speechRate,
        pauseRatio: metrics.pauseRatio,
        fillerRatio: metrics.fillerRatio,
        volumeStability: metrics.volumeStability,
        speechQuality: metrics.speechQuality
      });

      if (transcript) {
        fullTranscript += `${transcript}\n`;
      }
    }

    const avgSpeechRate = this.average(samples.map(s => s.speechRate));
    const avgPauseRatio = this.average(samples.map(s => s.pauseRatio));
    const avgFillerRatio = this.average(samples.map(s => s.fillerRatio));
    const avgVolumeStability = this.average(samples.map(s => s.volumeStability));
    const speechQuality = this.average(samples.map(s => s.speechQuality));

    return {
      transcript: fullTranscript.trim(),
      sampleCount: samples.length,
      avgSpeechRate,
      avgPauseRatio,
      avgFillerRatio,
      avgVolumeStability,
      speechQuality,
      samples
    };
  }

  private async extractAudio(
    sessionId: string,
    videoPath?: string | null,
    videoUrl?: string | null,
    questionIndex?: number | null
  ): Promise<AudioExtractResult | null> {
    const source = await this.resolveSource(sessionId, videoPath, videoUrl, questionIndex);
    if (!source) {
      return null;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-audio-'));
    const pcmPath = path.join(tmpDir, `audio_${Date.now()}.pcm`);
    const sampleRate = 16000;

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', source,
        '-ac', '1',
        '-ar', String(sampleRate),
        '-f', 's16le',
        pcmPath
      ]);

      const buffer = fs.readFileSync(pcmPath);
      const durationSec = buffer.length / (sampleRate * 2);
      return { buffer, sampleRate, durationSec };
    } catch (error) {
      console.warn('[SpeechMetrics] FFmpeg提取音频失败:', error);
      return null;
    } finally {
      try {
        if (fs.existsSync(pcmPath)) {
          fs.unlinkSync(pcmPath);
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('[SpeechMetrics] 清理临时文件失败:', cleanupError);
      }
    }
  }

  private async resolveSource(
    sessionId: string,
    videoPath?: string | null,
    videoUrl?: string | null,
    questionIndex?: number | null
  ): Promise<string | null> {
    if (videoPath && fs.existsSync(videoPath)) {
      return videoPath;
    }
    if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
      return videoUrl;
    }
    return resolveVideoAccessUrl({
      sessionId,
      answerVideoUrl: videoUrl,
      answerVideoPath: videoPath,
      questionIndex
    });
  }

  private calculateSpeechMetrics(
    transcript: string,
    durationSec?: number | null,
    audioResult?: AudioExtractResult | null
  ): {
    speechRate?: number | null;
    pauseRatio?: number | null;
    fillerRatio?: number | null;
    volumeStability?: number | null;
    speechQuality?: number | null;
  } {
    const cleanText = (transcript || '').replace(/\s+/g, '');
    const charCount = cleanText.length;
    const speechRate = durationSec && durationSec > 0
      ? Math.round((charCount / durationSec) * 60)
      : null;

    const targetCharsPerSec = 4.5;
    const estimatedSpeechSec = charCount / targetCharsPerSec;
    const pauseRatio = durationSec && durationSec > 0
      ? this.clampRatio((durationSec - estimatedSpeechSec) / durationSec)
      : null;

    const fillerCount = this.countFillers(transcript || '');
    const fillerRatio = charCount > 0 ? fillerCount / charCount : null;

    const volumeStability = audioResult?.buffer
      ? this.calculateVolumeStability(audioResult.buffer, audioResult.sampleRate)
      : null;

    const speechQuality = this.calculateSpeechQuality({
      speechRate,
      pauseRatio,
      fillerRatio,
      volumeStability
    });

    return {
      speechRate,
      pauseRatio,
      fillerRatio,
      volumeStability,
      speechQuality
    };
  }

  private calculateSpeechQuality(params: {
    speechRate?: number | null;
    pauseRatio?: number | null;
    fillerRatio?: number | null;
    volumeStability?: number | null;
  }): number | null {
    const rateScore = params.speechRate
      ? this.rateScore(params.speechRate)
      : 60;
    const pauseScore = params.pauseRatio !== null && params.pauseRatio !== undefined
      ? Math.round((1 - params.pauseRatio) * 100)
      : 60;
    const fillerPenalty = params.fillerRatio !== null && params.fillerRatio !== undefined
      ? Math.min(30, params.fillerRatio * 600)
      : 0;
    const fillerScore = Math.max(0, 100 - fillerPenalty);
    const volumeScore = params.volumeStability !== null && params.volumeStability !== undefined
      ? params.volumeStability
      : 60;

    return Math.round(rateScore * 0.35 + pauseScore * 0.25 + fillerScore * 0.2 + volumeScore * 0.2);
  }

  private rateScore(speechRate: number): number {
    const target = 300;
    const tolerance = 120;
    const diff = Math.abs(speechRate - target);
    const penalty = Math.min(60, (diff / tolerance) * 60);
    return Math.max(40, Math.round(100 - penalty));
  }

  private countFillers(text: string): number {
    if (!text) {
      return 0;
    }
    const fillers = ['嗯', '呃', '额', '就是', '然后', '那个', '其实', '可能', '感觉'];
    return fillers.reduce((sum, filler) => {
      const matches = text.match(new RegExp(filler, 'g'));
      return sum + (matches ? matches.length : 0);
    }, 0);
  }

  private calculateVolumeStability(buffer: Buffer, sampleRate: number): number | null {
    if (!buffer.length || sampleRate <= 0) {
      return null;
    }
    const bytesPerSample = 2;
    const windowSize = Math.max(1, Math.floor(sampleRate * 0.2));
    const windowBytes = windowSize * bytesPerSample;
    const totalWindows = Math.floor(buffer.length / windowBytes);
    if (totalWindows === 0) {
      return null;
    }
    const maxWindows = 300;
    const stride = Math.max(1, Math.ceil(totalWindows / maxWindows));
    const rmsValues: number[] = [];

    for (let w = 0; w < totalWindows; w += stride) {
      const start = w * windowBytes;
      let sumSquares = 0;
      for (let offset = start; offset < start + windowBytes && offset + 1 < buffer.length; offset += bytesPerSample) {
        const sample = buffer.readInt16LE(offset) / 32768;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / windowSize);
      rmsValues.push(rms);
    }

    const mean = rmsValues.reduce((sum, v) => sum + v, 0) / rmsValues.length;
    if (mean <= 0) {
      return 50;
    }
    const variance = rmsValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / rmsValues.length;
    const std = Math.sqrt(variance);
    const cv = std / mean;
    return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
  }

  private average(values: Array<number | null | undefined>): number | null {
    const valid = values.filter(value => typeof value === 'number' && Number.isFinite(value)) as number[];
    if (!valid.length) {
      return null;
    }
    return Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length);
  }

  private clampRatio(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }
}

export const speechMetricsService = new SpeechMetricsService();
