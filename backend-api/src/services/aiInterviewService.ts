import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { deepseekService } from './deepseekService';
import { videoGenerationQueue } from '../queues/videoGenerationQueue';
import { interviewMediaService } from './interviewMediaService';
import { buildObjectKey, resolveVideoUrl } from '../utils/videoUrlResolver';
import { prisma } from '../lib/prisma';

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

type SessionAccessCode = 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE' | 'INVALID_QUESTION';

interface ResumeReportBestMatch {
  title: string;
  description: string;
  matchRatio: number;
}

interface ResumeReportCompetency {
  name: string;
  score: number;
  ratingLabel: string;
  description: string;
}

interface ResumeReportRecommendedJob {
  title: string;
  salaryRange: string;
  tags: string[];
  companyName: string;
  companyDescription: string;
  location: string;
}

interface ResumeReportData {
  title: string;
  testedAt: string;
  bestMatch: ResumeReportBestMatch;
  competencies: ResumeReportCompetency[];
  tips: string;
  generatedNote: string;
  recommendedJobs: ResumeReportRecommendedJob[];
}

type JobPreferenceMatch = {
  positionIds: Set<string>;
  categoryNames: Set<string>;
  positionNames: Set<string>;
};

const REPORT_COMPETENCY_ORDER: Array<{
  name: string;
  fallbackKey:
    | 'technicalScore'
    | 'teamworkScore'
    | 'communicationScore'
    | 'adaptabilityScore'
    | 'learningScore'
    | 'problemSolvingScore';
}> = [
  { name: '学习研究', fallbackKey: 'technicalScore' },
  { name: '团队协作', fallbackKey: 'teamworkScore' },
  { name: '人际沟通', fallbackKey: 'communicationScore' },
  { name: '压力承受', fallbackKey: 'adaptabilityScore' },
  { name: '成就导向', fallbackKey: 'learningScore' },
  { name: '开放创新', fallbackKey: 'problemSolvingScore' },
];

const parseJsonArray = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch (error) {
    console.warn('[AIInterviewService] JSON 数组解析失败:', error);
    return [];
  }
};

const extractCompanyStageFromStats = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return '';
    }

    const target = parsed.find((item: any) => {
      const label = typeof item?.label === 'string' ? item.label.trim() : '';
      return label === '融资阶段';
    });

    return typeof target?.value === 'string' ? target.value.trim() : '';
  } catch (error) {
    console.warn('[AIInterviewService] 解析公司融资阶段失败:', error);
    return '';
  }
};

const splitMultiline = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
};

const formatMonthDay = (date: Date): string => `${date.getMonth() + 1}月${date.getDate()}日`;

const formatTestedAt = (date: Date): string => {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `测试日期 ${formatMonthDay(date)} ${hour}:${minute}`;
};

const toRatio = (value?: number | null, fallback = 0): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100));
  }

  return Math.max(0, Math.min(1, value));
};

const toRatingLabel = (score: number): string => {
  if (score >= 0.9) return '优秀';
  if (score >= 0.8) return '良好';
  if (score >= 0.7) return '中等';
  if (score >= 0.6) return '及格';
  return '待提升';
};

const normalizeText = (value?: string | null): string => (value || '').trim().toLowerCase();

