import { Redis } from 'ioredis';
import { redisConnection } from '../config/redis';
import { redisStreamService } from './redis-stream.service';
import { serviceDiscoveryService } from './service-discovery.service';
import { v4 as uuidv4 } from 'uuid';
import { interviewFlowService } from './flow-controller.service';
import { qwen3TTSClient } from './qwen3-tts-service-client';
import { interviewConductor, type InterviewScene } from './interview-conductor.service';
import { prisma } from '../lib/prisma';

export class CoordinatorService {
  private static instance: CoordinatorService;
  private pubClient: Redis;
  private workerId: string;
  private streamRunning: boolean = false;
  private sessionQueues: Map<string, Promise<any>> = new Map();
  private sessionPrepareTasks: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.workerId = `worker-${uuidv4().slice(0, 8)}`;
    this.pubClient = new Redis(redisConnection);
    this.pubClient.on('error', (err) => console.error(`[Coordinator ${this.workerId}] PubClient Redis Error: ${err.message}`));
    const redisTarget = `${redisConnection.host || 'localhost'}:${redisConnection.port || 6379}/${redisConnection.db ?? 0}`;
    console.log(`[Coordinator ${this.workerId}] Redis connection target: ${redisTarget}`);

    this.startStreamConsumer();
    this.setupSubscriptions();
    this.startHeartbeat();
  }

  static getInstance(): CoordinatorService {
    if (!CoordinatorService.instance) {
      CoordinatorService.instance = new CoordinatorService();
    }
    return CoordinatorService.instance;
  }

  private startHeartbeat() {
    setInterval(() => {
      serviceDiscoveryService.heartbeat({
        id: this.workerId,
        type: 'interview',
        url: '', // Business logic doesn't have a public URL
        load: this.sessionQueues.size,
        lastSeen: Date.now()
      });
    }, 5000);
  }

  private async startStreamConsumer() {
    const streamName = 'interview:inbound_stream';
    const groupName = 'interview_service_group';
    
    await redisStreamService.createConsumerGroup(streamName, groupName);
    this.streamRunning = true;
    
    console.log(`[Coordinator ${this.workerId}] Listening to stream: ${streamName}`);
    
    while (this.streamRunning) {
      try {
        const messages = await redisStreamService.readGroup(streamName, groupName, this.workerId, 5);
        
        for (const { id, data } of messages) {
          await this.handleInboundEvent(data);
          await redisStreamService.ack(streamName, groupName, id);
        }
      } catch (err) {
        console.error('[Coordinator] Error in stream consumer loop:', err);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private setupSubscriptions() {
    // Keep ASR subscription as it might be broadcast from asr-service
    const asrSubClient = new Redis(redisConnection);
    asrSubClient.on('error', (err) => console.error(`[Coordinator ${this.workerId}] AsrSubClient Redis Error: ${err.message}`));
    asrSubClient.subscribe('asr:events', (err) => {
      if (err) console.error('[Coordinator] Failed to subscribe to ASR events:', err);
      else console.log('[Coordinator] Subscribed to asr:events');
    });

    asrSubClient.on('message', async (channel, message) => {
      if (channel === 'asr:events') {
        try {
          const data = JSON.parse(message);
          if (data.event === 'transcription_completed') {
            await this.handleAsrTranscription(data);
          }
        } catch (e) {
          console.error('[Coordinator] Error handling ASR message:', e);
        }
      }
    });
  }

  private emitToGateway(sessionId: string, type: string, payload: any, gatewayId?: string) {
    const message = JSON.stringify({ type, sessionId, payload });
    const sessionChannel = `interview:events:outbound:session:${sessionId}`;

    // 1. 始终发布到 session 频道（TTS 服务等下游微服务订阅）
    this.pubClient.publish(sessionChannel, message).catch((err) => {
      console.error(`[Coordinator] Failed to publish ${type} to session channel:`, err);
    });

    // 2. 始终发布到 broadcast 频道（网关兜底），确保客户端一定能收到事件（含字幕文本）
    //    此前仅在 session 频道无订阅者时才 fallback，但 TTS 服务订阅后 receivers>0，
    //    导致网关从未收到 voice_response，客户端字幕为空。
    this.pubClient.publish('interview:events:outbound:broadcast', message).catch((err) => {
      console.error(`[Coordinator] Failed to publish ${type} to broadcast:`, err);
    });

    // 3. 如果有明确的 gatewayId，额外推送到网关专属频道（最精准的路由）
    if (gatewayId) {
      const gwChannel = `interview:events:outbound:${gatewayId}`;
      this.pubClient.publish(gwChannel, message).catch((err) => {
        console.error(`[Coordinator] Failed to publish ${type} to gateway channel:`, err);
      });
    }

    console.log(`[Coordinator] Published ${type} for session=${sessionId}${gatewayId ? ` gw=${gatewayId}` : ''} (session+broadcast)`);
  }

  private async runInQueue(sessionId: string, task: () => Promise<any>) {
    const previousTask = this.sessionQueues.get(sessionId) || Promise.resolve();
    const nextTask = previousTask.then(task).catch(err => {
      console.error(`[Coordinator] Error in queue for session ${sessionId}:`, err);
    });
    this.sessionQueues.set(sessionId, nextTask);
    
    // 清理已完成的长队列，避免内存泄漏
    nextTask.finally(() => {
        if (this.sessionQueues.get(sessionId) === nextTask) {
            // Only delete if no new task has been added since
            // Actually, we can just let it be, or use a more sophisticated approach.
            // For now, keeping it simple.
        }
    });

    return nextTask;
  }

  private async handleInboundEvent(data: any) {
    const { type, sessionId, userId, jobPosition, background, text, socketId, gatewayId } = data;

    // Cache gatewayId for this session if available
    const session = interviewFlowService.getSession(sessionId);
    if (session && gatewayId) {
      (session as any).gatewayId = gatewayId;
    }

    switch (type) {
      case 'JOIN_SESSION':
        this.runInQueue(sessionId, () => this.handleJoinSession(sessionId, userId, jobPosition, background, socketId, gatewayId));
        break;
      case 'TEXT_MESSAGE':
        this.runInQueue(sessionId, () => this.processUserResponse(sessionId, text, 'text'));
        break;
      case 'PLAYBACK_DONE':
        this.runInQueue(sessionId, async () => {
          const session = interviewFlowService.getSession(sessionId);
          if (session && session.runtimePhase === 'speaking') {
            session.runtimePhase = 'listening';
          }
        });
        break;
      case 'DISCONNECT':
        console.log(`[Coordinator] Client disconnected: ${sessionId} (Gateway: ${gatewayId}, Socket: ${socketId})`);
        break;
      case 'INTERRUPT':
        {
          const session = interviewFlowService.getSession(sessionId);
          if (session) {
            session.runtimePhase = 'listening';
          }
        }
        break;
      case 'VIDEO_FRAME':
        // Potential logic to handle video analysis tracking
        break;
      default:
        console.warn(`[Coordinator] Unknown inbound event type: ${type}`);
    }
  }

  private async handleJoinSession(sessionId: string, userId?: string, jobPosition?: string, background?: string, socketId?: string, gatewayId?: string) {
    console.log(`[Coordinator] Handling join_session for ${sessionId}`);
    
    // 初始化面试流服务
    await interviewFlowService.initializeSession(
      sessionId, 
      userId || 'anonymous', 
      '面试者', 
      jobPosition || '通用职位',
      background
    );

    const session = interviewFlowService.getSession(sessionId);

    // 检查是否断点续面
    const isResume = interviewFlowService.isWarmResumeEligible(session!);

    // 去重检查：如果 5 秒内刚处理过 JOIN_SESSION 且状态正常，跳过冗余欢迎
    const now = Date.now();
    if (session && session.lastEventTime && (now - session.lastEventTime < 5000)) {
        console.log(`[Coordinator] Skipping redundant join_session for ${sessionId} (recent activity)`);
        return;
    }
    if (session) session.lastEventTime = now;

    if (isResume && session && session.rounds.length > 0) {
      const currentRound = session.rounds.find((r: any) => r.status === 'in_progress' || r.status === 'pending');
      
      if (currentRound) {
        const resumeRoundNum = currentRound.roundNumber;
        const totalRounds = session.rounds.length;
        const completedRounds = session.rounds.filter((r: any) => r.status === 'completed').length;
        
        console.log(`🔄 [Coordinator] 断点续面: ${sessionId}, 恢复第 ${resumeRoundNum} 题`);
        
        if (currentRound.status === 'pending') {
            currentRound.status = 'in_progress';
            session.currentRound = currentRound.roundNumber;
        }
        session.runtimePhase = 'speaking';

        const jobPosText = jobPosition || '这个职位';
        const resumeText = `欢迎回来，我们继续${jobPosText}的面试。现在是第${resumeRoundNum}题，请听题：`;
        const combinedText = `${resumeText} ${currentRound.question}`;

        // 续面时必须只有一个播报出口：把续面提示和题干合并成一条 TTS。
        // 旧逻辑在已有 audioUrl 时不触发 Qwen3 synthesize，却仍下发 qwen3_streaming，App 会一直等不到音频。
        const scene = interviewConductor.inferScene(currentRound.question, { isFollowUp: (currentRound.followupCount || 0) > 0 });
        const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, combinedText, scene);

      this.emitToGateway(sessionId, 'voice_response', {
        audioUrl: null,
        text: combinedText,
        sessionId,
        duration: 0,
        ttsMode,
        questionIndex: currentRound.roundNumber,
        isResume: true,
        progress: { current: resumeRoundNum, total: totalRounds, completed: completedRounds },
        state: 'playing',
        timeLimit: currentRound.suggestedTime
      }, gatewayId);
        this.persistAvatarVoice(sessionId, combinedText, currentRound.roundNumber);

        return;
      }
    }

    // 首次进入面试
    const jobPosText = (jobPosition || '这个职位').trim().length <= 40 ? (jobPosition || '这个职位').trim() : '本岗位';
    const welcomeText = `让我陪您一起完成这个面试流程。请简单介绍一下您自己，并说明为什么想要应聘「${jobPosText}」。`;

    console.log(`🎤 [Coordinator] 发送初始欢迎问题: ${sessionId}`);
    if (session) session.runtimePhase = 'speaking';
    
    // 使用 Qwen3-TTS 合成欢迎语
    const ttsHealth = await qwen3TTSClient.checkHealth();
    if (ttsHealth?.status === 'ok') {
      const segments = interviewConductor['parseEmotionSegments'](welcomeText, 'opening');
      for (const segment of segments) {
        qwen3TTSClient.synthesize(sessionId, segment.text, false);
      }
      qwen3TTSClient.commitText(sessionId);

        this.emitToGateway(sessionId, 'voice_response', {
          audioUrl: null,
          text: welcomeText,
          sessionId,
          duration: 0,
          ttsMode: 'qwen3_streaming',
          isWelcome: true,
          state: 'playing',
          timeLimit: 120
        }, gatewayId);
      } else {
        // 降级为客户端发声
        this.emitToGateway(sessionId, 'voice_response', {
          audioUrl: null,
          text: welcomeText,
          sessionId,
          duration: 0,
          ttsMode: 'client',
          isWelcome: true,
          state: 'playing',
          timeLimit: 120
        }, gatewayId);
      }
    this.persistAvatarVoice(sessionId, welcomeText);

    // 异步生成后续题目，但不要自动开始/播报第一题；第一题必须等候选人回答欢迎问题后再由主控推进。
    const prepareTask = interviewFlowService.startInterviewPhase(sessionId, { autoStart: false }).then((res: any) => {
      console.log(`✅ [Coordinator] 面试回合准备就绪 (${sessionId})`);
      return res;
    }).catch(err => {
      console.warn(`⚠️ [Coordinator] 异步生成题目失败:`, err);
      throw err;
    }).finally(() => {
      if (this.sessionPrepareTasks.get(sessionId) === prepareTask) {
        this.sessionPrepareTasks.delete(sessionId);
      }
    });
    this.sessionPrepareTasks.set(sessionId, prepareTask);
  }


  private async handleAsrTranscription(data: any) {
    const { sessionId, payload } = data;
    const text = (payload.text || '').trim();
    if (!text) return;
    
    console.log(`[Coordinator] ASR 识别完成 (${sessionId}): "${text}"`);
    this.runInQueue(sessionId, () => this.processUserResponse(sessionId, text, 'asr'));
  }

  private async processUserResponse(sessionId: string, text: string, source: 'asr' | 'text') {
    if (!text.trim()) return;

    const session = interviewFlowService.getSession(sessionId);
    const normalizedForDedupe = text.replace(/\s+/g, '').trim();
    const candidateTextKey = `${normalizedForDedupe.length}:${normalizedForDedupe.slice(0, 80)}`;
    const now = Date.now();
    if (
      session?.lastCandidateTextKey === candidateTextKey &&
      session.lastCandidateTextAt &&
      now - session.lastCandidateTextAt < 8000
    ) {
      console.log(`[Coordinator] 跳过近重复候选人输入 (${source}) session=${sessionId}: "${text}"`);
      return;
    }
    if (session) {
      if (source === 'asr' && session.runtimePhase === 'speaking') {
        console.log(`[Coordinator] 丢弃播报期间 ASR final，疑似回声/尾包 session=${sessionId}: "${text}"`);
        return;
      }
      session.lastCandidateTextKey = candidateTextKey;
      session.lastCandidateTextAt = now;
      if (session.runtimePhase === 'speaking') {
        // 客户端已在播报完成后才恢复 ASR；文本到达即视为进入收音阶段，兼容未上报 playback_done 的旧客户端。
        session.runtimePhase = 'listening';
      }
    }

    const prepareTask = this.sessionPrepareTasks.get(sessionId);
    if (prepareTask) {
      await prepareTask.catch(() => undefined);
    }

    const readySession = interviewFlowService.getSession(sessionId);
    if (!readySession || readySession.rounds.length === 0) {
      const waitText = '题目还在准备中，请您稍等片刻。';
      this.emitToGateway(sessionId, 'voice_response', {
        text: waitText,
        sessionId,
        ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, waitText, 'transition'),
        state: 'playing'
      }, (session as any)?.gatewayId as string);
      if (readySession) readySession.runtimePhase = 'speaking';
      this.persistAvatarVoice(sessionId, waitText);
      return;
    }
    
    // UI 回显
    this.emitToGateway(sessionId, 'asr_partial', { text, isFinal: true, sessionId }, (session as any)?.gatewayId as string);

    // 处理用户记录
    const currentSession = interviewFlowService.getSession(sessionId);
    let questionIndex = null;
    if (currentSession) {
      const currentRound = currentSession.rounds.find((r: any) => r.status === 'in_progress');
      if (currentRound) questionIndex = Math.max(0, currentRound.roundNumber - 1);
    }
    
    const turnMeta = await this.recordConversationTurn(sessionId, { speaker: 'CANDIDATE', candidateText: text, questionIndex });
    
    if (turnMeta) {
      this.emitToGateway(sessionId, 'candidate_turn_recorded', {
        sessionId,
        sequence: turnMeta.sequence,
        turnId: turnMeta.id,
        questionIndex,
      }, (session as any)?.gatewayId as string);
    }

    // 检查结束意图
    const normalizedText = text.replace(/\s+/g, '');
    const completionIntents = ['结束面试', '面试结束', '完成面试', '结束这个面试', '结束这次面试', '我答完了'];
    if (completionIntents.some(k => normalizedText.includes(k))) {
       console.log(`🔚 [Coordinator] 检测到主动结束意图: ${sessionId}`);
       await interviewFlowService.endInterview(sessionId);
       const closingText = '感谢您的配合，我们会尽快生成本次面试报告，请留意通知。';
       this.emitToGateway(sessionId, 'voice_response', {
         text: closingText,
         sessionId,
         ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, closingText, 'closing'),
         isCompleted: true,
         status: 'completed',
         state: 'playing'
       }, (session as any)?.gatewayId as string);
       this.persistAvatarVoice(sessionId, closingText);
       return;
    }

    // 调用业务逻辑
    try {
      const result = await interviewFlowService.processUserResponse(sessionId, text, { speakNextRound: false });
      if (result.isCompleted) {
         const closingText = '面试已全部完成，感谢您的配合，我们会尽快生成本次面试报告，请留意通知。';
         this.emitToGateway(sessionId, 'voice_response', {
           text: closingText,
           sessionId,
           ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, closingText, 'closing'),
           isCompleted: true,
           status: 'completed',
           state: 'playing'
         }, (session as any)?.gatewayId as string);
         this.persistAvatarVoice(sessionId, closingText);
      } else if (result.nextRound) {
         await this.emitRoundVoiceResponse(sessionId, result.nextRound);
      }
    } catch (e: any) {
      console.warn(`⚠️ [Coordinator] 处理回答失败, 退回对话模式:`, e);
      const conductorResult = await interviewConductor.generateInterviewerResponse({
        userMessage: text,
        sessionId,
        context: { }
      });
      this.emitToGateway(sessionId, 'voice_response', {
         text: conductorResult.text,
         sessionId,
         ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, conductorResult.text),
         state: 'playing'
      });
      this.persistAvatarVoice(sessionId, conductorResult.text);
    }
  }

  private async emitRoundVoiceResponse(sessionId: string, round: any) {
    const session = interviewFlowService.getSession(sessionId);
    let ttsMode = 'client';
    if (round.audioUrl) {
      ttsMode = 'server';
    } else {
      const scene = interviewConductor.inferScene(round.question, { isFollowUp: (round.followupCount || 0) > 0 });
      ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, round.question, scene);
    }

    this.emitToGateway(sessionId, 'voice_response', {
      audioUrl: round.audioUrl || null,
      text: round.question,
      sessionId,
      duration: round.duration || 0,
      ttsMode,
      questionIndex: round.roundNumber,
      state: 'playing',
      timeLimit: round.suggestedTime
    }, (session as any)?.gatewayId);
    
    if (session) session.runtimePhase = 'speaking';
    this.persistAvatarVoice(sessionId, round.question, round.roundNumber);
  }

  private async synthesizeQwen3TtsSegments(sessionId: string, responseText: string, scene?: InterviewScene): Promise<'qwen3_streaming' | 'client'> {
    try {
      const healthTimeoutMs = Number(process.env.TTS_HEALTH_TIMEOUT_MS || 1200);
      const ttsHealth = await Promise.race([
        qwen3TTSClient.checkHealth(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), healthTimeoutMs)),
      ]);

      if (!qwen3TTSClient.connected && (!ttsHealth || ttsHealth.status !== 'ok')) {
        console.warn(`[Coordinator] TTS unavailable for session=${sessionId}; fallback to client mode`);
        return 'client';
      }

      const segments = interviewConductor['parseEmotionSegments'](responseText, scene);
      console.log(
        `[Coordinator] Dispatching Qwen3 TTS session=${sessionId}, segments=${segments.length}, textLen=${responseText.length}, redis=${qwen3TTSClient.connected ? 'connected' : 'http-fallback'}`
      );
      for (const segment of segments) {
        if (segment.text.trim()) {
          qwen3TTSClient.synthesize(sessionId, segment.text, false);
        }
      }
      qwen3TTSClient.commitText(sessionId);
      return 'qwen3_streaming';
    } catch (err: any) {
      console.warn(`[Coordinator] Qwen3 TTS dispatch failed session=${sessionId}: ${err?.message || err}`);
      return 'client';
    }
  }

  private async recordConversationTurn(sessionId: string, data: any) {
    try {
      // Find max sequence
      const turns = await prisma.aIInterviewConversationTurn.findMany({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
        take: 1
      });
      const nextSequence = turns.length > 0 ? turns[0].sequence + 1 : 1;

      return await prisma.aIInterviewConversationTurn.create({
        data: {
          sessionId,
          sequence: nextSequence,
          speaker: data.speaker,
          candidateText: data.candidateText,
          avatarText: data.avatarText,
          questionIndex: data.questionIndex,
        }
      });
    } catch (e) {
      console.error('[Coordinator] Failed to record conversation turn:', e);
      return null;
    }
  }

  private persistAvatarVoice(sessionId: string, text: string, questionIndex?: number) {
    if (!text.trim()) return;
    this.recordConversationTurn(sessionId, {
      speaker: 'AVATAR',
      avatarText: text.trim(),
      questionIndex,
    });
  }
}

export const coordinatorService = CoordinatorService.getInstance();
