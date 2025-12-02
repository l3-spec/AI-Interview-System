import { Request, Response } from 'express';
import { ossService } from '../services/ossService';
import { interviewService } from '../services/interviewService';

/**
 * OSS控制器
 * 处理阿里云OSS相关的API请求
 */
class OSSController {

  /**
   * 获取STS临时访问凭证
   */
  async getStsToken(req: Request, res: Response) {
    try {
      const { sessionId, userId } = req.query;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error_message: '缺少面试会话ID'
        });
      }

      // 验证面试会话是否存在
      const session = await interviewService.getSession(sessionId as string);
      if (!session) {
        return res.status(404).json({
          success: false,
          error_message: '面试会话不存在'
        });
      }

      // 生成STS临时凭证
      const stsToken = await ossService.generateSTSToken(
        sessionId as string,
        userId as string
      );

      if (!stsToken) {
        return res.status(500).json({
          success: false,
          error_message: '生成STS令牌失败'
        });
      }

      res.json({
        success: true,
        data: stsToken
      });

    } catch (error) {
      console.error('获取STS令牌失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取STS令牌失败，请稍后重试'
      });
    }
  }

  /**
   * 获取OSS配置信息
   */
  async getOSSConfig(req: Request, res: Response) {
    try {
      const config = ossService.getOSSConfig();

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('获取OSS配置失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取OSS配置失败'
      });
    }
  }

  /**
   * 处理视频上传完成通知
   */
  async uploadComplete(req: Request, res: Response) {
    try {
      const {
        sessionId,
        questionIndex,
        ossUrl,
        cdnUrl,
        fileSize,
        duration
      } = req.body;

      // 验证必需参数
      if (!sessionId || questionIndex === undefined || !ossUrl) {
        return res.status(400).json({
          success: false,
          error_message: '缺少必需参数'
        });
      }

      // 验证面试会话是否存在
      const session = await interviewService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error_message: '面试会话不存在'
        });
      }

      // 保存视频上传信息
      await interviewService.saveVideoSegment(sessionId, {
        questionIndex: parseInt(questionIndex),
        videoUrl: ossUrl,
        fileName: this.extractFileName(ossUrl),
        fileSize: parseInt(fileSize) || 0,
        uploadedAt: new Date()
      });

      // 如果是完整面试视频（questionIndex = -1），更新面试会话
      if (questionIndex === -1) {
        await interviewService.updateSession(sessionId, {
          videoUrl: ossUrl,
          duration: duration ? parseInt(duration) : undefined,
          status: 'completed',
          completedAt: new Date()
        });
      }

      console.log(`视频上传完成通知: 会话=${sessionId}, 题目=${questionIndex}, URL=${ossUrl}`);

      res.json({
        success: true,
        message: '上传完成通知处理成功'
      });

    } catch (error) {
      console.error('处理上传完成通知失败:', error);
      res.status(500).json({
        success: false,
        error_message: '处理上传完成通知失败'
      });
    }
  }

  /**
   * OSS上传回调处理
   * 当客户端使用OSS回调时调用此接口
   */
  async uploadCallback(req: Request, res: Response) {
    try {
      const signature = req.headers['x-oss-signature'] as string;
      const authorizationHeader = req.headers['authorization'] as string;
      const publicKeyUrl = req.headers['x-oss-pub-key-url'] as string;
      const requestBody = JSON.stringify(req.body);

      // 验证回调签名
      const isValidSignature = ossService.verifyCallbackSignature(
        signature,
        authorizationHeader,
        requestBody,
        publicKeyUrl
      );

      if (!isValidSignature) {
        return res.status(403).json({
          success: false,
          error_message: '回调签名验证失败'
        });
      }

      // 处理回调数据
      const { bucket, object, etag, size, mimeType } = req.body;

      console.log(`OSS上传回调: bucket=${bucket}, object=${object}, size=${size}`);

      // 从object路径解析会话ID和题目索引
      const pathParts = object.split('/');
      if (pathParts.length >= 2) {
        const sessionId = pathParts[1];
        const fileName = pathParts[pathParts.length - 1];
        
        // 从文件名解析题目索引
        const questionIndex = this.extractQuestionIndex(fileName);

        // 生成访问URL
        const fileUrl = ossService.generateFileUrl(object);

        // 保存上传记录
        await interviewService.saveVideoSegment(sessionId, {
          questionIndex,
          videoUrl: fileUrl,
          fileName,
          fileSize: parseInt(size) || 0,
          uploadedAt: new Date()
        });
      }

      res.json({
        success: true,
        message: '回调处理成功'
      });

    } catch (error) {
      console.error('处理OSS上传回调失败:', error);
      res.status(500).json({
        success: false,
        error_message: '处理上传回调失败'
      });
    }
  }

  /**
   * 获取文件访问URL
   */
  async getFileUrl(req: Request, res: Response) {
    try {
      const { objectKey, expires } = req.query;

      if (!objectKey) {
        return res.status(400).json({
          success: false,
          error_message: '缺少文件路径参数'
        });
      }

      // 检查文件是否存在
      const exists = await ossService.fileExists(objectKey as string);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error_message: '文件不存在'
        });
      }

      // 生成访问URL
      let fileUrl: string;
      if (expires) {
        // 生成带签名的临时访问URL
        fileUrl = await ossService.generateSignedUrl(
          objectKey as string,
          parseInt(expires as string)
        );
      } else {
        // 生成普通访问URL
        fileUrl = ossService.generateFileUrl(objectKey as string);
      }

      res.json({
        success: true,
        data: {
          url: fileUrl,
          expires: expires ? new Date(Date.now() + parseInt(expires as string) * 1000) : null
        }
      });

    } catch (error) {
      console.error('获取文件URL失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取文件URL失败'
      });
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req: Request, res: Response) {
    try {
      const { objectKey } = req.body;

      if (!objectKey) {
        return res.status(400).json({
          success: false,
          error_message: '缺少文件路径参数'
        });
      }

      const success = await ossService.deleteFile(objectKey);

      if (success) {
        res.json({
          success: true,
          message: '文件删除成功'
        });
      } else {
        res.status(500).json({
          success: false,
          error_message: '文件删除失败'
        });
      }

    } catch (error) {
      console.error('删除文件失败:', error);
      res.status(500).json({
        success: false,
        error_message: '删除文件失败'
      });
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(req: Request, res: Response) {
    try {
      const stats = await ossService.getBucketStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('获取存储统计信息失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取存储统计信息失败'
      });
    }
  }

  /**
   * 从URL中提取文件名
   */
  private extractFileName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * 从文件名中提取题目索引
   */
  private extractQuestionIndex(fileName: string): number {
    const match = fileName.match(/_(\d+)_/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 服务端直传文件到OSS
   * 支持multipart/form-data文件上传
   */
  async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error_message: '未收到文件' });
      }

      // 将临时文件上传到OSS
      const result = await ossService.uploadLocalFile(file.path);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('文件上传失败:', error);

      // 更精确的错误反馈
      if (error && error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error_message: 'OSS拒绝访问，请检查 AccessKey 权限或 Bucket 策略'
        });
      }

      res.status(500).json({ success: false, error_message: '文件上传失败' });
    }
  }

  /**
   * 通过Base64字符串上传文件到OSS
   * 适用于小型图片或文本文件
   */
  async uploadBase64(req: Request, res: Response) {
    try {
      const { base64Data, fileName } = req.body as { base64Data?: string; fileName?: string };
      if (!base64Data) {
        return res.status(400).json({ success: false, error_message: '缺少base64Data' });
      }

      const buffer = Buffer.from(base64Data.replace(/^data:.*;base64,/, ''), 'base64');
      const objectKey = `uploads/${Date.now()}_${fileName || 'file'}`;

      const result = await ossService.uploadBuffer(buffer, objectKey);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Base64上传失败:', error);

      if (error && error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error_message: 'OSS拒绝访问，请检查 AccessKey 权限或 Bucket 策略'
        });
      }

      res.status(500).json({ success: false, error_message: '上传失败' });
    }
  }
}

export const ossController = new OSSController(); 