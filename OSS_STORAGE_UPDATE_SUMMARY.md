# OSS 存储配置更新总结

## 更新时间
2026-05-25

## 更新内容

### 1. 阿里云 AccessKey 更新
所有子项目的 OSS AccessKey 已统一更新为最新的密钥：
- **AccessKey ID**: `LTAI5tCVEqD97rEMyyJEVpp5`
- **AccessKey Secret**: `K272Yb0Bl7NsU5mj5t1GlCrB0Zodfv`

### 2. 双存储桶策略

为了实现更好的资源隔离和管理，项目现在使用两个 OSS 存储桶：

#### 主存储桶：`ai-interview-2025`
用于存储以下类型的文件：
- Banner 图片
- Logo 图片
- 帖子图片（post-images）
- 营业执照（license）
- 简历（resume）
- 面试照片和视频
- TTS 音频文件
- 数字人视频
- 其他通用文件

#### 用户存储桶：`interview-users`
专门用于存储用户相关的文件：
- 用户头像（avatar）

### 3. 代码改动

#### 3.1 环境文件更新
以下环境文件已更新 OSS 配置：
- ✅ `backend-api/.env`
- ✅ `backend-api/.env.bak2`
- ✅ `backend-api/.env.backup.20251106_195809`
- ✅ `analysis-service/.env`
- ✅ `.env.prod.example`

新增环境变量：
```env
OSS_REGION=oss-cn-beijing
OSS_BUCKET=ai-interview-2025          # 主存储桶
OSS_USER_BUCKET=interview-users       # 用户存储桶（新增）
OSS_ACCESS_KEY_ID=LTAI5tCVEqD97rEMyyJEVpp5
OSS_ACCESS_KEY_SECRET=K272Yb0Bl7NsU5mj5t1GlCrB0Zodfv
```

#### 3.2 核心服务层改动

**`backend-api/src/services/ossService.ts`**
- 新增 `userBucket` 属性，从环境变量 `OSS_USER_BUCKET` 读取
- 新增 `getBucketForType(type?: string)` 方法，根据文件类型返回对应的存储桶名称
- 所有 OSS 操作方法新增可选参数 `bucketName`，支持指定存储桶
- 更新的方法包括：
  - `getOSSClient(bucketName?: string)`
  - `generateFileUrl(..., bucketName?: string)`
  - `generateSignedUrl(..., bucketName?: string)`
  - `generateSignedProcessUrl(..., bucketName?: string)`
  - `deleteFile(..., bucketName?: string)`
  - `getFileInfo(..., bucketName?: string)`
  - `fileExists(..., bucketName?: string)`
  - `uploadLocalFile(..., bucketName?: string)`
  - `uploadBuffer(..., bucketName?: string)`
  - `getFileStream(..., bucketName?: string)`

#### 3.3 控制器层改动

**`backend-api/src/controllers/uploadController.ts`**
- 在 `uploadFile` 方法中，根据文件类型自动选择存储桶
- 上传响应中新增 `bucket` 字段，返回实际使用的存储桶名称

**`backend-api/src/controllers/ossController.ts`**
- 新增 `inferBucketFromObjectKey(objectKey: string)` 私有方法
- 更新 `proxyFile` 方法，从 objectKey 推断文件类型并选择正确的存储桶

**`backend-api/src/controllers/verificationController.ts`**
- 更新营业执照上传逻辑，使用 `getBucketForType('license')` 选择存储桶

**`backend-api/src/controllers/contentController.ts`**
- 更新帖子图片上传逻辑，使用 `getBucketForType('post')` 选择存储桶

#### 3.4 路由层改动

**`backend-api/src/routes/aiInterview.ts`**
- 更新面试照片上传，使用主存储桶
- 更新面试视频上传，使用主存储桶

#### 3.5 服务层改动

**`backend-api/src/services/ttsService.ts`**
- 更新 TTS 音频上传，使用主存储桶

**`backend-api/src/services/digitalHumanService.ts`**
- 更新数字人视频上传，使用主存储桶

### 4. 存储桶选择逻辑

```typescript
// 根据文件类型选择存储桶
getBucketForType(type?: string): string {
  // 用户相关的文件使用用户存储桶
  if (type === 'avatar') {
    return this.userBucket;  // interview-users
  }
  // 其他文件使用主存储桶
  return this.bucket;  // ai-interview-2025
}
```

### 5. 文件类型映射

| 文件类型 | 存储桶 | 说明 |
|---------|--------|------|
| avatar | interview-users | 用户头像 |
| banner | ai-interview-2025 | 首页 Banner |
| logo | ai-interview-2025 | 企业/系统 Logo |
| license | ai-interview-2025 | 营业执照 |
| resume | ai-interview-2025 | 简历文件 |
| post | ai-interview-2025 | 帖子图片 |
| video | ai-interview-2025 | 面试视频、数字人视频 |
| audio | ai-interview-2025 | TTS 音频 |
| other | ai-interview-2025 | 其他文件 |

### 6. 兼容性说明

- ✅ 所有现有的上传接口保持兼容
- ✅ OSS 代理接口 (`/api/oss/proxy`) 自动推断存储桶
- ✅ 前端代码无需修改，URL 格式保持不变
- ✅ 已上传的历史文件不受影响

### 7. 注意事项

1. **存储桶权限**：确保新的 AccessKey 对两个存储桶都有读写权限
2. **CORS 配置**：如果前端直接上传，需要在两个存储桶都配置 CORS
3. **CDN 配置**：如果使用了 CDN，需要确保 CDN 回源到正确的存储桶
4. **备份策略**：建议对两个存储桶分别设置备份策略

### 8. 测试建议

在部署到生产环境前，建议测试以下场景：
- [ ] 上传用户头像，确认存储到 `interview-users` 桶
- [ ] 上传 Banner 图片，确认存储到 `ai-interview-2025` 桶
- [ ] 上传帖子图片，确认存储到 `ai-interview-2025` 桶
- [ ] 通过代理 URL 访问两个桶中的文件，确认正常读取
- [ ] 删除文件操作，确认能正确删除两个桶中的文件

### 9. 回滚方案

如果需要回滚到单存储桶模式：
1. 移除环境变量 `OSS_USER_BUCKET`
2. 修改 `ossService.ts` 中的 `getBucketForType` 方法，统一返回 `this.bucket`
3. 或直接使用旧的 AccessKey 和存储桶配置

---

**更新完成时间**: 2026-05-25
**更新人**: AI Assistant
**状态**: ✅ 已完成
