# 火山引擎语音SDK集成指南

本文档说明如何在AI面试系统中集成火山引擎的ASR（语音识别）、TTS（语音合成）和VAD（语音活动检测）功能。

## 目录

1. [架构概述](#架构概述)
2. [后端配置](#后端配置)
3. [Android端集成](#android端集成)
4. [功能说明](#功能说明)
5. [常见问题](#常见问题)

---

## 架构概述

### 整体架构

```
┌─────────────────┐
│   Android App   │  用户交互层
└────────┬────────┘
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│  Backend API    │  配置管理层
└────────┬────────┘
         │ 提供配置
         ↓
┌─────────────────┐
│  火山引擎 SDK   │  核心语音处理
└─────────────────┘
```

### 职责划分

- **Android App**: 
  - 用户交互（录音、播放）
  - 调用火山引擎SDK进行ASR/TTS/VAD
  - 将识别结果发送给后端

- **Backend API**: 
  - 提供火山引擎配置信息（/api/voice/config）
  - 接收识别的文本并处理
  - 生成面试问题和返回响应

- **火山引擎SDK**: 
  - 实时语音识别（ASR）
  - 语音合成（TTS）
  - 语音活动检测（VAD）

---

## 后端配置

### 1. 环境变量设置

在 `backend-api/.env` 文件中添加以下配置：

```bash
# ========================================
# 火山引擎实时语音配置
# ========================================

# 基础认证信息（必填）
VOLC_APP_ID="8658504805"
VOLC_ACCESS_KEY="Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0"
VOLC_SECRET_KEY="cokXGSQu8DaPQsYICYk4aHrNMVHH-LpY"

# ASR（语音识别）配置
VOLC_CLUSTER="volcengine_streaming_common"
VOLC_ASR_ADDRESS="wss://openspeech.bytedance.com"
VOLC_ASR_URI="/api/v2/asr"
VOLC_ASR_RESOURCE_ID="Speech_Recognition_Seed_streaming2000000444970982562"
VOLC_ASR_REQ_PARAMS='{"res_id":"Speech_Recognition_Seed_streaming2000000444970982562"}'

# TTS（语音合成）配置
VOLC_TTS_CLUSTER="volcano_tts"
VOLC_TTS_RESOURCE_ID="Speech_Synthesis2000000444875413602"
VOLC_TTS_URI="/api/v3/tts/bidirection"

# VAD（语音活动检测）配置
VOLC_VAD_START_SILENCE_MS=250   # 开始说话前的静音时长（毫秒）
VOLC_VAD_END_SILENCE_MS=600     # 结束说话后的静音时长（毫秒）

# 可选配置
VOLC_LANGUAGE="zh-CN"
VOLC_API_KEY_NAME="ai-interview"
VOLC_PROJECT_NAME="default"
```

### 2. 配置API路由

配置已在 `backend-api/src/routes/voice.routes.ts` 中实现，无需额外修改。

API端点：`GET /api/voice/config`

返回示例：
```json
{
  "success": true,
  "data": {
    "appId": "8658504805",
    "token": "自动生成的Token",
    "cluster": "volcengine_streaming_common",
    "address": "wss://openspeech.bytedance.com",
    "uri": "/api/v2/asr",
    "asrUri": "/api/v2/asr",
    "asrResourceId": "Speech_Recognition_Seed_streaming2000000444970982562",
    "asrCluster": "volcengine_streaming_common",
    "ttsUri": "/api/v3/tts/bidirection",
    "ttsResourceId": "Speech_Synthesis2000000444875413602",
    "ttsCluster": "volcano_tts",
    "language": "zh-CN",
    "vadStartSilenceMs": 250,
    "vadEndSilenceMs": 600
  }
}
```

---

## Android端集成

### 1. 依赖配置

在 `app/build.gradle.kts` 中已添加必要依赖：

```kotlin
// Volcengine 双向流式语音 SDK 所需依赖
implementation("com.bytedance.boringssl.so:boringssl-so:1.3.6")
implementation("org.chromium.net:cronet:4.2.210.3-tob") {
    exclude(group = "com.bytedance.common", module = "wschannel")
}
implementation("com.bytedance.frameworks.baselib:ttnet:4.2.210.3-tob")
implementation("com.bytedance.speechengine:speechengine_tob:0.0.11.1-bugfix")
```

### 2. 权限配置

在 `AndroidManifest.xml` 中已添加必要权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### 3. 核心组件

#### VolcAsrManager
负责ASR（语音识别）和VAD（语音活动检测）：

```kotlin
val asrManager = VolcAsrManager(context)

// 配置
asrManager.configure(
    VolcAsrManager.Credentials(
        appId = "8658504805",
        token = "从后端获取的token",
        cluster = "volcengine_streaming_common",
        resourceId = "Speech_Recognition_Seed_streaming2000000444970982562",
        vadStartSilenceMs = 250,
        vadEndSilenceMs = 600
    )
)

// 启动会话
asrManager.startSession(sessionId, uid, sampleRate)

// 喂入音频数据
asrManager.feedAudio(audioData, length)

// 监听识别结果
scope.launch {
    asrManager.finalResults.collect { result ->
        // 处理最终识别结果
        println("识别结果: ${result.text}")
    }
}

// 监听VAD状态
scope.launch {
    asrManager.vadState.collect { state ->
        when(state) {
            VadState.SPEAKING -> println("开始说话")
            VadState.SILENCE -> println("停止说话")
            else -> {}
        }
    }
}

// 停止会话
asrManager.stopSession()
```

#### VolcSpeechEngineManager
负责TTS（语音合成）：

```kotlin
val ttsManager = VolcSpeechEngineManager(context)

// 配置
ttsManager.configure(
    VolcSpeechEngineManager.VolcCredentials(
        appId = "8658504805",
        token = "从后端获取的token",
        cluster = "volcano_tts",
        resourceId = "Speech_Synthesis2000000444875413602",
        uri = "/api/v3/tts/bidirection"
    ),
    uid = "user-id"
)

// 启动会话
ttsManager.startSession()

// 提交文本进行合成
ttsManager.submitText("你好，欢迎参加AI面试")

// 接收合成的PCM音频数据
scope.launch {
    ttsManager.pcmStream.collect { pcmData ->
        // 播放音频
        audioTrack?.write(pcmData, 0, pcmData.size)
    }
}

// 监听播放状态
scope.launch {
    ttsManager.isSpeaking.collect { speaking ->
        if (speaking) {
            println("正在播放")
        } else {
            println("播放结束")
        }
    }
}

// 结束会话
ttsManager.finishSession()
```

#### RealtimeVoiceManager
统一管理ASR和TTS，并与后端WebSocket通信：

```kotlin
val voiceManager = RealtimeVoiceManager(context)

// 初始化并连接WebSocket
voiceManager.initialize(
    serverUrl = "http://your-server:3001",
    sessionId = "session-123",
    userId = "user-456"
)

// 开始录音（自动进行ASR）
voiceManager.startRecording()

// 监听识别结果
scope.launch {
    voiceManager.partialTranscript.collect { text ->
        println("部分识别: $text")
    }
}

// 监听对话历史
scope.launch {
    voiceManager.conversation.collect { messages ->
        messages.forEach { msg ->
            println("${msg.role}: ${msg.text}")
        }
    }
}

// 停止录音
voiceManager.stopRecording()

// 清理资源
voiceManager.cleanup()
```

---

## 功能说明

### ASR（自动语音识别）

**特性：**
- 实时流式识别
- 支持中文、英文等多语言
- 自动标点符号
- 支持自定义词汇

**配置参数：**
- `appId`: 应用ID
- `token`: 访问令牌（从后端获取）
- `cluster`: 集群ID（volcengine_streaming_common）
- `resourceId`: 资源实例ID
- `vadStartSilenceMs`: VAD开始静音阈值（默认250ms）
- `vadEndSilenceMs`: VAD结束静音阈值（默认600ms）

**使用流程：**
1. 配置ASR引擎
2. 启动会话
3. 持续喂入音频数据
4. 接收识别结果（部分结果和最终结果）
5. 停止会话

### TTS（语音合成）

**特性：**
- 流式音频输出
- 支持多种音色
- 自然流畅的语音
- 支持情感控制

**配置参数：**
- `appId`: 应用ID
- `token`: 访问令牌
- `cluster`: TTS集群ID（volcano_tts）
- `resourceId`: TTS资源实例ID
- `uri`: TTS服务URI

**使用流程：**
1. 配置TTS引擎
2. 启动会话
3. 提交待合成的文本
4. 接收PCM音频流
5. 播放音频
6. 结束会话

### VAD（语音活动检测）

**特性：**
- 实时检测用户说话状态
- 自动检测开始和结束
- 可配置静音阈值

**配置参数：**
- `vadStartSilenceMs`: 判定开始说话前的最小静音时长
- `vadEndSilenceMs`: 判定停止说话后的最小静音时长

**状态：**
- `IDLE`: 空闲状态
- `SPEAKING`: 正在说话
- `SILENCE`: 检测到静音

---

## 常见问题

### 1. Token获取失败

**问题**: 无法从后端获取有效的Token

**解决方案**:
1. 检查 `VOLC_APP_ID`、`VOLC_ACCESS_KEY`、`VOLC_SECRET_KEY` 是否正确配置
2. 确认网络连接正常
3. 查看后端日志，确认token生成逻辑正常

### 2. ASR识别不准确

**问题**: 语音识别结果不准确

**解决方案**:
1. 确认使用正确的 `VOLC_ASR_RESOURCE_ID`
2. 检查音频质量（采样率16000Hz，16bit，单声道）
3. 调整VAD参数，避免过早截断
4. 在安静环境下测试

### 3. TTS没有声音

**问题**: TTS合成后没有声音输出

**解决方案**:
1. 确认 `VOLC_TTS_RESOURCE_ID` 和 `VOLC_TTS_CLUSTER` 配置正确
2. 检查AudioTrack是否正确初始化
3. 确认音频格式匹配（PCM 16bit 16kHz）
4. 查看日志确认收到了PCM数据

### 4. VAD检测不灵敏

**问题**: VAD检测用户说话的时机不准确

**解决方案**:
1. 调整 `VOLC_VAD_START_SILENCE_MS`（建议范围：200-500ms）
2. 调整 `VOLC_VAD_END_SILENCE_MS`（建议范围：500-1000ms）
3. 确保麦克风权限已授予
4. 在安静环境下测试

### 5. 连接超时

**问题**: WebSocket连接或ASR/TTS会话超时

**解决方案**:
1. 检查网络连接稳定性
2. 确认防火墙未阻止WebSocket连接
3. 检查服务器地址和端口配置
4. 增加超时时间配置

---

## 集成检查清单

### 后端配置
- [ ] 已在 `.env` 文件中配置所有必要的环境变量
- [ ] 已启动 backend-api 服务
- [ ] `/api/voice/config` 端点返回正确的配置信息
- [ ] Token自动生成正常工作

### Android端配置
- [ ] 已添加火山引擎SDK依赖
- [ ] 已添加必要的权限声明
- [ ] 已在运行时请求麦克风和录音权限
- [ ] 网络配置允许访问后端API

### 功能测试
- [ ] ASR能正常识别语音
- [ ] TTS能正常播放合成语音
- [ ] VAD能正确检测说话状态
- [ ] WebSocket连接稳定
- [ ] 完整的对话流程正常工作

---

## 技术支持

### 参考文档
- [火山引擎实时语音识别文档](https://www.volcengine.com/docs/6561/113641)
- [火山引擎语音合成文档](https://www.volcengine.com/docs/6561/113642)
- [火山引擎SDK Android集成](https://www.volcengine.com/docs/6561/1739229)

### 联系方式
如有问题，请联系项目维护团队或查阅火山引擎官方文档。

---

**最后更新**: 2025-11-06
**版本**: 1.0.0

