import { deepseekService, OpeningResult, ClosingResult } from './deepseekService';
import { ttsService } from './ttsService';
import { avatarService } from './avatar.service';
import { interviewConductor } from './interview-conductor.service';
import { aiInterviewService } from './aiInterviewService';
import { InterviewSession, InterviewRound, InterviewState, ResponseAnalysis } from '../models/interviewFlow';

function rehydrateQuestionHasAnswer(q: {
  answerText?: string | null;
  answerVideoUrl?: string | null;
}): boolean {
  return Boolean(
    q.answerVideoUrl ||
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

    try {
      await this.tryRehydrateFromPrisma(session, userId);
    } catch (err: any) {
      console.warn(`[InterviewFlow] tryRehydrateFromPrisma 跳过: ${err?.message || err}`);
    }

    this.sessions.set(sessionId, session);
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
        suggestedTime: 180,
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

    if (session.rounds.length === 0) {
      try {
        await this.tryRehydrateFromPrisma(session, session.userId);
      } catch (err: any) {
        console.warn(`[InterviewFlow] startInterviewPhase 内 DB 恢复跳过: ${err?.message || err}`);
      }
    }

    if (session.rounds.length > 0) {
      if (session.rounds.every(r => r.status === 'completed')) {
        session.state = InterviewState.COMPLETED;
        return {
          totalRounds: session.rounds.length,
          firstRound: session.rounds[session.rounds.length - 1],
        };
      }

      session.state = InterviewState.READY;
      const inProgress = session.rounds.find(r => r.status === 'in_progress');
      if (inProgress) {
        return {
          totalRounds: session.rounds.length,
          firstRound: inProgress,
        };
      }

      await this.startNextRound(sessionId);
      const cur =
        session.rounds.find(r => r.status === 'in_progress') ||
        session.rounds.find(r => r.status === 'pending');
      return {
        totalRounds: session.rounds.length,
        firstRound: cur || session.rounds[session.rounds.length - 1],
      };
    }

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
      firstRound: interviewRounds[0]
    };
  }

  /**
   * 使用DeepSeek AI生成面试内容
   */
  private async generateInterviewContent(session: InterviewSession) {
    const prompt = `作为一位专业、公正且严肃的AI面试官（10年资深HR总监形象），请为以下候选人生成一套完整的面试问题：

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

【重要】每个问题请用 [emotion:标签] 标记语气，用于 TTS 情感合成：
- [emotion:opening] — 开场问候
- [emotion:question] — 正式提问
- [emotion:challenge] — 压力测试/质疑
- [emotion:transition] — 话题切换
- [emotion:closing] — 结束语

示例：
"[emotion:opening]${session.userInfo.name}您好，欢迎参加今天的面试。我是您的面试官，接下来我们将围绕${session.userInfo.targetJob}这个岗位进行深入交流。"
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

      // 清除情感标注，保留纯文本用于存储
      const cleanText = question.text.replace(/\[emotion:[^\]]+\]/g, '').trim();

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
    }> = [];

    const pushQuestion = (rawBlock: string) => {
      const text = stripOuterBold(rawBlock);
      if (!/\[emotion:[^\]]+\]/.test(text)) {
        return;
      }
      const bodyForLen = text.replace(/\[emotion:[^\]]+\]/g, '').trim();
      if (bodyForLen.length < 12) {
        return;
      }
      const key = bodyForLen.slice(0, 96);
      if (dedupeKeys.has(key)) {
        return;
      }
      dedupeKeys.add(key);
      questions.push({ text, ...defaults });
    };

    // 1) 标准 Markdown：**[emotion:…] ……**（非贪婪到成对 **，可跨行）
    const boldBlocks = content.matchAll(/\*\*\s*\[emotion:[^\]]+\][\s\S]*?\*\*/g);
    for (const m of boldBlocks) {
      pushQuestion(m[0]);
    }

    // 2) 模型偶发省略闭合 **，或输出被 max_tokens 截断：从 **[emotion 起到行尾/文尾
    if (questions.length === 0) {
      const looseBlocks = content.matchAll(/\*\*\s*\[emotion:[^\]]+\][\s\S]*?(?=\n\s*\*\*\s*\[emotion:]|$)/g);
      for (const m of looseBlocks) {
        pushQuestion(m[0].replace(/\s+$/, ''));
      }
    }

    // 3) 无 ** 包裹：以 [emotion: 分段
    if (questions.length === 0) {
      const parts = content.split(/(?=\[emotion:[^\]]+\])/);
      for (const p of parts) {
        const t = p.trim();
        if (t.startsWith('[emotion:')) {
          pushQuestion(t);
        }
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

    const nextRound = session.rounds.find(r => r.status === 'pending');
    if (!nextRound) {
      session.state = InterviewState.COMPLETED;
      return null;
    }

    nextRound.status = 'in_progress';
    session.currentRound = nextRound.roundNumber;

    // Web 嵌入式数字人侧记一笔；失败不阻断流程（实时链路靠 Socket + Qwen3-TTS）
    try {
      await avatarService.sendTextToAvatar(sessionId, session.userId, nextRound.question);
    } catch (err: any) {
      console.warn(
        `[InterviewFlow] sendTextToAvatar 跳过: ${err?.message || err}`
      );
    }

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

    // 开始下一轮（或者是刚才插入的追问）
    const nextRound = await this.startNextRound(sessionId);

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
        }
      } catch (e) {
        console.warn('[InterviewFlow] 下一题上下文润色跳过:', e);
      }
    }

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
   * WebSocket 断点续面：已有答题记录或 DB 已进入 IN_PROGRESS 时，避免重复首访欢迎语。
   * 首访（仅 PREPARING、尚无作答）仍为 false，可走自我介绍欢迎流程。
   */
  isWarmResumeEligible(session: InterviewSession): boolean {
    if (session.rounds.some(r => r.status === 'completed')) {
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
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

export const interviewFlowService = new InterviewFlowService();
