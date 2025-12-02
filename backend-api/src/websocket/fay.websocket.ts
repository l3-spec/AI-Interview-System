import { Server } from 'socket.io';

import { FayServiceManager } from '../services/fay.service';

export class FayWebSocketServer {
  private io: Server;
  private fayManager: FayServiceManager;

  constructor(io: Server) {
    this.io = io;
    this.fayManager = new FayServiceManager();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 客户端已连接:', socket.id);

      socket.on('join_interview', (data) => {
        console.log('🎯 加入面试会话:', data);
        socket.join('fay_interview');

        // 通知所有客户端有新用户加入
        socket.to('fay_interview').emit('user_joined', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
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
