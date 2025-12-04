import { prisma } from '../lib/prisma';
import { analysisService } from '../services/analysisService';

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
    private pollInterval = 5000; // 5秒轮询一次
    private intervalId?: NodeJS.Timeout;

    /**
     * 启动队列处理器
     */
    start() {
        if (this.intervalId) {
            console.log('[AnalysisQueue] Queue already running');
            return;
        }

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
            // 创建分析任务记录
            const task = await prisma.aIInterviewAnalysisTask.create({
                data: {
                    sessionId,
                    status: 'PENDING',
                    priority
                }
            });

            console.log(`[AnalysisQueue] Enqueued analysis task for session: ${sessionId}`);
            return task.id;

        } catch (error) {
            console.error('[AnalysisQueue] Failed to enqueue analysis task:', error);
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
        } finally {
            this.processing = false;
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
