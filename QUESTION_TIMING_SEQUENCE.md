# 第二题盖掉第一题：完整时序图分析

## 问题发生的精确时序

```
时刻      事件                          状态                  代码行号
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0ms       👤 Client JOIN_SESSION
          [coordinator:480]
          ├─ handleJoinSession() 开始
          ├─ interviewFlowService.initializeSession()
          └─ startInterviewPhase(autoStart=false) 【关键：不自动开始】
             
5ms       ⏰ 就绪保护定时器启动
          [coordinator:543-546]
          └─ 5 秒后若无 CLIENT_READY，强制触发 handleClientReady

X ms      👤 Client CLIENT_READY
          [coordinator:396-401]
          └─ runInQueue → handleClientReady()

X+1ms     ✅ handleClientReady 开始执行
          [coordinator:550-708]
          
          ├─ 【第1题初始化】
          │  ├─ firstRound = session.rounds[0]
          │  ├─ firstRound.status = 'in_progress'  [LINE 639]
          │  └─ session.currentRound = 1            [LINE 640]
          │
          ├─ 【ERROR】状态过早设置
          │  └─ session.runtimePhase = 'speaking'   [LINE 641] ⚠️ 过早！
          │
          ├─ 【TTS 第一次合成】
          │  ├─ this.startSpeakingTimeout(...)     [LINE 650]
          │  ├─ ttsMode = synthesizeQwen3TtsSegments() [LINE 653]
          │  │   └─ qwen3TTSClient.synthesize(sessionId, welcomeText, true)
          │  │       └─ TTS 后台异步合成，返回立即返回 ✓
          │  │
          │  └─ 【此时】TTS 还在合成，音频未生成
          │
          ├─ emitControlToTTS(sessionId, 'question_start', ...) [LINE 656]
          │   └─ 通知 App：第一题即将开始
          │
          └─ emitToGateway(sessionId, 'voice_response', ...) [LINE 663]
              ├─ text: welcomeText  【第一题的文本】
              ├─ state: 'playing'
              ├─ questionIndex: 1
              └─ 【第一题界面已下发给 App】


X+100ms   ⏳ 第一题 TTS 正在合成...
          ├─ qwen3TTSClient.synthesize() 后台运行
          ├─ App 正在播放或等待音频
          └─ 用户开始思考


X+2000ms  🎤 用户开始说话（或 ASR 触发）
          [coordinator:241-268 处理 ASR]
          
          ├─ 【ASR speech_started 事件】
          │  └─ clearSilenceDetection() 重置计时
          │
          └─ 用户继续说话...


X+3000ms  🔊 用户完成第一题回答
          [coordinator:973-1213 处理 processUserResponse]
          
          ├─ 【收到 TEXT_MESSAGE 或 ASR transcription_completed】
          │  └─ isDuplicateMessage() 检查去重  [LINE 921]
          │
          ├─ 【清除静音计时器】
          │  └─ clearSilenceDetection(sessionId)  [LINE 989]
          │
          ├─ runInQueue(sessionId, async () => {
          │
          │    processUserResponse(sessionId, text, { speakNextRound: false })
          │    [coordinator:1113-1117]
          │
          │    await withTimeout(
          │      interviewFlowService.processUserResponse(
          │        sessionId, 
          │        effectiveText, 
          │        { speakNextRound: false }  【关键：不由 flow-controller 说第二题】
          │      ),
          │      5000  【LLM 超时 5 秒】
          │    )
          │
          │    ┌─ flow-controller.processUserResponse() 开始
          │    │
          │    ├─ currentRound.status = 'completed'     [LINE 950]
          │    ├─ await this.persistRoundAnswer(...)
          │    │
          │    ├─ 【大模型分析第一题回答】
          │    │  └─ await deepseekService.analyzeResponse(prompt)  [~2000ms]
          │    │
          │    ├─ 【追问逻辑】（如果需要）
          │    │  └─ 可能插入追问 round
          │    │
          │    ├─ 【推进到下一题】
          │    │  └─ const nextRound = await markNextRoundInProgress(session)  [LINE 1021]
          │    │      └─ nextRound.status = 'in_progress'
          │    │      └─ return nextRound
          │    │
          │    ├─ 【context refinement】（可选，~1000ms）
          │    │  └─ 如果 nextRound.roundNumber > currentRound.roundNumber
          │    │      └─ await deepseekService.contextualizePreparedQuestion()
          │    │
          │    ├─ 【关键点】speakNextRound = false，所以 LINE 1059 不执行
          │    │  └─ sendToAvatarAndTTS() 不被调用  ✓ 正确
          │    │
          │    └─ return {
          │         nextRound: {roundNumber: 2, question: "...", ...},
          │         isCompleted: false,
          │         feedback: "...",
          │         score: 85
          │       }
          │    
          │    └─ 返回 result 对象
          │
          │    【~3500ms 后回到 coordinator】
          │
          ├─ 回到 coordinator.processUserResponse() [LINE 1179]
          │
          ├─ if (result.isCompleted) { ... } else if (result.nextRound) {
          │  
          │  └─ 【第二题触发点】 ⚠️ 问题在这里！
          │
          │     const transitionText = isTimeout 
          │       ? '好的，时间到了，我们继续下一个问题。' 
          │       : undefined;
          │     
          │     await this.emitRoundVoiceResponse(
          │       sessionId, 
          │       result.nextRound,  【包含第二题内容】
          │       transitionText
          │     );  [LINE 1182]
          │
          └─ })


X+3200ms  ⚠️ 【问题发生】emitRoundVoiceResponse 开始执行
          [coordinator:1301-1350]
          
          ├─ session = interviewFlowService.getSession(sessionId)
          │
          ├─ 【ERROR】没有清空 TTS 队列！
          │  └─ qwen3TTSClient.clearSynthesis(sessionId) 【缺失】
          │
          ├─ emitControlToTTS(sessionId, 'question_start', {
          │    questionIndex: 1,  【第二题的索引】
          │    timeLimit: 300,
          │    isLast: false,
          │    text: "第二题题干内容..."
          │  })  [LINE 1307-1312]
          │
          ├─ const scene = interviewConductor.inferScene(round.question, ...)
          │
          ├─ 【TTS 第二次合成】
          │  ├─ const speakText = `${transitionText} ${round.question}`
          │  │   = "好的，时间到了，我们继续下一个问题。第二题题干..."
          │  │
          │  └─ await synthesizeQwen3TtsSegments(sessionId, speakText, scene)
          │      [coordinator:1326]
          │      └─ 【TTS 合成第二题文本】
          │          qwen3TTSClient.synthesize(sessionId, segment.text, false)
          │                [coordinator:1377]
          │          qwen3TTSClient.commitText(sessionId)
          │
          ├─ 【ERROR】session.runtimePhase 立即设置为 'speaking'】
          │  └─ session.runtimePhase = 'speaking'  [LINE 1346]
          │      ├─ 此时第二题 TTS 还未完成合成
          │      └─ 用户已被强制进入"说话模式"
          │
          ├─ this.startSpeakingTimeout(sessionId, round.question)
          │    [coordinator:1347]
          │    └─ 计算第二题的语音超时（基于字数）
          │
          └─ emitToGateway(sessionId, 'voice_response', {
               audioUrl: round.audioUrl || null,
               text: round.question,  【第二题的文本】
               sessionId,
               duration: 0,
               ttsMode: 'qwen3_streaming',
               questionIndex: 2,  【已经是第二题了！】
               state: 'playing',
               timeLimit: 300,
               transitionText: transitionText  【过渡语】
             })  [coordinator:1332-1343]
             
             👉 【【【第二题已下发给 App，覆盖第一题！】】】


X+3300ms  💥 【症状出现】App 显示第二题覆盖了第一题
          ├─ 用户还没来得及看到第一题的字幕
          ├─ 第二题的 voice_response 到达
          └─ App 前端切换到了第二题的倒计时


X+4000ms  ⏰ 其他定时器可能同时触发
          [可能的双重问题]
          
          ├─ Flow-Controller 的 startQuestionTimer 还在运行？
          │  └─ reminderTimer 可能在这时候触发
          │     └─ 发送 TTS 提示语："您好，请问您听清题目了吗？"
          │        [flow-controller:1315]
          │
          └─ 若提醒后无回答，skipTimer 也会触发
             └─ autoSkipToNextRound() 又推进一次
```

