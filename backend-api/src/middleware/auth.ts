import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 扩展Request接口，添加用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        type: 'user' | 'company' | 'admin';
      };
    }
  }
}

type UserType = 'user' | 'company' | 'admin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: UserType;
  };
}

/**
 * JWT token验证中间件
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      });
    }

    // 验证token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // 根据用户类型查询用户信息
    let user = null;
    switch (decoded.type) {
      case 'user':
        user = await prisma.user.findUnique({
          where: { id: decoded.id, isActive: true },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'company':
        user = await prisma.company.findUnique({
          where: { id: decoded.id, isActive: true },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'admin':
        user = await prisma.admin.findUnique({
          where: { id: decoded.id, isActive: true },
          select: { id: true, email: true, name: true, role: true }
        });
        break;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type
    };

    next();
  } catch (error: any) {
    console.error('Token验证失败:', error);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token已过期，请重新登录'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token格式无效'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: '访问令牌无效'
      });
    }
  }
};

// 兼容旧代码中的 auth 命名
export const auth = authenticateToken;

/**
 * 检查用户类型中间件
 */
export const requireUserType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireUserType(['admin']);

/**
 * 企业用户权限中间件
 */
export const requireCompany = requireUserType(['company']);

/**
 * 求职者权限中间件
 */
export const requireUser = requireUserType(['user']);

/**
 * 企业或管理员权限中间件
 */
export const requireCompanyOrAdmin = requireUserType(['company', 'admin']);

/**
 * 可选认证：有 token 则解析，失败或无 token 不阻断请求
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
    };
  } catch (error) {
    console.warn('可选认证解析失败:', error instanceof Error ? error.message : error);
  }
  next();
};

export const checkAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: '未提供认证token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      type: UserType;
    };

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token已过期，请重新登录' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token格式无效' });
    } else {
      return res.status(401).json({ message: '无效的token' });
    }
  }
}; 
