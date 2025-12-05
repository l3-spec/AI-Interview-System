import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ossService } from '../services/ossService';
import { isOSSConfigured, typeToFolder, toPublicUrl } from '../utils/ossUtils';

const buildObjectKey = (type?: string, filename?: string) => {
  const folder = typeToFolder(type);
  const safeFilename = filename || `file-${Date.now()}`;
  return `uploads/${folder}/${safeFilename}`;
};

// 上传文件
export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!isOSSConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'OSS 未配置，无法上传文件'
      });
    }

    const file = req.file;
    const { type } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 验证文件类型
    const allowedTypes = ['logo', 'license', 'resume', 'avatar', 'banner', 'other'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型'
      });
    }

    // 始终上传到 OSS
    const objectKey = buildObjectKey(type, file.filename);
    const { objectKey: storedKey } = await ossService.uploadLocalFile(file.path, objectKey);
    const fileUrl = toPublicUrl(storedKey);

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
        type: type,
        objectKey: storedKey
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 文件预览
export const getFilePreview = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '无效的文件名'
      });
    }

    // 查找文件（在所有可能的子目录中）
    const possiblePaths = [
      path.join('uploads', 'logos', filename),
      path.join('uploads', 'licenses', filename),
      path.join('uploads', 'resumes', filename),
      path.join('uploads', 'avatars', filename),
      path.join('uploads', 'others', filename),
      path.join('uploads', filename) // 直接在uploads目录下
    ];

    let filePath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 获取文件信息
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    // 设置适当的Content-Type
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      contentType = `image/${ext.slice(1)}`;
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.doc', '.docx'].includes(ext)) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

    // 流式传输文件
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

  } catch (error) {
    console.error('文件预览失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 文件下载
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '无效的文件名'
      });
    }

    // 查找文件（在所有可能的子目录中）
    const possiblePaths = [
      path.join('uploads', 'logos', filename),
      path.join('uploads', 'licenses', filename),
      path.join('uploads', 'resumes', filename),
      path.join('uploads', 'avatars', filename),
      path.join('uploads', 'others', filename),
      path.join('uploads', filename) // 直接在uploads目录下
    ];

    let filePath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 获取文件信息
    const stat = fs.statSync(filePath);

    // 设置下载响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stat.size);

    // 流式传输文件
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 
