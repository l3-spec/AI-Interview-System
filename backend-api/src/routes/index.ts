import express from 'express';
import authRoutes from './auth';
import interviewRoutes from './interview';
import adminRoutes from './admin';
import ossRoutes from './oss';
import companyRoutes from './company';
import jobRoutes from './jobs';
import candidateRoutes from './candidates';
import interviewsRoutes from './interviews';
import verificationRoutes from './verification';
import statsRoutes from './stats';
import uploadRoutes from './upload';
import userRoutes from './users';
import publicRoutes from './public';
import aiInterviewRoutes from './aiInterview';
import avatarRoutes from './avatar.routes';
import nlpRoutes from './nlpRoutes';
import interviewPlanRoutes from './interviewPlan.routes';
import testRoutes from './test.routes';
import openSourceAvatarRoutes from './openSourceAvatar.routes';
import assessmentRoutes from './assessment';
import contentRoutes from './content';
import homeFeedRoutes from './homeFeed';
import jobDictionaryRoutes from './jobDictionary';
import jobPreferenceRoutes from './jobPreferences';
import messageRoutes from './messages';
// voiceRoutes 已在 index.ts 中直接注册，避免重复注册
// import voiceRoutes from './voice.routes';

const router = express.Router();

// 健康检查路由
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由模块
router.use('/auth', authRoutes);               // 认证相关路由
router.use('/public', publicRoutes);           // 公开API路由（不需要认证）
router.use('/company', companyRoutes);         // 企业管理路由
router.use('/jobs', jobRoutes);                // 职岗管理路由
router.use('/candidates', candidateRoutes);    // 候选人管理路由
router.use('/interviews', interviewsRoutes);   // 面试管理路由（新版）
router.use('/interview', interviewRoutes);     // 面试相关路由（旧版，兼容）
router.use('/ai-interview', aiInterviewRoutes); // AI面试相关路由（新增）
router.use('/nlp', nlpRoutes);                 // NLP智能解析路由（新增）
router.use('/interview-plan', interviewPlanRoutes);
router.use('/test', testRoutes); // 面试规划路由（新增）
router.use('/verification', verificationRoutes); // 实名认证路由
router.use('/stats', statsRoutes);             // 统计数据路由
router.use('/upload', uploadRoutes);           // 文件上传路由
router.use('/files', uploadRoutes);            // 文件管理路由（别名）
router.use('/users', userRoutes);              // 用户管理路由
router.use('/admin', adminRoutes);             // 管理员相关路由
router.use('/oss', ossRoutes);                 // OSS相关路由
router.use('/avatar', avatarRoutes);            // 数字人API路由（AIRI Web 管理）
router.use('/avatar', openSourceAvatarRoutes); // 开源数字人静态资源
router.use('/assessments', assessmentRoutes);  // 职业测评路由（新增）
router.use('/content', contentRoutes);         // 内容社区路由（新增）
router.use('/home', homeFeedRoutes);           // 首页内容聚合路由（新增）
router.use('/job-dictionary', jobDictionaryRoutes); // 职岗字典路由（新增）
router.use('/job-preferences', jobPreferenceRoutes); // 职岗偏好路由（新增）
router.use('/messages', messageRoutes);        // 消息中心路由（新增）
// voiceRoutes 已在 index.ts 中直接注册到 /api/voice，避免重复注册

// API文档信息
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI面试系统API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      company: '/api/company',
      jobs: '/api/jobs',
      candidates: '/api/candidates',
      interviews: '/api/interviews',
      interview: '/api/interview',
      'ai-interview': '/api/ai-interview',
      'interview-plan': '/api/interview-plan',
      test: '/api/test',
      nlp: '/api/nlp',
      verification: '/api/verification',
      stats: '/api/stats',
      upload: '/api/upload',
      files: '/api/files',
      users: '/api/users',
      admin: '/api/admin',
      oss: '/api/oss',
      avatar: '/api/avatar',
      assessments: '/api/assessments',
      content: '/api/content',
      home: '/api/home',
      'job-dictionary': '/api/job-dictionary',
      'job-preferences': '/api/job-preferences',
      messages: '/api/messages'
    }
  });
});

export default router; 
