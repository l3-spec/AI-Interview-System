import { Router } from 'express';
import {
  getUserPosts,
  getUserPostDetail,
  getUserPostEngagement,
  getUserPostComments,
  createUserPostComment,
  likeUserPost,
  unlikeUserPost,
  favoriteUserPost,
  unfavoriteUserPost,
  getExpertPosts,
  getExpertPostDetail,
  getExpertPostEngagement,
  getExpertPostComments,
  createExpertPostComment,
  likeExpertPost,
  unlikeExpertPost,
  favoriteExpertPost,
  unfavoriteExpertPost,
  getPromotedJobs,
  recordPromotedJobClick,
  createUserPost,
  getMyPosts,
  deleteMyPost,
  likeComment,
  unlikeComment,
  addCommentReaction,
  removeCommentReaction,
  getCommentReplies,
} from '../controllers/contentController';
import { authenticateToken, optionalAuthenticate, requireUser } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';

const router = Router();

// 用户分享路由
router.get('/posts', optionalAuthenticate, getUserPosts);
router.get('/posts/:id', optionalAuthenticate, getUserPostDetail);
router.get('/posts/:id/engagement', optionalAuthenticate, getUserPostEngagement);
router.get('/posts/:id/comments', optionalAuthenticate, getUserPostComments);
router.post('/posts/:id/comments', authenticateToken, requireUser, createUserPostComment);
router.post('/posts/:id/like', authenticateToken, requireUser, likeUserPost);
router.delete('/posts/:id/like', authenticateToken, requireUser, unlikeUserPost);
router.post('/posts/:id/favorite', authenticateToken, requireUser, favoriteUserPost);
router.delete('/posts/:id/favorite', authenticateToken, requireUser, unfavoriteUserPost);
router.post(
  '/posts',
  authenticateToken,
  requireUser,
  uploadMultiple('postImages', 9),
  createUserPost
);
router.delete('/posts/:id', authenticateToken, requireUser, deleteMyPost);
router.get('/my-posts', authenticateToken, requireUser, getMyPosts);

// 大咖分享路由
router.get('/expert-posts', getExpertPosts);
router.get('/expert-posts/:id', optionalAuthenticate, getExpertPostDetail);
router.get('/expert-posts/:id/engagement', optionalAuthenticate, getExpertPostEngagement);
router.get('/expert-posts/:id/comments', optionalAuthenticate, getExpertPostComments);
router.post('/expert-posts/:id/comments', authenticateToken, requireUser, createExpertPostComment);
router.post('/expert-posts/:id/like', authenticateToken, requireUser, likeExpertPost);
router.delete('/expert-posts/:id/like', authenticateToken, requireUser, unlikeExpertPost);
router.post('/expert-posts/:id/favorite', authenticateToken, requireUser, favoriteExpertPost);
router.delete('/expert-posts/:id/favorite', authenticateToken, requireUser, unfavoriteExpertPost);

// 推广职位路由
router.get('/promoted-jobs', getPromotedJobs);
router.post('/promoted-jobs/:id/click', recordPromotedJobClick);

// 评论通用路由
router.post('/comments/:id/like', authenticateToken, requireUser, likeComment);
router.delete('/comments/:id/like', authenticateToken, requireUser, unlikeComment);
router.post('/comments/:id/reactions', authenticateToken, requireUser, addCommentReaction);
// 同时支持 DELETE 和 POST 用于移除表情，避免 DELETE 带 body 的问题
router.delete('/comments/:id/reactions', authenticateToken, requireUser, removeCommentReaction);
router.post('/comments/:id/reactions/remove', authenticateToken, requireUser, removeCommentReaction);
router.get('/comments/:id/replies', optionalAuthenticate, getCommentReplies);

export default router;
