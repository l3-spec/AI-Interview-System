import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// 获取候选人列表
export const getCandidates = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { 
      page = 1, 
      pageSize = 10, 
      keyword, 
      skills,
      experience,
      education,
      ageRange,
      isFavorite
    } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const where: any = {
      isActive: true
    };

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { email: { contains: keyword as string } }
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [candidates, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gender: true,
          age: true,
          education: true,
          experience: true,
          skills: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              interviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: candidates,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取候选人列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取候选人详情
export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // User 表无单独 resume 列，概况用 education / experience / skills
    const candidate = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        education: true,
        experience: true,
        skills: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            interviews: true
          }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: '候选人不存在' });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error('获取候选人详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取候选人面试记录
export const getCandidateInterviews = async (req: Request, res: Response) => {
  try {
    const { id: candidateId } = req.params;
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const interviews = await prisma.interview.findMany({
      where: { userId: candidateId, companyId },
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        },
        report: {
          select: {
            overallScore: true,
            summary: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: interviews });
  } catch (error) {
    console.error('获取候选人面试记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 邀请候选人面试
export const inviteCandidateInterview = async (req: Request, res: Response) => {
  try {
    const { id: candidateId } = req.params;
    const companyId = req.user?.id;
    const {
      jobId,
      type,
      scheduledAt,
      message,
      location,
      meetingUrl
    } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 验证职岗权限
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限操作' });
    }

    // 验证候选人存在
    const candidate = await prisma.user.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: '候选人不存在' });
    }

    // 创建面试
    const interview = await prisma.interview.create({
      data: {
        companyId,
        jobId,
        userId: candidateId,
        status: 'PENDING',
        startTime: new Date(scheduledAt),
        feedback: message
      },
      include: {
        job: {
          select: { title: true }
        },
        company: {
          select: { name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: '面试邀约发送成功',
      data: interview
    });
  } catch (error) {
    console.error('邀请候选人面试失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 更新候选人信息（企业视角的备注等）
export const updateCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.id;
    const updateData = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 这里可以实现企业对候选人的标记、备注等功能
    // 目前暂时返回成功响应
    res.json({ 
      success: true, 
      message: '候选人信息更新成功' 
    });
  } catch (error) {
    console.error('更新候选人信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 添加候选人备注
export const addCandidateNote = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;
    const companyId = req.user?.id;
    const { note } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 这里可以实现企业对候选人添加备注的功能
    // 目前暂时返回成功响应
    res.status(201).json({
      success: true,
      message: '备注添加成功',
      data: { note, createdAt: new Date() }
    });
  } catch (error) {
    console.error('添加候选人备注失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 收藏候选人
export const favoriteCandidate = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 这里可以实现企业收藏候选人的功能
    // 目前暂时返回成功响应
    res.json({
      success: true,
      message: '候选人收藏成功'
    });
  } catch (error) {
    console.error('收藏候选人失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 取消收藏候选人
export const unfavoriteCandidate = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;
    const companyId = req.user?.id;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 这里可以实现企业取消收藏候选人的功能
    // 目前暂时返回成功响应
    res.json({
      success: true,
      message: '取消收藏成功'
    });
  } catch (error) {
    console.error('取消收藏候选人失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取候选人的 AI 面试分析报告
 */
export const getCandidateAnalysisReport = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;

    // 查找该候选人已完成的 AI 面试会话及其分析报告
    const sessions = await prisma.aIInterviewSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        analysisReport: { isNot: null }
      },
      include: {
        analysisReport: true
      },
      orderBy: { completedAt: 'desc' },
      take: 5
    });

    if (!sessions.length) {
      return res.json({
        success: true,
        data: {
          hasReport: false,
          message: '该候选人暂无面试分析报告'
        }
      });
    }

    // 取最新的一份报告
    const latestSession = sessions[0];
    const report = latestSession.analysisReport!;

    // 构建返回数据
    const result = {
      hasReport: true,
      sessionId: latestSession.id,
      jobTarget: latestSession.jobTarget,
      completedAt: latestSession.completedAt,
      report: {
        overallScore: report.overallScore,
        newDimensionScores: {
          professionalAbilityScore: report.professionalAbilityScore ?? 0,
          learningGrowthScore: report.learningGrowthScore ?? 0,
          communicationCollaborationScore: report.communicationCollaborationScore ?? 0,
          problemSolvingScore: report.problemSolvingNewScore ?? 0,
          achievementExecutionScore: report.achievementExecutionScore ?? 0,
          stressResilienceScore: report.stressResilienceScore ?? 0,
        },
        competenciesDetailed: report.competenciesJson ? JSON.parse(report.competenciesJson) : [],
        strengths: report.strengths ? JSON.parse(report.strengths) : [],
        improvements: report.improvements ? JSON.parse(report.improvements) : [],
        tips: report.tips || '',
        multimodalScores: report.multimodalScoresJson ? JSON.parse(report.multimodalScoresJson) : null,
        jobMatch: report.jobMatchTitle ? {
          title: report.jobMatchTitle,
          description: report.jobMatchDescription,
          matchRatio: report.jobMatchRatio
        } : null,
        analysisStatus: report.analysisStatus,
        generatedAt: report.generatedAt
      },
      // 历史报告列表
      reportHistory: sessions.slice(1).map(s => ({
        sessionId: s.id,
        jobTarget: s.jobTarget,
        overallScore: s.analysisReport!.overallScore,
        completedAt: s.completedAt,
        analysisStatus: s.analysisReport!.analysisStatus
      }))
    };

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取候选人分析报告失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取分析报告失败：' + (error.message || '未知错误')
    });
  }
}; 