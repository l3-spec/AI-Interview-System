import express from 'express';
import { getJobDictionary } from '../controllers/jobDictionaryController';

const router = express.Router();

/**
 * @swagger
 * /api/job-dictionary:
 *   get:
 *     summary: 获取两级职岗字典
 *     tags: [职岗字典]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: 是否包含未启用的分类和职岗
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', getJobDictionary);

export default router;
