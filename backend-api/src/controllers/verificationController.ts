import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ossService } from '../services/ossService';
import { isOSSConfigured, toObjectKey, toPublicUrl, typeToFolder } from '../utils/ossUtils';

const prisma = new PrismaClient();

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
        const { objectKey } = await ossService.uploadLocalFile(file.path, `uploads/${folder}/${file.filename}`);
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
