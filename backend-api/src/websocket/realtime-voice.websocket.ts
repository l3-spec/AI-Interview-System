/**
 * 实时语音交互WebSocket服务
 * 处理实时音频流和语音交互
 */

import { Server } from 'socket.io';

import { createHash } from 'crypto';
import { RTCServiceFactory, RTCConfig } from '../services/rtc-asr.service';
import { AliyunASRService } from '../services/aliyun-asr.service';
import { RealtimeVoicePipelineService } from '../services/realtime-voice-pipeline.service';
import { ttsService } from '../services/ttsService';
import { deepseekService } from '../services/deepseekService';
import { volcOpenApiService } from '../services/volc-openapi.service';

type SocketSessionInfo = {
  sessionId: string;
  userId?: string;
  jobPosition?: string;
  background?: string;
  connectedAt: Date;
  welcomeSent?: boolean;
};

type SessionState = {
  sessionId: string;
  welcomeSent: boolean;
  lastActivity: number;
  connectedSockets: Set<string>;
};

export class RealtimeVoiceWebSocketServer {
  private io: Server;
  private voicePipeline: RealtimeVoicePipelineService | null = null;
  private sessions: Map<string, SocketSessionInfo> = new Map();
  private sessionStates: Map<string, SessionState> = new Map();
  private sessionCleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly sessionRetentionMs = Math.max(
    30000,
    parseInt(process.env.REALTIME_SESSION_RETENTION_MS || '120000', 10) || 120000,
  );
  private welcomeHistory: Map<string, { hash: string; expiresAt: number }> = new Map();
  private readonly welcomeHistoryTtlMs = Math.max(
    60000,
    parseInt(process.env.REALTIME_WELCOME_TTL_MS || '300000', 10) || 300000,
  );

  constructor(io: Server) {
    this.io = io;

    void this.initializeServices();
    this.setupSocketHandlers();
  }

