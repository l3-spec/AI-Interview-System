import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取企业信息
export const getCompanyProfile = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    
    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

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
        updatedAt: true
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

    const formattedCompany = {
      ...company,
      themeColors: parseJsonArray<string>(company.themeColors, []),
      highlights: parseJsonArray<string>(company.highlights, []),
      culture: parseJsonArray<string>(company.culture, []),
      locations: parseJsonArray<string>(company.locations, []),
      stats: parseStatsArray(company.stats),
    };

    res.json({
      success: true,
      data: formattedCompany
    });
  } catch (error) {
    console.error('获取企业信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 更新企业信息
export const updateCompanyProfile = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const updateData = req.body;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    // 验证数据
    const allowedFields = [
      'name',
      'description',
      'industry',
      'scale',
      'address',
      'website',
      'contact',
      'logo',
      'tagline',
      'focusArea',
      'themeColors',
      'stats',
      'highlights',
      'culture',
      'locations'
    ];
    const filteredData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (['themeColors', 'highlights', 'culture', 'locations'].includes(field)) {
          if (Array.isArray(updateData[field])) {
            filteredData[field] = JSON.stringify(updateData[field]);
          } else if (typeof updateData[field] === 'string') {
            filteredData[field] = updateData[field];
          } else {
            filteredData[field] = null;
          }
        } else if (field === 'stats') {
          if (Array.isArray(updateData[field])) {
            filteredData[field] = JSON.stringify(updateData[field]);
          } else if (typeof updateData[field] === 'string') {
            filteredData[field] = updateData[field];
          } else {
            filteredData[field] = null;
          }
        } else {
          filteredData[field] = updateData[field];
        }
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...filteredData,
        updatedAt: new Date()
      },
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
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: '企业信息更新成功',
      data: {
        ...updatedCompany,
        themeColors: filteredData.themeColors
          ? JSON.parse(filteredData.themeColors)
          : (updatedCompany.themeColors ? JSON.parse(updatedCompany.themeColors) : []),
        highlights: filteredData.highlights
          ? JSON.parse(filteredData.highlights)
          : (updatedCompany.highlights ? JSON.parse(updatedCompany.highlights) : []),
        culture: filteredData.culture
          ? JSON.parse(filteredData.culture)
          : (updatedCompany.culture ? JSON.parse(updatedCompany.culture) : []),
        locations: filteredData.locations
          ? JSON.parse(filteredData.locations)
          : (updatedCompany.locations ? JSON.parse(updatedCompany.locations) : []),
        stats: filteredData.stats
          ? JSON.parse(filteredData.stats)
          : (updatedCompany.stats ? JSON.parse(updatedCompany.stats) : []),
      }
    });
  } catch (error) {
    console.error('更新企业信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 上传企业logo
export const uploadCompanyLogo = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const file = req.file;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 构建logo URL
    const logoUrl = `/uploads/${file.filename}`;

    // 更新数据库中的logo字段
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { logo: logoUrl },
      select: {
        id: true,
        logo: true
      }
    });

    res.json({
      success: true,
      message: 'Logo上传成功',
      data: {
        logoUrl: logoUrl,
        company: updatedCompany
      }
    });
  } catch (error) {
    console.error('上传Logo失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取企业统计数据
export const getCompanyStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    // 获取各种统计数据
    const [
      totalJobs,
      activeJobs,
      totalInterviews,
      completedInterviews,
      pendingApplications
    ] = await Promise.all([
      // 总职岗数
      prisma.job.count({
        where: { companyId }
      }),
      // 活跃职岗数
      prisma.job.count({
        where: { 
          companyId,
          AND: [
            { status: 'ACTIVE' },
            { isPublished: true }
          ]
        }
      }),
      // 总面试数
      prisma.interview.count({
        where: { companyId }
      }),
      // 已完成面试数
      prisma.interview.count({
        where: { 
          companyId,
          status: 'COMPLETED'
        }
      }),
      // 待处理申请数
      prisma.jobApplication.count({
        where: {
          job: {
            companyId
          },
          status: 'PENDING'
        }
      })
    ]);

    // 获取最近7天的面试数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInterviews = await prisma.interview.findMany({
      where: {
        companyId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        score: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true
          }
        },
        report: {
          select: {
            overallScore: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 获取月度面试趋势数据（最近6个月）
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyInterviews = await prisma.interview.groupBy({
      by: ['createdAt'],
      where: {
        companyId,
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    // 按月份聚合数据
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const count = monthlyInterviews.filter(item => {
        const itemMonth = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, '0')}`;
        return itemMonth === monthKey;
      }).reduce((sum, item) => sum + item._count.id, 0);

      monthlyData.push({
        month: monthKey,
        count
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalJobs,
          activeJobs,
          totalInterviews,
          completedInterviews,
          pendingApplications
        },
        recentInterviews,
        monthlyTrend: monthlyData
      }
    });
  } catch (error) {
    console.error('获取企业统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 
