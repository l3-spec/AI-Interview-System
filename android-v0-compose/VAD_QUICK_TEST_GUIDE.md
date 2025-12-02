# VAD功能快速测试指南 🎙️

## ✅ 编译成功，已安装

VAD（语音活动检测）功能已完整实现并安装到设备。

## 🎯 功能说明

### VAD模式（默认启用）

**自动检测说话和静音**：
- 点击"开始答题（VAD）" → 开始聆听
- 检测到说话 → 自动开始录音
- 检测到2秒静音 → 自动停止并识别
- 无需手动点击"结束回答"

### 手动模式（可切换）

**传统录音方式**：
- 点击"开始答题" → 开始录音
- 说话...
- 点击"结束回答" → 停止并识别

## 🚀 立即测试

### 1. 启动后端服务（如果未运行）

```bash
# 在终端1
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

### 2. 开启日志监控

```bash
# 在终端2
adb logcat -c  # 清空旧日志
adb logcat | grep -E "RealtimeVoiceManager|VoiceActivityDetector|AliyunSpeechService"
```

### 3. 在App中测试

#### 测试VAD模式 ✅
1. 打开App，进入数字人面试界面
2. 确认"智能VAD模式"开关为**ON**
3. 点击"开始答题（VAD）"
4. 看到提示："正在聆听，请开始说话..."
5. 对着麦克风说："你好，我想应聘软件工程师职位"
6. 说完后保持安静，等待2秒
7. **预期**：自动检测到结束，开始识别

#### 测试手动模式
1. 将"智能VAD模式"开关切换为**OFF**
2. 点击"开始答题"
3. 说话
4. 点击"结束回答"
5. **预期**：手动控制录音

## 📊 预期日志

### VAD模式日志示例

```
✅ 初始化
D/RealtimeVoiceManager: startRecording被调用 - vadEnabled=true
I/RealtimeVoiceManager: 开始初始化录音 - sessionId=xxx, VAD=启用
D/VoiceActivityDetector: VAD已重置
I/RealtimeVoiceManager: 录音已启动
D/RealtimeVoiceManager: 开始VAD智能录音循环

✅ 等待说话
（用户暂未说话，状态显示"正在聆听，请开始说话..."）

✅ 检测到说话
D/VoiceActivityDetector: 检测到说话开始: -35dB
I/RealtimeVoiceManager: 检测到说话，开始录音缓冲
（状态显示"检测到说话，正在录音... (-35dB)"）

✅ 录音中
D/VoiceActivityDetector: 确认进入说话状态
D/RealtimeVoiceManager: 已录音: 32KB, 时长: 2秒
（状态显示"正在录音... 2秒 (-32dB)"）

✅ 检测到静音
D/VoiceActivityDetector: 检测到静音开始
（用户停止说话后2秒）
D/VoiceActivityDetector: 说话结束，总时长: 5234ms, 静音时长: 2001ms
I/RealtimeVoiceManager: 检测到说话结束 - 时长: 5234ms, 数据: 167424字节

✅ 识别处理
I/RealtimeVoiceManager: VAD录音循环结束 - 总字节数: 167424, 统计: 总帧数: 82, 语音帧: 65 (79%)
D/RealtimeVoiceManager: processRecordedAudio被调用
I/RealtimeVoiceManager: 开始调用阿里云ASR - 音频大小: 167424 bytes
D/AliyunSpeechService: ASR成功: text=你好，我想应聘软件工程师职位

✅ 提交backend
I/RealtimeVoiceManager: 通过WebSocket发送text_message - text=你好，我想应聘软件工程师职位

✅ 收到回复
I/RealtimeVoiceManager: 收到语音响应 - text=您好！很高兴认识您...

