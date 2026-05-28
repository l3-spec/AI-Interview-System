# 第二题盖掉第一题问题：调查完整总结

## 调查概览

**问题描述**: 用户报告第二个语音/问题盖掉了第一个，还没来得及回答第一题。

**调查周期**: 全面代码分析，追踪两套独立系统的时序冲突

**根本原因**: 两套协调系统（Flow-Controller + Coordinator）的竞争，导致出题时序混乱

**严重程度**: 高（影响用户体验，需立即修复）

---

## 关键发现

### 发现1：两套独立的出题系统并行运行

系统中存在两个不同的、未完全协同的题目推进机制：

1. **Flow-Controller** (`flow-controller.service.ts`)
   - 内部状态机管理题目进度
   - 启动单题超时定时器（`startQuestionTimer`）
   - 自动处理超时跳题（`autoSkipToNextRound`）

2. **Coordinator** (`coordinator.service.ts`)
   - 中央协调器，基于 Redis Stream 和事件
   - 通过 `emitRoundVoiceResponse` 推进下一题
   - 通过 `startSilenceDetection` 检测静音超时

**问题**: 这两套系统在以下操作处产生竞争：
- 第一题下发
- 单题超时后的跳题
- 用户响应后的下一题推进

---

### 发现2：emitRoundVoiceResponse 没有清空 TTS 队列

**代码位置**: `coordinator.service.ts:1301-1350`

**问题**:
```typescript
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  // ❌ 直接开始合成，没有清空前一题
  const speakText = transitionText ? `${transitionText} ${round.question}` : round.question;
  ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
}
```

**影响**: TTS 队列中同时存在第一题和第二题的合成请求，可能导致混音或顺序错乱。

**修复**: 添加 `qwen3TTSClient.clearSynthesis(sessionId);`

---

### 发现3：processUserResponse 执行过快，导致第二题过早下发

**代码位置**: `coordinator.service.ts:1113-1182`

**时序问题**:
1. 用户回答到达 (X+3000ms)
2. `processUserResponse` 执行，包括大模型分析 (~2000ms)
3. 返回 `nextRound` 对象
4. **立即调用** `emitRoundVoiceResponse` (X+3200ms)
5. 第二题已下发，覆盖第一题界面

**影响**: 用户被迫看到第二题，感觉被打断，无法充分理解第一题的回答时间。

**修复**: 在调用 `emitRoundVoiceResponse` 前添加至少 500ms 延迟

---

### 发现4：handleClientReady 中 runtimePhase 设置时机不对

**代码位置**: `coordinator.service.ts:641` 和 `682`

**问题**:
```typescript
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  session.runtimePhase = 'speaking';  // ❌ 此时 TTS 还在合成中
  
  this.startSpeakingTimeout(sessionId, welcomeText);
  const ttsMode = await this.synthesizeQwen3TtsSegments(...);  // TTS 合成
}
```

**影响**: 
- `runtimePhase = 'speaking'` 会导致 ASR 被关闭
- 但此时 TTS 还未完成，第一题音频还未生成
- 如果 TTS 合成失败，用户根本无法听到第一题

**修复**: 将 `session.runtimePhase = 'speaking'` 移到 TTS 合成后

---

### 发现5：Flow-Controller 的 startQuestionTimer 形成"双定时器"

**代码位置**: `flow-controller.service.ts:908-912` 和 `1273-1332`

**问题**:
```typescript
async startNextRound(sessionId: string): Promise<InterviewRound | null> {
  await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
  this.startQuestionTimer(sessionId);  // ❌ 启动独立的定时器
  return nextRound;
}
```

此定时器会：
1. 30 秒后触发提醒
2. 再加 30 秒后自动跳题（`autoSkipToNextRound`）
3. 调用 `startNextRound` 推进下一题

**竞争**: 
- Coordinator 也通过 `startSilenceDetection` 在做超时检测
- 两套定时器可能同时触发，导致双重跳题

**修复**: 禁用 `startQuestionTimer`（Coordinator 已负责超时检测）

---

## 代码缺陷汇总表

| # | 缺陷 | 文件 | 行号 | 严重度 | 修复难度 |
|----|------|------|------|--------|---------|
| 1 | emitRoundVoiceResponse 没有清空 TTS | coordinator.service.ts | 1301 | P0 | 低 |
| 2 | startQuestionTimer 形成双定时器竞争 | flow-controller.service.ts | 912 | P1 | 中 |
| 3 | processUserResponse 后缺乏状态同步 | coordinator.service.ts | 1179 | P2 | 低 |
| 4 | handleClientReady 中 runtimePhase 时序不对 | coordinator.service.ts | 641, 682 | P3 | 低 |

---

## 精确的问题复现时序

```
时刻    事件                                   责任方
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0ms     JOIN_SESSION
1ms     startInterviewPhase(autoStart=false)  Flow-Controller
5ms     就绪保护定时器启动                    Coordinator
Xms     CLIENT_READY 到达
X+1ms   handleClientReady() 开始              Coordinator
X+5ms   ✅ firstRound.status = 'in_progress'  Coordinator
X+6ms   ❌ session.runtimePhase = 'speaking'  Coordinator（时机不对）
X+10ms  synthesizeQwen3TtsSegments (第一题)   Coordinator
X+50ms  emitToGateway('voice_response')       Coordinator
        【第一题已下发给 App】
        
X+100ms TTS 开始合成第一题音频...              DashScope TTS
X+3000ms 🎤 用户回答第一题
X+3100ms processUserResponse() 开始           Coordinator
        ├─ deepseekService.analyzeResponse() ~2000ms
        ├─ markNextRoundInProgress()
        └─ return {nextRound}
        
X+3200ms ❌ emitRoundVoiceResponse() 开始      Coordinator
        ├─ 【缺陷】没有清空 TTS
        ├─ synthesizeQwen3TtsSegments (第二题)
        ├─ emitToGateway('voice_response')
        └─ 【第二题已下发给 App，覆盖第一题】
        
X+3300ms App 显示第二题                       App 前端
        【症状出现】用户被迫看到第二题

X+4000ms ⏰ Flow-Controller 的 reminderTimer 可能触发
        （理由：若用户在第一题停顿，定时器会自动跳题）
```