  /**
   * 初始化服务
   */
  private async initializeServices() {
    try {
      const pickEnv = (...keys: string[]): string => {
        for (const key of keys) {
          const value = process.env[key];
          if (value && value.trim()) {
            return value.trim();
          }
        }
        return '';
      };

      const isTruthy = (value?: string | null): boolean => {
        if (!value) {
          return false;
        }
        const normalized = value.trim().toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(normalized);
      };

      const aliyunAppKey = (process.env.ALIYUN_NLS_APP_KEY || '').trim();
      const aliyunAccessKeyId = (
        process.env.ALIYUN_NLS_ACCESS_KEY_ID ||
        process.env.ALIYUN_TTS_ACCESS_KEY_ID ||
        ''
      ).trim();
      const aliyunAccessKeySecret = (
        process.env.ALIYUN_NLS_ACCESS_KEY_SECRET ||
        process.env.ALIYUN_TTS_ACCESS_KEY_SECRET ||
        ''
      ).trim();

      if (aliyunAppKey && aliyunAccessKeyId && aliyunAccessKeySecret) {
        const aliyunService = new AliyunASRService({
          appKey: aliyunAppKey,
          accessKeyId: aliyunAccessKeyId,
          accessKeySecret: aliyunAccessKeySecret,
          region: (process.env.ALIYUN_NLS_REGION || process.env.ALIYUN_TTS_REGION || 'cn-shanghai').trim(),
          endpoint: process.env.ALIYUN_NLS_ENDPOINT?.trim(),
          enablePunctuation: isTruthy(process.env.ALIYUN_NLS_ENABLE_PUNCTUATION ?? 'true'),
          enableInverseTextNormalization: isTruthy(process.env.ALIYUN_NLS_ENABLE_ITN ?? 'true'),
          enableVoiceDetection: isTruthy(process.env.ALIYUN_NLS_ENABLE_VAD ?? process.env.ALIYUN_NLS_ENABLE_VOICE_DETECTION ?? 'false'),
          defaultFormat: (process.env.ALIYUN_NLS_FORMAT || 'pcm').trim(),
          defaultSampleRate: parseInt(process.env.ALIYUN_NLS_SAMPLE_RATE || '16000', 10),
          timeoutMs: parseInt(process.env.ALIYUN_NLS_TIMEOUT_MS || '25000', 10),
        });

        this.voicePipeline = new RealtimeVoicePipelineService(
          aliyunService,
          ttsService,
          deepseekService
        );

        console.log('✅ 实时语音服务已切换至阿里云ASR');
        return;
      }

      // 配置RTC服务（从环境变量读取）
      const region = pickEnv(
        'RTC_REGION',
        'VOLC_REGION',
        'VOLCENGINE_REGION',
        'RTC_CLUSTER',
        'VOLC_CLUSTER',
        'VOLCENGINE_CLUSTER'
      );
      const cluster = pickEnv(
        'RTC_CLUSTER',
        'VOLC_CLUSTER',
        'VOLCENGINE_CLUSTER',
        'RTC_REGION',
        'VOLC_REGION',
        'VOLCENGINE_REGION'
      );

      const rtcConfig: RTCConfig = {
        provider: (process.env.RTC_PROVIDER as 'volcengine' | 'agora') || 'volcengine',
        appId: pickEnv('RTC_APP_ID', 'VOLC_APP_ID', 'VOLCENGINE_APP_ID'),
        appKey: pickEnv('RTC_APP_KEY', 'VOLC_APP_KEY'),
        token: pickEnv('RTC_TOKEN', 'VOLC_TOKEN'),
        authorization: undefined,
        region: region || 'cn-north-1',
        cluster: cluster || 'volcengine_streaming_common',
      };

      if (!rtcConfig.appId) {
        console.warn('⚠️  RTC服务未配置，将使用模拟模式');
        return;
      }

      if (rtcConfig.provider === 'volcengine') {
        const tokenResult = await volcOpenApiService.getToken();
        rtcConfig.token = tokenResult.token;
        rtcConfig.appKey = tokenResult.rawToken;
        rtcConfig.authorization = tokenResult.authorization;
      } else if (!rtcConfig.token) {
        throw new Error('实时语音服务缺少必要的 Token 配置');
      }

      // 创建ASR服务
      const asrService = RTCServiceFactory.createASRService(rtcConfig);

      // 使用已导出的TTS和DeepSeek服务实例
      // 创建语音处理管道
      this.voicePipeline = new RealtimeVoicePipelineService(
        asrService,
        ttsService,
        deepseekService
      );

      console.log('✅ 实时语音服务初始化成功');
    } catch (error: any) {
      console.error('❌ 实时语音服务初始化失败:', error.message);
      console.warn('将使用模拟模式');
    }
  }

  /**
   * 设置Socket处理器
   */
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 客户端已连接:', socket.id);

