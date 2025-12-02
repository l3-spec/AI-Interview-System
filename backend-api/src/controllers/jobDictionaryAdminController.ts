import { Request, Response } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
} from '../services/jobDictionaryService';

const parseBoolean = (value: any, defaultValue = false): boolean => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const parseNumber = (value: any, defaultValue: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

const handlePrismaError = (error: any, res: Response, entityName: string) => {
  if (error?.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: `${entityName}的编码或名称已存在`,
    });
  }
  if (error?.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: `${entityName}不存在`,
    });
  }
  console.error(`${entityName}操作失败:`, error);
  return res.status(500).json({
    success: false,
    message: '服务器错误',
    error: error?.message,
  });
};

export const listJobDictionaryCategories = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 20);
    const keyword = (req.query.keyword as string) || '';
    const includePositions = parseBoolean(req.query.includePositions, false);
    const includeInactive = parseBoolean(req.query.includeInactive, true);

    const result = await listCategories({
      page,
      pageSize,
      keyword,
      includePositions,
      includeInactive,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('获取职岗分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取职岗分类列表失败',
      error: error.message,
    });
  }
};

export const getJobDictionaryCategory = async (req: Request, res: Response) => {
  try {
    const includePositions = parseBoolean(req.query.includePositions, true);
    const category = await getCategory(req.params.id, includePositions);

    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    res.json({ success: true, data: category });
  } catch (error: any) {
    console.error('获取职岗分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取职岗分类详情失败',
      error: error.message,
    });
  }
};

export const createJobDictionaryCategory = async (req: Request, res: Response) => {
  try {
    const { code, name, description, sortOrder, isActive } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '请提供分类编码和名称' });
    }

    const category = await createCategory({
      code,
      name,
      description,
      sortOrder: sortOrder !== undefined ? parseNumber(sortOrder, 0) : undefined,
      isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: '分类创建成功',
    });
  } catch (error: any) {
    return handlePrismaError(error, res, '分类');
  }
};

export const updateJobDictionaryCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, sortOrder, isActive } = req.body;

    const category = await updateCategory(id, {
      code,
      name,
      description,
      sortOrder: sortOrder !== undefined ? parseNumber(sortOrder, 0) : undefined,
      isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
    });

    res.json({
      success: true,
      data: category,
      message: '分类更新成功',
    });
  } catch (error: any) {
    return handlePrismaError(error, res, '分类');
  }
};

export const deleteJobDictionaryCategory = async (req: Request, res: Response) => {
  try {
    await deleteCategory(req.params.id);
    res.json({ success: true, message: '分类已删除' });
  } catch (error: any) {
    return handlePrismaError(error, res, '分类');
  }
};

export const listJobDictionaryPositions = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 20);
    const keyword = (req.query.keyword as string) || '';
    const categoryId = (req.query.categoryId as string) || undefined;
    const includeInactive = parseBoolean(req.query.includeInactive, true);

    const result = await listPositions({
      page,
      pageSize,
      keyword,
      categoryId,
      includeInactive,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取职岗字典职位失败:', error);
    res.status(500).json({
      success: false,
      message: '获取职岗字典职位失败',
      error: error.message,
    });
  }
};

export const getJobDictionaryPosition = async (req: Request, res: Response) => {
  try {
    const position = await getPosition(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, message: '职岗不存在' });
    }
    res.json({ success: true, data: position });
  } catch (error: any) {
    console.error('获取职岗详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取职岗详情失败',
      error: error.message,
    });
  }
};

export const createJobDictionaryPosition = async (req: Request, res: Response) => {
  try {
    const { categoryId, code, name, description, sortOrder, isActive, tags } = req.body;

    if (!categoryId || !code || !name) {
      return res.status(400).json({ success: false, message: '请提供分类、编码和名称' });
    }

    const position = await createPosition({
      categoryId,
      code,
      name,
      description,
      sortOrder: sortOrder !== undefined ? parseNumber(sortOrder, 0) : undefined,
      isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
    });

    res.status(201).json({
      success: true,
      data: position,
      message: '职岗创建成功',
    });
  } catch (error: any) {
    return handlePrismaError(error, res, '职岗');
  }
};

export const updateJobDictionaryPosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, code, name, description, sortOrder, isActive, tags } = req.body;

    const position = await updatePosition(id, {
      categoryId,
      code,
      name,
      description,
      sortOrder: sortOrder !== undefined ? parseNumber(sortOrder, 0) : undefined,
      isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
    });

    res.json({
      success: true,
      data: position,
      message: '职岗更新成功',
    });
  } catch (error: any) {
    return handlePrismaError(error, res, '职岗');
  }
};

export const deleteJobDictionaryPosition = async (req: Request, res: Response) => {
  try {
    await deletePosition(req.params.id);
    res.json({ success: true, message: '职岗已删除' });
  } catch (error: any) {
    return handlePrismaError(error, res, '职岗');
  }
};
