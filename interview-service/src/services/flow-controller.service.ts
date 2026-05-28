import { Redis } from 'ioredis';
import { deepseekService, OpeningResult, ClosingResult } from './deepseek.service';
import { ttsService } from './tts.service';
import { avatarService } from './avatar.service';
import { interviewConductor } from './interview-conductor.service';
import { aiInterviewService } from './ai-interview.service';
import { qwen3TTSClient } from './qwen3-tts-service-client';
import { InterviewSession, InterviewRound, InterviewState, ResponseAnalysis } from '../models/interviewFlow';
import { prisma } from '../lib/prisma';
import { redisConnection } from '../config/redis';
import { redisStreamService } from './redis-stream.service';

function rehydrateQuestionHasAnswer(q: {
  answerText?: string | null;
  answerVideoUrl?: string | null;
  answerVideoPath?: string | null;
}): boolean {
  return Boolean(
    q.answerVideoUrl ||
    q.answerVideoPath ||
    (q.answerText && String(q.answerText).trim().length > 0)
  );
}

/**
 * 面试流程服务
 * 实现完整的两阶段面试：
 * 1. 用户信息收集阶段
 * 2. AI生成内容 + TTS语音驱动阶段
 */
export class InterviewFlowService {
  private sessions = new Map<string, InterviewSession>();

  // ==================== 超时保护配置 ====================
  /** 单题超时提醒时长（默认 5 分钟） */
  private readonly QUESTION_REMINDER_TIMEOUT_MS = parseInt(process.env.QUESTION_REMINDER_TIMEOUT_MS || '300000', 10);
  /** 提醒后跳题等待时长（默认 2 分钟） */
  private readonly QUESTION_SKIP_TIMEOUT_MS = parseInt(process.env.QUESTION_SKIP_TIMEOUT_MS || '120000', 10);
  /** 面试整体最长时长（默认 15 分钟） */
  private readonly INTERVIEW_MAX_DURATION_MS = parseInt(process.env.INTERVIEW_MAX_DURATION_MS || '900000', 10);

  /** 单题级超时计时器：sessionId -> { reminderTimer, skipTimer } */
  private questionTimers = new Map<string, { reminderTimer: NodeJS.Timeout | null; skipTimer: NodeJS.Timeout | null }>();
  /** 整场面试级超时计时器：sessionId -> Timeout */
  private interviewTimers = new Map<string, NodeJS.Timeout>();

  /** Redis 发布客户端（用于将超时事件投递到 outbound 频道，让网关与客户端感知） */
  private timeoutPubClient: Redis | null = null;

  /** LLM 题目生成失败时的兜底题库（按职位关键字命中，否则使用 default） */
  private readonly FALLBACK_QUESTIONS: Record<string, string[]> = {
    default: [
      '请简单介绍一下您自己，包括您的教育背景和工作经历。',
      '请描述一个您在工作中遇到的挑战，以及您是如何解决的。',
      '您认为自己最大的优势是什么？请举例说明。',
      '您对未来的职业发展有什么规划？',
      '您还有什么问题想问我们的吗？',
    ],
  };

  private getTimeoutPubClient(): Redis {
    if (!this.timeoutPubClient) {
      this.timeoutPubClient = new Redis(redisConnection);
      this.timeoutPubClient.on('error', (err) =>
        console.error(`[InterviewFlow] timeoutPubClient Redis Error: ${err.message}`)
      );
    }
    return this.timeoutPubClient;
  }

  private async sendToAvatarAndTTS(sessionId: string, userId: string, text: string, clearPrevious: boolean = true) {
    if (clearPrevious) {
      qwen3TTSClient.clearSynthesis(sessionId);
    }
    qwen3TTSClient.synthesize(sessionId, text, true);

    try {
      await avatarService.sendTextToAvatar(sessionId, userId, text);
    } catch (err: any) {
      console.warn(`[InterviewFlow] sendTextToAvatar 跳过: ${err?.message || err}`);
    }
  }

  private toQuestionIndex(round: InterviewRound): number {
    return Math.max(0, round.roundNumber - 1);
  }

  async persistRoundStarted(session: InterviewSession, round: InterviewRound): Promise<void> {
    try {
      // 使用事务 + 乐观锁，避免并发场景下覆盖已结束/已取消会话的状态
      await prisma.$transaction(async (tx) => {
        // 乐观锁检查：确保会话仍处于可推进状态
        const dbSession = await tx.aIInterviewSession.findUnique({
          where: { id: session.sessionId },
          select: { status: true, currentQuestion: true },
        });

        if (!dbSession) {
          console.warn(`[InterviewFlow] 持久化跳过: 会话 ${session.sessionId} 不存在`);
          return;
        }

        if (dbSession.status === 'COMPLETED' || dbSession.status === 'CANCELLED') {
          console.warn(
            `[InterviewFlow] 持久化跳过: 会话 ${session.sessionId} 状态已变更为 ${dbSession.status}`
          );
          return;
        }

        // 推进会话当前题号
        await tx.aIInterviewSession.update({
          where: { id: session.sessionId },
          data: {
            status: 'IN_PROGRESS',
            currentQuestion: this.toQuestionIndex(round),
          },
        });
      });
    } catch (err: any) {
      console.warn(`[InterviewFlow] 持久化当前题失败: ${err?.message || err}`);
    }
  }

  private async persistRoundAnswer(
    session: InterviewSession,
    round: InterviewRound,
    response: string
  ): Promise<void> {
    const answerText = (response || '').trim();
    if (!answerText) {
      return;
    }

    const questionIndex = this.toQuestionIndex(round);
    try {
      // 使用事务 + 乐观锁，确保「写答案 + 推进会话」原子完成，并避免重复写入
      await prisma.$transaction(async (tx) => {
        // 乐观锁检查：若题目已有非空答案则视为已写入，跳过避免覆盖
        const question = await tx.aIInterviewQuestion.findFirst({
          where: { sessionId: session.sessionId, questionIndex },
          select: { id: true, answerText: true, answeredAt: true },
        });

        if (
          question &&
          question.answeredAt &&
          (question.answerText || '').trim().length > 0
        ) {
          console.warn(
            `[InterviewFlow] 重复写入跳过: 会话 ${session.sessionId} 题目 ${questionIndex} 已有答案`
          );
          return;
        }

        // 同时确认会话未结束，避免在面试已结束后回写答案
        const dbSession = await tx.aIInterviewSession.findUnique({
          where: { id: session.sessionId },
          select: { status: true },
        });

        if (dbSession?.status === 'COMPLETED' || dbSession?.status === 'CANCELLED') {
          console.warn(
            `[InterviewFlow] 持久化候选人回答跳过: 会话 ${session.sessionId} 状态为 ${dbSession?.status}`
          );
          return;
        }

        await tx.aIInterviewQuestion.updateMany({
          where: { sessionId: session.sessionId, questionIndex },
          data: {
            answerText,
            answeredAt: new Date(),
          },
        });

        await tx.aIInterviewSession.update({
          where: { id: session.sessionId },
          data: {
            status: 'IN_PROGRESS',
            currentQuestion: questionIndex,
          },
        });
      });
    } catch (err: any) {
      console.warn(`[InterviewFlow] 持久化候选人回答失败: ${err?.message || err}`);
    }
  }

