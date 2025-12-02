import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

interface InterviewTrendItem {
  createdAt: Date;
  _count: { id: number };
}

interface InterviewResultItem {
  status: string;
  _count: { id: number };
}

interface JobWithCounts {
  id: string;
  title: string;
  _count?: {
    applications: number;
    interviews: number;
  };
}

interface DateRangeWhere {
  createdAt?: {
    gte: Date;
    lte: Date;
  };
}

// 获取企业仪表板统计
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    // 获取基础统计数据
    const [
      totalJobs,
      activeJobs,
      totalInterviews,
      completedInterviews,
      totalCandidates,
      pendingApplications
    ] = await Promise.all([
      prisma.job.count({ where: { companyId } }),
      prisma.job.count({ where: { companyId, isPublished: true } }),
      prisma.interview.count({ where: { companyId } }),
      prisma.interview.count({ where: { companyId, status: 'COMPLETED' } }),
      prisma.candidate.count(),
      prisma.jobApplication.count({
        where: {
          job: { companyId },
          status: 'PENDING'
        }
      })
    ]);

    // 获取最近30天的面试趋势
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interviewTrend = await prisma.interview.groupBy({
      by: ['createdAt'],
      where: {
        companyId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    });

    // 按日期聚合面试数据
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const count = (interviewTrend as Array<{ createdAt: Date; _count: { id: number } }>)
        .filter((item: { createdAt: Date; _count: { id: number } }) => {
          const itemDate = item.createdAt.toISOString().split('T')[0];
          return itemDate === dateKey;
        })
        .reduce((sum: number, item: { _count: { id: number } }) => sum + item._count.id, 0);

      trendData.push({
        date: dateKey,
        count
      });
    }

    // 获取面试结果分布
    const interviewResults = await prisma.interview.groupBy({
      by: ['status'],
      where: { companyId },
      _count: {
        id: true
      }
    }) as Array<{ status: string; _count: { id: number } }>;

    res.json({
      success: true,
      data: {
        overview: {
          totalJobs,
          activeJobs,
          totalInterviews,
          completedInterviews,
          totalCandidates,
          pendingApplications
        },
        interviewTrend: trendData,
        interviewResults: interviewResults.map(result => ({
          status: result.status,
          count: result._count.id
        }))
      }
    });
  } catch (error) {
    console.error('获取仪表板统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取面试统计
export const getInterviewStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { startDate, endDate, jobId } = req.query;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    const where: DateRangeWhere & { companyId: string; jobId?: string } = { companyId };

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // 职岗筛选
    if (jobId) {
      where.jobId = jobId as string;
    }

    const [
      totalInterviews,
      statusDistribution,
      averageScore,
      passedInterviews
    ] = await Promise.all([
      prisma.interview.count({ where }),
      prisma.interview.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }) as Promise<Array<{ status: string; _count: { id: number } }>>,
      prisma.interviewReport.aggregate({
        where: {
          interview: where
        },
        _avg: {
          overallScore: true
        }
      }),
      prisma.interview.count({
        where: {
          ...where,
          report: {
            overallScore: { gte: 7.0 }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalInterviews,
        statusDistribution: statusDistribution.map((item: { status: string; _count: { id: number } }) => ({
          status: item.status,
          count: item._count.id
        })),
        averageScore: averageScore._avg.overallScore || 0,
        passedInterviews,
        passRate: totalInterviews > 0 ? (passedInterviews / totalInterviews * 100).toFixed(2) : '0'
      }
    });
  } catch (error) {
    console.error('获取面试统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取职岗统计
export const getJobStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    const where: { companyId: string } & DateRangeWhere = { companyId };

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      totalJobs,
      publishedJobs,
      topPerformingJobs
    ] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.count({ where: { ...where, isPublished: true } }),
      prisma.job.findMany({
        where,
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        totalJobs,
        publishedJobs,
        topPerformingJobs: topPerformingJobs.map((job: JobWithCounts) => ({
          id: job.id,
          title: job.title,
          applicationCount: job._count?.applications || 0,
          interviewCount: job._count?.interviews || 0
        }))
      }
    });
  } catch (error) {
    console.error('获取职岗统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取候选人统计
export const getCandidateStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: DateRangeWhere = {};

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      totalCandidates,
      interviewedCandidates
    ] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.count({
        where: {
          ...where,
          interviews: {
            some: {}
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCandidates,
        interviewedCandidates,
        interviewRate: totalCandidates > 0 ? (interviewedCandidates / totalCandidates * 100).toFixed(2) : '0'
      }
    });
  } catch (error) {
    console.error('获取候选人统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取面试官统计
export const getInterviewerStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    const where: any = { companyId };

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // 目前返回基础统计，后续可以扩展面试官相关功能
    const totalInterviews = await prisma.interview.count({ where });

    res.json({
      success: true,
      data: {
        totalInterviews,
        message: '面试官统计功能待完善'
      }
    });
  } catch (error) {
    console.error('获取面试官统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 