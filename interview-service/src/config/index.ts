import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量（优先 backend-api/.env，若不存在再退回默认策略）
const envPath = path.resolve(__dirname, '../../.env');
const loadResult = dotenv.config({ path: envPath });
if (loadResult.error) {
  dotenv.config();
  console.warn(`[config] backend-api/.env 未找到，使用默认 dotenv 加载 (cwd=${process.cwd()})`);
} else {
  console.log(`[config] 已加载环境变量: ${envPath}`);
  process.env.__CONFIG_LOADED_ENV = envPath;
}

// 配置验证函数 - 开发环境提供默认值
const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name] || defaultValue;
  if (!value) {
    // 在开发环境中，如果是某些非关键的环境变量，提供默认值
    if (process.env.NODE_ENV === 'development') {
      switch (name) {
        case 'DATABASE_URL':
          // 临时使用内存数据库进行调试
          console.warn('⚠️ 使用内存数据库进行调试，请配置正确的DATABASE_URL');
          return 'file:./dev.db';
        case 'JWT_SECRET':
          return 'dev-jwt-secret-key-for-development-only';
        case 'SMTP_USER':
          return 'dev@example.com';
        case 'SMTP_PASS':
          return 'dev-password';
        default:
          throw new Error(`环境变量 ${name} 未设置`);
      }
    }
    throw new Error(`环境变量 ${name} 未设置`);
  }
  return value;
};

export const config = {
  // 基础配置
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '3001')),
  
  // 数据库配置
  database: {
    url: getEnvVar('DATABASE_URL')
  },
  
  // JWT配置
  jwt: {
    secret: getEnvVar('JWT_SECRET', 'dev-jwt-secret-key-for-development-only'),
    expiresIn: '7d' // 延长为7天，避免频繁过期
  },
  
  // Redis配置
  redis: {
    url: getEnvVar('REDIS_URL')
  },
  
  // 邮件配置
  email: {
    host: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(getEnvVar('SMTP_PORT', '587')),
    user: getEnvVar('SMTP_USER'),
    pass: getEnvVar('SMTP_PASS')
  },
  
  // 文件上传配置
  upload: {
    dir: 'uploads',
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  
  // 管理员默认配置
  admin: {
    email: getEnvVar('ADMIN_EMAIL', 'admin@aiinterview.com'),
    password: getEnvVar('ADMIN_PASSWORD', 'admin123456')
  },
  
  // API文档配置
  swagger: {
    url: getEnvVar('API_DOCS_URL', '/api/docs')
  },
  
  // 安全配置
  security: {
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15分钟
    passwordMinLength: 8
  },
  
  // 面试配置
  interview: {
    maxDuration: 60, // 最大面试时长(分钟)
    maxQuestions: 20, // 最大问题数量
    videoCodec: 'h264',
    audioCodec: 'aac'
  },

  // AIRI 数字人配置
  airi: {
    webUrl: getEnvVar('AIRI_WEB_URL', 'http://localhost:3000/avatar')
  },
  
  cors: {
    origin: [
      'http://localhost:5173',  // 企业管理端
      'http://localhost:5174',  // 系统管理端
      'http://localhost:5175'   // API服务
    ],
    credentials: true
  }
};

// 确保上传目录存在
import fs from 'fs';
const uploadDirs = [
  config.upload.dir,
  path.join(config.upload.dir, 'videos'),
  path.join(config.upload.dir, 'images'),
  path.join(config.upload.dir, 'documents'),
  path.join(config.upload.dir, 'avatars'),
  path.join(config.upload.dir, 'logos')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export default config; 
