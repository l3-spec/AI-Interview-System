import { prisma } from '../lib/prisma';
import { deepseekService, type QuestionAnswerAnalysisResult } from './deepseekService';
import { qaEvaluationService, type QAEvaluationResult } from './qaEvaluationService';
import { aliyunVideoAIService, type VideoAnalysisResult } from './aliyunVideoAIService';
import { speechMetricsService, type SpeechMetricsSummary } from './speechMetricsService';
import {
    voiceprintAnalysisService,
    type VoiceprintAnalysisSummary,
    type VoiceprintQuestionResult
} from './voiceprintAnalysisService';
import { resolveVideoAccessUrl, resolveVideoUrl } from '../utils/videoUrlResolver';
import { logSystemAction } from '../utils/systemLog';

/**
 * AI面试分析服务
 * 负责使用DeepSeek LLM分析面试表现，生成6维度立体分析报告
 * 
 * 6维度：专业能力 / 学习成长 / 沟通协作 / 问题解决 / 成就执行 / 抗压韧性
 */

const EMPTY_ANSWER_PLACEHOLDER = '(未作答)';

// ========== 统一6维度定义 ==========
const NEW_DIMENSIONS = [
    { key: 'professionalAbilityScore' as const, label: '专业能力', desc: '候选人在专业领域的知识深度、技术熟练度、行业理解力' },
    { key: 'learningGrowthScore' as const, label: '学习成长', desc: '学习能力、成长潜力、知识迁移能力、自我反思意识' },
    { key: 'communicationCollaborationScore' as const, label: '沟通协作', desc: '表达能力、逻辑清晰度、团队合作意识、倾听与反馈' },
    { key: 'problemSolvingNewScore' as const, label: '问题解决', desc: '分析问题能力、解决思路清晰度、应变与创新能力' },
    { key: 'achievementExecutionScore' as const, label: '成就执行', desc: '目标导向、执行力、成果意识、时间管理能力' },
    { key: 'stressResilienceScore' as const, label: '抗压韧性', desc: '压力承受力、情绪稳定性、逆境应对能力、复原力' },
] as const;

type NewDimensionKey = typeof NEW_DIMENSIONS[number]['key'];

// ========== 维度详情 ==========
interface DimensionDetail {
    key: NewDimensionKey;
    name: string;
    score: number;        // 0-10
    level: string;         // '优秀' | '良好' | '一般' | '需提升'
    description: string;   // 150-200字客观描述
}

// ========== 6维度评分（0-10分制） ==========
interface NewDimensionScores {
    professionalAbilityScore: number;          // 1. 专业能力
    learningGrowthScore: number;               // 2. 学习成长
    communicationCollaborationScore: number;   // 3. 沟通协作
    problemSolvingNewScore: number;             // 4. 问题解决
    achievementExecutionScore: number;         // 5. 成就执行
    stressResilienceScore: number;             // 6. 抗压韧性
}

interface AnswerStats {
    total: number;
    missingBothCount: number;
    missingTextCount: number;
    missingVideoCount: number;
    answerCoverage: number;
}

interface MultimodalScores {
    expressionStability: number;    // 表情稳定性 0-10
    eyeContact: number;             // 眼神接触 0-10
    toneStability: number;          // 语气稳定性 0-10
    speechFluency: number;          // 语速流畅度 0-10
    hesitationCount: number;        // 卡顿次数
    overallMultimodalScore: number; // 综合多模态得分 0-10
}

interface ObjectiveSignals {
    answerCoverage?: number;
    speechQuality?: number | null;
    speechRate?: number | null;
    pauseRatio?: number | null;
    fillerRatio?: number | null;
    volumeStability?: number | null;
    videoConfidence?: number | null;
    emotionStability?: number | null;
    postureStability?: number | null;
    gazeFocus?: number | null;
    microExpressionScore?: number | null;
    fidgetingScore?: number | null;
    professionalAccuracyScore?: number | null;
}

interface AnalysisResult {
    overallScore: number;                          // 综合评分 0-100
    newDimensionScores: NewDimensionScores;        // 6维度评分 0-10
    competenciesDetailed: DimensionDetail[];       // 6维度详情（含描述）
    strengths: string[];
    improvements: string[];
    jobMatch?: {
        title: string;
        description: string;
        matchRatio: number;
    };
    tips: string;
    objectiveSignals?: ObjectiveSignals;
    speechMetrics?: SpeechMetricsSummary;
    videoConfidenceScore?: number;
    emotionStability?: number;
    emotionDistribution?: Record<string, number>;
    bodyLanguageScore?: number;
    postureStability?: number;
    gazeFocus?: number;
    videoAnalysisResults?: VideoAnalysisResult[];
    integrity?: IntegrityReport;
    voiceprint?: VoiceprintAnalysisSummary;
    // 逐题分析维度
    relevanceScore: number;
    completenessScore: number;
    professionalAccuracyScore: number;
    logicalCoherenceScore: number;
    questionAnalysisDetails?: Array<{
        questionIndex: number;
        questionText: string;
        relevanceScore: number;
        completenessScore: number;
        professionalAccuracyScore: number;
        logicalCoherenceScore: number;
        feedback: string;
    }>;
    // 多模态评分
    multimodalScores?: MultimodalScores;
    questionByQuestion?: Array<{
        questionIndex: number;
        question: string;
        answer: string;
        score: number;
    }>;
    contentMultimodalFusion?: Record<string, any>;
}

interface IntegrityCheck {
    key: string;
    label: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    required: boolean;
    message: string;
}

interface IntegrityQuestionStatus {
    questionIndex?: number;
    hasVideo: boolean;
    videoResolved: boolean;
    audioExtracted: boolean;
    asrCompleted: boolean;
    transcriptSource: string;
    frameAnalysisReady: boolean;
    voiceprintReady: boolean;
    issues: string[];
}

interface IntegrityReport {
    checks: IntegrityCheck[];
    summary: {
        totalQuestions: number;
        answeredVideoCount: number;
        resolvedVideoCount: number;
        audioExtractedCount: number;
        asrCompletedCount: number;
        frameAnalysisReadyCount: number;
        voiceprintReadyCount: number;
    };
    questions: IntegrityQuestionStatus[];
}

interface QuestionAnalysisInput {
    questionIndex: number;
    questionText: string;
    answerText?: string | null;
    answerVideoUrl?: string | null;
    answerVideoPath?: string | null;
    answerDuration?: number | null;
}

// 能力交叉验证结果接口
export interface CrossValidationResult {
    claimedSkills: string[];        // 简历中声明的技能
    demonstratedSkills: string[];   // 面试中展现的技能
    matchedSkills: string[];        // 匹配的技能
    missingSkills: string[];        // 声明但未展现的技能
    discoveredSkills: string[];     // 面试中发现的额外技能
    consistencyScore: number;       // 一致性评分 0-100
}

// 推荐函接口
export interface RecommendationLetter {
    summary: string;           // 简短总结（1-2句话）
    strengths: string[];       // 核心优势
    suitableRoles: string[];   // 适合岗位
    cautionPoints: string[];   // 风险提示
    overallRating: number;     // 综合评级 1-5星
}

interface PreparedAnswer {
    questionIndex: number;
    question: string;
    answer: string;
    rawAnswerText?: string;
    videoUrl?: string;
}

interface VideoAnalysisBundle {
    results: VideoAnalysisResult[];
    perQuestion: Map<number, VideoAnalysisResult>;
    resolvedVideoCount: number;
    analyzedCount: number;
    serviceEnabled: boolean;
    errorCount: number;
}

export class AnalysisService {
    private async logAnalysisEvent(params: {
        action: string;
        description: string;
        sessionId: string;
        result?: 'SUCCESS' | 'FAILED' | 'WARNING';
        errorMsg?: string | null;
    }) {
        await logSystemAction({
            action: params.action,
            module: 'INTERVIEW_ANALYSIS',
            description: params.description,
            targetId: params.sessionId,
            targetType: 'AI_INTERVIEW_SESSION',
            result: params.result || 'SUCCESS',
            errorMsg: params.errorMsg || null
        });
    }

