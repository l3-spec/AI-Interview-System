# 数字人语音系统调试总结

## 问题描述

Android数字人界面实现的ASR+TTS+VAD采用阿里云的智能语音SDK，但测试中没有看到预期的结果。主要症状：

1. **WebSocket频繁断开**：每10秒左右断开一次并重连
2. **缺少关键日志**：没有看到录音、ASR识别、TTS合成等核心流程的日志
3. **流程可能未执行**：无法确认语音识别和播放流程是否正常运行

## 修复内容

### 1. 修复WebSocket频繁断开问题 ✅

**文件**：`backend-api/src/websocket/realtime-voice.websocket.ts`

**问题原因**：Socket.IO缺少心跳配置，默认超时时间过短

**修复方案**：
```typescript
this.io = new Server(server, {
  cors: { ... },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,      // 60秒无响应则断开
  pingInterval: 25000,     // 每25秒发送一次心跳
  connectTimeout: 45000,   // 连接超时时间
});
```

### 2. 添加Android端详细日志 ✅

**文件**：`android-v0-compose/app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt`

**添加的日志点**：

#### startRecording()
```kotlin
Log.d(TAG, "startRecording被调用 - isRecording=$isRecording, connectionState=${_connectionState.value}, sessionId=$currentSessionId")
Log.i(TAG, "开始初始化录音 - sessionId=$sessionId")
Log.d(TAG, "AudioRecord最小缓冲区大小: $minBuffer")
Log.d(TAG, "创建AudioRecord - sampleRate=$SAMPLE_RATE, bufferSize=$bufferSize")
Log.i(TAG, "AudioRecord初始化成功，开始录音")
Log.i(TAG, "录音已启动")
```

#### recordAndBufferAudio()
```kotlin
Log.d(TAG, "开始录音循环 - sessionId=$sessionId")
Log.d(TAG, "已录音: ${totalBytes / 1024}KB")  // 每32KB打印一次
Log.i(TAG, "录音循环结束 - 总字节数: $totalBytes")
```

#### processRecordedAudio()
```kotlin
Log.d(TAG, "processRecordedAudio被调用 - hasAudio=$hasAudio, sessionId=$sessionId")
Log.d(TAG, "音频数据大小: ${audioBytes.size} bytes (${audioBytes.size / 1024}KB)")
Log.i(TAG, "开始调用阿里云ASR - 音频大小: ${audioBytes.size} bytes")
Log.i(TAG, "ASR识别结果: $text")
```

#### submitUserText()
```kotlin
Log.d(TAG, "submitUserText被调用 - text=$text")
Log.i(TAG, "通过WebSocket发送text_message - sessionId=$sessionId, text=$normalized")
```

#### handleVoiceResponse()
```kotlin
Log.d(TAG, "handleVoiceResponse被调用 - data=$data")
Log.i(TAG, "收到语音响应 - text=$text, ttsMode=$ttsMode, audioUrl=$audioUrl")
```

#### playClientSideTts()
```kotlin
Log.d(TAG, "playClientSideTts被调用 - text=$text")
Log.i(TAG, "开始调用阿里云TTS - textLen=${text.length}")
Log.i(TAG, "TTS成功，开始播放 - file=${audioFile.absolutePath}")
```

### 3. 添加Backend端详细日志 ✅

**文件**：`backend-api/src/websocket/realtime-voice.websocket.ts`

**添加的日志点**：

#### 连接事件
```typescript
socket.on('disconnect', (reason) => {
  console.log(`👋 客户端断开连接: ${socket.id}, 原因: ${reason}`);
});

socket.on('error', (error) => {
  console.error(`❌ Socket错误 (${socket.id}):`, error);
});
```

#### text_message处理
```typescript
console.log(`📨 收到text_message事件 - socketId: ${socket.id}, data:`, data);
console.log(`💬 收到文本消息 (Session: ${data.sessionId}): ${text}`);
console.log(`🔄 使用语音处理管道处理文本...`);
console.log(`✅ 语音处理管道返回结果:`, { text, audioUrl, ttsMode });
console.log(`📤 已发送voice_response到客户端`);
```

**文件**：`backend-api/src/routes/voice.routes.ts`

#### Token获取
```typescript
console.log('[Voice Route] 📨 /aliyun-token 请求已接收', { method, path, headers });
console.log('[Voice Route] 🔑 AppKey已配置:', appKey.substring(0, 8) + '...');
console.log('[Voice Route] 🔄 开始获取阿里云Token...');
console.log('[Voice Route] ✅ Token获取成功, expireTime:', new Date(tokenInfo.expireTime).toISOString());
console.log('[Voice Route] 📤 返回配置:', { region, asrEndpoint, ttsEndpoint, ... });
```

### 4. 创建测试指南文档 ✅

**文件**：`android-v0-compose/VOICE_TESTING_GUIDE.md`

包含内容：
- 系统架构说明
- 完整流程说明（6个阶段）
- 日志查看命令
- 关键日志点示例
- 常见问题诊断
- 测试步骤
- 性能指标

## 验证步骤

### 1. 重启Backend服务
```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

### 2. 重新编译安装App
```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. 开启日志监控
```bash
# 终端1: Android日志
adb logcat -c  # 清空日志
adb logcat | grep -E "RealtimeVoiceManager|AliyunSpeechService"

# 终端2: 后端日志 (npm run dev已包含)
```

