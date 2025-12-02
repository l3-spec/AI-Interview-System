import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { deepseekService } from './deepseekService';
import { videoGenerationQueue } from '../queues/videoGenerationQueue';
import { interviewMediaService } from './interviewMediaService';

const prisma = new PrismaClient();

/**
 * AI面试会话管理服务
 * 负责整个面试流程的协调和管理
 */

interface CreateSessionParams {
  userId: string;
  jobId?: string;
  jobTarget: string;
  companyTarget?: string;
  background?: string;
  questionCount?: number;
  jobCategory?: string;
  jobSubCategory?: string;
}

interface SessionQuestion {
  questionIndex: number;
  questionText: string;
  audioUrl?: string;
  audioPath?: string;
  videoUrl?: string;
  duration?: number;
  status?: string;
  answerText?: string;
  answerVideoUrl?: string;
}

interface SessionData {
  sessionId: string;
  userId: string;
  jobId?: string;
  jobTarget: string;
  jobCategory?: string;
  jobSubCategory?: string;
  companyTarget?: string;
  background?: string;
  veteranPrompt?: string;
  status: string;
  currentQuestion: number;
  totalQuestions: number;
  plannedDuration?: number;
  questions: SessionQuestion[];
  createdAt: Date;
  startedAt?: Date;
}