    /**
     * 执行逐题精细化分析
     * @param sessionId 会话ID
     * @param questions 问题列表
     * @param jobContext 职位上下文
     */
    private async performDetailedQuestionAnalysis(
        sessionId: string,
        questions: QuestionAnalysisInput[],
        jobContext: { jobCategory?: string; jobRequirements?: string }
    ): Promise<{
        questionAnalysisDetails: AnalysisResult['questionAnalysisDetails'];
        avgRelevanceScore: number;
        avgCompletenessScore: number;
        avgProfessionalAccuracyScore: number;
        avgLogicalCoherenceScore: number;
    }> {
        const questionAnalysisDetails: AnalysisResult['questionAnalysisDetails'] = [];
        let totalRelevance = 0;
        let totalCompleteness = 0;
        let totalProfessional = 0;
        let totalLogical = 0;
        let validCount = 0;

        console.log(`[AnalysisService] 开始逐题分析，共${questions.length}道题`);

        for (const question of questions) {
            try {
                const answerText = question.answerText || '';
                let relevanceScore: number;
                let completenessScore: number;
                let professionalAccuracyScore: number;
                let logicalCoherenceScore: number;
                let feedback: string;

                // 优先使用深度问答评估服务
                const qaEvaluationResult = await qaEvaluationService.evaluate(
                    question.questionText,
                    answerText,
                    jobContext
                );

                if (qaEvaluationResult) {
                    // 使用新服务的结果
                    relevanceScore = qaEvaluationResult.relevanceScore;
                    completenessScore = qaEvaluationResult.completenessScore;
                    professionalAccuracyScore = qaEvaluationResult.professionalAccuracyScore;
                    logicalCoherenceScore = qaEvaluationResult.logicalCoherenceScore;
                    feedback = qaEvaluationResult.feedback;
                } else {
                    // 降级到原有DeepSeek评分
                    const analysisResult = await deepseekService.analyzeQuestionAnswerPair(
                        question.questionText,
                        answerText,
                        jobContext
                    );

                    // 计算基于关键词的相似度（原有逻辑）
                    const keywordSimilarity = this.calculateKeywordSimilarity(question.questionText, answerText);
                    // 将LLM评分和关键词相似度融合，权重各50%
                    relevanceScore = Math.round((analysisResult.relevanceScore * 0.5) + (keywordSimilarity * 0.5));
                    completenessScore = analysisResult.completenessScore;
                    professionalAccuracyScore = analysisResult.professionalAccuracyScore;
                    logicalCoherenceScore = analysisResult.logicalCoherenceScore;
                    feedback = analysisResult.feedback;
                }

                questionAnalysisDetails.push({
                    questionIndex: question.questionIndex,
                    questionText: question.questionText,
                    relevanceScore,
                    completenessScore,
                    professionalAccuracyScore,
                    logicalCoherenceScore,
                    feedback
                });

                totalRelevance += relevanceScore;
                totalCompleteness += completenessScore;
                totalProfessional += professionalAccuracyScore;
                totalLogical += logicalCoherenceScore;
                validCount++;
            } catch (error) {
                console.warn(`[AnalysisService] 问题${question.questionIndex}分析失败，跳过`, error);
                // 失败时添加默认结果
                questionAnalysisDetails.push({
                    questionIndex: question.questionIndex,
                    questionText: question.questionText,
                    relevanceScore: 0,
                    completenessScore: 0,
                    professionalAccuracyScore: 0,
                    logicalCoherenceScore: 0,
                    feedback: '分析失败，请重试'
                });
            }
        }

        // 计算平均分
        const avgRelevanceScore = validCount > 0 ? Math.round(totalRelevance / validCount) : 0;
        const avgCompletenessScore = validCount > 0 ? Math.round(totalCompleteness / validCount) : 0;
        const avgProfessionalAccuracyScore = validCount > 0 ? Math.round(totalProfessional / validCount) : 0;
        const avgLogicalCoherenceScore = validCount > 0 ? Math.round(totalLogical / validCount) : 0;

        console.log(`[AnalysisService] 逐题分析完成，平均分：相关性${avgRelevanceScore}，完整度${avgCompletenessScore}，专业度${avgProfessionalAccuracyScore}，逻辑${avgLogicalCoherenceScore}`);

        return {
            questionAnalysisDetails,
            avgRelevanceScore,
            avgCompletenessScore,
            avgProfessionalAccuracyScore,
            avgLogicalCoherenceScore
        };
    }

    /**
     * 计算问题和答案的关键词相似度（预留Embedding接口，临时实现）
     */
    private calculateKeywordSimilarity(question: string, answer: string): number {
        if (!answer || answer.trim().length === 0) return 0;

        // 提取问题中的关键词（去掉停用词）
        const stopWords = ['的', '了', '和', '是', '在', '我', '你', '有', '要', '会', '吗', '呢', '啊'];
        const questionWords = question.split(/\s+/).filter(word => word.length > 1 && !stopWords.includes(word));
        const answerWords = answer.split(/\s+/).filter(word => word.length > 1 && !stopWords.includes(word));

        if (questionWords.length === 0) return 100;

        // 计算匹配率
        const matchedWords = questionWords.filter(word => answerWords.some(aw => aw.includes(word) || word.includes(aw)));
        const matchRate = matchedWords.length / questionWords.length;

        return Math.round(matchRate * 100);
    }

    /**
     * 职位分类
     */
    private categorizeJob(jobTarget: string): string {
        const techKeywords = ['开发', '程序员', '工程师', '技术', 'java', 'python', 'javascript', 'php', '前端', '后端', '全栈'];
        const managementKeywords = ['经理', '主管', '总监', '领导', '管理'];
        const salesKeywords = ['销售', '业务', '客户', '市场'];
        const designKeywords = ['设计', 'UI', 'UX', '美工', '视觉'];
        const hrKeywords = ['人事', 'HR', '招聘', '行政'];

        const lowerJobTarget = jobTarget.toLowerCase();

        if (techKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
            return '技术类';
        } else if (managementKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
            return '管理类';
        } else if (salesKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
            return '销售类';
        } else if (designKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
            return '设计类';
        } else if (hrKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
            return 'HR类';
        }

        return '通用类';
    }

    /**
     * 归一化语速：正常语速(180-220字/分钟)得100分，过快或过慢递减
     */
    private normalizeSpeechRate(speechRate: number): number {
        const optimalMin = 180;
        const optimalMax = 220;
        if (speechRate >= optimalMin && speechRate <= optimalMax) {
            return 100;
        } else if (speechRate < optimalMin) {
            return Math.max(0, Math.round(100 - (optimalMin - speechRate) * 0.5));
        } else {
            return Math.max(0, Math.round(100 - (speechRate - optimalMax) * 0.5));
        }
    }

    /**
     * 归一化停顿率：正常停顿率(5%-15%)得100分，过高或过低递减
     */
    private normalizePauseRatio(pauseRatio: number): number {
        const optimalMin = 0.05;
        const optimalMax = 0.15;
        if (pauseRatio >= optimalMin && pauseRatio <= optimalMax) {
            return 100;
        } else if (pauseRatio < optimalMin) {
            return Math.max(0, Math.round(100 - (optimalMin - pauseRatio) * 1000));
        } else {
            return Math.max(0, Math.round(100 - (pauseRatio - optimalMax) * 500));
        }
    }

