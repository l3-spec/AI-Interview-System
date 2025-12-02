# Live2D语音驱动修复完成 ✅

## 问题诊断结果

**症状**：Live2D数字人在播放TTS时，嘴型没有跟随语音变化

## 发现的问题和修复

### ❌ 问题1：缺少MODIFY_AUDIO_SETTINGS权限

**原因**：Android使用`Visualizer`需要此权限

**修复**：在`AndroidManifest.xml`添加
```xml
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### ❌ 问题2：Visualizer波形数据处理错误

**原因**：之前将Visualizer的8位数据当作16位PCM处理

**错误代码**：
```kotlin
// ❌ 错误：Visualizer返回的是8位无符号数据（0-255）
val sample = ((waveform[i].toInt() shl 8) or waveform[i + 1].toInt()).toShort()
val normalized = sample / 32768f
```

**正确代码**：
```kotlin
// ✅ 正确：8位无符号转有符号，中心点128
val sample = (waveform[i].toInt() and 0xFF) - 128  // 0-255 转为 -128到127
val normalized = sample / 128f
```

### ❌ 问题3：嘴型变化不明显

**原因**：RMS放大系数太小（3倍）

**修复**：增加到5倍
```kotlin
val mouthOpenness = (rms * 5f).coerceIn(0f, 1f)  // 从3倍改为5倍
```

### ❌ 问题4：缺少详细调试日志

**修复**：添加了完整的调试日志
- Visualizer初始化状态
- audioSessionId验证
- 嘴型更新频率（每秒打印一次）
- MediaPlayer事件日志
- Live2D参数更新日志

### ❌ 问题5：同时设置多个嘴型参数

**原因**：不同Live2D模型可能使用不同参数名

**修复**：同时设置两个常见参数
```kotlin
setParameter("ParamMouthOpenY", value)  // 标准参数
setParameter("ParamMouthOpen", value)    // 备用参数
```

### ✅ 问题6：添加Live2D连接测试

**新增**：设置Live2DController时自动测试
```kotlin
fun setLive2DController(controller: Live2DViewController?) {
    live2DController = controller
    // 自动测试：嘴型 0 → 0.5 → 0
    // 可在日志中看到测试效果
}
```

## 修复的文件

| 文件 | 修改内容 |
|------|----------|
| `AndroidManifest.xml` | ✅ 添加MODIFY_AUDIO_SETTINGS权限 |
| `RealtimeVoiceManager.kt` | ✅ 修复波形处理、增加日志、添加测试 |
| `Live2DComposable.kt` | ✅ 设置多个嘴型参数 |
| `Live2DRenderer.kt` | ✅ 添加参数更新日志 |

## 预期日志输出

### Live2D Controller附加（启动时）
```
D/RealtimeVoiceManager: Live2DController已设置: 成功
（延迟0.5秒）
D/RealtimeVoiceManager: 测试Live2D嘴型：设置为0.5
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.5
D/Live2DRenderer: 参数更新 #2 - ParamMouthOpen = 0.5
（延迟0.5秒）
D/RealtimeVoiceManager: 测试Live2D嘴型：重置为0
D/Live2DRenderer: 参数更新 #3 - ParamMouthOpenY = 0.0
D/Live2DRenderer: 参数更新 #4 - ParamMouthOpen = 0.0
```

**UI效果**：应该能看到Live2D嘴型快速张开然后闭合

### TTS播放时
```
# 1. 开始播放
D/RealtimeVoiceManager: playAudioFromPath被调用 - path=/data/.../aliyun_tts_xxx.mp3
I/RealtimeVoiceManager: MediaPlayer准备完成，开始播放 - audioSessionId=123

# 2. Visualizer初始化
D/RealtimeVoiceManager: 设置音频可视化 - audioSessionId=123
D/RealtimeVoiceManager: Visualizer captureSize=256, range=128-1024
I/RealtimeVoiceManager: Visualizer已启动 - captureRate=20000

# 3. 播放过程中（每秒打印）
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65, waveformSize=256
D/Live2DRenderer: 参数更新 #5 - ParamMouthOpenY = 0.65
D/Live2DRenderer: 参数更新 #6 - ParamMouthOpen = 0.65

