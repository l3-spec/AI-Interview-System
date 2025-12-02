# 火山引擎ASR错误码-104完整诊断指南

## 问题症状
Android应用初始化火山引擎ASR时报错：`initEngine failed with code=-104`

## 根本原因
**错误码-104 = 认证冲突**

火山引擎SDK认证规则：
```
1. 使用环境变量token（VOLC_TOKEN）：只设置 appId + token，不能设置 appKey
2. 使用STS JWT token：只设置 appId + token，不能设置 appKey  
3. 使用API获取的token：可以设置 appId + token + appKey
```

**你的问题：** 环境变量token + appKey 同时设置 → 认证冲突 → -104

## 修复内容

### 1️⃣ 后端修复 (backend-api/src/routes/voice.routes.ts)

```typescript
// 根据tokenSource决定是否返回appKey
const resolvedAppKey = tokenResult.source === 'env' 
  ? undefined  // ✅ env token不返回appKey
  : (manualAppKey || (tokenResult.source === 'api' ? tokenResult.rawToken : undefined));

console.log(`[Voice Config] tokenSource=${tokenResult.source}, resolvedAppKey=${resolvedAppKey ? 'set' : 'undefined'}`);
```

### 2️⃣ Android端双重保护

**RealtimeVoiceManager.kt：**
```kotlin
// 检查tokenSource
val shouldUseAppKey = config.tokenSource != "env"
val finalAppKey = if (shouldUseAppKey) config.appKey else null

Log.d(TAG, "配置ASR: tokenSource=${config.tokenSource}, finalAppKey=${if (finalAppKey == null) "null" else "exists"}")
```

**VolcAsrManager.kt：**
```kotlin
// 不依赖token格式，直接检查appKey是否为null
if (!isStsToken && credentials.appKey?.isNotBlank() == true) {
    Log.d(TAG, "设置appKey到ASR引擎")
    speechEngine.setOptionString(PARAMS_KEY_APP_KEY_STRING, credentials.appKey!!)
} else {
    Log.d(TAG, "不设置appKey (isStsToken=$isStsToken, appKey=${credentials.appKey ?: "null"})")
}
```

## 🔍 完整诊断步骤

### 步骤1：确认后端配置
```bash
# 重启后端服务（确保最新代码生效）
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
pkill -f "node.*backend-api" || true
npm run dev
```

**期望日志：**
```
[Voice Config] tokenSource=env, hasManualAppKey=false, resolvedAppKey=undefined
```

### 步骤2：测试后端API响应
```bash
# 直接调用配置接口
curl http://localhost:3001/api/voice/config | jq '.'
```

**期望响应：**
```json
{
  "success": true,
  "data": {
    "appId": "8658504805",
    "token": "Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0",
    "authorization": "Bearer;Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0",
    "tokenSource": "env",
    "appKey": null,  // ✅ 关键：应该是null或不存在
    ...
  }
}
```

❌ **如果appKey仍然有值，检查：**
- 环境变量 `VOLC_APP_KEY` 或 `RTC_APP_KEY` 是否设置
- 后端代码是否真的更新了

### 步骤3：重新构建Android应用
```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose

# 清理构建缓存
./gradlew clean

# 重新构建
./gradlew assembleDebug

# 安装到设备
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 步骤4：查看Android日志

**启动应用并触发语音输入，过滤关键日志：**
```bash
# 查看完整日志
adb logcat -s RealtimeVoiceManager:D VolcAsrManager:D -v time

# 或者只看关键配置信息
adb logcat | grep -E "(火山配置|配置ASR|Configuring ASR|设置appKey|不设置appKey|initEngine)"
```

**✅ 成功日志示例：**
```
火山配置获取成功: appId=8658504805, tokenSource=env, hasAppKey=false
配置ASR引擎: tokenSource=env, shouldUseAppKey=false, finalAppKey=null
Configuring ASR engine: ..., hasAppKey=false, willSetAppKey=false
不设置appKey (isStsToken=false, appKey=null)
火山ASR引擎初始化成功: appId=8658504805, cluster=volcengine_streaming_common
```

**❌ 失败日志示例：**
```
火山配置获取成功: appId=8658504805, tokenSource=env, hasAppKey=true  // ❌ 不应该有appKey
配置ASR引擎: tokenSource=env, shouldUseAppKey=false, finalAppKey=null  // ✅ 这里过滤了
Configuring ASR engine: ..., hasAppKey=true, willSetAppKey=true  // ❌ 但仍然设置了？？
设置appKey到ASR引擎（长度: 32）  // ❌ 错误！不应该设置
initEngine failed with code=-104  // ❌ 导致失败
```

## 🐛 常见问题排查

### 问题1：后端仍然返回appKey

**检查环境变量：**
```bash
# 查看后端环境变量
grep -E "(VOLC_APP_KEY|RTC_APP_KEY)" /Volumes/Leo/dev/AI-Interview-System/backend-api/.env*