    /**
     * 分析面试会话
     * 主要入口函数，协调整个分析流程
     */
    async analyzeInterviewSession(sessionId: string): Promise<void> {
        try {
            console.log(`[AnalysisService] 开始分析面试会话: ${sessionId}`);

            // 1. 获取面试会话详情
            const session = await prisma.aIInterviewSession.findUnique({
                where: { id: sessionId },
                include: {
                    questions: {
                        orderBy: { questionIndex: 'asc' }
                    },
                    user: {
                        select: {
                            name: true,
                            experience: true,
                            skills: true
                        }
                    }
                }
            });

            if (!session) {
                throw new Error(`面试会话不存在: ${sessionId}`);
            }

            if (session.status !== 'COMPLETED') {
                throw new Error(`面试会话未完成，无法分析: ${session.status}`);
            }

            const questions = (session.questions || []) as QuestionAnalysisInput[];

            // 统计缺失答案情况（不阻止分析）
            const missingBoth = questions.filter(
                (q) => !q.answerVideoUrl && !q.answerVideoPath && (!q.answerText || q.answerText.trim().length === 0)
            );
            const missingVideos = questions.filter((q) => !q.answerVideoUrl && !q.answerVideoPath);
            const missingText = questions.filter((q) => !q.answerText || q.answerText.trim().length === 0);
            const answerStats: AnswerStats = {
                total: questions.length,
                missingBothCount: missingBoth.length,
                missingTextCount: missingText.length,
                missingVideoCount: missingVideos.length,
                answerCoverage: questions.length > 0
                    ? Number(((questions.length - missingBoth.length) / questions.length).toFixed(2))
                    : 0
            };

            if (missingVideos.length > 0) {
                console.log(`[AnalysisService] 注意: 以下问题缺少视频: [${missingVideos.map(q => q.questionIndex).join(', ')}]`);
            }
            if (missingText.length > 0) {
                console.log(`[AnalysisService] 注意: 以下问题缺少文本答案: [${missingText.map(q => q.questionIndex).join(', ')}]`);
            }
            if (missingBoth.length > 0) {
                console.log(`[AnalysisService] 注意: 以下问题视频和文本均为空: [${missingBoth.map(q => q.questionIndex).join(', ')}]`);
                await this.logAnalysisEvent({
                    action: 'ANALYSIS_MISSING_ANSWERS',
                    description: `存在未作答题目: [${missingBoth.map(q => q.questionIndex).join(', ')}]`,
                    sessionId,
                    result: 'WARNING'
                });
            }

            // 执行逐题精细化分析
            const jobCategory = this.categorizeJob(session.jobTarget || '');
            const detailedAnalysisResult = await this.performDetailedQuestionAnalysis(
                sessionId,
                questions,
                {
                    jobCategory,
                    jobRequirements: (session as any).jobRequirements || ''
                }
            );

            // 2. 检查是否已有分析报告
            const existingReport = await prisma.aIInterviewAnalysisReport.findUnique({
                where: { sessionId }
            });

            if (existingReport && existingReport.analysisStatus !== 'FAILED') {
                console.log(`[AnalysisService] 分析报告已存在，跳过分析: ${sessionId}`);
                return;
            }

            if (existingReport && existingReport.analysisStatus === 'FAILED') {
                await this.logAnalysisEvent({
                    action: 'ANALYSIS_RETRY_RUN',
                    description: '检测到失败报告，开始重新分析',
                    sessionId,
                    result: 'WARNING'
                });
            }

            await this.logAnalysisEvent({
                action: 'ANALYSIS_PIPELINE_START',
                description: `开始分析流程，问题数: ${questions.length}`,
                sessionId
            });

            // 3. 执行语音指标分析（ASR、语速、停顿、音量稳定性）
            console.log('[AnalysisService] 开始语音指标分析...');
            let speechMetrics: SpeechMetricsSummary | undefined;
            try {
                speechMetrics = await speechMetricsService.analyzeQuestions(sessionId, questions);
            } catch (error) {
                console.warn('[AnalysisService] 语音指标分析失败，将使用文本结果', error);
                await this.logAnalysisEvent({
                    action: 'SPEECH_METRICS_FAILED',
                    description: '语音指标分析失败，已降级',
                    sessionId,
                    result: 'WARNING',
                    errorMsg: error instanceof Error ? error.message : '未知错误'
                });
            }

            this.ensurePipelineRequirements(sessionId, {
                questions,
                speechMetrics
            });

            const questionsAndAnswers = this.prepareQuestionsAndAnswers(sessionId, questions, speechMetrics);
            if (questionsAndAnswers.length === 0) {
                throw new Error('没有可分析的问题和答案');
            }

            // 4. 使用LLM执行文本分析
            const textAnalysisResult = await this.performLLMAnalysis({
                jobTarget: session.jobTarget,
                jobCategory: session.jobCategory,
                companyTarget: session.companyTarget,
                background: session.background,
                userInfo: session.user,
                questionsAndAnswers,
                answerStats
            });

            // 5. 执行视频分析（表情、情绪稳定性）
            console.log(`[AnalysisService] 开始视频分析...`);
            const videoAnalysis = await this.performVideoAnalysis(sessionId, questions);

            this.ensureVideoRequirements(sessionId, {
                questions,
                videoAnalysis
            });

            // 6. 执行声纹一致性分析
            console.log('[AnalysisService] 开始声纹一致性分析...');
            const voiceprint = await this.performVoiceprintAnalysis(sessionId, questions);
            this.ensureVoiceprintRequirements(sessionId, voiceprint);

            const integrity = this.buildIntegrityReport({
                questions,
                speechMetrics,
                videoAnalysis,
                voiceprint
            });

            // 7. 融合文本、语音与视频分析结果
            const combinedResult = this.combineAnalysisResults(
                textAnalysisResult,
                videoAnalysis.results,
                speechMetrics,
                questionsAndAnswers,
                answerStats,
                integrity,
                voiceprint
            );

            // 8. 保存综合分析报告
            await this.saveAnalysisReport(sessionId, combinedResult);

            console.log(`[AnalysisService] 分析成功: ${sessionId}`);
            await this.logAnalysisEvent({
                action: 'ANALYSIS_PIPELINE_COMPLETED',
                description: '分析流程已完成',
                sessionId
            });

        } catch (error) {
            console.error(`[AnalysisService] 分析失败: ${sessionId}`, error);
            await this.logAnalysisEvent({
                action: 'ANALYSIS_PIPELINE_FAILED',
                description: '分析流程失败',
                sessionId,
                result: 'FAILED',
                errorMsg: error instanceof Error ? error.message : '未知错误'
            });

            // 保存错误状态的报告
            await prisma.aIInterviewAnalysisReport.upsert({
                where: { sessionId },
                update: {
                    analysisStatus: 'FAILED',
                    analysisError: error instanceof Error ? error.message : '未知错误'
                },
                create: {
                    sessionId,
                    overallScore: 0,
                    communicationScore: 0,
                    technicalScore: 0,
                    problemSolvingNewScore: 0,
                    achievementExecutionScore: 0,
                    stressResilienceScore: 0,
                    learningGrowthScore: 0,
                    communicationCollaborationScore: 0,
                    analysisStatus: 'FAILED',
                    analysisError: error instanceof Error ? error.message : '未知错误'
                } as any
            });

            throw error;
        }
    }

    /**
     * 执行视频分析
     */
    private getPipelineRequirements() {
        return {
            requireAsr: process.env.ANALYSIS_REQUIRE_ASR === 'true',
            requireVideoAI: process.env.ANALYSIS_REQUIRE_VIDEO_AI === 'true',
            requireVoiceprint: process.env.ANALYSIS_REQUIRE_VOICEPRINT === 'true'
        };
    }

    private prepareQuestionsAndAnswers(
        sessionId: string,
        questions: QuestionAnalysisInput[],
        speechMetrics?: SpeechMetricsSummary
    ): PreparedAnswer[] {
        const transcriptByQuestion = new Map<number, string>();
        speechMetrics?.samples?.forEach(sample => {
            if (typeof sample.questionIndex === 'number' && sample.transcript?.trim()) {
                transcriptByQuestion.set(sample.questionIndex, sample.transcript.trim());
            }
        });

        return questions.map((question) => {
            const answerText = question.answerText?.trim();
            const transcript = transcriptByQuestion.get(question.questionIndex);
            return {
                questionIndex: question.questionIndex,
                question: question.questionText,
                rawAnswerText: answerText || undefined,
                answer: answerText || transcript || EMPTY_ANSWER_PLACEHOLDER,
                videoUrl: resolveVideoUrl({
                    sessionId,
                    answerVideoUrl: question.answerVideoUrl,
                    answerVideoPath: question.answerVideoPath,
                    questionIndex: question.questionIndex
                }) || undefined
            };
        });
    }

