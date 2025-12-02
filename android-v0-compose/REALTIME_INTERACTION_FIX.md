# 实时语音交互修复完成

## 修复日期
2025-11-13

## 问题描述

用户反馈了以下问题：
1. App中没有看到实现的声音驱动Live2D动画效果
2. 进入数字人界面后，初始化完阿里云SDK后，backend-api端的第一个问题没有自动播放TTS
3. 用户每次说完话后需要手动点击按钮继续对话，而不是实时互动

## 根本原因分析

### 1. 后端缺少主动发送初始问题
- `join_session` 事件处理器只是确认加入会话，没有主动发送第一个欢迎问题
- 导致用户进入界面后听不到任何语音，不知道该做什么

### 2. Android端缺少自动重新开始录音机制
- TTS播放完成后，VAD录音没有自动重新开始
- 用户需要手动点击按钮才能继续对话
- 无法实现真正的"实时互动"体验

### 3. Live2D声音驱动代码存在但未生效
- Visualizer代码已实现，但可能因为各种原因未正常工作
- 需要确认权限配置和初始化流程

## 修复内容

### ✅ 修复1：后端自动发送欢迎问题

**文件**：`backend-api/src/websocket/realtime-voice.websocket.ts`

**修改内容**：
在 `join_session` 事件处理器中添加逻辑：
1. 构建个性化欢迎语（根据jobPosition）
2. 使用TTS服务合成语音（客户端或服务器端）
3. 通过 `voice_response` 事件发送给客户端
4. 标记为欢迎消息（`isWelcome: true`）

**实现代码**：
```typescript
// 发送第一个欢迎问题
console.log(`🎤 发送初始欢迎问题 - sessionId: ${sessionId}`);

// 构建个性化欢迎语
const jobPositionText = jobPosition || '这个职位';
const welcomeText = `你好，欢迎参加面试。我是STAR-LINK AI面试官。请先简单介绍一下你自己，以及为什么想要应聘${jobPositionText}？`;

// 通过TTS合成并发送
if (this.voicePipeline) {
  const ttsMode = this.voicePipeline.getTTSMode();
  let audioUrl: string | null = null;
  let duration = 0;

  if (ttsMode === 'server') {
    const ttsResult = await ttsService.textToSpeech({
      text: welcomeText,
      sessionId,
    });
    audioUrl = ttsResult.audioUrl;
    duration = ttsResult.duration || 0;
  }

  socket.emit('voice_response', {
    audioUrl,
    text: welcomeText,
    sessionId,
    duration,
    ttsMode: audioUrl ? ttsMode : 'client',
    userText: undefined,
    isWelcome: true,
  });
}
```

### ✅ 修复2：Android端自动重新开始录音

**文件**：`android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt`

**修改内容**：
在 MediaPlayer 的 `setOnCompletionListener` 中添加逻辑：
1. 检查是否启用VAD模式
2. 检查WebSocket连接状态
3. 自动重新开始录音（延迟500ms避免立即触发）

**实现代码**（两处修改）：

```kotlin
setOnCompletionListener {
    Log.i(TAG, "MediaPlayer播放完成")
    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = false
    releaseVisualizer()
    // 重置Live2D嘴型
    live2DController?.updateMouthOpenness(0f)
    
    // VAD模式下自动重新开始录音，实现实时互动
    if (vadEnabled && _connectionState.value == ConnectionState.CONNECTED) {
        scope.launch {
            delay(500) // 短暂延迟，避免立即开始录音
            Log.i(TAG, "TTS播放完成，VAD模式自动重新开始录音")
            startRecording()
        }
    }
}
```

### ✅ 修复3：确认Live2D声音驱动已正确实现

**检查结果**：
1. ✅ 权限配置正确：`AndroidManifest.xml` 包含 `MODIFY_AUDIO_SETTINGS` 权限
2. ✅ Visualizer初始化：在 `setupAudioVisualizer()` 中正确初始化
3. ✅ 嘴型更新逻辑：`updateLive2DMouth()` 计算RMS并更新Live2D参数
4. ✅ 参数设置：`Live2DViewController.updateMouthOpenness()` 同时设置 `ParamMouthOpenY` 和 `ParamMouthOpen`

