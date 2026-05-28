# 第二题盖掉第一题问题：完整诊断报告

## 问题描述
用户报告：第二个语音/问题盖掉了第一个，还没来得及回答第一题。这是出题时序问题。

## 根本原因分析

### 问题所在：两套出题系统并行导致时序冲突

系统中存在**两套独立但未完全协同的出题流程**：

1. **Flow-Controller** (`flow-controller.service.ts`)：老式的内部状态机 + 单题超时定时器
2. **Coordinator** (`coordinator.service.ts`)：新式的中央协调器，负责编排所有事件

这两套系统在下列关键操作处发生冲突：
- 第一题下发时
- 单题超时跳转时
- 用户响应后推进下一题时

---

## 精确的代码路径追踪

### 时序1：首题通过 CLIENT_READY 被下发两遍

**文件**: `coordinator.service.ts`

**路径A（LINE 550-708）**：
```
handleClientReady(sessionId, gatewayId)
  ├─ (LINE 637-647) firstRound = session.rounds[0]
  │   └─ firstRound.status = 'in_progress'
  ├─ (LINE 650) startSpeakingTimeout(sessionId, welcomeText)
  ├─ (LINE 653) ttsMode = synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening')
  │   └─ 【TTS 第一次合成】qwen3TTSClient.synthesize() 被调用
  ├─ (LINE 656) emitControlToTTS(sessionId, 'question_start', ...)
  └─ (LINE 663-673) emitToGateway(sessionId, 'voice_response', ...)
      └─ 【第一题下发给 App】
```

**潜在问题**：`session.runtimePhase` 被设置为 `'speaking'`（LINE 641）
- 此时首题音频还在生成中，可能未完全播放
- 但系统已标记为"正在说话"状态

---

### 时序2：用户响应后的第二题下发（双重触发）

**文件**: `coordinator.service.ts` + `flow-controller.service.ts`

**流程**：
```
processUserResponse(sessionId, text, { speakNextRound: false })
  ├─ (LINE 973) 用户响应被记录
  ├─ (LINE 1021) nextRound = await markNextRoundInProgress(session)
  │   └─ Flow-Controller 返回下一题
  │
  └─ (LINE 1179-1182) 【Coordinator 主控】
      └─ if (result.nextRound)
          ├─ transitionText = '好的，时间到了，我们继续下一个问题。'
          ├─ (LINE 1182) await emitRoundVoiceResponse(sessionId, result.nextRound, transitionText)
          │   ├─ (LINE 1307-1312) emitControlToTTS(sessionId, 'question_start', ...)
          │   ├─ (LINE 1323-1326) synthesizeQwen3TtsSegments(sessionId, speakText, scene)
          │   │   └─ 【TTS 第二次合成】qwen3TTSClient.synthesize()
          │   ├─ (LINE 1332-1343) emitToGateway(sessionId, 'voice_response', ...)
          │   │   └─ 【第二题下发给 App，这会立即覆盖第一题的状态】
          │   └─ (LINE 1346) session.runtimePhase = 'speaking'
          └─ 【结束】
```

**关键问题**：用户的第一题答案刚开始被 ASR 识别时，processUserResponse 的执行速度可能非常快（< 1 秒），导致：
1. 第一题答案还没完全录入
2. 第二题已经开始合成
3. 第二题的 voice_response 立即覆盖了第一题的界面/字幕

---

### 时序3：孤立的超时跳题定时器（残留逻辑）

**文件**: `flow-controller.service.ts`

**问题代码**（LINE 908-912）：
```typescript
async startNextRound(sessionId: string): Promise<InterviewRound | null> {
  const nextRound = await this.markNextRoundInProgress(session);
  
  // ... 第一题音频下发给 TTS ...
  await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
  
  // ⚠️ 【问题】这里启动了单题超时定时器
  this.startQuestionTimer(sessionId);  // LINE 912
  
  return nextRound;
}
```

**超时定时器逻辑**（LINE 1273-1332）：
```typescript
private startQuestionTimer(sessionId: string): void {
  const reminderTimer = setTimeout(() => {
    // LINE 1276-1281：提醒阶段（比如 30 秒）
    this.handleQuestionTimeout(sessionId, 'reminder');
  }, this.QUESTION_REMINDER_TIMEOUT_MS);  // 可能是 30000ms
  
  // 然后在提醒后设置 skipTimer
  // LINE 1320-1324：跳题阶段（再加 30 秒？）
  const skipTimer = setTimeout(() => {
    this.handleQuestionTimeout(sessionId, 'skip');  // 自动跳题
  }, this.QUESTION_SKIP_TIMEOUT_MS);
}
```

