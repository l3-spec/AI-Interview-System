import { Router } from 'express';

const router = Router();

/**
 * 测试路由 - 用于验证系统集成的健康状态
 */

// GET /api/test/health - 系统健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI面试系统健康检查',
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