    private ensurePipelineRequirements(
        sessionId: string,
        params: {
            questions: QuestionAnalysisInput[];
            speechMetrics?: SpeechMetricsSummary;
        }
    ) {
        const requirements = this.getPipelineRequirements();
        const videoAnswerCount = params.questions.filter(q => q.answerVideoUrl || q.answerVideoPath).length;
        if (!requirements.requireAsr || videoAnswerCount === 0) {
            return;
        }

        if (!speechMetricsService.isAsrEnabled()) {
            throw new Error(`[${sessionId}] 当前要求 ASR 为硬依赖，但阿里云 ASR 未配置`);
        }

        if (!params.speechMetrics) {
            throw new Error(`[${sessionId}] 当前要求 ASR 为硬依赖，但语音指标结果缺失`);
        }

        if (params.speechMetrics.asrAttemptCount === 0) {
            throw new Error(`[${sessionId}] 当前要求 ASR 为硬依赖，但没有任何视频样本成功进入 ASR 链路`);
        }
    }

    private ensureVideoRequirements(
        sessionId: string,
        params: {
            questions: QuestionAnalysisInput[];
            videoAnalysis: VideoAnalysisBundle;
        }
    ) {
        const requirements = this.getPipelineRequirements();
        const videoAnswerCount = params.questions.filter(q => q.answerVideoUrl || q.answerVideoPath).length;
        if (!requirements.requireVideoAI || videoAnswerCount === 0) {
            return;
        }

        if (!params.videoAnalysis.serviceEnabled) {
            throw new Error(`[${sessionId}] 当前要求视频分析为硬依赖，但阿里云视频分析未启用`);
        }

        if (params.videoAnalysis.analyzedCount === 0 && params.videoAnalysis.resolvedVideoCount > 0) {
            throw new Error(`[${sessionId}] 当前要求视频分析为硬依赖，但没有任何视频完成帧分析`);
        }
    }

    private ensureVoiceprintRequirements(sessionId: string, voiceprint: VoiceprintAnalysisSummary) {
        const requirements = this.getPipelineRequirements();
        if (!requirements.requireVoiceprint) {
            return;
        }

        if (!voiceprint.enabled) {
            throw new Error(`[${sessionId}] 当前要求声纹分析为硬依赖，但声纹服务已禁用`);
        }

        if (voiceprint.status === 'DISABLED') {
            throw new Error(`[${sessionId}] 当前要求声纹分析为硬依赖，但声纹服务不可用`);
        }
    }

    private async performVideoAnalysis(
        sessionId: string,
        questions: Array<{ questionIndex?: number; answerVideoUrl?: string | null; answerVideoPath?: string | null }>
    ): Promise<VideoAnalysisBundle> {
        if (!aliyunVideoAIService.isEnabled()) {
            console.log('[AnalysisService] 阿里云视频分析未启用，跳过视频分析');
            await this.logAnalysisEvent({
                action: 'VIDEO_ANALYSIS_SKIPPED',
                description: '阿里云视频分析未启用，已跳过',
                sessionId,
                result: 'WARNING'
            });
            return {
                results: [],
                perQuestion: new Map(),
                resolvedVideoCount: 0,
                analyzedCount: 0,
                serviceEnabled: false,
                errorCount: 0
            };
        }

        const results: VideoAnalysisResult[] = [];
        const perQuestion = new Map<number, VideoAnalysisResult>();
        let errorCount = 0;
        let resolvedVideoCount = 0;

        for (const question of questions) {
            const videoUrl = await resolveVideoAccessUrl({
                sessionId,
                answerVideoUrl: question.answerVideoUrl,
                answerVideoPath: question.answerVideoPath,
                questionIndex: question.questionIndex
            });
            if (videoUrl) {
                resolvedVideoCount += 1;
                try {
                    const result = await aliyunVideoAIService.analyzeAnswerVideo(
                        videoUrl
                    );
                    const enrichedResult = {
                        ...result,
                        questionIndex: question.questionIndex
                    } as VideoAnalysisResult;
                    results.push(enrichedResult);
                    if (typeof question.questionIndex === 'number') {
                        perQuestion.set(question.questionIndex, enrichedResult);
                    }
                } catch (error) {
                    console.error('[AnalysisService] 单个视频分析失败:', error);
                    errorCount += 1;
                    // 继续处理其他视频
                }
            }
        }

        if (errorCount > 0) {
            await this.logAnalysisEvent({
                action: 'VIDEO_ANALYSIS_PARTIAL_FAILED',
                description: `视频分析存在失败帧/片段，失败数: ${errorCount}`,
                sessionId,
                result: 'WARNING'
            });
        }

        return {
            results,
            perQuestion,
            resolvedVideoCount,
            analyzedCount: results.length,
            serviceEnabled: true,
            errorCount
        };
    }

    private async performVoiceprintAnalysis(
        sessionId: string,
        questions: QuestionAnalysisInput[]
    ): Promise<VoiceprintAnalysisSummary> {
        return voiceprintAnalysisService.analyzeQuestions(
            sessionId,
            questions
                .filter(question => question.answerVideoUrl || question.answerVideoPath)
                .map(question => ({
                    questionIndex: question.questionIndex,
                    answerVideoPath: question.answerVideoPath,
                    answerVideoUrl: question.answerVideoUrl
                }))
        );
    }

