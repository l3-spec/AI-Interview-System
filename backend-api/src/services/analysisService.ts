import { prisma } from '../lib/prisma';
import { deepseekService } from './deepseekService';
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
 * 负责使用DeepSeek LLM分析面试表现，生成多维度职场素养报告
 */

type DimensionKey =
    | 'opennessInnovation'
    | 'learningResearch'
    | 'achievementOrientation'
    | 'teamwork'
    | 'interpersonalCommunication'
    | 'stressTolerance';

const DIMENSIONS: Array<{ key: DimensionKey; label: string }> = [
    { key: 'opennessInnovation', label: '开放创新' },
    { key: 'learningResearch', label: '学习研究' },
    { key: 'achievementOrientation', label: '成就导向' },
    { key: 'teamwork', label: '团队协作' },
    { key: 'interpersonalCommunication', label: '人际沟通' },
    { key: 'stressTolerance', label: '压力承受' }
];

const EMPTY_ANSWER_PLACEHOLDER = '(未作答)';

interface CompetencyAnalysis {
    opennessInnovation: number;
    learningResearch: number;
    achievementOrientation: number;
    teamwork: number;
    interpersonalCommunication: number;
    stressTolerance: number;
}

interface AnswerStats {
    total: number;
    missingBothCount: number;
    missingTextCount: number;
    missingVideoCount: number;
    answerCoverage: number;
}

interface DimensionDetail {
    key: DimensionKey;
    name: string;
    score: number; // 0-1
    level: string;
    description: string;
}

interface ObjectiveScores {
    overallScore: number;
    dimensions: Record<DimensionKey, number>; // 0-100
    signals: {
        textLength: number;
        keywordHits: Record<DimensionKey, number>;
        numericEvidence: number;
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
    };
}

