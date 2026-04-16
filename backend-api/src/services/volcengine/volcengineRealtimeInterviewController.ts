import { volcengineDoubaoService } from './volcengineDoubaoService';
import { volcengineTtsService } from './volcengineTtsService';

/**
 * 火山引擎实时面试控制器
 * 整合豆包大模型、TTS语音合成，实现完整的数字人面试官体验
 */

interface InterviewSession {
  sessionId: string;
  userId: string;
  jobPosition: string;
  jobCategory?: string;
  userBackground?: string;
  companyName?: string;
  status: 'PREPARING' | 'IN_PROGRESS' | 'WAITING_FOR_ANSWER' | 'COMPLETED';
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: string[];
  answers: Array<{
    question: string;
    answer: string;
    timestamp: number;
    score?: number;
  }>;
  startTime: number;
  lastInteractionTime: number;
  overallScore?: number;
}

interface InterviewEvent {
  type: 'OPENING' | 'QUESTION' | 'FOLLOWUP' | 'ANALYSIS' | 'CLOSING';
  text: string;
  audioUrl?: string;
  metadata?: Record<string, any>;
}

export class VolcengineRealtimeInterviewController {
  private sessions: Map<string, InterviewSession> = new Map();
  private readonly DEFAULT_TOTAL_QUESTIONS = 5;

