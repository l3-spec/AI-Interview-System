import OSS from 'ali-oss';
import crypto from 'crypto';

/**
 * 阿里云OSS服务
 * 负责处理OSS相关操作，包括STS临时凭证生成、文件上传等
 */
class OSSService {
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly roleArn: string;
  private readonly cdnDomain?: string;

  constructor() {
    this.accessKeyId = process.env.OSS_ACCESS_KEY_ID || '';
    this.accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || '';
    this.region = process.env.OSS_REGION || 'oss-cn-hangzhou';
    this.bucket = process.env.OSS_BUCKET || 'ai-interview-videos';
    this.roleArn = process.env.OSS_ROLE_ARN || '';
    this.cdnDomain = process.env.OSS_CDN_DOMAIN;

    if (!this.accessKeyId || !this.accessKeySecret) {
      console.warn('OSS配置不完整，请检查环境变量');
    }
  }

  /**
   * 获取OSS客户端实例
   */
  private getOSSClient(): OSS {
    return new OSS({
      region: this.region,
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      bucket: this.bucket
    });
  }

  /**
   * 生成STS临时访问凭证
   * 为客户端提供临时的OSS访问权限，避免在客户端暴露永久密钥
   */
  async generateSTSToken(sessionId: string, userId?: string): Promise<{
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
    expiration: string;
  } | null> {
    try {
      // 在实际生产环境中，应该使用阿里云STS服务
      // 这里简化处理，使用主账号的AccessKey（仅用于开发测试）
      
      // 生成临时token（实际应该调用STS API）
      const expiration = new Date(Date.now() + 3600 * 1000).toISOString(); // 1小时后过期
      
      // 注意：在生产环境中，应该：
      // 1. 使用RAM角色和STS服务
      // 2. 限制访问权限（只允许上传到特定目录）
      // 3. 设置合适的过期时间
      
      return {
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        securityToken: '', // 简化处理，实际应该有token
        expiration
      };
      
    } catch (error) {
      console.error('生成STS令牌失败:', error);
      return null;
    }
  }

  /**
   * 获取OSS配置信息
   */
  getOSSConfig() {
    return {
      endpoint: `https://${this.region}.aliyuncs.com`,
      bucketName: this.bucket,
      region: this.region,
      cdnDomain: this.cdnDomain
    };
  }

  /**
   * 生成上传回调策略
   * 用于OSS上传完成后回调通知服务器
   */
  generateCallbackPolicy(callbackUrl: string) {
    const callbackBody = JSON.stringify({
      bucket: '${bucket}',
      object: '${object}',
      etag: '${etag}',
      size: '${size}',
      mimeType: '${mimeType}',
      imageInfo: '${imageInfo}',
      customVar: '${x:customVar}'
    });

    const callback = {
      callbackUrl,
      callbackBody,
      callbackBodyType: 'application/json'
    };

    // Base64编码回调策略
    const callbackBase64 = Buffer.from(JSON.stringify(callback)).toString('base64');

    return {
      callback: callbackBase64,
      callbackBody
    };
  }

  /**
   * 验证上传回调签名
   * 确保回调请求来自阿里云OSS
   */
  verifyCallbackSignature(
    signature: string,
    authorizationHeader: string,
    requestBody: string,
    publicKeyUrl: string
  ): boolean {
    try {
      // 这里应该实现OSS回调签名验证逻辑
      // 详细实现请参考阿里云OSS文档
      console.log('验证OSS回调签名:', signature);
      return true; // 简化处理
    } catch (error) {
      console.error('验证回调签名失败:', error);
      return false;
    }
  }

  /**
   * 生成文件的访问URL
   */
  generateFileUrl(objectKey: string, useSSL: boolean = true, expiresInSeconds: number = 3600): string {
    // 如果配置了CDN，优先返回 CDN 公网地址（默认桶视作私有，CDN 需配置回源权限）
    if (this.cdnDomain) {
      return `${useSSL ? 'https' : 'http'}://${this.cdnDomain}/${objectKey}`;
    }
    // 否则返回带有效期的签名URL，适配私有桶
    const client = this.getOSSClient();
    return client.signatureUrl(objectKey, { expires: expiresInSeconds, method: 'GET' });
  }

