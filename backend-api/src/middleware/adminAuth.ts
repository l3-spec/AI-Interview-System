import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { verifyToken } from '../utils/jwt';

const prisma = new PrismaClient();

// 扩展Request接口以包含admin信息
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

/**
 * 管理员认证中间件
 */
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，需要管理员认证令牌',
        code: 'TOKEN_MISSING'
      });
    }

    // 验证JWT令牌
    let decoded: any;
    try {
      decoded = verifyToken(token);
      // 成功验证时记录解码后的payload和token信息
      console.log('JWT验证成功:', {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000),
        iat: new Date(decoded.iat * 1000),
        token: token.substring(0, 50) + '...'
      });
    } catch (error: any) {
      if (error.message.includes('Token已过期')) {
        return res.status(401).json({
          success: false,
          message: 'Token已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.message.includes('Token格式无效')) {
        return res.status(401).json({
          success: false,
          message: 'Token格式无效',
          code: 'TOKEN_INVALID'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token验证失败',
          code: 'TOKEN_VERIFY_ERROR'
        });
      }
    }
    
    // 检查是否为管理员类型的token
    if (decoded.type !== 'admin' || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: '无效的管理员令牌',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    // 查找管理员信息
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: '管理员账号已被禁用',
        code: 'ADMIN_DISABLED'
      });
    }

    // 将管理员信息添加到request对象
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: [] // 暂时设为空数组，后续可以根据角色设置权限
    };

    next();
  } catch (error) {
    console.error('管理员认证中间件错误:', error);
    return res.status(401).json({
      success: false,
      message: '认证失败，请重新登录',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * 检查管理员角色权限
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: '未认证的管理员'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要角色: ' + roles.join(' 或 ')
      });
    }

    next();
  };
};

/**
 * 检查管理员功能权限
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: '未认证的管理员'
      });
    }

    // 超级管理员拥有所有权限
    if (req.admin.role === 'SUPER_ADMIN' || req.admin.role === 'ADMIN') {
      return next();
    }

    // 暂时允许所有权限，后续可以完善权限系统
    return next();
  };
}; 