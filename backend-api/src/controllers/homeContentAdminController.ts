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

const parseDate = (value: any) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

export const listHomeBanners = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 10);
    const keyword = (req.query.keyword as string) || '';
    const isActive = parseBoolean(req.query.isActive);

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { subtitle: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const take = Math.max(pageSize, 1);

    const [banners, total] = await Promise.all([
      prisma.homeBanner.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
      }),
      prisma.homeBanner.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: banners,
        total,
        page: Math.max(page, 1),
        pageSize: take,
      },
    });
  } catch (error: any) {
    console.error('获取首页Banner失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const createHomeBanner = async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      imageUrl,
      linkType,
      linkId,
      sortOrder = 0,
      isActive = true,
    } = req.body;

    const banner = await prisma.homeBanner.create({
      data: {
        title,
        subtitle,
        description: description ?? null,
        imageUrl,
        linkType: linkType ?? null,
        linkId: linkId ?? null,
        sortOrder: parseNumber(sortOrder, 0),
        isActive: Boolean(isActive),
      },
    });

    res.status(201).json({ success: true, data: banner, message: 'Banner 创建成功' });
  } catch (error: any) {
    console.error('创建首页Banner失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const updateHomeBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      imageUrl,
      linkType,
      linkId,
      sortOrder,
      isActive,
    } = req.body;

    const data: any = {};

    if (title !== undefined) data.title = title;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkType !== undefined) data.linkType = linkType || null;
    if (linkId !== undefined) data.linkId = linkId || null;
    if (sortOrder !== undefined) data.sortOrder = parseNumber(sortOrder, 0);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const banner = await prisma.homeBanner.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: banner, message: 'Banner 更新成功' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Banner 不存在' });
    }
    console.error('更新首页Banner失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const updateHomeBannerStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const banner = await prisma.homeBanner.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    res.json({ success: true, data: banner, message: '状态更新成功' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Banner 不存在' });
    }
    console.error('更新Banner状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const deleteHomeBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.homeBanner.delete({ where: { id } });

    res.json({ success: true, message: 'Banner 已删除' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Banner 不存在' });
    }
    console.error('删除Banner失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const reorderHomeBanners = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body as { orders: Array<{ id: string; sortOrder: number }> };

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: '排序数据不能为空' });
    }

    await prisma.$transaction(
      orders.map((item) =>
        prisma.homeBanner.update({
          where: { id: item.id },
          data: { sortOrder: parseNumber(item.sortOrder, 0) },
        })
      )
    );

    res.json({ success: true, message: '排序已更新' });
  } catch (error: any) {
    console.error('更新Banner排序失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const listPromotedJobsAdmin = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 10);
    const isActive = parseBoolean(req.query.isActive);
    const promotionType = (req.query.promotionType as string) || '';

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (promotionType) {
      where.promotionType = promotionType;
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const take = Math.max(pageSize, 1);

    const [promotions, total] = await Promise.all([
      prisma.promotedJob.findMany({
        where,
        orderBy: { priority: 'desc' },
        skip,
        take,
        include: {
          job: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
            },
          },
        },
      }),
      prisma.promotedJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: promotions,
        total,
        page: Math.max(page, 1),
        pageSize: take,
      },
    });
  } catch (error: any) {
    console.error('获取推广职位失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const createPromotedJob = async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      promotionType = 'NORMAL',
      displayFrequency = 10,
      priority = 0,
      startDate,
      endDate,
      isActive = true,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'jobId 为必填项' });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      return res.status(400).json({ success: false, message: '开始时间或结束时间无效' });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: '结束时间必须晚于开始时间' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: '关联的职位不存在' });
    }

    const promotion = await prisma.promotedJob.create({
      data: {
        jobId,
        promotionType,
        displayFrequency: parseNumber(displayFrequency, 10),
        priority: parseNumber(priority, 0),
        startDate: start,
        endDate: end,
        isActive: Boolean(isActive),
      },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: promotion, message: '推广职位创建成功' });
  } catch (error: any) {
    console.error('创建推广职位失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const updatePromotedJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      promotionType,
      displayFrequency,
      priority,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const data: any = {};

    if (promotionType !== undefined) data.promotionType = promotionType;
    if (displayFrequency !== undefined) data.displayFrequency = parseNumber(displayFrequency, 10);
    if (priority !== undefined) data.priority = parseNumber(priority, 0);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    if (startDate !== undefined) {
      const start = parseDate(startDate);
      if (!start) {
        return res.status(400).json({ success: false, message: '开始时间无效' });
      }
      data.startDate = start;
    }

    if (endDate !== undefined) {
      const end = parseDate(endDate);
      if (!end) {
        return res.status(400).json({ success: false, message: '结束时间无效' });
      }
      data.endDate = end;
    }

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      return res.status(400).json({ success: false, message: '结束时间必须晚于开始时间' });
    }

    if (data.startDate && !data.endDate) {
      const existing = await prisma.promotedJob.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: '推广职位不存在' });
      }
      if (existing.endDate && data.startDate >= existing.endDate) {
        return res.status(400).json({ success: false, message: '结束时间必须晚于开始时间' });
      }
    }

    if (data.endDate && !data.startDate) {
      const existing = await prisma.promotedJob.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: '推广职位不存在' });
      }
      if (existing.startDate && existing.startDate >= data.endDate) {
        return res.status(400).json({ success: false, message: '结束时间必须晚于开始时间' });
      }
    }

    const promotion = await prisma.promotedJob.update({
      where: { id },
      data,
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    res.json({ success: true, data: promotion, message: '推广职位更新成功' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: '推广职位不存在' });
    }
    console.error('更新推广职位失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const deletePromotedJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.promotedJob.delete({ where: { id } });
    res.json({ success: true, message: '推广职位已删除' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: '推广职位不存在' });
    }
    console.error('删除推广职位失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const listCompanyShowcases = async (req: Request, res: Response) => {
  try {
    const page = parseNumber(req.query.page, 1);
    const pageSize = parseNumber(req.query.pageSize, 10);

    const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
    const take = Math.max(pageSize, 1);

    const [records, total] = await Promise.all([
      prisma.companyShowcase.findMany({
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              tagline: true,
              focusArea: true,
              themeColors: true,
              highlights: true,
              industry: true,
              scale: true,
            }
          }
        }
      }),
      prisma.companyShowcase.count(),
    ]);

    const parseJsonArray = (value: string | null) => {
      if (!value) {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    };

    const formatted = records.map((item: any) => ({
      id: item.id,
      role: item.role,
      hiringCount: item.hiringCount,
      sortOrder: item.sortOrder,
      companyId: item.companyId,
      company: item.company
        ? {
            ...item.company,
            themeColors: parseJsonArray(item.company.themeColors),
            highlights: parseJsonArray(item.company.highlights),
          }
        : null,
    }));

    res.json({
      success: true,
      data: {
        list: formatted,
        total,
        page: Math.max(page, 1),
        pageSize: take,
      }
    });
  } catch (error: any) {
    console.error('获取精选企业失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const upsertCompanyShowcase = async (req: Request, res: Response) => {
  try {
    const { companyId, role, hiringCount = 0, sortOrder = 0 } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId 为必填项' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ success: false, message: '企业不存在' });
    }

    const showcase = await prisma.companyShowcase.upsert({
      where: { companyId },
      update: {
        role: role ?? null,
        hiringCount: parseNumber(hiringCount, 0),
        sortOrder: parseNumber(sortOrder, 0),
      },
      create: {
        companyId,
        role: role ?? null,
        hiringCount: parseNumber(hiringCount, 0),
        sortOrder: parseNumber(sortOrder, 0),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            tagline: true,
            focusArea: true,
            themeColors: true,
            highlights: true,
          }
        }
      }
    });

    res.json({ success: true, message: '精选企业已更新', data: showcase });
  } catch (error: any) {
    console.error('更新精选企业失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

export const deleteCompanyShowcase = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    await prisma.companyShowcase.delete({ where: { companyId } });

    res.json({ success: true, message: '已移除精选企业' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: '精选企业不存在' });
    }
    console.error('移除精选企业失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