interface AnalysisResult {
    overallScore: number;
    competencies: CompetencyAnalysis;
    competenciesDetailed: DimensionDetail[];
    strengths: string[];
    improvements: string[];
    jobMatch?: {
        title: string;
        description: string;
        matchRatio: number;
    };
    tips: string;
    objectiveScores?: ObjectiveScores;
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
                    problemSolvingScore: 0,
                    teamworkScore: 0,
                    adaptabilityScore: 0,
                    learningScore: 0,
                    analysisStatus: 'FAILED',
                    analysisError: error instanceof Error ? error.message : '未知错误'
                }
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
        const transcript = this.resolveTranscript(questionsAndAnswers, speechMetrics);
        const objectiveScores = this.calculateObjectiveScores({
            transcript,
            speechMetrics,
            videoSummary,
            answerCoverage: answerStats?.answerCoverage
        });

        const llmScores = this.denormalizeCompetencies(textAnalysis.competencies);
        const fusedScores = this.fuseDimensionScores(llmScores, objectiveScores.dimensions);
        const overallScore = this.fuseOverallScores(textAnalysis.overallScore, objectiveScores.overallScore);

        const descriptionMap = this.extractDimensionDescriptions(textAnalysis.competenciesDetailed);
        const adjustedScores = this.applyCoveragePenalty(fusedScores, answerStats?.answerCoverage);
        const adjustedOverall = this.applyCoveragePenaltyToOverall(overallScore, answerStats?.answerCoverage);
        const competenciesDetailed = this.buildDimensionDetails(
            adjustedScores,
            descriptionMap,
            speechMetrics,
            videoSummary
        );
        const normalizedCompetencies = this.normalizeCompetencies(adjustedScores);

        const bodyLanguageScore = this.calculateBodyLanguageScore(videoSummary);

        return {
            ...textAnalysis,
            overallScore: adjustedOverall,
            competencies: normalizedCompetencies,
            competenciesDetailed,
            objectiveScores,
            speechMetrics,
            videoConfidenceScore: videoSummary?.avgConfidence,
            emotionStability: videoSummary?.avgStability,
            emotionDistribution: videoSummary?.emotionDistribution,
            bodyLanguageScore,
            postureStability: videoSummary?.avgPostureStability,
            gazeFocus: videoSummary?.avgGazeFocus,
            videoAnalysisResults,
            integrity,
            voiceprint
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
        const avgPostureStability = postureSamples.length
            ? postureSamples.reduce((sum, v) => sum + v, 0) / postureSamples.length
            : undefined;
        const avgGazeFocus = gazeSamples.length
            ? gazeSamples.reduce((sum, v) => sum + v, 0) / gazeSamples.length
            : undefined;

        const emotionCounts: Record<string, number> = {};
        videoAnalysisResults.forEach(v => {
            emotionCounts[v.dominantEmotion] = (emotionCounts[v.dominantEmotion] || 0) + 1;
        });

        const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        console.log(`[AnalysisService] 视频分析结果: 平均自信度=${avgConfidence}, 情绪稳定性=${avgStability}, 姿态稳定=${avgPostureStability ?? 'N/A'}, 视线专注=${avgGazeFocus ?? 'N/A'}`);

        return {
            avgConfidence,
            avgStability,
            dominantEmotion: dominantEmotion || 'neutral',
            emotionDistribution: emotionCounts,
            avgPostureStability,
            avgGazeFocus
        };
    }

    private resolveTranscript(
        questionsAndAnswers: Array<{ question: string; answer: string }>,
        speechMetrics: SpeechMetricsSummary | undefined
    ): string {
        if (speechMetrics?.transcript && speechMetrics.transcript.trim()) {
            return speechMetrics.transcript;
        }
        return questionsAndAnswers
            .map(item => item.answer || '')
            .filter(answer => this.isMeaningfulAnswer(answer))
            .join('\n');
    }

    private isMeaningfulAnswer(answer: string): boolean {
        if (!answer) {
            return false;
        }
        const trimmed = answer.trim();
        if (!trimmed) {
            return false;
        }
        return trimmed !== EMPTY_ANSWER_PLACEHOLDER && trimmed !== '(未回答)';
    }

    private calculateObjectiveScores(params: {
        transcript: string;
        speechMetrics: SpeechMetricsSummary | undefined;
        videoSummary: {
            avgConfidence: number;
            avgStability: number;
            dominantEmotion: string;
            emotionDistribution: Record<string, number>;
            avgPostureStability?: number;
            avgGazeFocus?: number;
        } | null;
        answerCoverage?: number;
    }): ObjectiveScores {
        const text = params.transcript || '';
        const textLength = text.replace(/\s+/g, '').length;
        const numericEvidence = (text.match(/\d+(\.\d+)?/g) || []).length;

        const keywordHits: Record<DimensionKey, number> = {
            opennessInnovation: this.countKeywordHits(text, [
                '创新', '探索', '实验', '试验', '改进', '突破', '新方法', '新技术', '迭代',
                '原型', '优化', '点子', '想法', '开放', '尝试'
            ]),
            learningResearch: this.countKeywordHits(text, [
                '学习', '研究', '复盘', '总结', '课程', '培训', '证书', '阅读', '论文',
                '调研', '知识', '成长', '进修', '方法论'
            ]),
            achievementOrientation: this.countKeywordHits(text, [
                '目标', '达成', '结果', '业绩', '指标', '增长', '提升', '交付', '产出',
                '成果', '转化', '里程碑', '收益'
            ]),
            teamwork: this.countKeywordHits(text, [
                '团队', '协作', '跨部门', '配合', '共建', '协同', '支持', '伙伴', '对齐'
            ]),
            interpersonalCommunication: this.countKeywordHits(text, [
                '沟通', '表达', '倾听', '协调', '同理', '反馈', '影响', '说服', '共识', '分享'
            ]),
            stressTolerance: this.countKeywordHits(text, [
                '压力', '抗压', '紧急', '突发', '危机', '高压', '加班', '困难', '挫折', '挑战', '复原'
            ])
        };

        const speechQuality = params.speechMetrics?.speechQuality ?? null;
        const speechRate = params.speechMetrics?.avgSpeechRate ?? null;
        const pauseRatio = params.speechMetrics?.avgPauseRatio ?? null;
        const fillerRatio = params.speechMetrics?.avgFillerRatio ?? null;
        const volumeStability = params.speechMetrics?.avgVolumeStability ?? null;
        const videoConfidence = params.videoSummary?.avgConfidence ?? null;
        const emotionStability = params.videoSummary?.avgStability ?? null;
        const postureStability = params.videoSummary?.avgPostureStability ?? null;
        const gazeFocus = params.videoSummary?.avgGazeFocus ?? null;

        const lengthBonus = Math.min(10, Math.round(textLength / 120));
        const numericBonus = Math.min(15, numericEvidence * 3);

        const opennessInnovation = this.clampScore(
            55 + Math.min(24, keywordHits.opennessInnovation * 4) + Math.min(8, numericEvidence * 2)
        );
        const learningResearch = this.clampScore(
            55 + Math.min(24, keywordHits.learningResearch * 4) + lengthBonus
        );
        const achievementOrientation = this.clampScore(
            55 + Math.min(24, keywordHits.achievementOrientation * 4) + numericBonus
        );
        const teamwork = this.clampScore(
            55 + Math.min(24, keywordHits.teamwork * 4)
        );

        const speechBonus = speechQuality !== null ? (speechQuality - 60) * 0.4 : 0;
        const gazeBonus = gazeFocus !== null ? gazeFocus * 0.08 : 0;
        const fillerPenalty = fillerRatio !== null ? fillerRatio * 100 * 0.3 : 0;
        const pausePenalty = pauseRatio !== null ? pauseRatio * 100 * 0.2 : 0;
        const interpersonalCommunication = this.clampScore(
            50 + Math.min(20, keywordHits.interpersonalCommunication * 4) + speechBonus + gazeBonus - fillerPenalty - pausePenalty
        );

        const stabilityBonus = emotionStability !== null ? emotionStability * 0.3 : 0;
        const confidenceBonus = videoConfidence !== null ? videoConfidence * 0.1 : 0;
        const postureBonus = postureStability !== null ? postureStability * 0.12 : 0;
        const stressPausePenalty = pauseRatio !== null ? pauseRatio * 100 * 0.1 : 0;
        const stressTolerance = this.clampScore(
            50 + Math.min(20, keywordHits.stressTolerance * 4) + stabilityBonus + confidenceBonus + postureBonus - stressPausePenalty
        );

        const dimensions: Record<DimensionKey, number> = {
            opennessInnovation,
            learningResearch,
            achievementOrientation,
            teamwork,
            interpersonalCommunication,
            stressTolerance
        };

        const overallScore = Math.round(
            Object.values(dimensions).reduce((sum, score) => sum + score, 0) / DIMENSIONS.length
        );

        return {
            overallScore,
            dimensions,
            signals: {
                textLength,
                keywordHits,
                numericEvidence,
                answerCoverage: params.answerCoverage,
                speechQuality,
                speechRate,
                pauseRatio,
                fillerRatio,
                volumeStability,
                videoConfidence,
                emotionStability,
                postureStability,
                gazeFocus
            }
        };
    }

    private countKeywordHits(text: string, keywords: string[]): number {
        if (!text) {
            return 0;
        }
        return keywords.reduce((count, keyword) => {
            const matches = text.match(new RegExp(keyword, 'g'));
            return count + (matches ? matches.length : 0);
        }, 0);
    }

    private denormalizeCompetencies(competencies: CompetencyAnalysis): Record<DimensionKey, number> {
        return {
            opennessInnovation: Math.round(competencies.opennessInnovation * 100),
            learningResearch: Math.round(competencies.learningResearch * 100),
            achievementOrientation: Math.round(competencies.achievementOrientation * 100),
            teamwork: Math.round(competencies.teamwork * 100),
            interpersonalCommunication: Math.round(competencies.interpersonalCommunication * 100),
            stressTolerance: Math.round(competencies.stressTolerance * 100)
        };
    }

    private normalizeCompetencies(scores: Record<DimensionKey, number>): CompetencyAnalysis {
        return {
            opennessInnovation: this.clampScore(scores.opennessInnovation) / 100,
            learningResearch: this.clampScore(scores.learningResearch) / 100,
            achievementOrientation: this.clampScore(scores.achievementOrientation) / 100,
            teamwork: this.clampScore(scores.teamwork) / 100,
            interpersonalCommunication: this.clampScore(scores.interpersonalCommunication) / 100,
            stressTolerance: this.clampScore(scores.stressTolerance) / 100
        };
    }

    private fuseDimensionScores(
        llmScores: Record<DimensionKey, number>,
        objectiveScores: Record<DimensionKey, number>
    ): Record<DimensionKey, number> {
        const weightLLM = 0.65;
        const weightObjective = 0.35;

        const fused: Record<DimensionKey, number> = {} as Record<DimensionKey, number>;
        DIMENSIONS.forEach(({ key }) => {
            const llm = llmScores[key];
            const obj = objectiveScores[key];
            const hasLLM = Number.isFinite(llm);
            const hasObj = Number.isFinite(obj);

            if (hasLLM && hasObj) {
                fused[key] = this.clampScore(llm * weightLLM + obj * weightObjective);
            } else if (hasLLM) {
                fused[key] = this.clampScore(llm);
            } else if (hasObj) {
                fused[key] = this.clampScore(obj);
            } else {
                fused[key] = 60;
            }
        });
        return fused;
    }

    private fuseOverallScores(llmOverall: number, objectiveOverall: number): number {
        if (Number.isFinite(llmOverall) && Number.isFinite(objectiveOverall)) {
            return Math.round(llmOverall * 0.65 + objectiveOverall * 0.35);
        }
        if (Number.isFinite(llmOverall)) {
            return Math.round(llmOverall);
        }
        if (Number.isFinite(objectiveOverall)) {
            return Math.round(objectiveOverall);
        }
        return 60;
    }

    private extractDimensionDescriptions(details: DimensionDetail[]): Record<DimensionKey, string> {
        const map = {} as Record<DimensionKey, string>;
        details.forEach(detail => {
            map[detail.key] = detail.description;
        });
        return map;
    }

    private buildDimensionDetails(
        scores: Record<DimensionKey, number>,
        descriptions: Record<DimensionKey, string>,
        speechMetrics: SpeechMetricsSummary | undefined,
        videoSummary: {
            avgConfidence: number;
            avgStability: number;
            dominantEmotion: string;
            emotionDistribution: Record<string, number>;
            avgPostureStability?: number;
            avgGazeFocus?: number;
        } | null
    ): DimensionDetail[] {
        return DIMENSIONS.map(({ key, label }) => {
            const score = this.clampScore(scores[key]);
            const level = this.getLevel(score);
            const description = descriptions[key] ||
                this.buildDefaultDescription(key, label, score, speechMetrics, videoSummary);
            return {
                key,
                name: label,
                score: score / 100,
                level,
                description
            };
        });
    }

    private buildDefaultDescription(
        key: DimensionKey,
        label: string,
        score: number,
        speechMetrics: SpeechMetricsSummary | undefined,
        videoSummary: {
            avgConfidence: number;
            avgStability: number;
            dominantEmotion: string;
            emotionDistribution: Record<string, number>;
            avgPostureStability?: number;
            avgGazeFocus?: number;
        } | null
    ): string {
        const level = this.getLevel(score);
        if (key === 'interpersonalCommunication') {
            const quality = speechMetrics?.speechQuality ?? null;
            const rate = speechMetrics?.avgSpeechRate ?? null;
            const gaze = videoSummary?.avgGazeFocus ?? null;
            const qualityText = quality !== null ? `语音质量约${Math.round(quality)}分` : '语音质量数据不足';
            const rateText = rate !== null ? `语速约${Math.round(rate)}字/分钟` : '语速数据不足';
            const gazeText = gaze !== null ? `视线专注度约${Math.round(gaze)}分` : '视线专注度数据不足';
            return `在人际沟通方面表现${level}，${qualityText}，${rateText}，${gazeText}，表达逻辑与互动节奏较为稳定。`;
        }
        if (key === 'stressTolerance') {
            const stability = videoSummary?.avgStability ?? null;
            const posture = videoSummary?.avgPostureStability ?? null;
            const stabilityText = stability !== null ? `情绪稳定性约${Math.round(stability)}分` : '情绪稳定性数据不足';
            const postureText = posture !== null ? `姿态稳定性约${Math.round(posture)}分` : '姿态稳定性数据不足';
            return `在压力承受方面表现${level}，${stabilityText}，${postureText}，面对挑战时情绪波动相对可控。`;
        }
        if (key === 'opennessInnovation') {
            return `在开放创新方面表现${level}，对新方法和改进思路有一定敏感度，能提出可尝试的优化方向。`;
        }
        if (key === 'learningResearch') {
            return `在学习研究方面表现${level}，体现出持续学习与总结的意愿，具备稳步提升的潜力。`;
        }
        if (key === 'achievementOrientation') {
            return `在成就导向方面表现${level}，目标意识较明确，关注结果与产出指标的达成。`;
        }
        return `在${label}方面表现${level}，具备稳定的基础素养与协作意识。`;
    }

    private calculateBodyLanguageScore(videoSummary: {
        avgConfidence: number;
        avgStability: number;
        avgPostureStability?: number;
        avgGazeFocus?: number;
    } | null) {
        if (!videoSummary) {
            return undefined;
        }
        const posture = typeof videoSummary.avgPostureStability === 'number'
            ? videoSummary.avgPostureStability
            : 70;
        const gaze = typeof videoSummary.avgGazeFocus === 'number'
            ? videoSummary.avgGazeFocus
            : 70;
        return Math.round(
            videoSummary.avgConfidence * 0.3 +
            videoSummary.avgStability * 0.3 +
            posture * 0.2 +
            gaze * 0.2
        );
    }

    private applyCoveragePenalty(scores: Record<DimensionKey, number>, coverage?: number) {
        if (coverage === undefined || coverage >= 0.95) {
            return scores;
        }
        const penalty = Math.round((1 - coverage) * 30);
        const adjusted: Record<DimensionKey, number> = {} as Record<DimensionKey, number>;
        DIMENSIONS.forEach(({ key }) => {
            adjusted[key] = this.clampScore(scores[key] - penalty);
        });
        return adjusted;
    }

    private applyCoveragePenaltyToOverall(score: number, coverage?: number): number {
        if (coverage === undefined || coverage >= 0.95) {
            return this.clampScore(score);
        }
        const penalty = Math.round((1 - coverage) * 30);
        return this.clampScore(score - penalty);
    }

    private clampScore(score: number): number {
        if (!Number.isFinite(score)) {
            return 0;
        }
        return Math.max(0, Math.min(100, score));
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

        return `你是一位资深的职业素养评估专家，请基于以下面试内容进行多维度分析。

【候选人信息】
目标职位：${jobTarget}
${jobCategory ? `职位类别：${jobCategory}` : ''}
${companyTarget ? `目标公司：${companyTarget}` : ''}
${background ? `个人背景：${background}` : ''}

${answerStatsText ? `${answerStatsText}\n` : ''}
【面试问答】
${qaText}

请从以下6个维度对候选人进行评估，每个维度给出0-100的分数（精确到小数点后1位），并提供对应的客观描述：

1. **开放创新**：新方法、新技术、试验和改进意识
2. **学习研究**：持续学习、研究与复盘能力
3. **成就导向**：目标意识、结果驱动与业绩导向
4. **团队协作**：跨部门协作、支持与共建意识
5. **人际沟通**：表达清晰、同理心与沟通协调能力
6. **压力承受**：高压情境下的稳定性与应对能力

评分提示：
- 若某题未作答，请在维度描述中体现，并合理下调评分。
- 若整体未作答比例较高，请显著降低综合评分与相关维度评分。

请严格按照以下JSON格式输出（不要有任何其他文字，只输出JSON）：

{
  "overallScore": 85,
  "dimensions": {
    "opennessInnovation": {
      "score": 88.5,
      "description": "举例说明候选人在开放创新方面的表现，语言要客观具体。"
    },
    "learningResearch": {
      "score": 82.0,
      "description": "举例说明候选人在学习研究方面的表现。"
    },
    "achievementOrientation": {
      "score": 85.5,
      "description": "举例说明候选人在成就导向方面的表现。"
    },
    "teamwork": {
      "score": 87.0,
      "description": "举例说明候选人在团队协作方面的表现。"
    },
    "interpersonalCommunication": {
      "score": 84.0,
      "description": "举例说明候选人在人际沟通方面的表现。"
    },
    "stressTolerance": {
      "score": 89.0,
      "description": "举例说明候选人在压力承受方面的表现。"
    }
  },
  "strengths": [
    "表达清晰，逻辑性强",
    "对技术有深入理解",
    "主动学习意愿强"
  ],
  "improvements": [
    "可以更多结合具体案例",
    "建议加强对行业趋势的了解"
  ],
  "jobMatch": {
    "title": "研发类",
    "description": "候选人展现出较强的技术能力和学习意愿，适合从事研发相关工作",
    "matchRatio": 0.89
  },
  "tips": "在团队协作中要注意倾听他人意见，平衡个人想法与团队目标。建议持续关注行业动态，保持技术敏感度。"
}`;
    }

    /**
     * 解析LLM返回的分析结果
     */
    private parseAnalysisResponse(content: string, jobTarget: string): AnalysisResult {
        try {
            // 尝试提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('未找到JSON格式的分析结果');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            const dimensions = parsed.dimensions || {};
            const legacy = parsed.competencies || {};
            const normalized = {
                opennessInnovation: dimensions.opennessInnovation || { score: legacy.problemSolving },
                learningResearch: dimensions.learningResearch || { score: legacy.learning || legacy.technical },
                achievementOrientation: dimensions.achievementOrientation || { score: legacy.problemSolving || legacy.technical },
                teamwork: dimensions.teamwork || { score: legacy.teamwork },
                interpersonalCommunication: dimensions.interpersonalCommunication || { score: legacy.communication },
                stressTolerance: dimensions.stressTolerance || { score: legacy.adaptability }
            };

            const competenciesDetailed: DimensionDetail[] = DIMENSIONS.map(({ key, label }) => {
                const item = normalized[key] || {};
                const score = Number(item.score ?? 0);
                const description = typeof item.description === 'string' ? item.description : '';
                return {
                    key,
                    name: label,
                    score: score / 100,
                    level: this.getLevel(score),
                    description
                };
            });

            return {
                overallScore: Math.round(parsed.overallScore),
                competencies: {
                    opennessInnovation: (Number(normalized.opennessInnovation?.score ?? 0)) / 100,
                    learningResearch: (Number(normalized.learningResearch?.score ?? 0)) / 100,
                    achievementOrientation: (Number(normalized.achievementOrientation?.score ?? 0)) / 100,
                    teamwork: (Number(normalized.teamwork?.score ?? 0)) / 100,
                    interpersonalCommunication: (Number(normalized.interpersonalCommunication?.score ?? 0)) / 100,
                    stressTolerance: (Number(normalized.stressTolerance?.score ?? 0)) / 100
                },
                competenciesDetailed,
                strengths: parsed.strengths || [],
                improvements: parsed.improvements || [],
                jobMatch: parsed.jobMatch,
                tips: parsed.tips || '继续保持良好的学习态度，不断提升专业能力。'
            };

        } catch (error) {
            console.error('[AnalysisService] 解析分析结果失败', error);
            throw new Error('解析分析结果失败');
        }
    }

    /**
     * 获取能力等级
     */
    private getLevel(score: number): string {
        if (score >= 90) return '优秀';
        if (score >= 80) return '良好';
        if (score >= 70) return '中等';
        if (score >= 60) return '及格';
        return '待提升';
    }

    /**
     * 保存分析报告到数据库
     */
    private async saveAnalysisReport(sessionId: string, result: any): Promise<void> {
        const data = {
            sessionId,
            overallScore: result.overallScore,
            communicationScore: result.competencies.interpersonalCommunication,
            technicalScore: result.competencies.learningResearch,
            problemSolvingScore: result.competencies.opennessInnovation,
            teamworkScore: result.competencies.teamwork,
            adaptabilityScore: result.competencies.stressTolerance,
            learningScore: result.competencies.achievementOrientation,
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
            // 视频分析字段（新增）
            videoConfidenceScore: result.videoConfidenceScore,
            emotionDistribution: result.emotionDistribution ?
                JSON.stringify(result.emotionDistribution) : null,
            speechQuality: result.speechMetrics?.speechQuality ?? null,
            bodyLanguageScore: result.bodyLanguageScore ?? null,
            postureStability: result.postureStability ?? null,
            gazeFocus: result.gazeFocus ?? null,
            videoInsights: result.videoAnalysisResults || result.speechMetrics || result.objectiveScores ?
                JSON.stringify({
                    video: result.videoAnalysisResults || [],
                    speech: result.speechMetrics || null,
                    objectiveScores: result.objectiveScores || null,
                    integrity: result.integrity || null,
                    voiceprint: result.voiceprint || null
                }) : null
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

        if (!report) {
            return null;
        }

        const insights = report.videoInsights ? JSON.parse(report.videoInsights) : null;
        const videoItems = Array.isArray(insights?.video) ? insights.video : [];
        const fallbackPosture = videoItems.length
            ? Math.round(videoItems.reduce((sum: number, item: any) => sum + (item.postureStability || 0), 0) / videoItems.length)
            : null;
        const fallbackGaze = videoItems.length
            ? Math.round(videoItems.reduce((sum: number, item: any) => sum + (item.gazeFocus || 0), 0) / videoItems.length)
            : null;
        const fallbackEmotionStability = videoItems.length
            ? Math.round(videoItems.reduce((sum: number, item: any) => sum + (item.emotionStability || 0), 0) / videoItems.length)
            : null;
        const postureStability = report.postureStability ?? fallbackPosture;
        const gazeFocus = report.gazeFocus ?? fallbackGaze;

        return {
            sessionId: report.sessionId,
            overallScore: report.overallScore,
            competencies: JSON.parse(report.competenciesJson || '[]'),
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
                emotionDistribution: report.emotionDistribution ? JSON.parse(report.emotionDistribution) : null,
                emotionStability: fallbackEmotionStability,
                speechQuality: report.speechQuality,
                bodyLanguageScore: report.bodyLanguageScore,
                postureStability,
                gazeFocus
            },
            integrity: insights?.integrity || null,
            voiceprint: insights?.voiceprint || null,
            insights,
            analysisStatus: report.analysisStatus,
            generatedAt: report.generatedAt.toISOString()
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
}

export const analysisService = new AnalysisService();
