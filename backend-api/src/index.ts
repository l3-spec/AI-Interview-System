import { initServiceLogger, logEmitter } from './utils/service-logger';
initServiceLogger('backend-api');

// ────────────────────────────────────────────────
// 全局异常兜底：防止未捕获的异常/拒绝导致进程崩溃
// ────────────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  console.error('❌ [FATAL] uncaughtException:', err.message);
  console.error(err.stack);
  // 不退出进程，让 nodemon/pm2/Docker 的重启策略决定是否重启
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('❌ [FATAL] unhandledRejection:', msg);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
  // 不退出进程，避免瞬时网络抖动引发雪崩式重启
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './config/swagger';
import routes from './routes';
import voiceRoutes from './routes/voice.routes';
import { GatewayController } from './controllers/gateway.controller';

// 创建Express应用
const app = express();

// 基础中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false, // 允许嵌入外部资源
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http://localhost:3001", "https://localhost:3001"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
}));
app.use(cors({
  origin: function (origin, callback) {
    // 如果有 CORS_ORIGINS 环境变量，则进行匹配
    if (process.env.CORS_ORIGINS) {
      const allowedOrigins = process.env.CORS_ORIGINS.split(',');
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // 默认允许所有来源 (动态反射 Origin，兼容 credentials: true)
      callback(null, origin || '*');
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Access-Control-Allow-Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// 请求解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use(requestLogger);
app.use((req, res, next) => {
  // 排除日志上报请求，防止产生的调试日志造成循环
  if (req.url === '/api/system/logs/upload' || req.url === '/system/logs/upload') {
    return next();
  }
  if (req.url.startsWith('/api') || req.url === '/health') {
    console.log(`[GlobalDebug] Received request: ${req.method} ${req.url}`);
  }
  next();
});

// 限流中间件
app.use(rateLimiter);

// 健康检查端点（在API路由之前）
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 设置API文档
setupSwagger(app);

// 导入路由
import fayRoutes from './routes/fay.routes';

// 创建HTTP服务器（用于WebSocket，必须在路由之前创建）
const httpServer = createServer(app);

// 初始化WebSocket服务（在路由之前初始化）
import { Server } from 'socket.io';
import { FayWebSocketServer } from './websocket/fay.websocket';
import { RealtimeVoiceWebSocketServer } from './websocket/realtime-voice.websocket';
import { warmPlatformAiConfigRuntime } from './services/platformAiSettings.service';
import { serviceSupervisor } from './services/service-supervisor';

// 配置Socket.IO
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:8080",
];

const envOrigins = process.env.SOCKET_ALLOWED_ORIGINS
  ?.split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0) ?? [];

const uniqueOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
const corsOrigin = envOrigins.length > 0 ? uniqueOrigins : true;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000, // 60秒无响应则断开
  pingInterval: 25000, // 每25秒发送一次心跳
  connectTimeout: 45000, // 连接超时时间
});

const fayWebSocket = new FayWebSocketServer(io);
// [2026-05-26] 面试通信架构改造：App 改为 REST + TTS WebSocket 控制通道
// RealtimeVoiceWebSocketServer 不再需要，App 不再通过 Socket.IO 连接
// const realtimeVoiceWebSocket = new RealtimeVoiceWebSocketServer(io);
// console.log('🎤 [WebSocket] RealtimeVoiceWebSocketServer 已初始化');

// 设置系统状态 WebSocket 推送
function setupSystemStatusPush() {
  serviceSupervisor.onStatusChange((serviceName: string, isHealthy: boolean) => {
    const statusData = {
      serviceName,
      isHealthy,
      timestamp: new Date().toISOString(),
    };
    
    // 向所有连接的 admin 客户端推送状态更新
    io.emit('system:status_update', statusData);
    console.log(`📡 [WebSocket] 推送系统状态: ${serviceName} -> ${isHealthy ? '健康' : '异常'}`);
  });
}

setupSystemStatusPush();

// 设置微服务日志 WebSocket 实时推送
function setupServiceLogsPush() {
  // 1. 监听 logEmitter 本地汇聚的日志，并通过 WebSocket 广播
  logEmitter.on('log', (logData) => {
    io.emit('system:service_log', logData);
  });

  // 2. 订阅 Redis 频道接收外部微服务的日志上报
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const Redis = require('ioredis');
      const redisSub = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 10) {
            console.warn(`[Redis] 日志订阅已重连 ${times} 次，停止重试`);
            return null;
          }
          return Math.min(times * 500, 5000);
        },
        lazyConnect: true,
      });

      // 绑定 error 监听器，捕获连接重试报错，避免触发 Node 进程的 unhandled error 崩溃
      redisSub.on('error', (err: any) => {
        // 仅在控制台静默记录，不重新触发日志流
      });

      redisSub.connect().then(() => {
        redisSub.subscribe('system:service_logs', (err: any) => {
          if (err) {
            console.error('[Redis] 订阅日志频道 system:service_logs 失败:', err.message);
          } else {
            console.log('[Redis] 已成功订阅日志频道 system:service_logs');
          }
        }).catch((err: any) => {
          console.warn('[Redis] subscribe 失败:', err.message);
        });
      }).catch((err: any) => {
        console.warn('[Redis] 日志订阅 Redis 连接失败:', err.message);
      });

      redisSub.on('message', (channel: string, message: string) => {
        if (channel === 'system:service_logs') {
          try {
            const logData = JSON.parse(message);
            logEmitter.emit('log', logData);
          } catch (e) {
            // 忽略格式解析失败
          }
        }
      });
    } catch (e: any) {
      console.warn('[Redis] 日志订阅服务初始化异常:', e.message);
    }
  }
}

