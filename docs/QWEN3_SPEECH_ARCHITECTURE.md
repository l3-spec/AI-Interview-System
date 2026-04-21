# Qwen3 ASR/TTS 微服务架构文档

## 概述

本系统采用**独立微服务 + 双轨混合流式架构（Dual-Track Hybrid Streaming）**，将 ASR（语音识别）和 TTS（语音合成）从 `backend-api` 中拆分为独立服务，通过 WebSocket 长连接实现低延迟实时通信。

### 核心技术选型

| 组件 | 技术方案 | 说明 |
|------|---------|------|
| **ASR** | Qwen3-ASR-Flash-Realtime | 52 语种支持，Server VAD 自动端点检测 |
| **TTS** | Qwen3-TTS-Instruct-Flash-Realtime | 双轨混合流式，首包延迟 ~97ms，支持自然语言指令控制 |
| **通信协议** | WebSocket (DashScope Realtime API) | 全双工长连接，流式输入输出 |
| **跨服务通信** | Redis Pub/Sub | 事件驱动，backend-api 与 ASR/TTS 服务异步协调 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       客户端 (Android/iOS/Web)               │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐   │
│  │ 录音模块  │    │ 播放模块  │    │  Socket.IO (业务逻辑)  │   │
│  └────┬─────┘    └────▲─────┘    └──────────┬───────────┘   │
│       │               │                      │               │
└───────┼───────────────┼──────────────────────┼───────────────┘
        │               │                      │
    WebSocket       WebSocket            Socket.IO
   (音频上行)      (音频下行)         (面试流程控制)
        │               │                      │
        ▼               │                      ▼
┌───────────────┐ ┌─────┴─────────┐  ┌──────────────────┐
│  ASR Service  │ │  TTS Service  │  │   Backend API    │
│  (port 3002)  │ │  (port 3003)  │  │   (port 3001)    │
│               │ │               │  │                  │
│  Qwen3-ASR    │ │  Qwen3-TTS    │  │  面试流程引擎     │
│  WebSocket    │ │  双轨混合流式   │  │  LLM (DeepSeek)  │
│  长连接管理    │ │  文本→音频流    │  │  数据库/缓存      │
└───────┬───────┘ └───────┬───────┘  └────────┬─────────┘
        │                 │                    │
        │     ┌───────────┼────────────────────┘
        │     │           │
        ▼     ▼           ▼
    ┌─────────────────────────┐
    │      Redis Pub/Sub      │
    │  asr:events / commands  │
    │  tts:events / commands  │
    └─────────────────────────┘
        │                 │
        ▼                 ▼
┌───────────────────────────────────┐
│     DashScope WebSocket API       │
│  wss://dashscope.aliyuncs.com/    │
│      api-ws/v1/realtime           │
│                                   │
│  ┌─────────────┐ ┌─────────────┐ │
│  │ Qwen3-ASR   │ │ Qwen3-TTS   │ │
│  │ Flash       │ │ Instruct    │ │
│  │ Realtime    │ │ Flash RT    │ │
│  └─────────────┘ └─────────────┘ │
└───────────────────────────────────┘
```

---

## 双轨混合流式架构详解

### Track 1: 文本流式输入
```
LLM 输出文本 → 分片 → TTS Service → DashScope Qwen3-TTS
                         ↓
              input_text_buffer.append (多次调用)
```

### Track 2: 音频流式输出
```
DashScope Qwen3-TTS → response.audio.delta → TTS Service → 客户端
                       (Base64 PCM 音频块)        ↓
                                           WebSocket 实时推送