---

## 核心问题总结

### ❌ 问题1：emitRoundVoiceResponse 没有清空 TTS

**结果**：第一题和第二题的 TTS 请求都在队列中，可能混音

```typescript
// ❌ 现在的代码
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  // 直接开始合成，没有清空
  if (!round.audioUrl) {
    const speakText = transitionText ? `${transitionText} ${round.question}` : round.question;
    ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
  }
}

// ✅ 应该的代码
private async emitRoundVoiceResponse(sessionId: string, round: any, transitionText?: string) {
  // 【修复】先清空前一题
  qwen3TTSClient.clearSynthesis(sessionId);
  
  // 然后合成新题
  if (!round.audioUrl) {
    const speakText = transitionText ? `${transitionText} ${round.question}` : round.question;
    ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, speakText, scene);
  }
}
```

---

### ❌ 问题2：第一题的 runtimePhase 过早设置为 'speaking'

**结果**：TTS 还在合成时，ASR 已被关闭

```typescript
// ❌ 现在的代码（handleClientReady 中）
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  session.runtimePhase = 'speaking';  // ❌ 此时 TTS 还没生成音频
  
  const welcomeText = firstRound.question;
  this.startSpeakingTimeout(sessionId, welcomeText);
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  
  // TTS 请求发出，但 runtimePhase 已经是 speaking
}

// ✅ 应该的代码
if (firstRound) {
  firstRound.status = 'in_progress';
  session.currentRound = 1;
  
  const welcomeText = firstRound.question;
  this.startSpeakingTimeout(sessionId, welcomeText);
  
  // ✅ 在 TTS 后再设置
  const ttsMode = await this.synthesizeQwen3TtsSegments(sessionId, welcomeText, 'opening');
  session.runtimePhase = 'speaking';  // ✅ TTS 已请求后再设置
  
  // ...
}
```

