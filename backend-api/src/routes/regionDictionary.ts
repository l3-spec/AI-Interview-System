import express from 'express';
import { getRegionTree, getSubRegions } from '../controllers/regionDictionaryController';

const router = express.Router();

/**
 * @swagger
 * /api/region-dictionary/tree:
 *   get:
 *     summary: 获取地区字级联树 🌲
 *     tags: [内容管理/字典]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/tree', getRegionTree);

/**
 * @swagger
 * /api/region-dictionary/subs:
 *   get:
 *     summary: 获取子地区列表 📍
 *     tags: [内容管理/字典]
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: 父级ID，不传获取一级(省)
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/subs', getSubRegions);

export default router;
