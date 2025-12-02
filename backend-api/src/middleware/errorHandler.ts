import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API错误:', error);

  // 默认错误响应
  let statusCode = 500;
  let message = '服务器内部错误';

  // 根据错误类型设置响应
  if (error instanceof AppError) {
    statusCode = error.statusCode || 500;
    message = error.message || message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '请求参数验证失败';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源不存在';
  } else if (error.message) {
    message = error.message;
  }

  // 记录错误日志
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode}:`, {
    message: error.message,
    stack: config.nodeEnv === 'development' ? error.stack : undefined,
    user: req.user ? req.user.id : 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 返回错误响应
  const response: any = {
    success: false,
    error_message: message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // 开发环境下返回详细错误信息
  if (config.nodeEnv === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404错误处理
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`接口 ${req.originalUrl} 不存在`, 404);
  next(error);
};

/**
 * 异步错误捕获装饰器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 
