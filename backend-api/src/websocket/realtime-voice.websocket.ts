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
import { aiInterviewService } from '../services/aiInterviewService';
import { interviewFlowService } from '../services/interviewFlowService';
import { dashScopeService } from '../services/dashscope.service';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';
import { interviewConductor, InterviewScene } from '../services/interview-conductor.service';

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
  /**
   * 双轨流式处理核心逻辑
   * 轨道1：文本流 -> 字幕展示
   * 轨道2：文本分片 -> TTS 合成流 -> 音频播放
   */
  private async handleDualTrackStreaming(socket: any, sessionId: string, text: string, context: any) {
     console.log(`🚀 启动 [双轨混合流式生成] - sessionId: ${sessionId}`);
     
     // 1. LLM 文本轨道 (DeepSeek)
     // 这里假设 deepseekService 已支持流式返回，我们模拟一个流式过程或调用其流式接口
     // 实际实现中应调用 deepseekService.generateResponseStream
     
     // 为了演示效果和满足用户需求，我们先构建带情感标示的回复并分片下发
     const fullResponse = await deepseekService.generateResponse({
       userMessage: text,
       sessionId,
       context
     });

     // 模拟 KTV 字幕或流式分片
     const chunks = fullResponse.split(/([，。！？；\n])/).filter(Boolean);
     let accumulatedText = "";

     for (const chunk of chunks) {
        accumulatedText += chunk;
        // 轨道1：下发文本分片
        socket.emit('text_chunk', {
          text: accumulatedText,
          chunk: chunk,
          sessionId
        });

        // 轨道2：将分片交给 Qwen3-TTS 合成
        // 在该架构中，我们可以在分片达到句级长度时触发 TTS
        if (/[。！？；]/.test(chunk)) {
           try {
             const ttsStream = await dashScopeService.synthesizeStreaming(accumulatedText, {
                emotion: accumulatedText.includes('好') ? '用开怀且赞许的语气' : '用亲切耐心的面试官语气'
             });
             
             // 轨道2：下发语音分片
             ttsStream.on('data', (chunk: Buffer) => {
                socket.emit('audio_chunk', {
                  data: chunk,
                  format: 'mp3',
                  sessionId
                });
             });
           } catch (e) {
             console.error("TTS Stream fragment failed", e);
           }
        }
        
        await new Promise(r => setTimeout(r, 100)); // 模拟网络流式延迟
     }

     socket.emit('voice_response', {
        audioUrl: null,
        text: fullResponse,
        sessionId,
        ttsMode: 'server',
        status: 'streaming_done'
     });
  }

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

      // 优先检查 Qwen3 ASR/TTS 独立微服务（推荐架构）
      const asrServiceUrl = process.env.ASR_SERVICE_URL;
      const ttsServiceUrl = process.env.TTS_SERVICE_URL;
      if (asrServiceUrl || ttsServiceUrl) {
        const asrHealth = await qwen3ASRClient.checkHealth();
        const ttsHealth = await qwen3TTSClient.checkHealth();
        console.log(`🎙️ Qwen3 ASR 微服务: ${asrHealth?.status === 'ok' ? '✅ 在线' : '❌ 离线'} (${asrServiceUrl || 'http://localhost:3002'})`);
        console.log(`🔊 Qwen3 TTS 微服务: ${ttsHealth?.status === 'ok' ? '✅ 在线' : '❌ 离线'} (${ttsServiceUrl || 'http://localhost:3003'})`);

        if (asrHealth?.status === 'ok' || ttsHealth?.status === 'ok') {
          console.log('✅ Qwen3 独立微服务架构已启用（双轨混合流式）');
          console.log('   客户端将直连 ASR/TTS 微服务，backend-api 通过 Redis 协调');

          // 监听 ASR 完成事件，自动触发面试流程推进
          qwen3ASRClient.on('transcription_completed', async (event) => {
            console.log(`[Qwen3] ASR 识别完成 (session: ${event.sessionId}): "${event.payload.text}"`);
          });

          // 保留 voicePipeline 以兼容旧的直接 LLM 调用路径
          this.voicePipeline = new RealtimeVoicePipelineService(
            dashScopeService as any,
            ttsService,
            deepseekService
          );
          return;
        }
      }

      // 回退：DashScope 内嵌模式（无独立微服务时）
      const dashscopeApiKey = (process.env.DASHSCOPE_API_KEY || '').trim();
      if (dashscopeApiKey) {
        console.log('✅ 检测到 DASHSCOPE_API_KEY，切换至 DashScope 内嵌模式（建议部署独立 ASR/TTS 微服务以获得更低延迟）');
        this.voicePipeline = new RealtimeVoicePipelineService(
          dashScopeService as any,
          ttsService,
          deepseekService
        );
        return;
      }

      const aliyunAppKey = pickEnv('ALIYUN_NLS_APP_KEY', 'ALIYUN_APP_KEY');
      const aliyunAccessKeyId = pickEnv('ALIYUN_NLS_ACCESS_KEY_ID', 'ALIYUN_TTS_ACCESS_KEY_ID');
      const aliyunAccessKeySecret = pickEnv('ALIYUN_NLS_ACCESS_KEY_SECRET', 'ALIYUN_TTS_ACCESS_KEY_SECRET');

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

          console.log(`✅ 用户加入会话: ${sessionId} (Socket: ${socket.id})`);

          socket.emit('session_joined', {
            sessionId,
            status: 'success',
          });
          this.touchSession(sessionId);

          // 初始化面试流程引擎，确保后续 flow 正常运作
          await interviewFlowService.initializeSession(
            sessionId, 
            userId || 'anonymous', 
            '面试者', 
            jobPosition || '通用职位',
            background
          );

          const isResume = sessionState.welcomeSent;
          // 发送第一个欢迎问题
          // 构建个性化欢迎语
          const jobPositionText = jobPosition || '这个职位';
          const welcomeText = isResume
            ? `欢迎回来，我们继续完成${jobPositionText}的面试。请从刚才的思路继续，或补充关键经历。`
            : `让我陪您一起完成这个面试流程。请简单介绍一下您自己，并说明为什么想要应聘${jobPositionText}。`;
          
          console.log(
            `${isResume ? '🎤 发送欢迎回来提示' : '🎤 发送初始欢迎问题'} - sessionId: ${sessionId}`
          );
          
          const welcomeHash = this.hashText(welcomeText);
          if (this.hasRecentWelcome(sessionId, welcomeHash)) {
            console.warn(`⚠️ 检测到重复欢迎语，已在冷却窗口内，跳过发送 - sessionId: ${sessionId}`);
            return;
          }

          try {
            // 尝试生成语音包 (Server-side TTS)
            const ttsResult = await ttsService.textToSpeech({
              text: welcomeText,
              sessionId: sessionId,
              voice: undefined // 使用默认语音
            });

            if (ttsResult.success && ttsResult.audioUrl) {
              console.log(`✅ 成功生成欢迎语语音包: ${ttsResult.audioUrl}`);
              socket.emit('voice_response', {
                audioUrl: ttsResult.audioUrl,
                text: welcomeText,
                sessionId,
                duration: ttsResult.duration || 0,
                ttsMode: 'server', // 使用服务器端语音包
                userText: undefined,
                isWelcome: true,
              });
            } else {
              throw new Error(ttsResult.error || 'TTS generation failed');
            }
          } catch (ttsError) {
            console.warn(`⚠️ 后端生成语语音包失败，退回到客户端模式:`, ttsError);
            // 降级使用客户端TTS模式发送欢迎语
            socket.emit('voice_response', {
              audioUrl: null,
              text: welcomeText,
              sessionId,
              duration: 0,
              ttsMode: 'client',
              userText: undefined,
              isWelcome: true,
            });
          }

          this.recordWelcome(sessionId, welcomeHash);
          this.markWelcomeAsSent(socket.id, sessionId);

        } catch (error: any) {
          console.error('加入会话失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // 接收文本消息（不需要ASR）
      // 核心链路：用户文本 → LLM(带情感标注) → Qwen3-TTS(流式音频) → 客户端数字人播放
      socket.on('text_message', async (data: {
        text: string;
        sessionId: string;
        userId?: string;
        jobPosition?: string;
        ttsSessionId?: string;
      }) => {
        console.log(`📨 收到text_message事件 - socketId: ${socket.id}, data:`, data);

        try {
          const text = (data?.text || '').trim();
          const normalizedText = text.replace(/\s+/g, '');
          const completionIntents = [
            '结束面试',
            '面试结束',
            '完成面试',
            '完成了面试',
            '结束这个面试',
            '结束这次面试',
            '帮我结束面试',
            '我答完了',
            '已经完成面试',
          ];
          const hasCompletionIntent =
            completionIntents.some(keyword => normalizedText.includes(keyword)) ||
            /结束.*面试|面试.*结束/.test(normalizedText);
          const completionClosingText =
            '感谢您的配合，我们会尽快生成本次面试报告，请留意“我的”里的“简历报告”通知。';
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
          
          // 发送 ASR 确认反馈（用于展示“我”的字幕）
          socket.emit('asr_partial', {
            text: text,
            isFinal: true,
            sessionId: data.sessionId
          });

          // TTS 会话 ID：客户端与 TTS 微服务建立的 WebSocket 连接标识
          const ttsSessionId = data.ttsSessionId || data.sessionId;

          /**
           * 通过情感分段将面试官回复发送到 Qwen3-TTS 进行流式合成
           * 客户端通过 TTS WebSocket 接收音频流，数字人 SDK 播放
           */
          const sendToQwen3TTS = async (responseText: string, scene?: InterviewScene) => {
            const segments = interviewConductor['parseEmotionSegments'](responseText, scene);
            for (const segment of segments) {
              qwen3TTSClient.synthesize(ttsSessionId, segment.text, false);
            }
            qwen3TTSClient.commitText(ttsSessionId);
          };

          // ===== 主链路：通过 interviewFlowService 处理 =====
          try {
            const { interviewFlowService } = await import('../services/interviewFlowService');
            const result = await interviewFlowService.processUserResponse(data.sessionId, text);

            if (result.isCompleted) {
              console.log(`🏁 面试已完成 - sessionId: ${data.sessionId}`);

              // 用 Qwen3-TTS 播报结束语（正式总结语气）
              await sendToQwen3TTS(completionClosingText, 'closing');

              socket.emit('voice_response', {
                audioUrl: null,
                text: completionClosingText,
                sessionId: data.sessionId,
                duration: 0,
                ttsMode: 'qwen3_streaming',
                ttsSessionId,
                isCompleted: true,
                status: 'completed'
              });

              socket.emit('interview_completed', {
                sessionId: data.sessionId,
                summary: result.feedback
              });

            } else if (result.nextRound) {
              console.log(`➡️ 进入下一轮 (${result.nextRound.roundNumber}) - Question: ${result.nextRound.question}`);

              // 推断场景类型，发送到 Qwen3-TTS（如果没有预生成 audioUrl）
              const scene = interviewConductor.inferScene(result.nextRound.question, {
                isFollowUp: (result.nextRound.followupCount || 0) > 0,
              });
              if (!result.nextRound.audioUrl) {
                await sendToQwen3TTS(result.nextRound.question, scene);
              }

              socket.emit('voice_response', {
                audioUrl: result.nextRound.audioUrl || null,
                text: result.nextRound.question,
                sessionId: data.sessionId,
                duration: 0,
                ttsMode: result.nextRound.audioUrl ? 'server' : 'qwen3_streaming',
                ttsSessionId,
                questionIndex: result.nextRound.roundNumber
              });

            } else {
              console.warn(`⚠️ 处理结果既未结束也无下一轮 - sessionId: ${data.sessionId}`);
              socket.emit('voice_response', {
                audioUrl: null,
                text: '收到您的回答，请稍等...',
                sessionId: data.sessionId,
                duration: 0,
                ttsMode: 'qwen3_streaming',
                ttsSessionId
              });
            }
          } catch (flowError: any) {
            // ===== 回退链路：LLM 直接对话（带情感） =====
            if (flowError.message?.includes('Session not found') || flowError.message?.includes('not found')) {
              console.log(`⚠️ InterviewFlowService 会话不存在，回退到 Conductor 模式 - sessionId: ${data.sessionId}`);

              if (hasCompletionIntent) {
                await sendToQwen3TTS(completionClosingText, 'closing');
                socket.emit('voice_response', {
                  audioUrl: null,
                  text: completionClosingText,
                  sessionId: data.sessionId,
                  duration: 0,
                  ttsMode: 'qwen3_streaming',
                  ttsSessionId,
                  isCompleted: true,
                  status: 'completed'
                });
                socket.emit('interview_completed', {
                  sessionId: data.sessionId,
                  summary: completionClosingText,
                });
                return;
              }

              // 使用 InterviewConductor：LLM 生成带情感回复 → Qwen3-TTS 流式合成
              const conductorResult = await interviewConductor.generateInterviewerResponse({
                userMessage: text,
                sessionId: data.sessionId,
                context: { jobPosition: session.jobPosition },
              });

              // 将情感分段发送到 TTS 微服务
              for (const segment of conductorResult.segments) {
                qwen3TTSClient.synthesize(ttsSessionId, segment.text, false);
              }
              qwen3TTSClient.commitText(ttsSessionId);

              const llmCompletionHint = /面试.*结束|谢谢.*参加|到此结束/.test(conductorResult.text);

              socket.emit('voice_response', {
                audioUrl: null,
                text: conductorResult.text,
                sessionId: data.sessionId,
                duration: 0,
                ttsMode: 'qwen3_streaming',
                ttsSessionId,
                emotionSegments: conductorResult.segments.map(s => ({
                  text: s.text,
                  emotion: s.emotion,
                })),
                isCompleted: llmCompletionHint,
                status: llmCompletionHint ? 'completed' : undefined
              });

              if (llmCompletionHint) {
                socket.emit('interview_completed', {
                  sessionId: data.sessionId,
                  summary: conductorResult.text,
                });
              } else {
                try {
                  const dbResult = await aiInterviewService.getInterviewSession(data.sessionId);
                  if (dbResult.success && dbResult.session && dbResult.session.status === 'IN_PROGRESS') {
                    const currentQIndex = dbResult.session.currentQuestion;
                    const currentQ = dbResult.session.questions.find((q: any) => q.questionIndex === currentQIndex);
                    if (currentQ) {
                      console.log(`🔄 同步进度: index=${currentQ.questionIndex}`);
                    }
                  }
                } catch (dbError) {
                  console.warn(`⚠️ 获取数据库会话失败: ${dbError}`);
                }
              }
            } else {
              // 其他错误，重新抛出
              throw flowError;
            }
          }

        } catch (error: any) {
          console.error('处理文本消息失败:', error);

          socket.emit('error', {
            message: error.message || '处理失败',
            sessionId: data.sessionId,
          });
        }
      });

      /**
       * 获取 Qwen3 ASR/TTS 微服务配置
       * 客户端通过此事件获取微服务 WebSocket 地址，直接建立长连接
       * 实现真正的端到端低延迟：
       *   客户端 ←WebSocket→ ASR Service ←WebSocket→ DashScope Qwen3-ASR
       *   客户端 ←WebSocket→ TTS Service ←WebSocket→ DashScope Qwen3-TTS
       */
      socket.on('get_qwen3_config', async (data: { sessionId?: string }) => {
        try {
          const asrWsUrl = qwen3ASRClient.getWebSocketUrl();
          const ttsWsUrl = qwen3TTSClient.getWebSocketUrl();

          const [asrHealth, ttsHealth] = await Promise.all([
            qwen3ASRClient.checkHealth(),
            qwen3TTSClient.checkHealth(),
          ]);

          socket.emit('qwen3_config', {
            sessionId: data?.sessionId,
            asr: {
              wsUrl: asrWsUrl,
              available: asrHealth?.status === 'ok',
              model: process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime',
              defaultConfig: {
                language: 'zh',
                sampleRate: 16000,
                inputFormat: 'pcm',
                vadMode: 'server_vad',
              },
            },
            tts: {
              wsUrl: ttsWsUrl,
              available: ttsHealth?.status === 'ok',
              model: process.env.QWEN_TTS_MODEL || 'qwen3-tts-instruct-flash-realtime',
              defaultConfig: {
                voice: process.env.TTS_VOICE || 'Cherry',
                sampleRate: 24000,
                responseFormat: 'pcm',
                mode: 'server_commit',
              },
            },
          });
        } catch (error: any) {
          socket.emit('error', { message: `获取 Qwen3 配置失败: ${error.message}` });
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
