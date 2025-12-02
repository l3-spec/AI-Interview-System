# 🎯 火山SDK Token格式问题修复

## 问题发现

从详细日志发现，虽然appKey配置完全正确（没有设置），但仍然报 -104 错误：

```
✅ tokenSource=env, hasAppKey=false
✅ finalAppKey=null
✅ 不设置appKey (appKey=null)
❌ initEngine failed with code=-104  ← 还是失败！
```

## 根本原因

**火山SDK的 `PARAMS_KEY_APP_TOKEN_STRING` 需要纯token，不能带 `Bearer;` 前缀！**

### 原代码问题

```kotlin
// ❌ 错误：使用了带Bearer;前缀的authorization
val authToken = config.authorization ?: config.token  
// authToken = "Bearer;Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0"

asr.configure(
    VolcAsrManager.Credentials(
        token = authToken,  // ❌ SDK收到带前缀的token
        ...
    )
)
```

### 后端返回的数据

```json
{
  "token": "Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0",           // ✅ 纯token
  "authorization": "Bearer;Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0"  // ❌ 带前缀
}
```

## 修复方案

### 修改点1：ASR配置
```kotlin
// ✅ 正确：直接使用纯token字段
val rawToken = config.token  // 不使用authorization字段

asr.configure(
    VolcAsrManager.Credentials(
        appId = config.appId,
        token = rawToken,  // ✅ 纯token，不带Bearer;前缀
        ...
    )
)
```

### 修改点2：TTS配置
```kotlin
// ✅ TTS也使用纯token
val speechToken = config.token  // 不使用authorization
```

## 火山SDK认证机制说明

火山引擎SDK在初始化时：

1. **initEngine阶段** - 通过 `PARAMS_KEY_APP_TOKEN_STRING` 设置token
   - SDK内部会处理Bearer格式
   - 必须传入**纯token**，不带任何前缀

2. **startSession阶段** - 在payload中也会包含token
   ```json
   {
     "app": {
       "appid": "...",
       "token": "...",  // ← 也是纯token
       "cluster": "..."
     }
   }
   ```

3. **为什么有authorization字段？**
   - `authorization` 字段是为了HTTP请求头准备的（如REST API调用）
   - SDK直接使用时，需要纯token

## 完整的修复

### 文件：RealtimeVoiceManager.kt

**ASR部分：**
```kotlin
val asr = ensureAsrManager()
val rawToken = config.token  // ✅ 使用纯token

asr.configure(
    VolcAsrManager.Credentials(
        appId = config.appId,
        token = rawToken,  // ✅
        ...
    )
)
```

**TTS部分：**
```kotlin
private suspend fun playWithVolcTts(sessionId: String?, text: String) {
    val config = fetchVolcConfig() ?: return
    val speechToken = config.token  // ✅ 使用纯token
    
    val credentials = VolcSpeechEngineManager.VolcCredentials(
        appId = config.appId,
        token = speechToken,  // ✅
        ...
    )
}
```

## 快速修复步骤

```bash
# 1. 代码已修改，重新构建
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew clean
./gradlew assembleDebug

# 2. 安装
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 3. 测试并查看日志
adb logcat -c
# 启动应用，点击语音输入
adb logcat -s RealtimeVoiceManager:D VolcAsrManager:D -v time
```

## 期望日志

修复后应该看到：

```
配置ASR引擎: tokenLength=32  ← token是32个字符（不带Bearer;前缀）
Configuring ASR engine: ...
不设置appKey (appKey=null)
火山ASR引擎初始化成功 ← ✅ 成功！
火山ASR会话启动成功
```

## 总结

-104错误有两个常见原因：

1. ✅ **appKey冲突** - 已修复（env token不设置appKey）
2. ✅ **token格式错误** - 刚修复（使用纯token，不带Bearer;前缀）

两个问题都解决后，应该能正常初始化了！

