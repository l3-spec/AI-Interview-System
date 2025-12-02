# Live2D语音驱动修复 - 针对重复播放和驱动失败问题

## 修复日期
2025-11-13 (第二次修复)

## 用户反馈的问题

根据用户截图和描述：

### 1. ❌ TTS重复播放
- 欢迎语或回复会重复播放多次
- 可能是重复调用TTS导致

### 2. ❌ 阿里云TTS调用失败: 400
- 虽然有语音输出，但频繁报400错误
- 错误提示："阿里云TTS调用失败: 400"

### 3. ❌ 数字人没有被语音驱动（最严重）
- Live2D嘴型没有随语音变化
- 嘴型保持静止状态

## 根本原因分析

### 问题1：TTS重复播放
**原因**：
- `init_session` 和 `join_session` 两个事件都可能触发欢迎语发送
- Android端可能同时调用这两个事件
- 导致后端重复发送欢迎语

### 问题2：阿里云TTS 400错误
**可能原因**：
1. **Token过期**：阿里云Token有效期到期但未及时刷新
2. **参数格式错误**：某些特殊文本可能导致参数解析失败
3. **请求频率过高**：短时间内多次请求导致限流
4. **文本内容问题**：特殊字符或过长文本

### 问题3：数字人没有被语音驱动
**核心原因**：
- **Visualizer初始化时机错误**
- 当前代码在 `setOnPreparedListener` 中立即调用 `setupAudioVisualizer()`
- 但此时 `MediaPlayer.start()` 刚被调用，audioSessionId可能还是0
- **audioSessionId为0会导致Visualizer初始化失败**

**正确的流程**：
```
MediaPlayer.prepare()
    ↓
onPreparedListener回调
    ↓
MediaPlayer.start() ← audioSessionId此时可能还是0
    ↓
⏰ 延迟100-200ms（确保播放已开始）
    ↓
获取audioSessionId ← 此时audioSessionId才有效
    ↓
创建Visualizer(audioSessionId) ← 必须使用有效的audioSessionId
    ↓
✅ Visualizer正常工作
```

## 修复内容

### ✅ 修复1：防止TTS重复播放

**文件**：`backend-api/src/websocket/realtime-voice.websocket.ts`

**修改**：
```typescript
// init_session不发送欢迎语，只有join_session发送
socket.on('init_session', async (data) => {
  // ... 保存会话信息
  console.log(`⚠️ init_session不发送欢迎语，等待join_session事件`);
  socket.emit('session_joined', { sessionId, status: 'success' });
});
```

**效果**：
- 只有 `join_session` 事件触发欢迎语
- 避免重复发送

### ✅ 修复2：Visualizer初始化时机优化

**文件**：`android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt`

**关键修改**：
```kotlin
setOnPreparedListener {
    val sessionId = audioSessionId
    Log.i(TAG, "MediaPlayer准备完成 - audioSessionId=$sessionId")
    
    if (sessionId == 0) {
        Log.e(TAG, "警告：audioSessionId为0，无法初始化Visualizer")
    }
    
    start()
    Log.i(TAG, "MediaPlayer开始播放")
    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = true
    
    // ✨ 关键修复：延迟100ms后再初始化Visualizer
    scope.launch {
        delay(100) // 等待播放真正开始
        val finalSessionId = audioSessionId
        Log.d(TAG, "延迟后的audioSessionId=$finalSessionId")
        if (finalSessionId != 0) {
            setupAudioVisualizer()
        } else {
            Log.e(TAG, "无法初始化Visualizer：audioSessionId仍为0")
        }
    }
}
```

**为什么要延迟？**
1. MediaPlayer.start()是异步的
2. audioSessionId在播放真正开始后才被分配
3. 100ms延迟确保播放已启动，audioSessionId有效

### ✅ 修复3：增强Visualizer错误处理

**文件**：`RealtimeVoiceManager.kt`

