# 防重复播放修复 - 确保每个文本只播放一次

## 修复日期
2025-11-13

## 需求

用户要求：**确保每个文本只播放一遍，不仅仅是欢迎词，所有从backend-api返回的文本都应该只播放一次。**

因为欢迎词也是backend-api端返回的，所以整个流程应该是一致的。

## 问题分析

### 可能的重复播放场景

1. **后端重复发送**：同一个voice_response事件被发送多次
2. **WebSocket重连**：重连时可能重复接收已处理的消息
3. **Android端重复处理**：handleVoiceResponse被多次调用
4. **MediaPlayer重复播放**：playAudioFromPath被多次调用

## 修复方案

### ✅ 防重复机制

**核心思路**：使用文本内容的hash作为唯一标识，记录已播放的文本。

**实现**：

1. **文本Hash生成**：
```kotlin
val textHash = if (text.isNotBlank()) {
    text.hashCode().toString() + "_" + text.length
} else if (!audioUrl.isNullOrBlank()) {
    audioUrl.hashCode().toString()
} else {
    null
}
```

2. **三层防重复检查**：

#### 第一层：handleVoiceResponse入口检查
```kotlin
// 如果正在播放相同的文本，跳过
if (currentPlayingTextHash == textHash) {
    Log.w(TAG, "⚠️ 检测到重复的语音响应（正在播放中），跳过")
    return
}

// 如果已播放过，跳过
if (playedTextHashes.contains(textHash)) {
    Log.w(TAG, "⚠️ 检测到重复的语音响应（已播放过），跳过")
    return
}

// 标记为正在播放
currentPlayingTextHash = textHash
```

#### 第二层：playAudioFromPath/playAudioFromUrl检查
```kotlin
// 如果正在播放相同的文本，跳过
if (textHash != null && currentPlayingTextHash == textHash && _isDigitalHumanSpeaking.value) {
    Log.w(TAG, "⚠️ 检测到重复播放请求（正在播放中），跳过")
    return
}
```

#### 第三层：播放完成后标记
```kotlin
setOnCompletionListener {
    // 标记为已播放
    if (textHash != null) {
        playedTextHashes.add(textHash)
        currentPlayingTextHash = null
        Log.d(TAG, "文本播放完成，已标记为已播放 - textHash=$textHash")
    }
}
```

### ✅ 错误处理

在所有错误情况下清除播放标记：
- TTS失败时
- MediaPlayer错误时
- 处理异常时

### ✅ 清理机制

在cleanup时清理所有标记：
```kotlin
fun cleanup() {
    // ...
    playedTextHashes.clear()
    currentPlayingTextHash = null
}
```

## 修复内容

### 1. 添加防重复数据结构

```kotlin
// 防重复播放机制：记录已播放的文本（使用文本内容的hash）
private val playedTextHashes = mutableSetOf<String>()
private var currentPlayingTextHash: String? = null
```

### 2. handleVoiceResponse防重复

- 生成textHash
- 检查是否正在播放
- 检查是否已播放过
- 标记为正在播放

### 3. playClientSideTts传递textHash

- 方法签名添加textHash参数
- 传递给playAudioFromPath

### 4. playAudioFromPath防重复

- 方法签名添加textHash参数
- 检查是否正在播放
- 播放完成后标记为已播放

### 5. playAudioFromUrl防重复

- 方法签名添加textHash参数
- 检查是否正在播放
- 播放完成后标记为已播放

### 6. 错误处理

- 所有错误情况下清除currentPlayingTextHash
- 确保不会因为错误导致后续文本无法播放

## 工作流程

### 正常流程（首次播放）

