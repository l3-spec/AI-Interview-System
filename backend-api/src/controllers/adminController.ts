import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';

/**
 * 管理员登录
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 查找管理员
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: '账号已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 生成JWT令牌 - 使用与认证中间件匹配的格式
    const token = jwt.sign(
      { 
        id: admin.id,
        email: admin.email,
        type: 'admin',
        role: admin.role
      },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

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
          permissions: [] // 临时返回空数组，等数据库更新后完善
        }
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取用户列表（求职者）
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // 获取用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          gender: true,
          age: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              applications: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取企业用户列表
 */
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }

    // 获取企业用户列表
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        select: {
          id: true,
          email: true,
          name: true,
          logo: true,
          industry: true,
          scale: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          focusArea: true,
          tagline: true,
          themeColors: true,
          verification: {
            select: {
              id: true,
              status: true,
              businessLicense: true,
              legalPerson: true,
              registrationNumber: true,
              reviewComments: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true
            }
          },
          showcase: {
            select: {
              id: true,
              role: true,
              hiringCount: true,
              sortOrder: true,
            }
          },
          _count: {
            select: {
              jobs: true,
              interviews: true
            }
          }
        }
      }),
      prisma.company.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('获取企业用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新用户状态
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      success: true,
      message: '用户状态更新成功'
    });
  } catch (error) {
    console.error('更新用户状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新企业用户状态
 */
export const updateCompanyStatus = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { isActive, isVerified } = req.body;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '企业不存在'
      });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    // 同步实名认证记录的审核状态，避免认证状态不一致
    if (isVerified !== undefined) {
      const verification = await prisma.companyVerification.findUnique({
        where: { companyId }
      });

      if (verification) {
        await prisma.companyVerification.update({
          where: { companyId },
          data: {
            status: isVerified ? 'APPROVED' : 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: req.user?.id || null,
            reviewComments: isVerified
              ? verification.reviewComments
              : verification.reviewComments || '管理员取消认证'
          }
        });
      }
    }

    await prisma.company.update({
      where: { id: companyId },
      data: updateData
    });

    res.json({
      success: true,
      message: '企业状态更新成功'
    });
  } catch (error) {
    console.error('更新企业状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

export const getCompanyDetail = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
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
        tagline: true,
        focusArea: true,
        themeColors: true,
        stats: true,
        highlights: true,
        culture: true,
        locations: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        verification: {
          select: {
            id: true,
            status: true,
            businessLicense: true,
            legalPerson: true,
            registrationNumber: true,
            reviewComments: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true
          }
        },
        showcase: {
          select: {
            id: true,
            role: true,
            hiringCount: true,
            sortOrder: true,
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '企业不存在'
      });
    }

    const parseJsonArray = <T>(value: string | null, fallback: T[]): T[] => {
      if (!value) {
        return fallback;
      }
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (error) {
        return fallback;
      }
    };

    const parseStatsArray = (value: string | null) => {
      if (!value) {
        return [] as Array<{ label: string; value: string; accent?: string }>;
      }
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !!item && typeof item === 'object');
        }
        return [];
      } catch (error) {
        return [];
      }
    };

    res.json({
      success: true,
      data: {
        ...company,
        themeColors: parseJsonArray<string>(company.themeColors, []),
        highlights: parseJsonArray<string>(company.highlights, []),
        culture: parseJsonArray<string>(company.culture, []),
        locations: parseJsonArray<string>(company.locations, []),
        stats: parseStatsArray(company.stats),
      }
    });
  } catch (error) {
    console.error('获取企业详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取Dashboard统计数据
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // 计算时间范围
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 并行查询各种统计数据
    const [
      totalUsers,
      activeUsers,
      newUsersCount,
      totalCompanies,
      activeCompanies,
      verifiedCompanies,
      newCompaniesCount,
      totalInterviews,
      completedInterviews,
      totalJobs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.company.count({ where: { isVerified: true } }),
      prisma.company.count({ where: { createdAt: { gte: startDate } } }),
      prisma.interview.count(),
      prisma.interview.count({ where: { status: 'COMPLETED' } }),
      prisma.job.count()
    ]);

    const stats = {
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisPeriod: newUsersCount
        },
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          verified: verifiedCompanies,
          newThisPeriod: newCompaniesCount
        },
        interviews: {
          total: totalInterviews,
          completed: completedInterviews,
          completionRate: totalInterviews > 0 ? ((completedInterviews / totalInterviews) * 100).toFixed(2) : 0
        },
        jobs: {
          total: totalJobs
        }
      },
      timeRange
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取Dashboard统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 临时空实现，等待数据库模型更新后完善
export const extendSubscription = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: '订阅展期功能暂未实现，需要先更新数据库模型'
  });
};

