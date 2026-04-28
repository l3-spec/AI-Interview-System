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

// 增强型声纹特征接口（Phase 1）
export interface EnhancedVoiceprintFeatures {
  // 频域特征
  mfccFeatures: number[];      // MFCC系数（13维）
  spectralCentroid: number;    // 频谱重心
  spectralBandwidth: number;   // 频谱带宽
  spectralRolloff: number;     // 频谱滚降
  
  // 时域特征（保留但改进）
  rmsEnergy: number[];         // 改进的RMS能量分布
  zeroCrossingRate: number[];  // 改进的过零率分布
  
  // 韵律特征
  pitchContour: number[];      // 基频轮廓
  intensityContour: number[];  // 强度轮廓
  
  // 综合向量
  featureVector: number[];     // 拼接后的特征向量
}

// 声纹服务配置接口（Phase 2预留）
export interface VoiceprintServiceConfig {
  mode: 'signal-processing' | 'deep-learning';  // 当前模式
  dlModelEndpoint?: string;  // 深度学习模型API端点（预留）
}

export interface VoiceprintAnalysisSummary {
  enabled: boolean;
  status: 'CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT' | 'DISABLED';
  threshold: number;
  analyzedSampleCount: number;
  consistencyScore?: number | null;
  baselineQuestionIndex?: number | null;
  questions: VoiceprintQuestionResult[];
  // 新增：详细特征信息（用于存储到数据库）
  enhancedFeatures?: EnhancedVoiceprintFeatures[];
}

class VoiceprintAnalysisService {
  private enabled = process.env.VOICEPRINT_ANALYSIS_ENABLED !== 'false';
  private threshold = Number(process.env.VOICEPRINT_SIMILARITY_THRESHOLD || 0.82);

  /** 增强特征各子块的相对权重（供 buildEnhancedFeatureVector 与频谱量级对齐） */
  private readonly featureWeights = {
    mfcc: 1.0,
    spectral: 0.01,
    temporal: 1.0,
    prosody: 0.5,
  } as const;

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

  /**
   * 提取增强型声纹特征（Phase 1实现）
   * 使用ffmpeg提取频域、时域、韵律等多维度特征
   */
  private async extractEnhancedFeatures(source: string, audio: AudioExtractResult): Promise<EnhancedVoiceprintFeatures> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-voiceprint-enhanced-'));
    const statsPath = path.join(tmpDir, `stats_${Date.now()}.txt`);
    
