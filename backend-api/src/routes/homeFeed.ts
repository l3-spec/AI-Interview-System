import { Router } from 'express';
import { getHomeFeed, getHomeBanners, getHomeFeaturedArticles } from '../controllers/homeFeedController';

const router = Router();

// 首页内容聚合路由
router.get('/feed', getHomeFeed);
router.get('/banners', getHomeBanners);
router.get('/featured-articles', getHomeFeaturedArticles);

export default router;
