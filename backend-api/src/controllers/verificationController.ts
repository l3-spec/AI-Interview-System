import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ossService } from '../services/ossService';

const prisma = new PrismaClient();

const normalizeLicensePath = (licensePath?: string | null) => {
  if (!licensePath) return licensePath;
  const cleaned = licensePath.replace(/\\\\/g, '/').replace(/\\/g, '/');
  // OSS地址直接返回
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned;
  }

  // 已包含完整子目录
  if (cleaned.includes('/uploads/licenses/')) {
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  }

  // 老路径：/uploads/filename，实际文件存于 /uploads/licenses/
  const matchLegacy = cleaned.match(/\/?uploads\/([^/]+)$/);
  if (matchLegacy) {
    const filename = matchLegacy[1];
    return `/uploads/licenses/${filename}`;
  }

  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
};

const isOSSConfigured = () =>
  Boolean(
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  );

const typeToFolder = (type?: string) => {
  switch (type) {
    case 'license':
      return 'licenses';
    default:
      return 'others';
  }
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

    // 允许待审核状态下更新资料；如果没有新文件，则沿用已上传的营业执照或前端传回的现有URL
    let rawPath: string | undefined;
    if (file) {
      if (isOSSConfigured()) {
        try {
          const folder = typeToFolder('license');
          const { url } = await ossService.uploadLocalFile(file.path, `uploads/${folder}/${file.filename}`);
          rawPath = url;
        } catch (err) {
          console.error('OSS上传营业执照失败，回退本地:', err);
          rawPath = `/${file.path.replace(/\\\\/g, '/').replace(/\\/g, '/')}`;
        }
      } else {
        rawPath = `/${file.path.replace(/\\\\/g, '/').replace(/\\/g, '/')}`;
      }
    } else {
      rawPath = businessLicenseUrl || existingVerification?.businessLicense;
    }

    const businessLicensePath = normalizeLicensePath(rawPath);

    if (!businessLicensePath) {
      return res.status(400).json({
        success: false,
        message: '请上传营业执照'
      });
    }

    // 创建或更新认证申请
    const verification = await prisma.companyVerification.upsert({
      where: { companyId },
      update: {
        businessLicense: businessLicensePath,
        legalPerson,
        registrationNumber,
        status: 'PENDING',
        reviewComments: null,
        reviewedAt: null,
        reviewedBy: null
      },
      create: {
        companyId,
        businessLicense: businessLicensePath,
        legalPerson,
        registrationNumber,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: '实名认证申请提交成功，请等待审核',
      data: verification
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

    if (verification?.businessLicense) {
      verification.businessLicense = normalizeLicensePath(verification.businessLicense) as string;
    }

    res.json({
      success: true,
      data: verification
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
      data: verifications,
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
      data: verification
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
      data: verification
    });
  } catch (error) {
    console.error('获取认证申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 
