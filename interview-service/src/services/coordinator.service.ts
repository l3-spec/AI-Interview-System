import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { redisConnection } from '../config/redis';
import { redisStreamService } from './redis-stream.service';
import { serviceDiscoveryService } from './service-discovery.service';
import { v4 as uuidv4 } from 'uuid';
import { interviewFlowService } from './flow-controller.service';
import { qwen3TTSClient } from './qwen3-tts-service-client';
import { interviewConductor, type InterviewScene } from './interview-conductor.service';
import { prisma } from '../lib/prisma';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
}

export class CoordinatorService {
  private static instance: CoordinatorService;
  private pubClient: Redis;
  private workerId: string;
  private streamRunning: boolean = false;
  private sessionQueues: Map<string, Promise<any>> = new Map();
  private sessionPrepareTasks: Map<string, Promise<any>> = new Map();
  /** TTS interrupt_ack 等待队列：sessionId -> resolve 回调 */
  private interruptAckResolvers = new Map<string, () => void>();
  private silenceTimers = new Map<string, NodeJS.Timeout>();
  private silenceCounts = new Map<string, number>();
  private clientReadyTimers = new Map<string, NodeJS.Timeout>();
  private speakingTimers = new Map<string, NodeJS.Timeout>();
  private readonly SILENCE_TIMEOUT_MS = parseInt(process.env.SILENCE_TIMEOUT_MS || '30000', 10); // 30秒静音超时

  private startSpeakingTimeout(sessionId: string, text: string) {
    this.clearSpeakingTimeout(sessionId);
    const textLength = text ? text.length : 10;
    // 估算播放时间：中文字数 * 250ms + 8秒缓冲
    const timeoutMs = Math.max(10000, Math.min(60000, textLength * 250 + 8000));

    const timer = setTimeout(() => {
      console.warn(`[SpeakingTimeout] 会话 ${sessionId} 播放超时保护触发 (${timeoutMs}ms)，自动从 speaking 切换至 listening 状态`);
      const session = interviewFlowService.getSession(sessionId);
      if (session && session.runtimePhase === 'speaking') {
        session.runtimePhase = 'listening';
        this.startSilenceDetection(sessionId);
      }
      this.speakingTimers.delete(sessionId);
    }, timeoutMs);

    this.speakingTimers.set(sessionId, timer);
  }

