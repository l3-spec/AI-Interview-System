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
  // 新增：语音质量详细维度
  fluencyScore?: number | null;      // 流畅度 0-100
  confidenceScore?: number | null;   // 自信度 0-100
  clarityScore?: number | null;      // 清晰度 0-100
  rateStability?: number | null;     // 语速稳定性 0-100
  fillerDetails?: {                  // 填充词详情
    totalFillers: number;
    chineseFillers: string[];
    fillerDensity: number;           // 每百字填充词数
  } | null;
  voiceprintMatch?: number | null;   // 声纹匹配（辅助）
  videoProvided?: boolean;
  videoResolved?: boolean;
  audioExtracted?: boolean;
  asrAttempted?: boolean;
  asrCompleted?: boolean;
  transcriptSource?: 'manual_text' | 'video_asr' | 'video_audio_only' | 'empty';
  issues?: string[];
}

export interface SpeechMetricsSummary {
  transcript: string;
  sampleCount: number;
  avgSpeechRate?: number | null;
  avgPauseRatio?: number | null;
  avgFillerRatio?: number | null;
  avgVolumeStability?: number | null;
  speechQuality?: number | null;
  // 新增：语音质量详细维度
  avgFluencyScore?: number | null;
  avgConfidenceScore?: number | null;
  avgClarityScore?: number | null;
  asrEnabled: boolean;
  audioExtractSuccessCount: number;
  asrAttemptCount: number;
  asrCompletedCount: number;
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
    const accessKeyId = process.env.ALIYUN_NLS_ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_NLS_ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET;
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