**问题**：若这个定时器在 Flow-Controller 中仍然存活，它可能在不受 Coordinator 控制的情况下，自动触发第二题：
```typescript
private async autoSkipToNextRound(sessionId: string): Promise<void> {
  // LINE 1337-1367
  // 将第一题标记为 'skipped'
  currentRound.status = 'skipped';
  
  // ⚠️ 【问题】自动推进到下一题（不经过 Coordinator 的控制流）
  await this.startNextRound(sessionId);  // LINE 1363
  // 这又会触发一次 sendToAvatarAndTTS，第二题被合成
}
```

---

## 问题综合分析

### 症状与根本原因的对应关系

| 症状 | 根本原因 | 代码位置 |
|------|--------|--------|
| 用户还没回答第一题就出现第二题 | Coordinator 的 emitRoundVoiceResponse 执行过快，processUserResponse 返回 nextRound 后立即合成 | coordinator.service.ts:1182 |
| 第一题和第二题的音频混在一起 | TTS 合成队列中没有进行明确的清空操作 | 两处 synthesizeQwen3TtsSegments 调用之间 |
| 有时候出现意外的"过渡语"被播放 | 当过渡语与下一题组合时，可能过早触发 | coordinator.service.ts:1325 |
| 超时时第二题提前出现 | Flow-Controller 的孤立定时器（startQuestionTimer）可能触发 autoSkipToNextRound | flow-controller.service.ts:912, 1363 |

---

## 四个关键问题

### 问题1：CLIENT_READY 处理后立即进入 'speaking' 状态

**代码**（coordinator.service.ts:641）：
```typescript
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  session.runtimePhase = 'speaking';  // ⚠️ 问题：过早进入 speaking
  
  // ...
  
  await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  // TTS 还在合成中，但状态已经是 speaking
}
```

**影响**：此时 ASR 可能被关闭，如果 TTS 合成失败或很慢，第一题根本无法记录用户的回答。

---

### 问题2：processUserResponse 返回 nextRound 后，Coordinator 未做充分的"状态清理"就直接触发第二题

**代码**（coordinator.service.ts:1179-1182）：
```typescript
} else if (result.nextRound) {
  // ⚠️ 问题：直接调用 emitRoundVoiceResponse，没有检查：
  // 1. 第一题的 TTS 是否已完全播放
  // 2. 第一题的 runtimePhase 是否已从 'speaking' 切到 'listening'
  // 3. 是否需要清空 TTS 队列中的残留数据
  
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}
```

---

### 问题3：emitRoundVoiceResponse 中没有进行 TTS 清空

**代码**（coordinator.service.ts:1301-1330）：
```typescript
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  // ⚠️ 问题：没有调用 qwen3TTSClient.clearSynthesis(sessionId)
  // 直接开始新题的合成
  
  if (!round.audioUrl) {
    const speakText = transitionText ? `${transitionText} ${round.question}` : round.question;
    ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
    // TTS 队列中可能还有第一题的数据
  }
}
```

---

### 问题4：Flow-Controller 中的 startQuestionTimer 仍在后台独立运行

**代码**（flow-controller.service.ts:912）：
```typescript
async startNextRound(sessionId: string): Promise<InterviewRound | null> {
  // ...
  await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
  
  // ⚠️ 问题：这个定时器与 Coordinator 的 startSilenceDetection 形成了"双定时器"竞争
  this.startQuestionTimer(sessionId);  // 启动 reminderTimer + skipTimer
  
  return nextRound;
}
```

**影响**：如果用户在第一题上停顿过久，Flow-Controller 的 skipTimer 可能自动触发 autoSkipToNextRound，而 Coordinator 还在等待用户继续说话。

---

## 修复建议

### 修复1：确保 emitRoundVoiceResponse 前清空 TTS

**文件**: `coordinator.service.ts:1301`

```typescript
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  const session = interviewFlowService.getSession(sessionId);
  
  // ✅ 修复：先清空前一题的 TTS 队列
  qwen3TTSClient.clearSynthesis(sessionId);
  
  // 然后进行后续操作...
  await this.emitControlToTTS(sessionId, 'question_start', { ... });
  
  // ...
}
```