    private buildIntegrityReport(params: {
        questions: QuestionAnalysisInput[];
        speechMetrics?: SpeechMetricsSummary;
        videoAnalysis: VideoAnalysisBundle;
        voiceprint: VoiceprintAnalysisSummary;
    }): IntegrityReport {
        const speechByQuestion = new Map<number, SpeechMetricsSummary['samples'][number]>();
        params.speechMetrics?.samples?.forEach(sample => {
            if (typeof sample.questionIndex === 'number') {
                speechByQuestion.set(sample.questionIndex, sample);
            }
        });
        const voiceprintByQuestion = new Map<number, VoiceprintQuestionResult>();
        params.voiceprint.questions.forEach(question => {
            if (typeof question.questionIndex === 'number') {
                voiceprintByQuestion.set(question.questionIndex, question);
            }
        });

        const questionStatuses = params.questions.map(question => {
            const speech = speechByQuestion.get(question.questionIndex);
            const voiceprint = voiceprintByQuestion.get(question.questionIndex);
            const hasVideo = Boolean(question.answerVideoUrl || question.answerVideoPath);
            const frameAnalysisReady = params.videoAnalysis.perQuestion.has(question.questionIndex);
            const issues = [
                ...(speech?.issues || []),
                ...(voiceprint?.issue ? [voiceprint.issue] : []),
            ];

            return {
                questionIndex: question.questionIndex,
                hasVideo,
                videoResolved: Boolean(speech?.videoResolved),
                audioExtracted: Boolean(speech?.audioExtracted),
                asrCompleted: Boolean(speech?.asrCompleted),
                transcriptSource: speech?.transcriptSource || 'empty',
                frameAnalysisReady,
                voiceprintReady: Boolean(voiceprint?.analyzed),
                issues,
            };
        });

        const summary = {
            totalQuestions: params.questions.length,
            answeredVideoCount: questionStatuses.filter(item => item.hasVideo).length,
            resolvedVideoCount: questionStatuses.filter(item => item.videoResolved).length,
            audioExtractedCount: questionStatuses.filter(item => item.audioExtracted).length,
            asrCompletedCount: questionStatuses.filter(item => item.asrCompleted).length,
            frameAnalysisReadyCount: questionStatuses.filter(item => item.frameAnalysisReady).length,
            voiceprintReadyCount: questionStatuses.filter(item => item.voiceprintReady).length,
        };

        const requirements = this.getPipelineRequirements();
        const checks: IntegrityCheck[] = [
            {
                key: 'video_input',
                label: '视频输入完整',
                required: true,
                status: summary.answeredVideoCount > 0 ? 'PASS' : 'FAIL',
                message: summary.answeredVideoCount > 0
                    ? `共收到 ${summary.answeredVideoCount} 段答题视频`
                    : '未检测到可分析的视频答案'
            },
            {
                key: 'audio_extraction',
                label: '音频抽取链路',
                required: true,
                status: summary.audioExtractedCount === summary.answeredVideoCount
                    ? 'PASS'
                    : summary.audioExtractedCount > 0 ? 'WARN' : 'FAIL',
                message: `成功抽取 ${summary.audioExtractedCount}/${summary.answeredVideoCount} 段视频音频`
            },
            {
                key: 'asr_pipeline',
                label: 'ASR 转写链路',
                required: requirements.requireAsr,
                status: !summary.answeredVideoCount
                    ? 'WARN'
                    : params.speechMetrics?.asrAttemptCount
                        ? 'PASS'
                        : speechMetricsService.isAsrEnabled() ? 'WARN' : 'FAIL',
                message: speechMetricsService.isAsrEnabled()
                    ? `ASR 已执行 ${params.speechMetrics?.asrAttemptCount || 0} 次，成功完成 ${params.speechMetrics?.asrCompletedCount || 0} 次`
                    : '阿里云 ASR 当前未启用'
            },
            {
                key: 'video_ai',
                label: '关键帧/表情分析',
                required: requirements.requireVideoAI,
                status: !summary.answeredVideoCount
                    ? 'WARN'
                    : summary.frameAnalysisReadyCount === summary.answeredVideoCount
                        ? 'PASS'
                        : summary.frameAnalysisReadyCount > 0 ? 'WARN' : 'FAIL',
                message: params.videoAnalysis.serviceEnabled
                    ? `完成 ${summary.frameAnalysisReadyCount}/${summary.answeredVideoCount} 段视频的关键帧分析`
                    : '阿里云视频分析未启用'
            },
            {
                key: 'voiceprint',
                label: '声纹一致性',
                required: requirements.requireVoiceprint,
                status: params.voiceprint.status === 'CONSISTENT'
                    ? 'PASS'
                    : params.voiceprint.status === 'INCONSISTENT'
                        ? 'WARN'
                        : params.voiceprint.status === 'INSUFFICIENT'
                            ? 'WARN'
                            : 'FAIL',
                message: params.voiceprint.status === 'DISABLED'
                    ? '声纹分析未启用'
                    : `声纹状态 ${params.voiceprint.status}，可用样本 ${params.voiceprint.analyzedSampleCount}`
            }
        ];

        return {
            checks,
            summary,
            questions: questionStatuses
        };
    }

    /**
     * 融合文本和视频分析结果
     */
    private combineAnalysisResults(
        textAnalysis: AnalysisResult,
        videoAnalysisResults: VideoAnalysisResult[],
        speechMetrics: SpeechMetricsSummary | undefined,
        questionsAndAnswers: Array<{ question: string; answer: string }>,
        answerStats?: AnswerStats,
        integrity?: IntegrityReport,
        voiceprint?: VoiceprintAnalysisSummary
    ): AnalysisResult {
        const videoSummary = this.summarizeVideoAnalysis(videoAnalysisResults);

        // 计算多模态得分
        const multimodalScores = this.calculateMultimodalScores(videoSummary, speechMetrics);

        // 微调6维度得分：融合语音质量信号
        const adjustedDimensions = this.adjustDimensionsWithSpeech(
            textAnalysis.newDimensionScores,
            speechMetrics,
            multimodalScores
        );

        // 答题覆盖率惩罚
        const coverage = answerStats?.answerCoverage ?? 1;
        const adjustedOverall = Math.round(
            textAnalysis.overallScore * (0.7 + coverage * 0.3)
        );

        // 构建逐题评分
        const questionByQuestion = questionsAndAnswers.map((qa, idx) => ({
            questionIndex: idx + 1,
            question: qa.question,
            answer: qa.answer,
            score: adjustedOverall
        }));

        const bodyLanguageScore = this.calculateBodyLanguageScore(videoSummary);

        // 构建客观信号
        const objectiveSignals: ObjectiveSignals = {
            answerCoverage: coverage,
            speechQuality: speechMetrics?.speechQuality ?? null,
            speechRate: speechMetrics?.avgSpeechRate ?? null,
            pauseRatio: speechMetrics?.avgPauseRatio ?? null,
            fillerRatio: speechMetrics?.avgFillerRatio ?? null,
            volumeStability: speechMetrics?.avgVolumeStability ?? null,
            videoConfidence: videoSummary?.avgConfidence,
            emotionStability: videoSummary?.avgStability,
            postureStability: videoSummary?.avgPostureStability,
            gazeFocus: videoSummary?.avgGazeFocus
        };

        return {
            ...textAnalysis,
            overallScore: adjustedOverall,
            newDimensionScores: adjustedDimensions,
            objectiveSignals,
            speechMetrics,
            videoConfidenceScore: videoSummary?.avgConfidence,
            emotionStability: videoSummary?.avgStability,
            emotionDistribution: videoSummary?.emotionDistribution,
            bodyLanguageScore,
            postureStability: videoSummary?.avgPostureStability,
            gazeFocus: videoSummary?.avgGazeFocus,
            videoAnalysisResults,
            integrity,
            voiceprint,
            multimodalScores,
            questionByQuestion,
            contentMultimodalFusion: {
                newDimensionScores: adjustedDimensions,
                multimodalScores,
                coverage
            }
        };
    }

    /**
     * 基于语音质量信号微调6维度得分
     */
    private adjustDimensionsWithSpeech(
        scores: NewDimensionScores,
        speechMetrics?: SpeechMetricsSummary,
        multimodalScores?: MultimodalScores
    ): NewDimensionScores {
        if (!speechMetrics) return scores;

        const speechQuality = speechMetrics.speechQuality ?? 70;
        const fluencyBonus = ((speechQuality - 50) / 100) * 1.0; // ±0.5 调整

        const adjust = (base: number, weight: number) =>
            Number(Math.max(0, Math.min(10, base + fluencyBonus * weight)).toFixed(1));

        return {
            professionalAbilityScore: adjust(scores.professionalAbilityScore, 0.3),
            learningGrowthScore: adjust(scores.learningGrowthScore, 0.3),
            communicationCollaborationScore: adjust(scores.communicationCollaborationScore, 0.6),
            problemSolvingNewScore: adjust(scores.problemSolvingNewScore, 0.2),
            achievementExecutionScore: adjust(scores.achievementExecutionScore, 0.3),
            stressResilienceScore: adjust(scores.stressResilienceScore, 0.5),
        };
    }

