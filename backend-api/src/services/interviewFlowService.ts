import { deepseekService, OpeningResult, ClosingResult } from './deepseekService.js';
import { ttsService } from './ttsService.js';
import { avatarService } from './avatar.service'; // Import avatarService
import { InterviewSession, InterviewRound, InterviewState, ResponseAnalysis } from '../models/interviewFlow.js'; // Import ResponseAnalysis

/**
 * 面试流程服务
 * 实现完整的两阶段面试：
 * 1. 用户信息收集阶段
 * 2. AI生成内容 + TTS语音驱动阶段
 */
export class InterviewFlowService {
  private sessions = new Map<string, InterviewSession>();

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

    await avatarService.sendTextToAvatar(sessionId, userId, openingResult.opening);

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
        await avatarService.sendTextToAvatar(sessionId, session.userId, text);
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
        await avatarService.sendTextToAvatar(sessionId, session.userId, text);
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

    await avatarService.sendTextToAvatar(sessionId, session.userId, confirmation);
    await new Promise(resolve => setTimeout(resolve, 3000));

    return session.userInfo;
  }

  /**
   * 第二阶段：AI生成面试内容
   */
  async startInterviewPhase(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.state = InterviewState.GENERATING;

    // 1. 使用DeepSeek生成面试内容
    const interviewContent = await this.generateInterviewContent(session);

    // 2. 将内容转换为语音回合
    const interviewRounds = await this.createInterviewRounds(sessionId, interviewContent);

    session.rounds = interviewRounds;
    session.state = InterviewState.READY;

    // 3. 开始第一轮面试
    await this.startNextRound(sessionId);

    return {
      totalRounds: interviewRounds.length,
      firstQuestion: interviewRounds[0]?.question
    };
  }

  /**
   * 使用DeepSeek AI生成面试内容
   */
  private async generateInterviewContent(session: InterviewSession) {
    const prompt = `作为专业的AI面试官，请为以下候选人生成一套完整的面试问题：

候选人信息：
- 姓名：${session.userInfo.name}
- 目标职位：${session.userInfo.targetJob}
- 背景：${session.userInfo.background}
- 经验：${session.userInfo.experience || '未指定'}
- 技能：${session.userInfo.skills?.join(', ') || '未指定'}

请生成包含以下内容的面试：
1. 开场介绍（1个问题）
2. 专业技能评估（3-4个问题）
3. 项目经验询问（2个问题）
4. 行为面试问题（2个问题）
5. 总结和反问环节（1个问题）

每个问题后请提供：
- 问题文本
- 预期考察点
- 建议回答时间
- 评分标准

请用中文回答，保持专业友好的语气。`;

    const response = await deepseekService.generateInterview(prompt);
    return response.content;
  }

  /**
   * 创建面试回合
   */
  private async createInterviewRounds(sessionId: string, content: string): Promise<InterviewRound[]> {
    const rounds: InterviewRound[] = [];

    // 解析DeepSeek生成的内容
    const questions = this.parseInterviewContent(content);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // 生成TTS语音
      const ttsResult = await ttsService.textToSpeech({
        text: question.text,
        voice: 'siqi'
      });

      const round: InterviewRound = {
        roundNumber: i + 1,
        question: question.text,
        audioUrl: ttsResult.audioUrl,
        duration: ttsResult.duration || 0, // Provide a default value
        expectedPoints: question.expectedPoints,
        suggestedTime: question.suggestedTime, // Corrected typo
        scoringCriteria: question.scoringCriteria,
        status: 'pending'
      };

      rounds.push(round);
    }

    return rounds;
  }

  /**
   * 解析面试内容
   */
  private parseInterviewContent(content: string) {
    // 这里实现从DeepSeek响应中解析问题
    // 简化版实现
    const questions = content.split('\n').filter(line =>
      line.trim().startsWith('问题') || line.trim().endsWith('？')
    ).map((q, index) => ({
      text: q.trim(),
      expectedPoints: ['专业能力', '沟通表达', '逻辑思维'],
      suggestedTime: 180, // 3分钟
      scoringCriteria: ['完整回答', '逻辑清晰', '专业深度']
    }));

    return questions;
  }

  /**
   * 开始下一轮面试
   */
  async startNextRound(sessionId: string): Promise<InterviewRound | null> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const nextRound = session.rounds.find(r => r.status === 'pending');
    if (!nextRound) {
      session.state = InterviewState.COMPLETED;
      return null;
    }

    nextRound.status = 'in_progress';
    session.currentRound = nextRound.roundNumber;

    // 通过数字人播放问题
    await avatarService.sendTextToAvatar(sessionId, session.userId, nextRound.question);

    // 如果有音频文件，客户端会播放音频，这里不需要服务器端播放
    // if (nextRound.audioUrl) {
    //   await this.playAudio(sessionId, nextRound.audioUrl);
    // }

    return nextRound;
  }

  /**
   * 处理用户回答
   */
  async processUserResponse(sessionId: string, response: string): Promise<{
    nextRound?: InterviewRound | null; // Changed to allow null
    isCompleted: boolean;
    feedback?: string;
    score?: number; // Added score
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const currentRound = session.rounds.find(r => r.status === 'in_progress');
    let analysisResult;

    if (currentRound) {
      currentRound.userResponse = response;
      currentRound.status = 'completed';

      // AI分析用户回答
      const prompt = `
问题：${currentRound.question}
回答：${response}
历史对话数：${currentRound.followupCount || 0}

请分析回答质量，并判断是否需要追问。如果回答太简略或不清楚，且追问次数未超过2次，建议追问。
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

        // 插入新的追问回合
        const followupRound: InterviewRound = {
          roundNumber: currentRound.roundNumber, // 保持同一个大题号
          question: followup.question,
          duration: 0,
          expectedPoints: currentRound.expectedPoints,
          suggestedTime: 120,
          scoringCriteria: currentRound.scoringCriteria,
          status: 'pending',
          followupCount: currentFollowupCount + 1
        };

        // 找到当前回合的索引，插入到后面
        const currentIndex = session.rounds.findIndex(r => r === currentRound);
        if (currentIndex !== -1) {
          session.rounds.splice(currentIndex + 1, 0, followupRound);
        }
      }
    }

    // 开始下一轮（或者是刚才插入的追问）
    const nextRound = await this.startNextRound(sessionId);

    return {
      nextRound,
      isCompleted: !nextRound,
      feedback: analysisResult?.feedback,
      score: analysisResult?.score
    };
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
   */
  async endInterview(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.state = InterviewState.COMPLETED;
    session.endTime = new Date();

    // 生成总结
    const summary = await this.generateSummary(session);

    // 生成并发送结束语
    const closingResult = await deepseekService.generateClosing(summary);
    await avatarService.sendTextToAvatar(sessionId, session.userId, closingResult.closing);

    // 停止数字人生命周期
    await avatarService.stopAvatarInstance(sessionId, session.userId);

    return {
      sessionId,
      summary,
      totalRounds: session.rounds.length,
      completedRounds: session.rounds.filter(r => r.status === 'completed').length
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
   * 获取会话状态
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
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
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

export const interviewFlowService = new InterviewFlowService();
