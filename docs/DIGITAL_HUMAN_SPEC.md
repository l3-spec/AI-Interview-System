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
| 传输 | WebRTC | 待优化 |

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