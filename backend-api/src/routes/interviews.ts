import express from 'express';
import {
  getInterviews,
  getInterviewDetail,
  getInterviewById,
  createInterview,
  updateInterviewStatus,
  updateInterviewResult,
  getInterviewAssessment,
  getInterviewQAList,
  exportInterviewData
} from '../controllers/interviewController';
import { authenticateToken, auth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/interviews:
 *   get:
 *     summary: 获取面试列表（支持筛选和分页）
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 面试状态筛选
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: 部门筛选
 *       - in: query
 *         name: result
 *         schema:
 *           type: string
 *         description: 面试结果筛选
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', auth, getInterviews);

/**
 * @swagger
 * /api/interviews/{id}/detail:
 *   get:
 *     summary: 获取面试详情（包含能力评估和问答记录）
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/detail', auth, getInterviewDetail);

/**
 * @swagger
 * /api/interviews/{id}:
 *   get:
 *     summary: 获取面试基本信息
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id', auth, getInterviewById);

/**
 * @swagger
 * /api/interviews:
 *   post:
 *     summary: 创建面试
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - jobId
 *               - type
 *               - scheduledAt
 *             properties:
 *               userId:
 *                 type: string
 *               jobId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, AI_INTERVIEW]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               meetingUrl:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authenticateToken, createInterview);

/**
 * @swagger
 * /api/interviews/{id}/status:
 *   patch:
 *     summary: 更新面试状态
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/:id/status', authenticateToken, updateInterviewStatus);

/**
 * @swagger
 * /api/interviews/{id}/result:
 *   patch:
 *     summary: 更新面试结果
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - result
 *             properties:
 *               result:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/:id/result', authenticateToken, updateInterviewResult);

/**
 * @swagger
 * /api/interviews/{id}/assessment:
 *   get:
 *     summary: 获取能力评估详情
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/assessment', auth, getInterviewAssessment);

/**
 * @swagger
 * /api/interviews/{id}/qa:
 *   get:
 *     summary: 获取面试问答记录
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/qa', auth, getInterviewQAList);

/**
 * @swagger
 * /api/interviews/export:
 *   get:
 *     summary: 导出面试数据
 *     tags: [面试管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, csv]
 *         description: 导出格式
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
 *         description: 导出成功
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export', authenticateToken, exportInterviewData);

export default router; 
