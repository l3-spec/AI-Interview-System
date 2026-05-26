import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { interviewFlowService } from './services/flow-controller.service';
import { coordinatorService } from './services/coordinator.service';

dotenv.config();

import { initServiceLogger } from './utils/service-logger';
initServiceLogger('interview-service');

// Ensure coordinator service is initialized to listen to Redis
const _coordinator = coordinatorService;

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// 健康检查（含负载指标，供负载均衡器 / 监控大屏使用）
app.get('/health', (req, res) => {
  const metrics = coordinatorService.getLoadMetrics();
  res.json({
    status: metrics.isOverloaded ? 'overloaded' : 'ok',
    service: 'interview-service',
    uptime: process.uptime(),
    activeSessions: metrics.activeSessions,
    maxCapacity: metrics.maxCapacity,
    memoryUsageMB: metrics.memoryUsageMB,
    isOverloaded: metrics.isOverloaded,
  });
});

// 初始化会话 (用于 WebSocket 重置/续面)
app.post('/sessions/init', async (req, res) => {
  try {
    // 前置并发限流：超过上限时直接返回 503，客户端可根据 retryAfterSeconds 重试
    const metrics = coordinatorService.getLoadMetrics();
    if (metrics.isOverloaded) {
      return res.status(503).json({
        success: false,
        error: 'server_overloaded',
        message: '服务器繁忙，请稍后再试',
        retryAfterSeconds: 30,
        currentLoad: metrics.activeSessions,
        maxCapacity: metrics.maxCapacity,
      });
    }
    const { sessionId, userId, userName, targetJob, background } = req.body;
    const session = await interviewFlowService.initializeSession(sessionId, userId, userName, targetJob, background);
    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开始面试介绍阶段 (动态开场白)
app.post('/sessions/start-intro', async (req, res) => {
  try {
    const { userId, userName, isFirstTime } = req.body;
    const sessionId = await interviewFlowService.startIntroductionPhase(userId, userName, isFirstTime);
    res.json({ success: true, sessionId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 收集用户信息
app.post('/sessions/:sessionId/user-info', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const info = req.body;
    const userInfo = await interviewFlowService.collectUserInfo(sessionId, info);
    res.json({ success: true, userInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开始面试阶段 (生成题目)
app.post('/sessions/:sessionId/start-phase', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await interviewFlowService.startInterviewPhase(sessionId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 处理用户回答
app.post('/sessions/:sessionId/response', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;
    const result = await interviewFlowService.processUserResponse(sessionId, text);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开始下一轮
app.post('/sessions/:sessionId/next-round', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const nextRound = await interviewFlowService.startNextRound(sessionId);
    res.json({ success: true, nextRound });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 结束面试
app.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await interviewFlowService.endInterview(sessionId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取会话详情
app.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = interviewFlowService.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有会话
app.get('/sessions', (req, res) => {
  try {
    const sessions = interviewFlowService.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Interview Service 正在运行 - 端口: ${PORT}`);
});