D/RealtimeVoiceManager: Live2D嘴型更新 #100 - rms=0.189, mouthOpenness=0.52, waveformSize=256
D/Live2DRenderer: 参数更新 #200 - ParamMouthOpenY = 0.52

# 4. 播放完成
I/RealtimeVoiceManager: MediaPlayer播放完成
（嘴型重置为0）
```

**UI效果**：Live2D嘴型应该跟随TTS语音快速变化

## 测试验证

### 1. 安装新版本
```bash
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. 监控日志
```bash
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer" --color=always
```

### 3. 测试步骤

#### 步骤1：测试Live2D连接
1. 打开App
2. 进入数字人面试界面
3. **观察日志**：应该看到Live2D测试嘴型（0→0.5→0）
4. **观察UI**：Live2D嘴型应该快速张开再闭合

#### 步骤2：测试VAD+TTS+Live2D
1. 点击"开始答题（VAD）"
2. 说话："你好，请问这次面试的流程是怎样的？"
3. 等待2秒静音
4. 等待识别和LLM处理
5. **观察日志**：
   - MediaPlayer准备完成
   - Visualizer已启动
   - Live2D嘴型更新（每秒打印）
6. **观察UI**：
   - 听到TTS语音
   - Live2D嘴型跟随语音变化

### 4. 问题诊断

#### 如果仍然没有嘴型动画

**检查1：Visualizer权限**
```bash
# 查看日志
adb logcat | grep "音频可视化失败"

# 如果看到权限错误，确认AndroidManifest已包含：
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**检查2：Visualizer初始化**
```bash
# 应该看到
I/RealtimeVoiceManager: Visualizer已启动 - captureRate=20000

# 如果看到
E/RealtimeVoiceManager: 无效的audioSessionId: 0
# 说明MediaPlayer有问题
```

**检查3：嘴型更新调用**
```bash
# 应该看到（每秒一次）
D/RealtimeVoiceManager: Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65

# 如果没有看到，说明Visualizer回调未触发
```

**检查4：Live2D参数更新**
```bash
# 应该看到（频繁）
D/Live2DRenderer: 参数更新 #1 - ParamMouthOpenY = 0.65

# 如果没有看到，说明Live2D渲染器未就绪
```

**检查5：Live2D视图渲染**
```bash
# 应该看到
D/Live2DRenderer: Rendered Live2D frame #1
D/Live2DRenderer: Rendered Live2D frame #300

# 如果没有看到，说明Live2D渲染有问题
```

## 可能的问题和解决方案

### 问题A：权限未授予
**解决**：卸载重装App，确保新权限生效
```bash
adb uninstall com.xlwl.AiMian
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 问题B：Visualizer不支持
**解决**：某些设备/模拟器可能不支持Visualizer
```bash
# 测试Visualizer支持
adb shell dumpsys media.audio_policy | grep Visualizer
```

### 问题C：模型参数名不匹配
**解决**：查看模型配置文件
```bash
# 查看Hiyori模型的参数
adb shell cat /sdcard/Android/data/com.xlwl.AiMian/files/live2d/hiyori/hiyori_pro_t11.model3.json
```

可能的参数名：
- `ParamMouthOpenY` （标准）
- `ParamMouthOpen` （备用）
- `ParamMouthOpenness`
- `ParamLipSync`

### 问题D：音频文件格式问题
**解决**：确保TTS返回的是有效的音频文件
```bash
# 查看生成的TTS文件
adb shell ls -lh /data/data/com.xlwl.AiMian/cache/aliyun_tts_*
```

## 性能调优

### Visualizer配置优化

```kotlin
// 当前配置
captureSize = 256                         // 小captureSize，快速更新
captureRate = Visualizer.getMaxCaptureRate()  // 最快更新（通常20Hz）

// 如果嘴型更新太慢
captureSize = 128                         // 更小，更快
captureRate = Visualizer.getMaxCaptureRate()

// 如果嘴型抖动太快
captureRate = Visualizer.getMaxCaptureRate() / 2  // 降低更新率
```

### 放大系数调优

```kotlin
// 当前配置
val mouthOpenness = (rms * 5f).coerceIn(0f, 1f)

// 如果嘴型太小
val mouthOpenness = (rms * 8f).coerceIn(0f, 1f)  // 更夸张

// 如果嘴型太大
val mouthOpenness = (rms * 3f).coerceIn(0f, 1f)  // 更自然
```