class AIInterviewService {
  /**
   * 创建AI面试会话
   * 这是第4项功能的主要实现
   */
  async createInterviewSession(params: CreateSessionParams): Promise<{
    success: boolean;
    jobId?: string;
    sessionId?: string;
    message?: string;
    questions?: SessionQuestion[];
    prompt?: string;
    plannedDuration?: number;
    jobCategory?: string;
    jobSubCategory?: string;
    error?: string;
    resumed?: boolean;
    currentQuestion?: number;
    status?: string;
  }> {
    const {
      userId,
      jobId,
      jobTarget,
      companyTarget,
      background,
      questionCount,
      jobCategory,
      jobSubCategory,
    } = params;

    const normalizedJobId =
      typeof jobId === 'string' && jobId.trim().length > 0 ? jobId.trim() : undefined;
    const totalDurationTargetMinutes = 15;
    const minutesPerQuestion = 2.5;
    const normalizedJobCategory =
      typeof jobCategory === 'string' && jobCategory.trim().length > 0 ? jobCategory.trim() : undefined;
    const normalizedJobSubCategory =
      typeof jobSubCategory === 'string' && jobSubCategory.trim().length > 0 ? jobSubCategory.trim() : undefined;
    const maxQuestionsByDuration = Math.max(1, Math.round(totalDurationTargetMinutes / minutesPerQuestion));

    const requestedCount =
      typeof questionCount === 'number' && Number.isFinite(questionCount)
        ? Math.round(questionCount)
        : undefined;

    const baseFallbackCount = Math.max(4, maxQuestionsByDuration);

    let normalizedQuestionCount = requestedCount ?? baseFallbackCount;
    normalizedQuestionCount = Math.max(1, Math.min(normalizedQuestionCount, 20));
    const cappedByDuration = Math.min(normalizedQuestionCount, maxQuestionsByDuration);
    if (cappedByDuration !== normalizedQuestionCount) {
      console.log(
        `问题数量因30分钟时长限制从 ${normalizedQuestionCount} 调整为 ${cappedByDuration}（每题约${minutesPerQuestion}分钟）`
      );
    }
    normalizedQuestionCount = cappedByDuration;
    if (!requestedCount) {
      console.log(`根据15分钟面试时长目标自动设定问题数量为 ${normalizedQuestionCount}`);
    }

    try {
      const logCategory = normalizedJobCategory ?? '通用面试';
      const logSubCategory = normalizedJobSubCategory ?? jobTarget;
      console.log(
        `开始创建AI面试会话: 用户${userId}, 岗位ID:${normalizedJobId ?? '无'}, 职位${jobTarget}, 大类${logCategory}, 小类${logSubCategory}`
      );

      const existingSession = await prisma.aIInterviewSession.findFirst({
        where: {
          userId,
          ...(normalizedJobId ? { jobId: normalizedJobId } : { jobTarget }),
          status: {
            in: ['PREPARING', 'IN_PROGRESS'],
          },
        },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (existingSession) {
        console.log(`发现未完成的会话 ${existingSession.id}，直接返回继续面试`);

        const existingQuestions: SessionQuestion[] = existingSession.questions.map((q: any) => ({
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          audioUrl: q.audioUrl || undefined,
          audioPath: q.audioPath || undefined,
          videoUrl: q.videoUrl || undefined,
          duration: q.answerDuration || undefined,
          status: q.status || undefined,
          answerText: q.answerText || undefined,
          answerVideoUrl: q.answerVideoUrl || undefined,
        }));

        const needsMediaRegeneration = existingQuestions.some(
          q => !q.videoUrl || !q.audioUrl || (q.status && q.status !== 'READY')
        );
        if (needsMediaRegeneration) {
          this.triggerQuestionMediaGeneration(existingSession.id, true);
        }

        return {
          success: true,
          jobId: existingSession.jobId || normalizedJobId,
          sessionId: existingSession.id,
          message: '发现未完成的面试会话，继续为您恢复进度',
          questions: existingQuestions,
          prompt: existingSession.prompt || undefined,
          plannedDuration: existingSession.plannedDuration || undefined,
          jobCategory: existingSession.jobCategory || undefined,
          jobSubCategory: existingSession.jobSubCategory || undefined,
          resumed: true,
          currentQuestion: existingSession.currentQuestion,
          status: existingSession.status,
        };
      }

      const reusableSession = await prisma.aIInterviewSession.findFirst({
        where: {
          userId,
          ...(normalizedJobId ? { jobId: normalizedJobId } : { jobTarget }),
          jobCategory: normalizedJobCategory ?? null,
          jobSubCategory: normalizedJobSubCategory ?? null,
          status: {
            in: ['COMPLETED', 'CANCELLED'],
          },
          questions: {
            some: {},
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (reusableSession && reusableSession.questions.length > 0) {
        console.log(
          `发现历史面试题可复用: 会话${reusableSession.id}，用户${userId}，职位${jobTarget}`
        );

        const sessionId = uuidv4();
        const reusedQuestions = reusableSession.questions;
        const totalQuestions = reusedQuestions.length;
        const plannedDurationMinutes =
          reusableSession.plannedDuration ?? Math.min(30, Math.max(5, totalQuestions * minutesPerQuestion));

        await prisma.aIInterviewSession.create({
          data: {
            id: sessionId,
            userId,
            jobId: normalizedJobId,
            jobTarget,
            jobCategory: normalizedJobCategory,
            jobSubCategory: normalizedJobSubCategory,
            companyTarget,
            background,
            status: 'PREPARING',
            totalQuestions,
            plannedDuration: plannedDurationMinutes,
            prompt: reusableSession.prompt,
          },
        });

        const sessionQuestions: SessionQuestion[] = [];

        for (const question of reusedQuestions) {
          const questionStatus = question.status && question.status.length > 0
            ? question.status
            : question.audioUrl || question.audioPath
              ? 'READY'
              : 'PREPARING';

          await prisma.aIInterviewQuestion.create({
            data: {
              sessionId,
              questionIndex: question.questionIndex,
              questionText: question.questionText,
              audioUrl: question.audioUrl || undefined,
              audioPath: question.audioPath || undefined,
              videoUrl: question.videoUrl || undefined,
              status: questionStatus,
            },
          });

          sessionQuestions.push({
            questionIndex: question.questionIndex,
            questionText: question.questionText,
            audioUrl: question.audioUrl || undefined,
            audioPath: question.audioPath || undefined,
            videoUrl: question.videoUrl || undefined,
            status: questionStatus,
          });
        }

        this.triggerQuestionMediaGeneration(sessionId, true);

        return {
          success: true,
          jobId: normalizedJobId,
          sessionId,
          message: '已为您复用历史面试题',
          questions: sessionQuestions,
          prompt: reusableSession.prompt || undefined,
          plannedDuration: plannedDurationMinutes,
          jobCategory: normalizedJobCategory,
          jobSubCategory: normalizedJobSubCategory,
          resumed: false,
          currentQuestion: 0,
          status: 'PREPARING',
        };
      }

      const sessionId = uuidv4();
      const personaInstruction = this.composeVeteranInstruction(
        jobTarget,
        normalizedJobCategory,
        normalizedJobSubCategory
      );

      console.log('正在生成面试问题...');
      const generationResult = await deepseekService.generateInterviewQuestions({
        jobTarget,
        companyTarget,
        background,
        questionCount: normalizedQuestionCount,
        jobCategory: normalizedJobCategory,
        jobSubCategory: normalizedJobSubCategory,
        personaInstruction,
        estimatedDurationMinutes: Math.min(
          totalDurationTargetMinutes,
          Math.max(8, Math.round(normalizedQuestionCount * minutesPerQuestion))
        ),
      });

      const generatedQuestions = generationResult.questions;
      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error('问题生成失败');
      }

      const totalQuestions = generatedQuestions.length;
      const estimatedDurationMinutes = Math.min(
        totalDurationTargetMinutes,
        Math.max(8, Math.round(totalQuestions * minutesPerQuestion))
      );

      console.log(
        `成功生成 ${totalQuestions} 个问题（请求${normalizedQuestionCount}个），预估时长 ${estimatedDurationMinutes} 分钟`
      );

      // 1. 创建会话记录
      const session = await prisma.aIInterviewSession.create({
        data: {
          id: sessionId,
          userId,
          jobId: normalizedJobId,
          jobTarget,
          jobCategory: normalizedJobCategory,
          jobSubCategory: normalizedJobSubCategory,
          companyTarget,
          background,
          status: 'PREPARING',
          totalQuestions,
          plannedDuration: estimatedDurationMinutes,
          prompt: generationResult.prompt,
        },
      });

      // 3. 保存问题占位，并标记为 PREPARING
      const sessionQuestions: SessionQuestion[] = [];
      for (let i = 0; i < generatedQuestions.length; i++) {
        const question = generatedQuestions[i];

        const sessionQuestion: SessionQuestion = {
          questionIndex: i,
          questionText: question,
          status: 'PREPARING',
        };

        sessionQuestions.push(sessionQuestion);

        // 保存到数据库
        await prisma.aIInterviewQuestion.create({
          data: {
            sessionId,
            questionIndex: i,
            questionText: question,
            status: 'PREPARING',
          },
        });
      }

      console.log('面试会话创建成功:', sessionId);

      this.triggerQuestionMediaGeneration(sessionId);

      return {
        success: true,
        jobId: normalizedJobId,
        sessionId,
        message: '面试会话创建成功',
        questions: sessionQuestions,
        prompt: generationResult.prompt,
        plannedDuration: estimatedDurationMinutes,
        jobCategory: normalizedJobCategory,
        jobSubCategory: normalizedJobSubCategory,
        resumed: false,
        currentQuestion: 0,
        status: 'PREPARING',
      };
    } catch (error) {
      console.error('创建面试会话失败:', error);

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        return {
          success: false,
          error: '数据库缺少必要字段，请先运行 `npm run prisma:migrate` 同步最新结构后重试。',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '创建面试会话失败',
      };
    }
  }

  private triggerQuestionMediaGeneration(sessionId: string, regenerateMissingOnly = false): void {
    const mode = (process.env.AI_MEDIA_GENERATION_MODE || 'queue').toLowerCase();

    if (mode === 'inline') {
      interviewMediaService
        .processSession(sessionId, { regenerateMissingOnly })
        .catch(error => console.error('内联生成题目媒体失败:', error));
      return;
    }

    videoGenerationQueue
      .add(
        'generate',
        { sessionId, regenerateMissingOnly },
        {
          removeOnComplete: true,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        }
      )
      .catch(error => {
        console.error('媒体生成任务入队失败，降级为内联处理:', error);
        interviewMediaService
          .processSession(sessionId, { regenerateMissingOnly })
          .catch(err => console.error('内联生成题目媒体失败:', err));
      });
  }

  private composeVeteranInstruction(jobTarget: string, jobCategory?: string, jobSubCategory?: string): string {
    const categoryText = jobCategory ? `${jobCategory}领域` : '相关行业';
    const focusRole = jobSubCategory || jobTarget;

    return `请以一名在${categoryText}深耕十余年的资深面试官身份来设计问题。你熟悉${focusRole}岗位的真实业务场景、用人痛点和成长路径，习惯以“老炮”的语气提出犀利但真诚的问题。`;
  }

  /**
   * 获取面试会话详情
   */
  async getInterviewSession(sessionId: string): Promise<{
    success: boolean;
    session?: SessionData;
    error?: string;
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      const sessionData: SessionData = {
        sessionId: session.id,
        userId: session.userId,
        jobId: session.jobId || undefined,
        jobTarget: session.jobTarget,
        jobCategory: session.jobCategory || undefined,
        jobSubCategory: session.jobSubCategory || undefined,
        companyTarget: session.companyTarget || undefined,
        background: session.background || undefined,
        veteranPrompt: session.prompt || undefined,
        status: session.status,
        currentQuestion: session.currentQuestion,
        totalQuestions: session.totalQuestions,
        plannedDuration: session.plannedDuration || undefined,
        questions: session.questions.map((q: any) => ({
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          audioUrl: q.audioUrl,
          audioPath: q.audioPath,
          videoUrl: q.videoUrl || undefined,
          duration: q.answerDuration,
          status: q.status || undefined,
          answerText: q.answerText || undefined,
          answerVideoUrl: q.answerVideoUrl || undefined,
        })),
        createdAt: session.createdAt,
        startedAt: session.startedAt || undefined,
      };

      return {
        success: true,
        session: sessionData,
      };
    } catch (error) {
      console.error('获取面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取面试会话失败',
      };
    }
  }

  /**
   * 开始面试会话
   */
  async startInterviewSession(sessionId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      if (session.status !== 'PREPARING') {
        return {
          success: false,
          error: '面试会话状态不正确',
        };
      }

      // 更新会话状态
      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          currentQuestion: 0,
        },
      });

      return {
        success: true,
        message: '面试会话已开始',
      };
    } catch (error) {
      console.error('开始面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '开始面试会话失败',
      };
    }
  }