  private async persistInterviewCompleted(session: InterviewSession): Promise<void> {
    try {
      // 使用事务 + 乐观锁，避免重复标记完成（如全局超时与正常收尾并发）
      await prisma.$transaction(async (tx) => {
        // 乐观锁检查：若已完成则跳过，避免覆盖原有 completedAt
        const dbSession = await tx.aIInterviewSession.findUnique({
          where: { id: session.sessionId },
          select: { status: true },
        });

        if (!dbSession) {
          console.warn(`[InterviewFlow] 持久化面试完成跳过: 会话 ${session.sessionId} 不存在`);
          return;
        }

        if (dbSession.status === 'COMPLETED') {
          console.warn(
            `[InterviewFlow] 面试已完成, 跳过重复持久化: ${session.sessionId}`
          );
          return;
        }

        await tx.aIInterviewSession.update({
          where: { id: session.sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            currentQuestion: session.rounds.length,
          },
        });
      });
    } catch (err: any) {
      console.warn(`[InterviewFlow] 持久化面试完成失败: ${err?.message || err}`);
    }
  }

  private async persistRefinedQuestion(session: InterviewSession, round: InterviewRound): Promise<void> {
    try {
      await prisma.aIInterviewQuestion.updateMany({
        where: { sessionId: session.sessionId, questionIndex: this.toQuestionIndex(round) },
        data: {
          questionText: round.question,
          audioUrl: null,
          audioPath: null,
          videoUrl: null,
          status: 'PREPARING',
        },
      });
    } catch (err: any) {
      console.warn(`[InterviewFlow] 持久化微调题干失败: ${err?.message || err}`);
    }
  }

  private async markNextRoundInProgress(session: InterviewSession): Promise<InterviewRound | null> {
    const nextRound = session.rounds.find(r => r.status === 'pending');
    if (!nextRound) {
      // 不再直接将会话置为 COMPLETED，
      // 面试是否已完成交由 evaluateAndFinalizeCompletion 综合评估（有效回答数与库存状态）。
      return null;
    }

    nextRound.status = 'in_progress';
    session.state = InterviewState.IN_PROGRESS;
    session.currentRound = nextRound.roundNumber;
    session.runtimePhase = 'speaking';
    await this.persistRoundStarted(session, nextRound);
    return nextRound;
  }

  /**
   * 面试完成判定。
   *
   * 设计原则（Task #12）：
   *   - 走到本方法即代表 markNextRoundInProgress 返回 null，即题库已经全部问完；
   *   - 题库耗尽 = 面试正常完成，始终返回 isCompleted: true；
   *   - 回答数量/质量不再影响完成状态，仅写入日志供分析服务后续使用；
   *   - 「面试未完成（isCompleted=false）」只发生在服务端主动中断、客户端长时间断开、
   *     用户主动退出等真正非正常中断的路径上，不在本方法内处理。
   */
  private async evaluateAndFinalizeCompletion(
    session: InterviewSession
  ): Promise<{ isCompleted: boolean; reason: string }> {
    // 有效回答：只要非空且不是系统占位符，就视为有效（不再按长度门槛过滤）
    const validAnswers = session.rounds.filter(
      r => r.userResponse &&
           r.userResponse !== '[超时未作答]' &&
           r.userResponse.trim().length > 0
    );

    const totalAsked = session.rounds.filter(r => r.question).length;

    // 题库耗尽 = 面试正常完成。只记录数量到日志，供分析服务参考。
    console.log(
      `[FlowController] 面试完成评估: sessionId=${session.sessionId}, 总题数=${totalAsked}, 有效回答=${validAnswers.length}`
    );

    if (session.state !== InterviewState.COMPLETED) {
      session.state = InterviewState.COMPLETED;
      session.runtimePhase = 'completed';
      await this.persistInterviewCompleted(session);
    }

    return {
      isCompleted: true,
      reason: `面试正常完成：共提问${totalAsked}题，有效回答${validAnswers.length}个`,
    };
  }
  
