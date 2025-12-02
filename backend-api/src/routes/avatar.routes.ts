import express from 'express';
import { avatarController } from '../controllers/avatar.controller';

const router = express.Router();

/**
 * 数字人相关API路由
 * 使用 AIRI Web 会话管理的轻量实现
 */

// 启动数字人实例
router.post('/v1/avatar/start', avatarController.startAvatar);

// 停止数字人实例
router.post('/v1/avatar/stop', avatarController.stopAvatar);

// 发送文本到数字人
router.post('/v1/avatar/text', avatarController.sendText);

// 测试连接
router.post('/v1/avatar/test', avatarController.testConnection);

// 获取数字人状态
router.get('/v1/avatar/status/:sessionId', avatarController.getStatus);

// 获取可用数字人列表
router.get('/v1/avatar/avatars', avatarController.getAvailableAvatars);

// 获取可用声音列表
router.get('/v1/avatar/voices', avatarController.getAvailableVoices);

// 更新数字人配置
router.put('/v1/avatar/config', avatarController.updateConfig);

export default router;