**改进**：
```kotlin
private fun setupAudioVisualizer() {
    try {
        releaseVisualizer() // 先释放旧的
        
        val player = mediaPlayer
        if (player == null) {
            Log.e(TAG, "MediaPlayer为null，无法初始化Visualizer")
            return
        }
        
        // ✅ 检查播放状态
        if (!player.isPlaying) {
            Log.w(TAG, "MediaPlayer未在播放，延迟初始化Visualizer")
            return
        }
        
        // ✅ 验证audioSessionId
        val audioSessionId = player.audioSessionId
        if (audioSessionId == 0) {
            Log.e(TAG, "无效的audioSessionId: 0，MediaPlayer可能未正确初始化")
            return
        }
        
        Log.d(TAG, "开始设置音频可视化 - audioSessionId=$audioSessionId, isPlaying=${player.isPlaying}")
        
        visualizer = Visualizer(audioSessionId).apply {
            // ... 配置Visualizer
            val success = enabled
            if (success) {
                Log.i(TAG, "✅ Visualizer已成功启动")
            } else {
                Log.e(TAG, "❌ Visualizer启动失败")
            }
        }
        
        // ✅ 二次验证
        if (visualizer?.enabled == true) {
            Log.i(TAG, "✅ Visualizer验证通过，Live2D嘴型驱动已就绪")
        } else {
            Log.e(TAG, "❌ Visualizer验证失败")
            releaseVisualizer()
        }
        
    } catch (e: SecurityException) {
        Log.e(TAG, "❌ 缺少MODIFY_AUDIO_SETTINGS权限", e)
    } catch (e: IllegalStateException) {
        Log.e(TAG, "❌ MediaPlayer状态异常", e)
    } catch (e: RuntimeException) {
        Log.e(TAG, "❌ 运行时错误", e)
    }
}
```

### ✅ 修复4：TTS 400错误处理和重试

**文件**：`android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/AliyunSpeechService.kt`

**改进**：
```kotlin
suspend fun synthesizeSpeech(text: String, retryCount: Int = 0): File {
    val config = ensureConfig(force = retryCount > 0) // 重试时强制刷新token
    
    // ✅ 清理文本
    val cleanText = text.trim().take(500) // 限制500字符
    if (cleanText.isEmpty()) {
        throw IOException("TTS文本为空")
    }
    
    // ... 发送请求
    
    if (!response.isSuccessful) {
        Log.e(TAG, "❌ TTS失败: code=${response.code}, body=$errorBody")
        
        // ✅ 400错误自动重试（最多2次）
        if (response.code == 400 && retryCount < 2) {
            Log.w(TAG, "⚠️ TTS返回400错误，可能是token过期，重新获取token并重试...")
            delay(500)
            return@withContext synthesizeSpeech(text, retryCount + 1)
        }
        
        // ✅ 解析错误信息
        val errorMessage = try {
            val errorJson = JSONObject(errorBody)
            errorJson.optString("message", "未知错误")
        } catch (e: Exception) {
            errorBody.take(200)
        }
        
        throw IOException("阿里云TTS调用失败: ${response.code} - $errorMessage")
    }
    
    // ✅ 验证返回数据
    if (bytes.size < 100) {
        Log.w(TAG, "⚠️ TTS响应数据过小，可能不是有效的音频文件")
    }
    
    Log.i(TAG, "✅ TTS成功: size=${bytes.size} bytes")
    return file
}
```

## 测试验证步骤

### 1. 重新编译安装

```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose

# 卸载旧版本（重要！）
adb uninstall com.xlwl.AiMian

# 编译安装
./gradlew clean assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 2. 启动后端服务

```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

### 3. 监控关键日志

```bash
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|Visualizer|AliyunSpeechService" --color=always
```

### 4. 测试流程

#### ✅ 测试1：欢迎语不重复

**操作**：
1. 打开App
2. 进入数字人面试界面
3. 等待欢迎语播放

**预期**：
- 只播放一次欢迎语
- 不会重复播放

**关键日志**：
```
✅ 用户加入会话: xxx (Socket: yyy)
🎤 发送初始欢迎问题
📤 已发送欢迎语voice_response到客户端
I/RealtimeVoiceManager: 收到语音响应
（只出现一次，不重复）
```

#### ✅ 测试2：Live2D嘴型驱动

**操作**：
1. 欢迎语播放时
2. 观察Live2D数字人嘴型

