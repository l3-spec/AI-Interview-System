import { Server } from 'socket.io';
import Redis from 'ioredis';
import { redisStreamService } from '../services/redis-stream.service';
import { serviceDiscoveryService } from '../services/service-discovery.service';
import { redisConnection } from '../config/redis';
import { getMergedPlatformAiConfig } from '../services/platformAiSettings.service';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';
import { v4 as uuidv4 } from 'uuid';

export class RealtimeVoiceWebSocketServer {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  private gatewayId: string;
  private sessions: Map<string, { sessionId: string; userId?: string; connectedAt: Date; socketId: string }> = new Map();

  // 网关层并发限流：作为第一道防线，避免洪水请求冲击 interview-service
  // 阈值应高于 interview-service 的 MAX_CONCURRENT_SESSIONS，留出一定缓冲
  private readonly MAX_GATEWAY_SESSIONS = parseInt(process.env.MAX_GATEWAY_SESSIONS || '200');

  constructor(io: Server) {
    this.io = io;
    this.gatewayId = `gw-${uuidv4().slice(0, 8)}`;
    this.pubClient = new Redis(redisConnection);
    this.subClient = new Redis(redisConnection);
    this.pubClient.on('error', (err) => console.error(`[Gateway ${this.gatewayId}] PubClient Redis Error: ${err.message}`));
    this.subClient.on('error', (err) => console.error(`[Gateway ${this.gatewayId}] SubClient Redis Error: ${err.message}`));
    
    this.setupRedisSubscriptions();
    this.setupSocketHandlers();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    setInterval(() => {
      serviceDiscoveryService.heartbeat({
        id: this.gatewayId,
        type: 'gateway',
        url: '', // Not needed for gateway discovery by app in this setup
        load: this.sessions.size,
        lastSeen: Date.now()
      });
    }, 5000);
  }

  // 去重缓存：防止同一条消息从 broadcast 和 gateway 频道被重复下发到客户端
  private recentMessageHashes = new Set<string>();
  private readonly DEDUPE_MAX_SIZE = 200;
  private readonly DEDUPE_TTL_MS = 5000;

