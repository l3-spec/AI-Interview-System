import express from 'express';
import {
  registerUser,
  registerCompany,
  loginUser,
  loginCompany,
  loginAdmin,
  getCurrentUser,
  logout,
  sendLoginCode,
  deviceLogin
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginRateLimiter, strictRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register/user:
 *   post:
 *     summary: 用户注册 📝
 *     description: 注册新的求职者账号
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱
 *                 example: "newuser@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 密码（至少6位）
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 description: 真实姓名
 *                 example: "张三"
 *               phone:
 *                 type: string
 *                 description: 手机号码（可选）
 *                 example: "13800138000"
 *           examples:
 *             新用户注册:
 *               value:
 *                 email: "newuser@example.com"
 *                 password: "password123"
 *                 name: "张三"
 *                 phone: "13800138000"
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "注册成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "user-uuid"
 *       409:
 *         description: 用户已存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "邮箱已被注册"
 *       400:
 *         description: 参数错误
 */
router.post('/register/user', registerUser);

/**
 * @swagger
 * /api/auth/register/company:
 *   post:
 *     summary: 企业注册 🏢
 *     description: 注册新的企业账号
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 企业邮箱
 *                 example: "hr@company.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 密码（至少6位）
 *                 example: "company123"
 *               name:
 *                 type: string
 *                 description: 企业名称
 *                 example: "科技有限公司"
 *               description:
 *                 type: string
 *                 description: 企业简介（可选）
 *                 example: "专注于人工智能的科技企业"
 *               industry:
 *                 type: string
 *                 description: 所属行业（可选）
 *                 example: "信息技术"
 *           examples:
 *             新企业注册:
 *               value:
 *                 email: "hr@newcompany.com"
 *                 password: "company123"
 *                 name: "新科技有限公司"
 *                 description: "专注于人工智能的科技企业"
 *                 industry: "信息技术"
 *     responses:
 *       201:
 *         description: 企业注册成功
 *       409:
 *         description: 企业已存在
 */
router.post('/register/company', registerCompany);

/**
 * @swagger
 * /api/auth/login/user/code:
 *   post:
 *     summary: 发送登录验证码 📲
 *     description: 输入手机号后发送6位验证码，验证码5分钟内有效
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 11位手机号
 *                 example: "13800138000"
 *     responses:
 *       200:
 *         description: 验证码发送成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "验证码已发送"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresIn:
 *                       type: integer
 *                       description: 验证码有效时间（秒）
 *                       example: 300
 *                     resendIn:
 *                       type: integer
 *                       description: 冷却时间（秒）
 *                       example: 60
 *       429:
 *         description: 请求过于频繁
 */
router.post('/login/user/code', strictRateLimiter, sendLoginCode);

/**
 * @swagger
 * /api/auth/login/user/device:
 *   post:
 *     summary: 授权本机号码登录 📱
 *     description: 使用当前设备的本机号码完成一键登录，如首次使用会自动创建账号
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 11位手机号
 *                 example: "13800138000"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 手机号码无效
 *       403:
 *         description: 账号已被禁用
 */
router.post('/login/user/device', loginRateLimiter, deviceLogin);

/**
 * @swagger
 * /api/auth/login/user:
 *   post:
 *     summary: 手机验证码登录 🔑
 *     description: 输入手机号与验证码登录，如首次使用会自动创建账号
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             验证码登录:
 *               summary: 通过短信验证码完成登录
 *               value:
 *                 phone: "13800138000"
 *                 code: "123456"
 *     responses:
 *       200:
 *         description: 登录成功，返回JWT令牌
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               成功登录:
 *                 value:
 *                   success: true
 *                   message: "登录成功"
 *                   data:
 *                     token: "eyJhbGciOi..."
 *                     isNewUser: false
 *                     user:
 *                       id: "user-uuid"
 *                       phone: "13800138000"
 *                       name: "用户8000"
 *                       email: "phone_13800138000@auto-user.aiinterview.com"
 *       400:
 *         description: 手机号或验证码错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "验证码错误或已失效"
*       429:
 *         description: 登录尝试过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "请求过于频繁，请稍后再试"
 */
router.post('/login/user', loginRateLimiter, loginUser);

/**
 * @swagger
 * /api/auth/login/company:
 *   post:
 *     summary: 企业登录 🏢
 *     description: 企业用户登录系统
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             测试企业:
 *               summary: 使用测试企业账号登录
 *               value:
 *                 email: "company@example.com"
 *                 password: "company123"
 *     responses:
 *       200:
 *         description: 企业登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 邮箱或密码错误
 */
router.post('/login/company', loginRateLimiter, loginCompany);

/**
 * @swagger
 * /api/auth/login/admin:
 *   post:
 *     summary: 管理员登录 👑
 *     description: 系统管理员登录
 *     tags: [🔑 认证管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             管理员登录:
 *               value:
 *                 email: "admin@aiinterview.com"
 *                 password: "admin123"
 *     responses:
 *       200:
 *         description: 管理员登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 邮箱或密码错误
 */
router.post('/login/admin', loginRateLimiter, loginAdmin);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息 👤
 *     description: 获取当前登录用户的详细信息
 *     tags: [🔑 认证管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *             examples:
 *               用户信息:
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "user-uuid"
 *                     email: "test@example.com"
 *                     name: "测试用户"
 *                     avatar: null
 *                     type: "user"
 *       401:
 *         description: 未认证或令牌无效
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: 验证令牌有效性 ✅
 *     description: 检查JWT令牌是否有效
 *     tags: [🔑 认证管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *             examples:
 *               令牌有效:
 *                 value:
 *                   success: true
 *                   valid: true
 *                   user:
 *                     id: "user-uuid"
 *                     email: "test@example.com"
 *                     name: "测试用户"
 *       401:
 *         description: 令牌无效或已过期
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "令牌无效"
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.user
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出 🚪
 *     description: 用户安全登出系统
 *     tags: [🔑 认证管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "登出成功"
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/auth/test-token:
 *   post:
 *     summary: 生成测试令牌 🧪
 *     description: |
 *       **专用于API文档测试的接口**
 *       
 *       生成测试用的JWT令牌，无需真实登录
 *       - 仅在开发环境可用
 *       - 生成的令牌有效期较短（1小时）
 *       - **请复制生成的token，点击右上角"Authorize"按钮设置认证**
 *       
 *       📋 **使用步骤：**
 *       1. 点击下方"Try it out"按钮
 *       2. 选择用户类型并执行
 *       3. 复制返回的token值
 *       4. 点击页面右上角的🔒"Authorize"按钮
 *       5. 在弹窗中输入：`Bearer <复制的token>`
 *       6. 点击Authorize，现在可以测试需要认证的接口了
 *     tags: [🧪 测试工具]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [user, company, admin]
 *                 description: 用户类型
 *                 example: "user"
 *               userId:
 *                 type: string
 *                 description: 用户ID（可选，不填则自动生成）
 *                 example: "test-user-123"
 *           examples:
 *             测试用户令牌:
 *               summary: 生成普通用户测试令牌
 *               value:
 *                 userType: "user"
 *             测试企业令牌:
 *               summary: 生成企业用户测试令牌
 *               value:
 *                 userType: "company"
 *             测试管理员令牌:
 *               summary: 生成管理员测试令牌
 *               value:
 *                 userType: "admin"
 *     responses:
 *       200:
 *         description: 测试令牌生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "测试令牌生成成功"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci0xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoidXNlciIsImlhdCI6MTYzOTU2NzIwMCwiZXhwIjoxNjM5NTcwODAwfQ.signature"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "test-user-123"
 *                     email:
 *                       type: string
 *                       example: "test@example.com"
 *                     name:
 *                       type: string
 *                       example: "测试用户"
 *                     type:
 *                       type: string
 *                       example: "user"
 *                 instructions:
 *                   type: string
 *                   example: "复制上面的token，点击右上角Authorize按钮，输入: Bearer <token>"
 *             examples:
 *               用户令牌:
 *                 value:
 *                   success: true
 *                   message: "测试令牌生成成功"
 *                   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   user:
 *                     id: "test-user-123"
 *                     email: "test@example.com"
 *                     name: "测试用户"
 *                     type: "user"
 *                   instructions: "复制上面的token，点击右上角🔒Authorize按钮，输入: Bearer <token>"
 *       400:
 *         description: 参数错误
 *       403:
 *         description: 生产环境不允许使用此接口
 */
router.post('/test-token', (req, res) => {
  try {
    // 仅在开发环境允许
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: '生产环境不允许使用测试令牌接口'
      });
    }

    const { userType = 'user', userId } = req.body;

    // 生成测试用户数据
    const testUsers = {
      user: {
        id: userId || 'test-user-' + Date.now(),
        email: 'test@example.com',
        name: '测试用户',
        type: 'user'
      },
      company: {
        id: userId || 'test-company-' + Date.now(),
        email: 'company@example.com',
        name: '测试企业',
        type: 'company'
      },
      admin: {
        id: userId || 'test-admin-' + Date.now(),
        email: 'admin@example.com',
        name: '测试管理员',
        type: 'admin'
      }
    };

    const userData = testUsers[userType as keyof typeof testUsers];
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: '无效的用户类型，支持: user, company, admin'
      });
    }

    // 生成JWT令牌
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      userData,
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' } // 测试令牌1小时有效
    );

    res.json({
      success: true,
      message: '测试令牌生成成功',
      token,
      user: userData,
      instructions: '复制上面的token，点击右上角🔒Authorize按钮，输入: Bearer <token>'
    });

  } catch (error) {
    console.error('生成测试令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '生成测试令牌失败'
    });
  }
});

export default router; 
