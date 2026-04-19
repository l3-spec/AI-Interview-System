import Core from '@alicloud/pop-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ossService } from './ossService';
import { extractObjectKeyFromUrl } from '../utils/videoUrlResolver';

const execFileAsync = promisify(execFile);

/**
 * 情绪分析结果
 */
interface EmotionResult {
    type: string; // 情绪类型: neutral, happiness, surprise, sadness, anger, disgust, fear
    confidence: number; // 置信度 0-1
}

interface FacePose {
    pitch: number;
    yaw: number;
    roll: number;
}

interface FrameAnalysis {
    emotions: EmotionResult[];
    pose?: FacePose | null;
    gaze?: FacePose | null;
    eyeOpen?: number | null;
    faceQuality?: number | null;
    faceRect?: FaceRect | null;
    timeMs: number;
    rawFace?: Record<string, any> | null;
}

interface FaceRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * 视频分析结果
 */
interface BodyLanguageDetails {
    headMovementFrequency: number; // 头部晃动频率 0-100
    bodyTiltAngle: number; // 身体倾斜角度
    postureNaturalness: number; // 姿态自然度 0-100
    fidgetingScore: number; // 小动作频率 0-100（越高越紧张）
}

interface EmotionTimelineEntry {
    timeMs: number;
    dominantEmotion: string;
    confidence: number;
    microExpressions?: string[]; // 微表情标签
}

interface VideoAnalysisResult {
    emotions: EmotionResult[]; // 各帧的情绪分析
    overallConfidence: number; // 综合自信度 0-100
    dominantEmotion: string; // 主导情绪
    emotionStability: number; // 情绪稳定性 0-100
    postureStability?: number; // 姿态稳定性 0-100
    gazeFocus?: number; // 视线专注度 0-100
    headPose?: FacePose; // 平均头部姿态
    frameMetrics?: Array<{
        timeMs: number;
        pose?: FacePose | null;
        gaze?: FacePose | null;
        eyeOpen?: number | null;
        faceQuality?: number | null;
        faceRect?: FaceRect | null;
        rawFace?: Record<string, any> | null;
    }>;
    // 新增字段
    microExpressionScore: number; // 微表情综合评分 0-100（越高越自信）
    bodyLanguageDetails?: BodyLanguageDetails; // 肢体语言详细分析
    emotionTimeline?: EmotionTimelineEntry[]; // 情绪时间线
}

/**
 * 阿里云视频AI服务
 * 提供表情识别、视频内容分析等功能
 */
class AliyunVideoAIService {
    private client?: Core; // 可选属性，未配置时为undefined
    private enabled: boolean;
    private debug: boolean;
    private ffmpegPath: string = 'ffmpeg';

    constructor() {
        this.ffmpegPath = this.resolveFfmpegPath();
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        const region = process.env.ALIYUN_FACEBODY_REGION || 'cn-shanghai';
        const endpoint = process.env.ALIYUN_FACEBODY_ENDPOINT || `https://facebody.${region}.aliyuncs.com`;

        if (!accessKeyId || !accessKeySecret) {
            console.warn('[AliyunVideoAI] 未配置阿里云密钥，视频分析功能将被禁用');
            this.enabled = false;
            this.debug = false;
            return;
        }

        this.enabled = true;
        this.debug = process.env.ALIYUN_FACEBODY_DEBUG === 'true';
        this.client = new Core({
            accessKeyId,
            accessKeySecret,
            endpoint,
            apiVersion: '2019-12-30'
        });

        console.log('[AliyunVideoAI] 服务初始化成功');
    }

