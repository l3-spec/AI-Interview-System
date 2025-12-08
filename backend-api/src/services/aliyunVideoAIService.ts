import Core from '@alicloud/pop-core';

/**
 * 情绪分析结果
 */
interface EmotionResult {
    type: string; // 情绪类型: neutral, happiness, surprise, sadness, anger, disgust, fear
    confidence: number; // 置信度 0-1
}

/**
 * 视频分析结果
 */
interface VideoAnalysisResult {
    emotions: EmotionResult[]; // 各帧的情绪分析
    overallConfidence: number; // 综合自信度 0-100
    dominantEmotion: string; // 主导情绪
    emotionStability: number; // 情绪稳定性 0-100
}

/**
 * 阿里云视频AI服务
 * 提供表情识别、视频内容分析等功能
 */
class AliyunVideoAIService {
    private client?: Core; // 可选属性，未配置时为undefined
    private enabled: boolean;

    constructor() {
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

        if (!accessKeyId || !accessKeySecret) {
            console.warn('[AliyunVideoAI] 未配置阿里云密钥，视频分析功能将被禁用');
            this.enabled = false;
            return;
        }

        this.enabled = true;
        this.client = new Core({
            accessKeyId,
            accessKeySecret,
            endpoint: 'https://facebody.cn-shanghai.aliyuncs.com',
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

            // 当前简化实现：仅分析视频封面或第一帧
            const emotions = await this.analyzeVideoFrames(videoUrl);

            const result = {
                emotions,
                overallConfidence: this.calculateOverallConfidence(emotions),
                dominantEmotion: this.getDominantEmotion(emotions),
                emotionStability: this.calculateEmotionStability(emotions)
            };

            console.log(`[AliyunVideoAI] 分析完成: 主导情绪=${result.dominantEmotion}, 自信度=${result.overallConfidence}`);
            return result;

        } catch (error) {
            console.error('[AliyunVideoAI] 视频分析失败:', error);
            return this.getDefaultResult();
        }
    }

    /**
     * 分析视频帧（提取关键帧并识别表情）
     * 简化实现：仅分析视频封面
     */
    private async analyzeVideoFrames(videoUrl: string): Promise<EmotionResult[]> {
        if (!this.client) {
            // 客户端未初始化，返回默认值
            return [{ type: 'neutral', confidence: 0.6 }];
        }

        try {
            // 将视频URL转换为封面图URL（假设OSS支持?x-oss-process=video/snapshot）
            const snapshotUrl = `${videoUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_0,h_0,m_fast`;

            const params = {
                RegionId: 'cn-shanghai',
                ImageURL: snapshotUrl
            };

            const response = await this.client.request('RecognizeExpression', params, {
                method: 'POST'
            });

            return this.parseEmotionResponse(response);

        } catch (error) {
            console.warn('[AliyunVideoAI] 帧分析失败，使用模拟数据:', error);
            // 返回模拟数据以便测试
            return [
                { type: 'neutral', confidence: 0.6 },
                { type: 'happiness', confidence: 0.3 }
            ];
        }
    }

    /**
     * 表情识别API（单张图片）
     */
    async recognizeExpression(imageUrl: string): Promise<EmotionResult[]> {
        if (!this.enabled || !this.client) {
            return [{ type: 'neutral', confidence: 1.0 }];
        }

        try {
            const params = {
                RegionId: 'cn-shanghai',
                ImageURL: imageUrl
            };

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
     * 获取默认结果（服务未启用或分析失败时使用）
     */
    private getDefaultResult(): VideoAnalysisResult {
        return {
            emotions: [{ type: 'neutral', confidence: 1.0 }],
            overallConfidence: 60,
            dominantEmotion: 'neutral',
            emotionStability: 70
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
