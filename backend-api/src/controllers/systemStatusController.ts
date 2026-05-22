import { Request, Response } from 'express';
import { serviceSupervisor } from '../services/service-supervisor';

/**
 * 系统状态监控控制器
 * 提供各微服务的健康状态查询接口
 */
export class SystemStatusController {
  /**
   * 获取所有服务状态
   * GET /api/system/status
   */
  static async getServicesStatus(req: Request, res: Response) {
    try {
      const services = serviceSupervisor.getServicesStatus();
      
      res.json({
        success: true,
        data: {
          services,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: '获取服务状态失败',
        error: error.message,
      });
    }
  }

  /**
   * 获取单个服务状态
   * GET /api/system/status/:serviceName
   */
  static async getServiceStatus(req: Request, res: Response) {
    try {
      const { serviceName } = req.params;
      const allServices = serviceSupervisor.getServicesStatus();
      const service = allServices.find(s => s.name === serviceName);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `服务 ${serviceName} 不存在`,
        });
      }

      res.json({
        success: true,
        data: {
          service,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: '获取服务状态失败',
        error: error.message,
      });
    }
  }
}