```
1. 收到voice_response
   ↓
2. 生成textHash
   ↓
3. 检查：currentPlayingTextHash != textHash ✅
   ↓
4. 检查：playedTextHashes不包含textHash ✅
   ↓
5. 设置currentPlayingTextHash = textHash
   ↓
6. 调用playClientSideTts(text, textHash)
   ↓
7. TTS合成成功
   ↓
8. 调用playAudioFromPath(path, textHash)
   ↓
9. 检查：currentPlayingTextHash == textHash && isPlaying ✅
   ↓
10. MediaPlayer开始播放
    ↓
11. 播放完成
    ↓
12. playedTextHashes.add(textHash)
    ↓
13. currentPlayingTextHash = null
    ↓
14. ✅ 播放完成，已标记
```

### 重复流程（被拦截）

```
1. 收到voice_response（重复）
   ↓
2. 生成textHash（相同）
   ↓
3. 检查：currentPlayingTextHash == textHash ❌
   ↓
4. ⚠️ 检测到重复，跳过
   ↓
   或
   ↓
3. 检查：playedTextHashes.contains(textHash) ✅
   ↓
4. ⚠️ 检测到已播放过，跳过
```

## 测试验证

### 测试场景1：正常播放

**操作**：
1. 收到欢迎语
2. 收到回复1
3. 收到回复2

**预期**：
- 每个文本只播放一次
- 日志中看到"文本播放完成，已标记为已播放"

### 测试场景2：重复接收

**操作**：
1. 收到欢迎语（播放）
2. 再次收到相同的欢迎语（应被拦截）

**预期**：
- 第一次播放正常
- 第二次看到"⚠️ 检测到重复的语音响应，跳过"
- 不会重复播放

### 测试场景3：正在播放时收到新文本

**操作**：
1. 开始播放文本A
2. 在播放过程中收到文本A（应被拦截）
3. 播放完成后收到文本A（应被拦截）

**预期**：
- 播放过程中收到相同文本，被拦截
- 播放完成后收到相同文本，被拦截

### 测试场景4：错误处理

**操作**：
1. 收到文本（TTS失败）
2. 再次收到相同文本

**预期**：
- TTS失败时清除currentPlayingTextHash
- 可以重新尝试播放

## 关键日志

### 正常播放日志

```
I/RealtimeVoiceManager: 收到语音响应 - text=..., textHash=12345_32
I/RealtimeVoiceManager: 使用客户端TTS播放 - textHash=12345_32
I/RealtimeVoiceManager: MediaPlayer开始播放 - textHash=12345_32
I/RealtimeVoiceManager: MediaPlayer播放完成 - textHash=12345_32
D/RealtimeVoiceManager: 文本播放完成，已标记为已播放 - textHash=12345_32, 已播放总数=1
```

### 重复拦截日志

```
I/RealtimeVoiceManager: 收到语音响应 - text=..., textHash=12345_32
W/RealtimeVoiceManager: ⚠️ 检测到重复的语音响应（正在播放中），跳过 - textHash=12345_32
```

或

```
I/RealtimeVoiceManager: 收到语音响应 - text=..., textHash=12345_32
W/RealtimeVoiceManager: ⚠️ 检测到重复的语音响应（已播放过），跳过 - textHash=12345_32
```

## 注意事项

### Hash冲突

当前使用`text.hashCode() + "_" + text.length`作为hash，理论上可能存在冲突，但概率极低。如果发现冲突，可以考虑使用更复杂的hash算法（如MD5）。

### 内存管理

`playedTextHashes`会持续增长，但通常一个会话不会超过几十条消息，内存占用可忽略。如果需要，可以在会话结束时清理。

### 文本变化

如果后端返回的文本有细微变化（如标点、空格），hash会不同，会被视为新文本。这是符合预期的行为。

## 相关修复

- [后端防重复发送欢迎语](./CRITICAL_FIX_SUMMARY.md#修复2：防止欢迎语重复发送)
- [Visualizer初始化修复](./CRITICAL_FIX_SUMMARY.md#修复1：增强visualizer初始化日志和验证)

---

**修复完成时间**：2025-11-13  
**修复范围**：所有从backend-api返回的文本（包括欢迎词和后续回复）  
**防重复机制**：三层检查（入口检查、播放检查、历史记录）

