# 火山引擎 TTS + 数字人唇形同步 - 集成指南

## 文件清单

| 文件 | 说明 |
|------|------|
| `ai/realtime/VolcanoTtsService.kt` | 火山引擎 TTS 服务（含 Viseme 时间轴生成） |
| `ai/realtime/LipSyncDriver.kt` | 音素驱动的唇形同步器 |
| `config/AppConfig.kt` | 新增 `volcanoAppId` / `volcanoApiKey` 配置项 |
| `build.gradle.kts` | 新增 `volcano_app_id` / `volcano_api_key` BuildConfig 字段 |

---

## 一、配置 API Key

### 1. 在 `local.properties` 中添加（推荐，不会提交到 Git）

在项目根目录的 `local.properties` 文件中添加：

```properties
# 火山引擎 TTS（数字人唇形同步用）
volcano_app_id=c2b3b777-af9c-4ad5-84d3-d139007eb09d
volcano_api_key=你的火山引擎API_KEY
```

### 2. 或直接在 `gradle.properties` 中添加

```properties
volcano_app_id=c2b3b777-af9c-4ad5-84d3-d139007eb09d
volcano_api_key=你的API_KEY
```

> **如何获取火山引擎 API Key？**
> 1. 登录 [火山引擎控制台](https://console.volcengine.com)
> 2. 搜索「实时语音合成」或「TTS」
> 3. 开通服务 → 创建应用 → 获取 App ID 和 API Key

---

## 二、VolcanoTtsService 使用方式

### 2.1 基本调用（TTS 合成 + 唇形数据）

```kotlin
val volcanoTts = VolcanoTtsService(context)

// 合成语音并获取音素时间轴
val result = volcanoTts.synthesizeWithViseme("请介绍一下你自己")

// result.audioFile        → 音频文件（File）
// result.visemeTimeline   → 音素时间轴（List<VisemeEvent>）
// result.durationMs       → 音频时长（毫秒）
```

### 2.2 纯语音合成（不需要唇形）

```kotlin
val audioFile = volcanoTts.synthesizeSpeech("你好，欢迎使用AI面试系统")
```

---

## 三、LipSyncDriver 使用方式

### 3.1 基础用法（播放音频 + 唇形同步）

```kotlin
val lipSyncDriver = LipSyncDriver(digitalHumanController)

// 播放音频并驱动唇形
lipSyncDriver.playWithLipSync(
    audioFile = result.audioFile,
    visemeTimeline = result.visemeTimeline
)

// 播放完成回调
lipSyncDriver.playWithLipSync(
    audioFile = result.audioFile,
    visemeTimeline = result.visemeTimeline
) {
    // 播放完成后自动开始录音
    realtimeVoiceManager.startRecording()
}
```

### 3.2 一次性调用（TTS + 唇形播放）

```kotlin
val lipSyncDriver = LipSyncDriver(digitalHumanController)

// 一行代码完成：TTS合成 → 播放 → 唇形同步
lipSyncDriver.speak(volcanoTts, "请问你有什么优势？") {
    Log.d("TAG", "播放完成")
}
```

---

## 四、在 RealtimeVoiceManager 中集成

### 4.1 添加 LipSyncDriver（替换 RMS 音量驱动的唇形）

在 `RealtimeVoiceManager` 中，只需把原来的 RMS 驱动的 `updateDigitalHumanMouth` 替换为 LipSyncDriver：

```kotlin
// 在类中添加：
private var lipSyncDriver: LipSyncDriver? = null
private var volcanoTtsService: VolcanoTtsService? = null
private var useVolcanoLipSync = false  // 开关，可通过配置控制

// 在 initialize() 或 onCreate() 中初始化：
volcanoTtsService = VolcanoTtsService(context)
lipSyncDriver = LipSyncDriver(digitalHumanController)

// 当收到 TTS 播放请求时，使用 LipSyncDriver：
private fun playAudioWithLipSync(path: String, textHash: String?, digitalHumanText: String?) {
    scope.launch {
        val preparedPath = preparePlayableAudio(path) ?: return@launch

        // 方式1: 原来的 RMS 音量驱动（保留 fallback）
        if (useVolcanoLipSync && volcanoTtsService != null && lipSyncDriver != null) {
            // 使用火山引擎 TTS + Viseme 唇形驱动
            val ttsResult = volcanoTtsService!!.synthesizeWithViseme(digitalHumanText ?: "")
            lipSyncDriver!!.playWithLipSync(ttsResult.audioFile, ttsResult.visemeTimeline)
        } else {
            // 原来的 Visualizer RMS 模式
            duixAudioSink?.invoke(preparedPath)
            playAudioFromPathOriginal(preparedPath, textHash, digitalHumanText)
        }
    }
}
```

### 4.2 更优雅的集成：接口化

```kotlin
interface TtsWithLipSync {
    suspend fun speak(text: String): File
    suspend fun speakWithLipSync(text: String): LipSyncResult
}

data class LipSyncResult(
    val audioFile: File,
    val visemeTimeline: List<VolcanoTtsService.VisemeEvent>,
    val durationMs: Long
)

// 火山引擎实现
class VolcanoTtsWithLipSync(val context: Context) : TtsWithLipSync {
    private val tts = VolcanoTtsService(context)
    private val lipSync = LipSyncDriver(null)

    override suspend fun speak(text: String): File = tts.synthesizeSpeech(text)

    override suspend fun speakWithLipSync(text: String): LipSyncResult {
        val result = tts.synthesizeWithViseme(text)
        return LipSyncResult(result.audioFile, result.visemeTimeline, result.durationMs)
    }
}

// 使用：
val ttsWithLipSync: TtsWithLipSync = VolcanoTtsWithLipSync(context)
ttsWithLipSync.speakWithLipSync("你好")
```

---

## 五、Viseme 映射表

| Viseme ID | 对应音素 | 嘴型 | 说明 |
|-----------|---------|------|------|
| 0 | 静音 | 闭嘴 | 停顿、沉默 |
| 1 | p, b, m | 闭唇 | 双唇紧闭 |
| 2 | f, v | 齿唇 | 上齿碰下唇 |
| 3 | z, c, s, d, t, n, l | 舌尖音 | 舌尖接触 |
| 4 | zh, ch, sh, r | 翘舌音 | 舌尖上翘 |
| 5 | g, k, h | 舌根音 | 舌根抬起 |
| 6 | j, q, x | 舌面音 | 舌面抬起 |
| 7 | a | 大张口 | 嘴巴大开 |
| 8 | o | 圆口 | 嘴唇圆起 |
| 9 | e | 中张口 | 中等张嘴 |
| 10 | i, u, ü | 咧嘴 | 嘴角伸展 |
| 11 | ü | 撮口 | 嘴唇撮圆 |
| 12 | ai, ei, ao, ou | 复合元音 | 中大张嘴 |

---

## 六、Viseme 时间轴生成原理

火山引擎标准 TTS API **可能不直接返回 viseme 数据**。有以下几种处理方式：

### 方案 A：火山引擎返回 Viseme（最佳）

如果开通了「唇形同步」功能的 TTS 接口，API 返回：
```json
{
  "viseme": [
    { "viseme_id": 1, "start_time": 0, "duration": 150 },
    { "viseme_id": 7, "start_time": 150, "duration": 200 },
    ...
  ]
}
```
→ 直接传给 `LipSyncDriver.playWithLipSync()`

### 方案 B：近似生成（当前实现）

基于文本分词和平均语速估算 viseme 时间轴：

```
"你好" → [
  Viseme(visemeId=10, startTime=0, duration=200),   // "i"
  Viseme(visemeId=8, startTime=200, duration=300), // "ao"
]
```

当前 `VolcanoTtsService` 实现的是**方案 B**，效果比 RMS 好但不如方案 A 精确。

### 方案 C：Wav2Lip 后处理（最高质量）

将 TTS 音频输入 Wav2Lip 模型，生成精确唇形同步视频：

```
TTS音频 → Wav2Lip → 唇形同步视频
```

适合**预生成场景**（面试报告回放），不适合实时交互。

---

## 七、运行效果对比

| 维度 | RMS 音量驱动（原来） | Viseme 音素驱动（新增） |
|------|-------------------|----------------------|
| 原理 | 音量大小 → 嘴型 | 音素内容 → 嘴型 |
| 准确度 | ⭐⭐ | ⭐⭐⭐⭐ |
| 实时性 | ✅ 实时 | ✅ 实时 |
| 成本 | 0 | TTS API 调用费 |
| 依赖 | 无 | 火山引擎 TTS |

---

## 八、注意事项

1. **Viseme ID 映射**：不同 TTS 引擎的 Viseme ID 定义可能不同，请对照火山引擎文档调整 `VISEME_TO_MOUTH` 映射表
2. **Android 权限**：`INTERNET`（已配置）、`MODIFY_AUDIO_SETTINGS`（用于 Visualizer）
3. **网络请求**：TTS 合成需要联网，建议添加网络状态检查
4. **线程安全**：`LipSyncDriver` 的 `playWithLipSync` 已在协程中执行，勿在主线程调用
5. **清理缓存**：TTS 合成的音频文件存储在 `context.cacheDir`，建议定期清理

---

## 九、测试步骤

```kotlin
// 1. 配置 API Key
// local.properties 添加 volcano_app_id 和 volcano_api_key

// 2. 同步 Gradle
// ./gradlew syncFiles

// 3. 测试 TTS 合成
val result = volcanoTtsService.synthesizeWithViseme("你好，欢迎参加AI面试")
Log.d("TAG", "音频文件: ${result.audioFile}")
Log.d("TAG", "Viseme事件数: ${result.visemeTimeline.size}")

// 4. 测试唇形驱动
lipSyncDriver.playWithLipSync(result.audioFile, result.visemeTimeline)

// 5. 观察数字人口型是否比之前更精确
// - 元音(a/o/e/i/u)时张嘴更明显
// - 辅音(p/b/m)时闭嘴更明显
// - 标点停顿时嘴型收回
```
