# 第二题盖掉第一题：快速修复参考

## 一句话总结问题
**Flow-Controller 和 Coordinator 两套系统竞争，导致 emitRoundVoiceResponse 在第一题还未完全播放时就直接合成第二题，而且没有清空 TTS 队列。**

---

## 四个核心问题

### 1️⃣ 【P0 优先】emitRoundVoiceResponse 没有清空 TTS
**文件**: `coordinator.service.ts`
**行号**: `1301-1330`
**问题**: 直接合成新题，没有清空前一题的 TTS 队列

```typescript
// ❌ 现在
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  // 直接开始：
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
}

// ✅ 修复（添加一行）
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  qwen3TTSClient.clearSynthesis(sessionId);  // 【添加这一行】
  // 然后开始：
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
}
```

---

### 2️⃣ 【P1 优先】Flow-Controller 中有孤立的超时定时器
**文件**: `flow-controller.service.ts`
**行号**: `908-912` 和 `1273-1332`
**问题**: `startQuestionTimer` 会自动跳题，与 Coordinator 的时序冲突

```typescript
// ❌ 现在在 startNextRound() 中：
await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
this.startQuestionTimer(sessionId);  // ❌ 这个定时器会导致自动跳题
return nextRound;

// ✅ 修复选项 A（推荐）：完全禁用
// 注释掉这一行：
// this.startQuestionTimer(sessionId);

// ✅ 修复选项 B：添加条件检查
if (!session.isCoordinatorManaged) {  // 只在非 Coordinator 管理时启动
  this.startQuestionTimer(sessionId);
}
```

---

### 3️⃣ 【P2 优先】processUserResponse 返回后缺乏状态同步
**文件**: `coordinator.service.ts`
**行号**: `1179-1182`
**问题**: 立即调用 emitRoundVoiceResponse，没有给第一题足够的时间完成

```typescript
// ❌ 现在
} else if (result.nextRound) {
  const transitionText = isTimeout ? '好的，时间到了，我们继续下一个问题。' : undefined;
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}

// ✅ 修复：添加延迟和状态检查
} else if (result.nextRound) {
  const transitionText = isTimeout ? '好的，时间到了，我们继续下一个问题。' : undefined;
  
  // 【添加】确保第一题的 runtimePhase 已正确转换
  const session = interviewFlowService.getSession(sessionId);
  if (session && session.runtimePhase === 'speaking') {
    await new Promise(resolve => setTimeout(resolve, 500));  // 等待 500ms
  }
  
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}
```

---

### 4️⃣ 【P3 优先】handleClientReady 中 runtimePhase 设置时机不对
**文件**: `coordinator.service.ts`
**行号**: `641` 和 `682`
**问题**: TTS 还在合成时就设置为 'speaking'，导致 ASR 过早关闭

```typescript
// ❌ 现在
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  session.runtimePhase = 'speaking';  // ❌ TTS 还没合成就设置了
  
  this.startSpeakingTimeout(sessionId, welcomeText);
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
}

// ✅ 修复：在 TTS 合成后再设置
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  
  this.startSpeakingTimeout(sessionId, welcomeText);
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  session.runtimePhase = 'speaking';  // ✅ TTS 已合成后再设置
}
```

---

## 修复步骤（从简到难）

### 步骤 1（5 分钟）：紧急修复 P0

在 `coordinator.service.ts` 第 1301 行找到 `emitRoundVoiceResponse` 函数，在函数开头添加：

```typescript
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  const session = interviewFlowService.getSession(sessionId);

  // 【添加这一行】
  qwen3TTSClient.clearSynthesis(sessionId);

  // 题目准备就绪：先向 TTS 通道下发 question_start 控制消息
  const totalRounds = session?.rounds?.length || 5;
  // ... 后续代码保持不变 ...
}
```

**验证**: 测试后观察第二题是否仍然盖掉第一题。

---

### 步骤 2（10 分钟）：紧急修复 P1

在 `flow-controller.service.ts` 第 912 行，注释掉 `startQuestionTimer` 调用：

```typescript
async startNextRound(sessionId: string): Promise<InterviewRound | null> {
  const session = this.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const nextRound = await this.markNextRoundInProgress(session);
  if (!nextRound) {
    this.clearInterviewTimer(sessionId);
    this.clearQuestionTimers(sessionId);
    await this.evaluateAndFinalizeCompletion(session);
    return null;
  }

  await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
  session.runtimePhase = 'listening';

  // 【修复】禁用这一行，理由：Coordinator 已通过 startSilenceDetection 负责超时检测
  // this.startQuestionTimer(sessionId);  // ❌ 注释掉

  return nextRound;
}
```

