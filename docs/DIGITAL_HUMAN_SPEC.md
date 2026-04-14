# 数字人集成规范 - 三端统一标准

## 核心要求

### 性能指标（三端必须统一）

| 指标 | 要求 | 测量方法 |
|------|------|----------|
| 端到端延迟 | < 300ms | 语音输入 → 数字人响应 |
| 首帧渲染 | < 500ms | 数字人启动时间 |
| 帧率 | ≥ 30 FPS | 数字人动画流畅度 |
| 内存占用 | < 100MB | 数字人模块单独计算 |

### 风格选择
- 卡通：适合年轻用户群体
- 真人：适合正式面试场景
- 2D：性能和包体积最优

**禁止**：卡顿、死板、明显的合成感

---

## 技术方案

### Android（已实现）
- SDK: DUIX SDK
- 渲染: Live2D + GLSurfaceView
- 语音: 火山引擎 ASR + VAD

### iOS（待实现）
- 方案待定，需要与 Android 对齐
- 推荐优先考虑 WebRTC 方案

### HarmonyOS（待实现）
- 方案待定，需要与 Android 对齐
- 使用 ArkTS 调用原生能力

---

## 统一接口

### 数字人控制接口

```typescript
interface DigitalHuman {
  // 启动数字人
  start(): Promise<void>;
  
  // 停止数字人
  stop(): Promise<void>;
  
  // 发送语音数据（驱动口型）
  sendAudio(audioData: ArrayBuffer): void;
  
  // 接收文字并驱动数字人说话
  speak(text: string): Promise<void>;
  
  // 设置数字人样式
  setStyle(style: 'cartoon' | 'realistic' | '2d'): void;
}
```

### 事件回调

```typescript
interface DigitalHumanListener {
  onReady(): void;
  onError(error: Error): void;
  onSpeakingFinished(): void;
  onAnimationFrame(frame: AnimationFrame): void;
}
```

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

最后更新: 2026-04-14