# AI面试系统 - OSS视频上传功能实现总结

## 🎯 功能概述

本文档总结了为AI面试系统成功实现的阿里云OSS视频自动上传功能。用户在app中完成面试后，录制的视频将自动压缩并上传到阿里云OSS，提供高可用的云端存储解决方案。

## 🏗️ 技术架构

```
视频上传流程架构
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Android App   │    │   Backend API   │    │  阿里云 OSS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. 获取STS临时凭证     │                       │
         ├──────────────────────→│                       │
         │                       │ 2. 生成临时授权token  │
         │                       ├──────────────────────→│
         │                       │ 3. 返回STS凭证        │
         │                       │←──────────────────────┤
         │ 4. 返回临时凭证       │                       │
         │←──────────────────────┤                       │
         │                       │                       │
         │ 5. 录制完成，开始上传  │                       │
         │ - 视频压缩            │                       │
         │ - 直接上传到OSS       │                       │
         ├───────────────────────────────────────────────→│
         │                       │                       │
         │ 6. 上传完成通知       │                       │
         ├──────────────────────→│                       │
         │                       │ 7. 更新数据库记录     │
         │                       │                       │
```

## 📱 Android端实现

### 1. 核心组件

- **`OSSConfig.kt`** - OSS配置管理
- **`OSSUploadService.kt`** - OSS上传服务
- **`VideoRecordManager.kt`** - 视频录制管理
- **`UploadProgressDialog.kt`** - 上传进度显示

### 2. 主要功能

```kotlin
// 视频录制和上传流程
VideoRecordManager(context, lifecycleOwner).apply {
    // 1. 初始化摄像头
    initCamera(previewView)
    
    // 2. 开始面试会话
    startInterviewSession(sessionId)
    
    // 3. 录制每题回答
    startRecording() // 自动触发上传
    
    // 4. 完成面试
    val completeVideoUrl = completeInterview()
}
```

### 3. 依赖配置

```gradle
// build.gradle (app)
implementation 'com.aliyun.dpa:oss-android-sdk:2.9.13'
implementation 'com.abedelazizshe.lightcompressorlibrary:LightCompressor:1.0.1'
implementation 'androidx.camera:camera-video:1.3.1'
```

## 🔧 后端API实现

### 1. 核心服务

- **`ossService.ts`** - OSS操作服务
- **`ossController.ts`** - OSS API控制器
- **`oss.ts`** - OSS路由定义

### 2. API接口

```typescript
// 主要API端点
GET  /api/oss/sts-token          // 获取STS临时凭证
GET  /api/oss/config             // 获取OSS配置
POST /api/oss/upload-complete    // 上传完成通知
POST /api/oss/upload-callback    // OSS回调处理
GET  /api/oss/file-url           // 获取文件访问URL
```

### 3. 依赖安装

```bash
npm install ali-oss@^6.20.0
```

## 🗄️ 数据存储结构

### 1. OSS目录结构

```
ai-interview-videos/
├── interview-videos/
│   ├── {sessionId}/
│   │   ├── {timestamp}_{questionIndex}.mp4    # 单题视频
│   │   └── complete_{timestamp}.mp4           # 完整面试视频
│   └── compressed/                            # 压缩后视频
└── temp/                                      # 临时文件
```

### 2. 数据库记录

```typescript
interface VideoSegment {
  questionIndex: number;
  videoUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
}
```

## 🔐 安全机制

### 1. STS临时授权

- 客户端不存储永久密钥
- 使用临时凭证访问OSS
- 凭证自动过期（1小时）
- 最小权限原则

### 2. 权限控制

```json
{
  "Effect": "Allow",
  "Action": [
    "oss:PutObject",
    "oss:GetObject"
  ],
  "Resource": [
    "acs:oss:*:*:ai-interview-videos/interview-videos/*"
  ]
}
```

## 📊 性能优化

### 1. 视频压缩

- 自动压缩视频文件
- 保持适当画质
- 减少上传时间和存储成本