✅ TTS播放
I/RealtimeVoiceManager: 开始调用阿里云TTS
D/AliyunSpeechService: TTS成功
```

## 🎛️ VAD参数说明

### 当前配置（适合大多数场景）

```kotlin
silenceThresholdDb = -40f       // 静音阈值（分贝）
silenceDurationMs = 2000         // 2秒静音后自动结束
speechMinDurationMs = 500        // 至少说0.5秒才算有效
maxSpeechDurationMs = 60000      // 最长录音60秒
```

### 如果需要调整

修改文件：`app/src/main/java/com/example/v0clone/ai/realtime/RealtimeVoiceManager.kt`

```kotlin
// 找到这段代码
private val vadDetector = VoiceActivityDetector(
    sampleRate = SAMPLE_RATE,
    silenceThresholdDb = -40f,      // 👈 调整这里
    silenceDurationMs = 2000,        // 👈 调整这里
    speechMinDurationMs = 500,       // 👈 调整这里
    maxSpeechDurationMs = MAX_RECORDING_DURATION_MS.toLong()
)
```

#### 调优指南

| 问题 | 调整方案 |
|------|----------|
| **太灵敏**（噪音也触发） | 提高 `silenceThresholdDb` 到 -35dB |
| **不灵敏**（需要大声说话） | 降低 `silenceThresholdDb` 到 -45dB |
| **经常误结束**（说话停顿被当作结束） | 增加 `silenceDurationMs` 到 3000ms |
| **结束太慢**（要等很久） | 减少 `silenceDurationMs` 到 1500ms |
| **短促声音被识别**（咳嗽等） | 增加 `speechMinDurationMs` 到 800ms |

## ⚠️ 注意事项

### 1. 环境要求
- 需要相对安静的环境
- 麦克风权限已授予
- 网络连接正常

### 2. 使用技巧
- 说话音量适中（不要太小声）
- 说完后保持安静2秒
- 如果VAD不准确，可切换到手动模式

### 3. 常见问题

#### Q: VAD没有自动停止？
**A**: 可能是：
- 环境噪音太大
- 说话音量太小
- 需要调整 `silenceThresholdDb` 参数

#### Q: VAD太敏感，经常误触发？
**A**: 调整参数：
- 提高 `silenceThresholdDb` 到 -35dB
- 增加 `speechMinDurationMs` 到 800ms

#### Q: 说话停顿就被当作结束了？
**A**: 增加 `silenceDurationMs` 到 3000ms（3秒）

#### Q: 想手动控制怎么办？
**A**: 关闭"智能VAD模式"开关即可

## 📱 UI操作

### VAD开关位置
```
┌────────────────────────────────────┐
│  对话面板                           │
│  ├─ STAR-LINK: ...                 │
│  └─ 我: ...                        │
├────────────────────────────────────┤
│  智能VAD模式          [● ON  ]    │ ← 这里
│  自动检测说话和静音                │
├────────────────────────────────────┤
│  [  开始答题（VAD）  ]             │ ← 按钮
└────────────────────────────────────┘
```

### 按钮状态变化

| 状态 | VAD开 | VAD关 | 按钮颜色 |
|------|--------|--------|----------|
| 空闲 | "开始答题（VAD）" | "开始答题" | 橙色 |
| 录音中 | "停止聆听" | "结束回答" | 橙色 |
| 处理中 | "数字人应答中…" | "数字人应答中…" | 灰色（禁用） |
| 未连接 | "连接语音服务中…" | "连接语音服务中…" | 灰色（禁用） |

## 🔍 问题诊断

### 如果VAD不工作

```bash
# 查看完整日志
adb logcat | grep -E "RealtimeVoiceManager|VoiceActivityDetector"

# 检查是否有错误
adb logcat | grep -E "ERROR|FATAL"

# 查看音频录制状态
adb logcat | grep "AudioRecord"
```

### 验证WebSocket连接

```bash
# 应该看到连接成功且不频繁断开
adb logcat | grep "WebSocket"
```

### 测试Token获取

```bash
# 手动测试Token API
curl http://192.168.1.6:3001/api/voice/aliyun-token
```

## 📈 性能指标

### VAD模式性能

| 阶段 | 耗时 | 说明 |
|------|------|------|
| VAD检测 | 实时 | < 100ms延迟 |
| 静音确认 | 2秒 | 可配置 |
| ASR识别 | 1-3秒 | 取决于音频长度 |
| LLM生成 | 2-5秒 | DeepSeek处理 |
| TTS合成 | 1-2秒 | 阿里云TTS |
| **总计** | **6-12秒** | 从说完话到听到回复 |

### 手动模式性能

| 阶段 | 耗时 | 说明 |
|------|------|------|
| 用户点击结束 | 0秒 | 立即 |
| ASR识别 | 1-3秒 | 取决于音频长度 |
| LLM生成 | 2-5秒 | DeepSeek处理 |
| TTS合成 | 1-2秒 | 阿里云TTS |
| **总计** | **4-10秒** | 比VAD快2秒（无需等待静音检测） |

## 🎬 完整测试脚本

```bash
#!/bin/bash
# 一键测试VAD功能

echo "📱 安装最新版本..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "🔍 清空并监控日志..."
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|VoiceActivityDetector|AliyunSpeechService" --color=always

# 按Ctrl+C停止
```

## 🏆 成功标志

测试成功时，您应该看到：

### UI层面
- ✅ VAD开关可正常切换
- ✅ 开始聆听后看到"正在聆听，请开始说话..."
- ✅ 说话时看到"正在录音... X秒 (YdB)"
- ✅ 停止说话2秒后自动识别
- ✅ 收到数字人回复并播放

### 日志层面
- ✅ 看到"开始VAD智能录音循环"
- ✅ 看到"检测到说话开始"
- ✅ 看到"检测到说话结束"
- ✅ 看到"ASR成功"
- ✅ 看到"TTS成功"

## 📞 需要帮助？

如果遇到问题，收集以下信息：
1. 完整的Android日志
2. Backend服务日志
3. VAD开关状态（开/关）
4. 具体的错误消息

---

**安装时间**：2025-11-12
**版本**：v1.0-VAD
**状态**：✅ 已编译、已安装、待测试