    /**
     * 分析单个答题视频
     * @param videoUrl OSS视频URL
     * @returns 视频分析结果
     */
    async analyzeAnswerVideo(videoUrl: string): Promise<VideoAnalysisResult> {
        if (!this.enabled) {
            console.warn('[AliyunVideoAI] 服务未启用，返回默认结果');
            return this.getDefaultResult();
        }

        try {
            console.log(`[AliyunVideoAI] 开始分析视频: ${videoUrl.substring(0, 80)}...`);

            // TODO: 实际实现需要：
            // 1. 从视频提取关键帧（每隔2秒提取一帧）
            // 2. 对每一帧调用表情识别API
            // 3. 聚合结果并计算统计指标

            const frameResults = await this.analyzeVideoFrames(videoUrl);
            const emotions = frameResults.flatMap(frame => frame.emotions);

            const postureScores = frameResults
                .map(frame => this.calculatePostureScore(frame.pose))
                .filter(score => typeof score === 'number') as number[];
            const gazeScores = frameResults
                .map(frame => this.calculateGazeScore(frame.gaze, frame.eyeOpen, frame.pose))
                .filter(score => typeof score === 'number') as number[];

            const postureStability = this.calculateStabilityFromScores(postureScores);
            const gazeFocus = gazeScores.length
                ? Math.round(gazeScores.reduce((sum, v) => sum + v, 0) / gazeScores.length)
                : undefined;

            const avgPose = this.averagePose(frameResults.map(frame => frame.pose).filter(Boolean) as FacePose[]);
            const frameMetrics = frameResults.map(frame => ({
                timeMs: frame.timeMs,
                pose: frame.pose ?? null,
                gaze: frame.gaze ?? null,
                eyeOpen: frame.eyeOpen ?? null,
                faceQuality: frame.faceQuality ?? null,
                faceRect: frame.faceRect ?? null,
                rawFace: frame.rawFace ?? null
            }));

            // 微表情分析
            const microExpressionResult = this.analyzeMicroExpressions(frameResults);
            
            // 肢体语言分析
            const bodyLanguageDetails = this.analyzeBodyLanguage(frameResults);
            
            // 情绪时间线
            const emotionTimeline = this.buildEmotionTimeline(frameResults, microExpressionResult.tags);
            
            // 融合微表情和肢体语言到整体自信度
            const baseConfidence = this.calculateOverallConfidence(emotions);
            const postureBonus = postureStability ? (postureStability - 60) * 0.1 : 0;
            const gazeBonus = gazeFocus ? (gazeFocus - 60) * 0.1 : 0;
            const microBonus = (microExpressionResult.score - 60) * 0.2;
            const overallConfidence = this.clampScore(baseConfidence + postureBonus + gazeBonus + microBonus);

            const result = {
                emotions,
                overallConfidence,
                dominantEmotion: this.getDominantEmotion(emotions),
                emotionStability: this.calculateEmotionStability(emotions),
                postureStability,
                gazeFocus,
                headPose: avgPose || undefined,
                frameMetrics,
                microExpressionScore: microExpressionResult.score,
                bodyLanguageDetails,
                emotionTimeline
            };

            console.log(`[AliyunVideoAI] 分析完成: 主导情绪=${result.dominantEmotion}, 自信度=${result.overallConfidence}, 姿态稳定=${result.postureStability ?? 'N/A'}, 视线专注=${result.gazeFocus ?? 'N/A'}`);
            return result;

        } catch (error) {
            console.error('[AliyunVideoAI] 视频分析失败:', error);
            return this.getDefaultResult();
        }
    }

    /**
     * 分析视频帧（提取关键帧并识别表情）
     */
    private async analyzeVideoFrames(videoUrl: string): Promise<FrameAnalysis[]> {
        if (!this.client) {
            // 客户端未初始化，返回默认值
            return [{
                emotions: [{ type: 'neutral', confidence: 0.6 }],
                pose: null,
                gaze: null,
                eyeOpen: null,
                faceQuality: null,
                faceRect: null,
                timeMs: 0,
                rawFace: null
            }];
        }

        try {
            const frameResults: FrameAnalysis[] = [];
            // 优先使用自定义时间点，否则使用智能抽帧
            const times = this.parseSnapshotTimes(process.env.VIDEO_SNAPSHOT_TIMES_MS);
            let extractedFrames: Array<{ timeMs: number; path: string }> = [];
            let cleanup: (() => void) | null = null;

            try {
                const extraction = await this.extractFramesWithFfmpeg(videoUrl, times);
                extractedFrames = extraction.frames;
                cleanup = extraction.cleanup;
            } catch (error) {
                console.warn('[AliyunVideoAI] 本地抽帧失败，回退到OSS截帧:', error);
            }

            try {
                if (extractedFrames.length > 0) {
                    for (const frame of extractedFrames) {
                        try {
                            const imageData = fs.readFileSync(frame.path).toString('base64');
                            const emotions = await this.recognizeExpression({ data: imageData });
                            const faceAttributes = await this.detectFaceAttributes({ data: imageData });

                            frameResults.push({
                                emotions,
                                pose: faceAttributes.pose,
                                gaze: faceAttributes.gaze,
                                eyeOpen: faceAttributes.eyeOpen,
                                faceQuality: faceAttributes.faceQuality,
                                faceRect: faceAttributes.faceRect,
                                timeMs: frame.timeMs,
                                rawFace: faceAttributes.rawFace
                            });
                        } catch (error) {
                            console.warn('[AliyunVideoAI] 单帧分析失败，跳过该帧:', error);
                        }
                    }
                }

                if (!frameResults.length) {
                    const snapshotUrls = await this.buildSnapshotUrls(videoUrl);
                    for (const snapshot of snapshotUrls) {
                        try {
                            const emotions = await this.recognizeExpression({ url: snapshot.url });
                            const faceAttributes = await this.detectFaceAttributes({ url: snapshot.url });

                            frameResults.push({
                                emotions,
                                pose: faceAttributes.pose,
                                gaze: faceAttributes.gaze,
                                eyeOpen: faceAttributes.eyeOpen,
                                faceQuality: faceAttributes.faceQuality,
                                faceRect: faceAttributes.faceRect,
                                timeMs: snapshot.timeMs,
                                rawFace: faceAttributes.rawFace
                            });
                        } catch (error) {
                            console.warn('[AliyunVideoAI] 单帧分析失败，跳过该帧:', error);
                        }
                    }
                }
            } finally {
                if (cleanup) {
                    cleanup();
                }
            }

            return frameResults.length
                ? frameResults
                : [{
                emotions: [{ type: 'neutral', confidence: 0.6 }],
                pose: null,
                gaze: null,
                eyeOpen: null,
                faceQuality: null,
                faceRect: null,
                timeMs: 0,
                rawFace: null
            }];

        } catch (error) {
            console.warn('[AliyunVideoAI] 帧分析失败，使用模拟数据:', error);
            // 返回模拟数据以便测试
            return [{
                emotions: [
                    { type: 'neutral', confidence: 0.6 },
                    { type: 'happiness', confidence: 0.3 }
                ],
                pose: null,
                gaze: null,
                eyeOpen: null,
                faceQuality: null,
                faceRect: null,
                timeMs: 0,
                rawFace: null
            }];
        }
    }

