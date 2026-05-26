# 客户端敏感配置安全管理指南

## 📌 重要安全原则

**绝对禁止**在客户端代码（Android/iOS/鸿蒙）中硬编码以下敏感信息：
- ❌ 阿里云 AccessKey ID / AccessKey Secret
- ❌ 数据库连接字符串
- ❌ JWT Secret
- ❌ 第三方服务 API Key（除非明确设计为公开）
- ❌ 任何服务器端密钥

## ✅ 正确做法：动态配置下发

### 架构设计

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  移动端 App  │  启动   │  Backend API     │  读取   │  .env 文件  │
│             │────────>│  /api/client-    │────────>│  (服务器)   │
│  AppConfig  │  请求   │  runtime-config  │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
       │                          │
       │   返回配置（含AccessKey） │
       │<─────────────────────────┘
       │
   缓存到内存
   运行时使用
```

### 实现流程

#### 1. 后端配置（backend-api）

**环境变量配置** (`backend-api/.env`):
```env
# 阿里云通用 AccessKey（供移动端客户端使用）
# 注意：此密钥会通过 /api/client-runtime-config 接口下发到移动端
# 务必确保 HIDE_CLIENT_RUNTIME_SECRETS=false 时才下发，或使用 RAM 子账号限制权限
ALIYUN_ACCESS_KEY_ID=LTAI5tCVEqD97rEMyyJEVpp5
ALIYUN_ACCESS_KEY_SECRET=K272Yb0Bl7NsU5mj5t1GlCrB0Zodfv

# 控制是否向客户端下发密钥（生产环境建议设为 true）
HIDE_CLIENT_RUNTIME_SECRETS=false
```

**配置下发服务** (`backend-api/src/services/clientRuntimeConfig.service.ts`):
```typescript
export async function getClientRuntimeConfig(req: Request): Promise<ClientRuntimeConfigJson> {
  const hideSecrets = trim(process.env.HIDE_CLIENT_RUNTIME_SECRETS).toLowerCase() === 'true';
  const mask = (s: string) => (hideSecrets ? '' : s);

  return {
    // ... 其他配置
    aliyunAccessKeyId: mask(trim(process.env.ALIYUN_ACCESS_KEY_ID)),
    aliyunAccessKeySecret: mask(trim(process.env.ALIYUN_ACCESS_KEY_SECRET)),
  };
}
```

#### 2. Android 客户端实现

**build.gradle.kts - 移除硬编码**:
```kotlin
// 【安全警告】不要在此处硬编码真实的 AccessKey！
// AccessKey 应该由后端 /api/client-runtime-config 接口动态下发
// 此处仅保留空字符串作为编译默认值，运行时必须从服务端获取
val defaultAliyunAccessKeyId = ""
val defaultAliyunAccessKeySecret = ""
```

**AppConfig.kt - 强制从服务端获取**:
```kotlin
val aliyunAccessKeyId: String
    get() {
        val fromServer = nonBlank(clientRuntime?.aliyunAccessKeyId)
        if (fromServer != null) return fromServer
        
        // 【安全警告】不再使用 BuildConfig 中的硬编码值
        // AccessKey 必须由服务端 /api/client-runtime-config 接口动态下发
        val buildConfigValue = BuildConfig.ALIYUN_ACCESS_KEY_ID
        if (buildConfigValue.isNotBlank()) {
            android.util.Log.w("AppConfig", 
                "⚠️ AccessKey 从 BuildConfig 回退，这不应该是生产环境的行为！" +
                "请确保服务端 /api/client-runtime-config 正确返回 aliyunAccessKeyId")
        }
        return buildConfigValue
    }
```

**启动时加载配置**:
```kotlin
class ClientRuntimeConfigRepository {
    suspend fun loadConfig() {
        val response = apiService.getClientRuntimeConfig()
        if (response.success) {
            AppConfig.applyClientRuntime(response.data)
            Log.i("Config", "✅ 客户端运行时配置已加载")
        } else {
            Log.e("Config", "❌ 加载客户端配置失败")
        }
    }
}
```

## 🔒 安全加固建议

### 1. 使用 RAM 子账号（强烈推荐）

不要使用主账号的 AccessKey，应该创建受限的 RAM 子账号：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:*:*:ai-interview-2025/uploads/*",
        "acs:oss:*:*:interview-users/uploads/*"
      ]
    }
  ]
}
```

