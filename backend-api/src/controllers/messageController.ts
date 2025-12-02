import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const MESSAGE_TYPES = ['SYSTEM', 'INTERACTION', 'SUPPORT'];
const MESSAGE_STATUS = ['UNREAD', 'READ', 'ARCHIVED'];

const normalizeType = (raw?: string | null) => {
  if (!raw) {
    return undefined;
  }
  const upper = raw.toUpperCase();
  return MESSAGE_TYPES.includes(upper) ? upper : undefined;
};

const normalizeStatus = (raw?: string | null) => {
  if (!raw) {
    return undefined;
  }
  const upper = raw.toUpperCase();
  return MESSAGE_STATUS.includes(upper) ? upper : undefined;
};

const truncateContent = (content: string, limit = 120) => {
  const trimmed = content.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}…`;
};

const parseJson = <T>(value?: string | null): T | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('消息元数据解析失败:', error);
    return null;
  }
};

const mapEntry = (entry: any) => ({
  id: entry.id,
  senderType: entry.senderType,
  senderId: entry.senderId,
  senderName: entry.senderName,
  content: entry.content,
  metadata: parseJson(entry.metadata),
  createdAt: entry.createdAt,
});

/**
 * 获取用户消息列表
 * GET /api/messages
 */
export const getUserMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { page = '1', pageSize = '20', type, status } = req.query;
    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedSize = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedSize;
    const take = parsedSize;

    const where: Prisma.UserMessageWhereInput = {
      userId: req.user.id,
    };

    const normalizedType = normalizeType(type as string | undefined);
    if (normalizedType) {
      where.type = normalizedType;
    }
    const normalizedStatus = normalizeStatus(status as string | undefined);
    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    const [messages, total] = await Promise.all([
      prisma.userMessage.findMany({
        where,
        skip,
        take,
        orderBy: { lastActivityAt: 'desc' },
        include: {
          entries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.userMessage.count({ where }),
    ]);

    const list = messages.map((message) => {
      const latestEntry = message.entries[0] ?? null;
      return {
        id: message.id,
        title: message.title,
        summary: message.summary ?? latestEntry?.content ?? '',
        type: message.type,
        status: message.status,
        unreadCount: message.unreadCount,
        lastActivityAt: message.lastActivityAt,
        lastReadAt: message.lastReadAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        latestEntry: latestEntry ? mapEntry(latestEntry) : null,
      };
    });

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parsedPage,
        pageSize: parsedSize,
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

/**
 * 获取消息详情
 * GET /api/messages/:id
 */
export const getMessageDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const message = await prisma.userMessage.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!message || message.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: '消息不存在',
      });
    }

    let effectiveReadAt = message.lastReadAt ?? new Date();

    if (message.status !== 'READ') {
      effectiveReadAt = new Date();
      await prisma.userMessage.update({
        where: { id: message.id },
        data: {
          status: 'READ',
          lastReadAt: effectiveReadAt,
          unreadCount: 0,
        },
      });
    }

    const entries = message.entries.map(mapEntry);

    res.json({
      success: true,
      data: {
        id: message.id,
        title: message.title,
        summary: message.summary,
        type: message.type,
        status: 'READ',
        unreadCount: 0,
        lastActivityAt: message.lastActivityAt,
        lastReadAt: effectiveReadAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        entries,
      },
    });
  } catch (error: any) {
    console.error('获取消息详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

/**
 * 创建留言
 * POST /api/messages
 */
export const createMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const rawTitle = typeof req.body.title === 'string' ? req.body.title : '';
    const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
    const type = normalizeType(req.body.type) ?? 'SUPPORT';

    const title = rawTitle.trim();
    const content = rawContent.trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '请输入留言标题',
      });
    }
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请输入留言内容',
      });
    }

    const now = new Date();
    const summary = truncateContent(content);

    const created = await prisma.userMessage.create({
      data: {
        userId: req.user.id,
        title,
        summary,
        type,
        status: 'READ',
        unreadCount: 0,
        lastActivityAt: now,
        lastReadAt: now,
        entries: {
          create: {
            senderType: 'USER',
            senderId: req.user.id,
            content,
          },
        },
      },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '留言创建成功',
      data: {
        id: created.id,
        title: created.title,
        summary: created.summary,
        type: created.type,
        status: created.status,
        unreadCount: created.unreadCount,
        lastActivityAt: created.lastActivityAt,
        lastReadAt: created.lastReadAt,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        entries: created.entries.map(mapEntry),
      },
    });
  } catch (error: any) {
    console.error('创建留言失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

/**
 * 回复消息
 * POST /api/messages/:id/reply
 */
export const replyMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
    const content = rawContent.trim();
    const metadata = req.body.metadata ? JSON.stringify(req.body.metadata) : undefined;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请输入回复内容',
      });
    }

    const message = await prisma.userMessage.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!message || message.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: '消息不存在',
      });
    }

    const now = new Date();

    const createdEntry = await prisma.userMessageEntry.create({
      data: {
        messageId: message.id,
        senderType: 'USER',
        senderId: req.user.id,
        content,
        metadata,
      },
    });

    await prisma.userMessage.update({
      where: { id: message.id },
      data: {
        summary: truncateContent(content),
        status: 'READ',
        unreadCount: 0,
        lastActivityAt: now,
        lastReadAt: now,
      },
    });

    res.status(201).json({
      success: true,
      message: '回复发送成功',
      data: mapEntry(createdEntry),
    });
  } catch (error: any) {
    console.error('回复消息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

/**
 * 标记消息为已读
 * PATCH /api/messages/:id/read
 */
export const markMessageRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    const { id } = req.params;
    const message = await prisma.userMessage.findUnique({
      where: { id },
    });

    if (!message || message.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: '消息不存在',
      });
    }

    const updated = await prisma.userMessage.update({
      where: { id },
      data: {
        status: 'READ',
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: '标记成功',
      data: {
        id: updated.id,
        status: updated.status,
        unreadCount: updated.unreadCount,
        lastReadAt: updated.lastReadAt,
      },
    });
  } catch (error: any) {
    console.error('标记消息为已读失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};
