import { Request, Response } from 'express';
import type { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import path from 'path';
import { ossService } from '../services/ossService';

const prisma = new PrismaClient();

const parseJsonArray = (value?: string | null) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('JSON 解析失败:', error);
    return [] as string[];
  }
};

const splitMultiline = (value?: string | null) => {
  if (!value) return [] as string[];
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatRelativeTime = (date?: Date | null) => {
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (minutes < 1) return '发布于 刚刚';
  if (minutes < 60) return `发布于 ${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `发布于 ${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '发布于 昨日';
  if (days < 7) return `发布于 ${days} 天前`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `发布于 ${weeks} 周前`;

  const months = Math.floor(days / 30);
  return `发布于 ${months} 个月前`;
};

const mapJobToListing = (job: any) => ({
  id: job.id,
  title: job.title,
  company: job.company?.name ?? '',
  location: job.location ?? '',
  salary: job.salary ?? '',
  experience: job.experience ?? '',
  tags: parseJsonArray(job.skills),
  posted: formatRelativeTime(job.createdAt),
  isRemote: job.isRemote ?? false,
  badgeColor: job.badgeColor ?? '#6366F1',
});

const normalizeUploadPath = (filePath: string) => {
  const relativePath = path.relative('uploads', filePath).replace(/\\/g, '/');
  if (!relativePath || relativePath.startsWith('..')) {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith('/uploads/')
      ? normalized
      : `/uploads/${normalized.replace(/^uploads\//, '')}`;
  }
  return `/uploads/${relativePath}`;
};

const normalizeMediaPath = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return normalizeUploadPath(value);
};

const buildUserHeadline = (user: {
  experience?: string | null;
  education?: string | null;
  skills?: string | null;
}) => {
  if (user.experience && user.experience.trim().length > 0) {
    return user.experience.trim();
  }
  if (user.education && user.education.trim().length > 0) {
    return user.education.trim();
  }
  const skillList = parseJsonArray(user.skills);
  if (skillList.length > 0) {
    return skillList.slice(0, 3).join(' · ');
  }
  return '';
};

const getOSSUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  // objectKey → 完整 OSS URL
  if (
    process.env.OSS_BUCKET &&
    process.env.OSS_REGION &&
    (value.startsWith('post-covers/') || value.startsWith('post-images/') || value.startsWith('posts/'))
  ) {
    return ossService.generateFileUrl(value);
  }
  return normalizeUploadPath(value);
};

const mapUserPostResponse = (post: any) => {
  const { user, images, tags, coverImage, ...rest } = post;
  const imageList =
    typeof images === 'string'
      ? parseJsonArray(images)
      : Array.isArray(images)
      ? images
      : [];
  const tagList =
    typeof tags === 'string'
      ? parseJsonArray(tags)
      : Array.isArray(tags)
      ? tags
      : [];

  return {
    ...rest,
    coverImage: getOSSUrl(coverImage),
    images: imageList.map((item: string) => getOSSUrl(item) ?? item),
    tags: tagList,
    author: user
      ? {
          id: user.id,
          name: user.name,
          avatar: normalizeMediaPath(user.avatar),
          headline: buildUserHeadline(user),
        }
      : null,
  };
};