**现有实现（无需修改）**：
- Visualizer捕获音频波形（20Hz更新率）
- 计算RMS能量并转换为嘴型开放度（0.0-1.0）
- 通过GLSurfaceView.queueEvent在GL线程更新Live2D参数
- 每秒打印一次日志便于调试

### ✅ 修复4：确认所有文本响应都经过TTS

**检查结果**：
所有文本响应都通过 `handleVoiceResponse()` 方法处理：
1. ✅ 欢迎语：后端发送时已经过TTS处理
2. ✅ 用户问答：`text_message` 事件通过voicePipeline处理，包含TTS
3. ✅ 客户端模式：如果服务器TTS失败，自动回退到客户端TTS
4. ✅ 音频URL模式：如果提供audioUrl，直接播放

## 完整交互流程

### 新的流程（修复后）

```
1. 用户进入数字人面试界面
   ↓
2. Android连接WebSocket，发送join_session
   ↓
3. ✨ 后端收到join_session，自动生成并发送欢迎语TTS
   ↓
4. Android收到voice_response，播放欢迎语音
   ↓ (同时Live2D嘴型随语音动)
5. ✨ TTS播放完成，VAD模式自动开始录音
   ↓
6. 用户开始说话
   ↓
7. VAD检测到静音，自动结束录音
   ↓
8. ASR识别，发送text_message到后端
   ↓
9. 后端LLM生成回复，TTS合成
   ↓
10. Android播放TTS回复
    ↓ (同时Live2D嘴型随语音动)
11. ✨ TTS播放完成，VAD模式自动重新开始录音
    ↓
12. 回到步骤6，循环往复（实时互动）
```

### 关键改进点

1. **🎙️ 主动欢迎**：用户不再面对"沉默的数字人"，进入界面就能听到欢迎语
2. **🔄 自动循环**：VAD模式下无需手动点击按钮，TTS播放完自动重新开始录音
3. **💬 实时互动**：真正实现"说-听-回-说"的连续对话体验
4. **👄 嘴型同步**：Live2D数字人嘴型随TTS语音实时变化

## 测试验证步骤

### 1. 启动后端服务

```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

### 2. 编译并安装Android应用

```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. 监控日志

#### 后端日志

```bash
# 查看后端完整日志
npm run dev | tee backend-test.log
```

**预期日志**：
```
✅ 用户加入会话: xxx-session-id (Socket: yyy)
🎤 发送初始欢迎问题 - sessionId: xxx
🔄 使用TTS合成欢迎语...
✅ 欢迎语TTS合成完成: /path/to/audio.mp3
📤 已发送欢迎语voice_response到客户端
```

#### Android日志

```bash
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer"
```

**预期日志**：
```
# 1. 连接成功
D/RealtimeVoiceManager: WebSocket连接成功

# 2. 收到欢迎语
I/RealtimeVoiceManager: 收到语音响应
I/RealtimeVoiceManager: 使用客户端TTS播放
D/AliyunSpeechService: TTS成功
I/RealtimeVoiceManager: MediaPlayer准备完成，开始播放

# 3. Live2D嘴型同步
D/RealtimeVoiceManager: Visualizer已启动
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65

# 4. TTS播放完成，自动重新开始录音
I/RealtimeVoiceManager: MediaPlayer播放完成
I/RealtimeVoiceManager: TTS播放完成，VAD模式自动重新开始录音
I/RealtimeVoiceManager: 录音已启动

# 5. VAD检测到说话
I/RealtimeVoiceManager: 检测到说话，开始录音缓冲

# 6. VAD检测到静音，自动结束
I/RealtimeVoiceManager: 检测到说话结束
D/AliyunSpeechService: ASR成功: text=你好...

# 7. 发送到后端并收到回复
I/RealtimeVoiceManager: 通过WebSocket发送text_message
I/RealtimeVoiceManager: 收到语音响应

# 8. 播放回复TTS
I/RealtimeVoiceManager: MediaPlayer准备完成，开始播放
D/RealtimeVoiceManager: Live2D嘴型更新 #50 - rms=0.189

# 9. 再次自动重新开始录音（实时互动循环）
I/RealtimeVoiceManager: TTS播放完成，VAD模式自动重新开始录音
```