  /**
   * 提交问题答案
   */
  async submitAnswer(
    sessionId: string,
    questionIndex: number,
    answerText: string,
    videoUrl?: string,
    videoPath?: string,
    duration?: number
  ): Promise<{
    success: boolean;
    message?: string;
    nextQuestion?: number;
    isCompleted?: boolean;
    error?: string;
  }> {
    try {
      // 更新问题答案
      await prisma.aIInterviewQuestion.updateMany({
        where: {
          sessionId,
          questionIndex: questionIndex,
        },
        data: {
          answerText,
          answerVideoUrl: videoUrl,
          answerVideoPath: videoPath,
          answerDuration: duration,
          answeredAt: new Date(),
        },
      });

      // 更新会话状态
      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          currentQuestion: questionIndex + 1,
        },
      });

      // 检查是否完成所有问题
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      const isCompleted = session.currentQuestion >= session.totalQuestions;

      if (isCompleted) {
        // 完成面试
        await prisma.aIInterviewSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          message: '面试已完成',
          isCompleted: true,
        };
      }

      return {
        success: true,
        message: '答案提交成功',
        nextQuestion: session.currentQuestion,
        isCompleted: false,
      };
    } catch (error) {
      console.error('提交答案失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '提交答案失败',
      };
    }
  }

  /**
   * 完成面试会话
   */
  async completeInterviewSession(sessionId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      // 计算面试时长
      const duration = session.startedAt
        ? Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000)
        : 0;

      // 更新会话状态
      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: duration,
        },
      });

      return {
        success: true,
        message: '面试会话已完成',
      };
    } catch (error) {
      console.error('完成面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '完成面试会话失败',
      };
    }
  }

  /**
   * 获取用户未完成的面试会话
   */
  async getUnfinishedSession(userId: string): Promise<{
    success: boolean;
    session?: SessionData;
    error?: string;
  }> {
    try {
      const unfinishedSession = await prisma.aIInterviewSession.findFirst({
        where: {
          userId,
          status: {
            in: ['PREPARING', 'IN_PROGRESS'],
          },
        },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (!unfinishedSession) {
        return {
          success: false,
          error: '没有未完成的面试会话',
        };
      }

      const sessionData: SessionData = {
        sessionId: unfinishedSession.id,
        userId: unfinishedSession.userId,
        jobId: unfinishedSession.jobId || undefined,
        jobTarget: unfinishedSession.jobTarget,
        companyTarget: unfinishedSession.companyTarget || undefined,
        background: unfinishedSession.background || undefined,
        status: unfinishedSession.status,
        currentQuestion: unfinishedSession.currentQuestion,
        totalQuestions: unfinishedSession.totalQuestions,
        questions: unfinishedSession.questions.map((q: any) => ({
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          audioUrl: q.audioUrl,
          audioPath: q.audioPath,
          duration: q.answerDuration,
        })),
        createdAt: unfinishedSession.createdAt,
        startedAt: unfinishedSession.startedAt || undefined,
      };

      return {
        success: true,
        session: sessionData,
      };
    } catch (error) {
      console.error('获取未完成面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取未完成面试会话失败',
      };
    }
  }

  /**
   * 获取面试会话列表
   */
  async getInterviewSessions(userId: string): Promise<{
    success: boolean;
    sessions?: any[];
    error?: string;
  }> {
    try {
      const sessions = await prisma.aIInterviewSession.findMany({
        where: { userId },
        include: {
          questions: {
            select: {
              questionIndex: true,
              questionText: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      console.error('获取面试会话列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取面试会话列表失败',
      };
    }
  }

  /**
   * 取消面试会话
   */
  async cancelInterviewSession(sessionId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      if (session.status === 'COMPLETED') {
        return {
          success: false,
          error: '已完成的面试会话无法取消',
        };
      }

      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
        },
      });

      return {
        success: true,
        message: '面试会话已取消',
      };
    } catch (error) {
      console.error('取消面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '取消面试会话失败',
      };
    }
  }

  /**
   * 删除面试会话
   */
  async deleteInterviewSession(sessionId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
        };
      }

      // 删除关联的问题和音频文件
      await prisma.aIInterviewQuestion.deleteMany({
        where: { sessionId },
      });

      // await prisma.aIInterviewAudio.deleteMany({ where: { sessionId } }); // 暂时注释掉，因为模型可能不存在

      // 删除会话
      await prisma.aIInterviewSession.delete({
        where: { id: sessionId },
      });

      return {
        success: true,
        message: '面试会话已删除',
      };
    } catch (error) {
      console.error('删除面试会话失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除面试会话失败',
      };
    }
  }

  /**
   * 获取下一个问题
   */
  async getNextQuestion(sessionId: string): Promise<{
    success: boolean;
    question?: SessionQuestion;
    isCompleted?: boolean;
    error?: string;
  }> {
    try {
      const session = await this.getInterviewSession(sessionId);
      if (!session.success || !session.session) {
        return {
          success: false,
          error: session.error || '会话不存在',
        };
      }

      const sessionData = session.session;
      
      if (sessionData.currentQuestion >= sessionData.totalQuestions) {
        return {
          success: true,
          isCompleted: true,
        };
      }

      const nextQuestion = sessionData.questions[sessionData.currentQuestion];

      if (!nextQuestion) {
        return {
          success: false,
          error: '问题不存在',
        };
      }

      if (!nextQuestion.videoUrl) {
        this.triggerQuestionMediaGeneration(sessionId, true);
      }

      // 更新当前问题索引
      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          currentQuestion: sessionData.currentQuestion + 1,
        },
      });

      return {
        success: true,
        question: nextQuestion,
        isCompleted: false,
      };

    } catch (error) {
      console.error('获取下一个问题失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取下一个问题失败',
      };
    }
  }
}

export const aiInterviewService = new AIInterviewService(); 
