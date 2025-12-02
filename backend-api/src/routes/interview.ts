import express from 'express';
import { interviewController } from '../controllers/interviewController';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/interview/start:
 *   post:
 *     summary: 开始面试
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 example: "start"
 *               user_job_target:
 *                 type: string
 *                 example: "软件开发工程师"
 *               user_company_target:
 *                 type: string
 *                 example: "互联网公司"
 *               user_background:
 *                 type: string
 *                 example: "计算机相关专业"
 *     responses:
 *       200:
 *         description: 面试开始成功
 */
router.post('/start', interviewController.startInterview);

/**
 * @swagger
 * /api/interview/next:
 *   post:
 *     summary: 获取下一题
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 example: "next"
 *               session_id:
 *                 type: string
 *               last_answer:
 *                 type: string
 *               current_question_index:
 *                 type: number
 *     responses:
 *       200:
 *         description: 获取下一题成功
 */
router.post('/next', interviewController.getNextQuestion);

/**
 * @swagger
 * /api/interview/submit:
 *   post:
 *     summary: 提交面试结果
 *     tags: [Interview]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 example: "submit"
 *               session_id:
 *                 type: string
 *               video_url:
 *                 type: string
 *               interview_duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: 提交成功
 */
router.post('/submit', interviewController.submitInterview);

/**
 * @swagger
 * /api/interview/upload-video:
 *   post:
 *     summary: 上传面试视频
 *     tags: [Interview]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: video
 *         type: file
 *         required: true
 *         description: 面试视频文件
 *       - in: formData
 *         name: session_id
 *         type: string
 *         required: true
 *         description: 面试会话ID
 *       - in: formData
 *         name: question_index
 *         type: number
 *         required: true
 *         description: 题目索引
 *     responses:
 *       200:
 *         description: 上传成功
 */
router.post('/upload-video', upload.single('video'), interviewController.uploadVideo);

/**
 * @swagger
 * /api/interview/sessions:
 *   get:
 *     summary: 获取面试会话列表
 *     tags: [Interview]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/sessions', interviewController.getInterviewSessions);

/**
 * @swagger
 * /api/interview/session/{sessionId}:
 *   get:
 *     summary: 获取面试会话详情
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
router.get('/session/:sessionId', interviewController.getInterviewSession);

export default router; 