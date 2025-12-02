import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// 获取职岗列表
export const getJobs = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { 
      page = 1, 
      pageSize = 10, 
      status, 
      keyword, 
      department, 
      workType, 
      salaryRange,
      createdDateRange 
    } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const where: any = { companyId };

    // 状态筛选
    if (status && Array.isArray(status) && status.length > 0) {
      where.isPublished = status.includes('ACTIVE');
    }

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { description: { contains: keyword as string } },
        { requirements: { contains: keyword as string } }
      ];
    }

    // 日期范围筛选
    if (createdDateRange && Array.isArray(createdDateRange) && createdDateRange.length === 2) {
      where.createdAt = {
        gte: new Date(createdDateRange[0] as string),
        lte: new Date(createdDateRange[1] as string)
      };
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: { name: true, logo: true }
          },
          dictionaryPosition: {
            select: {
              id: true,
              code: true,
              name: true,
              category: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              applications: true,
              interviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.job.count({ where })
    ]);

    res.json({
      success: true,
      data: jobs,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取职岗列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建职岗
export const createJob = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const {
      title,
      description,
      requirements,
      responsibilities,
      salary,
      location,
      type = 'FULL_TIME',
      level = 'JUNIOR',
      skills,
      benefits,
      category,
      experience,
      education,
      highlights,
      badgeColor,
      isRemote = false,
      dictionaryPositionId
    } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 兼容salary为对象或字符串
    let salaryValue: string | null = null;
    if (typeof salary === 'object' && salary !== null) {
      const { min, max, currency } = salary;
      salaryValue = `${min || ''}${min ? 'K' : ''}-${max || ''}${max ? 'K' : ''}${currency ? ' ' + currency : ''}`;
    } else if (typeof salary === 'string') {
      salaryValue = salary;
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        requirements: Array.isArray(requirements) ? requirements.join('\n') : requirements,
        responsibilities: Array.isArray(responsibilities) ? responsibilities.join('\n') : responsibilities,
        salary: salaryValue,
        location,
        type,
        level,
        skills: Array.isArray(skills) ? JSON.stringify(skills) : skills,
        benefits: Array.isArray(benefits) ? benefits.join('\n') : benefits,
        category,
        experience,
        education,
        highlights: Array.isArray(highlights) ? JSON.stringify(highlights) : highlights,
        badgeColor,
        isRemote: Boolean(isRemote),
        companyId,
        dictionaryPositionId: dictionaryPositionId || null,
        isPublished: true // 默认发布
      },
      include: {
        company: {
          select: { name: true, logo: true }
        },
        dictionaryPosition: {
          select: {
            id: true,
            code: true,
            name: true,
            category: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: '职岗创建成功',
      data: job
    });
  } catch (error: any) {
    console.error('创建职岗失败:', error);
    if (error?.code === 'P2003') {
      return res.status(400).json({ success: false, message: '关联的职岗字典不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取职岗详情
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    const job = await prisma.job.findFirst({
      where: { id, companyId },
      include: {
        company: {
          select: { name: true, logo: true }
        },
        dictionaryPosition: {
          select: {
            id: true,
            code: true,
            name: true,
            category: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true,
            interviews: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('获取职岗详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 更新职岗
export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;
    const updateData = req.body;

    const allowedFields = [
      'title',
      'description',
      'requirements',
      'responsibilities',
      'salary',
      'location',
      'type',
      'level',
      'skills',
      'benefits',
      'category',
      'experience',
      'education',
      'highlights',
      'badgeColor',
      'isRemote',
      'status',
      'isPublished',
      'dictionaryPositionId'
    ];
    const filteredData: any = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'skills' && Array.isArray(updateData[field])) {
          filteredData[field] = JSON.stringify(updateData[field]);
        } else if ((field === 'requirements' || field === 'responsibilities' || field === 'benefits') && Array.isArray(updateData[field])) {
          filteredData[field] = updateData[field].join('\n');
        } else if (field === 'salary') {
          if (typeof updateData.salary === 'object' && updateData.salary !== null) {
            const { min, max, currency } = updateData.salary;
            filteredData.salary = `${min || ''}${min ? 'K' : ''}-${max || ''}${max ? 'K' : ''}${currency ? ' ' + currency : ''}`;
          } else if (typeof updateData.salary === 'string') {
            filteredData.salary = updateData.salary;
          }
        } else if (field === 'highlights') {
          if (Array.isArray(updateData[field])) {
            filteredData[field] = JSON.stringify(updateData[field]);
          } else if (typeof updateData[field] === 'string') {
            filteredData[field] = updateData[field];
          }
        } else if (field === 'isRemote' || field === 'isPublished') {
          filteredData[field] = Boolean(updateData[field]);
        } else if (field === 'status') {
          filteredData[field] = String(updateData[field] || '').toUpperCase();
        } else if (field === 'dictionaryPositionId') {
          filteredData[field] = updateData[field] || null;
        } else {
          filteredData[field] = updateData[field];
        }
      }
    }

    const job = await prisma.job.updateMany({
      where: { id, companyId },
      data: filteredData
    });

    if (job.count === 0) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限修改' });
    }

    res.json({ success: true, message: '职岗更新成功' });
  } catch (error: any) {
    console.error('更新职岗失败:', error);
    if (error?.code === 'P2003') {
      return res.status(400).json({ success: false, message: '关联的职岗字典不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 删除职岗
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    const result = await prisma.job.deleteMany({
      where: { id, companyId }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限删除' });
    }

    res.json({ success: true, message: '职岗删除成功' });
  } catch (error) {
    console.error('删除职岗失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 发布职岗
export const publishJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    const result = await prisma.job.updateMany({
      where: { id, companyId },
      data: { isPublished: true }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限操作' });
    }

    res.json({ success: true, message: '职岗发布成功' });
  } catch (error) {
    console.error('发布职岗失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 暂停职岗
export const pauseJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    const result = await prisma.job.updateMany({
      where: { id, companyId },
      data: { isPublished: false }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限操作' });
    }

    res.json({ success: true, message: '职岗暂停成功' });
  } catch (error) {
    console.error('暂停职岗失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 关闭职岗
export const closeJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    const result = await prisma.job.updateMany({
      where: { id, companyId },
      data: { isPublished: false }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限操作' });
    }

    res.json({ success: true, message: '职岗关闭成功' });
  } catch (error) {
    console.error('关闭职岗失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取职岗候选人
export const getJobCandidates = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const companyId = req.user?.id;
    const { page = 1, pageSize = 10 } = req.query;

    // 验证职岗权限
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限访问' });
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 获取已申请该职位的候选人
    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { jobId },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              resume: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.jobApplication.count({ where: { jobId } })
    ]);

    res.json({
      success: true,
      data: applications,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取职岗候选人失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取职岗面试记录
export const getJobInterviews = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const companyId = req.user?.id;
    const { page = 1, pageSize = 10 } = req.query;

    // 验证职岗权限
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限访问' });
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where: { jobId, companyId },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          report: {
            select: {
              overallScore: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.interview.count({ where: { jobId, companyId } })
    ]);

    res.json({
      success: true,
      data: interviews,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取职岗面试记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取职岗统计数据
export const getJobStats = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const companyId = req.user?.id;

    // 验证职岗权限
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限访问' });
    }

    const [
      totalApplications,
      totalInterviews,
      completedInterviews,
      passedInterviews
    ] = await Promise.all([
      prisma.jobApplication.count({ where: { jobId } }),
      prisma.interview.count({ where: { jobId } }),
      prisma.interview.count({ where: { jobId, status: 'COMPLETED' } }),
      prisma.interview.count({
        where: {
          jobId,
          report: {
            overallScore: { gte: 7.0 }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalApplications,
        totalInterviews,
        completedInterviews,
        passedInterviews,
        conversionRate: totalApplications > 0 ? (totalInterviews / totalApplications * 100).toFixed(2) : '0',
        passRate: completedInterviews > 0 ? (passedInterviews / completedInterviews * 100).toFixed(2) : '0'
      }
    });
  } catch (error) {
    console.error('获取职岗统计数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}; 
