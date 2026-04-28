import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { toMediaUrl, toObjectKey } from '../utils/ossUtils';

/**
 * 获取AI面试会话列表（管理员）
 */
export const listInterviewSessions = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);

        // 构建查询条件
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { jobTarget: { contains: search as string } },
                { user: { name: { contains: search as string } } },
                { user: { email: { contains: search as string } } }
            ];
        }

        // 获取会话列表
        const [sessions, total] = await Promise.all([
            prisma.aIInterviewSession.findMany({
                where,
                skip,
                take,
                orderBy: {
                    [sortBy as string]: sortOrder as 'asc' | 'desc'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true
                        }
                    },
                    analysisReport: {
                        select: {
                            overallScore: true,
                            analysisStatus: true
                        }
                    }
                }
            }),
            prisma.aIInterviewSession.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                list: sessions.map((session: any) => ({
                    id: session.id,
                    userId: session.userId,
                    userName: session.user.name,
                    userEmail: session.user.email,
                    userAvatar: toMediaUrl(session.user.avatar) ?? session.user.avatar,
                    jobTarget: session.jobTarget,
                    jobCategory: session.jobCategory,
                    status: session.status,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    overallScore: session.analysisReport?.overallScore,
                    analysisStatus: session.analysisReport?.analysisStatus,
                    duration: session.duration
                })),
                pagination: {
                    page: Number(page),
                    pageSize: Number(pageSize),
                    total,
                    totalPages: Math.ceil(total / Number(pageSize))
                }
            }
        });
    } catch (error) {
        console.error('获取面试会话列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取面试会话分析详情（管理员）
 */
export const getInterviewSessionAnalysis = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.aIInterviewSession.findUnique({
            where: { id: sessionId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        experience: true,
                        skills: true
                    }
                },
                questions: {
                    orderBy: { questionIndex: 'asc' }
                },
                analysisReport: true,
                conversationTurns: {
                    orderBy: { sequence: 'asc' },
                },
            }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: '面试会话不存在'
            });
        }

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    jobTarget: session.jobTarget,
                    jobCategory: session.jobCategory,
                    companyTarget: session.companyTarget,
                    background: session.background,
                    status: session.status,
                    createdAt: session.createdAt,
                    duration: session.duration,
                    user: session.user
                      ? {
                          ...session.user,
                          avatar: toMediaUrl(session.user.avatar) ?? session.user.avatar,
                        }
                      : session.user
                },
                questions: session.questions.map((q: any) => ({
                    index: q.questionIndex,
                    text: q.questionText,
                    answer: q.answerText,
                    videoUrl: toMediaUrl(q.answerVideoUrl) ?? q.answerVideoUrl,
                    /** 原始 OSS objectKey，便于在控制台按路径人工查验 */
                    videoOssKey: toObjectKey(q.answerVideoUrl) ?? null,
                    duration: q.answerDuration
                })),
                conversationTurns: session.conversationTurns?.map((t: any) => ({
                    id: t.id,
                    sequence: t.sequence,
                    speaker: t.speaker,
                    avatarText: t.avatarText,
                    candidateText: t.candidateText,
                    candidateVideoUrl: toMediaUrl(t.candidateVideoUrl) ?? t.candidateVideoUrl,
                    candidateVideoOssKey: toObjectKey(t.candidateVideoUrl) ?? null,
                    questionIndex: t.questionIndex,
                    createdAt: t.createdAt,
                })) ?? [],
                report: session.analysisReport ? (() => {
                    const insights = session.analysisReport.videoInsights
                        ? JSON.parse(session.analysisReport.videoInsights)
                        : null;
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
                    const postureStability = session.analysisReport.postureStability ?? fallbackPosture;
                    const gazeFocus = session.analysisReport.gazeFocus ?? fallbackGaze;

                    return {
                    overallScore: session.analysisReport.overallScore,
                    competencies: JSON.parse(session.analysisReport.competenciesJson || '[]'),
                    strengths: JSON.parse(session.analysisReport.strengths || '[]'),
                    improvements: JSON.parse(session.analysisReport.improvements || '[]'),
                    jobMatch: {
                        title: session.analysisReport.jobMatchTitle,
                        description: session.analysisReport.jobMatchDescription,
                        ratio: session.analysisReport.jobMatchRatio
                    },
                    tips: session.analysisReport.tips,
                    metrics: {
                        videoConfidenceScore: session.analysisReport.videoConfidenceScore,
                        emotionDistribution: session.analysisReport.emotionDistribution
                            ? JSON.parse(session.analysisReport.emotionDistribution)
                            : null,
                        emotionStability: fallbackEmotionStability,
                        speechQuality: session.analysisReport.speechQuality,
                        bodyLanguageScore: session.analysisReport.bodyLanguageScore,
                        postureStability,
                        gazeFocus
                    },
                    integrity: insights?.integrity || null,
                    voiceprint: insights?.voiceprint || null,
                    insights,
                    status: session.analysisReport.analysisStatus,
                    error: session.analysisReport.analysisError,
                    generatedAt: session.analysisReport.generatedAt
                    };
                })() : null
            }
        });
    } catch (error) {
        console.error('获取面试分析详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 获取分析任务列表（管理员）
 */
export const listAnalysisTasks = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);

        // 构建查询条件
        const where: any = {};

        if (status) {
            where.status = status;
        }

        // 获取任务列表
        const [tasks, total] = await Promise.all([
            prisma.aIInterviewAnalysisTask.findMany({
                where,
                skip,
                take,
                orderBy: {
                    [sortBy as string]: sortOrder as 'asc' | 'desc'
                },
                include: {
                    session: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            },
                            jobTarget: true
                        }
                    }
                }
            }),
            prisma.aIInterviewAnalysisTask.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                list: tasks.map((task: any) => ({
                    id: task.id,
                    sessionId: task.sessionId,
                    userName: task.session?.user?.name || '未知用户',
                    jobTarget: task.session?.jobTarget || '未知职位',
                    status: task.status,
                    priority: task.priority,
                    retryCount: task.retryCount,
                    maxRetries: task.maxRetries,
                    errorMessage: task.errorMessage,
                    startedAt: task.startedAt,
                    completedAt: task.completedAt,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                })),
                pagination: {
                    page: Number(page),
                    pageSize: Number(pageSize),
                    total,
                    totalPages: Math.ceil(total / Number(pageSize))
                }
            }
        });
    } catch (error) {
        console.error('获取分析任务列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 重试失败的分析任务（管理员）
 */
export const retryAnalysisTask = async (req: Request, res: Response) => {
    const runOnce = async () => {
        const { sessionId } = req.params;

        const session = await prisma.aIInterviewSession.findUnique({
            where: { id: sessionId },
            select: { id: true, status: true }
        });

        if (!session) {
            return { status: 404, body: { success: false, message: '面试会话不存在' } };
        }

        if (session.status !== 'COMPLETED') {
            return {
                status: 400,
                body: { success: false, message: `面试会话未完成，当前状态：${session.status}` }
            };
        }

        const existingReport = await prisma.aIInterviewAnalysisReport.findUnique({
            where: { sessionId }
        });

        if (existingReport && existingReport.analysisStatus !== 'FAILED') {
            return { status: 200, body: { success: true, message: '分析报告已存在' } };
        }

        const pendingTask = await prisma.aIInterviewAnalysisReport.findFirst({
            where: {
                sessionId,
                analysisStatus: { in: ['PENDING', 'PROCESSING'] }
            }
        });

        if (pendingTask) {
            return { status: 200, body: { success: true, message: '分析任务已在队列中' } };
        }

        await prisma.aIInterviewAnalysisReport.upsert({
            where: { sessionId },
            update: { analysisStatus: 'PENDING' },
            create: {
                sessionId,
                overallScore: 0,
                communicationScore: 0,
                technicalScore: 0,
                problemSolvingNewScore: 0,
                collaborationResponsibilityScore: 0,
                adaptabilityScore: 0,
                learningScore: 0,
                analysisStatus: 'PENDING'
            } as any
        });

        return { status: 200, body: { success: true, message: '分析任务已加入队列' } };
    };

    try {
        const { status, body } = await runOnce();
        return res.status(status).json(body);
    } catch (error) {
        const prismaError = error as { code?: string };
        if (prismaError?.code === 'P1017') {
            try {
                await prisma.$disconnect();
                await prisma.$connect();
                const { status, body } = await runOnce();
                return res.status(status).json(body);
            } catch (retryError) {
                console.error('重试分析任务错误:', retryError);
                return res.status(500).json({
                    success: false,
                    message: retryError instanceof Error ? retryError.message : '重试失败'
                });
            }
        }
        console.error('重试分析任务错误:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '重试失败'
        });
    }
};