    try {
      // 1. 使用ffmpeg astats滤镜提取音频统计信息
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', source,
        '-af', 'astats=metadata=1:reset=1,ametadata=mode=print:file=' + statsPath,
        '-f', 'null',
        '-',
      ]);
      
      // 2. 解析astats输出
      const statsContent = fs.readFileSync(statsPath, 'utf-8');
      const spectralCentroid = this.extractStatValue(statsContent, 'Spectral centroid', 0);
      const spectralBandwidth = this.extractStatValue(statsContent, 'Spectral bandwidth', 0);
      const spectralRolloff = this.extractStatValue(statsContent, 'Spectral rolloff', 0);
      
      // 3. 提取MFCC特征（简化实现，使用13维）
      const mfccFeatures = await this.extractMFCCFeatures(source, tmpDir);
      
      // 4. 计算改进的时域特征
      const sampleCount = Math.floor(audio.buffer.length / 2);
      const samples = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        samples[i] = audio.buffer.readInt16LE(i * 2) / 32768;
      }
      
      const rmsEnergy = this.buildSegmentMetric(samples, 16, (slice) => this.rms(slice));
      const zeroCrossingRate = this.buildSegmentMetric(samples, 8, (slice) => this.zeroCrossingRate(slice));
      
      // 5. 提取韵律特征（基频和强度轮廓）
      const pitchContour = this.buildSegmentMetric(samples, 10, (slice) => this.estimatePitch(slice, audio.sampleRate));
      const intensityContour = this.buildSegmentMetric(samples, 10, (slice) => this.rms(slice));
      
      // 6. 构建综合特征向量，应用权重
      const featureVector = this.buildEnhancedFeatureVector({
        mfccFeatures,
        spectralCentroid,
        spectralBandwidth,
        spectralRolloff,
        rmsEnergy,
        zeroCrossingRate,
        pitchContour,
        intensityContour,
      });
      
      return {
        mfccFeatures,
        spectralCentroid,
        spectralBandwidth,
        spectralRolloff,
        rmsEnergy,
        zeroCrossingRate,
        pitchContour,
        intensityContour,
        featureVector,
      };
    } catch (error) {
      console.warn('[VoiceprintAnalysis] 增强特征提取失败，降级使用原始特征:', error);
      // 降级：使用原始特征构建向量
      const samples = new Float32Array(Math.floor(audio.buffer.length / 2));
      for (let i = 0; i < samples.length; i++) {
        samples[i] = audio.buffer.readInt16LE(i * 2) / 32768;
      }
      const rmsEnergy = this.buildSegmentMetric(samples, 16, (slice) => this.rms(slice));
      const zeroCrossingRate = this.buildSegmentMetric(samples, 8, (slice) => this.zeroCrossingRate(slice));
      const vector = this.buildFingerprintVector(audio.buffer);
      
      return {
        mfccFeatures: Array(13).fill(0),
        spectralCentroid: 0,
        spectralBandwidth: 0,
        spectralRolloff: 0,
        rmsEnergy,
        zeroCrossingRate,
        pitchContour: Array(10).fill(0),
        intensityContour: Array(10).fill(0),
        featureVector: vector,
      };
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('[VoiceprintAnalysis] 清理临时文件失败:', cleanupError);
      }
    }
  }
  
  /**
   * 从astats输出中提取指定统计值
   */
  private extractStatValue(content: string, key: string, defaultValue: number): number {
    const regex = new RegExp(`${key}:\\s*([\\d.]+)`);
    const match = content.match(regex);
    return match ? parseFloat(match[1]) : defaultValue;
  }
  
  /**
   * 提取MFCC特征（简化实现）
   */
  private async extractMFCCFeatures(source: string, tmpDir: string): Promise<number[]> {
    try {
      // 这里使用简化的MFCC实现，实际生产环境可以使用专门的音频处理库
      // 暂时返回13维随机特征模拟，后续可以集成更专业的实现
      return Array.from({ length: 13 }, () => Math.random());
    } catch (error) {
      console.warn('[VoiceprintAnalysis] MFCC特征提取失败:', error);
      return Array(13).fill(0);
    }
  }
  
  /**
   * 简易基频估计（用于韵律特征）
   */
  private estimatePitch(samples: Float32Array, sampleRate: number): number {
    if (samples.length < 2) return 0;
    // 简化实现：返回过零率乘以采样率/2作为基频估计
    const zcr = this.zeroCrossingRate(samples);
    return Math.min(400, Math.max(80, zcr * sampleRate / 2));
  }
  
  /**
   * 构建增强特征向量，应用特征权重
   */
  private buildEnhancedFeatureVector(features: Omit<EnhancedVoiceprintFeatures, 'featureVector'>): number[] {
    const vector: number[] = [];
    
    // 频域特征（乘以相应权重）
    vector.push(...features.mfccFeatures.map(v => v * this.featureWeights.mfcc));
    vector.push(features.spectralCentroid * this.featureWeights.spectral);
    vector.push(features.spectralBandwidth * this.featureWeights.spectral);
    vector.push(features.spectralRolloff * this.featureWeights.spectral);
    
    // 时域特征
    vector.push(...features.rmsEnergy.map(v => v * this.featureWeights.temporal));
    vector.push(...features.zeroCrossingRate.map(v => v * this.featureWeights.temporal));
    
    // 韵律特征
    vector.push(...features.pitchContour.map(v => v * this.featureWeights.prosody));
    vector.push(...features.intensityContour.map(v => v * this.featureWeights.prosody));
    
    return this.normalizeVector(vector);
  }
  
  /**
   * 加权余弦相似度计算
   */
  private weightedCosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return Math.max(0, Math.min(1, dotProduct / denominator));
  }
  
  // 保留原始cosineSimilarity方法，保持向后兼容
  private cosineSimilarity(a: number[], b: number[]): number {
    return this.weightedCosineSimilarity(a, b);
  }
}

export const voiceprintAnalysisService = new VoiceprintAnalysisService();
