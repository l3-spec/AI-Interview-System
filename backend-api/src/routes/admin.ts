import express from 'express';
import {
  getUsers,
  getCompanies,
  updateUserStatus,
  updateCompanyStatus,
  extendSubscription,
  getDashboardStats,
  getSystemLogs,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getJobs,
  updateJobStatus,
  getJobById,
  deleteJob,
  getJobStats,
  adminLogin,
  getCompanyDetail
} from '../controllers/adminController';
import { adminAuth, requireRole, requirePermission } from '../middleware/adminAuth';
import { body, query, param } from 'express-validator';
import { validate } from '../utils/validation';
import {
  listHomeBanners,
  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
  updateHomeBannerStatus,
  reorderHomeBanners,
  listPromotedJobsAdmin,
  createPromotedJob,
  updatePromotedJob,
  deletePromotedJob,
  listCompanyShowcases,
  upsertCompanyShowcase,
  deleteCompanyShowcase,
} from '../controllers/homeContentAdminController';
import {
  listJobDictionaryCategories,
  getJobDictionaryCategory,
  createJobDictionaryCategory,
  updateJobDictionaryCategory,
  deleteJobDictionaryCategory,
  listJobDictionaryPositions,
  getJobDictionaryPosition,
  createJobDictionaryPosition,
  updateJobDictionaryPosition,
  deleteJobDictionaryPosition,
} from '../controllers/jobDictionaryAdminController';
import {
  listAssessmentCategories,
  getActiveAssessmentCategories,
  createAssessmentCategory,
  updateAssessmentCategory,
  deleteAssessmentCategory,
  listAssessments,
  getAssessmentDetail,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '../controllers/assessmentAdminController';

const router = express.Router();

// 管理员登录（不需要认证）
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  validate
], adminLogin);

// 所有路由都需要管理员认证
router.use(adminAuth);

// Dashboard 统计数据
router.get('/dashboard/stats', [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('时间范围参数无效'),
  validate
], getDashboardStats);

