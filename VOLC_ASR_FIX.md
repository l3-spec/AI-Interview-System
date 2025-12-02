# 火山引擎ASR认证错误修复报告

## 问题描述

Android应用在尝试初始化火山引擎ASR（语音识别）时失败，错误码为 **-104**，表示认证冲突。

### 错误日志

```
11-06 22:49:59.657  4286 22297 E VolcAsrManager: initEngine failed with code=-104
11-06 22:49:59.658  4286 22297 E VolcAsrManager: initEngine failed: -104
11-06 22:49:59.658  4286 22299 E RealtimeVoiceManager: 火山ASR错误: ASR引擎初始化失败: -104
```

### 后端配置响应

```json
{
  "success": true,
  "data": {
    "appId": "8658504805",
    "token": "Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0",
    "appKey": "AHgnRMPknEYAbSto4TCWLmCPisbsbBvW",
    "tokenSource": "env",
    ...
  }
}
```

## 问题根源

火山引擎SDK的认证机制要求：

1. **使用环境变量token（`tokenSource: "env"`）时，不应该同时设置 `appKey`**
2. 只有在使用API方式获取的token或STS token时，才需要设置appKey
3. 同时设置token和appKey会导致认证冲突，错误码 **-104**

### 代码问题位置

**后端** (`backend-api/src/routes/voice.routes.ts`):
```typescript
// 原逻辑：无论token来源如何，都可能返回appKey
const resolvedAppKey = manualAppKey || (tokenResult.source === 'api' ? tokenResult.rawToken : undefined);
```

**Android端** (`android-v0-compose/.../RealtimeVoiceManager.kt`):
```kotlin
// 直接使用后端返回的appKey，没有检查tokenSource
appKey = config.appKey,
```

## 解决方案

### 1. 后端修改

修改 `backend-api/src/routes/voice.routes.ts`，当使用环境变量token时不返回appKey：

```typescript
// 当使用环境变量 token 时不应设置 appKey，否则会导致火山引擎认证冲突（错误码 -104）
// 只有在使用 API 方式获取的 token 或手动配置的 appKey 时才设置
const resolvedAppKey = tokenResult.source === 'env' 
  ? undefined 
  : (manualAppKey || (tokenResult.source === 'api' ? tokenResult.rawToken : undefined));
```

### 2. Android端修改

#### 2.1 添加 `tokenSource` 字段到配置

修改 `VolcServiceConfig` 数据类：

```kotlin
private data class VolcServiceConfig(
    ...
    val vadEndSilenceMs: Int?,
    val tokenSource: String? = null  // 新增
)
```

#### 2.2 解析 `tokenSource` 字段

在 `fetchVolcConfig()` 中添加解析：

```kotlin
val config = VolcServiceConfig(
    ...
    vadEndSilenceMs = if (data.has("vadEndSilenceMs")) data.optInt("vadEndSilenceMs") else null,
    tokenSource = data.optString("tokenSource").takeIf { it.isNotBlank() }  // 新增
)
```

#### 2.3 根据 `tokenSource` 决定是否使用 `appKey`

修改ASR配置调用：

```kotlin
val asr = ensureAsrManager()
val authToken = config.authorization ?: config.token
// 当使用环境变量 token 时不应设置 appKey，否则会导致火山引擎认证冲突（错误码 -104）
val shouldUseAppKey = config.tokenSource != "env"
asr.configure(
    VolcAsrManager.Credentials(
        appId = config.appId,
        token = authToken,
        cluster = config.asrCluster ?: config.cluster,
        appKey = if (shouldUseAppKey) config.appKey else null,  // 条件判断
        ...
    )
)
```

## 验证步骤

1. **重启后端服务**
   ```bash
   cd backend-api
   npm run dev
   ```

2. **重新构建Android应用**
   ```bash
   cd android-v0-compose
   ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. **测试ASR功能**
   - 启动应用
   - 进入面试场景
   - 点击语音输入按钮
   - 检查日志，应该看到：
     - `火山ASR引擎初始化成功` 而不是 `initEngine failed with code=-104`
     - ASR能正常识别语音

## 预期结果

修复后，ASR初始化应该成功，日志示例：

```
VolcAsrManager: Configuring ASR engine: address=wss://openspeech.bytedance.com, ...
VolcAsrManager: 火山ASR引擎初始化成功: appId=8658504805, cluster=volcengine_streaming_common
RealtimeVoiceManager: 火山ASR会话启动成功
```

## 相关文件

- `backend-api/src/routes/voice.routes.ts` - 后端配置API
- `backend-api/src/services/volc-openapi.service.ts` - 火山引擎token服务
- `android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt` - Android端语音管理器
- `android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/volc/VolcAsrManager.kt` - ASR引擎封装

## 总结

这是一个典型的认证配置问题。火山引擎SDK对不同来源的token有不同的认证要求，使用环境变量token时不能同时设置appKey。通过在后端和Android端都添加检查逻辑，确保正确的认证参数组合，解决了 -104 认证冲突错误。

