/**
 * 实时语音交互WebSocket服务
 * 作为信令网关，将所有事件代理至 interview-service (通过 Redis Pub/Sub)
 */

import { Server } from 'socket.io';
import Redis from 'ioredis';
import { redisConnection } from '../config/redis';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';
import { getMergedPlatformAiConfig } from '../services/platformAiSettings.service';

export class RealtimeVoiceWebSocketServer {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  private sessions: Map<string, { sessionId: string; userId?: string; connectedAt: Date; socketId: string }> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.pubClient = new Redis(redisConnection);
    this.subClient = new Redis(redisConnection);
    
    this.setupRedisSubscriptions();
    this.setupSocketHandlers();
  }

  private setupRedisSubscriptions() {
    this.subClient.subscribe('interview:events:outbound', (err) => {
      if (err) console.error('[Gateway] Redis subscription error:', err);
    });

    this.subClient.on('message', (channel, message) => {
      if (channel === 'interview:events:outbound') {
        try {
          const data = JSON.parse(message);
          const { type, sessionId, payload } = data;
          if (type && sessionId && payload) {
             this.io.to(sessionId).emit(type, payload);
          }
        } catch (e) {
          console.error('[Gateway] Failed to parse outbound message', e);
        }
      }
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 客户端已连接:', socket.id);

      socket.on('disconnect', (reason) => {
        let sid = '';
        for (const [key, value] of this.sessions.entries()) {
           if (value.socketId === socket.id) {
               sid = value.sessionId;
               this.sessions.delete(key);
           }
        }
        if (sid) {
           this.pubClient.publish('interview:events:inbound', JSON.stringify({
              type: 'DISCONNECT',
              sessionId: sid,
              socketId: socket.id,
              reason: typeof reason === 'string' ? reason : 'unknown'
           }));
        }
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket错误 (${socket.id}):`, error);
      });

      socket.on('join_session', async (data: {
        sessionId: string;
        userId?: string;
        jobPosition?: string;
        background?: string;
      }) => {
        try {
          const { sessionId, userId, jobPosition, background } = data;
          socket.join(sessionId);
          this.sessions.set(socket.id, { sessionId, userId, connectedAt: new Date(), socketId: socket.id });
          
          console.log(`✅ [Gateway] 代理 join_session: ${sessionId}`);

          // 通知客户端加入成功
          socket.emit('session_joined', { sessionId, status: 'success' });

          // 转发至 interview-service
          this.pubClient.publish('interview:events:inbound', JSON.stringify({
             type: 'JOIN_SESSION',
             sessionId,
             userId,
             jobPosition,
             background,
             socketId: socket.id
          }));
        } catch (error: any) {
          console.error('[Gateway] 加入会话失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // 初始化会话（兼容 init_session）
      socket.on('init_session', async (data) => {
        try {
          const { sessionId } = data;
          socket.join(sessionId);
          this.sessions.set(socket.id, { sessionId, userId: data.userId, connectedAt: new Date(), socketId: socket.id });
          socket.emit('session_joined', { sessionId, status: 'success' });
          console.log(`✅ [Gateway] init_session: ${sessionId} (等待 join_session)`);
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('text_message', async (data: { sessionId: string; text: string }) => {
        const { sessionId, text } = data;
        if (!text || !text.trim()) return;

        console.log(`[Gateway] 收到文本 (${sessionId}): ${text}`);
        this.pubClient.publish('interview:events:inbound', JSON.stringify({
           type: 'TEXT_MESSAGE',
           sessionId,
           text,
           source: 'text'
        }));
      });

      socket.on('stop_tts', (data: { sessionId: string }) => {
         this.pubClient.publish('interview:events:inbound', JSON.stringify({
            type: 'STOP_TTS',
            sessionId: data.sessionId
         }));
      });
      
      // Video analysis logic
      socket.on('video_frame', (data) => {
         // Pass to video analysis service if present, or ignore
         this.pubClient.publish('interview:events:inbound', JSON.stringify({
            type: 'VIDEO_FRAME',
            sessionId: data.sessionId,
            timestamp: data.timestamp
         }));
      });

      socket.on('get_qwen3_config', async (data: { sessionId?: string }) => {
        try {
          const asrWsUrl = qwen3ASRClient.getWebSocketUrl();
          const ttsWsUrl = qwen3TTSClient.getWebSocketUrl();
          const ai = await getMergedPlatformAiConfig();

          const [asrHealth, ttsHealth] = await Promise.all([
            qwen3ASRClient.checkHealth(),
            qwen3TTSClient.checkHealth(),
          ]);

          socket.emit('qwen3_config', {
            sessionId: data?.sessionId,
            asr: {
              wsUrl: asrWsUrl,
              available: asrHealth?.status === 'ok',
              model: ai.qwenAsrModel,
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
              model: ai.qwenTtsModel,
              defaultConfig: {
                voice: ai.ttsVoice,
                sampleRate: 16000,
                responseFormat: 'pcm',
                mode: 'server_commit',
                language: ai.ttsLanguage,
              },
            },
          });
        } catch (error: any) {
          socket.emit('error', { message: `获取 Qwen3 配置失败: ${error.message}` });
        }
      });

      socket.on('interrupt', () => {
        try {
          let sessionId;
          for (const [socketId, info] of this.sessions.entries()) {
             if (socketId === socket.id) {
                 sessionId = info.sessionId;
                 break;
             }
          }
          if (sessionId) {
            qwen3TTSClient.clearSynthesis(sessionId);
            this.pubClient.publish('interview:events:inbound', JSON.stringify({
              type: 'INTERRUPT',
              sessionId
            }));
            console.log(`🛑 用户打断数字人说话 (Session: ${sessionId})`);
          }
          socket.emit('interrupted', { success: true });
        } catch (error: any) {
          console.error('打断失败:', error);
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('get_status', () => {
        // As a proxy, we don't hold voicePipeline state anymore. Let interview-service handle it, or send dummy.
        socket.emit('status', {
           isProcessing: false,
           isDigitalHumanSpeaking: false,
           currentSessionId: null,
        });
      });
    });
  }

  public getIO(): Server {
    return this.io;
  }

  public attachToApp(app: any) {
    app.set('io', this.io);
  }
}