```

**两条轨道并行运行**：文本还在输入时，已合成的音频就在输出，实现真正的端到端低延迟。

### TTS 合成模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `server_commit` | 服务端自动判断分段和合成时机 | LLM 流式输出场景（推荐） |
| `commit` | 客户端手动触发合成 | 需要精确控制断句的场景 |

---

## 服务通信协议

### 客户端 → ASR Service (WebSocket)

| 消息类型 | 说明 | 数据 |
|---------|------|------|
| `session.create` | 创建 ASR 会话 | `{ sessionId, config: { language, sampleRate, vadMode } }` |
| `audio.append` | 发送音频数据 | `{ audio: "<Base64 PCM>" }` |
| `audio.commit` | 提交缓冲区 (manual模式) | `{}` |
| `session.finish` | 结束会话 | `{}` |

### ASR Service → 客户端 (WebSocket)

| 消息类型 | 说明 | 数据 |
|---------|------|------|
| `asr.session_created` | 会话已创建 | `{ sessionId }` |
| `asr.speech_started` | 检测到语音开始 | `{ timestamp }` |
| `asr.speech_stopped` | 检测到语音结束 | `{ timestamp }` |
| `asr.transcription_partial` | 中间识别结果 | `{ text, isFinal: false }` |
| `asr.transcription_final` | 最终识别结果 | `{ text, isFinal: true }` |
| `asr.session_finished` | 会话已结束 | `{}` |
| `asr.error` | 错误 | `{ error }` |

### 客户端 → TTS Service (WebSocket)

| 消息类型 | 说明 | 数据 |
|---------|------|------|
| `session.create` | 创建 TTS 会话 | `{ sessionId, config: { voice, mode, instructions } }` |
| `text.append` | 追加文本 | `{ text }` |
| `text.commit` | 提交缓冲区 | `{}` |
| `text.clear` | 清空缓冲区（中断） | `{}` |
| `session.finish` | 结束会话 | `{}` |

### TTS Service → 客户端 (WebSocket)

| 消息类型 | 说明 | 数据 |
|---------|------|------|
| `tts.session_created` | 会话已创建 | `{ sessionId }` |
| `tts.audio_chunk` | 音频数据块 | `{ audio: "<Base64 PCM>", responseId }` |
| `tts.response_done` | 一段文本合成完成 | `{ responseId }` |
| `tts.session_finished` | 会话已结束 | `{}` |
| `tts.error` | 错误 | `{ error }` |

### Redis 跨服务通信

| 频道 | 方向 | 用途 |
|------|------|------|
| `asr:events` | ASR → Backend | ASR 事件（识别结果等） |
| `asr:commands` | Backend → ASR | 控制指令（关闭会话等） |
| `tts:events` | TTS → Backend | TTS 事件（音频块、完成等） |
| `tts:commands` | Backend → TTS | 合成指令（发送文本等） |

---

## 面试流程中的数据流

```
1. 客户端录音 → PCM 音频流
   ↓
2. WebSocket → ASR Service (端口 3002)
   ↓
3. ASR Service → DashScope Qwen3-ASR (WebSocket)
   ↓
4. 识别结果 → 客户端（实时字幕） + Redis asr:events
   ↓
5. Backend-API 收到识别文本 → DeepSeek LLM 生成回答
   ↓
6. LLM 流式输出 → Redis tts:commands → TTS Service
   ↓
7. TTS Service → DashScope Qwen3-TTS (双轨流式)
   ↓
8. 音频块 → WebSocket → 客户端（实时播放）
   同时: 文本块 → Socket.IO → 客户端（实时字幕）