// 用户管理
router.get('/users', [
  requirePermission('user:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  query('isVerified').optional().isBoolean().withMessage('认证状态必须是布尔值'),
  validate
], getUsers);

router.patch('/users/:userId/status', [
  requirePermission('user:write'),
  param('userId').isUUID().withMessage('用户ID格式错误'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  body('isVerified').optional().isBoolean().withMessage('认证状态必须是布尔值'),
  validate
], updateUserStatus);

// 企业用户管理
router.get('/companies', [
  requirePermission('company:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  query('isVerified').optional().isBoolean().withMessage('认证状态必须是布尔值'),
  query('subscriptionStatus').optional().isIn(['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED']).withMessage('订阅状态参数无效'),
  validate
], getCompanies);

router.get('/companies/:companyId', [
  requirePermission('company:read'),
  param('companyId').isUUID().withMessage('企业ID格式错误'),
  validate
], getCompanyDetail);

router.patch('/companies/:companyId/status', [
  requirePermission('company:write'),
  param('companyId').isUUID().withMessage('企业ID格式错误'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  body('isVerified').optional().isBoolean().withMessage('认证状态必须是布尔值'),
  validate
], updateCompanyStatus);

// 订阅管理
router.post('/companies/:companyId/extend-subscription', [
  requirePermission('subscription:write'),
  param('companyId').isUUID().withMessage('企业ID格式错误'),
  body('days').isInt({ min: 1, max: 365 }).withMessage('展期天数必须在1-365之间'),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('展期原因必须填写且不超过500字符'),
  validate
], extendSubscription);

// 系统日志管理
router.get('/logs', [
  requirePermission('log:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('result').optional().isIn(['SUCCESS', 'FAILED', 'WARNING']).withMessage('结果状态参数无效'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式错误'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式错误'),
  validate
], getSystemLogs);

// 管理员管理
router.get('/admins', [
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']).withMessage('角色参数无效'),
  query('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  validate
], getAdmins);

router.post('/admins', [
  requireRole(['SUPER_ADMIN']),
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 8 }).withMessage('密码至少8位'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('姓名必须填写且不超过100字符'),
  body('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']).withMessage('角色参数无效'),
  body('permissions').optional().isArray().withMessage('权限必须是数组'),
  validate
], createAdmin);

router.patch('/admins/:adminId', [
  requireRole(['SUPER_ADMIN']),
  param('adminId').isUUID().withMessage('管理员ID格式错误'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('姓名不能为空且不超过100字符'),
  body('role').optional().isIn(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']).withMessage('角色参数无效'),
  body('permissions').optional().isArray().withMessage('权限必须是数组'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  validate
], updateAdmin);

router.delete('/admins/:adminId', [
  requireRole(['SUPER_ADMIN']),
  param('adminId').isUUID().withMessage('管理员ID格式错误'),
  validate
], deleteAdmin);

// 职位管理
router.get('/jobs', [
  requirePermission('job:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('status').optional().isIn(['ACTIVE', 'PAUSED', 'CLOSED']).withMessage('职位状态参数无效'),
  query('companyId').optional().isUUID().withMessage('企业ID格式错误'),
  validate
], getJobs);

router.get('/jobs/stats', [
  requirePermission('job:read'),
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('时间范围参数无效'),
  validate
], getJobStats);

router.get('/jobs/:jobId', [
  requirePermission('job:read'),
  param('jobId').isUUID().withMessage('职位ID格式错误'),
  validate
], getJobById);

router.patch('/jobs/:jobId/status', [
  requirePermission('job:write'),
  param('jobId').isUUID().withMessage('职位ID格式错误'),
  body('status').isIn(['ACTIVE', 'PAUSED', 'CLOSED']).withMessage('职位状态参数无效'),
  body('reason').optional().isLength({ max: 500 }).withMessage('原因不超过500字符'),
  validate
], updateJobStatus);

router.delete('/jobs/:jobId', [
  requirePermission('job:delete'),
  param('jobId').isUUID().withMessage('职位ID格式错误'),
  body('reason').optional().isLength({ max: 500 }).withMessage('删除原因不超过500字符'),
  validate
], deleteJob);

// 职岗字典管理 - 分类
router.get('/job-dictionary/categories', [
  requirePermission('job:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('includePositions').optional().isBoolean().withMessage('参数必须是布尔值'),
  query('includeInactive').optional().isBoolean().withMessage('参数必须是布尔值'),
  validate
], listJobDictionaryCategories);

router.get('/job-dictionary/categories/:id', [
  requirePermission('job:read'),
  param('id').isUUID().withMessage('分类ID格式错误'),
  validate
], getJobDictionaryCategory);

router.post('/job-dictionary/categories', [
  requirePermission('job:write'),
  body('code').isLength({ min: 1 }).withMessage('编码不能为空'),
  body('name').isLength({ min: 1 }).withMessage('名称不能为空'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], createJobDictionaryCategory);

router.put('/job-dictionary/categories/:id', [
  requirePermission('job:write'),
  param('id').isUUID().withMessage('分类ID格式错误'),
  body('code').optional().isLength({ min: 1 }).withMessage('编码不能为空'),
  body('name').optional().isLength({ min: 1 }).withMessage('名称不能为空'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], updateJobDictionaryCategory);

router.delete('/job-dictionary/categories/:id', [
  requirePermission('job:write'),
  param('id').isUUID().withMessage('分类ID格式错误'),
  validate
], deleteJobDictionaryCategory);

// 职岗字典管理 - 职岗
router.get('/job-dictionary/positions', [
  requirePermission('job:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('includeInactive').optional().isBoolean().withMessage('参数必须是布尔值'),
  query('categoryId').optional().isUUID().withMessage('分类ID格式错误'),
  validate
], listJobDictionaryPositions);

router.get('/job-dictionary/positions/:id', [
  requirePermission('job:read'),
  param('id').isUUID().withMessage('职岗ID格式错误'),
  validate
], getJobDictionaryPosition);

router.post('/job-dictionary/positions', [
  requirePermission('job:write'),
  body('categoryId').isUUID().withMessage('分类ID格式错误'),
  body('code').isLength({ min: 1 }).withMessage('编码不能为空'),
  body('name').isLength({ min: 1 }).withMessage('名称不能为空'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  validate
], createJobDictionaryPosition);

router.put('/job-dictionary/positions/:id', [
  requirePermission('job:write'),
  param('id').isUUID().withMessage('职岗ID格式错误'),
  body('categoryId').optional().isUUID().withMessage('分类ID格式错误'),
  body('code').optional().isLength({ min: 1 }).withMessage('编码不能为空'),
  body('name').optional().isLength({ min: 1 }).withMessage('名称不能为空'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  validate
], updateJobDictionaryPosition);

router.delete('/job-dictionary/positions/:id', [
  requirePermission('job:write'),
  param('id').isUUID().withMessage('职岗ID格式错误'),
  validate
], deleteJobDictionaryPosition);

// 首页内容管理 - Banner
router.get('/home/banners', [
  requirePermission('content:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], listHomeBanners);

router.post('/home/banners', [
  requirePermission('content:write'),
  body('title').isLength({ min: 1, max: 100 }).withMessage('标题不能为空且不超过100字符'),
  body('subtitle').isLength({ min: 1, max: 150 }).withMessage('副标题不能为空且不超过150字符'),
  body('imageUrl').isURL().withMessage('请提供有效的图片链接'),
  body('sortOrder').optional().isInt({ min: 0, max: 1000 }).withMessage('排序值必须在0-1000之间'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], createHomeBanner);

router.put('/home/banners/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('Banner ID 格式错误'),
  body('title').optional().isLength({ min: 1, max: 100 }).withMessage('标题不超过100字符'),
  body('subtitle').optional().isLength({ min: 1, max: 150 }).withMessage('副标题不超过150字符'),
  body('imageUrl').optional().isURL().withMessage('请提供有效的图片链接'),
  body('sortOrder').optional().isInt({ min: 0, max: 1000 }).withMessage('排序值必须在0-1000之间'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], updateHomeBanner);

router.patch('/home/banners/:id/status', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('Banner ID 格式错误'),
  body('isActive').isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], updateHomeBannerStatus);

router.delete('/home/banners/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('Banner ID 格式错误'),
  validate
], deleteHomeBanner);

router.post('/home/banners/reorder', [
  requirePermission('content:write'),
  body('orders').isArray({ min: 1 }).withMessage('排序数据不能为空'),
  body('orders.*.id').isUUID().withMessage('Banner ID 格式错误'),
  body('orders.*.sortOrder').isInt({ min: 0, max: 1000 }).withMessage('排序值必须在0-1000之间'),
  validate
], reorderHomeBanners);

// 首页内容管理 - 推广职位
router.get('/home/promoted-jobs', [
  requirePermission('content:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  query('promotionType').optional().isString().withMessage('推广类型参数无效'),
  validate
], listPromotedJobsAdmin);

router.post('/home/promoted-jobs', [
  requirePermission('content:write'),
  body('jobId').isUUID().withMessage('职位ID格式错误'),
  body('promotionType').optional().isIn(['NORMAL', 'PREMIUM', 'FEATURED']).withMessage('推广类型参数无效'),
  body('displayFrequency').optional().isInt({ min: 1, max: 50 }).withMessage('展示频率必须在1-50之间'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('优先级必须在0-100之间'),
  body('startDate').isISO8601().withMessage('开始时间格式错误'),
  body('endDate').isISO8601().withMessage('结束时间格式错误'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], createPromotedJob);

router.put('/home/promoted-jobs/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('推广职位ID格式错误'),
  body('promotionType').optional().isIn(['NORMAL', 'PREMIUM', 'FEATURED']).withMessage('推广类型参数无效'),
  body('displayFrequency').optional().isInt({ min: 1, max: 50 }).withMessage('展示频率必须在1-50之间'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('优先级必须在0-100之间'),
  body('startDate').optional().isISO8601().withMessage('开始时间格式错误'),
  body('endDate').optional().isISO8601().withMessage('结束时间格式错误'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], updatePromotedJob);

router.delete('/home/promoted-jobs/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('推广职位ID格式错误'),
  validate
], deletePromotedJob);

router.get('/home/company-showcases', [
  requirePermission('content:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  validate
], listCompanyShowcases);

router.post('/home/company-showcases', [
  requirePermission('content:write'),
  body('companyId').isUUID().withMessage('企业ID格式错误'),
  body('role').optional().isString().isLength({ max: 100 }).withMessage('角色描述不超过100字符'),
  body('hiringCount').optional().isInt({ min: 0, max: 9999 }).withMessage('招聘人数范围无效'),
  body('sortOrder').optional().isInt({ min: 0, max: 1000 }).withMessage('排序值必须在0-1000之间'),
  validate
], upsertCompanyShowcase);

router.delete('/home/company-showcases/:companyId', [
  requirePermission('content:write'),
  param('companyId').isUUID().withMessage('企业ID格式错误'),
  validate
], deleteCompanyShowcase);

// ==================== 测评管理 ====================

// 测评分类管理
router.get('/assessments/categories', [
  requirePermission('content:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], listAssessmentCategories);

router.get('/assessments/categories/active', [
  requirePermission('content:read'),
  validate
], getActiveAssessmentCategories);

router.post('/assessments/categories', [
  requirePermission('content:write'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('分类名称不能为空且不超过100字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述不超过500字符'),
  body('icon').optional().isString().withMessage('图标参数无效'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], createAssessmentCategory);

router.put('/assessments/categories/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('分类ID格式错误'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('分类名称不能为空且不超过100字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述不超过500字符'),
  body('icon').optional().isString().withMessage('图标参数无效'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('isActive').optional().isBoolean().withMessage('状态参数必须是布尔值'),
  validate
], updateAssessmentCategory);

router.delete('/assessments/categories/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('分类ID格式错误'),
  validate
], deleteAssessmentCategory);

// 测评管理
router.get('/assessments', [
  requirePermission('content:read'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('categoryId').optional().isUUID().withMessage('分类ID格式错误'),
  query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('状态参数无效'),
  query('difficulty').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('难度参数无效'),
  validate
], listAssessments);

router.get('/assessments/:id', [
  requirePermission('content:read'),
  param('id').isUUID().withMessage('测评ID格式错误'),
  validate
], getAssessmentDetail);

router.post('/assessments', [
  requirePermission('content:write'),
  body('categoryId').isUUID().withMessage('分类ID格式错误'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题不能为空且不超过200字符'),
  body('description').optional().isLength({ max: 2000 }).withMessage('描述不超过2000字符'),
  body('coverImage').optional().isURL().withMessage('封面图片URL格式错误'),
  body('durationMinutes').optional().isInt({ min: 1, max: 300 }).withMessage('时长必须在1-300分钟之间'),
  body('difficulty').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('难度参数无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('状态参数无效'),
  body('isHot').optional().isBoolean().withMessage('热门状态必须是布尔值'),
  validate
], createAssessment);

router.put('/assessments/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('测评ID格式错误'),
  body('categoryId').optional().isUUID().withMessage('分类ID格式错误'),
  body('title').optional().isLength({ min: 1, max: 200 }).withMessage('标题不能为空且不超过200字符'),
  body('description').optional().isLength({ max: 2000 }).withMessage('描述不超过2000字符'),
  body('coverImage').optional().isURL().withMessage('封面图片URL格式错误'),
  body('durationMinutes').optional().isInt({ min: 1, max: 300 }).withMessage('时长必须在1-300分钟之间'),
  body('difficulty').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('难度参数无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('状态参数无效'),
  body('isHot').optional().isBoolean().withMessage('热门状态必须是布尔值'),
  validate
], updateAssessment);

router.delete('/assessments/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('测评ID格式错误'),
  validate
], deleteAssessment);

// 题目管理
router.post('/assessments/:assessmentId/questions', [
  requirePermission('content:write'),
  param('assessmentId').isUUID().withMessage('测评ID格式错误'),
  body('questionText').isLength({ min: 1 }).withMessage('题目内容不能为空'),
  body('questionType').optional().isIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']).withMessage('题目类型参数无效'),
  body('options').optional().isArray().withMessage('选项必须是数组'),
  body('correctAnswer').optional().isString().withMessage('正确答案参数无效'),
  body('score').optional().isInt({ min: 0 }).withMessage('分值必须是非负整数'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  validate
], createQuestion);

router.put('/assessments/questions/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('题目ID格式错误'),
  body('questionText').optional().isLength({ min: 1 }).withMessage('题目内容不能为空'),
  body('questionType').optional().isIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']).withMessage('题目类型参数无效'),
  body('options').optional().isArray().withMessage('选项必须是数组'),
  body('correctAnswer').optional().isString().withMessage('正确答案参数无效'),
  body('score').optional().isInt({ min: 0 }).withMessage('分值必须是非负整数'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  validate
], updateQuestion);

router.delete('/assessments/questions/:id', [
  requirePermission('content:write'),
  param('id').isUUID().withMessage('题目ID格式错误'),
  validate
], deleteQuestion);

router.post('/assessments/:assessmentId/questions/reorder', [
  requirePermission('content:write'),
  param('assessmentId').isUUID().withMessage('测评ID格式错误'),
  body('orders').isArray().withMessage('排序数据必须是数组'),
  validate
], reorderQuestions);

export default router; 
