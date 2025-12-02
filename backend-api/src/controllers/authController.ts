import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { loginSchema, registerSchema, sendCodeSchema } from '../utils/validation';
import { signToken } from '../utils/jwt';
import { loginCodeService } from '../services/loginCodeService';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * 生成JWT Token
 */
const generateToken = (payload: any) => {
  return signToken(payload);
};

/**
 * 用户注册
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // 验证请求数据
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password, name, phone } = value;

  // 检查用户是否已存在
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : [])
      ]
    }
  });

  if (existingUser) {
    throw new AppError('用户已存在', 409);
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 12);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      createdAt: true
    }
  });

  // 生成token
  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'user'
  });

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      user,
      token
    }
  });
});

/**
 * 企业注册
 */
export const registerCompany = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password, name, description } = req.body;

    // 参数验证
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填项'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      });
    }

    // 检查企业是否已存在
    const existingCompany = await prisma.company.findUnique({
      where: { email }
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建企业账号
    const company = await prisma.company.create({
      data: {
        email,
        password: hashedPassword,
        name,
        description: description || '',
        isVerified: false,
        isActive: true,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天试用期
      },
      select: {
        id: true,
        email: true,
        name: true,
        description: true,
        isVerified: true,
        isActive: true,
        subscriptionEndDate: true,
        createdAt: true
      }
    });

    // 生成token
    const token = generateToken({
      id: company.id,
      email: company.email,
      type: 'company'
    });

    res.status(201).json({
      success: true,
      message: '企业注册成功',
      data: {
        company,
        token
      }
    });
  } catch (error) {
    console.error('企业注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

/**
 * 用户登录
 */
export const sendLoginCode = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = sendCodeSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { phone } = value;

  try {
    const result = await loginCodeService.requestCode(phone);

    const responseData: Record<string, unknown> = {
      expiresIn: result.expiresIn,
      resendIn: result.resendIn
    };

    if (result.code) {
      responseData.code = result.code;
    }

    res.json({
      success: true,
      message: '验证码已发送',
      data: responseData
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('ReadTimeout');
    if (isTimeout) {
      const fallbackResult = loginCodeService.generateLocalCode(phone);
      res.status(202).json({
        success: true,
        message: '短信通道暂时超时，已切换本地验证码',
        data: {
          code: fallbackResult.code,
          expiresIn: fallbackResult.expiresIn,
          resendIn: fallbackResult.resendIn,
          provider: 'local'
        }
      });
      return;
    }

    throw new AppError(err instanceof Error ? err.message : '验证码发送失败', 429);
  }
});

/**
 * 用户登录
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { phone, code } = value;

  const verified = loginCodeService.verifyCode(phone, code);
  if (!verified) {
    throw new AppError('验证码错误或已失效', 400);
  }

  const existingUser = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      phone: true,
      isActive: true
    }
  });

  if (existingUser && !existingUser.isActive) {
    throw new AppError('账号已被禁用，请联系管理员', 403);
  }

  let isNewUser = false;
  let userProfile;

  if (!existingUser) {
    isNewUser = true;
    const randomPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 12);
    const fallbackEmail = `phone_${phone}@auto-user.aiinterview.com`;
    const displayName = `用户${phone.slice(-4)}`;

    userProfile = await prisma.user.create({
      data: {
        email: fallbackEmail,
        password: randomPassword,
        name: displayName,
        phone,
        isVerified: true,
        isActive: true,
        lastLoginAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true
      }
    });
  } else {
    userProfile = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        lastLoginAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true
      }
    });
  }

  const token = generateToken({
    id: userProfile.id,
    email: userProfile.email,
    phone: userProfile.phone,
    type: 'user'
  });

  res.json({
    success: true,
    message: isNewUser ? '注册成功，已自动登录' : '登录成功',
    data: {
      user: userProfile,
      token,
      isNewUser
    }
  });
});

export const deviceLogin = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = sendCodeSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { phone } = value;

  const existingUser = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      phone: true,
      isActive: true
    }
  });

  if (existingUser && !existingUser.isActive) {
    throw new AppError('账号已被禁用，请联系管理员', 403);
  }

  let isNewUser = false;
  let userProfile;

  if (!existingUser) {
    isNewUser = true;
    const randomPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 12);
    const fallbackEmail = `phone_${phone}@auto-user.aiinterview.com`;
    const displayName = `用户${phone.slice(-4)}`;

    userProfile = await prisma.user.create({
      data: {
        email: fallbackEmail,
        password: randomPassword,
        name: displayName,
        phone,
        isVerified: true,
        isActive: true,
        lastLoginAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true
      }
    });
  } else {
    userProfile = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        lastLoginAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true
      }
    });
  }

  const token = generateToken({
    id: userProfile.id,
    email: userProfile.email,
    phone: userProfile.phone,
    type: 'user'
  });

  res.json({
    success: true,
    message: isNewUser ? '注册成功，已自动登录' : '登录成功',
    data: {
      user: userProfile,
      token,
      isNewUser
    }
  });
});

/**
 * 企业登录
 */
export const loginCompany = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 参数验证
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写邮箱和密码'
      });
    }

    // 查找企业
    const company = await prisma.company.findUnique({
      where: { email }
    });

    if (!company) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, company.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 生成token
    const token = generateToken({
      id: company.id,
      email: company.email,
      type: 'company'
    });

    // 更新最后登录时间
    await prisma.company.update({
      where: { id: company.id },
      data: { updatedAt: new Date() }
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        company: {
          id: company.id,
          email: company.email,
          name: company.name,
          logo: company.logo,
          isVerified: company.isVerified,
          isActive: company.isActive
        },
        token
      }
    });
  } catch (error) {
    console.error('企业登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

/**
 * 管理员登录
 */
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 查找管理员
  const admin = await prisma.admin.findUnique({
    where: { email }
  });

  if (!admin || !admin.isActive) {
    throw new AppError('邮箱或密码错误', 401);
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new AppError('邮箱或密码错误', 401);
  }

  // 生成token
  const token = generateToken({
    id: admin.id,
    email: admin.email,
    type: 'admin',
    role: admin.role
  });

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: [] // 临时返回空数组，后续完善权限系统
      }
    }
  });
});

/**
 * 获取当前用户信息
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('用户未认证', 401);
  }

  let userData = null;

  // 根据用户类型获取详细信息
  switch (req.user.type) {
    case 'user':
      userData = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          phone: true,
          gender: true,
          age: true,
          education: true,
          experience: true,
          skills: true,
          createdAt: true
        }
      });
      break;
    case 'company':
      userData = await prisma.company.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          logo: true,
          description: true,
          industry: true,
          scale: true,
          address: true,
          website: true,
          contact: true,
          isVerified: true,
          createdAt: true
        }
      });
      break;
    case 'admin':
      userData = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });
      break;
  }

  if (!userData) {
    throw new AppError('用户不存在', 404);
  }

  res.json({
    success: true,
    data: {
      type: req.user.type,
      ...userData
    }
  });
});

/**
 * 登出（可用于黑名单token，这里仅返回成功）
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // 实际应用中可以将token加入黑名单
  res.json({
    success: true,
    message: '登出成功'
  });
}); 
