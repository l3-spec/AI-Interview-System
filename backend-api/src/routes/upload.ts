import express from 'express';
import {
  uploadFile,
  getFilePreview,
  downloadFile
} from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 上传文件
 *     tags: [文件上传]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [logo, license, resume, avatar]
 *     responses:
 *       200:
 *         description: 上传成功
 */
router.post('/', authenticateToken, upload.single('file'), uploadFile);

/**
 * @swagger
 * /api/files/preview/{filename}:
 *   get:
 *     summary: 文件预览
 *     tags: [文件管理]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名
 *     responses:
 *       200:
 *         description: 预览成功
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/files/preview/:filename', getFilePreview);

/**
 * @swagger
 * /api/files/download/{filename}:
 *   get:
 *     summary: 文件下载
 *     tags: [文件管理]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名
 *     responses:
 *       200:
 *         description: 下载成功
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/files/download/:filename', downloadFile);

export default router; 