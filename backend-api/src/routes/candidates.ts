import express from 'express';
import {
  getCandidates,
  getCandidateById,
  getCandidateInterviews,
  inviteCandidateInterview,
  updateCandidate,
  addCandidateNote,
  favoriteCandidate,
  unfavoriteCandidate
} from '../controllers/candidateController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/candidates:
 *   get:
 *     summary: 获取候选人列表
 *     tags: [候选人管理]
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
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: 技能筛选
 *       - in: query
 *         name: experience
 *         schema:
 *           type: string
 *         description: 经验筛选
 *       - in: query
 *         name: education
 *         schema:
 *           type: string
 *         description: 学历筛选
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', authenticateToken, getCandidates);

/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     summary: 获取候选人详情
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id', authenticateToken, getCandidateById);

/**
 * @swagger
 * /api/candidates/{id}/interviews:
 *   get:
 *     summary: 获取候选人面试记录
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id/interviews', authenticateToken, getCandidateInterviews);

/**
 * @swagger
 * /api/candidates/{id}/invite:
 *   post:
 *     summary: 邀请候选人面试
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *               - scheduledAt
 *               - type
 *             properties:
 *               jobId:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, AI_INTERVIEW]
 *               message:
 *                 type: string
 *               location:
 *                 type: string
 *               meetingUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: 邀请成功
 */
router.post('/:id/invite', authenticateToken, inviteCandidateInterview);

/**
 * @swagger
 * /api/candidates/{id}:
 *   put:
 *     summary: 更新候选人信息
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', authenticateToken, updateCandidate);

/**
 * @swagger
 * /api/candidates/{id}/notes:
 *   post:
 *     summary: 添加候选人备注
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: 添加成功
 */
router.post('/:id/notes', authenticateToken, addCandidateNote);

/**
 * @swagger
 * /api/candidates/{id}/favorite:
 *   post:
 *     summary: 收藏候选人
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     responses:
 *       200:
 *         description: 收藏成功
 */
router.post('/:id/favorite', authenticateToken, favoriteCandidate);

/**
 * @swagger
 * /api/candidates/{id}/favorite:
 *   delete:
 *     summary: 取消收藏候选人
 *     tags: [候选人管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 候选人ID
 *     responses:
 *       200:
 *         description: 取消收藏成功
 */
router.delete('/:id/favorite', authenticateToken, unfavoriteCandidate);

export default router; 