**预期**：
- **嘴型随语音节奏张合**
- 幅度合理（不会一直闭着或一直张开）
- 同步及时（无明显延迟）

**关键日志**：
```
I/RealtimeVoiceManager: MediaPlayer准备完成 - audioSessionId=123
I/RealtimeVoiceManager: MediaPlayer开始播放
（延迟100ms）
D/RealtimeVoiceManager: 延迟后的audioSessionId=123
D/RealtimeVoiceManager: 开始设置音频可视化 - audioSessionId=123, isPlaying=true
I/RealtimeVoiceManager: ✅ Visualizer已成功启动
I/RealtimeVoiceManager: ✅ Visualizer验证通过，Live2D嘴型驱动已就绪

（播放过程中）
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65
```

**如果失败**：
```
❌ 如果看到：
E/RealtimeVoiceManager: 警告：audioSessionId为0
E/RealtimeVoiceManager: 无法初始化Visualizer：audioSessionId仍为0

解决方法：
1. 卸载重装App（确保权限生效）
2. 检查设备是否支持Visualizer
3. 查看完整错误日志
```

#### ✅ 测试3：TTS 400错误处理

**操作**：
1. 进行多轮对话（3-5轮）
2. 观察是否还有400错误

**预期**：
- 不再频繁出现400错误
- 如果出现400错误，会自动重试
- 重试后能正常播放语音

**关键日志**（如果触发重试）：
```
❌ TTS失败: code=400, body=...
⚠️ TTS返回400错误，可能是token过期，重新获取token并重试...
D/AliyunSpeechService: TTS开始 (尝试2次): ...
✅ TTS成功: size=12345 bytes
```

#### ✅ 测试4：完整对话流程

**操作**：
1. 等待欢迎语播放完（自动开始录音）
2. 说话："你好，我叫张三..."
3. 停止说话2秒（VAD自动结束）
4. 等待回复播放（观察Live2D嘴型）
5. 回复播放完（自动重新开始录音）
6. 继续对话3-5轮

**预期**：
- ✅ 欢迎语Live2D嘴型正常
- ✅ 自动开始录音
- ✅ VAD正常检测
- ✅ 回复时Live2D嘴型正常
- ✅ 自动循环，无需点击按钮
- ✅ 无TTS 400错误（或自动重试成功）

## 故障排查

### ❌ 问题：Live2D嘴型仍然没有动

**检查步骤**：

1. **查看audioSessionId日志**：
```bash
adb logcat | grep "audioSessionId"
```

预期看到：
```
I/RealtimeVoiceManager: MediaPlayer准备完成 - audioSessionId=123 (不是0)
D/RealtimeVoiceManager: 延迟后的audioSessionId=123 (不是0)
```

如果是0：
- MediaPlayer未正确初始化
- 设备可能不支持audioSessionId
- 尝试使用物理设备而非模拟器

2. **查看Visualizer初始化日志**：
```bash
adb logcat | grep "Visualizer"
```

预期看到：
```
I/RealtimeVoiceManager: ✅ Visualizer已成功启动
I/RealtimeVoiceManager: ✅ Visualizer验证通过
```

如果看到错误：
```
E/RealtimeVoiceManager: ❌ 缺少MODIFY_AUDIO_SETTINGS权限
→ 卸载重装App

E/RealtimeVoiceManager: ❌ MediaPlayer状态异常
→ 可能是MediaPlayer问题，查看完整错误栈

E/RealtimeVoiceManager: ❌ Visualizer启动失败
→ 设备可能不支持Visualizer
```

3. **查看嘴型更新日志**：
```bash
adb logcat | grep "嘴型更新"
```

预期看到（每秒一次）：
```
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65
D/RealtimeVoiceManager: Live2D嘴型更新 #2 - rms=0.189, mouthOpenness=0.52
```

如果没有：
- Visualizer回调未触发
- 检查Visualizer是否成功启动

4. **查看Live2D参数更新日志**：
```bash
adb logcat | grep "ParamMouth"
```

预期看到：
```
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65
```

如果没有：
- Live2DController未正确连接
- 检查Live2D渲染器是否就绪

### ❌ 问题：TTS仍然出现400错误

**检查步骤**：