const parseTagsInput = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((tag) => `${tag}`.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((tag) => `${tag}`.trim())
          .filter(Boolean);
      }
    } catch (error) {
      // 不是JSON字符串，继续走分隔逻辑
    }

    return trimmed
      .split(/[,，\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

type PostKind = 'USER' | 'EXPERT';

type PostCommentRecord = {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
  authorAvatar: string | null;
};

let ensurePostInteractionTablesPromise: Promise<void> | null = null;

const ensurePostInteractionTables = async () => {
  if (!ensurePostInteractionTablesPromise) {
    ensurePostInteractionTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_post_comments (
          id VARCHAR(36) PRIMARY KEY,
          post_type VARCHAR(16) NOT NULL,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX community_post_comments_post_idx (post_type, post_id, created_at),
          INDEX community_post_comments_user_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_post_likes (
          id VARCHAR(36) PRIMARY KEY,
          post_type VARCHAR(16) NOT NULL,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY community_post_likes_unique (post_type, post_id, user_id),
          INDEX community_post_likes_user_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_post_favorites (
          id VARCHAR(36) PRIMARY KEY,
          post_type VARCHAR(16) NOT NULL,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY community_post_favorites_unique (post_type, post_id, user_id),
          INDEX community_post_favorites_user_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    })().catch((error) => {
      ensurePostInteractionTablesPromise = null;
      throw error;
    });
  }

  return ensurePostInteractionTablesPromise;
};

const ensurePostExists = async (kind: PostKind, id: string) => {
  if (kind === 'USER') {
    const post = await prisma.userPost.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!post || post.status !== 'PUBLISHED') {
      return null;
    }

    return post;
  }

  const post = await prisma.expertPost.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });

  if (!post || !post.publishedAt || post.publishedAt > new Date()) {
    return null;
  }

  return post;
};

const buildCommentResponse = (comment: PostCommentRecord) => ({
  id: comment.id,
  content: comment.content,
  createdAt: comment.createdAt,
  author: {
    id: comment.authorId,
    name: comment.authorName?.trim() || 'STAR-LINK 用户',
    avatar: normalizeMediaPath(comment.authorAvatar),
  },
});

