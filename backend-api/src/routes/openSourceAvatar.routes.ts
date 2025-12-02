import { Router } from 'express';
import { openSourceAvatarController } from '../controllers/openSourceAvatarController';

const router = Router();

// 开源数字人路由
router.get('/status', openSourceAvatarController.getAvatarStatus);
router.get('/models', openSourceAvatarController.getAvailableModels);
router.get('/config', openSourceAvatarController.getServerConfig);
router.get('/', openSourceAvatarController.getAvatarPage);

export default router;