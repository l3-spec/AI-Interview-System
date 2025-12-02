import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * 开源数字人控制器
 * 提供基于Open-LLM-VTuber + Live2D的免费数字人服务
 */
export class OpenSourceAvatarController {
  /**
   * 获取开源数字人页面
   */
  public getAvatarPage(req: Request, res: Response) {
    try {
      const avatarPath = path.join(__dirname, '../../public/avatar/index.html');
      
      if (!fs.existsSync(avatarPath)) {
        return res.status(404).json({
          success: false,
          message: '数字人页面未找到'
        });
      }
      
      // 读取HTML文件并注入动态配置
      let html = fs.readFileSync(avatarPath, 'utf-8');
      
      // 获取当前服务器地址
      const protocol = req.protocol;
      const host = req.get('host');
      const serverUrl = `${protocol}://${host}`;
      
      // 替换服务器地址
      html = html.replace(
        /window\.location\.host/g,
        `"${host}"`
      );
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      
    } catch (error) {
      console.error('获取数字人页面失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数字人页面失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取开源数字人状态
   */
  public getAvatarStatus(req: Request, res: Response) {
    try {
      const avatarPath = path.join(__dirname, '../../public/avatar');
      const modelsPath = path.join(__dirname, '../../public/models');
      
      const hasAvatarPage = fs.existsSync(path.join(avatarPath, 'index.html'));
      const hasModels = fs.existsSync(modelsPath) && fs.readdirSync(modelsPath).length > 0;
      
      res.json({
        success: true,
        data: {
          service: 'open-source-avatar',
          status: 'running',
          features: {
            realTimeVoice: true,
            lipSync: true,
            customModels: true,
            zeroCost: true
          },
          requirements: {
            hasAvatarPage,
            hasModels,
            browserSupport: 'WebRTC, Web Audio API'
          },
          endpoints: {
            avatarPage: '/avatar',
            models: '/models',
            api: '/api/avatar'
          }
        }
      });
      
    } catch (error) {
      console.error('获取数字人状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数字人状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取可用模型列表
   */
  public getAvailableModels(req: Request, res: Response) {
    try {
      const modelsPath = path.join(__dirname, '../../public/models');
      const models: any[] = [];
      
      if (fs.existsSync(modelsPath)) {
        const modelDirs = fs.readdirSync(modelsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        modelDirs.forEach(modelName => {
          const modelPath = path.join(modelsPath, modelName);
          const modelConfig = path.join(modelPath, `${modelName}.model3.json`);
          
          if (fs.existsSync(modelConfig)) {
            try {
              const config = JSON.parse(fs.readFileSync(modelConfig, 'utf-8'));
              models.push({
                name: modelName,
                title: this.getModelTitle(modelName),
                type: 'Live2D',
                description: this.getModelDescription(modelName),
                preview: `/models/${modelName}/preview.png`,
                config: `/models/${modelName}/${modelName}.model3.json`
              });
            } catch (error) {
              console.warn(`解析模型配置失败: ${modelName}`, error);
            }
          }
        });
      }
      
      // 添加内置的备选方案
      if (models.length === 0) {
        models.push({
          name: 'fallback',
          title: '卡通头像',
          type: '2D',
          description: '内置的2D卡通头像，无需额外模型文件',
          preview: null,
          config: null
        });
      }
      
      res.json({
        success: true,
        data: models
      });
      
    } catch (error) {
      console.error('获取模型列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取模型列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取服务器配置
   */
  public getServerConfig(req: Request, res: Response) {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const serverUrl = `${protocol}://${host}`;
      
      res.json({
        success: true,
        data: {
          serverUrl,
          avatarUrl: `${serverUrl}/avatar`,
          modelsUrl: `${serverUrl}/models`,
          apiUrl: `${serverUrl}/api/avatar`,
          features: [
            '实时语音驱动',
            '嘴型同步动画',
            '零成本开源',
            '支持移动设备',
            '可自定义形象'
          ],
          compatibility: {
            android: 'Android 7.0+',
            ios: 'iOS 11.0+',
            web: '现代浏览器支持'
          }
        }
      });
      
    } catch (error) {
      console.error('获取服务器配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取服务器配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  private getModelTitle(name: string): string {
    const titles: Record<string, string> = {
      'haru': '春日野穹',
      'hibiki': '响',
      'koharu': '小春',
      'shizuku': '雫'
    };
    return titles[name] || name;
  }

  private getModelDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'haru': '经典的Live2D模型，支持丰富的表情和动作',
      'hibiki': '活泼可爱的少女形象，适合年轻化场景',
      'koharu': '温柔治愈的形象，适合客服和咨询场景',
      'shizuku': '清新自然的风格，适合教育和培训场景'
    };
    return descriptions[name] || `${name} Live2D模型`;
  }
}

export const openSourceAvatarController = new OpenSourceAvatarController();