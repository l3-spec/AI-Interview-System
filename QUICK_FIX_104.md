# 🚀 快速修复火山ASR -104错误

## 🎯 一键修复

```bash
cd /Volumes/Leo/dev/AI-Interview-System
./fix-volc-104.sh
```

这个脚本会自动：
1. ✅ 重启后端服务
2. ✅ 验证后端配置正确
3. ✅ 重新构建Android应用
4. ✅ 安装到设备

## 📱 手动操作（如果脚本失败）

### Step 1: 重启后端
```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
pkill -f "node.*backend-api"
npm run dev
```

### Step 2: 验证后端配置
```bash
curl http://localhost:3001/api/voice/config | jq '.data | {tokenSource, appKey}'
```

**期望输出：**
```json
{
  "tokenSource": "env",
  "appKey": null  // ← 必须是null！
}
```

❌ **如果appKey不是null：**
```bash
# 检查是否设置了这些环境变量
grep -E "VOLC_APP_KEY|RTC_APP_KEY" backend-api/.env

# 如果找到了，注释掉它们
# nano backend-api/.env
# 然后重启后端
```

### Step 3: 重新构建Android
```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew clean
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Step 4: 查看日志
```bash
# 清除旧日志
adb logcat -c

# 启动应用，然后运行：
adb logcat -s RealtimeVoiceManager:D VolcAsrManager:D -v time
```

## ✅ 成功的标志

**后端日志：**
```
[Voice Config] tokenSource=env, resolvedAppKey=undefined
```

**Android日志：**
```
火山配置获取成功: tokenSource=env, hasAppKey=false
配置ASR引擎: finalAppKey=null
不设置appKey (appKey=null)
火山ASR引擎初始化成功 ← 看到这个就成功了！
```

## ❌ 如果还是失败

提供这些信息：

1. **后端响应：**
```bash
curl http://localhost:3001/api/voice/config | jq '.'
```

2. **Android日志（关键部分）：**
```bash
adb logcat | grep -E "(火山配置|配置ASR|Configuring ASR|设置appKey|initEngine)" | tail -20
```

3. **环境变量：**
```bash
grep -E "VOLC|RTC" backend-api/.env | grep -v "^#"
```

## 📚 详细文档

- 完整诊断指南: `VOLC_ASR_104_DIAGNOSIS.md`
- 修复报告: `VOLC_ASR_FIX.md`

## 🔑 核心原理

```
环境变量token (tokenSource=env) + appKey = -104错误 ❌
环境变量token (tokenSource=env) + 不设置appKey = 成功 ✅
```

修复的关键：
1. 后端检查 `tokenSource`，如果是 `'env'` 则不返回 `appKey`
2. Android端双重检查，确保不传递 `appKey` 给SDK
3. 添加详细日志追踪整个过程

