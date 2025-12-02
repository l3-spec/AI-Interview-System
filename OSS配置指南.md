# 阿里云OSS配置指南

本文档详细介绍如何为AI面试系统配置阿里云对象存储OSS，实现视频文件的云端存储。

## 🎯 配置概览

```
OSS存储架构
├── 存储桶 (Bucket)          # ai-interview-videos
├── 目录结构                 # interview-videos/{sessionId}/
├── 访问控制                 # 私有读写 + STS临时授权
├── CDN加速                  # 全球内容分发
└── 生命周期管理             # 自动清理过期文件
```

## 📋 前置准备

### 1. 阿里云账号
- 注册并完成实名认证
- 开通对象存储OSS服务
- 创建AccessKey（用于服务端访问）

### 2. 权限要求
- OSS完整权限（AliyunOSSFullAccess）
- RAM角色管理权限（用于STS）
- CDN服务权限（可选）

## 🗄️ 创建OSS存储桶

### 1. 登录OSS控制台

```bash
https://oss.console.aliyun.com/
```

### 2. 创建Bucket

```bash
# 基本配置
Bucket名称: ai-interview-videos
地域: 华东1（杭州）oss-cn-hangzhou
存储类型: 标准存储
读写权限: 私有
版本控制: 关闭
```

### 3. 目录结构规划

```
ai-interview-videos/
├── interview-videos/           # 面试视频目录
│   ├── {sessionId}/           # 按会话ID分组
│   │   ├── {timestamp}_{questionIndex}.mp4    # 单题视频
│   │   └── complete_{timestamp}.mp4           # 完整面试视频
│   └── compressed/            # 压缩后的视频
└── temp/                      # 临时文件（自动清理）
```

## 🔐 权限配置

### 1. 创建RAM用户

```bash
# 在RAM控制台创建用户
用户名: ai-interview-oss
访问方式: 编程访问
权限: AliyunOSSFullAccess
```

### 2. 获取访问密钥

```bash
# 保存AccessKey信息
AccessKeyId: LTAI5txxxxxxxxxxxxxxxx
AccessKeySecret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 创建RAM角色（用于STS）

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "ecs.aliyuncs.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 4. 配置角色权限策略

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:PutObjectAcl",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:*:*:ai-interview-videos/interview-videos/*"
      ]
    }
  ]
}
```

## 🌐 跨域配置

### 1. 设置CORS规则

```json
{
  "CORSRule": [
    {
      "AllowedOrigin": [
        "*"
      ],
      "AllowedMethod": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeader": [
        "*"
      ],
      "ExposeHeader": [
        "ETag",
        "x-oss-request-id"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### 2. 生产环境CORS配置

```json
{
  "CORSRule": [
    {
      "AllowedOrigin": [
        "https://yourdomain.com",
        "https://www.yourdomain.com"
      ],
      "AllowedMethod": [
        "GET",
        "POST",
        "PUT"
      ],
      "AllowedHeader": [
        "Authorization",
        "Content-Type",
        "x-oss-date",
        "x-oss-user-agent"
      ],
      "ExposeHeader": [
        "ETag"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## 📱 CDN加速配置

### 1. 开通CDN服务

```bash
# 在CDN控制台添加加速域名
加速域名: cdn.yourdomain.com
业务类型: 全站加速
源站类型: OSS域名
源站地址: ai-interview-videos.oss-cn-hangzhou.aliyuncs.com
```

### 2. CDN缓存配置

```bash
# 视频文件缓存策略
文件类型: .mp4, .avi, .mov
缓存时间: 30天
回源策略: 跟随源站

# API接口缓存策略  
路径: /api/*
缓存时间: 不缓存
```

### 3. HTTPS配置

```bash
# 申请免费SSL证书
证书类型: 免费DV证书
强制HTTPS: 开启
HTTP/2: 开启
```

## 🔄 生命周期管理

### 1. 自动清理规则

```json
{
  "Rule": [
    {
      "ID": "delete-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "ID": "transition-old-videos",
      "Status": "Enabled", 
      "Filter": {
        "Prefix": "interview-videos/"
      },
      "Transition": [
        {
          "Days": 30,
          "StorageClass": "IA"
        },
        {
          "Days": 180,
          "StorageClass": "Archive"
        }
      ]
    }
  ]
}
```

## ⚙️ 环境变量配置

### 1. 开发环境配置

```bash
# .env 文件
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=ai-interview-videos
OSS_CDN_DOMAIN=cdn.yourdomain.com
```

### 2. 生产环境配置

```bash
# 生产环境建议使用STS临时凭证
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=LTAI5txxxxxxxxxxxxxxxx
OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OSS_BUCKET=ai-interview-prod
OSS_ROLE_ARN=acs:ram::123456789:role/oss-upload-role
OSS_CDN_DOMAIN=video.yourdomain.com
```

## 🚀 应用集成

### 1. Android应用配置

```kotlin
// OSSConfig.kt
object OSSConfig {
    const val OSS_ENDPOINT = "https://oss-cn-hangzhou.aliyuncs.com"
    const val OSS_BUCKET_NAME = "ai-interview-videos"
    const val VIDEO_FOLDER_PREFIX = "interview-videos/"
    const val MAX_VIDEO_SIZE_MB = 100L
}
```

### 2. 后端API配置

```typescript
// ossService.ts
class OSSService {
  private readonly accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  private readonly accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  private readonly region = process.env.OSS_REGION;
  private readonly bucket = process.env.OSS_BUCKET;
}
```

## 📊 监控与日志

### 1. 开启访问日志

```bash
# 在OSS控制台开启访问日志
日志存储位置: 同地域另一个Bucket
日志前缀: access-log/
```

### 2. 设置监控告警

```bash
# 监控指标
- 存储容量超过阈值
- 请求错误率过高  
- 带宽使用量异常
- 费用超出预算
```

## 💰 成本优化

### 1. 存储成本优化

```bash
# 存储类型选择
- 标准存储: 近期视频（30天内）
- 低频访问: 历史视频（30-180天）  
- 归档存储: 长期保存（180天+）
```

### 2. 流量成本优化

```bash
# CDN配置
- 启用Gzip压缩
- 设置合理缓存策略
- 使用HTTPS优化
- 选择合适的计费方式
```

## 🛡️ 安全最佳实践

### 1. 访问控制

```bash
# 最小权限原则
- 客户端使用STS临时凭证
- 限制访问IP范围
- 设置合理的凭证过期时间
- 定期轮换AccessKey
```

### 2. 数据保护

```bash
# 数据安全措施
- 开启服务端加密
- 设置防盗链规则
- 配置访问日志监控
- 定期备份重要数据
```

## 🔧 故障排查

### 1. 常见问题

```bash
# 上传失败
- 检查AccessKey权限
- 验证CORS配置
- 确认文件大小限制
- 查看网络连接状态

# 访问失败  
- 检查Bucket权限设置
- 验证签名URL是否过期
- 确认文件是否存在
- 查看CDN缓存状态
```

### 2. 调试工具

```bash
# OSS客户端工具
- ossutil命令行工具
- OSS Browser图形界面
- API调试工具
- 日志分析工具
```

## 📞 技术支持

如需帮助，请联系：
- 📧 技术支持: tech-support@yourdomain.com
- 📱 电话支持: 400-xxx-xxxx
- 💬 在线客服: https://yourdomain.com/support
- 📖 官方文档: https://help.aliyun.com/product/31815.html 