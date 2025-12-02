# 快速测试指南 - 实时语音交互修复验证

## 快速开始（3步完成）

### 1️⃣ 启动后端（终端1）

```bash
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev
```

等待看到：
```
✅ 实时语音服务已切换至阿里云ASR
Server running on port 3001
```

### 2️⃣ 编译安装App（终端2）

```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3️⃣ 监控日志（终端3）

```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|Live2D" --color=always
```

## 测试步骤

### ✅ 测试1：自动欢迎语

1. **打开App** → 进入数字人面试界面
2. **等待2-3秒**
3. **预期**：自动听到欢迎语

**成功标志**：
- 📢 听到："你好，欢迎参加面试。我是STAR-LINK AI面试官..."
- 👄 Live2D嘴型随语音变化
- 📝 对话框显示欢迎文本

**日志验证**：
```
I/RealtimeVoiceManager: 收到语音响应
I/RealtimeVoiceManager: MediaPlayer准备完成，开始播放
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234
```

### ✅ 测试2：自动重新开始录音

1. **等待欢迎语播放完**
2. **预期**：自动开始录音（无需点击按钮）

**成功标志**：
- 🎤 界面显示"正在聆听，请开始说话..."
- 🔴 录音指示灯动画

**日志验证**：
```
I/RealtimeVoiceManager: MediaPlayer播放完成
I/RealtimeVoiceManager: TTS播放完成，VAD模式自动重新开始录音
I/RealtimeVoiceManager: 录音已启动
```

### ✅ 测试3：VAD智能检测

1. **开始说话**："你好，我叫张三，我有3年工作经验..."
2. **停止说话2秒**
3. **预期**：自动结束录音并识别

**成功标志**：
- 📊 显示"检测到说话，正在录音... X秒"
- ⏹️ 2秒静音后显示"说话结束，正在识别..."
- ✅ 识别结果显示在对话框

**日志验证**：
```
I/RealtimeVoiceManager: 检测到说话，开始录音缓冲
I/RealtimeVoiceManager: 检测到说话结束 - 时长: 3500ms
D/AliyunSpeechService: ASR成功: text=你好，我叫张三...
```

### ✅ 测试4：实时互动循环

1. **等待数字人回复**
2. **预期**：回复播放完自动重新开始录音
3. **继续说话**（无需点击按钮）
4. **重复3-5轮**

**成功标志**：
- 🔄 每次TTS播放完自动开始录音
- 💬 连续对话无需手动操作
- 📱 体验流畅，无卡顿

**日志验证**：
```
（循环出现）
I/RealtimeVoiceManager: MediaPlayer播放完成
I/RealtimeVoiceManager: TTS播放完成，VAD模式自动重新开始录音
I/RealtimeVoiceManager: 录音已启动
```

### ✅ 测试5：Live2D嘴型同步

在任何TTS播放时：
- **观察**：Live2D数字人嘴型
- **预期**：嘴型随语音节奏张合

**成功标志**：
- 👄 嘴型开合幅度合理（不要太大或太小）
- 🎵 嘴型跟随语音节奏
- ⚡ 响应及时，无明显延迟

**日志验证**：
```
D/RealtimeVoiceManager: Visualizer已启动
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65
```

## 问题排查

### ❌ 问题：没有听到欢迎语

**检查**：
```bash
# 查看后端日志
# 应该看到：🎤 发送初始欢迎问题

# 查看Android日志
adb logcat | grep "voice_response"
# 应该看到：I/RealtimeVoiceManager: 收到语音响应
```

**解决**：
- 确保backend-api正在运行（端口3001）
- 检查网络连接
- 确认阿里云TTS配置

### ❌ 问题：欢迎语播放完没有自动开始录音

**检查**：
```bash
adb logcat | grep "自动重新开始录音"
# 应该看到：I/RealtimeVoiceManager: TTS播放完成，VAD模式自动重新开始录音
```

**解决**：
- 确认VAD开关处于开启状态（默认开启）
- 检查WebSocket连接状态
- 查看日志是否有错误信息

### ❌ 问题：Live2D嘴型没有变化

**检查**：
```bash
adb logcat | grep "Visualizer"
# 应该看到：
# D/RealtimeVoiceManager: Visualizer已启动
# D/RealtimeVoiceManager: Live2D嘴型更新
```

**解决**：
```bash
# 卸载重装以确保权限生效
adb uninstall com.xlwl.AiMian
adb install app/build/outputs/apk/debug/app-debug.apk
```

### ❌ 问题：VAD检测不准确

**症状**：
- 说话时没有检测到
- 或者太敏感，噪音也触发

**解决**：
调整VAD参数（如需要，联系开发者）：
- 静音阈值：-40dB（默认）
- 静音时长：2000ms（默认）

## 完整测试录屏建议

建议录制以下场景：

1. **场景1**：从进入界面到听到欢迎语（0-5秒）
2. **场景2**：自动开始录音并说话（5-15秒）
3. **场景3**：VAD自动结束录音和识别（15-20秒）
4. **场景4**：数字人回复并自动重新开始录音（20-30秒）
5. **场景5**：连续对话3轮（30-60秒）

## 成功标准

✅ **核心功能**：
- [x] 进入界面自动播放欢迎语
- [x] TTS播放完自动开始录音
- [x] VAD智能检测说话和静音
- [x] 连续对话3轮无需点击按钮

✅ **用户体验**：
- [x] 响应及时（<1秒延迟）
- [x] Live2D嘴型同步
- [x] 语音识别准确
- [x] 对话流畅自然

✅ **技术指标**：
- [x] 无WebSocket断连
- [x] 无崩溃或ANR
- [x] 内存占用正常
- [x] 电池消耗合理

## 一键测试脚本

保存为 `test-realtime.sh`：

```bash
#!/bin/bash

echo "🚀 开始实时语音交互测试"
echo ""

# 检查设备连接
if ! adb devices | grep -q "device$"; then
    echo "❌ 未检测到Android设备"
    exit 1
fi

# 清除日志
adb logcat -c

# 卸载旧版本
echo "📦 卸载旧版本..."
adb uninstall com.xlwl.AiMian 2>/dev/null

# 编译安装
echo "🔨 编译安装新版本..."
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

if [ $? -ne 0 ]; then
    echo "❌ 安装失败"
    exit 1
fi

echo "✅ 安装成功"
echo ""
echo "📱 请在设备上："
echo "  1. 打开App"
echo "  2. 进入数字人面试界面"
echo "  3. 等待欢迎语播放"
echo ""
echo "📊 监控日志中..."
echo ""

# 监控日志
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer" --color=always
```

运行：
```bash
chmod +x test-realtime.sh
./test-realtime.sh
```

---

**文档版本**：1.0  
**最后更新**：2025-11-13  
**适用版本**：Android v0.1+, Backend-API v1.0+