  isAsrEnabled(): boolean {
    return this.asrEnabled;
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
    let audioExtractSuccessCount = 0;
    let asrAttemptCount = 0;
    let asrCompletedCount = 0;

    for (const question of questions) {
      const answerText = question.answerText?.trim() || '';
      let transcript = answerText;
      let audioResult: AudioExtractResult | null = null;
      let videoResolved = false;
      let audioExtracted = false;
      let asrAttempted = false;
      let asrCompleted = false;
      let transcriptSource: SpeechMetricsSample['transcriptSource'] = answerText ? 'manual_text' : 'empty';
      const issues: string[] = [];
      const hasVideo = Boolean(question.answerVideoPath || question.answerVideoUrl);

      let resolvedSource: string | null = null;
      if (hasVideo) {
        resolvedSource = await this.resolveSource(
          sessionId,
          question.answerVideoPath,
          question.answerVideoUrl,
          question.questionIndex
        );
        videoResolved = Boolean(resolvedSource);
        if (!resolvedSource) {
          issues.push('无法访问视频源');
        }
      }

      if (!transcript && resolvedSource) {
        audioResult = await this.extractAudioFromSource(resolvedSource);
        audioExtracted = Boolean(audioResult);
        if (audioExtracted) {
          audioExtractSuccessCount += 1;
        } else {
          issues.push('音频提取失败');
        }
        if (audioResult && this.asrEnabled && this.asrService) {
          asrAttempted = true;
          asrAttemptCount += 1;
          try {
            const asrResult = await this.asrService.recognize(audioResult.buffer, audioResult.sampleRate);
            transcript = asrResult.text || '';
            asrCompleted = true;
            asrCompletedCount += 1;
            transcriptSource = 'video_asr';
          } catch (error) {
            console.warn('[SpeechMetrics] ASR识别失败，跳过该题:', error);
            issues.push(error instanceof Error ? error.message : 'ASR识别失败');
          }
        } else if (audioResult) {
          transcriptSource = 'video_audio_only';
        }
      } else if (resolvedSource) {
        audioResult = await this.extractAudioFromSource(resolvedSource);
        audioExtracted = Boolean(audioResult);
        if (audioExtracted) {
          audioExtractSuccessCount += 1;
        } else {
          issues.push('音频提取失败');
        }
      }

      if (!transcriptSource) {
        transcriptSource = transcript ? 'manual_text' : 'empty';
      }

      const durationSec = question.answerDuration
        ? Number(question.answerDuration)
        : audioResult?.durationSec ?? null;

      const metrics = this.calculateSpeechMetrics(transcript, durationSec, audioResult);
      const fillerInfo = this.countFillersEnhanced(transcript || '');
      const pauseInfo = this.analyzePausePattern(transcript, durationSec);
      const fluencyScore = this.calculateFluencyScore({
        speechRate: metrics.speechRate,
        fillerDensity: fillerInfo.density,
        pauseRatio: metrics.pauseRatio
      });
      const confidenceScore = this.calculateConfidenceScore({
        speechRate: metrics.speechRate,
        pauseRatio: metrics.pauseRatio,
        fillerDensity: fillerInfo.density,
        volumeStability: metrics.volumeStability
      });
      const clarityScore = this.calculateClarityScore({
        speechRate: metrics.speechRate
      });
      samples.push({
        questionIndex: question.questionIndex,
        transcript,
        durationSec,
        speechRate: metrics.speechRate,
        pauseRatio: metrics.pauseRatio,
        fillerRatio: metrics.fillerRatio,
        volumeStability: metrics.volumeStability,
        speechQuality: metrics.speechQuality,
        fluencyScore,
        confidenceScore,
        clarityScore,
        fillerDetails: fillerInfo.totalCount > 0 ? {
          totalFillers: fillerInfo.totalCount,
          chineseFillers: fillerInfo.fillerList,
          fillerDensity: fillerInfo.density
        } : null,
        videoProvided: hasVideo,
        videoResolved,
        audioExtracted,
        asrAttempted,
        asrCompleted,
        transcriptSource: transcript
          ? transcriptSource === 'empty'
            ? 'manual_text'
            : transcriptSource
          : transcriptSource,
        issues
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
    const avgFluencyScore = this.average(samples.map(s => s.fluencyScore));
    const avgConfidenceScore = this.average(samples.map(s => s.confidenceScore));
    const avgClarityScore = this.average(samples.map(s => s.clarityScore));

    return {
      transcript: fullTranscript.trim(),
      sampleCount: samples.length,
      avgSpeechRate,
      avgPauseRatio,
      avgFillerRatio,
      avgVolumeStability,
      speechQuality,
      avgFluencyScore,
      avgConfidenceScore,
      avgClarityScore,
      asrEnabled: this.asrEnabled,
      audioExtractSuccessCount,
      asrAttemptCount,
      asrCompletedCount,
      samples
    };
  }

  private async extractAudioFromSource(source: string | null): Promise<AudioExtractResult | null> {
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

  /**
   * 增强版填充词检测：中英文填充词 + 重复词 + 卡顿标记
   */
  countFillersEnhanced(text: string): { totalCount: number; fillerList: string[]; density: number } {
    if (!text) return { totalCount: 0, fillerList: [], density: 0 };
    const chineseFillers = ['嗯', '呃', '额', '就是', '然后', '那个', '其实', '可能', '感觉', '就是说', '对吧', '这个', '这样子', '那么'];
    const englishFillers = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'sort of', 'kind of'];
    const allFillers = [...chineseFillers, ...englishFillers];
    const found: string[] = [];
    let totalCount = 0;
    for (const filler of allFillers) {
      const regex = new RegExp(filler, 'gi');
      const matches = text.match(regex);
      if (matches) {
        totalCount += matches.length;
        found.push(`${filler}(${matches.length})`);
      }
    }
    const charCount = text.replace(/\s+/g, '').length;
    const density = charCount > 0 ? (totalCount / charCount) * 100 : 0;
    return { totalCount, fillerList: found, density: Number(density.toFixed(2)) };
  }

  /**
   * 计算流畅度评分：综合语速稳定性 + 卡顿率 + 填充词密度
   */
  calculateFluencyScore(params: {
    speechRate?: number | null;
    rateStability?: number | null;
    fillerDensity?: number | null;
    pauseRatio?: number | null;
  }): number {
    const rateScore = params.speechRate
      ? this.rateScore(params.speechRate)
      : 60;
    const stabilityScore = params.rateStability ?? 60;
    const fillerPenalty = params.fillerDensity !== null && params.fillerDensity !== undefined
      ? Math.min(40, params.fillerDensity * 8)
      : 0;
    const fillerScore = Math.max(0, 100 - fillerPenalty);
    const pauseScore = params.pauseRatio !== null && params.pauseRatio !== undefined
      ? Math.round((1 - params.pauseRatio) * 100)
      : 60;
    return Math.round(rateScore * 0.25 + stabilityScore * 0.3 + fillerScore * 0.25 + pauseScore * 0.2);
  }

  /**
   * 计算自信度评分：语速正常 + 停顿少 + 填充词少 + 音量稳定
   */
  calculateConfidenceScore(params: {
    speechRate?: number | null;
    pauseRatio?: number | null;
    fillerDensity?: number | null;
    volumeStability?: number | null;
  }): number {
    const rateScore = params.speechRate
      ? this.rateScore(params.speechRate)
      : 60;
    const pauseScore = params.pauseRatio !== null && params.pauseRatio !== undefined
      ? Math.round((1 - params.pauseRatio) * 100)
      : 60;
    const fillerPenalty = params.fillerDensity !== null && params.fillerDensity !== undefined
      ? Math.min(35, params.fillerDensity * 7)
      : 0;
    const fillerScore = Math.max(0, 100 - fillerPenalty);
    const volumeScore = params.volumeStability ?? 60;
    return Math.round(rateScore * 0.3 + pauseScore * 0.3 + fillerScore * 0.25 + volumeScore * 0.15);
  }

  /**
   * 计算清晰度评分：ASR置信度 + 语速合理性
   */
  calculateClarityScore(params: {
    speechRate?: number | null;
    asrConfidence?: number | null;
  }): number {
    const rateScore = params.speechRate
      ? this.rateScore(params.speechRate)
      : 60;
    const asrScore = params.asrConfidence !== null && params.asrConfidence !== undefined
      ? Math.round(params.asrConfidence * 100)
      : 60;
    return Math.round(rateScore * 0.4 + asrScore * 0.6);
  }

  /**
   * 分析停顿模式
   */
  analyzePausePattern(text: string, durationSec?: number | null): { pattern: string; pauseDensity: number } {
    if (!text || !durationSec || durationSec <= 0) {
      return { pattern: 'unknown', pauseDensity: 0 };
    }
    const charCount = text.replace(/\s+/g, '').length;
    const charsPerSec = charCount / durationSec;
    const pauseDensity = Number((1 - Math.min(1, charsPerSec / 7)).toFixed(2));
    let pattern: string;
    if (pauseDensity < 0.1) pattern = '流畅自然';
    else if (pauseDensity < 0.25) pattern = '偶有停顿';
    else if (pauseDensity < 0.4) pattern = '停顿较多';
    else pattern = '频繁停顿';
    return { pattern, pauseDensity };
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
