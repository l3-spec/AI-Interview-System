import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import avatarRoutes from './routes/avatar.routes';
import openSourceAvatarRoutes from './routes/openSourceAvatar.routes';
import voiceRoutes from './routes/voice.routes';

const app = express();
const prisma = new PrismaClient();

// CORS配置 - 支持admin-dashboard和system-admin
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // 允许的源列表
    const allowedOrigins = [
      'http://localhost:5174',  // admin-dashboard
      'http://localhost:5175',  // system-admin
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://192.168.0.188:5174',  // Android开发环境
      'https://admin.aiinterview.com'  // 生产环境
    ];
    
    // 允许没有origin的请求（比如同源请求）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: false, // 改为false，因为我们使用Bearer Token而不是cookies
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// 中间件 - 修复Helmet配置以解决CORS问题
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http://localhost:3001", "https://localhost:3001"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// 添加CORS预检请求处理
app.use((req, res, next) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return;
  }
  next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin} - Auth: ${req.headers.authorization ? 'Bearer ***' : 'None'}`);
  next();
});

// 静态文件服务 - 使用绝对路径
const publicPath = path.join(__dirname, '../public');
app.use('/avatar', express.static(path.join(publicPath, 'avatar')));
app.use('/models', express.static(path.join(publicPath, 'models')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/avatar', openSourceAvatarRoutes);
app.use('/api', avatarRoutes);
app.use(['/api/voice', '/voice'], voiceRoutes);

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

// 直接处理avatar首页路由
app.get('/avatar', (req, res) => {
  const filePath = path.join(__dirname, '../public/avatar/index.html');
  console.log('Serving avatar page from:', filePath);
  
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ 
        error: 'Avatar page not found', 
        path: filePath,
        cwd: process.cwd()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 备用路由
app.get('/avatar.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/avatar/index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ai-interview-backend'
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app, prisma }; 
