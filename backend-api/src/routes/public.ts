import express from 'express';
import {
  getPublicJobs,
  getPublicJobById,
  getPublicJobSections,
  getPublicCompanyShowcases,
  getPublicCompanyById,
  applyForJob,
  getHomeFeed,
} from '../controllers/publicController';
import { authenticateToken } from '../middleware/auth';
import { getLatestAppVersion } from '../controllers/appVersionController';

const router = express.Router();

/**
 * @swagger
 * /api/public/jobs:
 *   get:
 *     summary: 获取公开职位列表
 *     tags: [公开接口]
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
 *         name: location
 *         schema:
 *           type: string
 *         description: 工作地点
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 工作类型
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: 职位级别
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/jobs', getPublicJobs);

/**
 * 获取岗位分区
 */
router.get('/jobs/sections', getPublicJobSections);

/**
 * @swagger
 * /api/public/jobs/{id}:
 *   get:
 *     summary: 获取公开职位详情
 *     tags: [公开接口]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职位ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/jobs/:id', getPublicJobById);

/**
 * 精选企业展示
 */
router.get('/companies/showcases', getPublicCompanyShowcases);

/**
 * 企业公开详情
 */
router.get('/companies/:id', getPublicCompanyById);

/**
 * @swagger
 * /api/public/jobs/{id}/apply:
 *   post:
 *     summary: 申请职位
 *     tags: [公开接口]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 职位ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: 申请留言
 *     responses:
 *       201:
 *         description: 申请成功
 */
router.post('/jobs/:id/apply', authenticateToken, applyForJob);

// 首页内容（横幅、评测、帖子、专家）
router.get('/home', getHomeFeed);

// 应用版本检测
router.get('/app-version', getLatestAppVersion);

export default router; 
