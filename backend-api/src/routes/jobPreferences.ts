import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { fetchJobPreferences, saveJobPreferences } from '../controllers/jobPreferenceController';

const router = express.Router();

/**
 * @swagger
 * /api/job-preferences:
 *   get:
 *     summary: 获取当前用户的意向职岗列表
 *     tags: [职岗偏好]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', authenticateToken, fetchJobPreferences);

/**
 * @swagger
 * /api/job-preferences:
 *   put:
 *     summary: 更新当前用户的意向职岗列表
 *     tags: [职岗偏好]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - positionIds
 *             properties:
 *               positionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 3
 *     responses:
 *       200:
 *         description: 保存成功
 */
router.put('/', authenticateToken, saveJobPreferences);

export default router;
