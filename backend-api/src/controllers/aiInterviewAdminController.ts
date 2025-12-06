import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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
                    userAvatar: session.user.avatar,
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
                analysisReport: true
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
                },
                questions: session.questions.map((q: any) => ({
                    index: q.questionIndex,
                    text: q.questionText,
                    answer: q.answerText,
                    videoUrl: q.answerVideoUrl,
                    duration: q.answerDuration
                })),
                report: session.analysisReport ? {
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
                    status: session.analysisReport.analysisStatus,
                    error: session.analysisReport.analysisError,
                    generatedAt: session.analysisReport.generatedAt
                } : null
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
                    userName: task.session.user.name,
                    jobTarget: task.session.jobTarget,
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
