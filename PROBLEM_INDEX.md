# 第二题盖掉第一题问题：文档索引

## 问题概述

**症状**: 用户还没回答第一题，第二题就覆盖了第一题

**根本原因**: Flow-Controller 和 Coordinator 两套系统竞争，且 emitRoundVoiceResponse 没有清空 TTS 队列

**严重程度**: P0（立即修复）

---

## 快速导航

### 🎯 我只想快速理解问题
→ 阅读 **QUICK_FIX_REFERENCE.md**（5 分钟）
- 四个核心问题概述
- 修复方案速查表
- 预期修复效果对比

### 📊 我想看完整的时序分析
→ 阅读 **QUESTION_TIMING_SEQUENCE.md**（15 分钟）
- 详细的时序图（ms 级精度）
- 每个关键点的代码位置
- 修复前后对比
- 验证检查清单

### 🔬 我想看深度的诊断报告
→ 阅读 **QUESTION_DOUBLE_TRIGGER_DIAGNOSIS.md**（30 分钟）
- 四个关键问题的深度分析
- 完整的代码路径追踪
- 四阶段修复计划
- 优先级排序和依赖关系

### 📋 我想看调查总结和行动计划
→ 阅读 **INVESTIGATION_SUMMARY.md**（10 分钟）
- 关键发现总结
- 文件改动清单
- 完整的测试计划
- 后续行动建议

### ✅ 我已经了解问题，直接给我修复清单
→ 跳到**修复清单**（下方）

---

## 修复清单（按优先级排序）

### P0 - 立即修复（今天）
**目的**: 消除 TTS 混音问题

**文件**: `coordinator.service.ts`
**行号**: `1301`
**操作**: 添加一行代码

```typescript
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  const session = interviewFlowService.getSession(sessionId);

  // ✅ 【添加这一行】
  qwen3TTSClient.clearSynthesis(sessionId);

  // 后续代码...
}
```

**验证**: 
```bash
grep -n "qwen3TTSClient.clearSynthesis" coordinator.service.ts | grep 1301
```

---

### P1 - 紧急修复（明天）
**目的**: 消除双定时器竞争

**文件**: `flow-controller.service.ts`
**行号**: `912`
**操作**: 注释一行代码

```typescript
async startNextRound(sessionId: string): Promise<InterviewRound | null> {
  // ...
  await this.sendToAvatarAndTTS(sessionId, session.userId, nextRound.question);
  session.runtimePhase = 'listening';

  // ✅ 【注释掉这一行】
  // this.startQuestionTimer(sessionId);

  return nextRound;
}
```

**验证**:
```bash
grep -n "// this.startQuestionTimer" flow-controller.service.ts
```

---

### P2 - 改进修复（3 天内）
**目的**: 给第一题足够的播放和录音时间

**文件**: `coordinator.service.ts`
**行号**: `1179`
**操作**: 添加延迟

```typescript
} else if (result.nextRound) {
  const transitionText = isTimeout ? '好的，时间到了，我们继续下一个问题。' : undefined;
  
  // ✅ 【添加这个延迟】
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await this.emitRoundVoiceResponse(sessionId, result.nextRound, transitionText);
}
```

**验证**:
```bash
grep -B 2 "await this.emitRoundVoiceResponse" coordinator.service.ts | grep "setTimeout"
```

---

### P3 - 优化修复（3 天内）
**目的**: 确保 ASR 不会过早关闭

**文件**: `coordinator.service.ts`
**行号**: `641` 和 `682`
**操作**: 移动 runtimePhase 设置

**第一处** (约 LINE 638-675):
```typescript
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  // ✅ 【删除这一行】
  // session.runtimePhase = 'speaking';

  const welcomeText = firstRound.question;
  console.log(`🎤 [Coordinator] 就绪触发大模型生成的初始欢迎问题: ${sessionId}`);
  this.startSpeakingTimeout(sessionId, welcomeText);

  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // ✅ 【在这里添加】
  session.runtimePhase = 'speaking';

  // ...
}
```

**第二处** (约 LINE 678-707):
```typescript
} else {
  const jobPosText = ((session as any).jobPosition || '这个职位').trim();
  const welcomeText = `让我陪您一起完成这个面试流程...`;

  console.log(`🎤 [Coordinator] 就绪触发初始欢迎问题 (兜底): ${sessionId}`);
  // ✅ 【删除这一行】
  // session.runtimePhase = 'speaking';
  this.startSpeakingTimeout(sessionId, welcomeText);

  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // ✅ 【在这里添加】
  session.runtimePhase = 'speaking';

  // ...
}
```