export const getSystemLogs = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: '系统日志功能暂未实现，需要先更新数据库模型'
  });
};

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search,
      role,
      isActive
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }
    
    if (role) where.role = role as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // 获取管理员列表
    const [admins, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      }),
      prisma.admin.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('获取管理员列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // 检查邮箱是否已存在
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: '邮箱已存在'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: '管理员创建成功',
      data: { admin }
    });
  } catch (error) {
    console.error('创建管理员错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { name, role, isActive } = req.body;

    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true }
    });

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
    }

    // 更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    await prisma.admin.update({
      where: { id: adminId },
      data: updateData
    });

    res.json({
      success: true,
      message: '管理员更新成功'
    });
  } catch (error) {
    console.error('更新管理员错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
    }

    // 不能删除超级管理员
    if (admin.role === 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        message: '不能删除超级管理员'
      });
    }

    await prisma.admin.delete({
      where: { id: adminId }
    });

    res.json({
      success: true,
      message: '管理员删除成功'
    });
  } catch (error) {
    console.error('删除管理员错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取职位列表（管理员查看）
 */
export const getJobs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { company: { name: { contains: search as string } } }
      ];
    }

    if (status) {
      if (status === 'PAUSED') {
        // "暂停" 状态在数据库中没有直接对应，这里我们理解为"草稿"或"未发布"
        where.status = 'DRAFT';
      } else {
        where.status = status as string;
      }
    }

    if (companyId) {
      where.companyId = companyId as string;
    }

    // 获取职位列表
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              applications: true,
              interviews: true
            }
          }
        }
      }),
      prisma.job.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('获取职位列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新职位状态（管理员操作）
 */
export const updateJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { status, reason } = req.body;

    // 检查职位是否存在
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: { name: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '职位不存在'
      });
    }

    // 更新职位状态
    const updateData: any = {};
    if (status === 'ACTIVE') {
      updateData.status = 'ACTIVE';
      updateData.isPublished = true;
    } else if (status === 'PAUSED') {
      updateData.status = 'DRAFT'; // 将"暂停"映射为"草稿"
      updateData.isPublished = false;
    } else if (status === 'CLOSED') {
      updateData.status = 'CLOSED';
      updateData.isPublished = false;
    }

    await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });

    // 记录系统日志
    await prisma.systemLog.create({
      data: {
        action: 'UPDATE_JOB_STATUS',
        module: 'JOB_MANAGEMENT',
        description: `将职位 "${job.title}" 状态变更为 ${status}`,
        targetId: jobId,
        targetType: 'JOB',
        result: 'SUCCESS',
        adminId: req.admin?.id
      }
    });

    res.json({
      success: true,
      message: '职位状态更新成功'
    });
  } catch (error) {
    console.error('更新职位状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取职位详情（管理员查看）
 */
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            email: true,
            isVerified: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            applications: true,
            interviews: true
          }
        },
        applications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '职位不存在'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('获取职位详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除职位（管理员操作）
 */
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { reason } = req.body;

    // 检查职位是否存在
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: { name: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '职位不存在'
      });
    }

    // 删除职位
    await prisma.job.delete({
      where: { id: jobId }
    });

    // 记录系统日志
    await prisma.systemLog.create({
      data: {
        action: 'DELETE_JOB',
        module: 'JOB_MANAGEMENT',
        description: `删除职位 "${job.title}" (${job.company.name})，原因：${reason || '管理员操作'}`,
        targetId: jobId,
        targetType: 'JOB',
        result: 'SUCCESS',
        adminId: req.admin?.id
      }
    });

    res.json({
      success: true,
      message: '职位删除成功'
    });
  } catch (error) {
    console.error('删除职位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取职位统计数据
 */
export const getJobStats = async (req: Request, res: Response) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // 计算时间范围
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 并行查询各种统计数据
    const [
      totalJobs,
      activeJobs,
      pausedJobs,
      closedJobs,
      newJobsCount,
      totalApplications,
      totalViewCount
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'DRAFT' } }), // "暂停" 对应 "草稿"
      prisma.job.count({ where: { status: 'CLOSED' } }),
      prisma.job.count({ where: { createdAt: { gte: startDate } } }),
      prisma.jobApplication.count(),
      prisma.job.aggregate({
        _sum: {
          viewCount: true
        }
      })
    ]);

    const stats = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        paused: pausedJobs,
        closed: closedJobs,
        newThisPeriod: newJobsCount
      },
      applications: {
        total: totalApplications,
        avgPerJob: totalJobs > 0 ? (totalApplications / totalJobs).toFixed(2) : 0
      },
      views: {
        total: totalViewCount._sum.viewCount || 0,
        avgPerJob: totalJobs > 0 ? ((totalViewCount._sum.viewCount || 0) / totalJobs).toFixed(2) : 0
      },
      timeRange
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取职位统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}; 