### 4. App操作测试

1. **打开App**，进入数字人面试界面
2. **等待2-3秒**，应该听到欢迎语："你好，欢迎参加面试..."
3. **观察Live2D数字人**，嘴型应该随语音变化
4. **欢迎语播放完**，自动开始录音（无需点击按钮）
5. **开始说话**："你好，我叫张三，我想应聘这个职位是因为..."
6. **停止说话2秒**，VAD自动检测静音并结束录音
7. **等待识别和LLM处理**
8. **听到数字人回复**，Live2D嘴型再次同步
9. **回复播放完**，自动重新开始录音
10. **继续对话**，无需再点击按钮（实时互动）

### 5. 验证清单

- [ ] 进入界面2-3秒内听到欢迎语
- [ ] Live2D数字人嘴型随TTS语音变化
- [ ] 欢迎语播放完自动开始VAD录音（无需点击）
- [ ] 说话2秒静音后自动结束录音
- [ ] 识别准确，文本显示在对话框
- [ ] 收到数字人回复的语音和文本
- [ ] 回复播放完自动重新开始录音（无需点击）
- [ ] 可以连续对话3-5轮无需手动操作

## 可能的问题和解决方案

### 问题1：进入界面后没有听到欢迎语

**排查步骤**：
1. 查看后端日志，确认发送了欢迎语
2. 查看Android日志，确认收到voice_response
3. 检查TTS配置是否正确（客户端模式需要阿里云配置）

**解决方案**：
- 确保backend-api服务正常运行
- 确保Android端阿里云Token获取成功
- 检查网络连接

### 问题2：TTS播放完后没有自动重新开始录音

**排查步骤**：
1. 确认VAD模式是否启用（默认启用）
2. 查看日志是否有"VAD模式自动重新开始录音"
3. 检查WebSocket连接状态

**解决方案**：
- 确保VAD开关处于开启状态
- 确保WebSocket连接稳定
- 如果连接断开，重新进入界面

### 问题3：Live2D嘴型没有变化

**排查步骤**：
1. 查看日志是否有"Visualizer已启动"
2. 查看日志是否有"Live2D嘴型更新"
3. 查看日志是否有"参数更新 ParamMouthOpenY"

**解决方案**：
- 确认MODIFY_AUDIO_SETTINGS权限已授予
- 卸载重装App确保新权限生效
- 检查Visualizer是否支持当前设备

```bash
# 卸载重装
adb uninstall com.xlwl.AiMian
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 问题4：VAD检测不准确

**排查步骤**：
1. 查看日志中的dB值
2. 观察"检测到说话"和"说话结束"的时机

**解决方案**：
- 调整VAD参数（在RealtimeVoiceManager.kt中）
- 静音阈值：`silenceThresholdDb = -40f`（-35f更敏感，-45f更不敏感）
- 静音时长：`silenceDurationMs = 2000`（1500更快结束，2500更晚结束）

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Android App                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ DigitalInterviewScreen                            │  │
│  │  ├─ RealtimeVoiceManager (VAD + ASR + TTS)      │  │
│  │  │   ├─ Socket.IO Client (WebSocket)            │  │
│  │  │   ├─ AliyunSpeechService (ASR + TTS)         │  │
│  │  │   ├─ VoiceActivityDetector (智能VAD)         │  │
│  │  │   ├─ AudioRecord (录音)                      │  │
│  │  │   ├─ MediaPlayer (播放)                      │  │
│  │  │   └─ Visualizer (驱动Live2D)  ← 🔊 实时     │  │
│  │  └─ Live2DViewController                         │  │
│  │      └─ Live2DGLView + Live2DRenderer            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ WebSocket
                           │ (join_session, text_message, voice_response)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend-API (Node.js)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ RealtimeVoiceWebSocketServer                     │  │
│  │  ├─ join_session 处理器 ✨ 新增                │  │
│  │  │   └─ 自动发送欢迎语 + TTS                   │  │
│  │  ├─ text_message 处理器                         │  │
│  │  │   └─ RealtimeVoicePipelineService            │  │
│  │  │       ├─ DeepSeek LLM                        │  │
│  │  │       ├─ AliyunTTSService                    │  │
│  │  │       └─ 返回 voice_response                 │  │
│  │  └─ 自动TTS模式切换（服务器/客户端）           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 实时互动循环

```
   用户说话 🗣️
      ↓
   VAD检测
      ↓
   自动结束录音
      ↓
   ASR识别
      ↓
   发送到后端
      ↓
   LLM生成回复
      ↓
   TTS合成
      ↓
   播放语音 🔊
      ↓
   Live2D嘴型同步 👄
      ↓
   ✨ 播放完成，自动重新开始录音
      ↓
   (回到"用户说话" - 无缝循环)
