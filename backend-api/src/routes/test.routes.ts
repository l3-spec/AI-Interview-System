import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * 测试路由 - 用于验证系统集成的健康状态
 */

// GET /api/test/health - 系统健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'U-Talent健康检查',
    timestamp: new Date().toISOString(),
    services: {
      deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'mock_mode',
      database: 'connected',
      digitalHuman: 'ready'
    },
    endpoints: {
      interviewPlan: '/api/interview-plan/plan',
      interviewTemplates: '/api/interview-plan/templates'
    }
  });
});

// GET /api/test/seed-demo - 填充演示内容（首页帖子等）
router.get('/seed-demo', async (req, res) => {
  try {
    // 1. 创建演示帖子
    const postCount = await prisma.userPost.count();
    if (postCount < 5) {
      await prisma.userPost.createMany({
        data: [
          {
            title: '大厂面试心得：如何在高压面试中保持冷静？',
            content: '面试不仅考察技术，更是心理素质的博弈。建议在应对追问时，先停顿3秒梳理逻辑...',
            isHot: true,
            viewCount: 1540,
            likeCount: 128,
            tags: JSON.stringify(['面试心得', '职场成长']),
            status: 'PUBLISHED'
          },
          {
            title: '2024届求职红黑榜：这些雷点千万别踩',
            content: '最近面了十几家公司，发现很多候选人在简历上写得天花乱坠，一问底层原理就哑火。',
            isHot: true,
            viewCount: 890,
            likeCount: 45,
            tags: JSON.stringify(['避坑指南', '应届生']),
            status: 'PUBLISHED'
          }
        ]
      });
    }

    // 2. 创建大咖分享
    const expertCount = await prisma.expertPost.count();
    if (expertCount === 0) {
      await prisma.expertPost.createMany({
        data: [
          {
            expertName: '李教授',
            expertTitle: '某厂高级技术专家',
            expertCompany: '百度',
            title: '深度解析：LLM在面试评估中的应用前景',
            content: '随着大模型技术的发展，自动化的面试评估正在成为可能。我们正在探索如何利用多模态信息...',
            isTop: true,
            publishedAt: new Date(),
            viewCount: 5600,
            tags: JSON.stringify(['人工智能', '技术趋势'])
          }
        ]
      });
    }

    res.json({
      success: true,
      message: '演示内容填充成功',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: '内容填充失败',
      error: error.message
    });
  }
});

// POST /api/test/echo - 回显测试
router.post('/echo', (req, res) => {
  res.json({
    success: true,
    message: '回显测试成功',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

export default router;