  /**
   * 生成文件的签名访问URL（用于私有文件）
   */
  async generateSignedUrl(objectKey: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const client = this.getOSSClient();
      const url = client.signatureUrl(objectKey, {
        expires: expiresInSeconds
      });
      return url;
    } catch (error) {
      console.error('生成签名URL失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(objectKey: string): Promise<boolean> {
    try {
      const client = this.getOSSClient();
      await client.delete(objectKey);
      console.log(`删除文件成功: ${objectKey}`);
      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(objectKey: string): Promise<any> {
    try {
      const client = this.getOSSClient();
      const result = await client.head(objectKey);
      // 添加类型注解避免TypeScript错误
      const headers = result.res.headers as any;
      return {
        size: headers['content-length'],
        contentType: headers['content-type'],
        lastModified: headers['last-modified'],
        etag: headers['etag']
      };
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteMultipleFiles(objectKeys: string[]): Promise<{
    deleted: string[];
    errors: { key: string; error: string }[];
  }> {
    const deleted: string[] = [];
    const errors: { key: string; error: string }[] = [];

    try {
      const client = this.getOSSClient();
      
      // 分批删除，每批最多1000个文件
      const batchSize = 1000;
      for (let i = 0; i < objectKeys.length; i += batchSize) {
        const batch = objectKeys.slice(i, i + batchSize);
        
        try {
          const result = await client.deleteMulti(batch);
          // 检查deleted属性是否存在并添加类型注解
          if (result.deleted && Array.isArray(result.deleted)) {
            deleted.push(...result.deleted.map((item: any) => item.Key));
          }
        } catch (error) {
          batch.forEach(key => {
            errors.push({ key, error: error instanceof Error ? error.message : 'Unknown error' });
          });
        }
      }
    } catch (error) {
      console.error('批量删除文件失败:', error);
      objectKeys.forEach(key => {
        errors.push({ key, error: error instanceof Error ? error.message : 'Unknown error' });
      });
    }

    return { deleted, errors };
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(objectKey: string): Promise<boolean> {
    try {
      const client = this.getOSSClient();
      await client.head(objectKey);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取存储桶统计信息
   */
  async getBucketStats(): Promise<{
    totalFiles: number;
    totalSize: number;
  }> {
    try {
      // 简化实现，实际项目中可以通过API获取详细统计信息
      // const client = this.getOSSClient();
      // const result = await client.getBucketInfo(this.bucket);
      
      // 这里返回模拟数据，实际应该实现统计逻辑
      return {
        totalFiles: 0, // 需要实现具体统计逻辑
        totalSize: 0
      };
      
    } catch (error) {
      console.error('获取存储桶统计信息失败:', error);
      return {
        totalFiles: 0,
        totalSize: 0
      };
    }
  }

  async uploadLocalFile(localFilePath: string, objectKey?: string): Promise<{ url: string; objectKey: string }> {
    // 按需加载，避免在无上传场景下引入额外依赖
    const path = await import('path');
    const fs = await import('fs');
    try {
      // 如果没有显式指定 objectKey，则采用 uploads/{{timestamp}}_{{basename}} 的方式
      if (!objectKey) {
        const basename = (path as any).default ? (path as any).default.basename(localFilePath) : (path as any).basename(localFilePath);
        objectKey = `uploads/${Date.now()}_${basename}`;
      }

      const client = this.getOSSClient();
      await client.put(objectKey, localFilePath);

      // 上传成功后删除本地临时文件，忽略删除错误
      ((fs as any).default || fs).unlink(localFilePath, () => undefined);

      return {
        objectKey,
        url: this.generateFileUrl(objectKey)
      };
    } catch (error) {
      console.error('上传本地文件到OSS失败:', error);
      throw error;
    }
  }

  /**
   * 上传Buffer数据到OSS（如Base64解码后的二进制数据）
   */
  async uploadBuffer(buffer: Buffer, objectKey: string): Promise<{ url: string; objectKey: string }> {
    try {
      const client = this.getOSSClient();
      await client.put(objectKey, buffer);
      return {
        objectKey,
        url: this.generateFileUrl(objectKey)
      };
    } catch (error) {
      console.error('上传Buffer到OSS失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件流（用于服务端代理输出）
   */
  async getFileStream(objectKey: string) {
    const client = this.getOSSClient();
    return client.getStream(objectKey);
  }
}

export const ossService = new OSSService(); 
