import express from 'express';
import {
  submitVerification,
  getVerificationStatus,
  getVerificationList,
  reviewVerification,
  getVerificationById
} from '../controllers/verificationController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/verification/submit:
 *   post:
 *     summary: 提交实名认证申请
 *     tags: [实名认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - businessLicense
 *               - legalPerson
 *               - registrationNumber
 *             properties:
 *               businessLicense:
 *                 type: string
 *                 format: binary
 *               legalPerson:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: 提交成功
 */
router.post('/submit', authenticateToken, upload.single('businessLicense'), submitVerification);

/**
 * @swagger
 * /api/verification/status:
 *   get:
 *     summary: 获取认证状态
 *     tags: [实名认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/status', authenticateToken, getVerificationStatus);

// 管理员端路由
/**
 * @swagger
 * /api/admin/verification/list:
 *   get:
 *     summary: 获取认证申请列表（管理员使用）
 *     tags: [实名认证管理]
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
 *         description: 认证状态
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/admin/list', authenticateToken, getVerificationList);

/**
 * @swagger
 * /api/admin/verification/{id}/review:
 *   post:
 *     summary: 审核认证申请（管理员使用）
 *     tags: [实名认证管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 认证申请ID
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
 *                 enum: [approved, rejected]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: 审核成功
 */
router.post('/admin/:id/review', authenticateToken, reviewVerification);

/**
 * @swagger
 * /api/admin/verification/{id}:
 *   get:
 *     summary: 获取认证申请详情（管理员使用）
 *     tags: [实名认证管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 认证申请ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/admin/:id', authenticateToken, getVerificationById);

export default router; 