**验证**: 检查是否仍然有定时器自动跳题。

---

### 步骤 3（5 分钟）：改进 P2

在 `coordinator.service.ts` 第 1179 行，在调用 `emitRoundVoiceResponse` 前添加延迟：

```typescript
} else if (result.nextRound) {
  const transitionText = isTimeout ? '好的，时间到了，我们继续下一个问题。' : undefined;
  
  // 【添加】确保状态同步
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}
```

**验证**: 测试多次，确认第一题和第二题之间间隔足够长。

---

### 步骤 4（10 分钟）：优化 P3

在 `coordinator.service.ts` 第 641 行和 682 行，将 `session.runtimePhase = 'speaking'` 移到 TTS 合成后：

**第一处（约 LINE 638-675）**：
```typescript
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  // session.runtimePhase = 'speaking';  // ❌ 删除这一行

  const welcomeText = firstRound.question;
  console.log(`🎤 [Coordinator] 就绪触发大模型生成的初始欢迎问题: ${sessionId}`);
  this.startSpeakingTimeout(sessionId, welcomeText);

  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // 【添加】在 TTS 合成后再设置
  session.runtimePhase = 'speaking';

  // 后续代码保持不变...
}
```

**第二处（约 LINE 678-707）**：
```typescript
} else {
  // 兜底逻辑
  const jobPosText = ((session as any).jobPosition || '这个职位').trim();
  const welcomeText = `让我陪您一起完成这个面试流程。请简单介绍一下您自己...`;

  console.log(`🎤 [Coordinator] 就绪触发初始欢迎问题 (兜底): ${sessionId}`);
  // session.runtimePhase = 'speaking';  // ❌ 删除这一行
  this.startSpeakingTimeout(sessionId, welcomeText);

  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // 【添加】在 TTS 合成后再设置
  session.runtimePhase = 'speaking';

  // 后续代码保持不变...
}
```

**验证**: 确认 ASR 不会过早关闭。

---

## 完整修复清单

- [ ] **P0**: 在 emitRoundVoiceResponse 开头添加 `qwen3TTSClient.clearSynthesis(sessionId);`
- [ ] **P1**: 在 flow-controller.service.ts:912 注释掉 `this.startQuestionTimer(sessionId);`
- [ ] **P2**: 在 coordinator.service.ts:1179 前添加 `await new Promise(resolve => setTimeout(resolve, 500));`
- [ ] **P3**: 在 coordinator.service.ts 的 641 和 682 行移动 `session.runtimePhase = 'speaking';` 到 TTS 合成后
- [ ] 提交代码并测试
- [ ] 观察日志确认时序正常

---

## 关键日志检查

修复后，运行面试并观察以下日志序列：

```log
✅ [Coordinator] 客户端三通道连接已确认就绪 (client_ready): sessionId=abc123
🎤 [Coordinator] 就绪触发大模型生成的初始欢迎问题: abc123
[Coordinator] Dispatching Qwen3 TTS session=abc123, segments=1, textLen=68
[Coordinator] Published voice_response for session=abc123 (session+broadcast)

# ~3 秒，用户回答...

[Coordinator] ASR 识别完成 (abc123): "我是一个前端工程师..."
[InterviewFlow] Session abc123 is already processing
[Coordinator] Dispatching Qwen3 TTS session=abc123, segments=1, textLen=145
[Coordinator] Published voice_response for session=abc123 (session+broadcast)

✅ 关键：两个 "Published voice_response" 之间间隔 >= 3 秒
```

---

## 文件速查表

| 修复项 | 文件 | 行号 | 改动 |
|--------|------|------|------|
| P0 | coordinator.service.ts | 1301 | 添加 `qwen3TTSClient.clearSynthesis(sessionId);` |
| P1 | flow-controller.service.ts | 912 | 注释 `this.startQuestionTimer(sessionId);` |
| P2 | coordinator.service.ts | 1179 | 添加 `await new Promise(resolve => setTimeout(resolve, 500));` |
| P3 | coordinator.service.ts | 641, 682 | 移动 `session.runtimePhase = 'speaking';` |

---

## 预期效果

### 修复前
```
时刻 0ms：第一题下发给 App
时刻 100ms：用户开始看第一题
时刻 3100ms：用户回答第一题
时刻 3200ms：【BUG】第二题立即下发，覆盖第一题！
          用户字幕跳转，感觉被打断
```

### 修复后
```
时刻 0ms：第一题下发给 App
时刻 100ms：用户开始看第一题
时刻 3100ms：用户回答第一题（完整）
时刻 3600ms：【修复】第二题下发（间隔 >= 500ms）
            用户有充足的时间看完第一题答题时间
```

