import { prisma } from '../lib/prisma';
import { analysisService } from '../services/analysisService';
import { logSystemAction } from '../utils/systemLog';

/**
 * 分析任务队列处理器
 * 负责异步处理面试分析任务，支持重试机制
 */

interface QueueTask {
    taskId: string;
    sessionId: string;
    priority: number;
    retryCount: number;
}

class AnalysisQueue {
    private queue: QueueTask[] = [];
    private processing = false;
    private pollInterval = Number(process.env.ANALYSIS_QUEUE_POLL_INTERVAL_MS || 5000);
    private intervalId?: NodeJS.Timeout;
    private recoveryDelayMs = Number(process.env.ANALYSIS_RECOVERY_DELAY_MS || 60000);

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
     * 启动队列处理器
     */
    start() {
        if (this.intervalId) {
            console.log('[AnalysisQueue] Queue already running');
            return;
        }

        prisma.$connect().catch((error: unknown) => {
            console.warn('[AnalysisQueue] Prisma connect failed, will retry on next poll:', error);
        });

        console.log('[AnalysisQueue] Starting analysis queue processor...');
        this.intervalId = setInterval(() => {
            this.processPendingTasks();
        }, this.pollInterval);

        // 立即处理一次
        this.processPendingTasks();
    }

    /**
     * 停止队列处理器
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.log('[AnalysisQueue] Analysis queue processor stopped');
        }
    }

    /**
     * 添加分析任务
     */
    async enqueueAnalysis(sessionId: string, priority = 0): Promise<string> {
        try {
            const activeTask = await prisma.aIInterviewAnalysisTask.findFirst({
                where: {
                    sessionId,
                    status: {
                        in: ['PENDING', 'PROCESSING']
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (activeTask) {
                console.log(`[AnalysisQueue] Reuse active task for session: ${sessionId}`);
                return activeTask.id;
            }

            const existingReport = await prisma.aIInterviewAnalysisReport.findUnique({
                where: { sessionId },
                select: {
                    analysisStatus: true
                }
            });

            if (existingReport?.analysisStatus === 'COMPLETED') {
                console.log(`[AnalysisQueue] Report already completed for session: ${sessionId}`);
                return `report:${sessionId}`;
            }

            // 创建分析任务记录
            const task = await prisma.aIInterviewAnalysisTask.create({
                data: {
                    sessionId,
                    status: 'PENDING',
                    priority
                }
            });

            console.log(`[AnalysisQueue] Enqueued analysis task for session: ${sessionId}`);
            await this.logAnalysisEvent({
                action: 'ANALYSIS_ENQUEUED',
                description: `已创建分析任务 ${task.id}`,
                sessionId
            });
            return task.id;

        } catch (error) {
            console.error('[AnalysisQueue] Failed to enqueue analysis task:', error);
            await this.logAnalysisEvent({
                action: 'ANALYSIS_ENQUEUE_FAILED',
                description: '创建分析任务失败',
                sessionId,
                result: 'FAILED',
                errorMsg: error instanceof Error ? error.message : '未知错误'
            });
            throw error;
        }
    }

    /**
     * 处理待处理的任务
     */
    private async processPendingTasks() {
        if (this.processing) {
            return; // 已经在处理中
        }

        try {
            this.processing = true;
            await this.recoverStalledSessionIfNeeded();

            // 获取待处理的任务（按优先级和创建时间排序）
            const pendingTasks = await prisma.aIInterviewAnalysisTask.findMany({
                where: {
                    status: 'PENDING'
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' }
                ],
                take: 1 // 一次处理一个任务
            });

            if (pendingTasks.length === 0) {
                return;
            }

            for (const task of pendingTasks) {
                await this.processTask(task);
            }

        } catch (error) {
            console.error('[AnalysisQueue] Error processing pending tasks:', error);
            await this.handlePrismaConnectionError(error);
        } finally {
            this.processing = false;
        }
    }

    private async recoverStalledSessionIfNeeded() {
        const candidate = await prisma.aIInterviewSession.findFirst({
            where: {
                status: 'COMPLETED',
                OR: [
                    {
                        analysisReport: {
                            is: null
                        }
                    },
                    {
                        analysisReport: {
                            is: {
                                analysisStatus: {
                                    not: 'COMPLETED'
                                }
                            }
                        }
                    }
                ],
                analysisTasks: {
                    none: {
                        status: {
                            in: ['PENDING', 'PROCESSING']
                        }
                    }
                }
            },
            include: {
                analysisTasks: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                analysisReport: {
                    select: {
                        analysisStatus: true,
                        updatedAt: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'asc'
            }
        });

        if (!candidate) {
            return;
        }

        const latestTask = candidate.analysisTasks[0];
        const latestAttemptAt = latestTask?.updatedAt || candidate.analysisReport?.updatedAt || candidate.updatedAt;
        if (Date.now() - latestAttemptAt.getTime() < this.recoveryDelayMs) {
            return;
        }

        console.warn(`[AnalysisQueue] Recovering stalled analysis session: ${candidate.id}`);
        await this.enqueueAnalysis(candidate.id, 0);
        await this.logAnalysisEvent({
            action: 'ANALYSIS_RECOVERY_ENQUEUED',
            description: '检测到报告未就绪且无活跃任务，已自动重新入队',
            sessionId: candidate.id,
            result: 'WARNING'
        });
    }

    private async handlePrismaConnectionError(error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError?.code !== 'P1017') {
            return;
        }
        try {
            console.warn('[AnalysisQueue] Prisma connection dropped, reconnecting...');
            await prisma.$disconnect();
            await prisma.$connect();
            console.log('[AnalysisQueue] Prisma reconnected');
        } catch (reconnectError) {
            console.error('[AnalysisQueue] Prisma reconnect failed:', reconnectError);
        }
    }

    /**
     * 处理单个任务
     */
    private async processTask(task: any) {
        const { id: taskId, sessionId, retryCount, maxRetries } = task;

        try {
            console.log(`[AnalysisQueue] Processing task ${taskId} for session ${sessionId}`);

            // 更新任务状态为处理中
            await prisma.aIInterviewAnalysisTask.update({
                where: { id: taskId },
                data: {
                    status: 'PROCESSING',
                    startedAt: new Date()
                }
            });

            await this.logAnalysisEvent({
                action: 'ANALYSIS_STARTED',
                description: `任务 ${taskId} 开始处理`,
                sessionId
            });

            // 执行分析
            await analysisService.analyzeInterviewSession(sessionId);

            // 更新任务状态为完成
            await prisma.aIInterviewAnalysisTask.update({
                where: { id: taskId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });

            console.log(`[AnalysisQueue] Task completed: ${taskId}`);
            await this.logAnalysisEvent({
                action: 'ANALYSIS_COMPLETED',
                description: `任务 ${taskId} 处理完成`,
                sessionId
            });

        } catch (error) {
            console.error(`[AnalysisQueue] Task failed: ${taskId}`, error);

            const errorMessage = error instanceof Error ? error.message : '未知错误';

            // 检查是否需要重试
            if (retryCount < maxRetries) {
                await prisma.aIInterviewAnalysisTask.update({
                    where: { id: taskId },
                    data: {
                        status: 'PENDING',
                        retryCount: retryCount + 1,
                        errorMessage
                    }
                });

                console.log(`[AnalysisQueue] Task ${taskId} will retry (${retryCount + 1}/${maxRetries})`);
                await this.logAnalysisEvent({
                    action: 'ANALYSIS_RETRY_SCHEDULED',
                    description: `任务 ${taskId} 失败，等待重试 (${retryCount + 1}/${maxRetries})`,
                    sessionId,
                    result: 'WARNING',
                    errorMsg: errorMessage
                });

            } else {
                // 超过最大重试次数，标记为失败
                await prisma.aIInterviewAnalysisTask.update({
                    where: { id: taskId },
                    data: {
                        status: 'FAILED',
                        completedAt: new Date(),
                        errorMessage
                    }
                });

                console.error(`[AnalysisQueue] Task ${taskId} failed permanently after ${maxRetries} retries`);
                await this.logAnalysisEvent({
                    action: 'ANALYSIS_FAILED',
                    description: `任务 ${taskId} 失败并达到最大重试次数`,
                    sessionId,
                    result: 'FAILED',
                    errorMsg: errorMessage
                });
            }
        }
    }

    /**
     * 重试失败的任务
     */
    async retryFailedTask(sessionId: string): Promise<void> {
        const failedTask = await prisma.aIInterviewAnalysisTask.findFirst({
            where: {
                sessionId,
                status: 'FAILED'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!failedTask) {
            throw new Error('未找到失败的分析任务');
        }

        // 重置任务状态和重试计数
        await prisma.aIInterviewAnalysisTask.update({
            where: { id: failedTask.id },
            data: {
                status: 'PENDING',
                retryCount: 0,
                errorMessage: null,
                startedAt: null,
                completedAt: null
            }
        });

        console.log(`[AnalysisQueue] Retrying task for session: ${sessionId}`);
    }

    /**
     * 获取队列统计信息
     */
    async getQueueStats() {
        const stats = await prisma.aIInterviewAnalysisTask.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        return {
            stats,
            processing: this.processing
        };
    }
}

export const analysisQueue = new AnalysisQueue();
