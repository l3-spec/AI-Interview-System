import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { normalizeStatus, normalizeType, truncateContent } from '../utils/messageUtils';
import { logSystemAction } from '../utils/systemLog';
import { prisma } from '../lib/prisma';

const buildMockMessages = () => {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return [
    {
      id: 'mock-1',
      title: '面试邀约：AI算法工程师',
      summary: '您好，我们邀请您参加一轮技术面试，时间可协商',
      type: 'INTERVIEW',
      status: 'UNREAD',
      unreadCount: 1,
      lastActivityAt: now,
      lastReadAt: null,
      createdAt: oneDayAgo,
      updatedAt: now,
      user: { id: 'u-1', name: '张三', email: 'zhangsan@example.com', phone: '13800000000' },
      entries: [
        {
          id: 'mock-entry-1',
          senderType: 'SYSTEM',
          senderId: 'system',
          senderName: '系统',
          content: '您好，我们邀请您参加一轮技术面试，时间可协商。',
          metadata: null,
          createdAt: now,
        },
      ],
    },
    {
      id: 'mock-2',
      title: '沟通消息：简历已收到',
      summary: '感谢投递，我们已收到您的简历',
      type: 'CHAT',
      status: 'READ',
      unreadCount: 0,
      lastActivityAt: twoHoursAgo,
      lastReadAt: twoHoursAgo,
      createdAt: oneDayAgo,
      updatedAt: twoHoursAgo,
      user: { id: 'u-2', name: '李四', email: 'lisi@example.com', phone: '13900000000' },
      entries: [
        {
          id: 'mock-entry-2',
          senderType: 'SUPPORT',
          senderId: 'admin-1',
          senderName: '客服小智',
          content: '感谢投递，我们已收到您的简历。',
          metadata: null,
          createdAt: twoHoursAgo,
        },
      ],
    },
  ];
};

const mapEntry = (entry: any) => ({
  id: entry.id,
  senderType: entry.senderType,
  senderId: entry.senderId,
  senderName: entry.senderName,
  content: entry.content,
  metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
  createdAt: entry.createdAt,
});

export const listMessagesAdmin = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      type,
      status,
      userId,
      search,
    } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedSize = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 100);
    const skip = (parsedPage - 1) * parsedSize;
    const take = parsedSize;

    const where: Prisma.UserMessageWhereInput = {};
    const normalizedType = normalizeType(type as string | undefined);
    if (normalizedType) where.type = normalizedType;
    const normalizedStatus = normalizeStatus(status as string | undefined);
    if (normalizedStatus) where.status = normalizedStatus;
    if (userId) where.userId = userId as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { summary: { contains: search as string } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.userMessage.findMany({
        where,
        skip,
        take,
        orderBy: { lastActivityAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          entries: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.userMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: messages.map((m) => ({
          id: m.id,
          title: m.title,
          summary: m.summary ?? m.entries[0]?.content ?? '',
          type: m.type,
          status: m.status,
          unreadCount: m.unreadCount,
          lastActivityAt: m.lastActivityAt,
          lastReadAt: m.lastReadAt,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          user: m.user,
        })),
        total,
        page: parsedPage,
        pageSize: parsedSize,
        hasMore: skip + take < total,
      },
    });
  } catch (error: any) {
    // 数据库还未创建相关表时返回模拟数据，避免前端空白
    if (error?.code === 'P2021' || error?.meta?.table === 'user_messages') {
      const mock = buildMockMessages();
      return res.json({
        success: true,
        message: '消息表未创建，返回模拟数据',
        data: {
          list: mock.map((m) => ({
            id: m.id,
            title: m.title,
            summary: m.summary,
            type: m.type,
            status: m.status,
            unreadCount: m.unreadCount,
            lastActivityAt: m.lastActivityAt,
            lastReadAt: m.lastReadAt,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            user: m.user,
          })),
          total: mock.length,
          page: 1,
          pageSize: mock.length,
          hasMore: false,
        },
      });
    }

    console.error('管理员获取消息列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

export const getMessageDetailAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await prisma.userMessage.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        entries: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!message) {
      return res.status(404).json({ success: false, message: '消息不存在' });
    }

    res.json({
      success: true,
      data: {
        id: message.id,
        title: message.title,
        summary: message.summary,
        type: message.type,
        status: message.status,
        unreadCount: message.unreadCount,
        lastActivityAt: message.lastActivityAt,
        lastReadAt: message.lastReadAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        user: message.user,
        entries: message.entries.map(mapEntry),
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2021' || error?.meta?.table === 'user_messages') {
      const mock = buildMockMessages();
      const target = mock.find((m) => m.id === req.params.id) || mock[0];
      if (!target) {
        return res.status(404).json({ success: false, message: '消息不存在' });
      }
      return res.json({
        success: true,
        message: '消息表未创建，返回模拟数据',
        data: {
          ...target,
          entries: target.entries.map(mapEntry),
        },
      });
    }

    console.error('管理员获取消息详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};

export const replyMessageAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    const { id } = req.params;
    const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
    const content = rawContent.trim();
    if (!content) {
      return res.status(400).json({ success: false, message: '请输入回复内容' });
    }

    const message = await prisma.userMessage.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ success: false, message: '消息不存在' });
    }

    const now = new Date();
    const senderName = (admin as any).name || admin.email || 'Admin';

    const createdEntry = await prisma.userMessageEntry.create({
      data: {
        messageId: message.id,
        senderType: 'SUPPORT',
        senderId: admin.id,
        senderName,
        content,
      },
    });

    const updated = await prisma.userMessage.update({
      where: { id: message.id },
      data: {
        summary: truncateContent(content),
        status: 'UNREAD',
        unreadCount: message.unreadCount + 1,
        lastActivityAt: now,
      },
    });

    await logSystemAction({
      adminId: admin.id,
      action: 'REPLY_MESSAGE',
      module: 'MESSAGE',
      description: `管理员回复消息 ${message.id}`,
      targetId: message.id,
      result: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: '回复成功',
      data: { entry: mapEntry(createdEntry), message: updated },
    });
  } catch (error: any) {
    console.error('管理员回复消息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message ?? 'Unknown error',
    });
  }
};