### 修复2：在 processUserResponse 返回 nextRound 前，确保第一题的 runtimePhase 已正确过渡

**文件**: `flow-controller.service.ts:1021` 或 `coordinator.service.ts:1179`

```typescript
if (result.nextRound) {
  // ✅ 修复：检查和确认第一题的播放状态
  const session = interviewFlowService.getSession(sessionId);
  
  // 可选：检查 ASR 是否已完全处理
  if (session && session.runtimePhase === 'speaking') {
    // 等待 TTS 播放完成的信号，或至少等待 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}
```

### 修复3：禁用或同步 Flow-Controller 中的单题超时定时器

**方案A（推荐）**：完全禁用 Flow-Controller 中的 startQuestionTimer
```typescript
// flow-controller.service.ts:912
// 注释掉或删除：
// this.startQuestionTimer(sessionId);

// 理由：Coordinator 已经通过 startSilenceDetection 在 coordinator.service.ts:55 中负责超时检测
```

**方案B**：如果保留，确保两套定时器不会同时运行
```typescript
// 在 Coordinator 中记录：此 session 已由 Coordinator 管理
session.isCoordinatorManaged = true;

// 在 Flow-Controller 中：
if (session.isCoordinatorManaged) {
  // 不启动 startQuestionTimer
} else {
  this.startQuestionTimer(sessionId);
}
```

### 修复4：改进 handleClientReady 中的状态转换

**文件**: `coordinator.service.ts:641`

```typescript
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  
  // ✅ 修复：不要立即设置为 'speaking'，而是在 TTS 合成完成后再设置
  // session.runtimePhase = 'speaking';  // ❌ 删除这一行
  
  const welcomeText = firstRound.question;
  console.log(`🎤 [Coordinator] 就绪触发大模型生成的初始欢迎问题: ${sessionId}`);
  
  // 先启动 TTS
  this.startSpeakingTimeout(sessionId, welcomeText);
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // ✅ 修复：在这里设置 'speaking'（在 TTS 请求后、voice_response 发出前）
  session.runtimePhase = 'speaking';
  
  // ... 继续下发 question_start 和 voice_response ...
}
```

---

## 优先级排序

| 优先级 | 修复项 | 影响范围 | 实现难度 |
|--------|-------|---------|---------|
| **P0** | 修复1：emitRoundVoiceResponse 前清空 TTS | 直接解决"第二题盖掉第一题" | 低 |
| **P1** | 修复3A：禁用 Flow-Controller 中的 startQuestionTimer | 消除双定时器竞争 | 中 |
| **P2** | 修复2：processUserResponse 返回后的状态同步 | 改进时序可靠性 | 中 |
| **P3** | 修复4：改进 handleClientReady 状态转换 | 改进首题处理的鲁棒性 | 低 |

---

## 测试方案

### 测试1：验证第二题不会盖掉第一题

```bash
1. 启动面试系统
2. 客户端加入面试并上报 CLIENT_READY
3. 观察第一题是否完整下发
4. 用户回答第一题（或者 5 秒内提交空答案）
5. 确认第二题在至少 1 秒延迟后才下发
6. 检查日志中是否有 "emitRoundVoiceResponse" 且时间差 >= 500ms
```

### 测试2：验证 TTS 队列清空

```bash
1. 启用 TTS 日志
2. 观察 "qwen3TTSClient.clearSynthesis" 是否在 emitRoundVoiceResponse 前被调用
3. 确认 TTS 服务不会播放混杂的文本
```

### 测试3：验证定时器只有一套

```bash
1. 在 startQuestionTimer（flow-controller）和 startSilenceDetection（coordinator）设置断点
2. 单步追踪单题处理过程
3. 确认只有一个定时器在运行，或确认两个定时器不会同时触发跳题逻辑
```

---

## 参考代码行号速查表

| 功能 | 文件 | 行号 | 说明 |
|------|------|------|------|
| 首题下发 | coordinator.service.ts | 550-708 | handleClientReady |
| TTS 合成第二题 | coordinator.service.ts | 1182 | emitRoundVoiceResponse 调用处 |
| 返回 nextRound | flow-controller.service.ts | 1021 | processUserResponse 中 |
| 孤立定时器启动 | flow-controller.service.ts | 912 | startQuestionTimer 调用处 |
| 自动跳题 | flow-controller.service.ts | 1363 | autoSkipToNextRound 中 startNextRound 调用 |

