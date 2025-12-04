import express from 'express';
import { interviewFlowController } from '../controllers/interviewFlowController';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/interview/start:
 *   post:
 *     summary: 开始面试 (使用智能流程)
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               userName:
 *                 type: string
 *               isFirstTime:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 面试开始成功
 */
router.post('/start', interviewFlowController.startInterview);

/**
 * @swagger
 * /api/interview/:sessionId/info:
 *   post:
 *     summary: 收集用户信息
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetJob:
 *                 type: string
 *               background:
 *                 type: string
 *               experience:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 信息收集成功
 */
router.post('/:sessionId/info', interviewFlowController.collectUserInfo);

/**
 * @swagger
 * /api/interview/:sessionId/phase:
 *   post:
 *     summary: 开始面试第二阶段
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 面试阶段开始成功
 */
router.post('/:sessionId/phase', interviewFlowController.startInterviewPhase);

/**
 * @swagger
 * /api/interview/:sessionId/next:
 *   post:
 *     summary: 获取下一题 (智能流程控制)
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.post('/:sessionId/next', interviewFlowController.startNextRound);

/**
 * @swagger
 * /api/interview/:sessionId/response:
 *   post:
 *     summary: 提交用户回答 (智能分析)
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: 回答提交成功
 */
router.post('/:sessionId/response', interviewFlowController.processUserResponse);

/**
 * @swagger
 * /api/interview/:sessionId/end:
 *   post:
 *     summary: 结束面试 (动态结束语)
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 面试结束成功
 */
router.post('/:sessionId/end', interviewFlowController.endInterview);

/**
 * @swagger
 * /api/interview/:sessionId/status:
 *   get:
 *     summary: 获取会话状态
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:sessionId/status', interviewFlowController.getSessionStatus);

/**
 * @swagger
 * /api/interview/sessions:
 *   get:
 *     summary: 获取所有会话
 *     tags: [Interview]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/sessions', interviewFlowController.getAllSessions);

/**
 * @swagger
 * /api/interview/:sessionId/skip:
 *   post:
 *     summary: 跳过当前问题
 *     tags: [Interview]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 跳过成功
 */
router.post('/:sessionId/skip', interviewFlowController.skipQuestion);

export default router;