      // 监听Socket.IO内部事件用于调试
      socket.on('disconnect', (reason) => {
        this.handleSocketDisconnect(socket.id, typeof reason === 'string' ? reason : undefined);
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket错误 (${socket.id}):`, error);
      });

      // 初始化会话（兼容 init_session）
      socket.on('init_session', async (data: {
        sessionId: string;
        userId?: string;
        jobPosition?: string;
        background?: string;
      }) => {
        try {
          const { sessionId, userId, jobPosition, background } = data;

          socket.join(sessionId);
          this.bindSocketToSession(socket.id, {
            sessionId,
            userId,
            jobPosition,
            background,
          });

          console.log(`✅ 用户初始化会话: ${sessionId} (Socket: ${socket.id})`);
          console.log(`⚠️ init_session不发送欢迎语，等待join_session事件`);

          socket.emit('session_joined', {
            sessionId,
            status: 'success',
          });

        } catch (error: any) {
          console.error('初始化会话失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // 加入会话（兼容旧版本）
      socket.on('join_session', async (data: {
        sessionId: string;
        userId?: string;
        jobPosition?: string;
        background?: string;
      }) => {
        try {
          const { sessionId, userId, jobPosition, background } = data;

          socket.join(sessionId);
          const { sessionState } = this.bindSocketToSession(socket.id, {
            sessionId,
            userId,
            jobPosition,
            background,
          });

          if (sessionState.welcomeSent) {
            console.log(`⚠️ 会话已存在且已发送欢迎语，跳过重复发送 - sessionId: ${sessionId}, socketId: ${socket.id}`);
            socket.emit('session_joined', {
              sessionId,
              status: 'success',
            });
            this.touchSession(sessionId);
            return;
          }

          console.log(`✅ 用户加入会话: ${sessionId} (Socket: ${socket.id})`);

          socket.emit('session_joined', {
            sessionId,
            status: 'success',
          });
          this.touchSession(sessionId);

          // 发送第一个欢迎问题
          // 构建个性化欢迎语
          const jobPositionText = jobPosition || '这个职位';
          const welcomeText =
            `非常荣幸认识您，我会陪您完成接下来的面试流程。` +
            `我们先做个开场：请简单介绍一下您自己，并说明为什么想要应聘${jobPositionText}。`;
          console.log(`🎤 发送初始欢迎问题 - sessionId: ${sessionId}`);
          const welcomeHash = this.hashText(welcomeText);
          if (this.hasRecentWelcome(sessionId, welcomeHash)) {
            console.warn(`⚠️ 检测到重复欢迎语，已在冷却窗口内，跳过发送 - sessionId: ${sessionId}`);
            return;
          }

          // 强制使用客户端TTS模式发送欢迎语
          socket.emit('voice_response', {
            audioUrl: null,
            text: welcomeText,
            sessionId,
            duration: 0,
            ttsMode: 'client',
            userText: undefined,
            isWelcome: true,
          });

          console.log(`📤 已发送欢迎语voice_response到客户端 (Client TTS)`);
          this.recordWelcome(sessionId, welcomeHash);
          this.markWelcomeAsSent(socket.id, sessionId);

        } catch (error: any) {
          console.error('加入会话失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // 接收文本消息（不需要ASR）
      socket.on('text_message', async (data: {
        text: string;
        sessionId: string;
        userId?: string;
        jobPosition?: string;
      }) => {
        console.log(`📨 收到text_message事件 - socketId: ${socket.id}, data:`, data);

        try {
          const text = (data?.text || '').trim();
          if (!text) {
            console.warn(`⚠️ 文本内容为空 - sessionId: ${data.sessionId}`);
            socket.emit('error', {
              message: '文本内容不能为空',
              sessionId: data.sessionId,
            });
            return;
          }

          const session = this.sessions.get(socket.id) || {
            sessionId: data.sessionId,
            userId: data.userId,
            jobPosition: data.jobPosition,
            background: undefined,
            connectedAt: new Date(),
          };
          this.touchSession(session.sessionId);

          console.log(`💬 收到文本消息 (Session: ${data.sessionId}): ${text}`);

          // 直接调用LLM生成回复，不使用服务器端TTS
          const llmResponse = await deepseekService.generateResponse({
            userMessage: text,
            sessionId: data.sessionId,
            context: {
              userId: session.userId,
              jobPosition: session.jobPosition,
            },
          });

          console.log(`✅ LLM回复: ${llmResponse}`);

          // 强制使用客户端TTS模式
          socket.emit('voice_response', {
            audioUrl: null,
            text: llmResponse,
            sessionId: data.sessionId,
            duration: 0,
            ttsMode: 'client',
            userText: undefined,
          });

        } catch (error: any) {
          console.error('处理文本消息失败:', error);
          socket.emit('error', {
            message: error.message || '处理失败',
            sessionId: data.sessionId,
          });
        }
      });

      // 打断数字人说话
      socket.on('interrupt', () => {
        try {
          if (this.voicePipeline) {
            this.voicePipeline.interrupt();
            socket.emit('interrupted', { success: true });
            console.log('🛑 用户打断数字人说话');
          }
        } catch (error: any) {
          console.error('打断失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // 获取状态
      socket.on('get_status', () => {
        try {
          if (this.voicePipeline) {
            const status = this.voicePipeline.getStatus();
            socket.emit('status', status);
          } else {
            socket.emit('status', {
              isProcessing: false,
              isDigitalHumanSpeaking: false,
              currentSessionId: null,
            });
          }
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

    });
  }

  /**
   * 获取IO实例
   */
  public getIO(): Server {
    return this.io;
  }

  private bindSocketToSession(
    socketId: string,
    payload: { sessionId: string; userId?: string; jobPosition?: string; background?: string }
  ) {
    const state = this.getOrCreateSessionState(payload.sessionId);
    state.connectedSockets.add(socketId);
    state.lastActivity = Date.now();
    this.clearSessionCleanup(payload.sessionId);

    const sessionInfo: SocketSessionInfo = {
      sessionId: payload.sessionId,
      userId: payload.userId,
      jobPosition: payload.jobPosition,
      background: payload.background,
      connectedAt: new Date(),
      welcomeSent: state.welcomeSent,
    };

    this.sessions.set(socketId, sessionInfo);

    return { sessionInfo, sessionState: state };
  }

  private getOrCreateSessionState(sessionId: string): SessionState {
    let sessionState = this.sessionStates.get(sessionId);
    if (!sessionState) {
      sessionState = {
        sessionId,
        welcomeSent: false,
        lastActivity: Date.now(),
        connectedSockets: new Set(),
      };
      this.sessionStates.set(sessionId, sessionState);
    }
    return sessionState;
  }

  private markWelcomeAsSent(socketId: string, overrideSessionId?: string) {
    const socketSession = this.sessions.get(socketId);
    if (socketSession) {
      socketSession.welcomeSent = true;
    }
    const sessionId = overrideSessionId ?? socketSession?.sessionId;
    if (!sessionId) {
      return;
    }
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.welcomeSent = true;
      sessionState.lastActivity = Date.now();
    }
  }

  private touchSession(sessionId: string) {
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.lastActivity = Date.now();
      this.clearSessionCleanup(sessionId);
    }
  }

  private clearSessionCleanup(sessionId: string) {
    const timer = this.sessionCleanupTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.sessionCleanupTimers.delete(sessionId);
    }
  }

  private scheduleSessionCleanup(sessionId: string) {
    if (this.sessionCleanupTimers.has(sessionId)) {
      return;
    }

    const timer = setTimeout(() => {
      const state = this.sessionStates.get(sessionId);
      if (state && state.connectedSockets.size === 0 && Date.now() - state.lastActivity >= this.sessionRetentionMs) {
        this.sessionStates.delete(sessionId);
      }
      this.sessionCleanupTimers.delete(sessionId);
    }, this.sessionRetentionMs);

    this.sessionCleanupTimers.set(sessionId, timer);
  }

  private handleSocketDisconnect(socketId: string, reason?: string) {
    const session = this.sessions.get(socketId);
    if (!session) {
      console.log(`👋 客户端断开连接: ${socketId}, 原因: ${reason ?? '未知'}`);
      return;
    }

    console.log(`👋 用户断开连接 (Session: ${session.sessionId}, Socket: ${socketId}, 原因: ${reason ?? '未知'})`);
    this.sessions.delete(socketId);

    const state = this.sessionStates.get(session.sessionId);
    if (state) {
      state.connectedSockets.delete(socketId);
      state.lastActivity = Date.now();
      if (state.connectedSockets.size === 0) {
        this.scheduleSessionCleanup(session.sessionId);
      }
    }
  }

  private hasRecentWelcome(sessionId: string, hash: string): boolean {
    const entry = this.welcomeHistory.get(sessionId);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt <= Date.now()) {
      this.welcomeHistory.delete(sessionId);
      return false;
    }
    return entry.hash === hash;
  }

  private recordWelcome(sessionId: string, hash: string) {
    this.welcomeHistory.set(sessionId, {
      hash,
      expiresAt: Date.now() + this.welcomeHistoryTtlMs,
    });
  }

  private hashText(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * 附加到Express应用
   */
  public attachToApp(app: any) {
    app.set('io', this.io);
  }
}
