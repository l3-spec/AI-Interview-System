import express, { Request } from 'express';
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  getCompanyStats
} from '../controllers/companyController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkAuth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: 'user' | 'company' | 'admin';
  };
}

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/company/profile:
 *   get:
 *     summary: 获取企业信息
 *     tags: [企业管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/profile', authenticateToken, getCompanyProfile);

/**
 * @swagger
 * /api/company/profile:
 *   put:
 *     summary: 更新企业信息
 *     tags: [企业管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               industry:
 *                 type: string
 *               scale:
 *                 type: string
 *               address:
 *                 type: string
 *               website:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/profile', authenticateToken, updateCompanyProfile);

/**
 * @swagger
 * /api/company/upload-logo:
 *   post:
 *     summary: 上传企业logo
 *     tags: [企业管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 上传成功
 */
router.post('/upload-logo', authenticateToken, upload.single('logo'), uploadCompanyLogo);

/**
 * @swagger
 * /api/company/stats:
 *   get:
 *     summary: 获取企业统计数据
 *     tags: [企业管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/stats', authenticateToken, getCompanyStats);

// 企业注册
router.post('/register', async (req, res) => {
  try {
    const { companyName, contactName, contactPhone, email, password } = req.body;

    // 检查邮箱是否已存在
    const existingCompany = await prisma.company.findUnique({
      where: { email }
    });

    if (existingCompany) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建企业账号
    const company = await prisma.company.create({
      data: {
        name: companyName,
        email,
        password: hashedPassword,
        contact: contactPhone,
        description: '',
        isVerified: false,
        isActive: true,
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天试用期
      }
    });

    res.status(201).json({
      message: '注册成功',
      company: {
        id: company.id,
        name: company.name,
        email: company.email
      }
    });
  } catch (error) {
    console.error('企业注册失败:', error);
    res.status(500).json({ message: '注册失败，请稍后重试' });
  }
});

// 企业登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找企业
    const company = await prisma.company.findUnique({
      where: { email }
    });

    if (!company) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, company.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        id: company.id,
        email: company.email,
        type: 'company'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        isVerified: company.isVerified,
        isActive: company.isActive
      }
    });
  } catch (error) {
    console.error('企业登录失败:', error);
    res.status(500).json({ message: '登录失败，请稍后重试' });
  }
});

// 获取企业信息
router.get('/profile', checkAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        description: true,
        industry: true,
        scale: true,
        address: true,
        website: true,
        isVerified: true,
        isActive: true,
        subscriptionEndDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!company) {
      return res.status(404).json({ message: '企业不存在' });
    }

    res.json(company);
  } catch (error) {
    console.error('获取企业信息失败:', error);
    res.status(500).json({ message: '获取企业信息失败' });
  }
});

// 更新企业信息
router.put('/profile', checkAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }

    const { name, contact, description, industry, scale, address, website } = req.body;

    const company = await prisma.company.update({
      where: { id: req.user.id },
      data: {
        name,
        contact,
        description,
        industry,
        scale,
        address,
        website
      }
    });

    res.json({
      message: '更新成功',
      company
    });
  } catch (error) {
    console.error('更新企业信息失败:', error);
    res.status(500).json({ message: '更新失败，请稍后重试' });
  }
});

// 检查企业权限
router.get('/check-permissions', checkAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: '企业不存在' });
    }

    const now = new Date();
    const subscriptionEnd = company.subscriptionEndDate;
    const isSubscriptionValid = subscriptionEnd && subscriptionEnd > now;

    res.json({
      canPublishJobs: company.isVerified && company.isActive,
      canReceiveApplications: isSubscriptionValid && company.isActive,
      canSendInvitations: isSubscriptionValid && company.isActive,
      isVerified: company.isVerified,
      isActive: company.isActive,
      subscriptionEndDate: company.subscriptionEndDate
    });
  } catch (error) {
    console.error('检查企业权限失败:', error);
    res.status(500).json({ message: '检查权限失败' });
  }
});

export default router; 