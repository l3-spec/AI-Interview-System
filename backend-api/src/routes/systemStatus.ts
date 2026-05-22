import express from 'express';
import { SystemStatusController } from '../controllers/systemStatusController';

const router = express.Router();

/**
 * 系统状态监控路由
 * 用于 admin 端查询各微服务的健康状态
 */

// 获取所有服务状态
router.get('/status', SystemStatusController.getServicesStatus);

// 获取单个服务状态
router.get('/status/:serviceName', SystemStatusController.getServiceStatus);

export default router;