### 2. 使用 STS 临时凭证（最安全）

对于文件上传等操作，建议使用 STS 临时凭证：

```kotlin
// 1. 从后端请求 STS 临时凭证
val stsToken = apiService.getStsToken(sessionId, userId)

// 2. 使用临时凭证直接上传到 OSS
val ossClient = OSSClient(context, credentialProvider, config)
ossClient.putObject(putObjectRequest)
```

后端实现参考：`backend-api/src/services/ossService.ts` 的 `generateSTSToken` 方法

### 3. 环境变量控制

在生产环境中设置：
```env
# 生产环境：禁止向客户端下发密钥
HIDE_CLIENT_RUNTIME_SECRETS=true

# 改用 STS 临时凭证方式
```

### 4. 审计和监控

- 记录所有 AccessKey 的使用日志
- 设置异常使用告警
- 定期轮换 AccessKey

## 📋 检查清单

在提交代码前，请确认：

- [ ] 客户端代码中没有硬编码 AccessKey
- [ ] build.gradle.kts 中的默认值为空字符串
- [ ] AppConfig 优先使用服务端配置
- [ ] 后端 .env 文件已加入 .gitignore
- [ ] 生产环境设置 `HIDE_CLIENT_RUNTIME_SECRETS=true`
- [ ] 使用 RAM 子账号而非主账号
- [ ] 已配置 OSS CORS 策略（如果需要前端直传）

## ⚠️ 常见错误

### 错误 1：在 BuildConfig 中硬编码
```kotlin
// ❌ 错误
val defaultAliyunAccessKeyId = "LTAI5tCVEqD97rEMyyJEVpp5"
```

### 错误 2：直接回退到硬编码值
```kotlin
// ❌ 错误
val aliyunAccessKeyId: String
    get() = clientRuntime?.aliyunAccessKeyId ?: "LTAI5tCVEqD97rEMyyJEVpp5"
```

### 错误 3：将 .env 文件提交到 Git
```bash
# ❌ 错误
git add backend-api/.env
git commit -m "添加环境配置"
```

## 🔄 迁移指南

如果你的项目已经有硬编码的 AccessKey，按以下步骤迁移：

1. **从客户端移除硬编码**
   ```bash
   grep -r "LTAI5t" android-v0-compose/
   # 找到所有硬编码位置并替换为空字符串
   ```

2. **在后端添加环境变量**
   ```env
   ALIYUN_ACCESS_KEY_ID=your-access-key-id
   ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
   ```

3. **验证配置下发**
   ```bash
   curl http://localhost:3001/api/client-runtime-config | jq .
   # 确认返回中包含 aliyunAccessKeyId 和 aliyunAccessKeySecret
   ```

4. **测试客户端**
   - 启动 App
   - 检查日志确认配置已加载
   - 测试文件上传功能

## 📚 相关文件

- 后端配置服务：`backend-api/src/services/clientRuntimeConfig.service.ts`
- 后端 OSS 服务：`backend-api/src/services/ossService.ts`
- Android 配置：`android-v0-compose/app/src/main/java/com/example/v0clone/config/AppConfig.kt`
- Android 构建：`android-v0-compose/app/build.gradle.kts`
- 配置 DTO：`android-v0-compose/app/src/main/java/com/example/v0clone/data/model/ClientRuntimeConfigDto.kt`

## 🆘 问题排查

### 问题 1：客户端日志显示 "AccessKey 从 BuildConfig 回退"

**原因**：服务端没有正确返回 AccessKey

**解决**：
1. 检查后端 `.env` 中是否配置了 `ALIYUN_ACCESS_KEY_ID`
2. 检查 `HIDE_CLIENT_RUNTIME_SECRETS` 是否为 `false`
3. 调用 `/api/client-runtime-config` 确认返回值

### 问题 2：上传文件时提示 "AccessKey 无效"

**原因**：AccessKey 权限不足或已过期

**解决**：
1. 检查 RAM 子账号权限策略
2. 确认 AccessKey 状态为"启用"
3. 考虑使用 STS 临时凭证

---

**最后更新**: 2026-05-25
**维护人**: AI Interview System Team
