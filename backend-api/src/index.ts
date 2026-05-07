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
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com', 'https://admin.yourdomain.com', 'https://system.yourdomain.com']
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite默认端口
      'http://localhost:5174', // 企业管理后台
      'http://localhost:5175', // 系统管理后台
      'http://localhost:8080', // 可能的其他端口
      'http://localhost:8081'
    ],
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
const realtimeVoiceWebSocket = new RealtimeVoiceWebSocketServer(io);

// 附加到应用
fayWebSocket.attachToApp(app);
realtimeVoiceWebSocket.attachToApp(app);

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
    serviceSupervisor.startAll();
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
