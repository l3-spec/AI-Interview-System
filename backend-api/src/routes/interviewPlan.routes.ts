import { Router } from 'express';
import { interviewPlanController } from '../controllers/interviewPlanController';

const router = Router();

/**
 * 面试规划相关路由
 */

// POST /api/interview/plan - 生成面试计划
router.post(
  '/plan',
  interviewPlanController.validateInterviewPlan,
  interviewPlanController.generateInterviewPlan
);

// GET /api/interview/templates - 获取面试模板
router.get(
  '/templates',
  interviewPlanController.getInterviewTemplates
);

export default router;