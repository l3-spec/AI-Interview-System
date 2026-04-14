import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolveVideoAccessUrl } from '../utils/videoUrlResolver';

const execFileAsync = promisify(execFile);

interface AudioExtractResult {
  buffer: Buffer;
  sampleRate: number;
  durationSec?: number | null;
}

export interface VoiceprintQuestionResult {
  questionIndex?: number;
  analyzed: boolean;
  similarityToBaseline?: number | null;
  durationSec?: number | null;
  issue?: string;
}

export interface VoiceprintAnalysisSummary {
  enabled: boolean;
  status: 'CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT' | 'DISABLED';
  threshold: number;
  analyzedSampleCount: number;
  consistencyScore?: number | null;
  baselineQuestionIndex?: number | null;
  questions: VoiceprintQuestionResult[];
}

class VoiceprintAnalysisService {
  private enabled = process.env.VOICEPRINT_ANALYSIS_ENABLED !== 'false';
  private threshold = Number(process.env.VOICEPRINT_SIMILARITY_THRESHOLD || 0.82);

  isEnabled(): boolean {
    return this.enabled;
  }

  async analyzeQuestions(
    sessionId: string,
    questions: Array<{
      questionIndex?: number;
      answerVideoPath?: string | null;
      answerVideoUrl?: string | null;
    }>
  ): Promise<VoiceprintAnalysisSummary> {
    if (!this.enabled) {
      return {
        enabled: false,
        status: 'DISABLED',
        threshold: this.threshold,
        analyzedSampleCount: 0,
        questions: questions.map(question => ({
          questionIndex: question.questionIndex,
          analyzed: false,
          issue: '声纹分析已禁用',
        })),
      };
    }

    const analyzedSamples: Array<{
      questionIndex?: number;
      vector: number[];
      durationSec?: number | null;
    }> = [];
    const results: VoiceprintQuestionResult[] = [];

    for (const question of questions) {
      const source = await resolveVideoAccessUrl({
        sessionId,
        answerVideoPath: question.answerVideoPath,
        answerVideoUrl: question.answerVideoUrl,
        questionIndex: question.questionIndex,
      });

      if (!source) {
        results.push({
          questionIndex: question.questionIndex,
          analyzed: false,
          issue: '无法访问视频源',
        });
        continue;
      }

      try {
        const audio = await this.extractAudio(source);
        if (!audio) {
          results.push({
            questionIndex: question.questionIndex,
            analyzed: false,
            issue: '音频提取失败',
          });
          continue;
        }

        const vector = this.buildFingerprintVector(audio.buffer);
        analyzedSamples.push({
          questionIndex: question.questionIndex,
          vector,
          durationSec: audio.durationSec,
        });
        results.push({
          questionIndex: question.questionIndex,
          analyzed: true,
          durationSec: audio.durationSec,
        });
      } catch (error) {
        results.push({
          questionIndex: question.questionIndex,
          analyzed: false,
          issue: error instanceof Error ? error.message : '声纹分析失败',
        });
      }
    }

    if (analyzedSamples.length < 2) {
      return {
        enabled: true,
        status: 'INSUFFICIENT',
        threshold: this.threshold,
        analyzedSampleCount: analyzedSamples.length,
        consistencyScore: null,
        baselineQuestionIndex: analyzedSamples[0]?.questionIndex ?? null,
        questions: results,
      };
    }

    const baseline = analyzedSamples[0];
    let similaritySum = 0;
    let comparedCount = 0;

    analyzedSamples.forEach((sample) => {
      if (sample === baseline) {
        const target = results.find(item => item.questionIndex === sample.questionIndex && item.analyzed);
        if (target) {
          target.similarityToBaseline = 1;
        }
        return;
      }

      const similarity = this.cosineSimilarity(baseline.vector, sample.vector);
      similaritySum += similarity;
      comparedCount += 1;
      const target = results.find(item => item.questionIndex === sample.questionIndex && item.analyzed);
      if (target) {
        target.similarityToBaseline = Number(similarity.toFixed(3));
      }
    });

    const consistencyScore = comparedCount > 0 ? similaritySum / comparedCount : 1;
    return {
      enabled: true,
      status: consistencyScore >= this.threshold ? 'CONSISTENT' : 'INCONSISTENT',
      threshold: this.threshold,
      analyzedSampleCount: analyzedSamples.length,
      consistencyScore: Number(consistencyScore.toFixed(3)),
      baselineQuestionIndex: baseline.questionIndex ?? null,
      questions: results,
    };
  }

  private async extractAudio(source: string): Promise<AudioExtractResult | null> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-voiceprint-'));
    const pcmPath = path.join(tmpDir, `audio_${Date.now()}.pcm`);
    const sampleRate = 16000;

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', source,
        '-ac', '1',
        '-ar', String(sampleRate),
        '-f', 's16le',
        pcmPath,
      ]);

      const buffer = fs.readFileSync(pcmPath);
      const durationSec = buffer.length / (sampleRate * 2);
      return { buffer, sampleRate, durationSec };
    } catch (error) {
      console.warn('[VoiceprintAnalysis] 音频提取失败:', error);
      return null;
    } finally {
      try {
        if (fs.existsSync(pcmPath)) {
          fs.unlinkSync(pcmPath);
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('[VoiceprintAnalysis] 清理临时文件失败:', cleanupError);
      }
    }
  }

  private buildFingerprintVector(buffer: Buffer): number[] {
    const sampleCount = Math.floor(buffer.length / 2);
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = buffer.readInt16LE(i * 2) / 32768;
    }

    const segmentCount = 16;
    const zcrSegmentCount = 8;
    const vector: number[] = [];
    const rmsValues = this.buildSegmentMetric(samples, segmentCount, (slice) => this.rms(slice));
    const zcrValues = this.buildSegmentMetric(samples, zcrSegmentCount, (slice) => this.zeroCrossingRate(slice));
    const meanAbs = this.meanAbsolute(samples);
    const variance = this.variance(samples);

    vector.push(meanAbs, variance, ...rmsValues, ...zcrValues);
    return this.normalizeVector(vector);
  }

  private buildSegmentMetric(
    samples: Float32Array,
    segmentCount: number,
    calculator: (slice: Float32Array) => number
  ): number[] {
    if (samples.length === 0) {
      return Array.from({ length: segmentCount }, () => 0);
    }

    const values: number[] = [];
    for (let index = 0; index < segmentCount; index += 1) {
      const start = Math.floor((samples.length / segmentCount) * index);
      const end = Math.floor((samples.length / segmentCount) * (index + 1));
      values.push(calculator(samples.slice(start, Math.max(start + 1, end))));
    }

    return values;
  }

  private rms(samples: Float32Array): number {
    if (!samples.length) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private zeroCrossingRate(samples: Float32Array): number {
    if (samples.length < 2) {
      return 0;
    }
    let changes = 0;
    for (let i = 1; i < samples.length; i += 1) {
      if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
        changes += 1;
      }
    }
    return changes / (samples.length - 1);
  }

  private meanAbsolute(samples: Float32Array): number {
    if (!samples.length) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += Math.abs(samples[i]);
    }
    return sum / samples.length;
  }

  private variance(samples: Float32Array): number {
    if (!samples.length) {
      return 0;
    }
    const mean = this.meanAbsolute(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const diff = Math.abs(samples[i]) - mean;
      sum += diff * diff;
    }
    return sum / samples.length;
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm <= 0) {
      return vector;
    }
    return vector.map(value => value / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || a.length !== b.length) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
      sum += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, sum));
  }
}

export const voiceprintAnalysisService = new VoiceprintAnalysisService();
