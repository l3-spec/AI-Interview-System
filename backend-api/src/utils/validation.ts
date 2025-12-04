import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// 基础验证规则
const email = Joi.string().email().required().messages({
  'string.email': '请输入有效的邮箱地址',
  'any.required': '邮箱为必填项'
});

const password = Joi.string().min(8).required().messages({
  'string.min': '密码至少需要8位字符',
  'any.required': '密码为必填项'
});

const phone = Joi.string().pattern(/^1[3-9]\d{9}$/).messages({
  'string.pattern.base': '请输入有效的手机号码'
});

const code = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': '请输入6位数字验证码',
    'any.required': '验证码为必填项'
  });

const name = Joi.string().min(2).max(50).required().messages({
  'string.min': '名称至少需要2个字符',
  'string.max': '名称不能超过50个字符',
  'any.required': '名称为必填项'
});

// 注册验证
export const registerSchema = Joi.object({
  email,
  password,
  name,
  phone: phone.optional(),
  description: Joi.string().max(500).optional(),
  industry: Joi.string().max(100).optional()
});

// 登录验证（手机号+验证码）
export const loginSchema = Joi.object({
  phone: phone.required().messages({
    'any.required': '手机号为必填项'
  }),
  code
});

// 发送验证码
export const sendCodeSchema = Joi.object({
  phone: phone.required().messages({
    'any.required': '手机号为必填项'
  })
});

// 用户资料更新验证
export const updateUserProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: phone.optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
  age: Joi.number().integer().min(16).max(100).optional(),
  education: Joi.string().max(200).optional(),
  experience: Joi.string().max(1000).optional(),
  skills: Joi.array().items(Joi.string().max(50)).max(20).optional()
});

// 企业资料更新验证
export const updateCompanyProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  industry: Joi.string().max(100).optional(),
  scale: Joi.string().max(50).optional(),
  address: Joi.string().max(200).optional(),
  website: Joi.string().uri().optional(),
  contact: Joi.string().max(100).optional()
});

// 职位发布验证
export const createJobSchema = Joi.object({
  title: Joi.string().min(2).max(100).required().messages({
    'string.min': '职位标题至少需要2个字符',
    'string.max': '职位标题不能超过100个字符',
    'any.required': '职位标题为必填项'
  }),
  description: Joi.string().min(10).max(2000).required().messages({
    'string.min': '职位描述至少需要10个字符',
    'string.max': '职位描述不能超过2000个字符',
    'any.required': '职位描述为必填项'
  }),
  requirements: Joi.string().min(10).max(1000).required().messages({
    'string.min': '任职要求至少需要10个字符',
    'string.max': '任职要求不能超过1000个字符',
    'any.required': '任职要求为必填项'
  }),
  salary: Joi.string().max(50).optional(),
  location: Joi.string().min(2).max(100).required().messages({
    'string.min': '工作地点至少需要2个字符',
    'string.max': '工作地点不能超过100个字符',
    'any.required': '工作地点为必填项'
  }),
  type: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP').default('FULL_TIME'),
  level: Joi.string().valid('INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER').default('JUNIOR'),
  skills: Joi.array().items(Joi.string().max(50)).max(20).optional()
});

// 职位更新验证
export const updateJobSchema = Joi.object({
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  requirements: Joi.string().min(10).max(1000).optional(),
  salary: Joi.string().max(50).optional(),
  location: Joi.string().min(2).max(100).optional(),
  type: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP').optional(),
  level: Joi.string().valid('INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER').optional(),
  skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  status: Joi.string().valid('ACTIVE', 'PAUSED', 'CLOSED').optional()
});

// 面试邀约验证
export const createInterviewInvitationSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': '无效的用户ID',
    'any.required': '用户ID为必填项'
  }),
  jobId: Joi.string().uuid().required().messages({
    'string.uuid': '无效的职位ID',
    'any.required': '职位ID为必填项'
  }),
  type: Joi.string().valid('ONLINE', 'OFFLINE', 'AI_INTERVIEW').required().messages({
    'any.only': '面试类型必须是 ONLINE、OFFLINE 或 AI_INTERVIEW',
    'any.required': '面试类型为必填项'
  }),
  scheduledAt: Joi.date().iso().greater('now').required().messages({
    'date.iso': '请输入有效的ISO日期格式',
    'date.greater': '面试时间必须是未来时间',
    'any.required': '面试时间为必填项'
  }),
  message: Joi.string().max(500).optional(),
  location: Joi.when('type', {
    is: 'OFFLINE',
    then: Joi.string().min(5).max(200).required().messages({
      'string.min': '面试地点至少需要5个字符',
      'string.max': '面试地点不能超过200个字符',
      'any.required': '线下面试需要提供面试地点'
    }),
    otherwise: Joi.optional()
  }),
  meetingUrl: Joi.when('type', {
    is: 'ONLINE',
    then: Joi.string().uri().required().messages({
      'string.uri': '请输入有效的会议链接',
      'any.required': '线上面试需要提供会议链接'
    }),
    otherwise: Joi.optional()
  })
});

// 面试评分验证
export const interviewScoreSchema = Joi.object({
  technicalScore: Joi.number().min(0).max(100).optional(),
  communicationScore: Joi.number().min(0).max(100).optional(),
  problemSolvingScore: Joi.number().min(0).max(100).optional(),
  cultureFitScore: Joi.number().min(0).max(100).optional(),
  summary: Joi.string().max(1000).optional(),
  strengths: Joi.array().items(Joi.string().max(200)).max(10).optional(),
  weaknesses: Joi.array().items(Joi.string().max(200)).max(10).optional(),
  recommendation: Joi.string().max(500).optional()
});

// 分页验证
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// 搜索验证
export const searchSchema = Joi.object({
  keyword: Joi.string().min(1).max(100).required().messages({
    'string.min': '搜索关键词不能为空',
    'string.max': '搜索关键词不能超过100个字符',
    'any.required': '搜索关键词为必填项'
  }),
  type: Joi.string().valid('jobs', 'companies', 'users').optional(),
  location: Joi.string().max(100).optional(),
  industry: Joi.string().max(100).optional()
});

// 密码重置验证
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': '重置令牌为必填项'
  }),
  newPassword: password
});

// 修改密码验证
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': '当前密码为必填项'
  }),
  newPassword: password
});

// 导出express-validator验证中间件
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 记录校验失败，方便排查线上问题
    console.warn('[VALIDATION_ERROR]', {
      path: req.path,
      method: req.method,
      errors: errors.array()
    });
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg
      }))
    });
  }
  next();
}; 
