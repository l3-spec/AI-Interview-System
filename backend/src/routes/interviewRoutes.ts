import { Router } from 'express';
import { InterviewController, upload } from '../controllers/interviewController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有面试路由都需要认证
router.use(authenticateToken);

/**
 * 面试会话管理
 */
// 创建面试会话
router.post('/sessions', InterviewController.createSession);

// 获取面试问题
router.get('/sessions/:sessionId/questions', InterviewController.getQuestions);

// 获取面试状态
router.get('/sessions/:sessionId/status', InterviewController.getInterviewStatus);

// 提交回答视频
router.post('/sessions/:sessionId/questions/:questionId/answer', 
  upload.single('video'), 
  InterviewController.submitAnswer
);

// 完成面试
router.post('/sessions/:sessionId/complete', InterviewController.completeInterview);

// 获取评估报告
router.get('/sessions/:sessionId/report', InterviewController.getAssessmentReport);

export default router; 