---

### ❌ 问题3：双重定时器竞争

**结果**：Flow-Controller 的 startQuestionTimer 可能与 Coordinator 的时序冲突

```
Flow-Controller 时间线：
  startNextRound(sessionId)  [LINE 908]
    ├─ sendToAvatarAndTTS(...)  [第一题合成]
    ├─ startQuestionTimer(sessionId)  [LINE 912]  ❌ 启动定时器
    │   ├─ reminderTimer = 30秒  (QUESTION_REMINDER_TIMEOUT_MS)
    │   └─ 后续启动 skipTimer = 再加 30秒
    └─ return nextRound

Coordinator 时间线（并行）：
  handleClientReady(sessionId)
    ├─ synthesizeQwen3TtsSegments(...)  [第一题合成]
    ├─ startSilenceDetection(sessionId) [LINE 55]
    │   └─ silenceTimer = 30秒  (SILENCE_TIMEOUT_MS)
    └─ emitToGateway(...)

👉 两套定时器同时运行，可能在用户停顿时产生冲突！
```

---

## 修复后的理想时序

```
时刻      事件                          状态                  代码行号
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0ms       JOIN_SESSION → CLIENT_READY → handleClientReady()

100ms     ✅ 【修复】第一题 TTS 合成
          ├─ synthesizeQwen3TtsSegments(welcomeText, 'opening')
          ├─ session.runtimePhase = 'speaking'  【在 TTS 后设置】
          └─ emitToGateway('voice_response', {第一题})


3000ms    🎤 用户回答第一题

3100ms    processUserResponse() 开始
          ├─ await deepseekService.analyzeResponse()  【~2000ms】
          ├─ const nextRound = markNextRoundInProgress()
          └─ return {nextRound}


5100ms    ✅ 【修复】emitRoundVoiceResponse() 开始
          ├─ qwen3TTSClient.clearSynthesis(sessionId)  【关键修复】
          ├─ synthesizeQwen3TtsSegments(speakText, scene)
          ├─ await this.startSpeakingTimeout(...)
          └─ emitToGateway('voice_response', {第二题})


5200ms    ✅ 第二题下发，时间差 >= 2100ms
          ├─ 第一题已完全播放和录音
          ├─ 第二题下发不会覆盖第一题
          └─ 用户有充足的时间回答第一题
```

---

## 验证检查清单

### 日志检查

```bash
# ✅ 应该看到的日志序列
[Coordinator] 客户端三通道连接已确认就绪 (client_ready): sessionId=xxx
[Coordinator] 就绪触发大模型生成的初始欢迎问题: xxx
[Coordinator] Dispatching Qwen3 TTS session=xxx, segments=1
[Coordinator] Published voice_response for session=xxx

# （3秒左右，用户回答）

[Coordinator] ASR 识别完成 (xxx): "..."
[InterviewFlow] Session xxx is already processing, skipping duplicate response.
[Coordinator] Dispatching Qwen3 TTS session=xxx, segments=1
[Coordinator] Published voice_response for session=xxx

# ✅ 这两个 "Published voice_response" 之间应该间隔 > 3 秒
```

### 代码检查

```bash
# 检查 emitRoundVoiceResponse 是否调用了 clearSynthesis
grep -A 5 "private async emitRoundVoiceResponse" coordinator.service.ts

# 检查是否有两个 startQuestionTimer
grep -n "startQuestionTimer" flow-controller.service.ts

# 检查 runtimePhase 的设置顺序
grep -n "runtimePhase = 'speaking'" coordinator.service.ts
```

---

## 推荐修复顺序

1. **立即修复**（P0）：emitRoundVoiceResponse 前添加 clearSynthesis
2. **紧急修复**（P1）：禁用或同步 Flow-Controller 的 startQuestionTimer
3. **优化修复**（P2）：改进 handleClientReady 的 runtimePhase 时序
4. **验证修复**（P3）：添加日志和测试用例验证时序