```

---

## 部署指南

### 环境变量

#### ASR Service (asr-service/.env)

```bash
ASR_SERVICE_PORT=3002
DASHSCOPE_API_KEY=sk-xxx
QWEN_ASR_MODEL=qwen3-asr-flash-realtime
DASHSCOPE_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
ASR_LANGUAGE=zh
ASR_SAMPLE_RATE=16000
ASR_VAD_MODE=server_vad
REDIS_URL=redis://localhost:6379
```

#### TTS Service (tts-service/.env)

```bash
TTS_SERVICE_PORT=3003
DASHSCOPE_API_KEY=sk-xxx
QWEN_TTS_MODEL=qwen3-tts-instruct-flash-realtime
DASHSCOPE_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
TTS_VOICE=Cherry
TTS_MODE=server_commit
TTS_INSTRUCTIONS=语气专业沉稳，节奏适中，像一位经验丰富的面试官。
REDIS_URL=redis://localhost:6379
```

#### Backend API (新增变量)

```bash
ASR_SERVICE_URL=http://localhost:3002
TTS_SERVICE_URL=http://localhost:3003
DASHSCOPE_API_KEY=sk-xxx
QWEN_ASR_MODEL=qwen3-asr-flash-realtime
QWEN_TTS_MODEL=qwen3-tts-instruct-flash-realtime
```

### 启动命令

```bash
# 方式一：使用启动脚本（推荐）
./start-speech-services.sh    # 启动 ASR + TTS 微服务
cd backend-api && npm run dev  # 启动后端 API

# 方式二：手动启动
cd asr-service && npm run dev  # 端口 3002
cd tts-service && npm run dev  # 端口 3003
cd backend-api && npm run dev  # 端口 3001
```

### 健康检查

```bash
curl http://localhost:3002/health  # ASR 服务
curl http://localhost:3003/health  # TTS 服务
curl http://localhost:3001/api/voice/qwen3-config  # 获取完整配置
```

---

## 客户端集成示例

### Android (Kotlin)

```kotlin
// 1. 获取微服务配置
val configUrl = "$baseUrl/api/voice/qwen3-config"
val config = httpClient.get(configUrl).body<Qwen3Config>()

// 2. 建立 ASR WebSocket 长连接
val asrWs = OkHttpClient().newWebSocket(
    Request.Builder().url(config.asr.wsUrl).build(),
    asrListener
)

// 3. 创建 ASR 会话
asrWs.send("""{"type":"session.create","sessionId":"$sessionId","config":{"language":"zh","sampleRate":16000,"vadMode":"server_vad"}}""")

// 4. 发送音频数据
fun onAudioRecorded(pcmData: ByteArray) {
    val base64 = Base64.encodeToString(pcmData, Base64.NO_WRAP)
    asrWs.send("""{"type":"audio.append","audio":"$base64"}""")
}

// 5. 建立 TTS WebSocket 长连接
val ttsWs = OkHttpClient().newWebSocket(
    Request.Builder().url(config.tts.wsUrl).build(),
    ttsListener
)

// 6. 接收音频数据并播放
ttsListener.onMessage { message ->
    val event = json.parse(message)
    if (event.type == "tts.audio_chunk") {
        val pcm = Base64.decode(event.audio, Base64.DEFAULT)
        audioTrack.write(pcm, 0, pcm.size)  // 实时播放
    }
}
```

---

## 性能指标

| 指标 | 目标值 | 说明 |
|------|-------|------|
| ASR 首字延迟 | < 200ms | 从开始说话到第一个字符出现 |
| TTS 首包延迟 | < 100ms | 从发送文本到第一个音频块 |
| 端到端延迟 | < 300ms | 从用户停止说话到面试官开始回答 |
| 并发会话 | 100+ | 单实例支持的同时面试会话数 |

---

## 与旧架构的对比

| 特性 | 旧架构 | 新架构（Qwen3 微服务） |
|------|--------|----------------------|
| ASR | 客户端阿里云 SDK / 火山引擎 WebSocket | Qwen3-ASR 独立服务 + WebSocket 长连接 |
| TTS | 服务端生成文件 → URL 下载 | 双轨流式：文本输入同时音频输出 |
| 延迟 | 1-3 秒（生成文件+下载） | < 100ms（流式推送） |
| 架构 | 单体（嵌入 backend-api） | 微服务（独立部署、独立扩展） |
| 扩展性 | 受限于 backend-api 进程 | 可水平扩展 ASR/TTS 实例 |
| 容错 | ASR/TTS 故障影响整个后端 | 微服务隔离，互不影响 |