class AIInterviewService {
  private async resolveCompanyTargetInput(
    jobId?: string,
    companyTarget?: string
  ): Promise<string | undefined> {
    const directCompanyTarget =
      typeof companyTarget === 'string' && companyTarget.trim().length > 0
        ? companyTarget.trim()
        : undefined;

    if (directCompanyTarget) {
      return directCompanyTarget;
    }

    if (!jobId) {
      return undefined;
    }

    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });

      return job?.company?.name?.trim() || undefined;
    } catch (error) {
      console.warn('[AIInterviewService] 反查岗位所属公司失败:', error);
      return undefined;
    }
  }

  /**
   * 仅当 id 在 jobs 表存在时返回，用于写入 AIInterviewSession.jobId，避免 P2003 外键错误。
   * 客户端可能传入字典位 id、过期 id 等非法 jobId，此时不关联岗位，仅依赖 jobTarget 等文字字段。
   */
  private async resolveJobIdForSession(jobId?: string): Promise<string | undefined> {
    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      return undefined;
    }
    const id = jobId.trim();
    const row = await prisma.job.findUnique({ where: { id }, select: { id: true } });
    if (!row) {
      console.warn(
        `[AIInterviewService] jobId 在 jobs 表中不存在，将不写入会话的 job 外键: ${id}`
      );
      return undefined;
    }
    return id;
  }

  private hasQuestionAnswer(question: {
    answerText?: string | null;
    answerVideoUrl?: string | null;
    answerVideoPath?: string | null;
  }): boolean {
    return Boolean(
      question.answerVideoUrl ||
      question.answerVideoPath ||
      (question.answerText && question.answerText.trim().length > 0)
    );
  }

  private getNextUnansweredQuestionIndex(
    questions: Array<{
      questionIndex: number;
      answerText?: string | null;
      answerVideoUrl?: string | null;
      answerVideoPath?: string | null;
    }>
  ): number {
    const nextQuestion = questions
      .slice()
      .sort((a, b) => a.questionIndex - b.questionIndex)
      .find(question => !this.hasQuestionAnswer(question));

    return nextQuestion ? nextQuestion.questionIndex : questions.length;
  }

  private toSessionQuestion(question: any, includeAnswer = false): SessionQuestion {
    return {
      questionIndex: question.questionIndex,
      questionText: question.questionText,
      audioUrl: question.audioUrl || undefined,
      audioPath: question.audioPath || undefined,
      videoUrl: question.videoUrl || undefined,
      duration: question.answerDuration || undefined,
      status: question.status || undefined,
      ...(includeAnswer
        ? {
            answerText: question.answerText || undefined,
            answerVideoUrl: question.answerVideoUrl || undefined,
          }
        : {}),
    };
  }

  private getPlayableQuestion(questions: any[], questionIndex: number): SessionQuestion[] {
    const question = questions.find(q => q.questionIndex === questionIndex);
    return question ? [this.toSessionQuestion(question)] : [];
  }

  private resolveResumeQuestionIndex(session: {
    currentQuestion: number;
    totalQuestions: number;
    questions: Array<{
      questionIndex: number;
      answerText?: string | null;
      answerVideoUrl?: string | null;
      answerVideoPath?: string | null;
    }>;
  }): number {
    const nextUnanswered = this.getNextUnansweredQuestionIndex(session.questions);
    return Math.max(0, Math.min(nextUnanswered, session.totalQuestions));
  }

  private async syncResumeProgress(session: {
    id: string;
    status: string;
    startedAt?: Date | null;
    currentQuestion: number;
    totalQuestions: number;
    questions: Array<{
      questionIndex: number;
      answerText?: string | null;
      answerVideoUrl?: string | null;
      answerVideoPath?: string | null;
    }>;
  }): Promise<{ currentQuestion: number; status: string; isCompleted: boolean }> {
    const currentQuestion = this.resolveResumeQuestionIndex(session);
    const isCompleted = currentQuestion >= session.totalQuestions;
    const status = isCompleted ? 'COMPLETED' : session.status === 'PREPARING' ? 'IN_PROGRESS' : session.status;

    if (session.currentQuestion !== currentQuestion || session.status !== status || (!session.startedAt && !isCompleted)) {
      await prisma.aIInterviewSession.update({
        where: { id: session.id },
        data: {
          currentQuestion,
          status,
          ...(session.startedAt || isCompleted ? {} : { startedAt: new Date() }),
          ...(isCompleted ? { completedAt: new Date() } : {}),
        },
      });
    }

    return { currentQuestion, status, isCompleted };
  }

  private async queueAnalysisIfNeeded(sessionId: string, priority = 0): Promise<void> {
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
  }

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
    totalQuestions?: number;
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
    const resolvedJobId = await this.resolveJobIdForSession(normalizedJobId);
    const normalizedCompanyTarget = await this.resolveCompanyTargetInput(resolvedJobId, companyTarget);
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
        `开始创建AI面试会话: 用户${userId}, 岗位ID(请求):${normalizedJobId ?? '无'}, 关联有效:${resolvedJobId ?? '无'}, 职位${jobTarget}, 大类${logCategory}, 小类${logSubCategory}`
      );

      const existingSession = await prisma.aIInterviewSession.findFirst({
        where: {
          userId,
          ...(resolvedJobId ? { jobId: resolvedJobId } : { jobTarget }),
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

        const progress = await this.syncResumeProgress(existingSession);
        const playableQuestions = progress.isCompleted
          ? []
          : this.getPlayableQuestion(existingSession.questions, progress.currentQuestion);

        const needsMediaRegeneration = playableQuestions.some(
          q => !q.videoUrl || !q.audioUrl || (q.status && q.status !== 'READY')
        );
        if (needsMediaRegeneration) {
          this.triggerQuestionMediaGeneration(existingSession.id, true);
        }

        if (progress.isCompleted) {
          try {
            await this.queueAnalysisIfNeeded(existingSession.id, 0);
          } catch (error) {
            console.error('[AIInterview] 恢复时创建分析任务失败:', error);
          }
        }

        return {
          success: true,
          jobId: existingSession.jobId || resolvedJobId,
          sessionId: existingSession.id,
          message: progress.isCompleted
            ? '面试已完成'
            : `发现未完成的面试会话，继续从第${progress.currentQuestion + 1}题恢复`,
          questions: playableQuestions,
          totalQuestions: existingSession.totalQuestions,
          prompt: existingSession.prompt || undefined,
          plannedDuration: existingSession.plannedDuration || undefined,
          jobCategory: existingSession.jobCategory || undefined,
          jobSubCategory: existingSession.jobSubCategory || undefined,
          resumed: true,
          currentQuestion: progress.currentQuestion,
          status: progress.status,
        };
      }

      const reusableSession = await prisma.aIInterviewSession.findFirst({
        where: {
          userId,
          ...(resolvedJobId ? { jobId: resolvedJobId } : { jobTarget }),
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
            jobId: resolvedJobId,
            jobTarget,
            jobCategory: normalizedJobCategory,
            jobSubCategory: normalizedJobSubCategory,
            companyTarget: normalizedCompanyTarget,
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
          jobId: resolvedJobId,
          sessionId,
          message: '已为您复用历史面试题',
          questions: this.getPlayableQuestion(sessionQuestions, 0),
          totalQuestions,
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
        companyTarget: normalizedCompanyTarget,
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
          jobId: resolvedJobId,
          jobTarget,
          jobCategory: normalizedJobCategory,
          jobSubCategory: normalizedJobSubCategory,
          companyTarget: normalizedCompanyTarget,
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
        jobId: resolvedJobId,
        sessionId,
        message: '面试会话创建成功',
        questions: this.getPlayableQuestion(sessionQuestions, 0),
        totalQuestions,
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
  async getInterviewSession(sessionId: string, userId?: string): Promise<{
    success: boolean;
    session?: SessionData;
    error?: string;
    code?: SessionAccessCode;
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
          code: 'NOT_FOUND',
        };
      }

      if (userId && session.userId !== userId) {
        return {
          success: false,
          error: '无权访问该面试会话',
          code: 'FORBIDDEN',
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
    duration?: number,
    userId?: string
  ): Promise<{
    success: boolean;
    message?: string;
    nextQuestion?: number;
    isCompleted?: boolean;
    error?: string;
    code?: SessionAccessCode;
  }> {
    try {
      if (!videoUrl && !videoPath) {
        return {
          success: false,
          error: '必须先上传答题视频到OSS并携带videoUrl/videoPath后才能提交答案',
        };
      }

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
          code: 'NOT_FOUND',
        };
      }

      if (userId && session.userId !== userId) {
        return {
          success: false,
          error: '无权提交该面试会话的答案',
          code: 'FORBIDDEN',
        };
      }

      if (!['PREPARING', 'IN_PROGRESS'].includes(session.status)) {
        return {
          success: false,
          error: `当前面试状态不允许继续答题：${session.status}`,
          code: 'INVALID_STATE',
        };
      }

      if (questionIndex < 0 || questionIndex >= session.totalQuestions) {
        return {
          success: false,
          error: '问题索引超出范围',
          code: 'INVALID_QUESTION',
        };
      }

      const targetQuestion = session.questions.find(question => question.questionIndex === questionIndex);
      if (!targetQuestion) {
        return {
          success: false,
          error: '面试题目不存在',
          code: 'INVALID_QUESTION',
        };
      }

      const normalized = this.normalizeVideoInfo(sessionId, videoUrl, videoPath, questionIndex);

      // 更新问题答案
      const updateResult = await prisma.aIInterviewQuestion.updateMany({
        where: {
          sessionId,
          questionIndex: questionIndex,
        },
        data: {
          answerText,
          answerVideoUrl: normalized.videoUrl,
          answerVideoPath: normalized.videoPath,
          answerDuration: duration,
          answeredAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return {
          success: false,
          error: '提交失败，未匹配到对应题目',
          code: 'INVALID_QUESTION',
        };
      }

      void this.recordConversationTurn(sessionId, {
        speaker: 'CANDIDATE',
        candidateVideoUrl: normalized.videoUrl,
        candidateText: answerText || undefined,
        questionIndex,
      })
        .then(() => undefined)
        .catch(() => undefined);

      const refreshedSession = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (!refreshedSession) {
        return {
          success: false,
          error: '面试会话不存在',
          code: 'NOT_FOUND',
        };
      }

      const nextQuestionIndex = this.getNextUnansweredQuestionIndex(refreshedSession.questions);
      const isCompleted = nextQuestionIndex >= refreshedSession.totalQuestions;

      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: refreshedSession.status === 'PREPARING' ? 'IN_PROGRESS' : refreshedSession.status,
          startedAt: refreshedSession.startedAt || new Date(),
          currentQuestion: nextQuestionIndex,
          ...(isCompleted
            ? {
                status: 'COMPLETED',
                completedAt: refreshedSession.completedAt || new Date(),
              }
            : {}),
        },
      });

      if (isCompleted) {
        try {
          await this.queueAnalysisIfNeeded(sessionId, 0);
          console.log(`[AIInterview] 已为会话 ${sessionId} 创建分析任务`);
        } catch (error) {
          console.error('[AIInterview] 创建分析任务失败:', error);
        }

        return {
          success: true,
          message: '面试已完成',
          isCompleted: true,
        };
      }

      return {
        success: true,
        message: '答案提交成功',
        nextQuestion: nextQuestionIndex,
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
   * 将上传的视频URL绑定到指定题目，便于后续异步分析
   */
  async attachAnswerVideo(
    sessionId: string,
    questionIndex: number,
    videoUrl: string,
    durationMs?: number
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const normalized = this.normalizeVideoInfo(sessionId, videoUrl, undefined, questionIndex);
      const updateResult = await prisma.aIInterviewQuestion.updateMany({
        where: { sessionId, questionIndex },
        data: {
          answerVideoUrl: normalized.videoUrl,
          answerVideoPath: normalized.videoPath,
          answerDuration: durationMs ? Math.max(1, Math.round(durationMs / 1000)) : undefined,
          answeredAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return { success: false, error: '面试题目不存在' };
      }

      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      const videoForTurn = normalized.videoUrl || videoUrl;
      await this.mergeCandidateVideoIntoConversationTurn(sessionId, questionIndex, videoForTurn);

      return { success: true, message: '已绑定面试视频链接' };
    } catch (error) {
      console.error('绑定面试视频链接失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '绑定面试视频链接失败',
      };
    }
  }

  /**
   * 把答题视频合并到最近一条「同题号、尚无视频」的候选人沟通记录，避免重复插入仅含视频的回合。
   */
  private async mergeCandidateVideoIntoConversationTurn(
    sessionId: string,
    questionIndex: number,
    videoUrl: string
  ): Promise<void> {
    const trimmed = (videoUrl || '').trim();
    if (!trimmed) {
      return;
    }
    const turn = await prisma.aIInterviewConversationTurn.findFirst({
      where: {
        sessionId,
        speaker: 'CANDIDATE',
        questionIndex,
        OR: [{ candidateVideoUrl: null }, { candidateVideoUrl: '' }],
      },
      orderBy: { sequence: 'desc' },
    });
    if (turn) {
      await prisma.aIInterviewConversationTurn.update({
        where: { id: turn.id },
        data: { candidateVideoUrl: trimmed },
      });
      return;
    }
    await this.recordConversationTurn(sessionId, {
      speaker: 'CANDIDATE',
      candidateVideoUrl: trimmed,
      questionIndex,
    });
  }

  /**
   * 客户端在 Socket 记录候选人文本后，按 sequence 补传该轮答题视频（OSS URL 或对象路径）。
   */
  async attachCandidateVideoToConversationTurn(params: {
    sessionId: string;
    userId: string;
    sequence: number;
    videoUrl?: string;
    videoPath?: string;
    durationMs?: number;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const { sessionId, userId, sequence, videoUrl, videoPath, durationMs } = params;

    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        select: { userId: true },
      });
      if (!session) {
        return { success: false, error: '面试会话不存在' };
      }
      if (session.userId !== userId) {
        return { success: false, error: '无权操作该会话' };
      }

      const turn = await prisma.aIInterviewConversationTurn.findFirst({
        where: { sessionId, sequence, speaker: 'CANDIDATE' },
      });
      if (!turn) {
        return { success: false, error: '未找到对应的候选人沟通记录' };
      }

      const normalized = this.normalizeVideoInfo(
        sessionId,
        videoUrl,
        videoPath,
        typeof turn.questionIndex === 'number' ? turn.questionIndex : undefined
      );
      const finalUrl = (normalized.videoUrl || videoUrl || '').trim();
      if (!finalUrl) {
        return { success: false, error: '请提供有效的 videoUrl 或上传文件' };
      }

      await prisma.aIInterviewConversationTurn.update({
        where: { id: turn.id },
        data: { candidateVideoUrl: finalUrl },
      });

      if (typeof turn.questionIndex === 'number') {
        await prisma.aIInterviewQuestion.updateMany({
          where: { sessionId, questionIndex: turn.questionIndex },
          data: {
            answerVideoUrl: finalUrl,
            answerVideoPath: normalized.videoPath,
            answerDuration: durationMs ? Math.max(1, Math.round(durationMs / 1000)) : undefined,
            answeredAt: new Date(),
          },
        });
      }

      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return { success: true, message: '已保存该轮答题视频' };
    } catch (error) {
      console.error('绑定沟通回合视频失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '绑定沟通回合视频失败',
      };
    }
  }

  /**
   * 追加一条沟通记录（数字人文本 / 用户视频与文本），按 sequence 有序存储。
   */
  async recordConversationTurn(
    sessionId: string,
    payload: {
      speaker: 'AVATAR' | 'CANDIDATE';
      avatarText?: string;
      candidateVideoUrl?: string;
      candidateText?: string;
      questionIndex?: number;
    }
  ): Promise<{ sequence: number; id: string } | null> {
    const hasAvatar = payload.speaker === 'AVATAR' && (payload.avatarText || '').trim().length > 0;
    const hasCandidate =
      payload.speaker === 'CANDIDATE' &&
      ((payload.candidateVideoUrl || '').trim().length > 0 || (payload.candidateText || '').trim().length > 0);
    if (!hasAvatar && !hasCandidate) {
      return null;
    }

    try {
      const exists = await prisma.aIInterviewSession.count({ where: { id: sessionId } });
      if (!exists) {
        return null;
      }

      const agg = await prisma.aIInterviewConversationTurn.aggregate({
        where: { sessionId },
        _max: { sequence: true },
      });
      const nextSeq = (agg._max.sequence ?? -1) + 1;

      const row = await prisma.aIInterviewConversationTurn.create({
        data: {
          sessionId,
          sequence: nextSeq,
          speaker: payload.speaker,
          avatarText: hasAvatar ? (payload.avatarText || '').trim() : null,
          candidateVideoUrl:
            payload.speaker === 'CANDIDATE' ? (payload.candidateVideoUrl || '').trim() || null : null,
          candidateText:
            payload.speaker === 'CANDIDATE' ? (payload.candidateText || '').trim() || null : null,
          questionIndex: typeof payload.questionIndex === 'number' ? payload.questionIndex : null,
        },
      });
      return { sequence: nextSeq, id: row.id };
    } catch (err) {
      console.warn(`[AIInterview] recordConversationTurn failed session=${sessionId}`, err);
      return null;
    }
  }

  private normalizeVideoInfo(
    sessionId: string,
    videoUrl?: string,
    videoPath?: string,
    questionIndex?: number
  ): { videoUrl?: string; videoPath?: string } {
    const isLocalPath = videoPath && fs.existsSync(videoPath);
    const objectKey = buildObjectKey({
      sessionId,
      answerVideoUrl: videoUrl,
      answerVideoPath: isLocalPath ? undefined : videoPath,
      questionIndex
    });
    const resolvedUrl = resolveVideoUrl({
      sessionId,
      answerVideoUrl: videoUrl,
      answerVideoPath: isLocalPath ? undefined : videoPath,
      questionIndex
    });

    return {
      videoUrl: resolvedUrl || videoUrl,
      videoPath: isLocalPath ? videoPath : objectKey || videoPath
    };
  }

  /**
   * 完成面试会话
   */
  async completeInterviewSession(sessionId: string, userId?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    code?: SessionAccessCode;
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
          code: 'NOT_FOUND',
        };
      }

      if (userId && session.userId !== userId) {
        return {
          success: false,
          error: '无权结束该面试会话',
          code: 'FORBIDDEN',
        };
      }

      if (!['PREPARING', 'IN_PROGRESS', 'COMPLETED'].includes(session.status)) {
        return {
          success: false,
          error: `当前面试状态不允许结束：${session.status}`,
          code: 'INVALID_STATE',
        };
      }

      // 计算面试时长
      const duration = session.startedAt
        ? Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000)
        : 0;
      const currentQuestion = this.getNextUnansweredQuestionIndex(session.questions);

      // 更新会话状态
      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: session.completedAt || new Date(),
          duration: duration,
          currentQuestion,
          startedAt: session.startedAt || new Date(),
        },
      });

      try {
        await this.queueAnalysisIfNeeded(sessionId, 0);
      } catch (error) {
        console.error('[AIInterview] 完成面试后创建分析任务失败:', error);
      }

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
    isCompleted?: boolean;
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

      const progress = await this.syncResumeProgress(unfinishedSession);
      if (progress.isCompleted) {
        try {
          await this.queueAnalysisIfNeeded(unfinishedSession.id, 0);
        } catch (error) {
          console.error('[AIInterview] 恢复未完成会话时创建分析任务失败:', error);
        }

        return {
          success: true,
          isCompleted: true,
          error: '面试已完成',
        };
      }

      const sessionData: SessionData = {
        sessionId: unfinishedSession.id,
        userId: unfinishedSession.userId,
        jobId: unfinishedSession.jobId || undefined,
        jobTarget: unfinishedSession.jobTarget,
        companyTarget: unfinishedSession.companyTarget || undefined,
        background: unfinishedSession.background || undefined,
        status: progress.status,
        currentQuestion: progress.currentQuestion,
        totalQuestions: unfinishedSession.totalQuestions,
        questions: this.getPlayableQuestion(unfinishedSession.questions, progress.currentQuestion),
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
          analysisReport: {
            select: {
              analysisStatus: true,
              reportUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // 映射数据以匹配前端模型
      const mappedSessions = sessions.map(session => ({
        ...session,
        analysisStatus: session.analysisReport?.analysisStatus,
        reportUrl: session.analysisReport?.reportUrl,
        reportReady: session.analysisReport?.analysisStatus === 'COMPLETED',
      }));

      return {
        success: true,
        sessions: mappedSessions,
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

  async getInterviewResumeReport(
    sessionId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    report?: ResumeReportData;
    error?: string;
    code?: 'NOT_FOUND' | 'FORBIDDEN' | 'NOT_READY';
  }> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        include: {
          analysisReport: true,
        },
      });

      if (!session) {
        return {
          success: false,
          error: '面试会话不存在',
          code: 'NOT_FOUND',
        };
      }

      if (userId && session.userId !== userId) {
        return {
          success: false,
          error: '无权查看该面试报告',
          code: 'FORBIDDEN',
        };
      }

      if (session.status !== 'COMPLETED') {
        return {
          success: false,
          error: '面试尚未完成，暂无报告',
          code: 'NOT_READY',
        };
      }

      if (!session.analysisReport || session.analysisReport.analysisStatus !== 'COMPLETED') {
        try {
          await this.queueAnalysisIfNeeded(sessionId, 0);
        } catch (error) {
          console.error('[AIInterview] 报告请求触发分析保活失败:', error);
        }

        return {
          success: false,
          error: '报告未生成，请耐心等待',
          code: 'NOT_READY',
        };
      }

      const reportRecord = session.analysisReport;
      const completedAt = session.completedAt || session.startedAt || session.createdAt;
      const generatedAt = reportRecord.generatedAt || reportRecord.updatedAt || new Date();
      const companyTarget = await this.resolveSessionCompanyTarget(session);
      const title =
        companyTarget
          ? `${companyTarget}视频简历报告`
          : `${session.jobSubCategory?.trim() || session.jobTarget.trim() || '综合'}职岗的视频简历报告`;
      const bestMatch = this.buildResumeBestMatch(session, reportRecord);
      const competencies = this.buildResumeCompetencies(reportRecord);
      const tips = this.buildResumeTips(reportRecord);
      const recommendedJobs = await this.getRecommendedJobsForReport(session, bestMatch.title);

      return {
        success: true,
        report: {
          title,
          testedAt: formatTestedAt(completedAt),
          bestMatch,
          competencies,
          tips,
          generatedNote: `报告生成于${formatMonthDay(generatedAt)} 报告有效期自测评日起一年内有效`,
          recommendedJobs,
        },
      };
    } catch (error) {
      console.error('获取面试报告失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取面试报告失败',
      };
    }
  }

  private buildResumeBestMatch(session: any, report: any): ResumeReportBestMatch {
    const title =
      report.jobMatchTitle?.trim() ||
      session.jobSubCategory?.trim() ||
      session.jobCategory?.trim() ||
      session.jobTarget?.trim() ||
      '综合岗位';

    const description =
      report.jobMatchDescription?.trim() ||
      `候选人在${title}相关能力维度上表现较为均衡，建议优先关注该方向岗位。`;

    const matchRatio = report.jobMatchRatio != null
      ? toRatio(report.jobMatchRatio)
      : toRatio(report.overallScore, 0.75);

    return {
      title,
      description,
      matchRatio,
    };
  }

  private buildResumeCompetencies(report: any): ResumeReportCompetency[] {
    const parsedCompetencies = this.parseCompetencyDetails(report.competenciesJson);
    const competencyMap = new Map(parsedCompetencies.map((item: any) => [item.name, item]));

    return REPORT_COMPETENCY_ORDER.map(({ name, fallbackKey }) => {
      const detail = competencyMap.get(name);
      const score = detail?.score != null
        ? toRatio(Number(detail.score))
        : toRatio(report[fallbackKey], 0.75);
      const description =
        typeof detail?.description === 'string' && detail.description.trim().length > 0
          ? detail.description.trim()
          : this.getDefaultCompetencyDescription(name);

      return {
        name,
        score,
        ratingLabel:
          typeof detail?.level === 'string' && detail.level.trim().length > 0
            ? detail.level.trim()
            : toRatingLabel(score),
        description,
      };
    });
  }

  private parseCompetencyDetails(value?: string | null): Array<{
    name: string;
    score?: number;
    level?: string;
    description?: string;
  }> {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[AIInterviewService] 解析 competenciesJson 失败:', error);
      return [];
    }
  }

  private getDefaultCompetencyDescription(name: string): string {
    const descriptionMap: Record<string, string> = {
      '学习研究': '对新知识与复杂问题保持持续学习和深入研究的意识。',
      '团队协作': '能够在协作场景中主动配合团队推进目标达成。',
      '人际沟通': '表达较为清晰，具备基础的沟通与协调能力。',
      '压力承受': '在有压力的情境下仍能保持相对稳定的表现。',
      '成就导向': '关注目标结果，愿意为达成任务持续投入。',
      '开放创新': '愿意接受新事物，并尝试更有效的解决思路。',
    };

    return descriptionMap[name] || '具备与岗位相关的基础能力表现。';
  }

  private buildResumeTips(report: any): string {
    if (typeof report.tips === 'string' && report.tips.trim().length > 0) {
      return report.tips.trim();
    }

    const strengths = parseJsonArray(report.strengths);
    const improvements = parseJsonArray(report.improvements);
    const segments: string[] = [];

    if (strengths.length > 0) {
      segments.push(`你的优势主要体现在${strengths.slice(0, 2).join('、')}`);
    }

    if (improvements.length > 0) {
      segments.push(`后续可以重点关注${improvements.slice(0, 2).join('、')}`);
    }

    return segments.join('。') || '整体表现稳定，建议继续结合真实案例强化表达深度。';
  }

  private async resolveSessionCompanyTarget(session: any): Promise<string> {
    const directValue = typeof session.companyTarget === 'string' ? session.companyTarget.trim() : '';
    if (directValue.length > 0) {
      return directValue;
    }

    if (!session.jobId) {
      return '';
    }

    try {
      const job = await prisma.job.findUnique({
        where: { id: session.jobId },
        select: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });

      return job?.company?.name?.trim() || '';
    } catch (error) {
      return '';
    }
  }

  private async getRecommendedJobsForReport(
    session: any,
    bestMatchTitle: string
  ): Promise<ResumeReportRecommendedJob[]> {
    const preferenceMatch = await this.getUserPreferenceMatch(session.userId);
    const jobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        isPublished: true,
      },
      include: {
        company: {
          select: {
            name: true,
            industry: true,
            scale: true,
            stats: true,
          },
        },
        dictionaryPosition: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 80,
    });

    const rankedJobs = jobs
      .map(job => ({
        job,
        score: this.scoreRecommendedJob(job, session, bestMatchTitle, preferenceMatch),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.job.updatedAt.getTime() - a.job.updatedAt.getTime())
      .slice(0, 6)
      .map(item => this.formatRecommendedJob(item.job));

    if (rankedJobs.length > 0) {
      return rankedJobs;
    }

    return jobs.slice(0, 6).map(job => this.formatRecommendedJob(job));
  }

  private async getUserPreferenceMatch(userId: string): Promise<JobPreferenceMatch> {
    try {
      const preferences = await prisma.userJobPreference.findMany({
        where: { userId },
        include: {
          position: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        positionIds: new Set(
          preferences
            .map(item => item.position?.id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
        ),
        categoryNames: new Set(
          preferences
            .map(item => normalizeText(item.position?.category?.name))
            .filter(value => value.length > 0)
        ),
        positionNames: new Set(
          preferences
            .map(item => normalizeText(item.position?.name))
            .filter(value => value.length > 0)
        ),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2021' || error.code === 'P2022')
      ) {
        console.warn('[AIInterviewService] 用户岗位偏好表暂不可用，已跳过推荐加权。');
        return {
          positionIds: new Set<string>(),
          categoryNames: new Set<string>(),
          positionNames: new Set<string>(),
        };
      }

      throw error;
    }
  }

  private scoreRecommendedJob(
    job: any,
    session: any,
    bestMatchTitle: string,
    preferenceMatch: JobPreferenceMatch
  ): number {
    const targetTerms = [
      session.jobTarget,
      session.jobSubCategory,
      session.jobCategory,
      bestMatchTitle,
    ]
      .map((value: string | null | undefined) => normalizeText(value))
      .filter((value: string) => value.length > 0);

    const jobTitle = normalizeText(job.title);
    const jobCategory = normalizeText(job.category);
    const dictionaryName = normalizeText(job.dictionaryPosition?.name);
    const dictionaryCategory = normalizeText(job.dictionaryPosition?.category?.name);

    let score = 0;

    if (session.jobId && job.id === session.jobId) {
      score += 120;
    }

    targetTerms.forEach(term => {
      if (!term) {
        return;
      }

      if (jobTitle && (jobTitle.includes(term) || term.includes(jobTitle))) {
        score += 50;
      }

      if (jobCategory && (jobCategory.includes(term) || term.includes(jobCategory))) {
        score += 25;
      }

      if (dictionaryName && (dictionaryName.includes(term) || term.includes(dictionaryName))) {
        score += 35;
      }

      if (
        dictionaryCategory &&
        (dictionaryCategory.includes(term) || term.includes(dictionaryCategory))
      ) {
        score += 20;
      }
    });

    if (job.dictionaryPosition?.id && preferenceMatch.positionIds.has(job.dictionaryPosition.id)) {
      score += 45;
    }

    if (dictionaryName && preferenceMatch.positionNames.has(dictionaryName)) {
      score += 35;
    }

    if (dictionaryCategory && preferenceMatch.categoryNames.has(dictionaryCategory)) {
      score += 20;
    }

    if (
      session.companyTarget &&
      normalizeText(job.company?.name).includes(normalizeText(session.companyTarget))
    ) {
      score += 15;
    }

    return score;
  }

  private formatRecommendedJob(job: any): ResumeReportRecommendedJob {
    const tags = [
      job.education,
      job.experience,
      ...splitMultiline(job.benefits).slice(0, 2),
      ...parseJsonArray(job.skills).slice(0, 2),
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 3);

    const companyStage = extractCompanyStageFromStats(job.company?.stats);
    const companyDescription = [companyStage || job.company?.industry, job.company?.scale]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' | ');

    return {
      title: job.title,
      salaryRange: job.salary || '面议',
      tags,
      companyName: job.company?.name || '企业信息待完善',
      companyDescription: companyDescription || '企业信息待完善',
      location: job.location || '地点待定',
    };
  }

  /**
   * 获取下一个问题
   */
  async getNextQuestion(sessionId: string, userId?: string): Promise<{
    success: boolean;
    question?: SessionQuestion;
    isCompleted?: boolean;
    error?: string;
    code?: SessionAccessCode;
  }> {
    try {
      const session = await this.getInterviewSession(sessionId, userId);
      if (!session.success || !session.session) {
        return {
          success: false,
          error: session.error || '会话不存在',
          code: session.code,
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