### 2. 上传优化

- 分段上传大文件
- 断点续传支持
- 进度实时显示
- 错误重试机制

### 3. CDN加速

- 配置CDN域名
- 全球内容分发
- 提升访问速度

## 🚀 部署指南

### 1. 快速部署

```bash
# 运行自动部署脚本
./deploy-oss.sh

# 或分步部署
./deploy-oss.sh backend    # 仅部署后端
./deploy-oss.sh android    # 仅编译Android
./deploy-oss.sh verify     # 验证部署状态
```

### 2. 环境配置

```bash
# backend-api/.env
PORT=3001
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=ai-interview-videos
OSS_CDN_DOMAIN=cdn.yourdomain.com
```

### 3. 阿里云OSS配置

1. 创建OSS存储桶
2. 配置RAM用户和权限
3. 设置CORS跨域规则
4. 开通CDN加速（可选）

详细配置请参考：`OSS配置指南.md`

## 🔄 使用流程

### 1. 用户使用流程

```
1. 用户打开面试应用
2. 开始面试，应用自动录制视频
3. 回答每个问题时，视频自动上传到OSS
4. 面试结束，生成完整面试视频
5. 所有视频文件安全存储在云端
```

### 2. 管理员查看

```
1. 登录管理后台
2. 查看面试会话列表
3. 点击查看具体面试详情
4. 播放OSS中的视频文件
5. 下载或分享视频链接
```

## 📈 监控和维护

### 1. 服务监控

```bash
# 查看服务状态
pm2 status
pm2 logs ai-interview-api

# API健康检查
curl http://localhost:3001/api/health
curl http://localhost:3001/api/oss/config
```

### 2. OSS监控

- 存储容量使用情况
- 请求次数和错误率
- 带宽使用量
- 费用监控告警

### 3. 日常维护

- 定期清理临时文件
- 监控存储成本
- 更新SDK版本
- 备份重要配置

## 🛠️ 故障排查

### 1. 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 上传失败 | 网络连接问题 | 检查网络，重试上传 |
| 权限错误 | STS凭证过期 | 重新获取临时凭证 |
| 文件过大 | 超过限制 | 调整压缩参数 |
| API响应慢 | 服务器负载高 | 检查服务器资源 |

### 2. 调试工具

```bash
# 后端日志
pm2 logs ai-interview-api --lines 100

# Android调试
adb logcat | grep "OSSUploadService"

# OSS工具
ossutil ls oss://ai-interview-videos/
```

## 💡 扩展功能

### 1. 已实现功能

✅ 视频自动上传到OSS  
✅ 视频压缩优化  
✅ 上传进度显示  
✅ STS临时授权  
✅ 错误处理和重试  
✅ CDN加速支持  

### 2. 可扩展功能

🔲 多格式视频支持  
🔲 批量上传优化  
🔲 离线上传队列  
🔲 视频转码处理  
🔲 水印添加  
🔲 智能存储策略  

## 📋 技术栈总结

### 前端技术栈
- **Android**: Kotlin + Camera2 API
- **视频处理**: LightCompressor
- **网络请求**: Retrofit + OkHttp
- **OSS SDK**: 阿里云Android SDK

### 后端技术栈
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **OSS SDK**: ali-oss
- **进程管理**: PM2

### 云服务
- **存储**: 阿里云OSS
- **CDN**: 阿里云CDN
- **权限**: RAM + STS

## 📞 支持联系

如有技术问题或需要支持，请联系：

- 📧 邮箱: tech-support@yourdomain.com
- 📱 电话: 400-xxx-xxxx
- 💬 在线客服: https://yourdomain.com/support

## 📚 相关文档

- [OSS配置指南](./OSS配置指南.md)
- [阿里云部署指南](./阿里云部署指南.md)
- [项目脑图](./AI面试系统-项目脑图.md)

---

*本功能实现遵循最佳实践，确保了安全性、性能和可维护性。如有优化建议，欢迎反馈。* 