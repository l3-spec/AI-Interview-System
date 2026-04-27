import { Request, Response } from 'express';
import type { Express } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import { ossService } from '../services/ossService';
import { prisma } from '../lib/prisma';
import { withRetry } from '../utils/prismaUtils';

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

  const mappedImages = imageList
    .map((item: string) => getOSSUrl(item) ?? item)
    .filter((u: string | null) => !!u);
  // 列表/详情统一：无单独封面时用图集第一张，避免 App 只读 coverImage 时出现整片空白
  const resolvedCover = getOSSUrl(coverImage) ?? mappedImages[0] ?? null;

  return {
    ...rest,
    coverImage: resolvedCover,
    images: mappedImages,
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
  parentId: string | null;
  replyToUserId: string | null;
  replyToUserName: string | null;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  reactions: any;
};

let ensurePostInteractionTablesPromise: Promise<void> | null = null;

// 检查列是否存在的辅助函数
const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
      `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`
    );
    return result.length > 0;
  } catch (e) {
    console.log(`[checkColumnExists] 检查列 ${tableName}.${columnName} 失败:`, (e as Error).message);
    return false;
  }
};

// 检查索引是否存在的辅助函数
const checkIndexExists = async (tableName: string, indexName: string): Promise<boolean> => {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ Key_name: string }>>(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}'`
    );
    return result.length > 0;
  } catch (e) {
    console.log(`[checkIndexExists] 检查索引 ${tableName}.${indexName} 失败:`, (e as Error).message);
    return false;
  }
};

