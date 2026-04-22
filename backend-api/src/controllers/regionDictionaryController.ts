import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * 地区字典控制器
 */
export const getRegionTree = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const regions = await prisma.regionDictionary.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    // 将扁平数组转换为树形结构
    const buildTree = (parentId: string | null = null): any[] => {
      return (regions as any[])
        .filter((r: any) => r.parentId === parentId)
        .map((r: any) => ({
          ...r,
          children: buildTree(r.id)
        }));
    };

    const tree = buildTree(null);

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('获取地区显示树失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 获取子地区列表
 */
export const getSubRegions = async (req: Request, res: Response) => {
  try {
    const { parentId } = req.query;
    
    const regions = await prisma.regionDictionary.findMany({
      where: {
        parentId: parentId ? (parentId as string) : null,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('获取子地区列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 后台管理相关的接口
export const adminGetRegions = async (req: Request, res: Response) => {
    try {
      const { parentId, level } = req.query;
      const where: any = {};
      if (parentId !== undefined) where.parentId = parentId === 'null' ? null : parentId;
      if (level !== undefined) where.level = Number(level);
  
      const regions = await prisma.regionDictionary.findMany({
        where,
        orderBy: { sortOrder: 'asc' }
      });
  
      res.json({
        success: true,
        data: regions
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取地区列表失败' });
    }
  };
  
  export const adminCreateRegion = async (req: Request, res: Response) => {
    try {
      const { name, code, level, parentId, sortOrder, isActive } = req.body;
      const region = await prisma.regionDictionary.create({
        data: { name, code, level, parentId, sortOrder, isActive }
      });
      res.json({ success: true, data: region });
    } catch (error) {
      res.status(500).json({ success: false, message: '创建地区失败' });
    }
  };
  
  export const adminUpdateRegion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, code, level, parentId, sortOrder, isActive } = req.body;
      const region = await prisma.regionDictionary.update({
        where: { id },
        data: { name, code, level, parentId, sortOrder, isActive }
      });
      res.json({ success: true, data: region });
    } catch (error) {
      res.status(500).json({ success: false, message: '更新地区失败' });
    }
  };
  
  export const adminDeleteRegion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.regionDictionary.delete({ where: { id } });
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      res.status(500).json({ success: false, message: '删除失败' });
    }
  };