  /**
   * 初始化会话（由外部提供sessionId）
   */
  async initializeSession(sessionId: string, userId: string, userName: string, targetJob: string, background?: string) {
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId)!;
      try {
        await avatarService.ensureActiveSession({
          userId,
          sessionId,
          avatarCode: 'airi_default',
          voiceCode: 'zh-CN-lisa',
        });
      } catch (err: any) {
        console.warn(`[InterviewFlow] ensureActiveSession(已有会话) 失败（可忽略）: ${err?.message || err}`);
      }
      return existing;
    }

    const session: InterviewSession = {
      sessionId,
      userId,
      userName,
      state: InterviewState.INTRODUCTION,
      startTime: new Date(),
      rounds: [],
      userInfo: {
        name: userName,
        targetJob: targetJob || '未指定职位',
        background: background || '',
        experience: '',
        skills: []
      }
    };

    this.sessions.set(sessionId, session);

    // 服务重启后禁用自动断点续面：不再从 DB 主动恢复旧会话到内存，
    // 避免旧面试会话的状态干扰新面试流程。DB 记录仍然保留，
    // 如需恢复旧会话请由客户端主动发起恢复请求。
    // try {
    //   await this.tryRehydrateFromPrisma(session, userId);
    // } catch (err: any) {
    //   console.warn(`[InterviewFlow] tryRehydrateFromPrisma 跳过: ${err?.message || err}`);
    // }

    console.log(`✅ InterviewFlowService: 成功为会话 ${sessionId} 初始化职位 [${targetJob}]`);

    // 与 avatar.service 注册同源 sessionId/userId；重启后 Map 为空时 ensureActiveSession 会惰性重建。
    try {
      await avatarService.ensureActiveSession({
        userId,
        sessionId,
        avatarCode: 'airi_default',
        voiceCode: 'zh-CN-lisa',
      });
    } catch (err: any) {
      console.warn(`[InterviewFlow] ensureActiveSession 未建立（可忽略）: ${err?.message || err}`);
    }

    return session;
  }

  /**
   * 从 Prisma 恢复题目与进度（backend-api / ASR / TTS 任一重启后，内存 Map 清空仍可续面）。
   * 依赖 createInterviewSession 已写入的 AIInterviewQuestion；join_session 须传与 DB 一致的 userId。
   */
  private async tryRehydrateFromPrisma(session: InterviewSession, userId: string): Promise<void> {
    if (!userId || userId === 'anonymous') {
      return;
    }

    const result = await aiInterviewService.getInterviewSession(session.sessionId, userId);
    if (!result.success || !result.session) {
      return;
    }

    const db = result.session;
    const questions = db.questions || [];
    if (questions.length === 0) {
      return;
    }

    session.userInfo.targetJob = db.jobTarget || session.userInfo.targetJob;
    session.userInfo.background = db.background || session.userInfo.background;
    session.userInfo.companyTarget = db.companyTarget || undefined;
    session.dbMirror = {
      status: db.status,
      currentQuestion: db.currentQuestion,
    };

    const sorted = [...questions].sort((a, b) => a.questionIndex - b.questionIndex);
    const rounds: InterviewRound[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const q = sorted[i];
      const rawText = q.questionText || '';
      const cleanText = rawText.replace(/\[emotion:[^\]]+\]/g, '').trim() || rawText.trim();
      const scene = interviewConductor.inferScene(cleanText, { isLast: i === sorted.length - 1 });
      const emotionInstruction = interviewConductor.getEmotionInstruction(scene, cleanText);
      const answered = rehydrateQuestionHasAnswer(q);

      let status: InterviewRound['status'];
      if (answered) {
        status = 'completed';
      } else if (q.questionIndex === db.currentQuestion && db.status !== 'COMPLETED') {
        status = 'in_progress';
      } else {
        status = 'pending';
      }

      rounds.push({
        roundNumber: i + 1,
        question: cleanText,
        audioUrl: q.audioUrl || undefined,
        duration: 0,
        expectedPoints: ['专业能力', '沟通表达', '逻辑思维'],
        suggestedTime: (q as any).timeLimit || 180,
        scoringCriteria: ['完整回答', '逻辑清晰', '专业深度'],
        status,
        userResponse: q.answerText || undefined,
        emotionScene: scene,
        emotionInstruction,
      });
    }

    session.rounds = rounds;

    if (db.status === 'COMPLETED' || rounds.every(r => r.status === 'completed')) {
      session.state = InterviewState.COMPLETED;
    } else if (rounds.length > 0) {
      session.state = InterviewState.READY;
    }

    console.log(
      `[InterviewFlow] 已从 DB 恢复 ${rounds.length} 题 (sessionId=${session.sessionId}, dbStatus=${db.status}, currentQ=${db.currentQuestion})`
    );
  }

  /**
   * 第一阶段：收集用户信息并介绍流程
   */
  async startIntroductionPhase(userId: string, userName: string, isFirstTime: boolean) {
    const sessionId = `interview_${userId}_${Date.now()}`;
    const session: InterviewSession = {
      sessionId,
      userId,
      userName,
      state: InterviewState.INTRODUCTION,
      startTime: new Date(),
      rounds: [],
      userInfo: {
        name: userName,
        targetJob: '',
        background: '',
        experience: '',
        skills: []
      }
    };

    this.sessions.set(sessionId, session);

    // 启动数字人生命周期
    await avatarService.startAvatarInstance({
      userId,
      sessionId,
      avatarCode: 'airi_default',
      voiceCode: 'zh-CN-lisa'
    });

    // 生成动态开场白
    const openingResult = await deepseekService.generateOpening(
      { name: userName, targetJob: '' }, // targetJob might be empty initially
      isFirstTime
    );

    await this.sendToAvatarAndTTS(sessionId, userId, openingResult.opening);

    return sessionId;
  }

  /**
   * 发送介绍内容（第一次用户）
   */
  private async sendIntroductionContent(sessionId: string) {
    const introduction = [
      "您好！欢迎来到AI智能面试系统！我是您的专属AI面试官。",
      "在正式开始面试之前，让我为您介绍一下整个面试流程：",
      "我们的面试分为两个主要部分：",
      "第一部分是信息确认和简单交流，我会了解您的求职目标和个人背景。",
      "第二部分是正式面试环节，我将针对您的目标职位进行专业技能评估。",
      "整个面试过程大约需要15-20分钟，请保持放松的心态。",
      "面试前请注意以下几点：",
      "1. 请确保网络连接稳定，避免中断",
      "2. 找一个安静的环境，避免干扰",
      "3. 保持自然的语速和清晰的表达",
      "4. 每个问题回答时间建议控制在2-3分钟",
      "5. 如果遇到技术问题，可以随时重新开始",
      "现在让我们开始收集一些基本信息。"
    ];

    for (const text of introduction) {
      const session = this.sessions.get(sessionId);
      if (session) {
        await this.sendToAvatarAndTTS(sessionId, session.userId, text, false);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * 发送欢迎内容（老用户）
   */
  private async sendWelcomeBackContent(sessionId: string) {
    const welcome = [
      "欢迎回来！很高兴再次见到您！",
      "让我们快速确认一下您的信息，然后直接开始面试。"
    ];

    for (const text of welcome) {
      const session = this.sessions.get(sessionId);
      if (session) {
        await this.sendToAvatarAndTTS(sessionId, session.userId, text, false);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * 收集用户信息
   */
  async collectUserInfo(sessionId: string, info: {
    targetJob: string;
    background: string;
    experience?: string;
    skills?: string[];
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.userInfo = { ...session.userInfo, ...info };

    // 确认用户信息
    const confirmation = `让我确认一下您的信息：
姓名：${session.userInfo.name}
目标职位：${session.userInfo.targetJob}
背景：${session.userInfo.background}
如果信息有误，请告诉我需要修改的地方。`;

    await this.sendToAvatarAndTTS(sessionId, session.userId, confirmation);
    await new Promise(resolve => setTimeout(resolve, 3000));

    return session.userInfo;
  }

  /**
   * 第二阶段：AI生成面试内容
   */
  async startInterviewPhase(sessionId: string, options: { autoStart?: boolean } = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    const autoStart = options.autoStart !== false;

    if (session.rounds.length === 0) {
      // 服务重启后禁用自动断点续面：不再自动从 DB 恢复题目，
      // 避免旧面试会话的题目被重复下发。请依靠后续 DeepSeek 重新生成。
      // try {
      //   await this.tryRehydrateFromPrisma(session, session.userId);
      // } catch (err: any) {
      //   console.warn(`[InterviewFlow] startInterviewPhase 内 DB 恢复跳过: ${err?.message || err}`);
      // }
    }

    if (session.rounds.length > 0) {
      if (session.rounds.every(r => r.status === 'completed')) {
        session.state = InterviewState.COMPLETED;
        return {
          totalRounds: session.rounds.length,
          nextRound: session.rounds[session.rounds.length - 1],
        };
      }

      session.state = InterviewState.READY;
      const inProgress = session.rounds.find(r => r.status === 'in_progress');
      if (inProgress) {
        return {
          totalRounds: session.rounds.length,
          nextRound: inProgress,
        };
      }

      if (!autoStart) {
        return {
          totalRounds: session.rounds.length,
          nextRound: session.rounds.find(r => r.status === 'pending') || session.rounds[session.rounds.length - 1],
        };
      }

      await this.startNextRound(sessionId);
      const cur =
        session.rounds.find(r => r.status === 'in_progress') ||
        session.rounds.find(r => r.status === 'pending');
      return {
        totalRounds: session.rounds.length,
        nextRound: cur || session.rounds[session.rounds.length - 1],
      };
    }

    session.state = InterviewState.GENERATING;

    // 1. 使用DeepSeek生成面试内容（失败时自动降级到模板题库）
    const interviewContent = await this.generateInterviewContentWithFallback(session);

    // 2. 将内容转换为语音回合
    const interviewRounds = await this.createInterviewRounds(sessionId, interviewContent);

    session.rounds = interviewRounds;
    session.state = InterviewState.READY;

    // 面试题库就绪后，启动整场面试的全局超时计时器
    this.startInterviewTimer(sessionId);

    if (autoStart) {
      await this.startNextRound(sessionId);
    }

    return {
      totalRounds: interviewRounds.length,
      nextRound: interviewRounds[0]
    };
  }

  /**
   * 使用DeepSeek AI生成面试内容（带兜底降级）
   */
  private async generateInterviewContentWithFallback(session: InterviewSession): Promise<string> {
    try {
      const content = await this.generateInterviewContent(session);
      // 简单校验：解析后题目数量必须 > 0，否则视作失败
      if (this.parseInterviewContent(content).length === 0) {
        throw new Error('LLM 输出未能解析出任何题干');
      }
      return content;
    } catch (err: any) {
      console.error(
        `[InterviewFlow] 会话 ${session.sessionId} LLM 题目生成失败: ${err?.message || err}, 使用模板题库降级`
      );
      const job = (session.userInfo.targetJob || '').trim();
      const fallbackKey = Object.keys(this.FALLBACK_QUESTIONS).find(
        (k) => k !== 'default' && job.includes(k)
      );
      const questions = this.FALLBACK_QUESTIONS[fallbackKey || 'default'];
      // 拼装为 parseInterviewContent 兼容格式（带 [emotion:xxx] 标注、** 包裹）
      return questions
        .map((q, idx) => {
          let scene: 'opening' | 'question' | 'closing' = 'question';
          if (idx === 0) scene = 'opening';
          else if (idx === questions.length - 1) scene = 'closing';
          return `**[emotion:${scene}]${q}**`;
        })
        .join('\n\n');
    }
  }

  /**
   * 使用DeepSeek AI生成面试内容
   */
  private async generateInterviewContent(session: InterviewSession) {
    const companyText = session.userInfo.companyTarget ? `\n- 目标公司/企业：${session.userInfo.companyTarget}` : '';
    const prompt = `作为一位专业、公正且严肃的AI面试官（10年资深HR总监形象），请为以下候选人生成一套完整的面试问题：

候选人信息：
- 姓名：${session.userInfo.name}
- 目标职位：${session.userInfo.targetJob}${companyText}
- 背景：${session.userInfo.background}
- 经验：${session.userInfo.experience || '未指定'}
- 技能：${session.userInfo.skills?.join(', ') || '未指定'}

请生成包含以下内容的面试：
1. 开场介绍与首个提问（1个问题，结合候选人姓名、职位以及目标公司信息生成一段自然且亲切的面试问候，同时包含第一个正式面试提问。请确保把问候与第一道提问融合在同一个回合内，作为整场面试的第 1 个问题输出）
2. 专业技能评估（3-4个问题）
3. 项目经验询问（2个问题）
4. 行为面试问题（2个问题）
5. 总结和反问环节（1个问题）

【重要】每个问题请用 [emotion:标签] 标记语气，用于 TTS 情感合成：
- [emotion:opening] — 开场问候与首个提问（仅用于第 1 个问题）
- [emotion:question] — 正式提问
- [emotion:challenge] — 压力测试/质疑
- [emotion:transition] — 话题切换
- [emotion:closing] — 结束语

示例：
"[emotion:opening]${session.userInfo.name}您好，欢迎参加今天应聘${session.userInfo.companyTarget || ''}${session.userInfo.targetJob}的面试。我是您的面试官，很开心与您深入交流。首先，请您结合自身的最突出的工作亮点，谈谈您为什么觉得自己是这个岗位的最佳人选？"
"[emotion:question]请您详细描述一下您在上一份工作中最有挑战性的项目。"

每个问题后请提供：
- 问题文本（含情感标注）
- 预期考察点
- 建议回答时间
- 评分标准

请用中文回答，保持专业严肃但不失礼貌的面试官语气。`;

    const response = await deepseekService.generateInterview(prompt);
    return response.content;
  }

  /**
   * 创建面试回合
   */
  private async createInterviewRounds(sessionId: string, content: string): Promise<InterviewRound[]> {
    const rounds: InterviewRound[] = [];
    const questions = this.parseInterviewContent(content);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // pushQuestion 已经剥离了 [emotion:xxx]、内部评估字段以及 markdown 标记，
      // 这里拿到的 question.text 已是可直接用于 TTS 朝读 / 字幕显示的纯净题干。
      const cleanText = question.text;

      // 推断该问题的场景类型（用于 Qwen3-TTS 情感指令）
      const scene = interviewConductor.inferScene(cleanText, {
        isLast: i === questions.length - 1,
      });
      const emotionInstruction = interviewConductor.getEmotionInstruction(scene, cleanText);

      // 优先使用旧 ttsService 预生成音频文件（兼容无 TTS 微服务的情况）
      // 如果 Qwen3 TTS 微服务可用，客户端会通过 WebSocket 直连获取流式音频
      let audioUrl: string | undefined;
      let duration = 0;
      try {
        const ttsResult = await ttsService.textToSpeech({
          text: cleanText,
          voice: 'siqi',
        });
        audioUrl = ttsResult.audioUrl;
        duration = ttsResult.duration || 0;
      } catch (ttsError: any) {
        console.warn(`⚠️ 预生成TTS失败(round ${i + 1})，将依赖 Qwen3-TTS 流式播放: ${ttsError.message}`);
      }

      const round: InterviewRound = {
        roundNumber: i + 1,
        question: cleanText,
        audioUrl,
        duration,
        expectedPoints: question.expectedPoints,
        suggestedTime: question.suggestedTime,
        scoringCriteria: question.scoringCriteria,
        status: 'pending',
        emotionScene: scene,
        emotionInstruction,
        // 内部评估信息（预期考察点、评分标准等）仅供后台分析，不下发给候选人
        internalMetadata: question.internalMetadata || undefined,
      };

      rounds.push(round);
    }

    return rounds;
  }

  /**
   * 从 DeepSeek 长文里解析带 [emotion:xxx] 的题干（与 generateInterviewContent 提示词格式一致）。
   * 旧逻辑要求「以 问题 开头或以 ？ 结尾」会与 Markdown **…** 包起来的段落完全不匹配，导致 0 题、App 无后续播报。
   */
  private parseInterviewContent(content: string) {
    const defaults = {
      expectedPoints: ['专业能力', '沟通表达', '逻辑思维'],
      suggestedTime: 180,
      scoringCriteria: ['完整回答', '逻辑清晰', '专业深度'],
    };

    const stripOuterBold = (s: string) => {
      let t = s.trim();
      if (t.startsWith('**')) {
        t = t.slice(2);
      }
      if (t.endsWith('**')) {
        t = t.slice(0, -2);
      }
      return t.trim();
    };

    const dedupeKeys = new Set<string>();
    const questions: Array<{
      text: string;
      expectedPoints: string[];
      suggestedTime: number;
      scoringCriteria: string[];
      internalMetadata: string;
    }> = [];

    const pushQuestion = (rawBlock: string, fullContent: string, matchIndex: number) => {
      let text = stripOuterBold(rawBlock);
      if (!/\[emotion:[^\]]+\]/.test(text)) {
        return;
      }

      // 去掉 [emotion:xxx] 标记（不需要朝读也不需要字幕展示）
      text = text.replace(/\[emotion:[^\]]+\]/g, '').trim();

      // *** 新增：剥离内部评估字段 ***
      // LLM 可能在题干后附上「预期考察点」「建议回答时间」「评分标准」等评估字段，
      // 这些信息不可下发给候选人（TTS 朝读 / 字幕显示）。这里找到首个评估字段标记后截断。
      const internalFieldPatterns = [
        /\n\s*-?\s*\*{0,2}预期考察点\*{0,2}/,
        /\n\s*-?\s*\*{0,2}建议回答时间\*{0,2}/,
        /\n\s*-?\s*\*{0,2}评分标准\*{0,2}/,
        /\n\s*-?\s*\*{0,2}考察维度\*{0,2}/,
        /\n\s*-?\s*\*{0,2}考察要点\*{0,2}/,
      ];

      let cutoffIndex = text.length;
      for (const pattern of internalFieldPatterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined && match.index < cutoffIndex) {
          cutoffIndex = match.index;
        }
      }

      // 提取内部评估信息（仅供后台分析使用，不下发给候选人）
      const internalMetadata = cutoffIndex < text.length ? text.substring(cutoffIndex).trim() : '';

      // 截断文本，只保留纯净的题干
      text = text.substring(0, cutoffIndex).trim();

      // 去掉 markdown 标记（**、*），TTS 不需要朝读这些符号
      text = text.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').trim();

      const bodyForLen = text;
      if (bodyForLen.length < 12) {
        return;
      }
      const key = bodyForLen.slice(0, 96);
      if (dedupeKeys.has(key)) {
        return;
      }
      dedupeKeys.add(key);

      // Look ahead in the full content for suggested time
      let suggestedTime = defaults.suggestedTime;
      const lookaheadText = fullContent.slice(matchIndex, matchIndex + 500); // Look at the next 500 characters
      const timeMatch = lookaheadText.match(/建议回答时间[^\d]*(\d+)/);
      if (timeMatch && timeMatch[1]) {
        const timeVal = parseInt(timeMatch[1], 10);
        if (timeVal > 10 && timeVal <= 600) { // Reasonable bounds between 10 seconds and 10 minutes
          suggestedTime = timeVal;
        }
      }

      questions.push({ text, ...defaults, suggestedTime, internalMetadata });
    };

    // 1) 标准 Markdown：**[emotion:…] ……**（非贪婪到成对 **，可跨行）
    const boldBlocks = content.matchAll(/\*\*\s*\[emotion:[^\]]+\][\s\S]*?\*\*/g);
    for (const m of boldBlocks) {
      pushQuestion(m[0], content, m.index || 0);
    }

    // 2) 模型偶发省略闭合 **，或输出被 max_tokens 截断：从 **[emotion 起到行尾/文尾
    if (questions.length === 0) {
      const looseBlocks = content.matchAll(/\*\*\s*\[emotion:[^\]]+\][\s\S]*?(?=\n\s*\*\*\s*\[emotion:]|$)/g);
      for (const m of looseBlocks) {
        pushQuestion(m[0].replace(/\s+$/, ''), content, m.index || 0);
      }
    }

    // 3) 无 ** 包裹：以 [emotion: 分段
    if (questions.length === 0) {
      const parts = content.split(/(?=\[emotion:[^\]]+\])/);
      let currentIndex = 0;
      for (const p of parts) {
        const t = p.trim();
        if (t.startsWith('[emotion:')) {
          pushQuestion(t, content, currentIndex);
        }
        currentIndex += p.length;
      }
    }

    if (questions.length === 0) {
      console.warn(
        '[InterviewFlow] parseInterviewContent: 未解析到任何 [emotion:…] 题干，请检查 LLM 输出格式或提高 LLM_MAX_TOKENS（当前输出可能被截断）'
      );
    } else {
      console.log(`[InterviewFlow] parseInterviewContent: 解析到 ${questions.length} 道有效题干`);
    }

    return questions;
  }

  /**
   * 开始下一轮面试
   */
  async startNextRound(sessionId: string): Promise<InterviewRound | null> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const nextRound = await this.markNextRoundInProgress(session);
    if (!nextRound) {
      // 所有题目均已处理完，清除超时计时器并综合评估是否可以判定面试完成
      this.clearInterviewTimer(sessionId);
      this.clearQuestionTimers(sessionId);
      await this.evaluateAndFinalizeCompletion(session);
      return null;
    }

    // Web 嵌入式数字人侧记一笔；同时通过 qwen3TTSClient 下发音频流到 App
    await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
    session.runtimePhase = 'listening';

    // 启动单题超时计时器（包括提醒 + 跳题）
    this.startQuestionTimer(sessionId);

    // 如果有音频文件，客户端会播放音频，这里不需要服务器端播放
    // if (nextRound.audioUrl) {
    //   await this.playAudio(sessionId, nextRound.audioUrl);
    // }

    return nextRound;
  }

  /**
   * 处理用户回答
   */
  async processUserResponse(sessionId: string, response: string, options: { speakNextRound?: boolean } = {}): Promise<{
    nextRound?: InterviewRound | null; // Changed to allow null
    isCompleted: boolean;
    feedback?: string;
    score?: number; // Added score
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    const speakNextRound = options.speakNextRound !== false;

    if (session.isProcessing) {
      console.warn(`[InterviewFlow] Session ${sessionId} is already processing, skipping duplicate response.`);
      return { isCompleted: false };
    }

    session.isProcessing = true;
    session.runtimePhase = 'processing';
    // 候选人已作答，清除当前题超时计时器
    this.clearQuestionTimers(sessionId);
    try {
      const currentRound = session.rounds.find(r => r.status === 'in_progress');
      let analysisResult;

      if (currentRound) {
      currentRound.userResponse = response;
      currentRound.status = 'completed';
      await this.persistRoundAnswer(session, currentRound, response);

      // AI分析用户回答
      const prompt = `
请分析候选人对以下面试问题的回答：

【面试问题】
${currentRound.question}

【候选人回答】
${response}

【历史追问次数】
${currentRound.followupCount || 0}

分析要求：
1. 评估回答的完整性、专业度和逻辑性。
2. 判断是否需要追问。如果回答太简略、偏离主题或未触及核心要点，且追问次数未超过2次，请设置 needsFollowup 为 true。
3. 提供具体的评分和反馈。
      `.trim();

      analysisResult = await deepseekService.analyzeResponse(prompt);

      currentRound.analysis = {
        score: analysisResult.score,
        feedback: analysisResult.feedback,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        suggestions: analysisResult.suggestions,
        needsFollowup: analysisResult.needsFollowup
      };

      // 智能流控：决定是否追问
      // 限制：每个问题最多追问2次
      const currentFollowupCount = currentRound.followupCount || 0;

      if (analysisResult.needsFollowup && currentFollowupCount < 2) {
        // 生成追问
        const followupPrompt = `
原始问题：${currentRound.question}
用户回答：${response}
请生成一个简短的追问问题，引导用户补充细节。
        `.trim();

        const followup = await deepseekService.generateFollowup(followupPrompt);

        // 插入新的追问回合（带情感标注）
        const followupScene = interviewConductor.inferScene(followup.question, { isFollowUp: true });
        const followupRound: InterviewRound = {
          roundNumber: currentRound.roundNumber,
          question: followup.question,
          duration: 0,
          expectedPoints: currentRound.expectedPoints,
          suggestedTime: 120,
          scoringCriteria: currentRound.scoringCriteria,
          status: 'pending',
          followupCount: currentFollowupCount + 1,
          emotionScene: followupScene,
          emotionInstruction: interviewConductor.getEmotionInstruction(followupScene),
        };

        // 找到当前回合的索引，插入到后面
        const currentIndex = session.rounds.findIndex(r => r === currentRound);
        if (currentIndex !== -1) {
          session.rounds.splice(currentIndex + 1, 0, followupRound);
        }
      }
    }

    // 开始下一轮（或者是刚才插入的追问）；实时链路中由 coordinator 统一播报，避免双 TTS。
    const nextRound = await this.markNextRoundInProgress(session);

    // 题库耗尽 = 面试正常完成；isCompleted 仅由「是否已无下一题」决定，
    // 不再受回答数量/长度等质量指标影响（质量仅用于决定追问/换题方向）。
    let isCompleted = false;
    if (!nextRound) {
      const evalResult = await this.evaluateAndFinalizeCompletion(session);
      isCompleted = evalResult.isCompleted;
      console.log(
        `[InterviewFlow] processUserResponse 判定面试完成 (${sessionId}): ${evalResult.reason}`
      );
    }

    // 进入「下一道主题题」时，用上一轮回答轻量润色预生成题干（追问回合 roundNumber 不变，不触发）
    if (
      nextRound &&
      currentRound &&
      nextRound.roundNumber > currentRound.roundNumber &&
      (currentRound.userResponse || '').trim()
    ) {
      try {
        const refined = await deepseekService.contextualizePreparedQuestion({
          jobPosition: session.userInfo.targetJob,
          preparedQuestion: nextRound.question,
          candidateLastAnswer: (currentRound.userResponse || '').trim(),
          candidateName: session.userInfo.name,
        });
        if (refined && refined.length > 12) {
          nextRound.question = refined.trim();
          nextRound.audioUrl = undefined;
          nextRound.duration = 0;
          await this.persistRefinedQuestion(session, nextRound);
        }
      } catch (e) {
        console.warn('[InterviewFlow] 下一题上下文润色跳过:', e);
      }
    }

    if (nextRound && speakNextRound) {
      await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
      session.runtimePhase = 'listening';
    }

      return {
        nextRound,
        isCompleted,
        feedback: analysisResult?.feedback,
        score: analysisResult?.score
      };
    } finally {
      session.isProcessing = false;
    }
  }

  /**
   * 分析用户回答
   */
  private async analyzeResponse(round: InterviewRound, response: string): Promise<ResponseAnalysis> { // Explicitly define return type
    const prompt = `分析以下面试回答：
    
问题：${round.question}
回答：${response}

请评估：
1. 回答的完整性
2. 专业性程度
3. 是否需要追问

请提供简要反馈。`;

    const analysis = await deepseekService.analyzeResponse(prompt);
    return {
      score: analysis.score || 0,
      feedback: analysis.feedback || '回答得很好',
      needsFollowup: analysis.needsFollowup || false,
      strengths: analysis.strengths || [], // Added
      weaknesses: analysis.weaknesses || [], // Added
      suggestions: analysis.suggestions || [] // Added
    };
  }

  /**
   * 生成追问问题
   */
  private async generateFollowupQuestion(session: InterviewSession, round: InterviewRound) {
    const prompt = `基于以下面试回答生成追问问题：

原始问题：${round.question}
用户回答：${round.userResponse}

请生成一个相关的追问问题，深入挖掘用户的专业能力。`;

    const response = await deepseekService.generateFollowup(prompt);
    return response.question;
  }

  /**
   * 结束面试
   * @param sessionId 会话 ID
   * @param reason 结束原因（可选）：'normal' | 'timeout' | 其他业务原因
   */
  async endInterview(sessionId: string, reason: string = 'normal') {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // 无论何种原因结束，都需清除该会话的所有超时计时器，避免泄露
    this.clearQuestionTimers(sessionId);
    this.clearInterviewTimer(sessionId);

    session.state = InterviewState.COMPLETED;
    session.endTime = new Date();
    if (reason && reason !== 'normal') {
      console.log(`[InterviewFlow] 会话 ${sessionId} 面试结束，原因=${reason}`);
    }

    // 统计已回答（即 completed）且回答不是空或超时未作答的题目数量
    const validAnswers = session.rounds.filter(
      r => r.status === 'completed' && r.userResponse && r.userResponse !== '[超时未作答]' && r.userResponse.trim().length > 2
    ).length;

    // 判定是否真正成功完成
    const isSuccessfulCompleted = reason === 'normal' && validAnswers > 0;

    // 生成并发送结束语
    let closingText = '';
    let summary = '';
    if (reason === 'unsuitable') {
      closingText = '由于检测到您的回答音量较小、背景噪音过大，或内容与本次面试职位极不匹配，我们将暂停本次面试。期待您准备好后再继续。';
    } else {
      summary = await this.generateSummary(session);
      const closingResult = await deepseekService.generateClosing(summary);
      closingText = closingResult.closing;
    }
    await this.sendToAvatarAndTTS(sessionId, session.userId, closingText);

    // 停止数字人生命周期
    await avatarService.stopAvatarInstance(sessionId, session.userId);

    return {
      sessionId,
      summary,
      reason,
      totalRounds: session.rounds.length,
      completedRounds: session.rounds.filter(r => r.status === 'completed').length,
      isCompleted: isSuccessfulCompleted
    };
  }

  /**
   * 生成面试总结
   */
  private async generateSummary(session: InterviewSession) {
    const prompt = `基于以下面试表现生成总结：

候选人：${session.userInfo.name}
目标职位：${session.userInfo.targetJob}
回答数量：${session.rounds.filter(r => r.status === 'completed').length}

请提供一个简短但专业的面试总结，包括整体表现评价和建议。`;

    const response = await deepseekService.generateSummary(prompt);
    return response.summary;
  }

  /**
   * 当前候选人正在作答的题号（与 DB questionIndex 对齐，0-based）
   */
  getCurrentRespondingQuestionIndex0(sessionId: string): number | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const current = session.rounds.find(r => r.status === 'in_progress');
    if (!current) {
      return null;
    }
    return Math.max(0, current.roundNumber - 1);
  }

  /**
   * 获取会话状态
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 移除指定会话（重连踢掉旧 session / 超时清理时调用）
   */
  removeSession(sessionId: string): void {
    this.clearQuestionTimers(sessionId);
    this.clearInterviewTimer(sessionId);
    this.sessions.delete(sessionId);
    console.log(`[FlowController] Session ${sessionId} 已移除，当前活跃: ${this.sessions.size}`);
  }

  /**
   * WebSocket 断点续面：已有答题记录或 DB 已进入 IN_PROGRESS 时，避免重复首访欢迎语。
   * 首访（仅 PREPARING、尚无作答）仍为 false，可走自我介绍欢迎流程。
   */
  isWarmResumeEligible(session: InterviewSession): boolean {
    if (session.rounds.some(r => r.status === 'completed')) {
      return true;
    }
    // 内存判定：如果有任何题目处于进行中，也属于续面
    if (session.rounds.some(r => r.status === 'in_progress')) {
      return true;
    }
    // 如果已经有生成的题目（即使状态是 PREPARING），且当前不是第0题，也认为是续面
    if (session.rounds.length > 0 && (session.dbMirror?.currentQuestion ?? 0) > 0) {
      return true;
    }
    const st = session.dbMirror?.status;
    return st === 'IN_PROGRESS' || st === 'COMPLETED';
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): InterviewSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAgeHours: number = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffTime) {
        if (session.state !== InterviewState.COMPLETED) {
          await this.endInterview(sessionId);
        }
        // 占隆安全：明确释放超时器与会话记录
        this.clearQuestionTimers(sessionId);
        this.clearInterviewTimer(sessionId);
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // ==================== 超时保护：单题级 ====================

  /**
   * 启动单题超时计时器（提醒阶段）。
   * 逻辑：在 QUESTION_REMINDER_TIMEOUT_MS 后触发提醒，进入 skip 等待阶段。
   */
  private startQuestionTimer(sessionId: string): void {
    this.clearQuestionTimers(sessionId);

    const reminderTimer = setTimeout(() => {
      console.log(
        `[InterviewFlow] 会话 ${sessionId} 单题超时提醒 (${this.QUESTION_REMINDER_TIMEOUT_MS / 1000}s)`
      );
      this.handleQuestionTimeout(sessionId, 'reminder');
    }, this.QUESTION_REMINDER_TIMEOUT_MS);

    this.questionTimers.set(sessionId, { reminderTimer, skipTimer: null });
  }

  /**
   * 清除单题超时计时器（提醒 + 跳题）。
   */
  private clearQuestionTimers(sessionId: string): void {
    const timers = this.questionTimers.get(sessionId);
    if (timers) {
      if (timers.reminderTimer) clearTimeout(timers.reminderTimer);
      if (timers.skipTimer) clearTimeout(timers.skipTimer);
      this.questionTimers.delete(sessionId);
    }
  }

  /**
   * 单题超时事件处理：
   *  - reminder：提醒候选人可以继续思考，同时启动跳题计时器
   *  - skip：下发跳题提示并自动推进到下一题
   */
  private handleQuestionTimeout(sessionId: string, stage: 'reminder' | 'skip'): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state === InterviewState.COMPLETED) {
      this.clearQuestionTimers(sessionId);
      return;
    }

    if (stage === 'reminder') {
      // 发送 TTS 提示语
      this.emitTimeoutEvent(
        sessionId,
        'question_reminder',
        '如果您还需要时间思考，可以继续，我等您准备好再回答。'
      );
      // 启动跳题计时器
      const timers = this.questionTimers.get(sessionId);
      if (timers) {
        timers.skipTimer = setTimeout(() => {
          console.log(`[InterviewFlow] 会话 ${sessionId} 跳题超时触发`);
          this.handleQuestionTimeout(sessionId, 'skip');
        }, this.QUESTION_SKIP_TIMEOUT_MS);
      }
    } else {
      // 自动跳题
      this.emitTimeoutEvent(sessionId, 'question_skip', '没关系，我们跳到下一个问题。');
      this.autoSkipToNextRound(sessionId).catch((err: any) =>
        console.error(`[InterviewFlow] 会话 ${sessionId} 自动跳题异常: ${err?.message || err}`)
      );
    }
  }

  /**
   * 将当前题标记为跳过状态并推进到下一题。
   */
  private async autoSkipToNextRound(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return;

      const currentRound = session.rounds.find((r) => r.status === 'in_progress');
      if (currentRound) {
        currentRound.status = 'skipped';
        currentRound.endTime = new Date();
        currentRound.userResponse = '[超时未作答]';

        // 同步到 DB：将题目记为已作答状态，避免后续分析陛入死循环
        try {
          await prisma.aIInterviewQuestion.updateMany({
            where: { sessionId: session.sessionId, questionIndex: this.toQuestionIndex(currentRound) },
            data: {
              answerText: '[超时未作答]',
              answeredAt: new Date(),
            },
          });
        } catch (err: any) {
          console.warn(`[InterviewFlow] 跳题持久化失败 (可忽略): ${err?.message || err}`);
        }
      }

      // 尝试推进到下一题（startNextRound 内部会启动新的超时计时器）
      await this.startNextRound(sessionId);
    } catch (err: any) {
      console.error(`[InterviewFlow] 会话 ${sessionId} 自动跳题失败: ${err?.message || err}`);
    }
  }

  // ==================== 超时保护：整场面试级 ====================

  /**
   * 启动整场面试超时计时器。到达 INTERVIEW_MAX_DURATION_MS 后强制结束面试。
   */
  private startInterviewTimer(sessionId: string): void {
    this.clearInterviewTimer(sessionId);

    const timer = setTimeout(() => {
      console.warn(
        `[InterviewFlow] 会话 ${sessionId} 面试全局超时 (${this.INTERVIEW_MAX_DURATION_MS / 60000}分钟)`
      );
      this.handleInterviewGlobalTimeout(sessionId).catch((err: any) =>
        console.error(
          `[InterviewFlow] 会话 ${sessionId} 面试全局超时处理异常: ${err?.message || err}`
        )
      );
    }, this.INTERVIEW_MAX_DURATION_MS);

    this.interviewTimers.set(sessionId, timer);
  }

  /**
   * 清除整场面试超时计时器。
   */
  private clearInterviewTimer(sessionId: string): void {
    const timer = this.interviewTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.interviewTimers.delete(sessionId);
    }
  }

  /**
   * 面试全局超时处理：发送结束 TTS 并调用 endInterview。
   */
  private async handleInterviewGlobalTimeout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state === InterviewState.COMPLETED) {
      this.clearInterviewTimer(sessionId);
      return;
    }

    this.emitTimeoutEvent(
      sessionId,
      'interview_timeout',
      '感谢您的耐心配合，由于时间关系，我们今天的面试到此结束。感谢您的参与！'
    );

    try {
      await this.endInterview(sessionId, 'timeout');
    } catch (err: any) {
      console.error(
        `[InterviewFlow] 会话 ${sessionId} 超时后调用 endInterview 异常: ${err?.message || err}`
      );
    }
  }

  // ==================== 超时事件广播 ====================

  /**
   * 发出超时事件：
   *  1. 通过 qwen3TTSClient 下发 TTS 语音提示
   *  2. 向 outbound session/broadcast 频道发布 timeout_notification 事件供网关转发
   *  3. 同时向 inbound stream 投递一条 TIMEOUT 事件，让 coordinator 统一处理、记录并转发
   */
  private emitTimeoutEvent(sessionId: string, eventType: string, ttsText: string): void {
    // 1. TTS 语音下发（调用现有 qwen3TTSClient 并清除之前的任务）
    try {
      qwen3TTSClient.clearSynthesis(sessionId);
      qwen3TTSClient.synthesize(sessionId, ttsText, true);
    } catch (err: any) {
      console.warn(`[InterviewFlow] 超时 TTS 下发失败 (可忽略): ${err?.message || err}`);
    }

    // 2. 发布到 outbound 频道，让网关与客户端双路跟进状态
    const session = this.sessions.get(sessionId);
    const gatewayId = (session as any)?.gatewayId as string | undefined;
    const message = JSON.stringify({
      type: 'timeout_notification',
      sessionId,
      payload: {
        eventType, // 'question_reminder' | 'question_skip' | 'interview_timeout'
        text: ttsText,
        timestamp: Date.now(),
      },
    });
    const pub = this.getTimeoutPubClient();
    pub.publish(`interview:events:outbound:session:${sessionId}`, message).catch((err: any) =>
      console.error(`[InterviewFlow] 发布 timeout_notification 到 session 频道失败: ${err?.message || err}`)
    );
    pub.publish('interview:events:outbound:broadcast', message).catch((err: any) =>
      console.error(`[InterviewFlow] 发布 timeout_notification 到 broadcast 失败: ${err?.message || err}`)
    );
    if (gatewayId) {
      pub.publish(`interview:events:outbound:${gatewayId}`, message).catch((err: any) =>
        console.error(`[InterviewFlow] 发布 timeout_notification 到 gateway 频道失败: ${err?.message || err}`)
      );
    }

    // 3. 同时写入 inbound stream 让 coordinator 统一记录 / 转发（保留业务事件轨迹）
    redisStreamService
      .add('interview:inbound_stream', {
        type: 'TIMEOUT',
        sessionId,
        gatewayId,
        payload: {
          eventType,
          text: ttsText,
          timestamp: Date.now(),
        },
      })
      .catch((err: any) =>
        console.warn(`[InterviewFlow] 超时事件写入 inbound stream 失败 (可忽略): ${err?.message || err}`)
      );

    console.log(`[InterviewFlow] 会话 ${sessionId} 发出超时事件: ${eventType}`);
  }
}

export const interviewFlowService = new InterviewFlowService();