# 或者直接在后端代码里打印
console.log('VOLC_APP_KEY:', process.env.VOLC_APP_KEY);
console.log('RTC_APP_KEY:', process.env.RTC_APP_KEY);
```

**解决方案：**
```bash
# 如果设置了这些变量，注释掉或删除
# backend-api/.env
# VOLC_APP_KEY=xxx  # 注释掉
# RTC_APP_KEY=xxx   # 注释掉

# 重启后端
pkill -f "node.*backend-api"
cd backend-api && npm run dev
```

### 问题2：Android缓存了旧配置

**清除应用数据：**
```bash
# 完全卸载重装
adb uninstall com.xlwl.AiMian
adb install app/build/outputs/apk/debug/app-debug.apk

# 或者清除数据
adb shell pm clear com.xlwl.AiMian
```

### 问题3：代码修改没生效

**强制重新构建：**
```bash
cd android-v0-compose
./gradlew clean
./gradlew --no-build-cache assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 问题4：多个token来源混用

**检查后端token获取逻辑：**

- 2025.11 更新：`volc-openapi.service.ts` 默认只会在 `VOLC_TOKEN` **看起来像火山签发的 JWT/STS 字符串** 时才使用（长度较长，并且通常包含 `.` 分隔的三段）。如果你把 AccessKey、AppId 等字符串误填到 `VOLC_TOKEN`，后端会自动忽略它并转而调用 STS 接口生成一次性 token。
- 如果你确实需要强制使用手工 token（比如离线环境），可以在 `.env` 中同时设置 `VOLC_TOKEN_FORCE=true`，这样即便 token 看起来不符合规则也会被使用。

**解决方案：**
只使用一种 token 方式，并确认 `VOLC_TOKEN` 填写的是火山平台返回的 JWT/STS，而不是 AccessKey/AppKey。

## 📊 验证成功的标志

### 后端日志 ✅
```
[Voice Config] tokenSource=env, hasManualAppKey=false, resolvedAppKey=undefined
```

### 后端API响应 ✅
```json
{
  "data": {
    "tokenSource": "env",
    "appKey": null  // 或者不存在此字段
  }
}
```

### Android日志 ✅
```
火山配置获取成功: tokenSource=env, hasAppKey=false
配置ASR引擎: finalAppKey=null
不设置appKey (appKey=null)
火山ASR引擎初始化成功
火山ASR会话启动成功
```

### 功能验证 ✅
1. 启动应用，进入面试场景
2. 点击语音输入按钮
3. 说话，看到实时转写文本
4. 没有报错 -104

## 🔧 快速修复脚本

创建 `fix-volc-104.sh`：

```bash
#!/bin/bash
set -e

echo "🔧 修复火山引擎ASR -104错误"

# 1. 停止后端
echo "1️⃣ 停止后端服务..."
pkill -f "node.*backend-api" || true

# 2. 检查环境变量
echo "2️⃣ 检查环境变量..."
if grep -q "^VOLC_APP_KEY=" backend-api/.env 2>/dev/null; then
    echo "⚠️  警告：发现 VOLC_APP_KEY 环境变量"
    echo "   使用env token时应该删除此变量"
fi

# 3. 重启后端
echo "3️⃣ 重启后端..."
cd backend-api
npm run dev &
sleep 3

# 4. 测试后端配置
echo "4️⃣ 测试后端配置..."
curl -s http://localhost:3001/api/voice/config | jq '.data | {tokenSource, appKey}'

# 5. 重新构建Android
echo "5️⃣ 重新构建Android应用..."
cd ../android-v0-compose
./gradlew clean assembleDebug

# 6. 安装
echo "6️⃣ 安装应用..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "✅ 修复完成！请启动应用测试"
echo "📱 查看日志: adb logcat -s RealtimeVoiceManager:D VolcAsrManager:D"
```

## 总结

**核心原则：** 环境变量token（`tokenSource: "env"`）不能与appKey同时使用

**修复关键点：**
1. ✅ 后端根据tokenSource判断是否返回appKey
2. ✅ Android端根据tokenSource判断是否使用appKey
3. ✅ VolcAsrManager不依赖token格式，直接检查appKey是否为null
4. ✅ 添加详细日志追踪整个配置传递过程

**如果还是失败，请提供：**
- 后端日志（包含 `[Voice Config]`）
- Android日志（包含 `火山配置获取成功` 和 `Configuring ASR engine`）
- `curl http://localhost:3001/api/voice/config` 的完整响应