    private summarizeVideoAnalysis(videoAnalysisResults: VideoAnalysisResult[]) {
        if (!videoAnalysisResults.length) {
            return null;
        }

        const avgConfidence = videoAnalysisResults.reduce(
            (sum, v) => sum + v.overallConfidence, 0
        ) / videoAnalysisResults.length;

        const avgStability = videoAnalysisResults.reduce(
            (sum, v) => sum + v.emotionStability, 0
        ) / videoAnalysisResults.length;

        const postureSamples = videoAnalysisResults
            .map(v => v.postureStability)
            .filter(value => typeof value === 'number') as number[];
        const gazeSamples = videoAnalysisResults
            .map(v => v.gazeFocus)
            .filter(value => typeof value === 'number') as number[];
        const microExpressionSamples = videoAnalysisResults
            .map(v => v.microExpressionScore)
            .filter(value => typeof value === 'number') as number[];
        const fidgetingSamples = videoAnalysisResults
            .map(v => v.bodyLanguageDetails?.fidgetingScore)
            .filter(value => typeof value === 'number') as number[];

        const avgPostureStability = postureSamples.length
            ? postureSamples.reduce((sum, v) => sum + v, 0) / postureSamples.length
            : undefined;
        const avgGazeFocus = gazeSamples.length
            ? gazeSamples.reduce((sum, v) => sum + v, 0) / gazeSamples.length
            : undefined;
        const avgMicroExpressionScore = microExpressionSamples.length
            ? microExpressionSamples.reduce((sum, v) => sum + v, 0) / microExpressionSamples.length
            : undefined;
        const avgFidgetingScore = fidgetingSamples.length
            ? fidgetingSamples.reduce((sum, v) => sum + v, 0) / fidgetingSamples.length
            : undefined;

        const emotionCounts: Record<string, number> = {};
        videoAnalysisResults.forEach(v => {
            emotionCounts[v.dominantEmotion] = (emotionCounts[v.dominantEmotion] || 0) + 1;
        });

        const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        console.log(`[AnalysisService] 视频分析结果: 平均自信度=${avgConfidence}, 情绪稳定性=${avgStability}, 姿态稳定=${avgPostureStability ?? 'N/A'}, 视线专注=${avgGazeFocus ?? 'N/A'}, 微表情得分=${avgMicroExpressionScore ?? 'N/A'}`);

        return {
            avgConfidence,
            avgStability,
            dominantEmotion: dominantEmotion || 'neutral',
            emotionDistribution: emotionCounts,
            avgPostureStability,
            avgGazeFocus,
            avgMicroExpressionScore,
            avgFidgetingScore
        };
    }

    /**
     * 计算多模态综合评分
     * 公式：综合分 = (表情稳定性 + 眼神接触 + 语气稳定性 + 语速流畅度) / 4 - (卡顿次数 * 0.2)
     */
    private calculateMultimodalScores(
        videoSummary: {
            avgConfidence: number;
            avgStability: number;
            avgPostureStability?: number;
            avgGazeFocus?: number;
            avgMicroExpressionScore?: number;
            avgFidgetingScore?: number;
        } | null,
        speechMetrics: SpeechMetricsSummary | undefined
    ): MultimodalScores {
        // 归一化各项指标到0-10分
        const expressionStability = this.normalizeTo10Scale(videoSummary?.avgStability ?? 60);
        const eyeContact = this.normalizeTo10Scale(videoSummary?.avgGazeFocus ?? 60);
        const toneStability = this.normalizeTo10Scale(speechMetrics?.avgVolumeStability ?? 60);
        const speechFluency = this.normalizeTo10Scale(
            speechMetrics && speechMetrics.avgFillerRatio !== null && speechMetrics.avgFillerRatio !== undefined
                ? (100 - Math.min(speechMetrics.avgFillerRatio * 10, 100))
                : 60
        );
        const hesitationCount = speechMetrics?.samples?.length ?? 0;

        // 计算综合多模态得分
        let overallMultimodalScore = Number((
            (expressionStability + eyeContact + toneStability + speechFluency) / 4 
            - (hesitationCount * 0.2)
        ).toFixed(1));

        // 确保得分在0-10之间
        overallMultimodalScore = Math.max(0, Math.min(10, overallMultimodalScore));

        return {
            expressionStability,
            eyeContact,
            toneStability,
            speechFluency,
            hesitationCount,
            overallMultimodalScore
        };
    }

    /**
     * 计算肢体语言评分
     */
    private calculateBodyLanguageScore(videoSummary: {
        avgConfidence: number;
        avgStability: number;
        avgPostureStability?: number;
        avgGazeFocus?: number;
        avgMicroExpressionScore?: number;
        avgFidgetingScore?: number;
    } | null): number | undefined {
        if (!videoSummary) return undefined;
        return Math.round(
            (videoSummary.avgConfidence * 0.3) +
            (videoSummary.avgStability * 0.3) +
            ((videoSummary.avgPostureStability ?? 60) * 0.25) +
            ((videoSummary.avgGazeFocus ?? 60) * 0.15)
        );
    }

    private clampScore(score: number): number {
        if (!Number.isFinite(score)) {
            return 0;
        }
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 归一化0-100分值到0-10
     */
    private normalizeTo10Scale(score: number | null | undefined): number {
        if (score === null || score === undefined || !Number.isFinite(score)) {
            return 6.0;
        }
        return Number((Math.max(0, Math.min(100, score)) / 10).toFixed(1));
    }

    /**
     * 使用LLM执行分析
     */
    private async performLLMAnalysis(params: {
        jobTarget: string;
        jobCategory?: string | null;
        companyTarget?: string | null;
        background?: string | null;
        userInfo?: {
            name?: string | null;
            experience?: string | null;
            skills?: string | null;
        };
        questionsAndAnswers: Array<{ question: string; answer: string; videoUrl?: string }>;
        answerStats?: AnswerStats;
    }): Promise<AnalysisResult> {

        const prompt = this.buildAnalysisPrompt(params);

        try {
            // 调用DeepSeek API进行综合分析
            const response = await deepseekService['callDeepseekAPI'](prompt);
            const content = response.choices[0]?.message?.content || '';

            // 解析LLM返回的分析结果
            const parsed = this.parseAnalysisResponse(content, params.jobTarget);
            return parsed;

        } catch (error) {
            console.warn('[AnalysisService] LLM分析失败，等待任务重试', error);
            throw error;
        }
    }

    /**
     * 构建分析提示词
     */
    private buildAnalysisPrompt(params: {
        jobTarget: string;
        jobCategory?: string | null;
        companyTarget?: string | null;
        background?: string | null;
        userInfo?: any;
        questionsAndAnswers: Array<{ question: string; answer: string; videoUrl?: string }>;
        answerStats?: AnswerStats;
    }): string {
        const { jobTarget, jobCategory, companyTarget, background, questionsAndAnswers, answerStats } = params;

        const qaText = questionsAndAnswers
            .map((qa: { question: string; answer: string; videoUrl?: string }, idx: number) => {
                const videoLine = qa.videoUrl ? `视频${idx + 1}：${qa.videoUrl}` : `视频${idx + 1}：未提供`;
                return `问题${idx + 1}：${qa.question}\n回答${idx + 1}：${qa.answer}\n${videoLine}`;
            })
            .join('\n\n');

        const answerStatsText = answerStats
            ? `【答题情况】
总题数：${answerStats.total}
未作答（视频+文本均为空）：${answerStats.missingBothCount}
仅缺视频：${answerStats.missingVideoCount}
仅缺文本：${answerStats.missingTextCount}
有效作答覆盖率：${Math.round(answerStats.answerCoverage * 100)}%`
            : '';

        return `你是一位资深的职业素养评估专家，请基于以下面试内容进行6维度立体分析。

【候选人信息】
目标职位：${jobTarget}
${jobCategory ? `职位类别：${jobCategory}` : ''}
${companyTarget ? `目标公司：${companyTarget}` : ''}
${background ? `个人背景：${background}` : ''}

${answerStatsText ? `${answerStatsText}\n` : ''}
【面试问答】
${qaText}

请从以下6个维度对候选人进行评估，每个维度给出0-10的分数（精确到小数点后1位），并提供150-200字的客观描述：

1. **专业能力(professionalAbilityScore)**：专业领域的知识深度、技术熟练度、行业理解力
2. **学习成长(learningGrowthScore)**：持续学习意愿、成长潜力、知识迁移能力、自我反思
3. **沟通协作(communicationCollaborationScore)**：表达清晰度、逻辑性、团队合作意识、倾听与反馈
4. **问题解决(problemSolvingNewScore)**：分析问题能力、解决思路、应变能力、创新思维
5. **成就执行(achievementExecutionScore)**：目标导向、执行力、成果意识、时间管理
6. **抗压韧性(stressResilienceScore)**：压力承受力、情绪稳定性、逆境应对、复原力

描述要求：
- 每个维度的description必须150-200字
- 必须结合候选人具体回答来写，引用实际内容
- 格式：成就表现（得分点）+ 不足（扣分点）+ 针对性建议
- 若某题未作答，在描述中体现并下调评分
- 若整体未作答比例过高，显著降低综合评分与相关维度评分

请严格按照以下JSON格式输出（只输出JSON，不要任何其他文字）：

{
  "overallScore": 85,
  "dimensions": {
    "professionalAbilityScore": {
      "score": 8.5,
      "description": "候选人在XXX问题上展现出...（150-200字客观描述）"
    },
    "learningGrowthScore": {
      "score": 7.2,
      "description": "..."
    },
    "communicationCollaborationScore": {
      "score": 8.0,
      "description": "..."
    },
    "problemSolvingNewScore": {
      "score": 7.8,
      "description": "..."
    },
    "achievementExecutionScore": {
      "score": 7.5,
      "description": "..."
    },
    "stressResilienceScore": {
      "score": 8.3,
      "description": "..."
    }
  },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "jobMatch": {
    "title": "...",
    "description": "...",
    "matchRatio": 0.85
  },
  "tips": "..."
}`;
    }

    /**
     * 解析LLM返回的6维度分析结果
     */
    private parseAnalysisResponse(content: string, jobTarget: string): AnalysisResult {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('未找到JSON格式的分析结果');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const dimensions = parsed.dimensions || {};

            const getDim = (key: string) => {
                const item = dimensions[key] || {};
                return {
                    score: Number(item.score ?? 0),
                    description: typeof item.description === 'string' ? item.description : ''
                };
            };

            const prof = getDim('professionalAbilityScore');
            const learn = getDim('learningGrowthScore');
            const comm = getDim('communicationCollaborationScore');
            const solve = getDim('problemSolvingNewScore');
            const achieve = getDim('achievementExecutionScore');
            const stress = getDim('stressResilienceScore');

            const newDimensionScores: NewDimensionScores = {
                professionalAbilityScore: Number(prof.score.toFixed(1)),
                learningGrowthScore: Number(learn.score.toFixed(1)),
                communicationCollaborationScore: Number(comm.score.toFixed(1)),
                problemSolvingNewScore: Number(solve.score.toFixed(1)),
                achievementExecutionScore: Number(achieve.score.toFixed(1)),
                stressResilienceScore: Number(stress.score.toFixed(1)),
            };

            const scoreMap: Record<string, { score: number; description: string }> = {
                professionalAbilityScore: prof,
                learningGrowthScore: learn,
                communicationCollaborationScore: comm,
                problemSolvingNewScore: solve,
                achievementExecutionScore: achieve,
                stressResilienceScore: stress,
            };

            const competenciesDetailed: DimensionDetail[] = NEW_DIMENSIONS.map(({ key, label }) => {
                const s = scoreMap[key] || { score: 0, description: '' };
                return {
                    key,
                    name: label,
                    score: s.score,
                    level: this.getLevelNew(s.score),
                    description: s.description
                };
            });

            const avgDimScore = Object.values(newDimensionScores).reduce((a, b) => a + b, 0) / 6;
            const overallScore = Math.round(parsed.overallScore || avgDimScore * 10);

            return {
                overallScore,
                newDimensionScores,
                competenciesDetailed,
                strengths: parsed.strengths || [],
                improvements: parsed.improvements || [],
                jobMatch: parsed.jobMatch,
                tips: parsed.tips || '继续保持良好的学习态度，不断提升专业能力。',
                relevanceScore: 0,
                completenessScore: 0,
                professionalAccuracyScore: 0,
                logicalCoherenceScore: 0
            };

        } catch (error) {
            console.error('[AnalysisService] 解析分析结果失败', error);
            throw new Error('解析分析结果失败');
        }
    }

