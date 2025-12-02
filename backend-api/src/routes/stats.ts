import express from 'express';
import {
  getDashboardStats,
  getInterviewStats,
  getJobStats,
  getCandidateStats,
  getInterviewerStats
} from '../controllers/statsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/stats/dashboard:
 *   get:
 *     summary: 获取企业仪表板统计
 *     tags: [统计数据]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/dashboard', authenticateToken, getDashboardStats);

/**
 * @swagger
 * /api/stats/interviews:
 *   get:
 *     summary: 获取面试统计
 *     tags: [统计数据]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/interviews', authenticateToken, getInterviewStats);

/**
 * @swagger
 * /api/stats/jobs:
 *   get:
 *     summary: 获取职岗统计
 *     tags: [统计数据]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/jobs', authenticateToken, getJobStats);

/**
 * @swagger
 * /api/stats/candidates:
 *   get:
 *     summary: 获取候选人统计
 *     tags: [统计数据]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/candidates', authenticateToken, getCandidateStats);

/**
 * @swagger
 * /api/stats/interviewers:
 *   get:
 *     summary: 获取面试官统计
 *     tags: [统计数据]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/interviewers', authenticateToken, getInterviewerStats);

export default router; 