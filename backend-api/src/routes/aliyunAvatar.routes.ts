import { Router } from 'express';
import { aliyunAvatarController } from '../controllers/aliyunAvatar.controller';

const router = Router();

/**
 * 阿里云灵眸 Avatar 数字人路由
 * 所有端点都以 /api/v1/aliyun-avatar 为前缀
 */

// 创建聊天会话 (Android SDK 调用的核心接口)
router.post('/create-session', aliyunAvatarController.createChatSession.bind(aliyunAvatarController));

// 停止会话
router.post('/stop-session', aliyunAvatarController.stopSession.bind(aliyunAvatarController));

// 健康检查
router.get('/health', aliyunAvatarController.healthCheck.bind(aliyunAvatarController));

export default router;