1. **查看完整错误信息**：
```bash
adb logcat | grep "TTS失败"
```

查看具体错误内容，可能原因：
- `token expired`: Token过期（已有自动重试）
- `invalid parameter`: 参数错误
- `rate limit exceeded`: 请求过快

2. **检查TTS重试日志**：
```bash
adb logcat | grep "重新获取token"
```

如果看到重试但仍失败：
- 可能是阿里云服务问题
- 检查backend-api的阿里云配置
- 检查网络连接

3. **检查后端配置**：
```bash
# 查看backend-api的.env文件
cat /Volumes/Leo/dev/AI-Interview-System/backend-api/.env | grep ALIYUN
```

确保有：
```
ALIYUN_NLS_APP_KEY=xxx
ALIYUN_NLS_ACCESS_KEY_ID=xxx
ALIYUN_NLS_ACCESS_KEY_SECRET=xxx
ALIYUN_TTS_REGION=cn-shanghai
```

### ❌ 问题：欢迎语仍然重复播放

**检查步骤**：

1. **查看后端日志**：
```
✅ 用户加入会话: xxx
🎤 发送初始欢迎问题
```

如果出现多次，说明：
- Android端多次调用join_session
- 检查Android连接逻辑

2. **查看Android日志**：
```bash
adb logcat | grep "join_session\|init_session"
```

如果看到多次emit：
- 检查是否有重连逻辑导致重复
- 检查是否有多个地方调用initialize

## 技术要点

### MediaPlayer audioSessionId的生命周期

```
MediaPlayer创建
    ↓
audioSessionId = 0 (默认值)
    ↓
setDataSource()
    ↓
audioSessionId = 0 (仍然是0)
    ↓
prepareAsync()
    ↓
onPrepared回调
    ↓
audioSessionId = 0 (可能仍然是0)
    ↓
start() ← 开始播放
    ↓
⏰ 实际播放开始（异步）
    ↓
audioSessionId = 有效值 (通常>0) ← ✅ 此时才能用
```

### Visualizer对audioSessionId的要求

- **必须是有效值（>0）**
- **必须来自正在播放的音频流**
- 如果audioSessionId无效，Visualizer.enabled会返回false
- 如果MediaPlayer已停止，Visualizer会失效

### 为什么要延迟100ms？

1. **start()是异步的**：调用start()后，实际播放可能延迟几十毫秒才开始
2. **audioSessionId分配延迟**：系统需要时间分配audioSession
3. **100ms是经验值**：足够短不影响体验，又足够长确保初始化完成

## 性能优化建议

### Visualizer参数

当前配置已优化：
```kotlin
captureSize = 256          // 小值，快速更新
captureRate = 最大值(20Hz)  // 最快更新率
RMS放大系数 = 5            // 嘴型明显
```

如需调整：
- **嘴型太小**：增加放大系数到8
- **嘴型抖动**：降低更新率或增加平滑
- **延迟明显**：减小captureSize到128

## 成功标志

完成以下验证即表示修复成功：

- [ ] ✅ 欢迎语只播放一次，不重复
- [ ] ✅ Live2D嘴型随TTS语音变化
- [ ] ✅ audioSessionId有效（>0）
- [ ] ✅ Visualizer成功启动
- [ ] ✅ 无TTS 400错误（或自动重试成功）
- [ ] ✅ 连续对话3-5轮，嘴型都正常
- [ ] ✅ 日志中有"Visualizer验证通过"
- [ ] ✅ 日志中有"Live2D嘴型更新"

## 相关文档

- [实时交互修复文档](./REALTIME_INTERACTION_FIX.md)
- [快速测试指南](./QUICK_TEST_GUIDE.md)
- [Live2D语音同步文档](./LIVE2D_VOICE_SYNC_FIXED.md)

---

**修复完成时间**：2025-11-13  
**修复人员**：AI Assistant  
**测试状态**：✅ 代码修复完成，待用户验证

**关键改进**：
1. ✅ 防止TTS重复播放（init_session不发送欢迎语）
2. ✅ Visualizer初始化延迟100ms（确保audioSessionId有效）
3. ✅ 增强错误处理和日志（方便调试）
4. ✅ TTS 400错误自动重试（Token刷新）

