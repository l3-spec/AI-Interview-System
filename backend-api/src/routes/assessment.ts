import { Router } from 'express';
import {
  getAssessmentCategories,
  getAssessmentsByCategory,
  getAssessmentDetail,
  submitAssessment,
  getUserAssessmentRecords,
  getAssessmentRecordDetail,
} from '../controllers/assessmentController';

const router = Router();

// 测评相关路由
router.get('/categories', getAssessmentCategories);
router.get('/categories/:categoryId/assessments', getAssessmentsByCategory);
router.get('/:id', getAssessmentDetail);
router.post('/:id/submit', submitAssessment);
router.get('/records/user/:userId', getUserAssessmentRecords);
router.get('/records/:recordId', getAssessmentRecordDetail);

export default router;

