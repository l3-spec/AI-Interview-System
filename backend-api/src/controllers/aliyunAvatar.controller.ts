import { Request, Response } from 'express';
import { aliyunAvatarService } from '../services/aliyunAvatarService';

/**
 * 阿里云灵眸 Avatar 数字人控制器
 * 提供 CreateChatSession 等核心 API 端点
 * Android SDK 通过后端代理调用灵眸 API
 */
export class AliyunAvatarController {

  /**
   * 创建聊天会话
   * POST /api/v1/aliyun-avatar/create-session
   * 
   * Android SDK 调用此接口获取 RTC 连接信息
   * 请求体: { userId, platform?, deviceId? }
   * 响应体: { sessionId, rtcParams: { appId, channel, token, gslb, ... }, avatarAssets }
   */
  async createChatSession(req: Request, res: Response) {
    try {
      const { userId, platform, deviceId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId 是必填参数'
        });
      }

      const result = await aliyunAvatarService.createChatSession({
        userId,
        platform: platform || 'Android',
        deviceId
      });

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          rtcParams: result.rtcParams,
          avatarAssets: result.avatarAssets,
          expiredAt: result.expiredAt
        },
        message: '聊天会话创建成功'
      });

    } catch (error: any) {
      console.error('[AliyunAvatarController] CreateChatSession 失败:', error.message);
      res.status(500).json({
        success: false,
        error: '创建聊天会话失败',
        message: error.message
      });
    }
  }

  /**
   * 停止会话
   * POST /api/v1/aliyun-avatar/stop-session
   */
  async stopSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId 是必填参数'
        });
      }

      await aliyunAvatarService.stopSession(sessionId);

      res.json({
        success: true,
        data: { sessionId, status: 'stopped' },
        message: '会话已停止'
      });

    } catch (error: any) {
      console.error('[AliyunAvatarController] StopSession 失败:', error.message);
      res.status(500).json({
        success: false,
        error: '停止会话失败',
        message: error.message
      });
    }
  }

  /**
   * 健康检查 / 配置检查
   * GET /api/v1/aliyun-avatar/health
   */
  async healthCheck(req: Request, res: Response) {
    const config = aliyunAvatarService.getConfig();

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        projectId: config.projectId ? `${config.projectId.substring(0, 10)}***` : null,
        instanceId: config.instanceId ? `${config.instanceId.substring(0, 10)}***` : null,
        baseUrl: config.baseUrl,
        timestamp: new Date().toISOString()
      },
      message: config.enabled ? '灵眸 Avatar 服务正常' : '灵眸 Avatar 服务未启用'
    });
  }
}

export const aliyunAvatarController = new AliyunAvatarController();
