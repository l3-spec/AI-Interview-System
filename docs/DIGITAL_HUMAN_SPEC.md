# 数字人集成规范 - 三端统一标准

## ✅ 已批准方案

**方案 D**: WebRTC + 火山引擎 ASR/TTS + Live2D 渲染

技术架构：
```
麦克风 → 火山引擎 ASR → DeepSeek → 火山引擎 TTS → Live2D 渲染
```

---

## 核心要求

### 性能指标（三端必须统一）

| 指标 | 要求 | 测量方法 |
|------|------|----------|
| 端到端延迟 | < 300ms | 语音输入 → 数字人响应 |
| 首帧渲染 | < 500ms | 数字人启动时间 |
| 帧率 | ≥ 30 FPS | 数字人动画流畅度 |
| 内存占用 | < 100MB | 数字人模块单独计算 |

### 渲染方案
- **统一渲染**: Live2D Cubism SDK
- **平台支持**: Unity 版本支持 Android/iOS/HarmonyOS
- **风格**: 卡通为主，可扩展真人/2D

**禁止**: 卡顿、死板、明显的合成感

---

## 技术实现

### 统一接口

```typescript
interface DigitalHuman {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendAudio(audioData: ArrayBuffer): void;
  speak(text: string): Promise<void>;
  setStyle(style: 'cartoon' | 'realistic' | '2d'): void;
}

interface DigitalHumanListener {
  onReady(): void;
  onError(error: Error): void;
  onSpeakingFinished(): void;
  onAnimationFrame(frame: AnimationFrame): void;
}
```

### 技术栈

| 组件 | 技术 | 状态 |
|------|------|------|
| ASR | 火山引擎 ASR | 已集成（Android） |
| TTS | 火山引擎 TTS | 已集成（Android） |
| 对话 | DeepSeek | 已集成（后端） |
| 渲染 | Live2D Cubism SDK | 已集成（Android） |
| 传输 | WebRTC/WebSocket | 待优化 |

---

## App端实时语音与交互规范 (新)

为了配合后端的极速流式响应，客户端（Android/iOS/HarmonyOS）在实现实时语音交互时，必须遵循以下状态机与音频采集规范：

### 1. 状态机生命周期
App UI 应根据后端 `voice_response` 和 `session_joined` 下发的 `state` 字段进行流转：
- **`Preparing / Loading` (转圈)**: 
  - 触发时机：调用 `join_session` 后。
  - 表现：数字人未开口，界面显示加载状态。此时后端正在准备首个问题或加载断点续面上下文。
- **`Playing` (数字人说话)**:
  - 触发时机：收到 `state: 'playing'` 或收到 TTS 音频流首包。
  - 表现：关闭 Loading UI，数字人开始进行口型同步播报。此阶段禁止本地 ASR 上报（避免自己听到自己的声音导致回音或死循环），或通过软件 AEC 消除自身播报音。
- **`Listening` (等待用户回答)**:
  - 触发时机：TTS 音频流播报完毕。
  - 表现：UI 显示波形或录音态提示，麦克风真正开始将音频 PCM 发送给 `asr-service`。

### 2. 拾音降噪与 VAD 要求
“只拾取当事人语音输入”是保障 AI 回答质量的关键，客户端必须在本地进行音频预处理：
- **降噪 (AEC/ANS)**:
  - 必须开启**声学回声消除 (AEC)**：防止扬声器播报的声音被麦克风录入。
  - 必须开启**自动噪声抑制 (ANS)**：滤除键盘敲击、空调风噪等环境音。
  - *建议*：可以直接使用 WebRTC 原生的 `AECM` 模块，或 Agora/TRTC 提供的本地音频前处理 SDK。
- **静音检测 (VAD)**:
  - 客户端不应持续向服务端盲发空音频。
  - 本地应开启 VAD（Voice Activity Detection），当用户未说话（静音时间 > 500ms）时，**停止向 WebSocket 发送 `audio.append` 包**，并在重新检测到人声时再发送。这极大降低了服务端并发压力和网络带宽。

---

## 集成检查清单

每个平台在 PR 中必须确认：

- [ ] 冷启动时间 < 2秒
- [ ] 数字人响应延迟 < 300ms
- [ ] 帧率 ≥ 30 FPS
- [ ] 内存占用 < 100MB
- [ ] 语音与口型同步误差 < 50ms
- [ ] 无明显卡顿/死板现象

---

最后更新: 2026-04-14 (方案 D 已批准)