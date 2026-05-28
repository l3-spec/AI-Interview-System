import { Server, Socket } from 'socket.io';
import { FayServiceManager } from '../services/fay.service';
import { redisStreamService } from '../services/redis-stream.service';

export class FayWebSocketServer {
  private io: Server;
  private fayManager: FayServiceManager;

  constructor(io: Server) {
    this.io = io;
    this.fayManager = new FayServiceManager();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🔗 [FayGateway] 客户端已连接:', socket.id);

      // 兼容 Android 端的 join_session 事件
      socket.on('join_session', async (data) => {
        if (!data) return;
        console.log('🎯 [FayGateway] 加入面试会话 (join_session):', data);
        const { sessionId, userId } = data;
        
        if (!sessionId) {
          return socket.emit('error', { message: 'sessionId is required' });
        }

        socket.join(`session:${sessionId}`);
        
        // 桥接到面试微服务 Redis Stream
        try {
          await redisStreamService.add('interview:inbound_stream', {
            type: 'JOIN_SESSION',
            sessionId,
            userId: userId || 'anonymous',
            timestamp: Date.now()
          });
          console.log(`✅ [FayGateway] 已桥接 JOIN_SESSION 到 Redis: ${sessionId}`);
        } catch (err) {
          console.error('❌ [FayGateway] 桥接 JOIN_SESSION 失败:', err);
        }
      });

      socket.on('join_interview', (data) => {
        console.log('🎯 [FayGateway] 加入旧版面试 (join_interview):', data);
        socket.join('fay_interview');

        // 通知所有客户端有新用户加入
        socket.to('fay_interview').emit('user_joined', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // 处理实时对话文本（桥接到微服务）
      socket.on('text_message', async (data) => {
        if (!data) return;
        console.log('💬 [FayGateway] 收到文本消息:', data);
        const { sessionId, text, isTimeout } = data;

        if (!sessionId) return;
        const isTimeoutFlag = isTimeout === true || isTimeout === 'true';
        // 超时提交允许空文本；非超时仍要求 text
        if (!isTimeoutFlag && !text) return;

        try {
          await redisStreamService.add('interview:inbound_stream', {
            type: 'TEXT_MESSAGE',
            sessionId,
            text: text || '',
            // 透传 isTimeout 标志，interview-service 据此插入过渡语并跳到下一题
            isTimeout: isTimeoutFlag,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error('❌ [FayGateway] 桥接 TEXT_MESSAGE 失败:', err);
        }
      });
      
      // 处理播报完成（桥接到微服务）
      socket.on('playback_done', async (data) => {
        if (!data) return;
        const { sessionId } = data;
        if (!sessionId) return;
        
        try {
          await redisStreamService.add('interview:inbound_stream', {
            type: 'PLAYBACK_DONE',
            sessionId,
            timestamp: Date.now()
          });
          console.log(`✅ [FayGateway] 已桥接 PLAYBACK_DONE 到 Redis: ${sessionId}`);
        } catch (err) {
          console.error('❌ [FayGateway] 桥接 PLAYBACK_DONE 失败:', err);
        }
      });

      // 处理打断（桥接到微服务）
      socket.on('interrupt', async (data) => {
        if (!data) return;
        const { sessionId } = data;
        if (!sessionId) return;
        
        try {
          await redisStreamService.add('interview:inbound_stream', {
            type: 'INTERRUPT',
            sessionId,
            timestamp: Date.now()
          });
          console.log(`✅ [FayGateway] 已桥接 INTERRUPT 到 Redis: ${sessionId}`);
        } catch (err) {
          console.error('❌ [FayGateway] 桥接 INTERRUPT 失败:', err);
        }
      });

      socket.on('send_question', async (data) => {
        console.log('📋 收到面试问题:', data);

        try {
          // 处理面试问题
          const response = await this.fayManager.processQuestion(data);

          // 广播回答给所有连接的客户端
          this.io.to('fay_interview').emit('interview_response', {
            question: data.question,
            response: response,
            from: 'fay',
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('❌ 处理问题失败:', error);
          socket.emit('error', { message: '处理请求失败' });
        }
      });

      socket.on('voice_synthesis', async (data) => {
        console.log('🔊 语音合成请求:', data);

        try {
          const audioUrl = await this.fayManager.synthesizeVoice(data);
          socket.emit('voice_ready', { audioUrl, ...data });
        } catch (error) {
          console.error('❌ 语音合成失败:', error);
          socket.emit('error', { message: '语音合成失败' });
        }
      });

      socket.on('disconnect', () => {
        console.log('👋 客户端断开连接:', socket.id);
      });
    });
  }

  public getIO() {
    return this.io;
  }

  public attachToApp(app: any) {
    app.set('io', this.io);
  }
}
