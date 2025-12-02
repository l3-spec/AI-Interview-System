import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// 获取用户列表
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { email: { contains: keyword as string } }
      ];
    }

    // 状态筛选
    if (status) {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          age: true,
          gender: true,
          education: true,
          experience: true,
          skills: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder
        },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    // 处理技能字段
    const processedUsers = users.map((user: any) => ({
      ...user,
      skills: user.skills ? JSON.parse(user.skills) : []
    }));

    res.json({
      success: true,
      data: processedUsers,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取用户详情
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        age: true,
        gender: true,
        education: true,
        experience: true,
        skills: true,
        resume: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 处理技能字段
    const processedUser = {
      ...user,
      skills: user.skills ? JSON.parse(user.skills) : []
    };

    res.json({
      success: true,
      data: processedUser
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 更新用户状态
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新用户状态
    const isActive = status === 'active';
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        isActive,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: `用户状态已更新为${status === 'active' ? '激活' : status === 'inactive' ? '停用' : '禁用'}`,
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 