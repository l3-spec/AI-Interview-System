import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * 获取公开职位列表（不需要认证）
 */
export const getPublicJobs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      location,
      type,
      level,
      dictionaryPositionIds,
    } = req.query;

    const where: Prisma.JobWhereInput = {
      isPublished: true, // 只显示已发布的职位
    };

    const parseQueryString = (value: unknown): string => {
      if (Array.isArray(value)) {
        return value
          .map((item) => (typeof item === 'string' ? item : String(item)))
          .join(' ')
          .trim();
      }
      if (typeof value === 'string') {
        return value.trim();
      }
      if (value == null) {
        return '';
      }
      return String(value).trim();
    };

    // 关键词搜索
    const keywordValue = parseQueryString(keyword);
    if (keywordValue.length > 0) {
      const keywordConditions: Prisma.JobWhereInput[] = [
        { title: { contains: keywordValue } },
        { description: { contains: keywordValue } },
        { requirements: { contains: keywordValue } },
        {
          company: {
            is: {
              name: { contains: keywordValue },
            },
          },
        },
        {
          dictionaryPosition: {
            is: {
              name: { contains: keywordValue },
            },
          },
        },
        {
          dictionaryPosition: {
            is: {
              code: { contains: keywordValue },
            },
          },
        },
      ];
      where.OR = keywordConditions;
    }

    // 地点筛选
    const locationValue = parseQueryString(location);
    if (locationValue.length > 0) {
      where.location = { contains: locationValue };
    }

    // 工作类型筛选
    const typeValue = parseQueryString(type);
    if (typeValue.length > 0) {
      where.type = typeValue;
    }

    // 级别筛选
    const levelValue = parseQueryString(level);
    if (levelValue.length > 0) {
      where.level = levelValue;
    }

    const positionFilter = parsePositionIds(dictionaryPositionIds);

    let forceEmptyResult = false;
    if (positionFilter.length > 0) {
      const positionRecords = (await prisma.jobDictionaryPosition.findMany({
        where: { id: { in: positionFilter } },
        select: {
          id: true,
          name: true,
          code: true,
          tags: true,
        },
      })) as PositionRecord[];

      if (positionRecords.length === 0) {
        forceEmptyResult = true;
      } else {
        const validIds = positionRecords.map((record) => record.id);
        const searchTerms = collectPositionSearchTerms(positionRecords);
        const orConditions: Prisma.JobWhereInput[] = [];

        if (validIds.length > 0) {
          orConditions.push({ dictionaryPositionId: { in: validIds } });
        }

        searchTerms.forEach((term) => {
          orConditions.push({ title: { contains: term } });
          orConditions.push({ description: { contains: term } });
          orConditions.push({ requirements: { contains: term } });
          orConditions.push({ category: { contains: term } });
          orConditions.push({ skills: { contains: term } });
        });

        if (orConditions.length === 0) {
          forceEmptyResult = true;
        } else {
          const existingAnd = Array.isArray(where.AND)
            ? [...where.AND]
            : where.AND
              ? [where.AND]
              : [];
          existingAnd.push({ OR: orConditions });
          where.AND = existingAnd;
        }
      }
    }

    if (forceEmptyResult) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: { 
              id: true,
              name: true,
              logo: true,
              tagline: true,
              themeColors: true,
              locations: true,
              website: true,
              industry: true,
              scale: true,
              isVerified: true 
            }
          },
          dictionaryPosition: {
            select: {
              id: true,
              code: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
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

    const formattedJobs = jobs.map((job: JobWithRelations) => formatJobSummary(job));

    res.json({
      success: true,
      data: formattedJobs,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    console.error('获取公开职位列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取公开职位详情（不需要认证）
 */
export const getPublicJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { 
        id, 
        isPublished: true // 只显示已发布的职位
      },
      include: {
        company: {
          select: { 
            id: true,
            name: true,
            logo: true,
            description: true,
            industry: true,
            scale: true,
            tagline: true,
            themeColors: true,
            locations: true,
            website: true,
            focusArea: true,
            contact: true,
            isVerified: true,
          },
        },
        dictionaryPosition: {
          select: {
            id: true,
            code: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            interviews: true
          }
        },
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职位不存在或已下线' });
    }

    const formatted = formatJobDetail(job);

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('获取公开职位详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 申请职位（需要用户认证）
 */
export const applyForJob = async (req: Request, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    // 检查职位是否存在且已发布
    const job = await prisma.job.findFirst({
      where: { id: jobId, isPublished: true }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职位不存在或已下线' });
    }

    // 检查是否已经申请过
    const existingApplication = await prisma.jobApplication.findFirst({
      where: { userId, jobId }
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: '您已经申请过这个职位了' });
    }

    // 创建申请记录
    const application = await prisma.jobApplication.create({
      data: {
        userId,
        jobId,
        message: typeof message === 'string' ? message : '',
        status: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: '申请提交成功',
      data: application
    });
  } catch (error) {
    console.error('申请职位失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}; 

/**
 * 获取岗位分区列表（用于首页/岗位页展示）
 */
export const getPublicJobSections = async (_req: Request, res: Response) => {
  try {
    const sections = await prisma.jobSection.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            job: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    logo: true,
                    tagline: true,
                    themeColors: true,
                    locations: true,
                    website: true,
                    industry: true,
                    scale: true,
                  },
                },
                dictionaryPosition: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const formatted = sections
      .map((section: any) => {
        const jobs = section.items
          .map((item: any) => item.job as JobWithRelations | null)
          .filter((job: JobWithRelations | null): job is JobWithRelations => {
            if (!job) {
              return false;
            }
            return job.isPublished && job.status === 'ACTIVE';
          })
          .map((job: JobWithRelations) => formatJobSummary(job));

        return {
          id: section.id,
          title: section.title,
          subtitle: section.subtitle ?? '',
          jobs,
        };
      })
      .filter((section: any) => section.jobs.length > 0);

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('获取岗位分区失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取精选企业展示
 */
export const getPublicCompanyShowcases = async (_req: Request, res: Response) => {
  try {
    const showcases = await prisma.companyShowcase.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            tagline: true,
            themeColors: true,
            stats: true,
            highlights: true,
            culture: true,
            locations: true,
            focusArea: true,
            isActive: true,
          },
        },
      },
    });

    const data = showcases
      .map((showcase: any) => {
        if (!showcase.company || !showcase.company.isActive) {
          return null;
        }

        return {
          companyId: showcase.company.id,
          name: showcase.company.name,
          role: showcase.role ?? '',
          hiringCount: showcase.hiringCount,
          gradient: parseGradient(showcase.company.themeColors),
          tagline: showcase.company.tagline ?? '',
          logo: showcase.company.logo,
          focusArea: showcase.company.focusArea ?? '',
          stats: parseJsonArray<CompanyStatPayload[]>(showcase.company.stats, [] as CompanyStatPayload[]),
          highlights: parseJsonArray<string[]>(showcase.company.highlights, [] as string[]),
          culture: parseJsonArray<string[]>(showcase.company.culture, [] as string[]),
          locations: parseJsonArray<string[]>(showcase.company.locations, [] as string[]),
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取精选企业失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取企业详情（公开）
 */
export const getPublicCompanyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        tagline: true,
        description: true,
        industry: true,
        scale: true,
        focusArea: true,
        website: true,
        contact: true,
        locations: true,
        themeColors: true,
        stats: true,
        highlights: true,
        culture: true,
        isVerified: true,
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: '企业不存在或已下线' });
    }

    const [openRoles, showcase] = await Promise.all([
      prisma.job.findMany({
        where: {
          companyId: id,
          isPublished: true,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 12,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              tagline: true,
              themeColors: true,
              locations: true,
              website: true,
              industry: true,
              scale: true,
            },
          },
          dictionaryPosition: {
            select: {
              id: true,
              code: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.companyShowcase.findUnique({
        where: {
          companyId: id,
        },
        select: {
          role: true,
          hiringCount: true,
        },
      }),
    ]);

    const data = formatCompanyProfile(company, openRoles as JobWithRelations[], showcase ?? null);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取企业详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 首页内容聚合（横幅、评测、帖子、专家）
 * 先返回静态示例数据，后续可接入数据库表
 */
export const getHomeFeed = async (_req: Request, res: Response) => {
  try {
    const banners = [
      {
        title: '如何在AI时代提升职场竞争力',
        subtitle: '最受欢迎的帖子',
        description: '探索人工智能时代下的职业发展新趋势',
        imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600'
      },
      {
        title: '产品经理能力评测',
        subtitle: '热门测试',
        description: '全面评估您的产品思维和管理能力',
        imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600'
      },
      {
        title: '字节跳动',
        subtitle: '最受关注企业',
        description: '了解字节跳动的招聘要求和企业文化',
        imageUrl: 'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=1600'
      }
    ];

    const assessments = [
      { title: '前端开发工程师能力评测', participants: '12.5k', rating: 4.8, duration: '45分钟', tags: ['JavaScript', 'React', 'Vue'], difficulty: '中级' },
      { title: '数据分析师综合评估', participants: '8.3k', rating: 4.9, duration: '60分钟', tags: ['Python', 'SQL', '数据可视化'], difficulty: '高级' },
      { title: 'UI/UX设计师作品集评测', participants: '6.7k', rating: 4.7, duration: '30分钟', tags: ['Figma', '用户体验', '视觉设计'], difficulty: '中级' }
    ];

    const posts = [
      { title: '2024年互联网大厂面试真题汇总', author: '职场导师小王', views: '25.6k', likes: '1.2k', comments: '456', time: '2小时前', tags: ['面试技巧', '大厂'], imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', aspect: 1.2 },
      { title: '从0到1：产品经理成长路径详解', author: '产品老司机', views: '18.9k', likes: '890', comments: '234', time: '5小时前', tags: ['产品经理', '职业规划'], imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', aspect: 0.85 },
      { title: 'AI时代下的职业转型指南', author: '未来职场', views: '32.1k', likes: '2.1k', comments: '678', time: '1天前', tags: ['AI', '职业转型'], imageUrl: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800', aspect: 1.4 }
    ];

    const experts = [
      { name: '张三丰', title: '前阿里巴巴技术总监', topic: '如何在技术面试中脱颖而出', followers: '15.6k', company: '阿里巴巴' },
      { name: '李小龙', title: '腾讯产品VP', topic: '产品思维的培养与实践', followers: '23.4k', company: '腾讯' },
      { name: '王大锤', title: '字节跳动设计总监', topic: '设计师的职业发展路径', followers: '18.9k', company: '字节跳动' }
    ];

    res.json({ success: true, data: { banners, assessments, posts, experts } });
  } catch (error) {
    console.error('获取首页内容失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

type JobWithRelations = Record<string, any>;

type CompanySummary = Record<string, any>;

type CompanyShowcaseSummary = Record<string, any> | null;

type CompanyStatPayload = {
  label: string;
  value: string;
  accent?: string;
};

const DEFAULT_BADGE_COLOR = '#FF8C42';
const DEFAULT_GRADIENT = ['#FF8C42', '#FFB865'];

function parsePositionIds(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const raw: string[] = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  raw.forEach((item) => {
    const trimmed = item.trim();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  });

  return normalized;
}

type PositionRecord = {
  id: string;
  name: string | null;
  code: string | null;
  tags: Prisma.JsonValue | null;
};

function collectPositionSearchTerms(positions: PositionRecord[]): string[] {
  const terms = new Set<string>();

  const addTerm = (value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    terms.add(normalized);
    if (normalized.endsWith('工程师')) {
      const shortened = normalized.slice(0, -3).trim();
      if (shortened.length > 0) {
        terms.add(shortened);
      }
    }
  };

  const extractTags = (value: Prisma.JsonValue | null | undefined): string[] => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
    }
    return [];
  };

  positions.forEach((position) => {
    addTerm(position.name);
    extractTags(position.tags).forEach((tag) => addTerm(tag));
  });

  return Array.from(terms);
}

function parseJsonArray<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return fallback;
  }
}

function splitMultiline(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function ensureBadgeColor(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : DEFAULT_BADGE_COLOR;
}

function parseGradient(value: string | null | undefined): string[] {
  const parsed = parseJsonArray<string[]>(value, DEFAULT_GRADIENT);
  return parsed.length > 0 ? parsed : DEFAULT_GRADIENT;
}

function formatJobSummary(job: JobWithRelations) {
  return {
    id: job.id,
    title: job.title,
    companyId: job.companyId,
    companyName: job.company?.name ?? '',
    companyLogo: job.company?.logo ?? null,
    companyTagline: job.company?.tagline ?? '',
    badgeColor: ensureBadgeColor(job.badgeColor),
    location: job.location ?? '',
    salary: job.salary ?? '',
    experience: job.experience ?? '',
    education: job.education ?? '',
    type: job.type ?? null,
    level: job.level ?? null,
    isRemote: job.isRemote,
    tags: parseJsonArray<string[]>(job.skills, [] as string[]),
    category: job.category ?? null,
    dictionaryPositionId: job.dictionaryPosition?.id ?? null,
    dictionaryPositionCode: job.dictionaryPosition?.code ?? '',
    dictionaryPositionName: job.dictionaryPosition?.name ?? '',
    dictionaryCategoryId: job.dictionaryPosition?.category?.id ?? null,
    dictionaryCategoryName: job.dictionaryPosition?.category?.name ?? null,
    postedAt: job.createdAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    applicationCount: job._count?.applications ?? 0,
    interviewCount: job._count?.interviews ?? 0,
  };
}

function formatJobDetail(job: JobWithRelations) {
  const summary = formatJobSummary(job);
  return {
    ...summary,
    description: job.description ?? '',
    responsibilities: splitMultiline(job.responsibilities),
    requirements: splitMultiline(job.requirements),
    highlights: parseJsonArray<string[]>(job.highlights, [] as string[]),
    perks: splitMultiline(job.benefits),
    type: job.type,
    level: job.level,
    company: job.company
      ? {
          id: job.company.id,
          name: job.company.name,
          logo: job.company.logo,
          tagline: job.company.tagline ?? '',
          themeColors: parseGradient(job.company.themeColors),
          locations: parseJsonArray<string[]>(job.company.locations, [] as string[]),
          website: job.company.website ?? '',
          industry: job.company.industry ?? '',
          scale: job.company.scale ?? '',
        }
      : null,
  };
}

function formatCompanyProfile(
  company: CompanySummary,
  openRoles: JobWithRelations[],
  showcase: CompanyShowcaseSummary,
) {
  return {
    id: company.id,
    name: company.name,
    logo: company.logo,
    tagline: company.tagline ?? '',
    description: company.description ?? '',
    industry: company.industry ?? '',
    scale: company.scale ?? '',
    focusArea: company.focusArea ?? '',
    website: company.website ?? '',
    contact: company.contact ?? '',
    gradient: parseGradient(company.themeColors),
    stats: parseJsonArray<CompanyStatPayload[]>(company.stats, [] as CompanyStatPayload[]),
    highlights: parseJsonArray<string[]>(company.highlights, [] as string[]),
    culture: parseJsonArray<string[]>(company.culture, [] as string[]),
    locations: parseJsonArray<string[]>(company.locations, [] as string[]),
    isVerified: company.isVerified,
    showcase: showcase
      ? {
          role: showcase.role ?? '',
          hiringCount: showcase.hiringCount,
        }
      : null,
    openRoles: openRoles.map((job: JobWithRelations) => formatJobSummary(job)),
  };
}
