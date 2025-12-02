import express from 'express';
import { ossController } from '../controllers/ossController';
import { uploadSingle } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/oss/sts-token:
 *   get:
 *     summary: 获取STS临时访问凭证
 *     tags: [OSS]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 面试会话ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID（可选）
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessKeyId:
 *                       type: string
 *                     accessKeySecret:
 *                       type: string
 *                     securityToken:
 *                       type: string
 *                     expiration:
 *                       type: string
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 面试会话不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/sts-token', ossController.getStsToken);

/**
 * @swagger
 * /api/oss/config:
 *   get:
 *     summary: 获取OSS配置信息
 *     tags: [OSS]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     endpoint:
 *                       type: string
 *                     bucketName:
 *                       type: string
 *                     region:
 *                       type: string
 *                     cdnDomain:
 *                       type: string
 */
router.get('/config', ossController.getOSSConfig);

/**
 * @swagger
 * /api/oss/upload-complete:
 *   post:
 *     summary: 通知视频上传完成
 *     tags: [OSS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - questionIndex
 *               - ossUrl
 *               - fileSize
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: 面试会话ID
 *               questionIndex:
 *                 type: integer
 *                 description: 题目索引，-1表示完整面试视频
 *               ossUrl:
 *                 type: string
 *                 description: OSS文件访问URL
 *               cdnUrl:
 *                 type: string
 *                 description: CDN访问URL（可选）
 *               fileSize:
 *                 type: integer
 *                 description: 文件大小（字节）
 *               duration:
 *                 type: integer
 *                 description: 视频时长（毫秒）
 *     responses:
 *       200:
 *         description: 处理成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 面试会话不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/upload-complete', ossController.uploadComplete);

/**
 * @swagger
 * /api/oss/upload-callback:
 *   post:
 *     summary: OSS上传回调处理
 *     tags: [OSS]
 *     description: 由阿里云OSS服务回调，客户端不应直接调用
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bucket:
 *                 type: string
 *               object:
 *                 type: string
 *               etag:
 *                 type: string
 *               size:
 *                 type: string
 *               mimeType:
 *                 type: string
 *     responses:
 *       200:
 *         description: 回调处理成功
 *       403:
 *         description: 签名验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/upload-callback', ossController.uploadCallback);

/**
 * @swagger
 * /api/oss/file-url:
 *   get:
 *     summary: 获取文件访问URL
 *     tags: [OSS]
 *     parameters:
 *       - in: query
 *         name: objectKey
 *         required: true
 *         schema:
 *           type: string
 *         description: OSS对象键名
 *       - in: query
 *         name: expires
 *         schema:
 *           type: integer
 *         description: URL过期时间（秒），提供则生成签名URL
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     expires:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/file-url', ossController.getFileUrl);

/**
 * @swagger
 * /api/oss/delete-file:
 *   delete:
 *     summary: 删除文件
 *     tags: [OSS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - objectKey
 *             properties:
 *               objectKey:
 *                 type: string
 *                 description: OSS对象键名
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 删除失败
 */
router.delete('/delete-file', ossController.deleteFile);

/**
 * @swagger
 * /api/oss/storage-stats:
 *   get:
 *     summary: 获取存储统计信息
 *     tags: [OSS]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFiles:
 *                       type: integer
 *                     totalSize:
 *                       type: integer
 *       500:
 *         description: 服务器错误
 */
router.get('/storage-stats', ossController.getStorageStats);

/**
 * @swagger
 * /api/oss/upload-file:
 *   post:
 *     summary: 上传文件到OSS
 *     tags: [OSS]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的文件
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/upload-file', uploadSingle('file'), ossController.uploadFile);

/**
 * @swagger
 * /api/oss/upload-base64:
 *   post:
 *     summary: 通过Base64字符串上传文件到OSS
 *     tags: [OSS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64Data
 *             properties:
 *               base64Data:
 *                 type: string
 *                 description: Base64编码的文件内容
 *               fileName:
 *                 type: string
 *                 description: 文件名 (可选)
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/upload-base64', ossController.uploadBase64);

export default router; 