import { Request, Response } from 'express';
import { avatarService } from '../services/avatar.service';
import { validationResult } from 'express-validator';

/**
 * 数字人控制器
 * 处理基于 AIRI Web 会话的数字人相关 HTTP 请求
 */
export class AvatarController {

  /**
   * 启动数字人实例
   * POST /api/v1/avatar/start
   */
  async startAvatar(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array()
        });
      }

      const { 
        userId, 
        avatarCode = 'airi_default', 
        voiceCode = 'zh-CN-lisa',
        sessionId,
        backgroundImage = 'default',
        resolution = '720p'
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId是必填参数'
        });
      }

      const result = await avatarService.startAvatarInstance({
        userId,
        avatarCode,
        voiceCode,
        sessionId,
        backgroundImage,
        resolution
      });

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          channelInfo: result.channelInfo,
          status: 'started',
          message: '数字人实例启动成功'
        }
      });

    } catch (error) {
      console.error('启动数字人失败:', error);
      res.status(500).json({
        success: false,
        error: '启动数字人失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 停止数字人实例
   * POST /api/v1/avatar/stop
   */
  async stopAvatar(req: Request, res: Response) {
    try {
      const { sessionId, userId } = req.body;

      if (!sessionId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId和userId都是必填参数'
        });
      }

      await avatarService.stopAvatarInstance(sessionId, userId);

      res.json({
        success: true,
        data: {
          sessionId,
          status: 'stopped',
          message: '数字人实例已停止'
        }
      });

    } catch (error) {
      console.error('停止数字人失败:', error);
      res.status(500).json({
        success: false,
        error: '停止数字人失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 发送文本到数字人
   * POST /api/v1/avatar/text
   */
  async sendText(req: Request, res: Response) {
    try {
      const { sessionId, text, userId } = req.body;

      if (!sessionId || !text || !userId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId、text和userId都是必填参数'
        });
      }

      if (text.length > 5000) {
        return res.status(400).json({
          success: false,
          error: '文本长度不能超过5000字符'
        });
      }

      const result = await avatarService.sendTextToAvatar(sessionId, userId, text);

      res.json({
        success: true,
        data: {
          taskId: result.taskId,
          sessionId,
          text,
          status: 'sent',
          message: '文本已发送到数字人'
        }
      });

    } catch (error) {
      console.error('发送文本失败:', error);
      res.status(500).json({
        success: false,
        error: '发送文本失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 测试连接
   * POST /api/v1/avatar/test
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId是必填参数'
        });
      }

      const result = await avatarService.testConnection(userId);

      res.json({
        success: true,
        data: {
          connected: result.success,
          provider: result.provider,
          webUrl: result.webUrl,
          userId: result.userId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('测试连接失败:', error);
      res.status(500).json({
        success: false,
        error: '测试连接失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取数字人状态
   * GET /api/v1/avatar/status/:sessionId
   */
  async getStatus(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!sessionId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId和userId都是必填参数'
        });
      }

      const status = await avatarService.getAvatarStatus(sessionId, userId as string);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('获取状态失败:', error);
      res.status(500).json({
        success: false,
        error: '获取状态失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取可用数字人列表
   * GET /api/v1/avatar/avatars
   */
  async getAvailableAvatars(req: Request, res: Response) {
    try {
      const avatars = await avatarService.getAvailableAvatars();

      res.json({
        success: true,
        data: avatars
      });

    } catch (error) {
      console.error('获取数字人列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取数字人列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取可用声音列表
   * GET /api/v1/avatar/voices
   */
  async getAvailableVoices(req: Request, res: Response) {
    try {
      const voices = await avatarService.getAvailableVoices();

      res.json({
        success: true,
        data: voices
      });

    } catch (error) {
      console.error('获取声音列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取声音列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 更新数字人配置
   * PUT /api/v1/avatar/config
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const { sessionId, config } = req.body;

      if (!sessionId || !config) {
        return res.status(400).json({
          success: false,
          error: 'sessionId和config都是必填参数'
        });
      }

      const result = await avatarService.updateConfig(sessionId, config);

      res.json({
        success: true,
        data: {
          sessionId,
          config: result.config,
          message: '配置已更新'
        }
      });

    } catch (error) {
      console.error('更新配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新配置失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}

export const avatarController = new AvatarController();