    /**
     * 获取能力等级（0-10分制）
     */
    private getLevelNew(score: number): string {
        if (score >= 9.0) return '优秀';
        if (score >= 7.5) return '良好';
        if (score >= 6.0) return '一般';
        if (score >= 4.0) return '需提升';
        return '待提升';
    }

    /**
     * 保存分析报告到数据库（仅使用V2 6维度字段）
     */
    private async saveAnalysisReport(sessionId: string, result: AnalysisResult): Promise<void> {
        const ns = result.newDimensionScores;
        const data = {
            sessionId,
            overallScore: result.overallScore,
            // 旧字段设默认值（向后兼容）
            communicationScore: 0,
            technicalScore: 0,
            problemSolvingScore: 0,
            teamworkScore: 0,
            adaptabilityScore: 0,
            learningScore: 0,
            // V2 6维度字段 (0-10)
            professionalAbilityScore: ns.professionalAbilityScore,
            learningGrowthScore: ns.learningGrowthScore,
            communicationCollaborationScore: ns.communicationCollaborationScore,
            problemSolvingNewScore: ns.problemSolvingNewScore,
            achievementExecutionScore: ns.achievementExecutionScore,
            stressResilienceScore: ns.stressResilienceScore,
            // 维度详情JSON
            competenciesJson: JSON.stringify(result.competenciesDetailed),
            strengths: JSON.stringify(result.strengths),
            improvements: JSON.stringify(result.improvements),
            jobMatchTitle: result.jobMatch?.title,
            jobMatchDescription: result.jobMatch?.description,
            jobMatchRatio: result.jobMatch?.matchRatio,
            tips: result.tips,
            analysisStatus: 'COMPLETED',
            analysisError: null,
            generatedAt: new Date(),
            // 视频/语音分析字段
            videoConfidenceScore: result.videoConfidenceScore,
            emotionDistribution: result.emotionDistribution ?
                JSON.stringify(result.emotionDistribution) : null,
            speechQuality: result.speechMetrics?.speechQuality ?? null,
            bodyLanguageScore: result.bodyLanguageScore ?? null,
            postureStability: result.postureStability ?? null,
            gazeFocus: result.gazeFocus ?? null,
            // 逐题分析
            relevanceScore: result.relevanceScore ?? null,
            completenessScore: result.completenessScore ?? null,
            professionalAccuracyScore: result.professionalAccuracyScore ?? null,
            logicalCoherenceScore: result.logicalCoherenceScore ?? null,
            questionAnalysisDetails: result.questionAnalysisDetails ?
                JSON.stringify(result.questionAnalysisDetails) : null,
            // 综合Insights
            videoInsights: JSON.stringify({
                video: result.videoAnalysisResults || [],
                speech: result.speechMetrics || null,
                objectiveSignals: result.objectiveSignals || null,
                integrity: result.integrity || null,
                voiceprint: result.voiceprint || null
            }),
            // JSON字段
            multimodalScoresJson: result.multimodalScores ?
                JSON.stringify(result.multimodalScores) : null,
            questionByQuestionJson: result.questionByQuestion ?
                JSON.stringify(result.questionByQuestion) : null,
            contentMultimodalFusionJson: result.contentMultimodalFusion ?
                JSON.stringify(result.contentMultimodalFusion) : null
        };

        await prisma.aIInterviewAnalysisReport.upsert({
            where: { sessionId },
            update: data,
            create: data
        });
    }