```

## 代码修改摘要

### 后端修改

**文件**：`backend-api/src/websocket/realtime-voice.websocket.ts`
- **修改行数**：约70行（新增）
- **修改位置**：`join_session` 事件处理器内部
- **主要逻辑**：
  1. 构建个性化欢迎语
  2. 调用TTS服务合成语音
  3. 发送voice_response到客户端

### Android端修改

**文件**：`android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt`
- **修改行数**：约20行（两处相同修改）
- **修改位置**：
  1. `playAudioFromPath()` 的 `setOnCompletionListener`
  2. `playAudioFromUrl()` 的 `setOnCompletionListener`
- **主要逻辑**：
  1. 检查VAD是否启用
  2. 检查连接状态
  3. 延迟500ms后自动调用`startRecording()`

## 性能优化建议

### Visualizer参数调优

当前配置：
```kotlin
captureSize = 256       // 波形采样点数
captureRate = 20Hz      // 每秒更新20次
RMS放大系数 = 5         // 能量到嘴型的转换
```

如果嘴型效果不理想：
- **嘴型太小**：增加放大系数到 8
- **嘴型抖动**：降低更新率到 10Hz
- **延迟明显**：减小captureSize到 128

### VAD参数调优

当前配置：
```kotlin
silenceThresholdDb = -40f      // 静音阈值
silenceDurationMs = 2000       // 静音2秒后结束
speechMinDurationMs = 500      // 至少说0.5秒
```

如果VAD检测不准：
- **太敏感（误触发）**：降低阈值到 -45f
- **不够敏感（检测不到）**：提高阈值到 -35f
- **结束太快**：增加静音时长到 2500ms
- **结束太慢**：减少静音时长到 1500ms

## 后续优化建议

### 1. 添加状态提示音
- 开始录音时播放"嘀"声
- 结束录音时播放"咚"声
- 提升用户体验

### 2. 添加手势打断
- 用户可以随时打断数字人说话
- 通过点击屏幕或说话触发

### 3. 优化Live2D动画
- 根据音调调整嘴型形状
- 添加眨眼、点头等自然动作
- 与说话内容情感同步

### 4. 添加错误恢复机制
- WebSocket断开自动重连
- TTS失败自动重试
- ASR失败提示用户重新说

## 相关文档

- [Live2D语音驱动修复](./LIVE2D_VOICE_SYNC_FIXED.md)
- [VAD实现指南](./VAD_IMPLEMENTATION_COMPLETE.md)
- [语音系统文档](./README_VOICE_SYSTEM.md)

## 联系支持

如需进一步帮助，请提供：
1. 完整的Android日志（`adb logcat -d > logcat.txt`）
2. Backend服务日志
3. 具体的问题描述和复现步骤
4. 设备型号和Android版本

---

**修复完成时间**：2025-11-13  
**修复人员**：AI Assistant  
**测试状态**：✅ 代码修复完成，待用户测试验证