  private setupRedisSubscriptions() {
    const redisTarget = `${(redisConnection as any).host || 'localhost'}:${(redisConnection as any).port || 6379}/${(redisConnection as any).db ?? 0}`;
    console.log(`[Gateway ${this.gatewayId}] Redis connection target: ${redisTarget}`);

    // Subscribe to both general broadcast and private gateway channel
    const channels = ['interview:events:outbound:broadcast', `interview:events:outbound:${this.gatewayId}`];
    
    channels.forEach(channel => {
      this.subClient.subscribe(channel, (err) => {
        if (err) console.error(`[Gateway] Redis subscription error for ${channel}:`, err);
        else console.log(`[Gateway] Subscribed to ${channel}`);
      });
    });

    this.subClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        const { type, sessionId, payload } = data;
        if (type && sessionId && payload) {
           // 去重：coordinator 同时发布到 broadcast 和 gateway 频道，避免客户端收到两次相同的事件
           const msgHash = `${type}:${sessionId}:${message.length}:${message.slice(0, 128)}`;
           if (this.recentMessageHashes.has(msgHash)) {
             return; // 已处理过，跳过
           }
           this.recentMessageHashes.add(msgHash);
           // 过期清理
           setTimeout(() => this.recentMessageHashes.delete(msgHash), this.DEDUPE_TTL_MS);
           if (this.recentMessageHashes.size > this.DEDUPE_MAX_SIZE) {
             const first = this.recentMessageHashes.values().next().value;
             if (first) this.recentMessageHashes.delete(first);
           }

           // We emit to the session room. If the socket is on this instance, it will receive it.
           this.io.to(sessionId).emit(type, payload);

           // 业务侧拒绝事件需额外释放网关側 sessions 缓存，防止被这个拒绝的会话长期占名额
           if (type === 'session_rejected') {
             this.releaseSessionEntry(sessionId);
           }
        }
      } catch (e) {
        console.error('[Gateway] Failed to parse outbound message', e);
      }
    });
  }

  /**
   * 释放 sessions 缓存中指定 sessionId 的条目
   * 使用场景：interview-service 拒绝了该会话 / 会话异常结束，避免过期条目占用限流额度
   */
  private releaseSessionEntry(sessionId: string): void {
    for (const [socketId, info] of this.sessions.entries()) {
      if (info.sessionId === sessionId) {
        this.sessions.delete(socketId);
      }
    }
  }

  private async publishInbound(event: Record<string, any>) {
    try {
      const type = event.type || 'UNKNOWN';
      const sessionId = event.sessionId || 'unknown';
      
      // Add gateway routing info
      const enrichedEvent = {
        ...event,
        gatewayId: this.gatewayId,
        timestamp: Date.now()
      };

      await redisStreamService.add('interview:inbound_stream', enrichedEvent);
      console.log(`[Gateway] Streamed inbound ${type} session=${sessionId}`);
    } catch (err) {
      console.error('[Gateway] Failed to stream inbound event:', err);
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 [RealtimeGateway] 客户端已连接:', socket.id);

      socket.on('disconnect', (reason) => {
        let sid = '';
        for (const [key, value] of this.sessions.entries()) {
           if (value.socketId === socket.id) {
               sid = value.sessionId;
               this.sessions.delete(key);
           }
        }
        if (sid) {
           this.publishInbound({
              type: 'DISCONNECT',
              sessionId: sid,
              socketId: socket.id,
              reason: typeof reason === 'string' ? reason : 'unknown'
           });
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

          // 网关级限流（第一道防线）：超过阈值时直接拒绝，不再下发到 interview-service
          if (this.sessions.size >= this.MAX_GATEWAY_SESSIONS) {
            console.warn(`[Gateway ${this.gatewayId}] 网关限流: 当前 ${this.sessions.size}/${this.MAX_GATEWAY_SESSIONS} 会话, 拒绝 ${sessionId}`);
            socket.emit('session_rejected', {
              reason: 'gateway_overloaded',
              message: '系统繁忙，请稍后重试',
              currentLoad: this.sessions.size,
              maxCapacity: this.MAX_GATEWAY_SESSIONS,
              retryAfterSeconds: 15,
            });
            return;
          }

          socket.join(sessionId);
          this.sessions.set(socket.id, { sessionId, userId, connectedAt: new Date(), socketId: socket.id });
          
          console.log(`✅ [Gateway] 代理 join_session: ${sessionId}`);

          // 通知客户端加入成功并进入准备状态 (Loading UI)
          socket.emit('session_joined', { sessionId, status: 'success', state: 'preparing' });

          // 转发至 interview-service
          this.publishInbound({
             type: 'JOIN_SESSION',
             sessionId,
             userId,
             jobPosition,
             background,
             socketId: socket.id
          });
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
          socket.emit('session_joined', { sessionId, status: 'success', state: 'preparing' });
          console.log(`✅ [Gateway] init_session: ${sessionId} (等待 join_session)`);
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('text_message', async (data: { sessionId: string; text: string }) => {
        const { sessionId, text } = data;
        if (!text || !text.trim()) return;

        console.log(`[Gateway] 收到文本 (${sessionId}): ${text}`);
        this.publishInbound({
           type: 'TEXT_MESSAGE',
           sessionId,
           text,
           source: 'text'
        });
      });

      socket.on('stop_tts', (data: { sessionId: string }) => {
         this.publishInbound({
            type: 'STOP_TTS',
            sessionId: data.sessionId
         });
      });

      socket.on('playback_done', (data: { sessionId: string; speechId?: string; questionIndex?: number }) => {
         if (!data?.sessionId) return;
         this.publishInbound({
            type: 'PLAYBACK_DONE',
            sessionId: data.sessionId,
            speechId: data.speechId,
            questionIndex: data.questionIndex
         });
      });
      
      // Video analysis logic
      socket.on('video_frame', (data) => {
         // Pass to video analysis service if present, or ignore
         this.publishInbound({
            type: 'VIDEO_FRAME',
            sessionId: data.sessionId,
            timestamp: data.timestamp
         });
      });

      socket.on('get_service_config', async (data: { sessionId?: string }) => {
        try {
          // Dynamic service discovery
          const bestAsr = await serviceDiscoveryService.getBestService('asr');
          const bestTts = await serviceDiscoveryService.getBestService('tts');
          
          const ai = await getMergedPlatformAiConfig();

          socket.emit('service_config', {
            sessionId: data?.sessionId,
            asr: {
              wsUrl: bestAsr?.url || qwen3ASRClient.getWebSocketUrl(),
              available: !!bestAsr,
              model: ai.qwenAsrModel,
            },
            tts: {
              wsUrl: bestTts?.url || qwen3TTSClient.getWebSocketUrl(),
              available: !!bestTts,
              model: ai.qwenTtsModel,
              voice: ai.ttsVoice,
            },
          });
        } catch (error: any) {
          socket.emit('error', { message: `获取服务配置失败: ${error.message}` });
        }
      });

      socket.on('get_qwen3_config', async (data: { sessionId?: string }) => {
        try {
          const asrWsUrl = qwen3ASRClient.getWebSocketUrl();
          const ttsWsUrl = qwen3TTSClient.getWebSocketUrl();
          const ai = await getMergedPlatformAiConfig();

          socket.emit('qwen3_config', {
            sessionId: data?.sessionId,
            asr: {
              wsUrl: asrWsUrl,
              available: true,
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
              available: true,
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
            this.publishInbound({
              type: 'INTERRUPT',
              sessionId
            });
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
