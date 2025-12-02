import express from 'express';
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getJobById,
  publishJob,
  pauseJob,
  closeJob,
  getJobCandidates,
  getJobInterviews,
  getJobStats
} from '../controllers/jobController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: 获取职岗列表
 *     tags: [职岗管理]
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
 *         description: 职岗状态
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', authenticateToken, getJobs);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: 创建职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - requirements
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               salary:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               level:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authenticateToken, createJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: 获取职岗详情
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id', authenticateToken, getJobById);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: 更新职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', authenticateToken, updateJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: 删除职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', authenticateToken, deleteJob);

/**
 * @swagger
 * /api/jobs/{id}/publish:
 *   patch:
 *     summary: 发布职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 发布成功
 */
router.patch('/:id/publish', authenticateToken, publishJob);

/**
 * @swagger
 * /api/jobs/{id}/pause:
 *   patch:
 *     summary: 暂停职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 暂停成功
 */
router.patch('/:id/pause', authenticateToken, pauseJob);

/**
 * @swagger
 * /api/jobs/{id}/close:
 *   patch:
 *     summary: 关闭职岗
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 关闭成功
 */
router.patch('/:id/close', authenticateToken, closeJob);

/**
 * @swagger
 * /api/jobs/{id}/candidates:
 *   get:
 *     summary: 获取职岗候选人列表
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/candidates', authenticateToken, getJobCandidates);

/**
 * @swagger
 * /api/jobs/{id}/interviews:
 *   get:
 *     summary: 获取职岗面试记录
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/interviews', authenticateToken, getJobInterviews);

/**
 * @swagger
 * /api/jobs/{id}/stats:
 *   get:
 *     summary: 获取职岗统计数据
 *     tags: [职岗管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职岗ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/stats', authenticateToken, getJobStats);

export default router; 