---

## 修复方案概览

### 方案1（推荐）：四阶段渐进式修复

**第1阶段（P0，立即）**：清空 TTS 队列
- 在 `emitRoundVoiceResponse` 开头添加 `qwen3TTSClient.clearSynthesis(sessionId);`
- 预期效果：消除 TTS 混音问题

**第2阶段（P1，紧急）**：禁用双定时器
- 在 `startNextRound` 中注释掉 `this.startQuestionTimer(sessionId);`
- 理由：Coordinator 已通过 `startSilenceDetection` 负责超时检测
- 预期效果：消除自动跳题与 Coordinator 的竞争

**第3阶段（P2，改进）**：添加状态同步延迟
- 在 `emitRoundVoiceResponse` 前添加 `await new Promise(resolve => setTimeout(resolve, 500));`
- 预期效果：给第一题足够的播放和录音时间

**第4阶段（P3，优化）**：修正 runtimePhase 设置时机
- 在 `handleClientReady` 中将 `session.runtimePhase = 'speaking'` 移到 TTS 合成后
- 预期效果：确保 ASR 不会过早关闭

---

### 方案2（激进）：完全统一到 Coordinator

**思路**: 禁用 Flow-Controller 中的所有独立定时器和事件推进，完全由 Coordinator 主控

**涉及**:
- 禁用 `startQuestionTimer`
- 禁用 `autoSkipToNextRound`
- 禁用 `handleQuestionTimeout`

**优势**: 完全消除双系统竞争

**风险**: Flow-Controller 的修改较大，需要充分测试

---

## 文件改动清单

### 需要修改的文件

1. **coordinator.service.ts**
   - LINE 1301：在 `emitRoundVoiceResponse` 开头添加 `qwen3TTSClient.clearSynthesis(sessionId);`
   - LINE 1179：添加 `await new Promise(resolve => setTimeout(resolve, 500));`
   - LINE 641, 682：移动 `session.runtimePhase = 'speaking';` 到 TTS 合成后

2. **flow-controller.service.ts**
   - LINE 912：注释 `this.startQuestionTimer(sessionId);`

---

## 测试计划

### 测试1：验证第二题不覆盖第一题

**步骤**:
1. 启动面试系统
2. 客户端加入并发送 `CLIENT_READY`
3. 观察第一题是否完整下发
4. 用户回答第一题
5. 确认第二题在至少 500ms 后下发

**验证**:
```bash
grep "Published voice_response" interview.log | head -10
# 应该看到两行，间隔 >= 3000ms
```

### 测试2：验证 TTS 清空

**步骤**:
1. 启用 TTS 日志
2. 追踪 `synthesizeQwen3TtsSegments` 的调用
3. 确认 `qwen3TTSClient.clearSynthesis` 被调用

**验证**:
```bash
grep "clearSynthesis\|synthesizeQwen3TtsSegments" coordinator.service.ts
```

### 测试3：验证单题超时

**步骤**:
1. 开始第一题
2. 停顿超过 30 秒（QUESTION_REMINDER_TIMEOUT_MS）
3. 观察是否收到提醒提示
4. 再停顿 30 秒
5. 观察是否自动跳到第二题（或者由 Coordinator 处理）

**预期**:
- 提醒消息应该由 Coordinator 下发
- 不应该有来自 Flow-Controller 的独立跳题

---

## 预期修复效果

### 修复前

```
用户体验：
  1. 第一题下发
  2. 用户开始思考
  3. 用户开始回答（比如说了 5 秒）
  4. 【问题】突然切到第二题！
  5. 用户被迫看新题目，感觉被打断
```

### 修复后

```
用户体验：
  1. 第一题下发
  2. 用户开始思考
  3. 用户完整回答（比如说了 10 秒）
  4. App 确认收到回答
  5. 系统处理回答（包括大模型分析）
  6. 【修复后】第二题在合适的时机下发
  7. 用户有充足时间看到倒计时或回答时间提示
```

---

## 参考资源

### 相关代码文件

- `/Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts`
- `/Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/flow-controller.service.ts`
- `/Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/qwen3-tts-service-client.ts`（TTS 客户端）

### 调查产出文件

- `QUESTION_DOUBLE_TRIGGER_DIAGNOSIS.md` - 详细诊断报告
- `QUESTION_TIMING_SEQUENCE.md` - 完整时序图分析
- `QUICK_FIX_REFERENCE.md` - 快速修复参考卡

---

## 后续行动

1. **立即执行**（今日）：应用 P0 修复（清空 TTS）并测试
2. **紧急执行**（明日）：应用 P1 修复（禁用双定时器）并测试
3. **验证执行**（3 天内）：应用 P2 和 P3 修复，全面回归测试
4. **监控**（持续）：添加日志告警，监控出题时序

---

## 联系方式

如有问题或需要进一步的技术讨论，请参考调查产出的三份文档：
1. 完整诊断报告（QUESTION_DOUBLE_TRIGGER_DIAGNOSIS.md）
2. 时序图分析（QUESTION_TIMING_SEQUENCE.md）
3. 快速修复参考（QUICK_FIX_REFERENCE.md）