  private clearSpeakingTimeout(sessionId: string) {
    const timer = this.speakingTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.speakingTimers.delete(sessionId);
    }
  }

  // ASR 识别结果去重配置（防止 ASR 服务重传或重复确认导致同一文本被处理多次）
  private readonly DEDUP_TTL_SECONDS = 60; // Redis 去重窗口：60 秒
  private readonly DEDUP_KEY_PREFIX = 'interview:dedup:';
  private readonly MIN_VALID_TEXT_LENGTH = 3; // 最小有效文本长度（短于此值视为噪音）

  // 并发限流配置：单实例最大并发面试会话数
  // 超过该阈值时拒绝新加入的会话，防止 LLM/TTS 资源耗尽导致整体响应恶化
  private readonly MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '50');

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
      const metrics = this.getLoadMetrics();
      serviceDiscoveryService.heartbeat({
        id: this.workerId,
        type: 'interview',
        url: '', // Business logic doesn't have a public URL
        load: metrics.activeSessions,
        lastSeen: Date.now(),
        // 负载详情供注册中心 / 监控大屏展示，便于运维感知过载情况
        metrics: {
          activeSessions: metrics.activeSessions,
          maxCapacity: this.MAX_CONCURRENT_SESSIONS,
          memoryUsageMB: metrics.memoryUsageMB,
          isOverloaded: metrics.isOverloaded,
        },
      } as any);
    }, 5000);
  }

  /**
   * 获取当前负载指标（供心跳上报、健康检查、限流判断使用）
   * - activeSessions: 当前活跃面试会话数（来自 flow-controller 的会话池）
   * - memoryUsageMB: Node 进程堆内存占用（MB）
   * - isOverloaded: 是否已达到并发上限
   */
  public getLoadMetrics(): { activeSessions: number; cpuUsage: number; memoryUsageMB: number; maxCapacity: number; isOverloaded: boolean } {
    const activeSessions = interviewFlowService.getAllSessions().length;
    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    return {
      activeSessions,
      cpuUsage: 0, // Node.js 单线程，CPU 指标在此场景意义有限，预留字段
      memoryUsageMB,
      maxCapacity: this.MAX_CONCURRENT_SESSIONS,
      isOverloaded: activeSessions >= this.MAX_CONCURRENT_SESSIONS,
    };
  }

  /**
   * 结构化性能日志：输出关键路径耗时，便于后续采集 / 告警
   * 输出格式为单行 JSON，可被日志采集器直接解析
   */
  private logPerformance(operation: string, sessionId: string, durationMs: number, extra?: Record<string, any>): void {
    const logEntry = {
      type: 'perf',
      operation,
      sessionId,
      durationMs,
      timestamp: new Date().toISOString(),
      ...(extra || {}),
    };
    console.log(`[Coordinator][Perf] ${JSON.stringify(logEntry)}`);
  }

  /**
   * 结构化业务事件日志：记录关键面试生命周期事件
   * 输出格式为单行 JSON，使用 type='event' 区分于性能日志
   */
  private logEvent(event: string, sessionId: string, extra?: Record<string, any>): void {
    const logEntry = {
      type: 'event',
      event,
      sessionId,
      timestamp: new Date().toISOString(),
      ...(extra || {}),
    };
    console.log(JSON.stringify(logEntry));
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
    asrSubClient.subscribe('asr:events', 'tts:events', (err) => {
      if (err) console.error('[Coordinator] Failed to subscribe to ASR/TTS events:', err);
      else console.log('[Coordinator] Subscribed to asr:events + tts:events');
    });

    asrSubClient.on('message', async (channel, message) => {
      if (channel === 'asr:events') {
        try {
          const data = JSON.parse(message);
          if (data.event === 'transcription_completed') {
            await this.handleAsrTranscription(data);
          } else if (data.event === 'speech_started') {
            // 用户开始说话（VAD 检测到语音活动），立即重置静音超时计时器
            // 这是解决「用户正在回答但仍然收到催问」的关键：
            // 不必等到最终识别结果，VAD 触发即刻证明用户并非静默
            const { sessionId } = data;
            if (sessionId) {
              const session = interviewFlowService.getSession(sessionId);
              if (session && session.runtimePhase === 'listening') {
                this.clearSilenceDetection(sessionId);
                this.silenceCounts.delete(sessionId);
                // 重新启动一个新的静音超时计时器（用户可能中途停顿后又继续说）
                this.startSilenceDetection(sessionId);
                console.log(`[Coordinator] ASR speech_started → 重置静音计时器 (${sessionId})`);
              }
            }
          } else if (data.event === 'speech_stopped') {
            // 用户停止说话但尚未有最终识别结果，重启静音计时器
            const { sessionId } = data;
            if (sessionId) {
              const session = interviewFlowService.getSession(sessionId);
              if (session && session.runtimePhase === 'listening') {
                this.clearSilenceDetection(sessionId);
                this.startSilenceDetection(sessionId);
                console.log(`[Coordinator] ASR speech_stopped → 重启静音计时器 (${sessionId})`);
              }
            }
          }
        } catch (e) {
          console.error('[Coordinator] Error handling ASR message:', e);
        }
      } else if (channel === 'tts:events') {
        try {
          const data = JSON.parse(message);
          if (data.event === 'interrupt_ack') {
            const resolver = this.interruptAckResolvers.get(data.sessionId);
            if (resolver) {
              resolver();
            }
          }
        } catch (e) {
          console.error('[Coordinator] Error handling TTS event:', e);
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

  /**
   * 发布面试控制消息到 TTS WebSocket 通道
   * tts-service 订阅 `interview:control:{sessionId}` 频道并转发给 App 的 WebSocket 连接
   * 与 emitToGateway 并行使用，不替代后者；任何失败仅记录日志，不阻塞面试主流程
   */
  private async emitControlToTTS(sessionId: string, event: string, data: Record<string, any>): Promise<void> {
    const message = JSON.stringify({
      type: 'control',
      event,
      data: { ...data, sessionId },
    });

    try {
      // 使用现有 publisher 连接（pubClient），避免误用 subscriber 客户端
      await this.pubClient.publish(`interview:control:${sessionId}`, message);
      console.log(`[Coordinator] 控制消息已发送 → TTS通道: sessionId=${sessionId}, event=${event}`);
    } catch (err) {
      console.error(`[Coordinator] 控制消息发送失败: sessionId=${sessionId}, event=${event}`, err);
    }
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
      case 'JOIN_SESSION': {
        // 并发限流：达到上限时直接拒绝新会话，避免下游 LLM / TTS 资源耗尽
        const currentLoad = this.getLoadMetrics();
        if (currentLoad.isOverloaded) {
          console.warn(`[Coordinator] 并发限流: 当前 ${currentLoad.activeSessions}/${this.MAX_CONCURRENT_SESSIONS} 会话, 拒绝新会话 ${sessionId}`);
          this.logEvent('session_rejected', sessionId, {
            reason: 'server_overloaded',
            activeSessions: currentLoad.activeSessions,
            maxCapacity: this.MAX_CONCURRENT_SESSIONS,
          });
          this.emitToGateway(sessionId, 'session_rejected', {
            reason: 'server_overloaded',
            message: '当前面试人数较多，请稍后再试',
            currentLoad: currentLoad.activeSessions,
            maxCapacity: this.MAX_CONCURRENT_SESSIONS,
            retryAfterSeconds: 30,
          }, gatewayId);
          break;
        }
        const joinStart = Date.now();
        this.runInQueue(sessionId, async () => {
          await this.handleJoinSession(sessionId, userId, jobPosition, background, socketId, gatewayId);
          this.logPerformance('join_session', sessionId, Date.now() - joinStart, {
            userId: userId || 'anonymous',
            jobPosition: jobPosition || '通用职位',
          });
        });
        break;
      }
      case 'CLIENT_READY': {
        const readyStart = Date.now();
        this.runInQueue(sessionId, async () => {
          await this.handleClientReady(sessionId, gatewayId);
          this.logPerformance('client_ready', sessionId, Date.now() - readyStart);
        });
        break;
      }
      case 'TEXT_MESSAGE':
        // ASR/文本消息去重检查（基于 Redis SET NX EX，防止重传/重复确认）
        if (await this.isDuplicateMessage(sessionId, text || '')) {
          console.log(`[Coordinator] 跳过重复/无效 TEXT_MESSAGE (${sessionId})`);
          break;
        }
        {
          const textStart = Date.now();
          const textLen = (text || '').length;
          this.runInQueue(sessionId, async () => {
            await this.processUserResponse(sessionId, text, 'text');
            this.logPerformance('process_text_message', sessionId, Date.now() - textStart, {
              textLength: textLen,
              source: 'text',
            });
          });
        }
        break;
      case 'PLAYBACK_DONE':
        this.runInQueue(sessionId, async () => {
          const session = interviewFlowService.getSession(sessionId);
          if (session && session.runtimePhase === 'speaking') {
            this.clearSpeakingTimeout(sessionId); // 清除播放超时保护
            session.runtimePhase = 'listening';
            this.startSilenceDetection(sessionId);
          }
        });
        break;
      case 'DISCONNECT':
        console.log(`[Coordinator] Client disconnected: ${sessionId} (Gateway: ${gatewayId}, Socket: ${socketId})`);
        // 会话断开时主动清理去重缓存，节省 Redis 内存
        this.cleanupDedupKeys(sessionId);
        this.clearSilenceDetection(sessionId);
        this.clearSpeakingTimeout(sessionId);
        this.silenceCounts.delete(sessionId);
        const readyTimer = this.clientReadyTimers.get(sessionId);
        if (readyTimer) {
          clearTimeout(readyTimer);
          this.clientReadyTimers.delete(sessionId);
        }
        break;
      case 'INTERRUPT':
        this.runInQueue(sessionId, () => this.handleInterrupt(sessionId, gatewayId));
        break;
      case 'VIDEO_FRAME':
        // Potential logic to handle video analysis tracking
        break;
      case 'TIMEOUT':
        // 超时事件由 flow-controller 在本进程内部产生，这里主要负责记录日志与转发给网关，
        // 让客户端可以感知超时状态（提醒 / 跳题 / 面试结束）。
        console.log(`[Coordinator] 会话 ${sessionId} 收到超时事件: ${data.payload?.eventType || 'unknown'}`);
        this.emitToGateway(
          sessionId,
          'timeout_notification',
          {
            sessionId,
            eventType: data.payload?.eventType,
            text: data.payload?.text,
            timestamp: data.payload?.timestamp || Date.now(),
          },
          gatewayId
        );
        // 整场面试超时：额外向 TTS 通道下发 interview_error 控制消息
        if (data.payload?.eventType === 'interview_timeout') {
          this.emitControlToTTS(sessionId, 'interview_error', {
            reason: 'timeout',
            message: data.payload?.text || '面试超时已结束',
          }).catch(() => undefined);
        }
        break;
      default:
        console.warn(`[Coordinator] Unknown inbound event type: ${type}`);
    }
  }

  private async handleJoinSession(sessionId: string, userId?: string, jobPosition?: string, background?: string, socketId?: string, gatewayId?: string) {
    console.log(`[Coordinator] Handling join_session for ${sessionId}`);
    // 结构化事件日志：面试开始
    this.logEvent('interview_started', sessionId, {
      userId: userId || 'anonymous',
      jobPosition: jobPosition || '通用职位',
      socketId,
      gatewayId,
    });
    
    // 初始化面试流服务
    await interviewFlowService.initializeSession(
      sessionId, 
      userId || 'anonymous', 
      '面试者', 
      jobPosition || '通用职位',
      background
    );

    const session = interviewFlowService.getSession(sessionId);
    if (session) {
      session.lastEventTime = Date.now();
      (session as any).isClientReady = false;
      if (gatewayId) {
        (session as any).gatewayId = gatewayId;
      }
    }

    // 面试初始化成功后，立即向 TTS 通道发送控制消息，App 据此进入面试态
    // 首次进入时 rounds 尚未生成，使用默认 5；断点续面时使用实际题目数
    await this.emitControlToTTS(sessionId, 'interview_started', {
      totalQuestions: session?.rounds?.length || 5,
    });

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

    // 就绪保护倒计时（5秒）：防止旧版客户端/未适配就绪信号的脚本挂起面试
    const forceReadyTimer = setTimeout(() => {
      console.warn(`⚠️ [Coordinator] 会话 ${sessionId} 就绪同步超时 (5秒)，自动强行激活就绪处理`);
      this.runInQueue(sessionId, () => this.handleClientReady(sessionId, gatewayId));
    }, 5000);
    this.clientReadyTimers.set(sessionId, forceReadyTimer);
  }

  private async handleClientReady(sessionId: string, gatewayId?: string) {
    console.log(`✅ [Coordinator] 客户端三通道连接已确认就绪 (client_ready): sessionId=${sessionId}, 接入网关=${gatewayId || 'unknown'}`);
    const session = interviewFlowService.getSession(sessionId);
    if (!session) {
      console.warn(`[Coordinator] handleClientReady 找不到 session: ${sessionId}`);
      return;
    }

    if ((session as any).isClientReady) {
      console.log(`[Coordinator] Session ${sessionId} 已就绪过，忽略冗余 client_ready`);
      return;
    }
    (session as any).isClientReady = true;

    // 清除就绪保护定时器
    const forceTimer = this.clientReadyTimers.get(sessionId);
    if (forceTimer) {
      clearTimeout(forceTimer);
      this.clientReadyTimers.delete(sessionId);
    }

    // 检查是否断点续面
    const isResume = interviewFlowService.isWarmResumeEligible(session);

    if (isResume && session.rounds.length > 0) {
      const currentRound = session.rounds.find((r: any) => r.status === 'in_progress' || r.status === 'pending');
      
      if (currentRound) {
        const resumeRoundNum = currentRound.roundNumber;
        const totalRounds = session.rounds.length;
        const completedRounds = session.rounds.filter((r: any) => r.status === 'completed').length;
        
        console.log(`🔄 [Coordinator] 就绪触发断点续面: ${sessionId}, 恢复第 ${resumeRoundNum} 题`);
        
        if (currentRound.status === 'pending') {
            currentRound.status = 'in_progress';
            session.currentRound = currentRound.roundNumber;
        }
        session.runtimePhase = 'speaking';

        const jobPosText = (session as any).jobPosition || '这个职位';
        const resumeText = `欢迎回来，我们继续${jobPosText}的面试。现在是第${resumeRoundNum}题，请听题：`;
        const combinedText = `${resumeText} ${currentRound.question}`;
        this.startSpeakingTimeout(sessionId, combinedText);

        const scene = interviewConductor.inferScene(currentRound.question, { isFollowUp: (currentRound.followupCount || 0) > 0 });

        // 续面：先发送 question_start 控制消息，再触发 TTS 合成，确保 App 先收到控制再收到音频
        await this.emitControlToTTS(sessionId, 'question_start', {
          questionIndex: Math.max(0, currentRound.roundNumber - 1),
          timeLimit: currentRound.suggestedTime || 300,
          isLast: currentRound.roundNumber >= totalRounds,
          text: combinedText,
        });

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
        }, gatewayId || (session as any).gatewayId);
        this.persistAvatarVoice(sessionId, combinedText, currentRound.roundNumber);

        return;
      }
    }

    // 等待大模型生成面试问题完成
    const prepareTask = this.sessionPrepareTasks.get(sessionId);
    if (prepareTask) {
      await prepareTask.catch(() => undefined);
    }

    // 首次进入面试的欢迎语（使用大模型生成的第 1 题）
    const firstRound = session.rounds[0];
    if (firstRound) {
      firstRound.status = 'in_progress';
      session.currentRound = 1;
      session.runtimePhase = 'speaking';

      // 异步执行持久化，更新 DB 会话状态为 IN_PROGRESS, currentQuestion = 0
      interviewFlowService.persistRoundStarted(session, firstRound).catch(err => {
        console.warn(`[Coordinator] 持久化首题状态失败:`, err);
      });

      const welcomeText = firstRound.question;
      console.log(`🎤 [Coordinator] 就绪触发大模型生成的初始欢迎问题: ${sessionId}`);
      this.startSpeakingTimeout(sessionId, welcomeText);

      // 使用 Qwen3-TTS 合成欢迎语
      const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');

      // 首题问出后，激活客户端的倒计时，下发 question_start 控制消息
      await this.emitControlToTTS(sessionId, 'question_start', {
        questionIndex: 0,
        timeLimit: firstRound.suggestedTime || 180,
        isLast: session.rounds.length <= 1,
        text: welcomeText,
      });

      this.emitToGateway(sessionId, 'voice_response', {
        audioUrl: firstRound.audioUrl || null,
        text: welcomeText,
        sessionId,
        duration: firstRound.duration || 0,
        ttsMode: ttsMode,
        isWelcome: true,
        state: 'playing',
        questionIndex: 1,
        timeLimit: firstRound.suggestedTime || 180
      }, gatewayId || (session as any).gatewayId);

      this.persistAvatarVoice(sessionId, welcomeText, 0);
    } else {
      // 兜底（如果真的没有 rounds，采用以前的死文本）
      const jobPosText = ((session as any).jobPosition || '这个职位').trim().length <= 40 ? ((session as any).jobPosition || '这个职位').trim() : '本岗位';
      const welcomeText = `让我陪您一起完成这个面试流程。请简单介绍一下您自己，并说明为什么想要应聘「${jobPosText}」。`;

      console.log(`🎤 [Coordinator] 就绪触发初始欢迎问题 (兜底): ${sessionId}`);
      session.runtimePhase = 'speaking';
      this.startSpeakingTimeout(sessionId, welcomeText);

      const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');

      await this.emitControlToTTS(sessionId, 'question_start', {
        questionIndex: 0,
        timeLimit: 120,
        isLast: true,
        text: welcomeText,
      });

      this.emitToGateway(sessionId, 'voice_response', {
        audioUrl: null,
        text: welcomeText,
        sessionId,
        duration: 0,
        ttsMode: ttsMode,
        isWelcome: true,
        state: 'playing',
        questionIndex: 1,
        timeLimit: 120
      }, gatewayId || (session as any).gatewayId);

      this.persistAvatarVoice(sessionId, welcomeText, 0);
    }
  }


  /**
   * 处理用户打断事件：发送 clear 给 TTS，等待确认后通知客户端可以恢复录音
   */
  private async handleInterrupt(sessionId: string, gatewayId?: string): Promise<void> {
    console.log(`[Coordinator] 收到打断事件 (${sessionId})`);

    const session = interviewFlowService.getSession(sessionId);
    if (session) {
      this.clearSpeakingTimeout(sessionId);
      session.runtimePhase = 'listening';
    }

    // 发送 clear 指令给 TTS 服务
    qwen3TTSClient.clearSynthesis(sessionId);

    // 等待 TTS interrupt_ack（带超时保护）
    const ackReceived = await this.waitForInterruptAck(sessionId, 3000);

    if (!ackReceived) {
      console.warn(`[Coordinator] TTS interrupt_ack 超时 (${sessionId}), 强制继续`);
    }

    // 通知客户端可以恢复录音
    this.emitToGateway(sessionId, 'interrupt_complete', {
      sessionId,
      ackReceived,
      timestamp: Date.now(),
    }, gatewayId);
  }

  /**
   * 等待 TTS 中断确认（基于 Redis 订阅，带超时）
   */
  private waitForInterruptAck(sessionId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.interruptAckResolvers.delete(sessionId);
        resolve(false);
      }, timeoutMs);

      this.interruptAckResolvers.set(sessionId, () => {
        clearTimeout(timer);
        this.interruptAckResolvers.delete(sessionId);
        resolve(true);
      });
    });
  }

  /**
   * 启动静音超时检测
   */
  private startSilenceDetection(sessionId: string) {
    this.clearSilenceDetection(sessionId);

    const timer = setTimeout(async () => {
      await this.handleSilenceTimeout(sessionId);
    }, this.SILENCE_TIMEOUT_MS);

    this.silenceTimers.set(sessionId, timer);
  }

  /**
   * 清除静音超时检测
   */
  private clearSilenceDetection(sessionId: string) {
    const timer = this.silenceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.silenceTimers.delete(sessionId);
    }
  }

  /**
   * 处理静音超时事件：引导用户或在连续 3 次无回应时挂起面试
   */
  private async handleSilenceTimeout(sessionId: string) {
    const session = interviewFlowService.getSession(sessionId);
    if (!session || session.runtimePhase !== 'listening') return;

    const count = (this.silenceCounts.get(sessionId) || 0) + 1;
    this.silenceCounts.set(sessionId, count);

    console.log(`[SilenceDetection] 会话 ${sessionId} 发生第 ${count} 次静音超时`);

    if (count >= 3) {
      console.log(`[SilenceDetection] 会话 ${sessionId} 连续 3 次静音，自动归档结束`);
      this.silenceCounts.delete(sessionId);
      this.clearSilenceDetection(sessionId);

      await interviewFlowService.endInterview(sessionId);
      const endText = '由于您长时间没有回应，本次面试已自动结束并挂起。如果您需要重新开始，请联系管理员。';
      
      const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, endText, 'closing');
      this.emitToGateway(sessionId, 'voice_response', {
        text: endText,
        sessionId,
        ttsMode,
        isCompleted: true,
        status: 'unfinished',
        state: 'playing'
      }, (session as any).gatewayId);

      await this.emitControlToTTS(sessionId, 'interview_ended', {
        reason: 'timeout',
        isCompleted: false,
      });
      return;
    }

    const promptText = count === 1 
      ? '您好，请问您听清题目了吗？如果听清了，可以随时开始回答。'
      : '请问您还在吗？如果准备好了，可以继续回答。如果需要，我可以为您重复一下题目。';

    session.runtimePhase = 'speaking';
    this.startSpeakingTimeout(sessionId, promptText);
    const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, promptText, 'transition');
    
    this.emitToGateway(sessionId, 'voice_response', {
      text: promptText,
      sessionId,
      ttsMode,
      state: 'playing'
    }, (session as any).gatewayId);

    this.persistAvatarVoice(sessionId, promptText);
  }


  private async handleAsrTranscription(data: any) {
    const { sessionId, payload } = data;
    const text = (payload.text || '').trim();
    if (!text) return;

    // ASR 识别结果去重检查（防止 transcription_completed 事件重传）
    if (await this.isDuplicateMessage(sessionId, text)) {
      console.log(`[Coordinator] 跳过重复/无效 ASR 识别结果 (${sessionId})`);
      return;
    }

    console.log(`[Coordinator] ASR 识别完成 (${sessionId}): "${text}"`);
    const asrStart = Date.now();
    this.runInQueue(sessionId, async () => {
      await this.processUserResponse(sessionId, text, 'asr');
      this.logPerformance('process_asr_response', sessionId, Date.now() - asrStart, {
        textLength: text.length,
        source: 'asr',
      });
    });
  }

  /**
   * 检查文本消息是否为重复（基于 Redis SET NX EX 原子操作 + TTL）
   * - 空消息 / 过短消息 直接视为无效（返回 true 让上层跳过）
   * - Redis 不可用时降级放行（返回 false），保证主流程不被阻断
   */
  private async isDuplicateMessage(sessionId: string, text: string): Promise<boolean> {
    if (!text || text.trim().length === 0) {
      return true; // 空消息直接忽略
    }

    const trimmed = text.trim();
    // 短文本额外过滤（噪音 / 误识别）
    if (trimmed.length < this.MIN_VALID_TEXT_LENGTH) {
      console.log(`[Coordinator] 短文本过滤 (${sessionId}): "${trimmed}" (${trimmed.length}字)`);
      return true;
    }

    // 生成去重键：sessionId + 文本 md5 哈希前 16 位
    const textHash = crypto.createHash('md5').update(trimmed).digest('hex').slice(0, 16);
    const dedupKey = `${this.DEDUP_KEY_PREFIX}${sessionId}:${textHash}`;

    try {
      // SET NX EX：仅当 key 不存在时写入并设置 TTL，原子操作
      const result = await this.pubClient.set(dedupKey, '1', 'EX', this.DEDUP_TTL_SECONDS, 'NX');

      if (result === null) {
        // key 已存在，命中重复
        console.warn(`[Coordinator] 去重拦截 (${sessionId}): "${trimmed.slice(0, 50)}..." (hash: ${textHash})`);
        return true;
      }

      return false; // 首次出现，非重复
    } catch (err: any) {
      // Redis 异常时降级为不去重，避免阻塞主流程
      console.warn(`[Coordinator] 去重检查失败，放行: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * 清理指定会话的所有去重缓存键（会话结束 / 断开时调用，节省 Redis 内存）
   * 非关键路径，失败时静默忽略
   */
  private async cleanupDedupKeys(sessionId: string): Promise<void> {
    try {
      const pattern = `${this.DEDUP_KEY_PREFIX}${sessionId}:*`;
      const keys = await this.pubClient.keys(pattern);
      if (keys.length > 0) {
        await this.pubClient.del(...keys);
        console.log(`[Coordinator] 清除去重缓存 (${sessionId}): ${keys.length} 个`);
      }
    } catch (err: any) {
      // 非关键路径，仅记录
      console.warn(`[Coordinator] 清除去重缓存失败 (${sessionId}): ${err?.message || err}`);
    }
  }

  private async processUserResponse(sessionId: string, text: string, source: 'asr' | 'text') {
    if (!text.trim()) return;

    // 清除静音超时检测
    this.clearSilenceDetection(sessionId);
    this.silenceCounts.delete(sessionId);

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
      if (readySession) {
        readySession.runtimePhase = 'speaking';
        this.startSpeakingTimeout(sessionId, waitText);
      }
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
        
        const sessionObj = interviewFlowService.getSession(sessionId);
        const validAnswers = sessionObj ? sessionObj.rounds.filter(
          r => r.status === 'completed' && r.userResponse && r.userResponse !== '[超时未作答]' && r.userResponse.trim().length > 2
        ).length : 0;
        const isCompletedSuccessfully = validAnswers > 0;

        this.emitToGateway(sessionId, 'voice_response', {
          text: closingText,
          sessionId,
          ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, closingText, 'closing'),
          isCompleted: true,
          status: isCompletedSuccessfully ? 'completed' : 'unfinished',
          state: 'playing'
        }, (session as any)?.gatewayId as string);
        this.persistAvatarVoice(sessionId, closingText);
        // 结构化事件日志：面试结束（主动结束）
        this.logEvent('interview_completed', sessionId, {
          reason: 'user_initiated',
          questionsAsked: (interviewFlowService.getSession(sessionId)?.rounds || []).length,
        });
        // 主动结束：通知 TTS 通道转发 interview_ended 控制消息给 App
        await this.emitControlToTTS(sessionId, 'interview_ended', {
          reason: 'completed',
          isCompleted: isCompletedSuccessfully,
        });
        return;
    }

    // 调用业务逻辑
    try {
      const result = await withTimeout(
        interviewFlowService.processUserResponse(sessionId, text, { speakNextRound: false }),
        parseInt(process.env.LLM_TIMEOUT_MS || '5000', 10),
        'LLM_TIMEOUT'
      );

      // 检查评估打分和反馈，如果连续 2 题大模型打分低于 15 分，直接强制终止
      const currentSession = interviewFlowService.getSession(sessionId);
      if (currentSession) {
        const completedRoundsWithScores = currentSession.rounds.filter(r => r.status === 'completed' && r.analysis !== undefined);
        if (completedRoundsWithScores.length >= 2) {
          const last1 = completedRoundsWithScores[completedRoundsWithScores.length - 1];
          const last2 = completedRoundsWithScores[completedRoundsWithScores.length - 2];
          if (last1.analysis && last2.analysis && last1.analysis.score < 15 && last2.analysis.score < 15) {
             console.log(`[Coordinator] 候选人连续两题打分低于 15 (${last1.analysis.score}, ${last2.analysis.score})，判定环境或能力不匹配，强制终止面试`);
             
             // 提前强制终止
             const endResult = await interviewFlowService.endInterview(sessionId, 'unsuitable');
             const closingText = '由于检测到您的回答音量较小、背景噪音过大，或内容与本次面试职位极不匹配，我们将暂停本次面试。期待您准备好后再继续。';
             this.emitToGateway(sessionId, 'voice_response', {
               text: closingText,
               sessionId,
               ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, closingText, 'closing'),
               isCompleted: true,
               status: 'unfinished',
               state: 'playing'
             }, (session as any)?.gatewayId as string);
             this.persistAvatarVoice(sessionId, closingText);
             
             await this.emitControlToTTS(sessionId, 'interview_ended', {
               reason: 'unsuitable',
               isCompleted: false, // 属于未成功完成
             });
             return;
          }
        }
      }

      if (result.isCompleted) {
         const closingText = '面试已全部完成，感谢您的配合，我们会尽快生成本次面试报告，请留意通知。';
         
         const sessionObj = interviewFlowService.getSession(sessionId);
         const validAnswers = sessionObj ? sessionObj.rounds.filter(
           r => r.status === 'completed' && r.userResponse && r.userResponse !== '[超时未作答]' && r.userResponse.trim().length > 2
         ).length : 0;
         const isCompletedSuccessfully = validAnswers > 0;

         this.emitToGateway(sessionId, 'voice_response', {
           text: closingText,
           sessionId,
           ttsMode: await this.synthesizeQwen3TtsSegments(sessionId, closingText, 'closing'),
           isCompleted: true,
           status: isCompletedSuccessfully ? 'completed' : 'unfinished',
           state: 'playing'
         }, (session as any)?.gatewayId as string);
         this.persistAvatarVoice(sessionId, closingText);
         // 结构化事件日志：面试结束（自然完成）
         this.logEvent('interview_completed', sessionId, {
           reason: 'auto_completed',
           questionsAsked: (interviewFlowService.getSession(sessionId)?.rounds || []).length,
         });
         // 自然完成：通知 TTS 通道转发 interview_ended 控制消息给 App
         await this.emitControlToTTS(sessionId, 'interview_ended', {
           reason: 'completed',
           isCompleted: isCompletedSuccessfully,
         });
      } else if (result.nextRound) {
         await this.emitRoundVoiceResponse(sessionId, result.nextRound);
      }
    } catch (e: any) {
      console.warn(`⚠️ [Coordinator] 处理回答异常 (或大模型超时): ${e.message || e}`);
      
      let fallbackText = '好的，我已记录您的回答。让我们继续进行下一步。';
      let forceNextRound = false;
      const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '5000', 10);

      try {
        // 大模型评估超时/失败，尝试用 Conductor 生成自由对话对话回复（同样配置 5 秒超时）
        const conductorResult = await withTimeout(
          interviewConductor.generateInterviewerResponse({
            userMessage: text,
            sessionId,
            context: { }
          }),
          LLM_TIMEOUT_MS,
          'LLM_TIMEOUT'
        );
        fallbackText = conductorResult.text;
      } catch (err: any) {
        console.warn(`⚠️ [Coordinator] 大模型自由对话调用失败或超时，启动终极兜底逻辑`);
        forceNextRound = true;
      }

      if (forceNextRound) {
        // 终极兜底：如果有待答题目，强制抽取一题下发，防止流程卡死
        const currentSession = interviewFlowService.getSession(sessionId);
        const nextRound = currentSession?.rounds.find((r: any) => r.status === 'pending');
        if (nextRound && currentSession) {
          console.log(`[Coordinator] 触发终极兜底：强制切入下一题 ${nextRound.roundNumber}`);
          nextRound.status = 'in_progress';
          currentSession.currentRound = nextRound.roundNumber;
          await this.emitRoundVoiceResponse(sessionId, nextRound);
          return;
        } else {
          fallbackText = '好的，我听清了您的回答，网络刚才出现了一点拥堵。我们继续面试。';
        }
      }

      const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, fallbackText);
      this.emitToGateway(sessionId, 'voice_response', {
         text: fallbackText,
         sessionId,
         ttsMode,
         state: 'playing'
      }, (session as any)?.gatewayId as string);
      this.persistAvatarVoice(sessionId, fallbackText);
    }
  }

  private async emitRoundVoiceResponse(sessionId: string, round: any) {
    const session = interviewFlowService.getSession(sessionId);

    // 题目准备就绪：先向 TTS 通道下发 question_start 控制消息，确保 App 先收到控制再收到音频
    const totalRounds = session?.rounds?.length || 5;
    const currentRoundIndex = Math.max(0, (round.roundNumber || 1) - 1);
    await this.emitControlToTTS(sessionId, 'question_start', {
      questionIndex: currentRoundIndex,
      timeLimit: round.suggestedTime || 300,
      isLast: currentRoundIndex >= totalRounds - 1,
      text: round.question,
    });

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
    
    if (session) {
      session.runtimePhase = 'speaking';
      this.startSpeakingTimeout(sessionId, round.question);
    }
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

      // KTV 字幕：在 TTS 合成前，通过控制通道下发完整文本，App 可立即显示全文并用 transcript_delta 驱动高亮
      await this.emitControlToTTS(sessionId, 'subtitle_text', {
        text: responseText,
        scene: scene || 'question',
      });

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
