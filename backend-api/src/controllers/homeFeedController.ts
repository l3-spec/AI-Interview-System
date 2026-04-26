import { Request, Response } from 'express';
import { toMediaUrl } from '../utils/ossUtils';
import { prisma } from '../lib/prisma';
import { withRetry } from '../utils/prismaUtils';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 30;
const EXTRA_FETCH_BUFFER = 6;
const HOME_FEED_WEIGHTS = {
  HOT_POST: 0.5,
  HOT_COMPANY: 0.2,
  HOT_JOB: 0.3,
} as const;

enum HomeFeedType {
  HOT_POST = 'hot_post',
  HOT_COMPANY = 'hot_company',
  HOT_JOB = 'hot_job',
}

enum HomeFeedTargetType {
  POST = 'post',
  COMPANY = 'company',
  JOB = 'job',
}

type HomeFeedCard = {
  id: string;
  type: HomeFeedType;
  targetType: HomeFeedTargetType;
  targetId: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  tags: string[];
  authorName: string;
  authorAvatar: string | null;
  badge: string;
  metricLabel: string;
  metricValue: string;
  createdAt: Date | null;
};

/**
 * 首页内容聚合接口（帖子 / 企业 / 职岗 混排）
 * GET /api/home/feed
 */
export const getHomeFeed = async (req: Request, res: Response) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );

    const desiredCounts = computeFeedCounts(pageSizeNum);

    const [postFeed, companyFeed, jobFeed] = await withRetry(() => 
      Promise.all([
        getHotPostFeed(pageNum, desiredCounts[HomeFeedType.HOT_POST]),
        getHotCompanyFeed(pageNum, desiredCounts[HomeFeedType.HOT_COMPANY]),
        getHotJobFeed(pageNum, desiredCounts[HomeFeedType.HOT_JOB]),
      ])
    );

    const mixedContent = mixHomeFeed({
      [HomeFeedType.HOT_POST]: postFeed.items,
      [HomeFeedType.HOT_COMPANY]: companyFeed.items,
      [HomeFeedType.HOT_JOB]: jobFeed.items,
    }, pageSizeNum);

    const total = postFeed.total + companyFeed.total + jobFeed.total;
    const hasMore = postFeed.hasMore || companyFeed.hasMore || jobFeed.hasMore;

    res.json({
      success: true,
      data: {
        list: mixedContent,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('获取首页内容失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

function computeFeedCounts(pageSize: number) {
  const postCount = Math.max(1, Math.round(pageSize * HOME_FEED_WEIGHTS.HOT_POST));
  const companyCount = Math.max(1, Math.round(pageSize * HOME_FEED_WEIGHTS.HOT_COMPANY));
  const jobCount = Math.max(1, pageSize - postCount - companyCount);

  return {
    [HomeFeedType.HOT_POST]: postCount,
    [HomeFeedType.HOT_COMPANY]: companyCount,
    [HomeFeedType.HOT_JOB]: jobCount,
  };
}

async function getHotPostFeed(page: number, take: number) {
  const offset = (page - 1) * take;
  const windowEnd = offset + take + EXTRA_FETCH_BUFFER;

  const [userTotal, expertTotal, userPosts, expertPosts] = await Promise.all([
    prisma.userPost.count({
      where: {
        status: 'PUBLISHED',
      },
    }),
    prisma.expertPost.count({
      where: {
        publishedAt: {
          not: null,
          lte: new Date(),
        },
      },
    }),
    prisma.userPost.findMany({
      where: {
        status: 'PUBLISHED',
      },
      take: windowEnd,
      orderBy: [
        { isHot: 'desc' },
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { commentCount: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        content: true,
        coverImage: true,
        images: true,
        tags: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.expertPost.findMany({
      where: {
        publishedAt: {
          not: null,
          lte: new Date(),
        },
      },
      take: windowEnd,
      orderBy: [
        { isTop: 'desc' },
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { commentCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        content: true,
        coverImage: true,
        tags: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
        expertName: true,
        expertTitle: true,
        expertCompany: true,
        expertAvatar: true,
      },
    }),
  ]);

  const items = [
    ...userPosts.map<HomeFeedCard>((item) => ({
      id: item.id,
      type: HomeFeedType.HOT_POST,
      targetType: HomeFeedTargetType.POST,
      targetId: item.id,
      title: item.title,
      summary: buildSummary(item.content),
      imageUrl: toMediaUrl(item.coverImage || firstImage(item.images)) || null,
      tags: safeParseJson<string[]>(item.tags, []),
      authorName: item.user?.name?.trim() || 'STAR-LINK 职圈',
      authorAvatar: toMediaUrl(item.user?.avatar) || null,
      badge: '热门帖子',
      metricLabel: '热度',
      metricValue: `${formatCompactCount(item.viewCount)} 浏览`,
      createdAt: item.createdAt,
    })),
    ...expertPosts.map<HomeFeedCard>((item) => ({
      id: item.id,
      type: HomeFeedType.HOT_POST,
      targetType: HomeFeedTargetType.POST,
      targetId: item.id,
      title: item.title,
      summary: buildSummary(item.content),
      imageUrl: toMediaUrl(item.coverImage) || null,
      tags: safeParseJson<string[]>(item.tags, []),
      authorName: item.expertName,
      authorAvatar: toMediaUrl(item.expertAvatar) || null,
      badge: '热门帖子',
      metricLabel: '热度',
      metricValue: `${formatCompactCount(item.viewCount)} 浏览`,
      createdAt: item.publishedAt,
    })),
  ]
    .sort((a, b) => scoreHomeFeedCard(b) - scoreHomeFeedCard(a))
    .slice(offset, offset + take);

  const total = userTotal + expertTotal;
  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}

async function getHotCompanyFeed(page: number, take: number) {
  const skip = (page - 1) * take;

  const [total, showcases] = await Promise.all([
    prisma.companyShowcase.count({
      where: {
        company: {
          isActive: true,
        },
      },
    }),
    prisma.companyShowcase.findMany({
      skip,
      take,
      orderBy: [
        { sortOrder: 'asc' },
        { hiringCount: 'desc' },
      ],
      where: {
        company: {
          isActive: true,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            tagline: true,
            description: true,
            industry: true,
            focusArea: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const items = showcases.map<HomeFeedCard>((item) => {
    const tags = [item.company.industry, item.company.focusArea, item.company.isVerified ? '企业认证' : null]
      .filter((value): value is string => Boolean(value && value.trim()));

    return {
      id: item.id,
      type: HomeFeedType.HOT_COMPANY,
      targetType: HomeFeedTargetType.COMPANY,
      targetId: item.company.id,
      title: item.company.tagline?.trim()
        ? `${item.company.name}｜${item.company.tagline.trim()}`
        : `${item.company.name} 正在持续扩招`,
      summary: item.company.description
        ? buildSummary(item.company.description)
        : `${item.company.name} 当前开放多个方向岗位，适合持续关注与投递。`,
      imageUrl: null,
      tags,
      authorName: item.company.name,
      authorAvatar: toMediaUrl(item.company.logo) || null,
      badge: '热门企业',
      metricLabel: '热招岗位',
      metricValue: `${Math.max(item.hiringCount, 1)} 个热招岗位`,
      createdAt: item.company.createdAt,
    };
  });

  return {
    items,
    total,
    hasMore: skip + items.length < total,
  };
}

async function getHotJobFeed(page: number, take: number) {
  const offset = (page - 1) * take;
  const now = new Date();
  const windowEnd = offset + take + EXTRA_FETCH_BUFFER;

  const [promotedTotal, regularTotal, promotedJobs, regularJobs] = await withRetry(() => 
    Promise.all([
      prisma.promotedJob.count({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          job: {
            status: 'ACTIVE',
            isPublished: true,
            company: {
              isActive: true,
            },
          },
        },
      }),
      prisma.job.count({
        where: {
          status: 'ACTIVE',
          isPublished: true,
          company: {
            isActive: true,
          },
        },
      }),
      prisma.promotedJob.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          job: {
            status: 'ACTIVE',
            isPublished: true,
            company: {
              isActive: true,
            },
          },
        },
        take: windowEnd,
        orderBy: [
          { priority: 'desc' },
          { promotionType: 'desc' },
          { createdAt: 'desc' },
        ],
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
              _count: {
                select: {
                  applications: true,
                },
              },
            },
          },
        },
      }),
      prisma.job.findMany({
        where: {
          status: 'ACTIVE',
          isPublished: true,
          company: {
            isActive: true,
          },
        },
        take: windowEnd * 2,
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
    ])
  );

  const mergedJobs = new Map<string, HomeFeedCard>();

  promotedJobs.forEach((item) => {
    mergedJobs.set(item.job.id, {
      id: item.id,
      type: HomeFeedType.HOT_JOB,
      targetType: HomeFeedTargetType.JOB,
      targetId: item.job.id,
      title: item.job.title,
      summary: [item.job.location, item.job.salary].filter(Boolean).join(' · ') || '立即查看岗位详情与要求',
      imageUrl: null,
      tags: safeParseJson<string[]>(item.job.skills, []).slice(0, 3),
      authorName: item.job.company.name,
      authorAvatar: toMediaUrl(item.job.company.logo) || null,
      badge: '热门职岗',
      metricLabel: '投递热度',
      metricValue: item.job.salary?.trim() || `${Math.max(item.job._count.applications, 1)} 人关注`,
      createdAt: item.job.createdAt,
    });
  });

  regularJobs.forEach((item) => {
    if (mergedJobs.has(item.id)) {
      return;
    }
    mergedJobs.set(item.id, {
      id: item.id,
      type: HomeFeedType.HOT_JOB,
      targetType: HomeFeedTargetType.JOB,
      targetId: item.id,
      title: item.title,
      summary: [item.location, item.salary].filter(Boolean).join(' · ') || '立即查看岗位详情与要求',
      imageUrl: null,
      tags: safeParseJson<string[]>(item.skills, []).slice(0, 3),
      authorName: item.company.name,
      authorAvatar: toMediaUrl(item.company.logo) || null,
      badge: '热门职岗',
      metricLabel: '投递热度',
      metricValue: item.salary?.trim() || `${Math.max(item._count.applications, 1)} 人关注`,
      createdAt: item.createdAt,
    });
  });

  const items = Array.from(mergedJobs.values())
    .sort((a, b) => scoreHomeFeedCard(b) - scoreHomeFeedCard(a))
    .slice(offset, offset + take);

  const total = Math.max(promotedTotal, regularTotal);
  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}

function mixHomeFeed(
  grouped: Record<HomeFeedType, HomeFeedCard[]>,
  pageSize: number
) {
  const counters: Record<HomeFeedType, number> = {
    [HomeFeedType.HOT_POST]: 0,
    [HomeFeedType.HOT_COMPANY]: 0,
    [HomeFeedType.HOT_JOB]: 0,
  };
  const result: HomeFeedCard[] = [];
  let lastType: HomeFeedType | null = null;

  while (result.length < pageSize) {
    const candidates = (Object.keys(grouped) as HomeFeedType[])
      .filter((type) => counters[type] < grouped[type].length)
      .sort((a, b) => {
        const remainingDiff =
          (grouped[b].length - counters[b]) - (grouped[a].length - counters[a]);
        if (remainingDiff !== 0) {
          return remainingDiff;
        }
        return HOME_FEED_WEIGHTS[b.toUpperCase() as keyof typeof HOME_FEED_WEIGHTS]
          - HOME_FEED_WEIGHTS[a.toUpperCase() as keyof typeof HOME_FEED_WEIGHTS];
      });

    if (candidates.length === 0) {
      break;
    }

    const preferred = candidates.find((type) => type !== lastType) || candidates[0];
    result.push(grouped[preferred][counters[preferred]]);
    counters[preferred] += 1;
    lastType = preferred;
  }

  return result;
}

function scoreHomeFeedCard(item: HomeFeedCard) {
  const metric = item.metricValue.replace(/[^\d]/g, '');
  const metricScore = parseInt(metric, 10) || 0;
  const timeScore = item.createdAt?.getTime() || 0;
  return metricScore * 10 + Math.floor(timeScore / 1000);
}

function buildSummary(content: string | null | undefined) {
  if (!content) {
    return null;
  }
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
}

function firstImage(images: string | null | undefined) {
  return safeParseJson<string[]>(images, []).find((item) => item && item.trim()) || null;
}

function formatCompactCount(count: number) {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return String(count);
}

/**
 * 获取Banner数据（首页轮播图）
 * GET /api/home/banners
 */
export const getHomeBanners = async (req: Request, res: Response) => {
  try {
    const banners = await prisma.homeBanner.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        imageUrl: true,
        linkType: true,
        linkId: true,
      },
    });

    const withResolvedUrls = banners.map((b) => ({
      ...b,
      // DB 中存 objectKey（uploads/...）或历史代理路径，对外统一为 App 可加载的地址
      imageUrl: toMediaUrl(b.imageUrl) ?? b.imageUrl ?? null,
    }));

    res.json({
      success: true,
      data: withResolvedUrls,
    });
  } catch (error: any) {
    console.error('获取Banner失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取首页精选内容卡片
 * GET /api/home/featured-articles
 */
export const getHomeFeaturedArticles = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 50);
    const skip = (pageNum - 1) * pageSizeNum;

    const whereClause = {
      isActive: true,
      status: 'PUBLISHED',
    };

    const [total, articles] = await Promise.all([
      prisma.homeFeaturedArticle.count({ where: whereClause }),
      prisma.homeFeaturedArticle.findMany({
        where: whereClause,
        orderBy: {
          sortOrder: 'asc',
        },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          title: true,
          summary: true,
          imageUrl: true,
          author: true,
          tags: true,
          viewCount: true,
          category: true,
          createdAt: true,
        },
      }),
    ]);

    const formatted = articles.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      imageUrl: toMediaUrl(item.imageUrl) || null,
      author: item.author,
      tags: item.tags ? safeParseJson<string[]>(item.tags, []) : [],
      viewCount: item.viewCount,
      category: item.category,
      createdAt: item.createdAt,
    }));

    res.json({
      success: true,
      data: {
        list: formatted,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: pageNum * pageSizeNum < total,
      },
    });
  } catch (error: any) {
    console.error('获取首页精选内容失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return fallback;
  }
}