    private resolveFfmpegPath(): string {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const resolved = require('ffmpeg-static');
            if (typeof resolved === 'string' && resolved) {
                return resolved;
            }
            if (resolved && typeof resolved.default === 'string') {
                return resolved.default;
            }
        } catch (error) {
            // ignore
        }
        return 'ffmpeg';
    }

    private async extractFramesWithFfmpeg(
        videoUrl: string,
        times: number[]
    ): Promise<{ frames: Array<{ timeMs: number; path: string }>; cleanup: () => void }> {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-frames-'));
        const frames: Array<{ timeMs: number; path: string }> = [];

        const cleanup = () => {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.warn('[AliyunVideoAI] 清理临时帧文件失败:', error);
            }
        };

        for (const timeMs of times) {
            const outputPath = path.join(tempDir, `frame_${timeMs}.jpg`);
            const seconds = Math.max(0, timeMs / 1000);
            try {
                await execFileAsync(this.ffmpegPath, [
                    '-y',
                    '-ss', seconds.toFixed(3),
                    '-i', videoUrl,
                    '-frames:v', '1',
                    '-q:v', '2',
                    '-vf', 'scale=640:-1',
                    '-an',
                    '-sn',
                    outputPath
                ]);
                if (fs.existsSync(outputPath)) {
                    frames.push({ timeMs, path: outputPath });
                }
            } catch (error) {
                console.warn(`[AliyunVideoAI] 抽帧失败 time=${timeMs}ms:`, error);
            }
        }

        if (!frames.length) {
            cleanup();
        }

        return { frames, cleanup };
    }

    private async buildSnapshotUrls(videoUrl: string): Promise<Array<{ url: string; timeMs: number }>> {
        const times = this.parseSnapshotTimes(process.env.VIDEO_SNAPSHOT_TIMES_MS);
        const objectKey = extractObjectKeyFromUrl(videoUrl);
        const urls: Array<{ url: string; timeMs: number }> = [];

        for (const t of times) {
            const process = `video/snapshot,t_${t},f_jpg,w_0,h_0,m_fast`;
            let snapshotUrl: string | null = null;

            if (objectKey) {
                try {
                    snapshotUrl = await ossService.generateSignedProcessUrl(objectKey, process, 3600);
                } catch (error) {
                    console.warn('[AliyunVideoAI] 生成签名截帧URL失败，尝试直接拼接:', error);
                }
            }

            if (!snapshotUrl) {
                snapshotUrl = this.appendProcessToUrl(videoUrl, process);
            }

            urls.push({ url: snapshotUrl, timeMs: t });
        }

        return urls;
    }

    /**
     * 智能抽帧策略
     * 根据视频长度动态调整抽帧间隔，并限制最大帧数
     */
    private generateSmartSnapshotTimes(videoDuration?: number): number[] {
        // 从环境变量读取配置
        const defaultInterval = parseInt(process.env.VIDEO_SNAPSHOT_INTERVAL_MS || '2000', 10);
        const maxFrames = parseInt(process.env.VIDEO_MAX_FRAMES || '15', 10);
        const analysisWindow = parseInt(process.env.VIDEO_ANALYSIS_WINDOW_MS || '30000', 10);

        // 如果不知道视频时长，使用默认时间点
        if (!videoDuration || videoDuration <= 0) {
            const times: number[] = [];
            for (let i = 1; i <= maxFrames; i++) {
                const time = i * defaultInterval;
                if (time > analysisWindow) break;
                times.push(time);
            }
            return times.length > 0 ? times : [1000, 3000, 5000];
        }

        // 限制分析窗口
        const maxDuration = Math.min(videoDuration, analysisWindow);
        let interval: number;

        // 根据视频长度调整间隔
        if (maxDuration < 10000) {
            interval = 1000; // <10秒视频，每秒1帧
        } else if (maxDuration < 30000) {
            interval = 2000; // 10-30秒视频，每2秒1帧
        } else {
            interval = 3000; // >30秒视频，每3秒1帧
        }

        // 生成时间点
        const times: number[] = [];
        for (let i = 1; i <= maxFrames; i++) {
            const time = i * interval;
            if (time > maxDuration) break;
            times.push(time);
        }

        // 确保至少有几帧
        return times.length >= 3 ? times : [1000, 2000, 3000];
    }

    private parseSnapshotTimes(raw?: string | null): number[] {
        if (raw) {
            const parsed = raw
                .split(',')
                .map(value => parseInt(value.trim(), 10))
                .filter(value => Number.isFinite(value) && value > 0);
            if (parsed.length) {
                return parsed.slice(0, parseInt(process.env.VIDEO_MAX_FRAMES || '15', 10));
            }
        }
        return this.generateSmartSnapshotTimes();
    }

    private appendProcessToUrl(url: string, process: string): string {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}x-oss-process=${encodeURIComponent(process)}`;
    }

    private async detectFaceAttributes(image: { url?: string; data?: string }): Promise<{
        pose?: FacePose | null;
        gaze?: FacePose | null;
        eyeOpen?: number | null;
        faceQuality?: number | null;
        faceRect?: FaceRect | null;
        rawFace?: Record<string, any> | null;
    }> {
        if (!this.client) {
            return {
                pose: null,
                gaze: null,
                eyeOpen: null,
                faceQuality: null,
                faceRect: null,
                rawFace: null
            };
        }

        try {
            const params: Record<string, any> = {
                RegionId: process.env.ALIYUN_FACEBODY_REGION || 'cn-shanghai'
            };

            if (image.data) {
                params.ImageData = image.data;
            } else if (image.url) {
                params.ImageURL = image.url;
            } else {
                return {
                    pose: null,
                    gaze: null,
                    eyeOpen: null,
                    faceQuality: null,
                    faceRect: null,
                    rawFace: null
                };
            }

            const response = await this.client.request('DetectFace', params, {
                method: 'POST'
            });

            if (this.debug) {
                this.logFaceResponse(response);
            }

            const element = this.extractFaceElement(response);
            const pose = this.extractPose(element);
            const gaze = this.extractGaze(element);
            const eyeOpen = this.extractEyeOpen(element);
            const faceQuality = this.extractFaceQuality(element);
            const faceRect = this.extractFaceRect(element);
            const rawFace = this.extractRawFaceData(element);

            return { pose, gaze, eyeOpen, faceQuality, faceRect, rawFace };
        } catch (error) {
            console.warn('[AliyunVideoAI] 姿态/视线识别失败:', error);
            return {
                pose: null,
                gaze: null,
                eyeOpen: null,
                faceQuality: null,
                faceRect: null,
                rawFace: null
            };
        }
    }

    private logFaceResponse(response: any) {
        try {
            const data = response?.Data || response;
            const sample = {
                keys: Object.keys(data || {}),
                elementKeys: Object.keys(this.extractFaceElement(response) || {})
            };
            console.log('[AliyunVideoAI] Facebody响应摘要:', sample);
        } catch (error) {
            console.warn('[AliyunVideoAI] Facebody响应摘要失败:', error);
        }
    }

    private extractFaceElement(response: any): any | null {
        const data = response?.Data || response;
        const candidates = [
            data?.Elements,
            data?.Faces,
            data?.FaceInfos,
            data?.FaceList,
            data?.FaceAttributes,
            data?.FaceAttribute
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate) && candidate.length > 0) {
                return candidate[0];
            }
            if (candidate && typeof candidate === 'object') {
                return candidate;
            }
        }

        return null;
    }

    private extractPose(element: any): FacePose | null {
        if (!element) {
            return null;
        }

        const candidates = [
            element.HeadPose,
            element.Pose,
            element.FacePose,
            element.FaceAttributes?.HeadPose,
            element.FaceAttributes?.Pose,
            element.FaceAttribute?.HeadPose,
            element.FaceAttribute?.Pose,
            element.FaceAttributes?.HeadPoseResult,
            element.FaceAttributes?.PoseResult,
            element.FaceAttribute?.HeadPoseResult,
            element.FaceAttribute?.PoseResult,
            element.HeadPoseResult,
            element.HeadPoseResults?.[0],
            element.HeadPoseInfo
        ];

        for (const candidate of candidates) {
            const pose = this.normalizePose(candidate);
            if (pose) {
                return pose;
            }
        }
        return null;
    }

    private extractGaze(element: any): FacePose | null {
        if (!element) {
            return null;
        }

        const candidates = [
            element.Gaze,
            element.EyeGaze,
            element.GazeInfo,
            element.FaceAttributes?.Gaze,
            element.FaceAttributes?.EyeGaze
        ];

        for (const candidate of candidates) {
            const gaze = this.normalizePose(candidate);
            if (gaze) {
                return gaze;
            }
        }
        return null;
    }

    private extractEyeOpen(element: any): number | null {
        if (!element) {
            return null;
        }
        const candidates = [
            element.EyeOpen,
            element.EyeOpenScore,
            element.FaceAttributes?.EyeOpen,
            element.FaceAttributes?.EyeOpenScore,
            element.FaceAttribute?.EyeOpen,
            element.FaceAttributes?.EyeStatus,
            element.FaceAttribute?.EyeStatus
        ];

        for (const candidate of candidates) {
            const value = this.toNumber(candidate);
            if (value !== null) {
                return this.clampScore(value * (value <= 1 ? 100 : 1));
            }
        }

        const left = this.toNumber(element.LeftEyeOpen ?? element.LeftEyeOpenScore);
        const right = this.toNumber(element.RightEyeOpen ?? element.RightEyeOpenScore);
        if (left !== null || right !== null) {
            const leftScore = left !== null ? left : right ?? 0;
            const rightScore = right !== null ? right : left ?? 0;
            return this.clampScore(((leftScore + rightScore) / 2) * (Math.max(leftScore, rightScore) <= 1 ? 100 : 1));
        }

        const eyeStatus = element.EyeStatus || element.FaceAttributes?.EyeStatus || element.FaceAttribute?.EyeStatus;
        if (eyeStatus && typeof eyeStatus === 'object') {
            const leftStatus = this.toNumber(eyeStatus.Left ?? eyeStatus.left ?? eyeStatus.LeftEye ?? eyeStatus.leftEye);
            const rightStatus = this.toNumber(eyeStatus.Right ?? eyeStatus.right ?? eyeStatus.RightEye ?? eyeStatus.rightEye);
            if (leftStatus !== null || rightStatus !== null) {
                const leftValue = leftStatus !== null ? leftStatus : rightStatus ?? 0;
                const rightValue = rightStatus !== null ? rightStatus : leftStatus ?? 0;
                return this.clampScore(((leftValue + rightValue) / 2) * (Math.max(leftValue, rightValue) <= 1 ? 100 : 1));
            }
        }

        return null;
    }

    private extractFaceQuality(element: any): number | null {
        if (!element) {
            return null;
        }
        const candidates = [
            element.FaceQuality,
            element.FaceQualityScore,
            element.Quality,
            element.QualityScore,
            element.FaceAttributes?.FaceQuality,
            element.FaceAttributes?.FaceQualityScore,
            element.FaceAttribute?.FaceQuality,
            element.FaceAttribute?.FaceQualityScore
        ];

        for (const candidate of candidates) {
            const value = this.toNumber(candidate);
            if (value !== null) {
                return this.clampScore(value * (value <= 1 ? 100 : 1));
            }
        }
        return null;
    }

    private extractFaceRect(element: any): FaceRect | null {
        if (!element) {
            return null;
        }
        const candidates = [
            element.FaceRect,
            element.BoundingBox,
            element.FaceBoundingBox,
            element.FaceAttributes?.FaceRect,
            element.FaceAttribute?.FaceRect
        ];

        for (const candidate of candidates) {
            if (!candidate || typeof candidate !== 'object') {
                continue;
            }
            const left = this.toNumber(candidate.Left ?? candidate.left ?? candidate.X ?? candidate.x);
            const top = this.toNumber(candidate.Top ?? candidate.top ?? candidate.Y ?? candidate.y);
            const width = this.toNumber(candidate.Width ?? candidate.width ?? candidate.W ?? candidate.w);
            const height = this.toNumber(candidate.Height ?? candidate.height ?? candidate.H ?? candidate.h);
            if (left !== null && top !== null && width !== null && height !== null) {
                return { left, top, width, height };
            }
        }
        return null;
    }

    private extractRawFaceData(element: any): Record<string, any> | null {
        if (!element) {
            return null;
        }

        return {
            headPose: element.HeadPose ?? element.FaceAttributes?.HeadPose ?? element.FaceAttribute?.HeadPose ?? null,
            gaze: element.Gaze ?? element.FaceAttributes?.Gaze ?? element.FaceAttribute?.Gaze ?? null,
            eyeStatus: element.EyeStatus ?? element.FaceAttributes?.EyeStatus ?? element.FaceAttribute?.EyeStatus ?? null,
            faceQuality: element.FaceQuality ?? element.FaceAttributes?.FaceQuality ?? element.FaceAttribute?.FaceQuality ?? null,
            faceRect: element.FaceRect ?? element.FaceAttributes?.FaceRect ?? element.FaceAttribute?.FaceRect ?? null
        };
    }

    private normalizePose(candidate: any): FacePose | null {
        if (!candidate) {
            return null;
        }
        if (Array.isArray(candidate) && candidate.length >= 3) {
            const values = candidate.map((item: any) => this.toNumber(item)).filter(value => value !== null) as number[];
            if (values.length >= 3) {
                return { pitch: values[0], yaw: values[1], roll: values[2] };
            }
        }

        const pose = Array.isArray(candidate) ? candidate[0] : candidate;
        const pitch = this.toNumber(
            pose.Pitch ?? pose.pitch ?? pose.AnglePitch ?? pose.pitchAngle ?? pose.UpDown ?? pose.upDown
        );
        const yaw = this.toNumber(
            pose.Yaw ?? pose.yaw ?? pose.AngleYaw ?? pose.yawAngle ?? pose.LeftRight ?? pose.leftRight
        );
        const roll = this.toNumber(
            pose.Roll ?? pose.roll ?? pose.AngleRoll ?? pose.rollAngle ?? pose.Tilt ?? pose.tilt
        );

        if (pitch === null || yaw === null || roll === null) {
            return null;
        }

        return { pitch, yaw, roll };
    }

    private calculatePostureScore(pose?: FacePose | null): number | null {
        if (!pose) {
            return null;
        }
        const deviation = Math.abs(pose.pitch) + Math.abs(pose.yaw) + Math.abs(pose.roll);
        return this.clampScore(100 - deviation * 1.2);
    }

    private calculateGazeScore(
        gaze?: FacePose | null,
        eyeOpen?: number | null,
        pose?: FacePose | null
    ): number | null {
        const source = gaze || pose;
        if (!source) {
            return null;
        }
        const deviation = Math.abs(source.pitch) * 2 + Math.abs(source.yaw) * 2;
        let score = 100 - deviation;
        if (eyeOpen !== null && eyeOpen !== undefined && eyeOpen < 30) {
            score -= 15;
        }
        return this.clampScore(score);
    }

    private calculateStabilityFromScores(scores: number[]): number | undefined {
        if (!scores.length) {
            return undefined;
        }
        if (scores.length === 1) {
            return Math.round(scores[0]);
        }
        const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length;
        const variance = scores.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / scores.length;
        const std = Math.sqrt(variance);
        return Math.round(this.clampScore(avg - std * 0.6));
    }

    private averagePose(poses: FacePose[]): FacePose | null {
        if (!poses.length) {
            return null;
        }
        const avg = poses.reduce(
            (acc, pose) => {
                acc.pitch += pose.pitch;
                acc.yaw += pose.yaw;
                acc.roll += pose.roll;
                return acc;
            },
            { pitch: 0, yaw: 0, roll: 0 }
        );
        return {
            pitch: Number((avg.pitch / poses.length).toFixed(2)),
            yaw: Number((avg.yaw / poses.length).toFixed(2)),
            roll: Number((avg.roll / poses.length).toFixed(2))
        };
    }

    private toNumber(value: any): number | null {
        if (value === null || value === undefined) {
            return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    private clampScore(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(value)));
    }

    /**
     * 表情识别API（单张图片）
     */
    async recognizeExpression(image: { url?: string; data?: string }): Promise<EmotionResult[]> {
        if (!this.enabled || !this.client) {
            return [{ type: 'neutral', confidence: 1.0 }];
        }

        try {
            const params: Record<string, any> = {
                RegionId: process.env.ALIYUN_FACEBODY_REGION || 'cn-shanghai'
            };

            if (image.data) {
                params.ImageData = image.data;
            } else if (image.url) {
                params.ImageURL = image.url;
            } else {
                return [{ type: 'neutral', confidence: 1.0 }];
            }

            const response = await this.client.request('RecognizeExpression', params, {
                method: 'POST'
            });

            return this.parseEmotionResponse(response);

        } catch (error) {
            console.error('[AliyunVideoAI] 表情识别API调用失败:', error);
            throw error;
        }
    }

    /**
     * 解析阿里云表情识别API响应
     */
    private parseEmotionResponse(response: any): EmotionResult[] {
        try {
            const data = response.Data;
            if (!data || !data.Elements || data.Elements.length === 0) {
                return [{ type: 'neutral', confidence: 1.0 }];
            }

            // 提取所有检测到的人脸的表情
            const emotions: EmotionResult[] = [];
            for (const element of data.Elements) {
                if (element.FaceExpressionResults && element.FaceExpressionResults.length > 0) {
                    const topExpression = element.FaceExpressionResults[0];
                    emotions.push({
                        type: topExpression.Label.toLowerCase(),
                        confidence: topExpression.Score
                    });
                }
            }

            return emotions.length > 0 ? emotions : [{ type: 'neutral', confidence: 1.0 }];

        } catch (error) {
            console.error('[AliyunVideoAI] 响应解析失败:', error);
            return [{ type: 'neutral', confidence: 1.0 }];
        }
    }

    /**
     * 计算综合自信度评分
     * 基于情绪分布：积极情绪（高兴、中性）比例越高，自信度越高
     */
    private calculateOverallConfidence(emotions: EmotionResult[]): number {
        if (emotions.length === 0) return 60; // 默认中等自信度

        const positiveEmotions = ['happiness', 'neutral', 'surprise'];
        const negativeEmotions = ['fear', 'sadness', 'anger'];

        let positiveScore = 0;
        let negativeScore = 0;

        emotions.forEach(emotion => {
            if (positiveEmotions.includes(emotion.type)) {
                positiveScore += emotion.confidence;
            } else if (negativeEmotions.includes(emotion.type)) {
                negativeScore += emotion.confidence;
            }
        });

        const total = positiveScore + negativeScore;
        if (total === 0) return 60;

        // 归一化到0-100
        const confidence = (positiveScore / total) * 100;
        return Math.round(confidence);
    }

    /**
     * 获取主导情绪
     */
    private getDominantEmotion(emotions: EmotionResult[]): string {
        if (emotions.length === 0) return 'neutral';

        // 统计各种情绪的总置信度
        const emotionStats: Record<string, number> = {};
        emotions.forEach(emotion => {
            emotionStats[emotion.type] = (emotionStats[emotion.type] || 0) + emotion.confidence;
        });

        // 找出置信度最高的情绪
        let maxType = 'neutral';
        let maxScore = 0;
        Object.entries(emotionStats).forEach(([type, score]) => {
            if (score > maxScore) {
                maxType = type;
                maxScore = score;
            }
        });

        return maxType;
    }

    /**
     * 计算情绪稳定性
     * 情绪分布越集中，稳定性越高
     */
    private calculateEmotionStability(emotions: EmotionResult[]): number {
        if (emotions.length === 0) return 70;

        const emotionStats: Record<string, number> = {};
        emotions.forEach(emotion => {
            emotionStats[emotion.type] = (emotionStats[emotion.type] || 0) + 1;
        });

        const types = Object.keys(emotionStats);
        if (types.length === 1) return 100; // 完全一致，非常稳定

        // 计算熵（信息熵越低，越稳定）
        const total = emotions.length;
        let entropy = 0;
        Object.values(emotionStats).forEach(count => {
            const p = count / total;
            entropy -= p * Math.log2(p);
        });

        // 归一化：熵最大值约为log2(7)=2.8（假设最多7种情绪）
        const maxEntropy = Math.log2(7);
        const stability = ((maxEntropy - entropy) / maxEntropy) * 100;
        return Math.round(Math.max(0, Math.min(100, stability)));
    }

    /**
     * 微表情分析
     * 基于多帧人脸属性识别紧张、焦虑、自信等微表情信号
     */
    private analyzeMicroExpressions(frameResults: FrameAnalysis[]): { score: number; tags: string[] } {
        if (frameResults.length === 0) {
            return { score: 60, tags: [] };
        }

        const tags: string[] = [];
        let totalScore = 0;
        let validFrames = 0;

        for (const frame of frameResults) {
            const { eyeOpen, pose, gaze, emotions } = frame;
            let frameScore = 50;

            // 眨眼频率（眼开度变化）
            if (eyeOpen !== null) {
                if (eyeOpen < 30) {
                    frameScore -= 10;
                    tags.push('频繁眨眼');
                } else if (eyeOpen > 70) {
                    frameScore += 5;
                }
            }

            // 表情情绪
            const dominantEmotion = emotions.sort((a, b) => b.confidence - a.confidence)[0];
            if (dominantEmotion) {
                if (dominantEmotion.type === 'happiness') {
                    frameScore += 10;
                    tags.push('微笑');
                } else if (['fear', 'sadness', 'anger'].includes(dominantEmotion.type)) {
                    frameScore -= 15;
                    tags.push('负面情绪');
                }
            }

            // 头部姿态稳定性
            if (pose) {
                const poseDeviation = Math.abs(pose.pitch) + Math.abs(pose.yaw) + Math.abs(pose.roll);
                if (poseDeviation > 30) {
                    frameScore -= 5;
                    tags.push('头部晃动');
                } else if (poseDeviation < 10) {
                    frameScore += 5;
                    tags.push('姿态稳定');
                }
            }

            // 视线专注度
            if (gaze) {
                const gazeDeviation = Math.abs(gaze.pitch) + Math.abs(gaze.yaw);
                if (gazeDeviation > 20) {
                    frameScore -= 10;
                    tags.push('视线游离');
                } else if (gazeDeviation < 5) {
                    frameScore += 10;
                    tags.push('视线稳定');
                }
            }

            totalScore += this.clampScore(frameScore);
            validFrames++;
        }

        // 计算帧间表情变化率（波动越大越紧张）
        let emotionFluctuation = 0;
        for (let i = 1; i < frameResults.length; i++) {
            const prevDominant = frameResults[i-1].emotions.sort((a,b) => b.confidence - a.confidence)[0]?.type;
            const currDominant = frameResults[i].emotions.sort((a,b) => b.confidence - a.confidence)[0]?.type;
            if (prevDominant && currDominant && prevDominant !== currDominant) {
                emotionFluctuation += 1;
            }
        }

        const fluctuationPenalty = Math.min(20, emotionFluctuation * 3);
        const avgScore = validFrames > 0 ? totalScore / validFrames : 60;
        const finalScore = this.clampScore(avgScore - fluctuationPenalty);

        // 去重标签
        const uniqueTags = Array.from(new Set(tags));

        return { score: finalScore, tags: uniqueTags };
    }

    /**
     * 肢体语言分析
     * 基于头部姿态序列分析动作频率、倾斜角度等
     */
    private analyzeBodyLanguage(frameResults: FrameAnalysis[]): BodyLanguageDetails | null {
        const poseFrames = frameResults.map(f => f.pose).filter(Boolean) as FacePose[];
        if (poseFrames.length < 3) {
            return null;
        }

        // 计算头部晃动频率（标准差越大晃动越频繁）
        const pitchStd = this.calculateStdDev(poseFrames.map(p => p.pitch));
        const yawStd = this.calculateStdDev(poseFrames.map(p => p.yaw));
        const rollStd = this.calculateStdDev(poseFrames.map(p => p.roll));
        const headMovementFrequency = this.clampScore((pitchStd + yawStd + rollStd) * 2);

        // 计算身体倾斜角度（yaw均值绝对值）
        const avgYaw = Math.abs(poseFrames.reduce((sum, p) => sum + p.yaw, 0) / poseFrames.length);
        const bodyTiltAngle = Math.round(avgYaw);

        // 姿态自然度（与标准坐姿偏差越小越高）
        const avgDeviation = poseFrames.reduce((sum, p) => {
            return sum + Math.abs(p.pitch) + Math.abs(p.yaw) + Math.abs(p.roll);
        }, 0) / poseFrames.length;
        const postureNaturalness = this.clampScore(100 - avgDeviation * 1.2);

        // 小动作频率（基于姿态变化幅度）
        let totalChange = 0;
        for (let i = 1; i < poseFrames.length; i++) {
            const deltaPitch = Math.abs(poseFrames[i].pitch - poseFrames[i-1].pitch);
            const deltaYaw = Math.abs(poseFrames[i].yaw - poseFrames[i-1].yaw);
            const deltaRoll = Math.abs(poseFrames[i].roll - poseFrames[i-1].roll);
            totalChange += deltaPitch + deltaYaw + deltaRoll;
        }
        const avgChange = totalChange / (poseFrames.length - 1);
        const fidgetingScore = this.clampScore(avgChange * 3);

        return {
            headMovementFrequency,
            bodyTiltAngle,
            postureNaturalness,
            fidgetingScore
        };
    }

    /**
     * 构建情绪时间线
     */
    private buildEmotionTimeline(frameResults: FrameAnalysis[], microExpressionTags: string[]): EmotionTimelineEntry[] {
        return frameResults.map(frame => {
            const dominant = frame.emotions.sort((a, b) => b.confidence - a.confidence)[0];
            return {
                timeMs: frame.timeMs,
                dominantEmotion: dominant?.type || 'neutral',
                confidence: dominant?.confidence || 0.5,
                microExpressions: microExpressionTags
            };
        });
    }

    /**
     * 计算标准差
     */
    private calculateStdDev(values: number[]): number {
        if (values.length === 0) return 0;
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * 获取默认结果（服务未启用或分析失败时使用）
     */
    private getDefaultResult(): VideoAnalysisResult {
        return {
            emotions: [{ type: 'neutral', confidence: 1.0 }],
            overallConfidence: 60,
            dominantEmotion: 'neutral',
            emotionStability: 70,
            postureStability: 70,
            gazeFocus: 70,
            headPose: { pitch: 0, yaw: 0, roll: 0 },
            microExpressionScore: 60,
            bodyLanguageDetails: {
                headMovementFrequency: 30,
                bodyTiltAngle: 0,
                postureNaturalness: 70,
                fidgetingScore: 30
            },
            emotionTimeline: []
        };
    }

    /**
     * 检查服务是否可用
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

// 单例导出
export const aliyunVideoAIService = new AliyunVideoAIService();
export type { VideoAnalysisResult, EmotionResult };
