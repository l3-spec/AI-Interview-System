import jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * 生成JWT Token
 */
export const signToken = (payload: object): string => {
  try {
    return jwt.sign(payload, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn 
    } as any);
  } catch (error) {
    console.error('JWT签名错误:', error);
    throw new Error('Token生成失败');
  }
};

/**
 * 验证JWT Token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.error('JWT验证错误: Token已过期', {
        expiredAt: error.expiredAt,
        currentTime: new Date(),
        token: token.substring(0, 50) + '...'
      });
      throw new Error('Token已过期，请重新登录');
    } else if (error.name === 'JsonWebTokenError') {
      console.error('JWT验证错误: Token格式无效', {
        message: error.message,
        token: token.substring(0, 50) + '...'
      });
      throw new Error('Token格式无效');
    } else {
      console.error('JWT验证错误:', error);
      throw new Error('Token验证失败');
    }
  }
}; 