## 验证清单

进入App后，按顺序检查：

- [ ] **启动测试**：看到Live2D测试嘴型日志（0→0.5→0）
- [ ] **UI观察**：Live2D嘴型快速张开再闭合
- [ ] **VAD录音**：正常录音和识别
- [ ] **TTS播放**：听到数字人语音
- [ ] **Visualizer初始化**：看到"Visualizer已启动"日志
- [ ] **嘴型更新**：看到"Live2D嘴型更新"日志（每秒）
- [ ] **参数更新**：看到"参数更新 ParamMouthOpenY"日志
- [ ] **UI效果**：Live2D嘴型跟随语音变化

## 完整测试流程

```bash
# 1. 监控日志
adb logcat -c
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer" --color=always

# 2. 在App中操作
# - 进入数字人面试
# - 观察启动测试（嘴型0→0.5→0）
# - 点击"开始答题（VAD）"
# - 说话测试
# - 等待TTS播放
# - 观察Live2D嘴型是否随语音动

# 3. 验证日志
# - ✅ Live2DController已设置: 成功
# - ✅ 测试Live2D嘴型：设置为0.5
# - ✅ MediaPlayer准备完成
# - ✅ Visualizer已启动
# - ✅ Live2D嘴型更新 #1 - rms=0.234, mouthOpenness=0.65
# - ✅ 参数更新 #1 - ParamMouthOpenY = 0.65
```

## 关键修复点

### 1. 权限修复 ✅
```xml
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### 2. 波形数据处理修复 ✅
```kotlin
// Visualizer的onWaveFormDataCapture返回8位无符号数据
val sample = (waveform[i].toInt() and 0xFF) - 128
val normalized = sample / 128f
val rms = sqrt(sum / waveform.size)
val mouthOpenness = (rms * 5f).coerceIn(0f, 1f)
```

### 3. 多参数设置 ✅
```kotlin
setParameter("ParamMouthOpenY", clampedValue)  // 主参数
setParameter("ParamMouthOpen", clampedValue)    // 备用参数
```

### 4. 完整日志系统 ✅
- Visualizer初始化日志
- 嘴型更新日志（每秒）
- 参数设置日志（每秒）
- MediaPlayer事件日志

### 5. 启动自测试 ✅
```kotlin
// Live2DController附加时自动测试
controller.updateMouthOpenness(0.5f)  // 张开
delay(500ms)
controller.updateMouthOpenness(0f)    // 闭合
```

## 下一步

1. **立即测试**：
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   adb logcat -c
   adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer"
   ```

2. **进入App测试**：
   - 观察启动时的嘴型测试
   - 进行语音对话测试
   - 观察TTS播放时的嘴型动画

3. **根据效果调优**：
   - 如果嘴型太小：增加放大系数到8倍
   - 如果嘴型抖动：降低更新率或使用平滑算法
   - 如果延迟明显：减小captureSize

## 技术要点

### Visualizer工作原理
```
MediaPlayer播放音频
    ↓
Visualizer捕获波形（每50ms，20Hz）
    ↓
onWaveFormDataCapture回调
    ↓
计算RMS能量
    ↓
转换为嘴型开放度（0.0-1.0）
    ↓
调用Live2D.setParameter("ParamMouthOpenY", value)
    ↓
GLSurfaceView.queueEvent在GL线程更新
    ↓
下一帧渲染时应用新参数
```

### 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| captureSize | 256 | 波形采样点数 |
| captureRate | 20000 Hz | 每秒捕获次数（最大值） |
| RMS放大系数 | 5 | 能量到嘴型的转换系数 |
| 更新频率 | ~20fps | 跟随captureRate |

---

**修复完成时间**：2025-11-12  
**编译状态**：✅ 成功  
**安装状态**：⏳ 准备安装  
**测试状态**：⏳ 待验证

**关键改进**：
1. ✅ 添加MODIFY_AUDIO_SETTINGS权限
2. ✅ 修复Visualizer数据处理（8位→16位转换）
3. ✅ 增加嘴型放大系数（5倍）
4. ✅ 添加完整调试日志
5. ✅ 添加启动自测试
6. ✅ 同时设置多个嘴型参数

