import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// 简单的内存限流器
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分钟窗口
  const maxRequests = 100; // 最大请求数

  const clientData = requestCounts.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // 新客户端或窗口已重置
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    next();
  } else if (clientData.count < maxRequests) {
    // 增加请求计数
    clientData.count++;
    next();
  } else {
    // 超出限制
    res.status(429).json({
      success: false,
      error_message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
};

/**
 * 严格限流器 - 用于敏感操作，每15分钟5个请求
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP在windowMs时间内最多5个请求
  message: {
    success: false,
    message: '敏感操作请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 登录限流器 - 每15分钟10次登录尝试
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 登录尝试次数限制
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的登录不计入限制
});

/**
 * 文件上传限流器 - 每小时20个文件
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 文件上传次数限制
  message: {
    success: false,
    message: '文件上传过于频繁，请1小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
}); 