  /**
   * 开始新的面试会话
   */
  async startInterview(params: {
    sessionId: string;
    userId: string;
    jobPosition: string;
    jobCategory?: string;
    userBackground?: string;
    companyName?: string;
    totalQuestions?: number;
  }): Promise<InterviewEvent> {
    const {
      sessionId,
      userId,
      jobPosition,
      jobCategory = '技术类',
      userBackground = '有相关工作经验',
      companyName,
      totalQuestions = this.DEFAULT_TOTAL_QUESTIONS,
    } = params;

    console.log(`[火山引擎面试] 开始新会话: ${sessionId}, 职位: ${jobPosition}`);

    // 创建会话
    const session: InterviewSession = {
      sessionId,
      userId,
      jobPosition,
      jobCategory,
      userBackground,
      companyName,
      status: 'PREPARING',
      currentQuestionIndex: 0,
      totalQuestions,
      questions: [],
      answers: [],
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // 生成开场白
    const userName = await this.getUserName(userId);
    const openingText = await volcengineDoubaoService.generateOpening({
      userName,
      jobPosition,
      companyName,
    });

    // 生成TTS语音
    const ttsResult = await volcengineTtsService.synthesize({
      text: openingText,
      emotion: 'friendly',
      sessionId,
    });

    session.status = 'IN_PROGRESS';

    return {
      type: 'OPENING',
      text: openingText,
      audioUrl: ttsResult.audioUrl,
      metadata: {
        sessionId,
        duration: ttsResult.duration,
      },
    };
  }

  /**
   * 处理用户输入并生成面试官响应
   */
  async processUserInput(params: {
    sessionId: string;
    userInput: string;
  }): Promise<InterviewEvent> {
    const { sessionId, userInput } = params;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.lastInteractionTime = Date.now();

    console.log(`[火山引擎面试] 处理用户输入: ${sessionId}, 输入长度: ${userInput.length}`);

    // 如果是第一个用户输入（自我介绍），保存后生成第一个问题
    if (session.status === 'IN_PROGRESS' && session.currentQuestionIndex === 0) {
      // 保存自我介绍
      session.answers.push({
        question: '自我介绍',
        answer: userInput,
        timestamp: Date.now(),
      });

      // 生成第一个专业问题
      return this.generateNextQuestion(session);
    }

    // 如果正在等待回答，保存回答并生成下一个问题或分析
    if (session.status === 'WAITING_FOR_ANSWER') {
      const currentQuestion = session.questions[session.currentQuestionIndex - 1];

      // 分析回答
      const analysis = await volcengineDoubaoService.analyzeAnswer({
        question: currentQuestion,
        answer: userInput,
        jobPosition: session.jobPosition,
      });

      // 保存回答
      session.answers.push({
        question: currentQuestion,
        answer: userInput,
        timestamp: Date.now(),
        score: analysis.score,
      });

      // 检查是否需要追问
      if (analysis.needsFollowup && session.currentQuestionIndex < session.totalQuestions + 2) {
        return this.generateFollowup(session, currentQuestion, userInput);
      }

      // 检查面试是否结束
      if (session.currentQuestionIndex >= session.totalQuestions) {
        return this.completeInterview(session);
      }

      // 生成下一个问题
      return this.generateNextQuestion(session);
    }

    // 默认响应
    return {
      type: 'QUESTION',
      text: '请继续您的回答。',
    };
  }

  /**
   * 生成下一个面试问题
   */
  private async generateNextQuestion(session: InterviewSession): Promise<InterviewEvent> {
    session.currentQuestionIndex++;

    // 构建上下文
    const previousContext = this.buildContext(session);

    // 生成问题
    const questionText = await volcengineDoubaoService.generateQuestion({
      jobPosition: session.jobPosition,
      jobCategory: session.jobCategory,
      userBackground: session.userBackground,
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.totalQuestions,
      previousContext,
    });

    session.questions.push(questionText);
    session.status = 'WAITING_FOR_ANSWER';

    // 生成TTS语音
    const ttsResult = await volcengineTtsService.synthesize({
      text: questionText,
      emotion: 'serious',
      sessionId: session.sessionId,
    });

    return {
      type: 'QUESTION',
      text: questionText,
      audioUrl: ttsResult.audioUrl,
      metadata: {
        questionIndex: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        duration: ttsResult.duration,
      },
    };
  }

  /**
   * 生成追问
   */
  private async generateFollowup(
    session: InterviewSession,
    originalQuestion: string,
    previousAnswer: string
  ): Promise<InterviewEvent> {
    const followupText = await volcengineDoubaoService.generateFollowup({
      originalQuestion,
      previousAnswer,
      jobPosition: session.jobPosition,
    });

    // 生成TTS语音
    const ttsResult = await volcengineTtsService.synthesize({
      text: followupText,
      emotion: 'curious' as any,
      sessionId: session.sessionId,
    });

    return {
      type: 'FOLLOWUP',
      text: followupText,
      audioUrl: ttsResult.audioUrl,
      metadata: {
        isFollowup: true,
        originalQuestion,
        duration: ttsResult.duration,
      },
    };
  }

  /**
   * 完成面试
   */
  private async completeInterview(session: InterviewSession): Promise<InterviewEvent> {
    session.status = 'COMPLETED';

    // 计算总体评分
    const scores = session.answers.filter(a => a.score !== undefined).map(a => a.score!);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 75;

    session.overallScore = overallScore;

    // 获取用户名称
    const userName = await this.getUserName(session.userId);

    // 生成结束语
    const closingText = await volcengineDoubaoService.generateClosing({
      userName,
      overallScore,
      summary: overallScore >= 80 ? '表现优秀' : overallScore >= 60 ? '表现良好' : '需要提升',
    });

    // 生成TTS语音
    const ttsResult = await volcengineTtsService.synthesize({
      text: closingText,
      emotion: 'friendly',
      sessionId: session.sessionId,
    });

    return {
      type: 'CLOSING',
      text: closingText,
      audioUrl: ttsResult.audioUrl,
      metadata: {
        overallScore,
        totalQuestions: session.totalQuestions,
        answerCount: session.answers.length,
        duration: ttsResult.duration,
        sessionDuration: Math.round((Date.now() - session.startTime) / 1000),
      },
    };
  }

  /**
   * 构建对话上下文
   */
  private buildContext(session: InterviewSession): string {
    const contextParts: string[] = [];

    for (let i = 0; i < Math.min(session.questions.length, 3); i++) {
      const question = session.questions[i];
      const answer = session.answers[i + 1]; // answers[0]是自我介绍

      if (question && answer) {
        contextParts.push(`面试官: ${question}`);
        contextParts.push(`候选人: ${answer.answer.substring(0, 200)}...`);
      }
    }

    return contextParts.join('\n');
  }

  /**
   * 获取用户名称（模拟实现）
   */
  private async getUserName(userId: string): Promise<string> {
    // TODO: 实际项目中从数据库获取用户信息
    return '候选人';
  }

  /**
   * 获取会话状态
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[火山引擎面试] 会话已结束: ${sessionId}`);
  }

  /**
   * 清理超时会话（超过1小时）
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = 60 * 60 * 1000; // 1小时

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastInteractionTime > timeout) {
        this.sessions.delete(sessionId);
        console.log(`[火山引擎面试] 清理超时会话: ${sessionId}`);
      }
    }
  }
}

// 单例实例
export const volcengineRealtimeInterviewController = new VolcengineRealtimeInterviewController();
