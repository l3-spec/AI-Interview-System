# 数字人语音交互测试指南

本文档说明如何测试和诊断数字人界面的阿里云ASR+TTS+VAD语音交互功能。

## 系统架构

```
Android App (Kotlin)
  ├─ RealtimeVoiceManager          # 语音管理器
  ├─ AliyunSpeechService           # 阿里云语音服务
  │   ├─ 从backend-api获取Token
  │   ├─ ASR: 直接调用阿里云API
  │   └─ TTS: 直接调用阿里云API
  └─ WebSocket (Socket.IO)         # 与backend-api通信

Backend-API (Node.js)
  ├─ /api/voice/aliyun-token       # 提供阿里云Token
  ├─ WebSocket: text_message       # 接收用户文本
  ├─ DeepSeek LLM                  # 生成回复
  └─ WebSocket: voice_response     # 返回回复文本
```

## 完整流程

### 1. 初始化阶段
- App启动时，RealtimeVoiceManager初始化
- 连接到WebSocket服务 (http://192.168.1.6:3001)
- 发送`join_session`消息

### 2. 录音阶段
- 用户点击"开始答题"按钮
- 调用`voiceManager.startRecording()`
- AudioRecord开始录音，缓冲PCM音频数据

### 3. ASR识别阶段
- 用户点击"结束回答"按钮
- 调用`voiceManager.stopRecording()`
- AliyunSpeechService从backend-api获取Token（缓存1小时）
- 直接调用阿里云ASR API识别PCM音频
- 返回识别文本

### 4. LLM处理阶段
- 通过WebSocket发送`text_message`到backend-api
- Backend-api调用DeepSeek生成回复
- 返回`voice_response`消息

### 5. TTS播放阶段
- 收到voice_response后，根据ttsMode:
  - `client`: AliyunSpeechService调用阿里云TTS API
  - `server`: 从audioUrl下载音频
- MediaPlayer播放音频
- Visualizer驱动Live2D嘴型动画

## 日志查看

### Android端日志
```bash
# 查看所有相关日志
adb logcat | grep -E "RealtimeVoiceManager|AliyunSpeechService|DigitalInterviewScreen"

# 只看RealtimeVoiceManager
adb logcat | grep RealtimeVoiceManager

# 只看AliyunSpeechService (ASR/TTS)
adb logcat | grep AliyunSpeechService
```

### 后端日志
```bash
# 进入backend-api目录
cd backend-api

# 查看实时日志
npm run dev

# 或查看特定日志
tail -f logs/app.log | grep -E "Voice Route|text_message|voice_response"
```

## 关键日志点

### Android端应该看到的日志

#### 1. 初始化
```
D/RealtimeVoiceManager: 尝试连接实时语音服务: http://192.168.1.6:3001 (session=xxx)
D/RealtimeVoiceManager: WebSocket连接成功: http://192.168.1.6:3001
```

#### 2. 开始录音
```
D/RealtimeVoiceManager: startRecording被调用 - isRecording=false, connectionState=CONNECTED, sessionId=xxx
I/RealtimeVoiceManager: 开始初始化录音 - sessionId=xxx
D/RealtimeVoiceManager: AudioRecord最小缓冲区大小: 3200
D/RealtimeVoiceManager: 创建AudioRecord - sampleRate=16000, bufferSize=6400
I/RealtimeVoiceManager: AudioRecord初始化成功，开始录音
D/RealtimeVoiceManager: 开始录音循环 - sessionId=xxx
I/RealtimeVoiceManager: 录音已启动
```

#### 3. 录音中
```
D/RealtimeVoiceManager: 已录音: 32KB
D/RealtimeVoiceManager: 已录音: 64KB
...
```

#### 4. 停止录音
```
D/RealtimeVoiceManager: stopRecording被调用 - isRecording=true
I/RealtimeVoiceManager: 停止录音
I/RealtimeVoiceManager: 录音循环结束 - 总字节数: 102400
```

#### 5. ASR识别
```
D/RealtimeVoiceManager: processRecordedAudio被调用 - hasAudio=true, sessionId=xxx
D/RealtimeVoiceManager: 音频数据大小: 102400 bytes (100KB)
I/RealtimeVoiceManager: 开始调用阿里云ASR - 音频大小: 102400 bytes
D/AliyunSpeechService: ASR开始: endpoint=https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/asr, format=pcm, sampleRate=16000, bytes=102400
D/AliyunSpeechService: ASR成功: text=你好，我想应聘软件工程师职位
I/RealtimeVoiceManager: ASR识别结果: 你好，我想应聘软件工程师职位
```

#### 6. 发送文本
```
I/RealtimeVoiceManager: 准备提交用户文本: 你好，我想应聘软件工程师职位
D/RealtimeVoiceManager: submitUserText被调用 - text=你好，我想应聘软件工程师职位
I/RealtimeVoiceManager: 通过WebSocket发送text_message - sessionId=xxx, text=你好，我想应聘软件工程师职位
```

#### 7. 收到回复
```
D/RealtimeVoiceManager: handleVoiceResponse被调用 - data={"text":"...","ttsMode":"client"}
I/RealtimeVoiceManager: 收到语音响应 - text=您好！很高兴认识您..., ttsMode=client, audioUrl=null
```

#### 8. TTS播放
```
D/RealtimeVoiceManager: playClientSideTts被调用 - text=您好！很高兴认识您...
I/RealtimeVoiceManager: 开始调用阿里云TTS - textLen=50
D/AliyunSpeechService: TTS开始: endpoint=https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts, voice=siqi, format=mp3, textLen=50
D/AliyunSpeechService: TTS成功: file=/data/user/0/.../cache/aliyun_tts_xxx.mp3, size=12345
I/RealtimeVoiceManager: TTS成功，开始播放 - file=/data/user/0/.../cache/aliyun_tts_xxx.mp3
```

### Backend端应该看到的日志

#### 1. 连接
```
🔗 客户端已连接: <socket-id>
✅ 用户初始化会话: xxx (Socket: <socket-id>)
```

#### 2. Token请求
```
[Voice Route] 📨 /aliyun-token 请求已接收
[Voice Route] 🔑 AppKey已配置: xxxxxx...
[Voice Route] 🔄 开始获取阿里云Token...
[Voice Route] ✅ Token获取成功, expireTime: 2025-11-12T13:00:00.000Z
[Voice Route] 📤 返回配置: { region: 'cn-shanghai', ... }
```

#### 3. 文本消息
```
📨 收到text_message事件 - socketId: <socket-id>, data: { text: '你好，我想应聘软件工程师职位', sessionId: 'xxx' }
💬 收到文本消息 (Session: xxx): 你好，我想应聘软件工程师职位
🔄 使用语音处理管道处理文本...
✅ 语音处理管道返回结果: { text: '您好！很高兴认识您...', ttsMode: 'client', ... }
📤 已发送voice_response到客户端
```

## 常见问题诊断

### 问题1: WebSocket频繁断开

**症状**：
```
D/RealtimeVoiceManager: WebSocket连接断开
D/RealtimeVoiceManager: 尝试连接实时语音服务...
```

**解决方案**：
- ✅ 已修复：在backend-api配置了心跳参数（pingTimeout: 60s, pingInterval: 25s）
- 确保backend-api已重启以应用新配置

### 问题2: 没有录音日志

**症状**：点击"开始答题"后没有任何录音相关日志

**检查项**：
1. 麦克风权限是否授予？
2. ConnectionState是否为CONNECTED？
3. SessionId是否已初始化？

**日志示例**：
```bash
# 如果看到这些错误日志
E/RealtimeVoiceManager: 语音服务尚未连接，无法开始录音
E/RealtimeVoiceManager: 会话未初始化，无法开始录音
E/RealtimeVoiceManager: 麦克风初始化失败，state=0
```

### 问题3: ASR识别失败

**症状**：
```
E/RealtimeVoiceManager: 阿里云ASR失败
E/AliyunSpeechService: ASR失败: code=400, body=...
```

**检查项**：
1. 是否成功获取了阿里云Token？
2. PCM音频格式是否正确（16kHz, mono, 16-bit）？
3. 阿里云配置是否正确？

**验证Token获取**：
```bash
# 手动测试Token API
curl http://192.168.1.6:3001/api/voice/aliyun-token
```

### 问题4: TTS播放失败

**症状**：
```
E/RealtimeVoiceManager: 客户端TTS失败
E/AliyunSpeechService: TTS失败: code=400, body=...
```

**检查项**：
1. Token是否过期？
2. TTS文本是否为空或过长？
3. 网络连接是否正常？

### 问题5: 没有收到voice_response

**症状**：发送text_message后没有收到回复

**检查项**：
1. 后端是否收到了text_message？
2. LLM处理是否超时？
3. WebSocket是否在等待响应时断开？

**后端日志应该显示**：
```
📨 收到text_message事件 ...
💬 收到文本消息 ...
🔄 使用语音处理管道处理文本...
✅ 语音处理管道返回结果...
📤 已发送voice_response到客户端
```

## 测试步骤

### 1. 启动后端服务
```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

### 2. 检查环境变量
确保backend-api/.env包含：
```
# 阿里云NLS配置
ALIYUN_NLS_ACCESS_KEY_ID=xxx
ALIYUN_NLS_ACCESS_KEY_SECRET=xxx
ALIYUN_NLS_APP_KEY=xxx
ALIYUN_NLS_REGION=cn-shanghai

# DeepSeek配置
DEEPSEEK_API_KEY=xxx
```

### 3. 重新编译安装App
```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 4. 开启日志监控
```bash
# 终端1: Android日志
adb logcat | grep -E "RealtimeVoiceManager|AliyunSpeechService"

# 终端2: 后端日志（已在npm run dev中）
```

### 5. 执行测试
1. 打开App，进入数字人面试界面
2. 等待WebSocket连接成功（约2-3秒）
3. 点击"开始答题"
4. 说话2-3秒
5. 点击"结束回答"
6. 观察日志输出

### 6. 验证结果
- [ ] WebSocket连接稳定（不频繁断开）
- [ ] 录音日志正常（可以看到录音字节数）
- [ ] ASR识别成功（返回文本）
- [ ] 文本发送到后端
- [ ] 收到voice_response
- [ ] TTS合成成功
- [ ] 音频播放正常
- [ ] Live2D嘴型动画跟随音频

## 性能指标

正常情况下的延迟：
- WebSocket连接：< 2秒
- ASR识别：< 2秒（取决于音频长度）
- LLM生成：< 5秒
- TTS合成：< 2秒
- 总延迟：< 10秒

## 联系支持

如果问题仍然存在，请收集以下信息：
1. 完整的Android日志（adb logcat）
2. 完整的后端日志
3. 网络环境信息（WiFi/4G、IP地址）
4. 测试时间和SessionId
5. 具体的错误消息

---

**最后更新**：2025-11-12
**版本**：v1.0