const ensurePostInteractionTables = async () => {
  if (!ensurePostInteractionTablesPromise) {
    ensurePostInteractionTablesPromise = (async () => {
      console.log('[ensurePostInteractionTables] 开始确保互动表存在...');

      // 原有表结构 - 更新评论表以支持回复
      await withRetry(() => prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_post_comments (
          id VARCHAR(36) PRIMARY KEY,
          post_type VARCHAR(16) NOT NULL,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          parent_id VARCHAR(36) NULL,
          reply_to_user_id VARCHAR(191) NULL,
          content TEXT NOT NULL,
          like_count INT NOT NULL DEFAULT 0,
          reply_count INT NOT NULL DEFAULT 0,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX community_post_comments_post_idx (post_type, post_id, created_at),
          INDEX community_post_comments_user_idx (user_id),
          INDEX community_post_comments_parent_idx (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `));

      // 逐个添加列（MySQL不支持ADD COLUMN IF NOT EXISTS）
      const columnsToAdd = [
        { name: 'parent_id', definition: 'VARCHAR(36) NULL' },
        { name: 'reply_to_user_id', definition: 'VARCHAR(191) NULL' },
        { name: 'like_count', definition: 'INT NOT NULL DEFAULT 0' },
        { name: 'reply_count', definition: 'INT NOT NULL DEFAULT 0' }
      ];

      for (const column of columnsToAdd) {
        const exists = await checkColumnExists('community_post_comments', column.name);
        if (!exists) {
          try {
            console.log(`[ensurePostInteractionTables] 添加列: ${column.name}`);
            await prisma.$executeRawUnsafe(
              `ALTER TABLE community_post_comments ADD COLUMN ${column.name} ${column.definition}`
            );
          } catch (e) {
            console.log(`[ensurePostInteractionTables] 列 ${column.name} 可能已存在，跳过:`, (e as Error).message);
          }
        } else {
          console.log(`[ensurePostInteractionTables] 列 ${column.name} 已存在`);
        }
      }

      // 添加索引
      const indexExists = await checkIndexExists('community_post_comments', 'community_post_comments_parent_idx');
      if (!indexExists) {
        try {
          console.log('[ensurePostInteractionTables] 添加索引: community_post_comments_parent_idx');
          await prisma.$executeRawUnsafe(
            `ALTER TABLE community_post_comments ADD INDEX community_post_comments_parent_idx (parent_id)`
          );
        } catch (e) {
          console.log('[ensurePostInteractionTables] 索引可能已存在，跳过:', (e as Error).message);
        }
      }

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

      // 评论点赞表
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_comment_likes (
          id VARCHAR(36) PRIMARY KEY,
          comment_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY community_comment_likes_unique (comment_id, user_id),
          INDEX community_comment_likes_comment_idx (comment_id),
          INDEX community_comment_likes_user_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 评论表情表
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS community_comment_reactions (
          id VARCHAR(36) PRIMARY KEY,
          comment_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(191) NOT NULL,
          emoji VARCHAR(32) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY community_comment_reactions_unique (comment_id, user_id, emoji),
          INDEX community_comment_reactions_comment_idx (comment_id),
          INDEX community_comment_reactions_user_idx (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('[ensurePostInteractionTables] 互动表确保完成');
    })().catch((error) => {
      console.error('[ensurePostInteractionTables] 错误:', error);
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
  parentId: comment.parentId ?? null,
  replyToUserId: comment.replyToUserId ?? null,
  replyToUserName: comment.replyToUserName ?? null,
  likeCount: comment.likeCount ?? 0,
  replyCount: comment.replyCount ?? 0,
  isLiked: comment.isLiked ?? false,
  reactions: comment.reactions ?? {},
  author: {
    id: comment.authorId ?? null,
    name: (comment.authorName ?? 'STAR-LINK 用户').trim(),
    avatar: normalizeMediaPath(comment.authorAvatar),
  },
});

const getPostEngagementPayload = async (kind: PostKind, postId: string, userId?: string) => {
  await ensurePostInteractionTables();

  const post =
    kind === 'USER'
      ? await withRetry(() => prisma.userPost.findUnique({
          where: { id: postId },
          select: {
            id: true,
            likeCount: true,
            commentCount: true,
          },
        }))
      : await withRetry(() => prisma.expertPost.findUnique({
          where: { id: postId },
          select: {
            id: true,
            likeCount: true,
            commentCount: true,
          },
        }));

  if (!post) {
    return null;
  }

  const [favoriteCountRows, likedRows, favoritedRows] = await withRetry(() => Promise.all([
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
  ]));

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

const getPostCommentsPayload = async (kind: PostKind, postId: string, userId?: string) => {
  await ensurePostInteractionTables();

  try {
    // 首先检查表结构，确定可用的字段
    let hasParentId = await checkColumnExists('community_post_comments', 'parent_id');
    let hasReplyToUserId = await checkColumnExists('community_post_comments', 'reply_to_user_id');
    let hasLikeCount = await checkColumnExists('community_post_comments', 'like_count');
    let hasReplyCount = await checkColumnExists('community_post_comments', 'reply_count');

    console.log(`[getPostCommentsPayload] 表结构检查 - parent_id: ${hasParentId}, reply_to_user_id: ${hasReplyToUserId}, like_count: ${hasLikeCount}, reply_count: ${hasReplyCount}`);

    // 构建动态SQL，只查询存在的字段
    let selectFields = `
      c.id,
      c.content,
      c.created_at AS createdAt,
      u.id AS authorId,
      u.name AS authorName,
      u.avatar AS authorAvatar
    `;

    if (hasParentId) selectFields += `, c.parent_id AS parentId`;
    if (hasReplyToUserId) selectFields += `, c.reply_to_user_id AS replyToUserId, reply_u.name AS replyToUserName`;
    if (hasLikeCount) selectFields += `, c.like_count AS likeCount`;
    if (hasReplyCount) selectFields += `, c.reply_count AS replyCount`;

    let whereClause = `WHERE c.post_type = ? AND c.post_id = ?`;
    if (hasParentId) whereClause += ` AND c.parent_id IS NULL`;

    let joinClause = `LEFT JOIN users u ON u.id = c.user_id`;
    if (hasReplyToUserId) joinClause += ` LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id`;

    // 获取一级评论
    const comments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT ${selectFields}
        FROM community_post_comments c
        ${joinClause}
        ${whereClause}
        ORDER BY c.created_at ASC
      `,
      kind,
      postId
    );

    console.log(`[getPostCommentsPayload] 获取到 ${comments.length} 条评论`);

    // 获取所有评论的ID
    const commentIds = comments.map(c => c.id);

    // 为每个评论获取点赞状态和表情
    let likedMap = new Map<string, boolean>();
    let reactionsMap = new Map<string, any>();

    if (userId && commentIds.length > 0) {
      try {
        // 获取当前用户点赞的评论
        const likedComments = await prisma.$queryRawUnsafe<Array<{ commentId: string }>>(
          `
            SELECT comment_id AS commentId
            FROM community_comment_likes
            WHERE comment_id IN (${commentIds.map(() => '?').join(',')}) AND user_id = ?
          `,
          ...commentIds,
          userId
        );
        likedComments.forEach(r => likedMap.set(r.commentId, true));
      } catch (e) {
        console.log('[getPostCommentsPayload] 获取点赞状态失败:', (e as Error).message);
      }

      try {
        // 获取评论表情统计
        const commentReactions = await prisma.$queryRawUnsafe<Array<{ commentId: string; emoji: string; count: bigint }>>(
          `
            SELECT comment_id AS commentId, emoji, COUNT(*) AS count
            FROM community_comment_reactions
            WHERE comment_id IN (${commentIds.map(() => '?').join(',')})
            GROUP BY comment_id, emoji
          `,
          ...commentIds
        );
        commentReactions.forEach(r => {
          const current = reactionsMap.get(r.commentId) || {};
          current[r.emoji] = Number(r.count);
          reactionsMap.set(r.commentId, current);
        });
      } catch (e) {
        console.log('[getPostCommentsPayload] 获取表情统计失败:', (e as Error).message);
      }
    }

    // 构建完整的评论响应
    const parentComments = comments.map(comment => ({
      ...comment,
      parentId: hasParentId ? comment.parentId : null,
      replyToUserId: hasReplyToUserId ? comment.replyToUserId : null,
      replyToUserName: hasReplyToUserId ? comment.replyToUserName : null,
      likeCount: hasLikeCount ? (comment.likeCount ?? 0) : 0,
      replyCount: hasReplyCount ? (comment.replyCount ?? 0) : 0,
      isLiked: likedMap.get(comment.id) ?? false,
      reactions: reactionsMap.get(comment.id) ?? {},
    }));

    // 为每个一级评论获取回复（如果有parent_id字段）
    const commentsWithReplies = await Promise.all(
      parentComments.map(async (comment) => {
        let replies: PostCommentRecord[] = [];

        if (hasParentId) {
          try {
            // 构建回复查询的动态SQL
            let replySelectFields = `
              c.id,
              c.content,
              c.created_at AS createdAt,
              u.id AS authorId,
              u.name AS authorName,
              u.avatar AS authorAvatar
            `;
            if (hasParentId) replySelectFields += `, c.parent_id AS parentId`;
            if (hasReplyToUserId) replySelectFields += `, c.reply_to_user_id AS replyToUserId, reply_u.name AS replyToUserName`;
            if (hasLikeCount) replySelectFields += `, c.like_count AS likeCount`;
            if (hasReplyCount) replySelectFields += `, c.reply_count AS replyCount`;

            let replyJoinClause = `LEFT JOIN users u ON u.id = c.user_id`;
            if (hasReplyToUserId) replyJoinClause += ` LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id`;

            replies = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
              `
                SELECT ${replySelectFields}
                FROM community_post_comments c
                ${replyJoinClause}
                WHERE c.parent_id = ?
                ORDER BY c.created_at ASC
                LIMIT 20
              `,
              comment.id
            );
          } catch (e) {
            console.log('[getPostCommentsPayload] 获取回复失败:', (e as Error).message);
            replies = [];
          }
        }

        // 获取回复的点赞状态和表情
        const replyIds = replies.map(r => r.id);
        let replyLikedMap = new Map<string, boolean>();
        let replyReactionsMap = new Map<string, any>();

        if (userId && replyIds.length > 0) {
          try {
            const likedReplies = await prisma.$queryRawUnsafe<Array<{ commentId: string }>>(
              `
                SELECT comment_id AS commentId
                FROM community_comment_likes
                WHERE comment_id IN (${replyIds.map(() => '?').join(',')}) AND user_id = ?
              `,
              ...replyIds,
              userId
            );
            likedReplies.forEach(r => replyLikedMap.set(r.commentId, true));
          } catch (e) {
            console.log('[getPostCommentsPayload] 获取回复点赞状态失败:', (e as Error).message);
          }

          try {
            const replyReactions = await prisma.$queryRawUnsafe<Array<{ commentId: string; emoji: string; count: bigint }>>(
              `
                SELECT comment_id AS commentId, emoji, COUNT(*) AS count
                FROM community_comment_reactions
                WHERE comment_id IN (${replyIds.map(() => '?').join(',')})
                GROUP BY comment_id, emoji
              `,
              ...replyIds
            );
            replyReactions.forEach(r => {
              const current = replyReactionsMap.get(r.commentId) || {};
              current[r.emoji] = Number(r.count);
              replyReactionsMap.set(r.commentId, current);
            });
          } catch (e) {
            console.log('[getPostCommentsPayload] 获取回复表情统计失败:', (e as Error).message);
          }
        }

        return {
          ...buildCommentResponse({
            ...comment,
            likeCount: hasLikeCount ? (comment.likeCount ?? 0) : 0,
            replyCount: hasReplyCount ? (comment.replyCount ?? 0) : 0,
          }),
          isLiked: likedMap.get(comment.id) ?? false,
          reactions: reactionsMap.get(comment.id) ?? {},
          replies: replies.map(reply => buildCommentResponse({
            ...reply,
            parentId: hasParentId ? reply.parentId : null,
            replyToUserId: hasReplyToUserId ? reply.replyToUserId : null,
            replyToUserName: hasReplyToUserId ? reply.replyToUserName : null,
            likeCount: hasLikeCount ? (reply.likeCount ?? 0) : 0,
            replyCount: hasReplyCount ? (reply.replyCount ?? 0) : 0,
            isLiked: replyLikedMap.get(reply.id) ?? false,
            reactions: replyReactionsMap.get(reply.id) ?? {},
          })),
        };
      })
    );

    return commentsWithReplies;
  } catch (error) {
    console.error('[getPostCommentsPayload] 严重错误:', error);
    // 出错时返回空数组
    return [];
  }
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

    const [posts, total] = await withRetry(() => Promise.all([
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
    ]));

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

    const [posts, total] = await withRetry(() => Promise.all([
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
    ]));

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

    const post = await withRetry(() => prisma.userPost.findUnique({
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
    }));

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

    const created = await withRetry(() => prisma.userPost.create({
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
    }));

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
    const post = await withRetry(() => prisma.userPost.findUnique({
      where: { id },
      select: { id: true, userId: true },
    }));

    if (!post || post.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: '帖子不存在或已删除' });
    }

    await withRetry(() => prisma.userPost.update({
      where: { id },
      data: {
        status: 'DELETED',
        isHot: false,
      },
    }));

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

    const [posts, total] = await withRetry(() => Promise.all([
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
    ]));

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

    const post = await withRetry(() => prisma.expertPost.findUnique({
      where: { id },
    }));

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await withRetry(() => prisma.expertPost.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    }));

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

    const data = await getPostCommentsPayload(kind, id, req.user?.id);

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
    const parentId = typeof req.body.parentId === 'string' ? req.body.parentId.trim() : null;
    const replyToUserId = typeof req.body.replyToUserId === 'string' ? req.body.replyToUserId.trim() : null;

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

    // 如果是回复，验证父评论是否存在
    let actualParentId = parentId;
    if (parentId) {
      const parentComments = await prisma.$queryRawUnsafe<Array<{ id: string; parentId: string | null }>>(
        `
          SELECT id, parent_id AS parentId
          FROM community_post_comments
          WHERE id = ?
        `,
        parentId
      );

      if (parentComments.length === 0) {
        return res.status(404).json({
          success: false,
          message: '回复的评论不存在',
        });
      }

      // 如果父评论本身就是回复，则使用父评论的 parent_id（只支持两级评论）
      if (parentComments[0].parentId) {
        actualParentId = parentComments[0].parentId;
      }
    }

    const commentId = randomUUID();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO community_post_comments (id, post_type, post_id, user_id, parent_id, reply_to_user_id, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      commentId,
      kind,
      id,
      req.user.id,
      actualParentId,
      replyToUserId,
      content
    );

    // 更新父评论的回复数
    if (actualParentId) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE community_post_comments
          SET reply_count = reply_count + 1
          WHERE id = ?
        `,
        actualParentId
      );
    }

    // 更新帖子的评论数
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
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
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
        comment: comments[0] ? buildCommentResponse({ ...comments[0], isLiked: false, reactions: {} }) : null,
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
    const post = await withRetry(() => ensurePostExists(kind, id));

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在',
      });
    }

    await ensurePostInteractionTables();

    const existing = await withRetry(() => prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_post_likes
        WHERE post_type = ? AND post_id = ? AND user_id = ?
        LIMIT 1
      `,
      kind,
      id,
      req.user.id
    ));

    if (existing.length === 0) {
      await withRetry(() => prisma.$executeRawUnsafe(
        `
          INSERT INTO community_post_likes (id, post_type, post_id, user_id)
          VALUES (?, ?, ?, ?)
        `,
        randomUUID(),
        kind,
        id,
        req.user.id
      ));

      if (kind === 'USER') {
        await withRetry(() => prisma.userPost.update({
          where: { id },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        }));
      } else {
        await withRetry(() => prisma.expertPost.update({
          where: { id },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        }));
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

// ==================== 评论点赞功能 ====================

/**
 * 点赞评论
 * POST /api/content/comments/:id/like
 */
export const likeComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    await ensurePostInteractionTables();

    console.log(`[likeComment] 开始处理评论点赞: commentId=${id}, userId=${req.user.id}`);

    // 验证评论是否存在
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_post_comments WHERE id = ?`,
      id
    );

    if (comments.length === 0) {
      console.log(`[likeComment] 评论不存在: ${id}`);
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    // 检查是否已经点赞
    const existing = await prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_comment_likes
        WHERE comment_id = ? AND user_id = ?
        LIMIT 1
      `,
      id,
      req.user.id
    );

    if (existing.length === 0) {
      console.log(`[likeComment] 添加新点赞: commentId=${id}, userId=${req.user.id}`);
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO community_comment_likes (id, comment_id, user_id)
          VALUES (?, ?, ?)
        `,
        randomUUID(),
        id,
        req.user.id
      );

      // 更新评论点赞数
      await prisma.$executeRawUnsafe(
        `
          UPDATE community_post_comments
          SET like_count = like_count + 1
          WHERE id = ?
        `,
        id
      );
    } else {
      console.log(`[likeComment] 已点赞，跳过: commentId=${id}, userId=${req.user.id}`);
    }

    // 获取更新后的评论信息，包含点赞状态和表情
    const updatedComments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
        WHERE c.id = ?
        LIMIT 1
      `,
      id
    );

    // 获取该评论的所有表情统计
    const reactions = await prisma.$queryRawUnsafe<Array<{ emoji: string; count: bigint }>>(
      `
        SELECT emoji, COUNT(*) AS count
        FROM community_comment_reactions
        WHERE comment_id = ?
        GROUP BY emoji
      `,
      id
    );

    const reactionsMap: any = {};
    reactions.forEach(r => {
      reactionsMap[r.emoji] = Number(r.count);
    });

    console.log(`[likeComment] 返回成功响应: commentId=${id}`);
    res.json({
      success: true,
      message: '点赞成功',
      data: updatedComments[0] ? buildCommentResponse({
        ...updatedComments[0],
        isLiked: true,
        reactions: reactionsMap
      }) : null,
    });
  } catch (error: any) {
    console.error('[likeComment] 点赞评论失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 取消点赞评论
 * DELETE /api/content/comments/:id/like
 */
export const unlikeComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    await ensurePostInteractionTables();

    console.log(`[unlikeComment] 开始处理取消点赞: commentId=${id}, userId=${req.user.id}`);

    // 验证评论是否存在
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_post_comments WHERE id = ?`,
      id
    );

    if (comments.length === 0) {
      console.log(`[unlikeComment] 评论不存在: ${id}`);
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    const deleted = await prisma.$executeRawUnsafe(
      `
        DELETE FROM community_comment_likes
        WHERE comment_id = ? AND user_id = ?
      `,
      id,
      req.user.id
    );

    console.log(`[unlikeComment] 删除点赞记录数: ${Number(deleted)}`);

    if (Number(deleted) > 0) {
      // 更新评论点赞数
      await prisma.$executeRawUnsafe(
        `
          UPDATE community_post_comments
          SET like_count = GREATEST(like_count - 1, 0)
          WHERE id = ?
        `,
        id
      );
    }

    // 获取更新后的评论信息
    const updatedComments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
        WHERE c.id = ?
        LIMIT 1
      `,
      id
    );

    // 获取该评论的所有表情统计
    const reactions = await prisma.$queryRawUnsafe<Array<{ emoji: string; count: bigint }>>(
      `
        SELECT emoji, COUNT(*) AS count
        FROM community_comment_reactions
        WHERE comment_id = ?
        GROUP BY emoji
      `,
      id
    );

    const reactionsMap: any = {};
    reactions.forEach(r => {
      reactionsMap[r.emoji] = Number(r.count);
    });

    console.log(`[unlikeComment] 返回成功响应: commentId=${id}`);
    res.json({
      success: true,
      message: '已取消点赞',
      data: updatedComments[0] ? buildCommentResponse({
        ...updatedComments[0],
        isLiked: false,
        reactions: reactionsMap
      }) : null,
    });
  } catch (error: any) {
    console.error('[unlikeComment] 取消点赞评论失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

// ==================== 评论表情功能 ====================

/**
 * 添加评论表情
 * POST /api/content/comments/:id/reactions
 */
export const addCommentReaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的表情',
      });
    }

    // 限制表情长度
    if (emoji.length > 32) {
      return res.status(400).json({
        success: false,
        message: '表情无效',
      });
    }

    await ensurePostInteractionTables();

    // 验证评论是否存在
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_post_comments WHERE id = ?`,
      id
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    // 检查是否已经添加过相同表情
    const existing = await prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_comment_reactions
        WHERE comment_id = ? AND user_id = ? AND emoji = ?
        LIMIT 1
      `,
      id,
      req.user.id,
      emoji
    );

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO community_comment_reactions (id, comment_id, user_id, emoji)
          VALUES (?, ?, ?, ?)
        `,
        randomUUID(),
        id,
        req.user.id,
        emoji
      );
    }

    // 获取评论的所有表情统计
    const reactions = await prisma.$queryRawUnsafe<Array<{ emoji: string; count: bigint }>>(
      `
        SELECT emoji, COUNT(*) AS count
        FROM community_comment_reactions
        WHERE comment_id = ?
        GROUP BY emoji
      `,
      id
    );

    const reactionsMap: any = {};
    reactions.forEach(r => {
      reactionsMap[r.emoji] = Number(r.count);
    });

    // 获取更新后的评论信息
    const updatedComments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
        WHERE c.id = ?
        LIMIT 1
      `,
      id
    );

    // 检查当前用户是否添加了该表情
    const hasReaction = existing.length > 0;

    res.json({
      success: true,
      message: '表情添加成功',
      data: {
        comment: updatedComments[0] ? buildCommentResponse({ ...updatedComments[0], isLiked: false, reactions: reactionsMap }) : null,
        added: hasReaction,
      },
    });
  } catch (error: any) {
    console.error('添加评论表情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 移除评论表情
 * DELETE /api/content/comments/:id/reactions 或 POST /api/content/comments/:id/reactions/remove
 */
export const removeCommentReaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    // 支持从 query 参数或 body 中获取 emoji
    const emoji = (req.query.emoji as string) || req.body.emoji;

    console.log(`[removeCommentReaction] 移除表情: commentId=${id}, emoji=${emoji}, userId=${req.user.id}`);

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供有效的表情',
      });
    }

    await ensurePostInteractionTables();

    // 验证评论是否存在
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_post_comments WHERE id = ?`,
      id
    );

    if (comments.length === 0) {
      console.log(`[removeCommentReaction] 评论不存在: ${id}`);
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    const deleted = await prisma.$executeRawUnsafe(
      `
        DELETE FROM community_comment_reactions
        WHERE comment_id = ? AND user_id = ? AND emoji = ?
      `,
      id,
      req.user.id,
      emoji
    );

    console.log(`[removeCommentReaction] 删除表情记录数: ${Number(deleted)}`);

    // 获取评论的所有表情统计
    const reactions = await prisma.$queryRawUnsafe<Array<{ emoji: string; count: bigint }>>(
      `
        SELECT emoji, COUNT(*) AS count
        FROM community_comment_reactions
        WHERE comment_id = ?
        GROUP BY emoji
      `,
      id
    );

    const reactionsMap: any = {};
    reactions.forEach(r => {
      reactionsMap[r.emoji] = Number(r.count);
    });

    // 获取更新后的评论信息
    const updatedComments = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
        WHERE c.id = ?
        LIMIT 1
      `,
      id
    );

    // 获取当前用户对该评论的点赞状态
    const liked = await prisma.$queryRawUnsafe<Array<{ matched: number }>>(
      `
        SELECT 1 AS matched
        FROM community_comment_likes
        WHERE comment_id = ? AND user_id = ?
        LIMIT 1
      `,
      id,
      req.user.id
    );

    console.log(`[removeCommentReaction] 返回成功响应: commentId=${id}`);
    res.json({
      success: true,
      message: '表情已移除',
      data: {
        comment: updatedComments[0] ? buildCommentResponse({
          ...updatedComments[0],
          isLiked: liked.length > 0,
          reactions: reactionsMap
        }) : null,
      },
    });
  } catch (error: any) {
    console.error('[removeCommentReaction] 移除评论表情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取评论的回复列表
 * GET /api/content/comments/:id/replies
 */
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    await ensurePostInteractionTables();

    // 验证父评论是否存在
    const parentComments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_post_comments WHERE id = ?`,
      id
    );

    if (parentComments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在',
      });
    }

    // 获取回复列表
    const replies = await prisma.$queryRawUnsafe<PostCommentRecord[]>(
      `
        SELECT
          c.id,
          c.content,
          c.created_at AS createdAt,
          c.parent_id AS parentId,
          c.reply_to_user_id AS replyToUserId,
          c.like_count AS likeCount,
          c.reply_count AS replyCount,
          u.id AS authorId,
          u.name AS authorName,
          u.avatar AS authorAvatar,
          reply_u.name AS replyToUserName
        FROM community_post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN users reply_u ON reply_u.id = c.reply_to_user_id
        WHERE c.parent_id = ?
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `,
      id,
      take,
      skip
    );

    // 获取总数
    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) AS count
        FROM community_post_comments
        WHERE parent_id = ?
      `,
      id
    );

    const total = Number(countRows[0]?.count ?? 0);

    // 获取回复的点赞状态和表情
    const replyIds = replies.map(r => r.id);
    let likedMap = new Map<string, boolean>();
    let reactionsMap = new Map<string, any>();

    if (req.user?.id && replyIds.length > 0) {
      const likedReplies = await prisma.$queryRawUnsafe<Array<{ commentId: string }>>(
        `
          SELECT comment_id AS commentId
          FROM community_comment_likes
          WHERE comment_id IN (${replyIds.map(() => '?').join(',')}) AND user_id = ?
        `,
        ...replyIds,
        req.user.id
      );
      likedReplies.forEach(r => likedMap.set(r.commentId, true));

      const replyReactions = await prisma.$queryRawUnsafe<Array<{ commentId: string; emoji: string; count: bigint }>>(
        `
          SELECT comment_id AS commentId, emoji, COUNT(*) AS count
          FROM community_comment_reactions
          WHERE comment_id IN (${replyIds.map(() => '?').join(',')})
          GROUP BY comment_id, emoji
        `,
        ...replyIds
      );
      replyReactions.forEach(r => {
        const current = reactionsMap.get(r.commentId) || {};
        current[r.emoji] = Number(r.count);
        reactionsMap.set(r.commentId, current);
      });
    }

    res.json({
      success: true,
      data: {
        list: replies.map(reply => buildCommentResponse({
          ...reply,
          isLiked: likedMap.get(reply.id) ?? false,
          reactions: reactionsMap.get(reply.id) ?? {},
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取评论回复失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};