### 4. 执行测试
1. 打开App，进入数字人面试界面
2. 观察WebSocket连接日志
3. 点击"开始答题"按钮
4. 说话2-3秒
5. 点击"结束回答"
6. 观察完整流程日志

## 预期日志输出

### Android端关键日志序列

```
# 1. 连接
D/RealtimeVoiceManager: 尝试连接实时语音服务: http://192.168.1.6:3001
D/RealtimeVoiceManager: WebSocket连接成功: http://192.168.1.6:3001

# 2. 开始录音
D/RealtimeVoiceManager: startRecording被调用 - isRecording=false, connectionState=CONNECTED
I/RealtimeVoiceManager: 开始初始化录音 - sessionId=xxx
D/RealtimeVoiceManager: AudioRecord最小缓冲区大小: 3200
I/RealtimeVoiceManager: AudioRecord初始化成功，开始录音
D/RealtimeVoiceManager: 开始录音循环 - sessionId=xxx

# 3. 录音中
D/RealtimeVoiceManager: 已录音: 32KB
D/RealtimeVoiceManager: 已录音: 64KB

# 4. 停止录音
D/RealtimeVoiceManager: stopRecording被调用 - isRecording=true
I/RealtimeVoiceManager: 录音循环结束 - 总字节数: 102400

# 5. ASR识别
D/RealtimeVoiceManager: processRecordedAudio被调用
D/RealtimeVoiceManager: 音频数据大小: 102400 bytes (100KB)
I/RealtimeVoiceManager: 开始调用阿里云ASR - 音频大小: 102400 bytes
D/AliyunSpeechService: ASR开始: endpoint=https://..., bytes=102400
D/AliyunSpeechService: ASR成功: text=你好世界
I/RealtimeVoiceManager: ASR识别结果: 你好世界

# 6. 发送文本
I/RealtimeVoiceManager: 通过WebSocket发送text_message - text=你好世界

# 7. 收到回复
D/RealtimeVoiceManager: handleVoiceResponse被调用
I/RealtimeVoiceManager: 收到语音响应 - text=您好！, ttsMode=client

# 8. TTS播放
D/RealtimeVoiceManager: playClientSideTts被调用 - text=您好！
I/RealtimeVoiceManager: 开始调用阿里云TTS - textLen=3
D/AliyunSpeechService: TTS开始: endpoint=https://..., textLen=3
D/AliyunSpeechService: TTS成功: file=/data/.../aliyun_tts_xxx.mp3
I/RealtimeVoiceManager: TTS成功，开始播放
```

### Backend端关键日志序列

```
# 1. 连接
🔗 客户端已连接: <socket-id>
✅ 用户初始化会话: xxx (Socket: <socket-id>)

# 2. Token请求
[Voice Route] 📨 /aliyun-token 请求已接收
[Voice Route] 🔑 AppKey已配置: xxxxxx...
[Voice Route] 🔄 开始获取阿里云Token...
[Voice Route] ✅ Token获取成功, expireTime: 2025-11-12T13:00:00.000Z
[Voice Route] 📤 返回配置: { region: 'cn-shanghai', ... }

# 3. 文本消息处理
📨 收到text_message事件 - socketId: <socket-id>, data: { text: '你好世界' }
💬 收到文本消息 (Session: xxx): 你好世界
🔄 使用语音处理管道处理文本...
✅ 语音处理管道返回结果: { text: '您好！', ttsMode: 'client' }
📤 已发送voice_response到客户端
```

## 待验证项

### 功能测试
- [ ] WebSocket连接稳定（不频繁断开）
- [ ] 录音功能正常
- [ ] ASR识别准确
- [ ] 文本发送成功
- [ ] 收到voice_response
- [ ] TTS合成成功
- [ ] 音频播放正常
- [ ] Live2D嘴型同步

### 性能测试
- [ ] WebSocket连接 < 2秒
- [ ] ASR识别 < 2秒
- [ ] LLM生成 < 5秒
- [ ] TTS合成 < 2秒
- [ ] 总延迟 < 10秒

## 已知问题和局限

### 1. 阿里云配置要求
需要在`backend-api/.env`中配置：
- `ALIYUN_NLS_ACCESS_KEY_ID`
- `ALIYUN_NLS_ACCESS_KEY_SECRET`
- `ALIYUN_NLS_APP_KEY`
- `ALIYUN_NLS_REGION`

### 2. 网络要求
- App需要能访问backend-api服务器（http://192.168.1.6:3001）
- App需要能访问阿里云NLS服务（https://nls-gateway.*.aliyuncs.com）

### 3. 权限要求
- Android App需要麦克风权限（RECORD_AUDIO）
- Android App需要网络权限（INTERNET）

## 下一步行动

1. **立即执行测试**
   - 重启backend服务
   - 重新安装App
   - 执行完整测试流程
   - 收集所有日志

2. **根据日志诊断**
   - 检查是否所有预期日志都出现
   - 识别哪个环节出现问题
   - 查看错误消息

3. **问题修复**
   - 如果WebSocket仍然断开：检查防火墙、代理设置
   - 如果ASR失败：检查阿里云配置、网络访问
   - 如果TTS失败：检查Token有效期、API配额

## 参考文档

- [VOICE_TESTING_GUIDE.md](./VOICE_TESTING_GUIDE.md) - 详细测试指南
- [backend-api README](../backend-api/README.md) - 后端服务说明
- [阿里云NLS文档](https://help.aliyun.com/product/30413.html) - 官方API文档

---

**创建时间**：2025-11-12
**最后更新**：2025-11-12
**版本**：v1.0