**验证**:
```bash
grep -n "session.runtimePhase = 'speaking'" coordinator.service.ts
# 应该看到 3-4 行，其中有 2 行在 synthesizeQwen3TtsSegments 之后
```

---

## 文件对照表

| 文档文件 | 内容概述 | 读者类型 | 时间 |
|---------|---------|---------|------|
| QUICK_FIX_REFERENCE.md | 4 个核心问题 + 快速修复 | 决策者、开发者 | 5 min |
| QUESTION_TIMING_SEQUENCE.md | 详细时序图（ms 级） | 开发者、测试者 | 15 min |
| QUESTION_DOUBLE_TRIGGER_DIAGNOSIS.md | 完整诊断和分析 | 架构师、技术总监 | 30 min |
| INVESTIGATION_SUMMARY.md | 调查总结和行动计划 | 项目经理、开发主管 | 10 min |
| PROBLEM_INDEX.md | 这份文件（导航和清单） | 所有人 | 3 min |

---

## 一键检查清单

### 修复前的状态检查
```bash
# ✅ 确认问题存在
grep -n "await this.emitRoundVoiceResponse" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts | grep 1182

# ✅ 确认没有 clearSynthesis 调用
grep -B 5 "private async emitRoundVoiceResponse" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts | grep -c "clearSynthesis"
# 应该输出 0

# ✅ 确认有孤立的 startQuestionTimer
grep -n "this.startQuestionTimer" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/flow-controller.service.ts | grep 912
```

### 修复后的验证检查
```bash
# ✅ 确认 P0 修复已应用
grep -A 3 "private async emitRoundVoiceResponse" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts | grep "qwen3TTSClient.clearSynthesis"

# ✅ 确认 P1 修复已应用
grep "// this.startQuestionTimer" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/flow-controller.service.ts

# ✅ 确认 P2 修复已应用
grep -B 2 "await this.emitRoundVoiceResponse" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts | grep "setTimeout"

# ✅ 确认 P3 修复已应用
grep -n "const ttsMode = await this.synthesizeQwen3TtsSegments" /Users/linxiong/Documents/GitHub/AI-Interview-System/interview-service/src/services/coordinator.service.ts
# 查看之后的几行，应该有 session.runtimePhase = 'speaking'
```

---

## 代码行号快速导航

| 问题 | 文件 | 行号 | 类型 |
|------|------|------|------|
| P0: 缺少 clearSynthesis | coordinator.service.ts | 1301 | 添加 |
| P1: 孤立 startQuestionTimer | flow-controller.service.ts | 912 | 注释 |
| P2: 缺乏状态同步 | coordinator.service.ts | 1179 | 添加 |
| P3: runtimePhase 时序 | coordinator.service.ts | 641, 682 | 移动 |

---

## 修复验证时序图

```
修复前：
X+3200ms  ❌ emitRoundVoiceResponse 立即触发
          ├─ 【缺陷】没有 clearSynthesis
          └─ TTS 队列中同时有第一题和第二题

修复后（4 个修复都应用）：
X+3200ms  ✅ emitRoundVoiceResponse 开始
          ├─ qwen3TTSClient.clearSynthesis()  【P0】
          ├─ await new Promise(...500ms)  【P2】
          └─ synthesizeQwen3TtsSegments()
          
X+3700ms  ✅ 第二题下发
          └─ 第一题已完全播放和录音
```

---

## 常见问题

**Q: 我只有 5 分钟，如何快速理解问题？**
A: 阅读 QUICK_FIX_REFERENCE.md，然后按照修复清单的 P0 操作立即修复。

**Q: 修复后如何验证问题已解决？**
A: 运行面试，观察日志中两个 "Published voice_response" 的时间间隔是否 >= 3 秒。

**Q: 为什么要修复 4 个地方？可以只修复 P0 吗？**
A: P0 是必须的（消除 TTS 混音）。P1 推荐修复（消除双定时器竞争）。P2 和 P3 是改进（提高时序可靠性）。

**Q: 修复会不会影响其他功能？**
A: 不会。这些修复只改变时序，不改变业务逻辑。需要全面回归测试。

---

## 技术支持

如有疑问，请参考对应的详细文档：

1. **理解问题** → QUICK_FIX_REFERENCE.md
2. **看时序细节** → QUESTION_TIMING_SEQUENCE.md
3. **深度技术分析** → QUESTION_DOUBLE_TRIGGER_DIAGNOSIS.md
4. **项目管理** → INVESTIGATION_SUMMARY.md

