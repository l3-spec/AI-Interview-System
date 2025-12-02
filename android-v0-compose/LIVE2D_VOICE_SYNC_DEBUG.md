# Live2D语音驱动问题排查和修复

## 问题描述

Live2D数字人在播放TTS时，嘴型没有跟随语音变化。

## 排查发现的问题

### 1. ❌ 缺少MODIFY_AUDIO_SETTINGS权限

**问题**：AndroidManifest.xml缺少使用Visualizer必需的权限

**修复**：
```xml
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**位置**：`app/src/main/AndroidManifest.xml`

### 2. ❌ Visualizer波形数据处理错误

**问题**：之前的代码将波形数据当作16位PCM处理，但Visualizer返回的是8位无符号数据（0-255）

**修复**：
```kotlin
// 错误的处理方式（之前）
val sample = ((waveform[i].toInt() shl 8) or waveform[i + 1].toInt()).toShort()
val normalized = sample / 32768f

// 正确的处理方式（现在）
val sample = (waveform[i].toInt() and 0xFF) - 128  // 0-255 转为 -128到127
val normalized = sample / 128f
```

### 3. ❌ 缺少详细调试日志

**问题**：无法确认Visualizer是否正常工作

**修复**：添加了完整的调试日志
- Visualizer初始化日志
- audioSessionId验证
- 嘴型更新日志（每秒一次）
- MediaPlayer事件日志

### 4. ⚠️ Live2D参数可能不存在

**问题**：不同的Live2D模型使用不同的参数名

**修复**：同时设置两个常见参数
```kotlin
setParameter("ParamMouthOpenY", value)  // 标准参数
setParameter("ParamMouthOpen", value)    // 备用参数
```

## 已修复的代码

### 1. AndroidManifest.xml
✅ 添加了 `MODIFY_AUDIO_SETTINGS` 权限

### 2. RealtimeVoiceManager.kt

#### setupAudioVisualizer()
✅ 添加audioSessionId验证
✅ 使用最快捕获率
✅ 添加详细日志

#### updateLive2DMouth()
✅ 修复波形数据处理（8位无符号）
✅ 放大系数从3倍增加到5倍（更明显的效果）
✅ 添加定期日志输出

#### playAudioFromPath/playAudioFromUrl()
✅ 添加详细的MediaPlayer事件日志
✅ 添加onErrorListener
✅ 播放完成后重置嘴型

### 3. Live2DComposable.kt

#### updateMouthOpenness()
✅ 同时设置两个参数（ParamMouthOpenY和ParamMouthOpen）

### 4. Live2DRenderer.kt

#### setParameter()
✅ 添加渲染器状态检查
✅ 添加参数更新日志

## 预期日志输出

### Live2D Controller附加
```
D/RealtimeVoiceManager: Live2DController已设置: 成功
D/RealtimeVoiceManager: 测试Live2D嘴型：设置为0.5
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.5
D/Live2DRenderer: 参数更新 #2 - ParamMouthOpen = 0.5
D/RealtimeVoiceManager: 测试Live2D嘴型：重置为0
D/Live2DRenderer: 参数更新 #3 - ParamMouthOpenY = 0.0
D/Live2DRenderer: 参数更新 #4 - ParamMouthOpen = 0.0
```

### TTS播放时
```
D/RealtimeVoiceManager: playAudioFromPath被调用 - path=/data/.../ aliyun_tts_xxx.mp3
I/RealtimeVoiceManager: MediaPlayer准备完成，开始播放 - audioSessionId=123
D/RealtimeVoiceManager: 设置音频可视化 - audioSessionId=123
D/RealtimeVoiceManager: Visualizer captureSize=1024, range=128-1024
I/RealtimeVoiceManager: Visualizer已启动 - captureRate=20000

# 播放过程中（每秒输出）
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65, waveformSize=1024
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65
D/Live2DRenderer: 参数更新 #2 - ParamMouthOpen = 0.65

D/RealtimeVoiceManager: Live2D嘴型更新 #100 - rms=0.189, mouthOpenness=0.52, waveformSize=1024
D/Live2DRenderer: 参数更新 #200 - ParamMouthOpenY = 0.52

# 播放完成
I/RealtimeVoiceManager: MediaPlayer播放完成
```

## 测试验证步骤

### 1. 重新编译安装

```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. 监控日志

```bash
# 清空旧日志
adb logcat -c

# 监控关键日志
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer"
```

### 3. 测试流程

1. 打开App，进入数字人面试
2. 等待看到Live2D测试日志（嘴型从0→0.5→0）
3. 点击"开始答题（VAD）"或输入文本
4. 等待数字人TTS回复
5. **观察**：
   - MediaPlayer是否开始播放
   - Visualizer是否初始化
   - 嘴型是否有更新日志
   - Live2D界面上嘴型是否动

## 可能的问题和解决方案

### 问题1: Visualizer初始化失败

**日志**：
```
E/RealtimeVoiceManager: 设置音频可视化失败：缺少权限
```

**解决**：已添加MODIFY_AUDIO_SETTINGS权限，重新安装App

### 问题2: Live2DController为null

**日志**：
```
W/RealtimeVoiceManager: Live2DController未设置，无法驱动嘴型
```

**解决**：确保在DigitalInterviewScreen中正确设置：
```kotlin
LaunchedEffect(Unit) {
    voiceManager.setLive2DController(live2DController)
}
```

### 问题3: 参数名不匹配

**日志**：
```
# 没有参数更新日志
```

**解决**：现在同时设置两个参数：
- `ParamMouthOpenY`（标准）
- `ParamMouthOpen`（备用）

### 问题4: MediaPlayer audioSessionId无效

**日志**：
```
E/RealtimeVoiceManager: 无效的audioSessionId: 0
```

**解决**：确保MediaPlayer在prepare完成后才获取audioSessionId

### 问题5: 模型可能不支持嘴型动画

**检查**：查看模型文件 `hiyori_pro_t11.model3.json`

**验证参数**：
```bash
# 在Android设备上测试
adb shell am start -n com.xlwl.AiMian/.live2d.Live2DActivity
# 手动触摸Live2D应该能看到动作
```

## 性能优化

### Visualizer配置

```kotlin
captureSize = 256                        // 较小的size，更快更新
captureRate = Visualizer.getMaxCaptureRate()  // 最快更新率（通常20Hz）
```

### 更新策略

```kotlin
// 每帧更新嘴型，跟随音频波形
// 放大系数5倍，使嘴型变化更明显
val mouthOpenness = (rms * 5f).coerceIn(0f, 1f)
```

## 验证清单

- [ ] App重新安装（包含新权限）
- [ ] Live2D测试嘴型动画（看到0→0.5→0的日志）
- [ ] Visualizer初始化成功（看到captureRate日志）
- [ ] TTS播放时有嘴型更新日志
- [ ] Live2D界面上嘴型确实在动

## 下一步

1. **重新编译安装**（已执行）
2. **开启日志监控**
3. **测试完整流程**
4. **观察日志输出**
5. **根据日志调整参数**

---

**修复时间**：2025-11-12
**状态**：✅ 已修复，待测试

