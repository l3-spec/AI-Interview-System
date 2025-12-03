import { Router } from 'express';
import {
  getUserPosts,
  getUserPostDetail,
  getExpertPosts,
  getExpertPostDetail,
  getPromotedJobs,
  recordPromotedJobClick,
  createUserPost,
  getMyPosts,
} from '../controllers/contentController';
import { authenticateToken, optionalAuthenticate, requireUser } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';

const router = Router();

// 用户分享路由
router.get('/posts', optionalAuthenticate, getUserPosts);
router.get('/posts/:id', optionalAuthenticate, getUserPostDetail);
router.post(
  '/posts',
  authenticateToken,
  requireUser,
  uploadMultiple('postImages', 9),
  createUserPost
);
router.get('/my-posts', authenticateToken, requireUser, getMyPosts);

// 大咖分享路由
router.get('/expert-posts', getExpertPosts);
router.get('/expert-posts/:id', getExpertPostDetail);

// 推广职位路由
router.get('/promoted-jobs', getPromotedJobs);
router.post('/promoted-jobs/:id/click', recordPromotedJobClick);

export default router;
