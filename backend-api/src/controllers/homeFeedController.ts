import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 内容类型枚举
 */
enum ContentType {
  ASSESSMENT = 'assessment',    // 热门测试 20%
  USER_POST = 'user_post',      // 热门分享 40%
  EXPERT_POST = 'expert_post',  // 大咖分享 30%
  PROMOTED_JOB = 'promoted_job' // 热门职岗 10%
}

/**
 * 首页内容聚合接口（瀑布流混排）
 * GET /api/home/feed
 * 
 * 混排策略：
 * - 热门测试：20%
 * - 热门分享：40%
 * - 大咖分享：30%
 * - 热门职岗：10%
 * - 相同类型内容不连续出现
 * - 每10个卡片最多1个广告（职岗）
 */
export const getHomeFeed = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);

    // 根据比例计算各类型内容数量
    const assessmentCount = Math.ceil(pageSizeNum * 0.2); // 20%
    const userPostCount = Math.ceil(pageSizeNum * 0.4);   // 40%
    const expertPostCount = Math.ceil(pageSizeNum * 0.3); // 30%
    const promotedJobCount = Math.ceil(pageSizeNum * 0.1); // 10%

    // 并发获取各类型内容
    const [assessments, userPosts, expertPosts, promotedJobs] = await Promise.all([
      // 1. 获取热门测试
      prisma.assessment.findMany({
        where: {
          status: 'PUBLISHED',
          isHot: true,
        },
        take: assessmentCount,
        orderBy: [
          { participantCount: 'desc' },
          { rating: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          coverImage: true,
          durationMinutes: true,
          difficulty: true,
          participantCount: true,
          rating: true,
          tags: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      }),

      // 2. 获取热门用户分享
      prisma.userPost.findMany({
        where: {
          status: 'PUBLISHED',
          isHot: true,
        },
        take: userPostCount,
        orderBy: [
          { viewCount: 'desc' },
          { likeCount: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          coverImage: true,
          tags: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          createdAt: true,
        },
      }),

      // 3. 获取大咖分享
      prisma.expertPost.findMany({
        where: {
          publishedAt: {
            not: null,
            lte: new Date(),
          },
        },
        take: expertPostCount,
        orderBy: [
          { isTop: 'desc' },
          { viewCount: 'desc' },
        ],
        select: {
          id: true,
          expertName: true,
          expertTitle: true,
          expertCompany: true,
          expertAvatar: true,
          title: true,
          coverImage: true,
          tags: true,
          viewCount: true,
          likeCount: true,
        },
      }),

      // 4. 获取推广职位
      getActivePromotedJobs(promotedJobCount),
    ]);

    // 格式化数据
    const formattedAssessments = assessments.map((item) => ({
      type: ContentType.ASSESSMENT,
      id: item.id,
      data: {
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
        categoryName: item.category.name,
      },
    }));

    const formattedUserPosts = userPosts.map((item) => ({
      type: ContentType.USER_POST,
      id: item.id,
      data: {
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
      },
    }));

    const formattedExpertPosts = expertPosts.map((item) => ({
      type: ContentType.EXPERT_POST,
      id: item.id,
      data: {
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
      },
    }));

    const formattedPromotedJobs = promotedJobs.map((item: any) => ({
      type: ContentType.PROMOTED_JOB,
      id: item.promotionId,
      data: item,
    }));

    // 混排算法：确保内容多样性
    const mixedContent = mixContentWithStrategy([
      ...formattedAssessments,
      ...formattedUserPosts,
      ...formattedExpertPosts,
      ...formattedPromotedJobs,
    ]);

    res.json({
      success: true,
      data: {
        list: mixedContent,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: true, // 实际应该根据数据库总数计算
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

/**
 * 获取活跃的推广职位（包含关联的Job信息）
 */
async function getActivePromotedJobs(limit: number) {
  const now = new Date();

  const promotedJobs = await prisma.promotedJob.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    take: limit,
    orderBy: [
      { promotionType: 'desc' },
      { priority: 'desc' },
    ],
  });

  const jobIds = promotedJobs.map((pj) => pj.jobId);
  const jobs = await prisma.job.findMany({
    where: {
      id: { in: jobIds },
      status: 'ACTIVE',
      isPublished: true,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  });

  return promotedJobs.map((pj) => {
    const job = jobs.find((j) => j.id === pj.jobId);
    if (!job) return null;

    return {
      promotionId: pj.id,
      promotionType: pj.promotionType,
      job: {
        id: job.id,
        title: job.title,
        salary: job.salary,
        location: job.location,
        skills: job.skills ? JSON.parse(job.skills) : [],
        company: job.company,
      },
    };
  }).filter(Boolean);
}

/**
 * 内容混排策略
 * 
 * 规则：
 * 1. 相同类型内容不连续出现
 * 2. 每10个内容最多1个职岗广告
 * 3. 首屏（前6个）必须包含：至少1个测试、2个分享、1个大咖
 */
function mixContentWithStrategy(contents: any[]): any[] {
  // 按类型分组
  const grouped: Record<string, any[]> = {
    [ContentType.ASSESSMENT]: [],
    [ContentType.USER_POST]: [],
    [ContentType.EXPERT_POST]: [],
    [ContentType.PROMOTED_JOB]: [],
  };

  contents.forEach((item) => {
    grouped[item.type].push(item);
  });

  const result: any[] = [];
  let jobAdIndex = 0;
  let lastType: string | null = null;

  // 计算总轮数（确保能遍历完所有内容）
  const totalRounds = Math.max(
    grouped[ContentType.ASSESSMENT].length,
    grouped[ContentType.USER_POST].length,
    grouped[ContentType.EXPERT_POST].length,
    grouped[ContentType.PROMOTED_JOB].length
  );

  const counters = {
    [ContentType.ASSESSMENT]: 0,
    [ContentType.USER_POST]: 0,
    [ContentType.EXPERT_POST]: 0,
    [ContentType.PROMOTED_JOB]: 0,
  };

  // 按照比例和规则混排
  for (let round = 0; round < totalRounds * 2; round++) {
    // 每10个内容插入1个职岗广告
    if (result.length > 0 && result.length % 10 === 0) {
      if (counters[ContentType.PROMOTED_JOB] < grouped[ContentType.PROMOTED_JOB].length) {
        result.push(grouped[ContentType.PROMOTED_JOB][counters[ContentType.PROMOTED_JOB]]);
        counters[ContentType.PROMOTED_JOB]++;
        lastType = ContentType.PROMOTED_JOB;
        continue;
      }
    }

    // 按优先级选择内容类型（避免连续相同类型）
    const availableTypes = [
      ContentType.USER_POST,    // 优先级1：用户分享（数量最多）
      ContentType.EXPERT_POST,  // 优先级2：大咖分享
      ContentType.ASSESSMENT,   // 优先级3：测试
    ].filter((type) => {
      return counters[type] < grouped[type].length && type !== lastType;
    });

    if (availableTypes.length === 0) {
      // 如果没有可选类型，尝试选择剩余的（允许连续）
      const remainingTypes = [
        ContentType.USER_POST,
        ContentType.EXPERT_POST,
        ContentType.ASSESSMENT,
      ].filter((type) => counters[type] < grouped[type].length);

      if (remainingTypes.length === 0) break;

      const selectedType = remainingTypes[0];
      result.push(grouped[selectedType][counters[selectedType]]);
      counters[selectedType]++;
      lastType = selectedType;
    } else {
      // 选择第一个可用类型
      const selectedType = availableTypes[0];
      result.push(grouped[selectedType][counters[selectedType]]);
      counters[selectedType]++;
      lastType = selectedType;
    }
  }

  return result;
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

    res.json({
      success: true,
      data: banners,
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
      imageUrl: item.imageUrl,
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

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return fallback;
  }
}