setupServiceLogsPush();

// 附加到应用
fayWebSocket.attachToApp(app);

// 静态文件服务
app.use('/uploads', express.static('uploads'));
app.use('/api/uploads', express.static('uploads'));
app.use('/static', express.static('static'));
app.use('/api/static', express.static('static'));

// API路由
// 先注册 voiceRoutes，确保 /api/voice 路由优先匹配
app.use('/api/voice', voiceRoutes);
app.use('/voice', voiceRoutes); // 兼容被反向代理去掉 /api 前缀的情况
console.log('[Route Registration] voiceRoutes 已注册到 /api/voice 和 /voice');
app.use('/api', routes);
app.use('/api/fay', fayRoutes); // Fay数字人API路由

// HTTPS Gateway Routes —— App 与 backend-api 的统一 REST 入口
app.post('/api/gateway/join', GatewayController.joinSession);
app.post('/api/gateway/message', GatewayController.sendMessage);
app.post('/api/gateway/playback-done', GatewayController.playbackDone);
app.post('/api/gateway/interrupt', GatewayController.interrupt);
app.get('/api/gateway/session/:sessionId', GatewayController.getSessionState);
app.get('/api/gateway/discover', GatewayController.discoverServices);

// 数字人测试路由
import digitalHumanTestRoutes from './routes/digital-human-test.routes';
app.use(digitalHumanTestRoutes);

// Fay数字人静态文件服务
const publicPath = path.join(__dirname, '../public');
app.use('/fay', express.static(path.join(publicPath, 'fay')));
app.use('/test', express.static(path.join(publicPath, 'test')));

// 视频文件服务
app.use('/videos', express.static(path.join(__dirname, '../videos')));

// 数字人主页路由
// Fay数字人主页路由（保持兼容）
app.get('/fay', (req, res) => {
  const filePath = path.join(__dirname, '../public/fay/index.html');

  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      let html = fs.readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.json({
        message: 'Fay数字人系统已就绪',
        websocket: 'ws://localhost:3001',
        api: 'http://localhost:3001/api/fay',
        instructions: '请访问 /api/fay/test 获取完整API文档'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Fay服务初始化中'
    });
  }
});

// 添加调试路由
app.get('/debug', (req, res) => {
  const debugPublicPath = path.join(__dirname, '../public');
  const avatarPath = path.join(debugPublicPath, 'avatar/index.html');
  const modelsPath = path.join(debugPublicPath, 'models');

  const fs = require('fs');

  res.json({
    debug: true,
    publicPath: debugPublicPath,
    avatarPath,
    modelsPath,
    avatarExists: fs.existsSync(avatarPath),
    modelsExists: fs.existsSync(modelsPath),
    files: fs.existsSync(debugPublicPath) ? fs.readdirSync(debugPublicPath) : []
  });
});

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务器
const PORT = config.port;
httpServer.listen(PORT, async () => {
  console.log(`🚀 U-Talent后端服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api/docs`);
  console.log(`🌟 环境: ${config.nodeEnv}`);
  console.log(`🎭 Fay WebSocket服务: ws://localhost:${PORT}`);
  console.log(`🎤 实时语音WebSocket服务: ws://localhost:${PORT}`);

  // 启动子服务管理器
  try {
    const { serviceSupervisor } = require('./services/service-supervisor');
    await serviceSupervisor.startAll();
  } catch (e: any) {
    console.warn('⚠️ ServiceSupervisor 启动失败:', e?.message || e);
  }

  try {
    console.log('🔄 正在预热平台 AI 配置...');
    await warmPlatformAiConfigRuntime();
    console.log('✅ 平台 AI 配置预热完成');
  } catch (e: any) {
    console.warn('⚠️ 平台 AI 配置预热跳过:', e?.message || e);
    console.warn('提示: 这通常是由于数据库尚未就绪或连接超时。系统将在后续请求中自动重试。');
  }
});

export default httpServer;
