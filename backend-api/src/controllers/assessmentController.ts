import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取测评分类列表
 * GET /api/assessments/categories
 */
export const getAssessmentCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        assessments: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            coverImage: true,
            participantCount: true,
            rating: true,
          },
          take: 3, // 每个分类只返回前3个
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('获取测评分类失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取指定分类下的测评列表
 * GET /api/assessments/categories/:categoryId/assessments
 */
export const getAssessmentsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where: {
          categoryId,
          status: 'PUBLISHED',
        },
        skip,
        take,
        orderBy: [
          { isHot: 'desc' },
          { participantCount: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      }),
      prisma.assessment.count({
        where: {
          categoryId,
          status: 'PUBLISHED',
        },
      }),
    ]);

    // 解析 tags JSON 字符串
    const formattedAssessments = assessments.map((assessment) => ({
      ...assessment,
      tags: assessment.tags ? JSON.parse(assessment.tags) : [],
      questionCount: assessment._count.questions,
    }));

    res.json({
      success: true,
      data: {
        list: formattedAssessments,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取测评列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取测评详情（包括题目）
 * GET /api/assessments/:id
 */
export const getAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: '测评不存在',
      });
    }

    // 解析 JSON 字符串
    const formattedAssessment = {
      ...assessment,
      tags: assessment.tags ? JSON.parse(assessment.tags) : [],
      questions: assessment.questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : [],
      })),
    };

    res.json({
      success: true,
      data: formattedAssessment,
    });
  } catch (error: any) {
    console.error('获取测评详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 提交测评答案
 * POST /api/assessments/:id/submit
 */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const { id: assessmentId } = req.params;
    const { userId, answers, duration } = req.body;

    // 验证测评是否存在
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: '测评不存在',
      });
    }

    // 计算总分
    let totalScore = 0;
    const processedAnswers = answers.map((answer: any) => {
      const question = assessment.questions.find((q) => q.id === answer.questionId);
      if (question) {
        const options = question.options ? JSON.parse(question.options) : [];
        const selectedOptions = options.filter((opt: any) =>
          answer.answer.includes(opt.label)
        );
        const score = selectedOptions.reduce((sum: number, opt: any) => sum + (opt.score || 0), 0);
        totalScore += score;
        return {
          ...answer,
          score,
        };
      }
      return answer;
    });

    // 判断结果等级
    const maxScore = assessment.questions.reduce((sum, q) => sum + q.score, 0);
    const percentage = (totalScore / maxScore) * 100;
    let resultLevel = '不及格';
    if (percentage >= 90) resultLevel = '优秀';
    else if (percentage >= 75) resultLevel = '良好';
    else if (percentage >= 60) resultLevel = '及格';

    // 保存测评记录
    const record = await prisma.userAssessmentRecord.create({
      data: {
        userId,
        assessmentId,
        answers: JSON.stringify(processedAnswers),
        totalScore,
        resultLevel,
        duration,
        completedAt: new Date(),
      },
    });

    // 更新测评参与人数
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      data: {
        recordId: record.id,
        totalScore,
        resultLevel,
        maxScore,
        percentage: Math.round(percentage),
      },
      message: '测评提交成功',
    });
  } catch (error: any) {
    console.error('提交测评失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取用户的测评记录
 * GET /api/assessments/records/user/:userId
 */
export const getUserAssessmentRecords = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [records, total] = await Promise.all([
      prisma.userAssessmentRecord.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { startedAt: 'desc' },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              coverImage: true,
              durationMinutes: true,
              difficulty: true,
            },
          },
        },
      }),
      prisma.userAssessmentRecord.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        list: records,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取用户测评记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取测评结果详情
 * GET /api/assessments/records/:recordId
 */
export const getAssessmentRecordDetail = async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.userAssessmentRecord.findUnique({
      where: { id: recordId },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '测评记录不存在',
      });
    }

    // 解析答案
    const answers = JSON.parse(record.answers);

    res.json({
      success: true,
      data: {
        ...record,
        answers,
      },
    });
  } catch (error: any) {
    console.error('获取测评记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

