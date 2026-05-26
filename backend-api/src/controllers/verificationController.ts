import { Request, Response } from 'express';
import { ossService } from '../services/ossService';
import { isOSSConfigured, toObjectKey, toPublicUrl, typeToFolder } from '../utils/ossUtils';
import { prisma } from '../lib/prisma';

const mapVerificationForResponse = (verification: any) => {
  if (!verification) return verification;
  return {
    ...verification,
    businessLicense: toPublicUrl(verification.businessLicense)
  };
};

// 提交实名认证申请
export const submitVerification = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { legalPerson, registrationNumber, businessLicense: businessLicenseUrl } = req.body;
    const file = req.file;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    // 检查是否已有认证申请
    const existingVerification = await prisma.companyVerification.findUnique({
      where: { companyId }
    });

    if (existingVerification && existingVerification.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: '企业已通过实名认证'
      });
    }

    if (file && !isOSSConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'OSS 未配置，无法上传营业执照'
      });
    }

    // 允许待审核状态下更新资料；如果没有新文件，则沿用已上传的营业执照或前端传回的现有URL
    let businessLicenseKey: string | undefined;
    if (file) {
      try {
        const folder = typeToFolder('license');
        const bucketName = ossService.getBucketForType('license');
        const { objectKey } = await ossService.uploadLocalFile(file.path, `uploads/${folder}/${file.filename}`, bucketName);
        businessLicenseKey = toObjectKey(objectKey);
      } catch (err) {
        console.error('OSS上传营业执照失败:', err);
        return res.status(500).json({
          success: false,
          message: '营业执照上传失败，请稍后重试'
        });
      }
    } else {
      businessLicenseKey = toObjectKey(businessLicenseUrl || existingVerification?.businessLicense);
    }

    if (!businessLicenseKey) {
      return res.status(400).json({
        success: false,
        message: '请上传营业执照'
      });
    }

    // 创建或更新认证申请
    const verification = await prisma.companyVerification.upsert({
      where: { companyId },
      update: {
        businessLicense: businessLicenseKey,
        legalPerson,
        registrationNumber,
        status: 'PENDING',
        reviewComments: null,
        reviewedAt: null,
        reviewedBy: null
      },
      create: {
        companyId,
        businessLicense: businessLicenseKey,
        legalPerson,
        registrationNumber,
        status: 'PENDING'
      }
    });

    const responseData = mapVerificationForResponse(verification);

    res.status(201).json({
      success: true,
      message: '实名认证申请提交成功，请等待审核',
      data: responseData
    });
  } catch (error) {
    console.error('提交实名认证申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取认证状态
export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    const verification = await prisma.companyVerification.findUnique({
      where: { companyId },
      select: {
        id: true,
        status: true,
        legalPerson: true,
        registrationNumber: true,
        businessLicense: true,
        reviewComments: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: mapVerificationForResponse(verification)
    });
  } catch (error) {
    console.error('获取认证状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取认证申请列表（管理员使用）
export const getVerificationList = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [verifications, total] = await Promise.all([
      prisma.companyVerification.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder
        },
        skip,
        take
      }),
      prisma.companyVerification.count({ where })
    ]);

    res.json({
      success: true,
      data: verifications.map(mapVerificationForResponse),
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取认证申请列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 审核认证申请（管理员使用）
export const reviewVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核状态'
      });
    }

    // 更新认证申请状态
    const verification = await prisma.companyVerification.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
        reviewComments: comments,
        reviewedAt: new Date(),
        reviewedBy: adminId
      },
      include: {
        company: true
      }
    });

    // 如果审核通过，更新企业的认证状态
    if (status === 'approved') {
      await prisma.company.update({
        where: { id: verification.companyId },
        data: { isVerified: true }
      });
    }

    res.json({
      success: true,
      message: status === 'approved' ? '认证申请已通过' : '认证申请已拒绝',
      data: mapVerificationForResponse(verification)
    });
  } catch (error) {
    console.error('审核认证申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取认证申请详情（管理员使用）
export const getVerificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const verification = await prisma.companyVerification.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            description: true,
            industry: true,
            scale: true,
            address: true,
            website: true,
            contact: true,
            createdAt: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证申请不存在'
      });
    }

    res.json({
      success: true,
      data: mapVerificationForResponse(verification)
    });
  } catch (error) {
    console.error('获取认证申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 

// 提交个人实名认证（运营商三要素验证）
export const submitPersonalVerification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { realName, idNumber, phone, code } = req.body;
    console.log(`[PersonalVerification] Received request:`, { realName, idNumber, phone, code });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    if (!realName || !idNumber || !phone || !code) {
      console.log(`[PersonalVerification] Missing parameters:`, { 
        realName: !!realName, 
        idNumber: !!idNumber, 
        phone: !!phone, 
        code: !!code 
      });
      return res.status(400).json({
        success: false,
        message: '请填写完整的认证信息'
      });
    }

    // 1. 验证短信验证码
    const { loginCodeService } = require('../services/loginCodeService');
    const isCodeValid = loginCodeService.verifyCode(phone, code);
    console.log(`[PersonalVerification] Code validation for ${phone} with code ${code}: ${isCodeValid}`);
    if (!isCodeValid) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已失效'
      });
    }

    // 2. 模拟请求运营商三要素接口
    console.log(`[运营商验证] 正在向运营商发起三要素验证请求...`);
    console.log(`[运营商验证] 姓名: ${realName}, 身份证号: ${idNumber}, 手机号: ${phone}`);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 这里可以接入真实的第三方接口（如阿里云、腾讯云三要素验证）
    // 模拟验证结果
    const isCarrierValid = true; 

    if (!isCarrierValid) {
      console.log(`[运营商验证] 验证失败：信息不匹配`);
      return res.status(400).json({
        success: false,
        message: '运营商验证失败，请核对身份信息'
      });
    }

    console.log(`[运营商验证] 验证通过！`);

    // 3. 更新用户认证状态
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true }
    });

    res.json({
      success: true,
      message: '实名认证成功',
      data: {
        isVerified: true
      }
    });
  } catch (error) {
    console.error('个人实名认证失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};
