import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const parseStringArray = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const allowedStatuses = ['PUBLISHED', 'DRAFT', 'HIDDEN', 'DELETED', 'PENDING', 'REJECTED', 'BANNED'];
const parseTagsInput = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((t) => `${t}`.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => `${t}`.trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseImagesInput = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => `${v}`.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => `${v}`.trim()).filter(Boolean);
    } catch {
      return value
        .split(/[,，\s]+/)
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export const listUserPostsAdmin = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      isHot,
      keyword,
      userId,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const sizeNum = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = (pageNum - 1) * sizeNum;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }
    if (typeof isHot === 'string') {
      where.isHot = isHot === 'true';
    }
    if (typeof keyword === 'string' && keyword.trim()) {
      where.OR = [
        { title: { contains: keyword.trim() } },
        { content: { contains: keyword.trim() } },
      ];
    }
    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    const [posts, total] = await Promise.all([
      prisma.userPost.findMany({
        where,
        skip,
        take: sizeNum,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.userPost.count({ where }),
    ]);

    const list = posts.map((post: any) => ({
      ...post,
      tags: parseStringArray(post.tags),
      images: parseStringArray(post.images),
    }));

    res.json({
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: sizeNum,
      },
    });
  } catch (error) {
    console.error('listUserPostsAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

export const getUserPostAdmin = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    res.json({
      success: true,
      data: {
        ...post,
        tags: parseStringArray(post.tags),
        images: parseStringArray(post.images),
      },
    });
  } catch (error) {
    console.error('getUserPostAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

export const updateUserPostStatusAdmin = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { status, banUser } = req.body;

    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const data: any = {};
    if (status && allowedStatuses.includes(String(status).toUpperCase())) {
      data.status = String(status).toUpperCase();
    }

    await prisma.userPost.update({
      where: { id: postId },
      data,
    });

    let bannedUser = false;
    if (banUser && post.userId) {
      await prisma.user.update({
        where: { id: post.userId },
        data: { isActive: false },
      });
      bannedUser = true;
    }

    res.json({
      success: true,
      message: '状态已更新',
      data: {
        postId,
        status: data.status,
        bannedUser,
      },
    });
  } catch (error) {
    console.error('updateUserPostStatusAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

export const updateUserPostHotAdmin = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { isHot } = req.body;

    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const updated = await prisma.userPost.update({
      where: { id: postId },
      data: { isHot: Boolean(isHot) },
    });

    res.json({ success: true, data: updated, message: '热点状态已更新' });
  } catch (error) {
    console.error('updateUserPostHotAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

export const deleteUserPostAdmin = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    await prisma.userPost.update({
      where: { id: postId },
      data: {
        status: 'DELETED',
        isHot: false,
      },
    });

    res.json({ success: true, message: '帖子已下架' });
  } catch (error) {
    console.error('deleteUserPostAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

export const updateUserPostAdmin = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { title, content, coverImage, images, tags, status, isHot } = req.body;

    const post = await prisma.userPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const updateData: any = {};
    if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
    if (typeof content === 'string' && content.trim()) updateData.content = content.trim();
    if (typeof coverImage === 'string') updateData.coverImage = coverImage.trim() || null;
    const parsedImages = parseImagesInput(images);
    if (parsedImages.length) {
      updateData.images = JSON.stringify(parsedImages);
    } else if (images === null) {
      updateData.images = null;
    }
    const parsedTags = parseTagsInput(tags);
    if (parsedTags.length) {
      updateData.tags = JSON.stringify(parsedTags);
    } else if (tags === null) {
      updateData.tags = null;
    }
    if (status && allowedStatuses.includes(String(status).toUpperCase())) {
      updateData.status = String(status).toUpperCase();
    }
    if (isHot !== undefined) updateData.isHot = Boolean(isHot);

    const updated = await prisma.userPost.update({
      where: { id: postId },
      data: updateData,
    });

    res.json({ success: true, data: updated, message: '帖子已更新' });
  } catch (error) {
    console.error('updateUserPostAdmin error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