const getPostEngagementPayload = async (kind: PostKind, postId: string, userId?: string) => {
  await ensurePostInteractionTables();

  const post =
    kind === 'USER'
      ? await prisma.userPost.findUnique({
          where: { id: postId },
          select: {
            id: true,
            likeCount: true,
            commentCount: true,
          },
        })
      : await prisma.expertPost.findUnique({
          where: { id: postId },
          select: {
            id: true,
            likeCount: true,
            commentCount: true,
          },
        });

  if (!post) {
    return null;
  }

  const [favoriteCountRows, likedRows, favoritedRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*) AS count FROM community_post_favorites WHERE post_type = ? AND post_id = ?`,
      kind,
      postId
    ),
    userId
      ? prisma.$queryRawUnsafe<Array<{ matched: number }>>(
          `SELECT 1 AS matched FROM community_post_likes WHERE post_type = ? AND post_id = ? AND user_id = ? LIMIT 1`,
          kind,
          postId,
          userId
        )
      : Promise.resolve([]),
    userId
      ? prisma.$queryRawUnsafe<Array<{ matched: number }>>(
          `SELECT 1 AS matched FROM community_post_favorites WHERE post_type = ? AND post_id = ? AND user_id = ? LIMIT 1`,
          kind,
          postId,
          userId
        )
      : Promise.resolve([]),
  ]);

  const favoriteCountValue = favoriteCountRows[0]?.count ?? 0;

  return {
    postId,
    postType: kind,
    likeCount: post.likeCount ?? 0,
    commentCount: post.commentCount ?? 0,
    favoriteCount: Number(favoriteCountValue),
    isLiked: likedRows.length > 0,
    isFavorited: favoritedRows.length > 0,
  };
};

const getPostCommentsPayload = async (kind: PostKind, postId: string) => {
  await ensurePostInteractionTables();

  const comments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
    `
      SELECT
        c.id,
        c.content,
        c.created_at AS createdAt,
        u.id AS authorId,
        u.name AS authorName,
        u.avatar AS authorAvatar
      FROM community_post_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_type = ? AND c.post_id = ?
      ORDER BY c.created_at ASC
    `,
    kind,
    postId
  );

  return comments.map(buildCommentResponse);
};

/**
 * 获取热门用户分享列表
 * GET /api/content/posts
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20', isHot } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {
      OR: [
        { status: 'PUBLISHED' },
        req.user
          ? {
              userId: req.user.id,
              status: {
                not: 'DELETED',
              },
            }
          : undefined,
      ].filter(Boolean),
    };

    if (isHot === 'true') {
      // 热门仅对已发布内容
      where.OR = [{ status: 'PUBLISHED', isHot: true }];
    }

    const [posts, total] = await Promise.all([
      prisma.userPost.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isHot: 'desc' },
          {
            // 计算热度：viewCount * 0.3 + likeCount * 0.5 + commentCount * 0.2
            viewCount: 'desc',
          },
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              experience: true,
              education: true,
              skills: true,
            },
          },
        },
      }),
      prisma.userPost.count({ where }),
    ]);

    const formattedPosts = posts.map(mapUserPostResponse);

    res.json({
      success: true,
      data: {
        list: formattedPosts,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取用户分享失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取当前用户的帖子列表
 * GET /api/content/my-posts
 */
export const getMyPosts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { page = '1', pageSize = '20' } = req.query;
    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedSize = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedSize;
    const take = parsedSize;

    const where = {
      userId: req.user.id,
      status: {
        in: ['PUBLISHED', 'DRAFT', 'HIDDEN', 'PENDING'],
      },
    };

    const [posts, total] = await Promise.all([
      prisma.userPost.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              experience: true,
              education: true,
              skills: true,
            },
          },
        },
      }),
      prisma.userPost.count({ where }),
    ]);

    const formattedPosts = posts.map(mapUserPostResponse);

    res.json({
      success: true,
      data: {
        list: formattedPosts,
        total,
        page: parsedPage,
        pageSize: parsedSize,
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取我的发布失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取用户分享详情
 * GET /api/content/posts/:id
 */
export const getUserPostDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.userPost.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            experience: true,
            education: true,
            skills: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    const isOwner = req.user && post.userId && req.user.id === post.userId;
    if (post.status !== 'PUBLISHED' && !isOwner) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    // 增加浏览量（仅对已发布帖子）
    let latestViewCount = post.viewCount;

    if (post.status === 'PUBLISHED') {
      await prisma.userPost.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
      latestViewCount += 1;
    }

    const formattedPost = mapUserPostResponse({
      ...post,
      viewCount: latestViewCount,
    });

    res.json({
      success: true,
      data: formattedPost,
    });
  } catch (error: any) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 创建用户帖子
 * POST /api/content/posts
 */
export const createUserPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const rawTitle = typeof req.body.title === 'string' ? req.body.title : '';
    const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
    const title = rawTitle.trim();
    const content = rawContent.trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '请输入帖子标题',
      });
    }

    if (title.length > 30) {
      return res.status(400).json({
        success: false,
        message: '标题长度不能超过30个字符',
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请输入帖子内容',
      });
    }

    const tags = parseTagsInput(req.body.tags);
    const imageFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

    let imageUrls: string[] = [];

    if (imageFiles.length > 0) {
      // 图片统一上传到 OSS，数据库只存 objectKey
      const ossReady =
        !!process.env.OSS_ACCESS_KEY_ID &&
        !!process.env.OSS_ACCESS_KEY_SECRET &&
        !!process.env.OSS_BUCKET;

      if (!ossReady) {
        return res.status(500).json({
          success: false,
          message: 'OSS 未配置，无法上传图片，请联系管理员',
        });
      }

      try {
        imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const ext = path.extname(file.originalname) || '.jpg';
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const objectKey = `post-images/${timestamp}_${random}${ext}`;
            const { objectKey: storedKey } = await ossService.uploadLocalFile(file.path, objectKey);
            return storedKey;
          })
        );
      } catch (error) {
        console.error('上传帖子图片到OSS失败:', error);
        return res.status(500).json({
          success: false,
          message: '图片上传失败，请稍后重试',
          error: error instanceof Error ? error.message : 'OSS上传失败',
        });
      }
    }

    const coverImage = imageUrls.length > 0 ? imageUrls[0] : null;

    const created = await prisma.userPost.create({
      data: {
        userId: req.user.id,
        title,
        content,
        coverImage,
        images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        status: 'PENDING',
        isHot: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            experience: true,
            education: true,
            skills: true,
          },
        },
      },
    });

    const responseData = mapUserPostResponse(created);

    res.status(201).json({
      success: true,
      message: '发布成功',
      data: responseData,
    });
  } catch (error: any) {
    console.error('发布帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 删除当前用户的帖子
 * DELETE /api/content/posts/:id
 */
export const deleteMyPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const post = await prisma.userPost.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!post || post.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: '帖子不存在或已删除' });
    }

    await prisma.userPost.update({
      where: { id },
      data: {
        status: 'DELETED',
        isHot: false,
      },
    });

    res.json({ success: true, message: '帖子已删除' });
  } catch (error: any) {
    console.error('删除帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取大咖分享列表
 * GET /api/content/expert-posts
 */
export const getExpertPosts = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [posts, total] = await Promise.all([
      prisma.expertPost.findMany({
        where: {
          publishedAt: {
            not: null,
            lte: new Date(),
          },
        },
        skip,
        take,
        orderBy: [
          { isTop: 'desc' },
          { viewCount: 'desc' },
          { publishedAt: 'desc' },
        ],
      }),
      prisma.expertPost.count({
        where: {
          publishedAt: {
            not: null,
            lte: new Date(),
          },
        },
      }),
    ]);

    // 解析 JSON 字符串
    const formattedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));

    res.json({
      success: true,
      data: {
        list: formattedPosts,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取大咖分享失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取大咖分享详情
 * GET /api/content/expert-posts/:id
 */
export const getExpertPostDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.expertPost.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    // 增加浏览量
    await prisma.expertPost.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 解析 JSON 字符串
    const formattedPost = {
      ...post,
      viewCount: post.viewCount + 1,
      tags: post.tags ? JSON.parse(post.tags) : [],
    };

    res.json({
      success: true,
      data: formattedPost,
    });
  } catch (error: any) {
    console.error('获取大咖分享详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const getPostEngagement = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    const data = await getPostEngagementPayload(kind, id, req.user?.id);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('获取帖子互动信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const getPostComments = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    const data = await getPostCommentsPayload(kind, id);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('获取帖子评论失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const createPostComment = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空',
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能超过500字',
      });
    }

    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    const commentId = randomUUID();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO community_post_comments (id, post_type, post_id, user_id, content)
        VALUES (?, ?, ?, ?, ?)
      `,
      commentId,
      kind,
      id,
      req.user.id,
      content
    );

    if (kind === 'USER') {
      await prisma.userPost.update({
        where: { id },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });
    } else {
      await prisma.expertPost.update({
        where: { id },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });
    }

    const comments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.id = ?
        LIMIT 1
      `,
      commentId
    );

    const engagement = await getPostEngagementPayload(kind, id, req.user.id);

    res.status(201).json({
      success: true,
      message: '评论成功',
      data: {
        comment: comments[0] ? buildCommentResponse(comments[0]) : null,
        engagement,
      },
    });
  } catch (error: any) {
    console.error('发布评论失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const likePost = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    const existing = await prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_post_likes
        WHERE post_type = ? AND post_id = ? AND user_id = ?
        LIMIT 1
      `,
      kind,
      id,
      req.user.id
    );

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO community_post_likes (id, post_type, post_id, user_id)
          VALUES (?, ?, ?, ?)
        `,
        randomUUID(),
        kind,
        id,
        req.user.id
      );

      if (kind === 'USER') {
        await prisma.userPost.update({
          where: { id },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });
      } else {
        await prisma.expertPost.update({
          where: { id },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });
      }
    }

    const data = await getPostEngagementPayload(kind, id, req.user.id);

    res.json({
      success: true,
      message: '点赞成功',
      data,
    });
  } catch (error: any) {
    console.error('点赞帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const unlikePost = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    const deleted = await prisma.$executeRawUnsafe(
      `
        DELETE FROM community_post_likes
        WHERE post_type = ? AND post_id = ? AND user_id = ?
      `,
      kind,
      id,
      req.user.id
    );

    if (Number(deleted) > 0) {
      if (kind === 'USER') {
        await prisma.userPost.update({
          where: { id },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });
      } else {
        await prisma.expertPost.update({
          where: { id },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });
      }
    }

    const data = await getPostEngagementPayload(kind, id, req.user.id);

    res.json({
      success: true,
      message: '已取消点赞',
      data,
    });
  } catch (error: any) {
    console.error('取消点赞失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const favoritePost = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    const existing = await prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_post_favorites
        WHERE post_type = ? AND post_id = ? AND user_id = ?
        LIMIT 1
      `,
      kind,
      id,
      req.user.id
    );

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO community_post_favorites (id, post_type, post_id, user_id)
          VALUES (?, ?, ?, ?)
        `,
        randomUUID(),
        kind,
        id,
        req.user.id
      );
    }

    const data = await getPostEngagementPayload(kind, id, req.user.id);

    res.json({
      success: true,
      message: '收藏成功',
      data,
    });
  } catch (error: any) {
    console.error('收藏帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

const unfavoritePost = (kind: PostKind) => async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const post = await ensurePostExists(kind, id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    await prisma.$executeRawUnsafe(
      `
        DELETE FROM community_post_favorites
        WHERE post_type = ? AND post_id = ? AND user_id = ?
      `,
      kind,
      id,
      req.user.id
    );

    const data = await getPostEngagementPayload(kind, id, req.user.id);

    res.json({
      success: true,
      message: '已取消收藏',
      data,
    });
  } catch (error: any) {
    console.error('取消收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

export const getUserPostEngagement = getPostEngagement('USER');
export const getExpertPostEngagement = getPostEngagement('EXPERT');
export const getUserPostComments = getPostComments('USER');
export const getExpertPostComments = getPostComments('EXPERT');
export const createUserPostComment = createPostComment('USER');
export const createExpertPostComment = createPostComment('EXPERT');
export const likeUserPost = likePost('USER');
export const likeExpertPost = likePost('EXPERT');
export const unlikeUserPost = unlikePost('USER');
export const unlikeExpertPost = unlikePost('EXPERT');
export const favoriteUserPost = favoritePost('USER');
export const favoriteExpertPost = favoritePost('EXPERT');
export const unfavoriteUserPost = unfavoritePost('USER');
export const unfavoriteExpertPost = unfavoritePost('EXPERT');

/**
 * 获取推广职位列表
 * GET /api/content/promoted-jobs
 */
export const getPromotedJobs = async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const now = new Date();

    const [promotedJobs, total] = await Promise.all([
      prisma.promotedJob.findMany({
        where: {
          isActive: true,
          startDate: {
            lte: now,
          },
          endDate: {
            gte: now,
          },
        },
        skip,
        take,
        orderBy: [
          { promotionType: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.promotedJob.count({
        where: {
          isActive: true,
          startDate: {
            lte: now,
          },
          endDate: {
            gte: now,
          },
        },
      }),
    ]);

    // 获取关联的 Job 信息
    const jobIds = promotedJobs.map((pj) => pj.jobId);
    const jobs = await prisma.job.findMany({
      where: {
        id: {
          in: jobIds,
        },
        status: 'ACTIVE',
        isPublished: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            industry: true,
          },
        },
      },
    });

    // 合并数据
    const result = promotedJobs.map((pj) => {
      const job = jobs.find((j) => j.id === pj.jobId);
      if (!job) return null;

      return {
        promotionId: pj.id,
        promotionType: pj.promotionType,
        job: {
          ...job,
          skills: job.skills ? JSON.parse(job.skills) : [],
        },
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        list: result,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取推广职位失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 记录推广职位的点击
 * POST /api/content/promoted-jobs/:id/click
 */
export const recordPromotedJobClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.promotedJob.update({
      where: { id },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      message: '记录成功',
    });
  } catch (error: any) {
    console.error('记录职位点击失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};