    /**
     * 获取分析报告
     */
    async getAnalysisReport(sessionId: string) {
        const report = await prisma.aIInterviewAnalysisReport.findUnique({
            where: { sessionId }
        });

        if (!report) return null;

        const insights = report.videoInsights ? JSON.parse(report.videoInsights) : null;
        const videoItems = Array.isArray(insights?.video) ? insights.video : [];

        // 从 V2 字段构建6维度
        const newDimensionScores: NewDimensionScores = {
            professionalAbilityScore: report.professionalAbilityScore ?? 0,
            learningGrowthScore: report.learningGrowthScore ?? 0,
            communicationCollaborationScore: report.communicationCollaborationScore ?? 0,
            problemSolvingNewScore: report.problemSolvingNewScore ?? 0,
            achievementExecutionScore: report.achievementExecutionScore ?? 0,
            stressResilienceScore: report.stressResilienceScore ?? 0,
        };

        return {
            sessionId: report.sessionId,
            overallScore: report.overallScore,
            newDimensionScores,
            competenciesDetailed: JSON.parse(report.competenciesJson || '[]'),
            strengths: JSON.parse(report.strengths || '[]'),
            improvements: JSON.parse(report.improvements || '[]'),
            jobMatch: report.jobMatchTitle ? {
                title: report.jobMatchTitle,
                description: report.jobMatchDescription || '',
                matchRatio: report.jobMatchRatio || 0
            } : null,
            tips: report.tips || '',
            metrics: {
                videoConfidenceScore: report.videoConfidenceScore,
                emotionDistribution: report.emotionDistribution ?
                    JSON.parse(report.emotionDistribution) : null,
                speechQuality: report.speechQuality,
                bodyLanguageScore: report.bodyLanguageScore,
                postureStability: report.postureStability,
                gazeFocus: report.gazeFocus
            },
            multimodalScores: report.multimodalScoresJson ?
                JSON.parse(report.multimodalScoresJson) : null,
            questionByQuestion: report.questionByQuestionJson ?
                JSON.parse(report.questionByQuestionJson) : null,
            contentMultimodalFusion: report.contentMultimodalFusionJson ?
                JSON.parse(report.contentMultimodalFusionJson) : null,
            integrity: insights?.integrity || null,
            voiceprint: insights?.voiceprint || null,
            insights,
            analysisStatus: report.analysisStatus,
            generatedAt: report.generatedAt ? report.generatedAt.toISOString() : new Date().toISOString()
        };
    }

    /**
     * 获取分析状态
     */
    async getAnalysisStatus(sessionId: string): Promise<{
        status: string;
        report: any | null;
        task: any | null;
    }> {
        const report = await prisma.aIInterviewAnalysisReport.findUnique({
            where: { sessionId }
        });

        const task = await prisma.aIInterviewAnalysisTask.findFirst({
            where: { sessionId },
            orderBy: { createdAt: 'desc' }
        });

        return {
            status: report?.analysisStatus || task?.status || 'NOT_STARTED',
            report: report ? await this.getAnalysisReport(sessionId) : null,
            task: task ? {
                status: task.status,
                retryCount: task.retryCount,
                errorMessage: task.errorMessage
            } : null
        };
    }

    /**
     * 生成简历能力交叉验证结果
     * @param sessionId 面试会话ID
     * @param interviewAnalysis 面试分析结果
     * @param userSkills 用户简历中声明的技能
     * @returns 交叉验证结果
     */
    async generateResumeInsights(
        sessionId: string,
        interviewAnalysis: AnalysisResult,
        userSkills?: string[]
    ): Promise<CrossValidationResult> {
        try {
            // 1. 获取用户声明的技能
            const claimedSkills = userSkills || [];
            
            // 2. 从面试分析结果中提取展现的技能
            const demonstratedSkills = this.extractDemonstratedSkills(interviewAnalysis);
            
            // 3. 计算匹配的技能
            const matchedSkills = claimedSkills.filter(skill => 
                demonstratedSkills.some(ds => ds.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(ds.toLowerCase()))
            );
            
            // 4. 计算缺失的技能（声明了但没展现的）
            const missingSkills = claimedSkills.filter(skill => !matchedSkills.includes(skill));
            
            // 5. 计算发现的额外技能（展现了但没声明的）
            const discoveredSkills = demonstratedSkills.filter(skill => 
                !claimedSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs.toLowerCase()))
            );
            
            // 6. 计算一致性评分
            const consistencyScore = claimedSkills.length > 0 
                ? Math.round((matchedSkills.length / claimedSkills.length) * 100) 
                : 100;
            
            return {
                claimedSkills,
                demonstratedSkills,
                matchedSkills,
                missingSkills,
                discoveredSkills,
                consistencyScore,
            };
        } catch (error) {
            console.warn('[AnalysisService] 简历交叉验证生成失败:', error);
            return {
                claimedSkills: [],
                demonstratedSkills: [],
                matchedSkills: [],
                missingSkills: [],
                discoveredSkills: [],
                consistencyScore: 0,
            };
        }
    }
    
    /**
     * 从面试分析结果中提取展现的技能
     */
    private extractDemonstratedSkills(analysis: AnalysisResult): string[] {
        const skills: string[] = [];
        
        // 从优势中提取
        analysis.strengths.forEach(strength => {
            // 简单的关键词提取，实际可以使用NLP工具更精确
            const skillKeywords = ['Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 'Spring', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', '阿里云', '腾讯云', 'Git', 'Linux', '算法', '数据结构', '系统设计', '微服务', '分布式', '高并发', '性能优化', '安全', '测试', 'DevOps', '产品经理', 'UI设计', 'UX设计', '运营', '市场营销', '销售', '人力资源', '财务', '项目管理', '敏捷开发', 'Scrum'];
            skillKeywords.forEach(keyword => {
                if (strength.includes(keyword) && !skills.includes(keyword)) {
                    skills.push(keyword);
                }
            });
        });
        
        // 从能力维度中提取
        analysis.competenciesDetailed.forEach(detail => {
            if (detail.score >= 0.7) {
                skills.push(detail.name);
            }
        });
        
        return [...new Set(skills)];
    }
    
    /**
     * 生成推荐函
     * @param crossValidation 交叉验证结果
     * @param interviewAnalysis 面试分析结果
     * @param targetJob 目标职位（可选）
     * @returns 推荐函内容
     */
    async generateRecommendationLetter(
        crossValidation: CrossValidationResult,
        interviewAnalysis: AnalysisResult,
        targetJob?: { title: string; requirements: string[] }
    ): Promise<RecommendationLetter> {
        try {
            // 1. 生成简短总结
            const summary = `该候选人综合得分${interviewAnalysis.overallScore}分，能力一致性评分${crossValidation.consistencyScore}分，整体表现${interviewAnalysis.overallScore >= 80 ? '优秀' : interviewAnalysis.overallScore >= 60 ? '良好' : '一般'}。`;
            
            // 2. 核心优势
            const strengths = [
                ...interviewAnalysis.strengths,
                crossValidation.matchedSkills.length > 0 ? `掌握简历中声明的${crossValidation.matchedSkills.join('、')}等技能` : '',
                crossValidation.discoveredSkills.length > 0 ? `额外展现出${crossValidation.discoveredSkills.join('、')}等能力` : '',
            ].filter(Boolean);
            
            // 3. 适合岗位
            const suitableRoles: string[] = [];
            if (interviewAnalysis.jobMatch) {
                suitableRoles.push(interviewAnalysis.jobMatch.title);
            }
            // 根据技能推荐相关岗位
            const skillToRoleMap: Record<string, string[]> = {
                'Java': ['后端开发工程师', 'Java高级工程师', '技术架构师'],
                'Python': ['Python开发工程师', '数据分析师', '算法工程师'],
                'JavaScript': ['前端开发工程师', '全栈开发工程师'],
                'React': ['前端开发工程师', 'React高级工程师'],
                '产品经理': ['产品经理', '产品总监'],
                '项目管理': ['项目经理', '项目总监'],
            };
            crossValidation.matchedSkills.forEach(skill => {
                if (skillToRoleMap[skill]) {
                    suitableRoles.push(...skillToRoleMap[skill]);
                }
            });
            
            // 4. 风险提示
            const cautionPoints: string[] = [
                ...interviewAnalysis.improvements,
                crossValidation.missingSkills.length > 0 ? `简历中声明的${crossValidation.missingSkills.join('、')}等技能在面试中未充分展现，建议进一步考察` : '',
            ].filter(Boolean);
            
            // 5. 综合评级
            const overallRating = Math.min(5, Math.max(1, Math.round(interviewAnalysis.overallScore / 20)));
            
            return {
                summary,
                strengths: [...new Set(strengths)],
                suitableRoles: [...new Set(suitableRoles)],
                cautionPoints,
                overallRating,
            };
        } catch (error) {
            console.warn('[AnalysisService] 推荐函生成失败:', error);
            return {
                summary: '暂无推荐信息',
                strengths: [],
                suitableRoles: [],
                cautionPoints: [],
                overallRating: 0,
            };
        }
    }
}

export const analysisService = new AnalysisService();
