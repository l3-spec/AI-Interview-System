import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const parseBoolean = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
};

const parseNumber = (value: any, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseJsonArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ==================== 测评分类管理 ====================

/**
 * 获取测评分类列表
 * GET /admin/assessments/categories
 */
export const listAssessmentCategories = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 20);
    const keyword = (req.query.keyword as string) || '';
    const isActive = parseBoolean(req.query.isActive);

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const take = Math.max(pageSize, 1);

    const [categories, total] = await Promise.all([
      prisma.assessmentCategory.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
        include: {
          _count: {
            select: {
              assessments: true,
            },
          },
        },
      }),
      prisma.assessmentCategory.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: categories,
        total,
        page: Math.max(page, 1),
        pageSize: take,
      },
    });
  } catch (error: any) {
    console.error('获取测评分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 获取所有活跃的测评分类（用于下拉选择）
 * GET /admin/assessments/categories/active
 */
export const getActiveAssessmentCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('获取活跃测评分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 创建测评分类
 * POST /admin/assessments/categories
 */
export const createAssessmentCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, sortOrder = 0, isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }

    const category = await prisma.assessmentCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: parseNumber(sortOrder, 0),
        isActive: parseBoolean(isActive) ?? true,
      },
    });

    res.json({
      success: true,
      data: category,
      message: '测评分类创建成功',
    });
  } catch (error: any) {
    console.error('创建测评分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 更新测评分类
 * PUT /admin/assessments/categories/:id
 */
export const updateAssessmentCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, sortOrder, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (sortOrder !== undefined) updateData.sortOrder = parseNumber(sortOrder, 0);
    if (isActive !== undefined) updateData.isActive = parseBoolean(isActive);

    const category = await prisma.assessmentCategory.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: category,
      message: '测评分类更新成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '测评分类不存在' });
    }
    console.error('更新测评分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 删除测评分类
 * DELETE /admin/assessments/categories/:id
 */
export const deleteAssessmentCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否有关联的测评
    const assessmentCount = await prisma.assessment.count({
      where: { categoryId: id },
    });

    if (assessmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下还有 ${assessmentCount} 个测评，无法删除`,
      });
    }

    await prisma.assessmentCategory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '测评分类删除成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '测评分类不存在' });
    }
    console.error('删除测评分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// ==================== 测评管理 ====================

/**
 * 获取测评列表
 * GET /admin/assessments
 */
export const listAssessments = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 20);
    const keyword = (req.query.keyword as string) || '';
    const categoryId = req.query.categoryId as string;
    const status = req.query.status as string;
    const difficulty = req.query.difficulty as string;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const take = Math.max(pageSize, 1);

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip,
        take,
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
              records: true,
            },
          },
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    // 解析 tags JSON 字符串
    const formattedAssessments = assessments.map((assessment: any) => ({
      ...assessment,
      tags: assessment.tags ? parseJsonArray(assessment.tags) : [],
      guidelines: assessment.guidelines ? parseJsonArray(assessment.guidelines) : [],
      questionCount: assessment._count.questions,
      recordCount: assessment._count.records,
    }));

    res.json({
      success: true,
      data: {
        list: formattedAssessments,
        total,
        page: Math.max(page, 1),
        pageSize: take,
      },
    });
  } catch (error: any) {
    console.error('获取测评列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 获取测评详情（包含题目）
 * GET /admin/assessments/:id
 */
export const getAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        category: true,
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: '测评不存在' });
    }

    // 解析 tags 和 options
    const formattedAssessment = {
      ...assessment,
      tags: assessment.tags ? parseJsonArray(assessment.tags) : [],
      guidelines: assessment.guidelines ? parseJsonArray(assessment.guidelines) : [],
      questions: assessment.questions.map((q: any) => {
        let parsedOptions: any[] = [];
        if (q.options) {
          try {
            parsedOptions = JSON.parse(q.options);
          } catch (err) {
            console.warn('解析题目选项失败，使用空数组回退', { questionId: q.id, err });
            parsedOptions = [];
          }
        }
        return {
          ...q,
          options: parsedOptions,
        };
      }),
    };

    res.json({
      success: true,
      data: formattedAssessment,
    });
  } catch (error: any) {
    console.error('获取测评详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 创建测评
 * POST /admin/assessments
 */
export const createAssessment = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      title,
      description,
      coverImage,
      durationMinutes = 15,
      difficulty = 'BEGINNER',
      tags = [],
      guidelines = [],
      status = 'DRAFT',
      isHot = false,
    } = req.body;

    if (!categoryId || !title?.trim()) {
      return res.status(400).json({ success: false, message: '分类ID和标题不能为空' });
    }

    const assessment = await prisma.assessment.create({
      data: {
        categoryId,
        title: title.trim(),
        description: description?.trim() || null,
        coverImage: coverImage?.trim() || null,
        durationMinutes: parseNumber(durationMinutes, 15),
        difficulty: difficulty || 'BEGINNER',
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
        guidelines: Array.isArray(guidelines) ? JSON.stringify(guidelines) : null,
        status: status || 'DRAFT',
        isHot: parseBoolean(isHot) ?? false,
      },
    });

    res.json({
      success: true,
      data: {
        ...assessment,
        tags: parseJsonArray(assessment.tags),
        guidelines: parseJsonArray(assessment.guidelines),
      },
      message: '测评创建成功',
    });
  } catch (error: any) {
    console.error('创建测评失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 更新测评
 * PUT /admin/assessments/:id
 */
export const updateAssessment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      title,
      description,
      coverImage,
      durationMinutes,
      difficulty,
      tags,
      guidelines,
      status,
      isHot,
    } = req.body;

    const updateData: any = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage?.trim() || null;
    if (durationMinutes !== undefined) updateData.durationMinutes = parseNumber(durationMinutes, 15);
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]);
    if (guidelines !== undefined) updateData.guidelines = Array.isArray(guidelines) ? JSON.stringify(guidelines) : null;
    if (status !== undefined) updateData.status = status;
    if (isHot !== undefined) updateData.isHot = parseBoolean(isHot);

    const assessment = await prisma.assessment.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        ...assessment,
        tags: parseJsonArray(assessment.tags),
        guidelines: parseJsonArray(assessment.guidelines),
      },
      message: '测评更新成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '测评不存在' });
    }
    console.error('更新测评失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 删除测评
 * DELETE /admin/assessments/:id
 */
export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.assessment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '测评删除成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '测评不存在' });
    }
    console.error('删除测评失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// ==================== 题目管理 ====================

/**
 * 创建题目
 * POST /admin/assessments/:assessmentId/questions
 */
export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const {
      questionText,
      questionType = 'SINGLE_CHOICE',
      options = [],
      correctAnswer,
      score = 0,
      sortOrder = 0,
    } = req.body;

    if (!questionText?.trim()) {
      return res.status(400).json({ success: false, message: '题目内容不能为空' });
    }

    // 验证测评是否存在
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: '测评不存在' });
    }

    const question = await prisma.assessmentQuestion.create({
      data: {
        assessmentId,
        questionText: questionText.trim(),
        questionType: questionType || 'SINGLE_CHOICE',
        options: Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null,
        correctAnswer: correctAnswer?.trim() || null,
        score: parseNumber(score, 0),
        sortOrder: parseNumber(sortOrder, 0),
      },
    });

    res.json({
      success: true,
      data: {
        ...question,
        options: question.options ? JSON.parse(question.options) : [],
      },
      message: '题目创建成功',
    });
  } catch (error: any) {
    console.error('创建题目失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 更新题目
 * PUT /admin/assessments/questions/:id
 */
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      score,
      sortOrder,
    } = req.body;

    const updateData: any = {};
    if (questionText !== undefined) updateData.questionText = questionText.trim();
    if (questionType !== undefined) updateData.questionType = questionType;
    if (options !== undefined) {
      updateData.options = Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null;
    }
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer?.trim() || null;
    if (score !== undefined) updateData.score = parseNumber(score, 0);
    if (sortOrder !== undefined) updateData.sortOrder = parseNumber(sortOrder, 0);

    const question = await prisma.assessmentQuestion.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        ...question,
        options: question.options ? JSON.parse(question.options) : [],
      },
      message: '题目更新成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    console.error('更新题目失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 删除题目
 * DELETE /admin/assessments/questions/:id
 */
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.assessmentQuestion.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '题目删除成功',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    console.error('删除题目失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

/**
 * 批量更新题目排序
 * POST /admin/assessments/:assessmentId/questions/reorder
 */
export const reorderQuestions = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { orders } = req.body; // [{ id: string, sortOrder: number }]

    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: '排序数据格式错误' });
    }

    // 批量更新排序
    await Promise.all(
      orders.map((order) =>
        prisma.assessmentQuestion.update({
          where: { id: order.id },
          data: { sortOrder: parseNumber(order.sortOrder, 0) },
        })
      )
    );

    res.json({
      success: true,
      message: '题目排序更新成功',
    });
  } catch (error: any) {
    console.error('更新题目排序失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
