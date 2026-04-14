# 统一数字人接口 - 三端共享规范

版本: 1.0.0  
更新: 2026-04-14  
状态: 🟡 进行中

---

## 设计原则

1. **跨平台一致**: 三端（Android/iOS/HarmonyOS）使用相同接口定义
2. **简单易用**: 核心接口保持简洁，降低集成难度
3. **可扩展**: 通过 Listener 模式支持事件回调
4. **性能优先**: 接口设计考虑低延迟要求（< 300ms）

---

## 核心接口

### DigitalHuman

数字人控制主接口。

```typescript
interface DigitalHuman {
  // 生命周期
  start(): Promise<void>;        // 启动数字人
  stop(): Promise<void>;         // 停止数字人
  isReady(): boolean;            // 是否就绪
  
  // 音频驱动（唇形同步）
  sendAudio(audioData: ArrayBuffer): void;  // 发送音频数据驱动口型
  sendText(text: string): void;              // 发送文字（备用）
  
  // 语音交互
  speak(text: string): Promise<void>;  // 数字人说话
  stopSpeaking(): void;                 // 停止说话
  
  // 配置
  setStyle(style: 'cartoon' | 'realistic' | '2d'): void;
  setEmotion(emotion: 'neutral' | 'happy' | 'serious' | 'thinking'): void;
}
```

### DigitalHumanListener

事件回调接口。

```typescript
interface DigitalHumanListener {
  onReady(): void;                          // 数字人准备就绪
  onError(error: Error): void;              // 发生错误
  onSpeakingStarted(): void;                // 开始说话
  onSpeakingFinished(): void;               // 说话结束
  onAudioLevel(level: number): void;        // 音频级别（用于UI可视化）
  onEmotionChanged(emotion: string): void;  // 情绪变化
}
```

### AudioPipeline

音频管道接口（ASR → LLM → TTS）。

```typescript
interface AudioPipeline {
  start(): Promise<void>;
  stop(): void;
  
  // 音频输入
  sendAudioInput(audioData: ArrayBuffer): void;
  
  // 配置
  setASRProvider(provider: 'volcengine' | 'other'): void;
  setTTSProvider(provider: 'volcengine' | 'other'): void;
  setLLMProvider(provider: 'deepseek' | 'other'): void;
  
  // 回调
  setListener(listener: AudioPipelineListener): void;
}

interface AudioPipelineListener {
  onAudioInputRecognized(text: string): void;      // ASR 识别结果
  onLLMResponse(text: string): void;              // LLM 回复
  onTTSGenerated(audioData: ArrayBuffer): void;   // TTS 音频
  onError(error: Error): void;
}
```

---

## 平台实现

| 平台 | 实现文件 | 状态 |
|------|----------|------|
| Android | `interfaces/digital_human_android.kt` | 待实现 |
| iOS | `interfaces/digital_human_ios.swift` | 待实现 |
| HarmonyOS | `interfaces/digital_human_arkts.ets` | 待实现 |

---

## 使用流程

```
1. 初始化
   └── digitalHuman = createDigitalHuman()
   └── digitalHuman.setListener(listener)
   └── await digitalHuman.start()

2. 开始面试
   └── audioPipeline.start()
   └── audioPipeline.setListener(pipelineListener)

3. 音频循环
   └── 用户说话 → audioPipeline.sendAudioInput()
   └── pipeline.onAudioInputRecognized() → 传给 LLM
   └── pipeline.onLLMResponse() → digitalHuman.speak()
   └── pipeline.onTTSGenerated() → digitalHuman.sendAudio()

4. 结束面试
   └── audioPipeline.stop()
   └── digitalHuman.stop()
```

---

## 延迟预算（端到端 < 300ms）

| 阶段 | 预算 | 说明 |
|------|------|------|
| ASR 识别 | ~100ms | 火山引擎实时 ASR |
| LLM 响应 | ~100ms | DeepSeek API |
| TTS 生成 | ~50ms | 火山引擎 TTS |
| 渲染播放 | ~50ms | Live2D 渲染 |
| **总计** | **~300ms** | 临界状态，需优化 |

---

最后更新: 2026-04-14