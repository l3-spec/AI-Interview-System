# 第三方API音频驱动Live2D完整方案

## 🎯 核心问题

**第三方API返回的音频能否直接驱动Live2D？**

**答案**：**可以**，但需要**音频分析和处理**。

---

## 📊 音频流程

```
第三方API返回音频
    ↓
接收音频流（PCM/WAV/MP3）
    ↓
音频解码（转换为PCM格式）
    ↓
实时音频分析（FFT频谱分析）
    ↓
提取音频特征（音量、频谱）
    ↓
映射到Live2D参数（嘴型、表情）
    ↓
Live2D动画更新
```

---

## 🔧 实现方案

### 方案一：Android端实时音频分析（推荐）

#### 1. 接收音频流

```kotlin
// AudioStreamReceiver.kt
class AudioStreamReceiver {
    private var audioTrack: AudioTrack? = null
    private var isPlaying = false
    
    fun startReceivingAudio(audioUrl: String) {
        // 从URL或WebRTC流接收音频
        val audioStream = fetchAudioStream(audioUrl)
        
        // 配置AudioTrack
        val sampleRate = 44100
        val channelConfig = AudioFormat.CHANNEL_OUT_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        
        val bufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            channelConfig,
            audioFormat
        ) * 2
        
        audioTrack = AudioTrack(
            AudioManager.STREAM_MUSIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize,
            AudioTrack.MODE_STREAM
        )
        
        audioTrack?.play()
        isPlaying = true
        
        // 在后台线程处理音频流
        processAudioStream(audioStream)
    }
    
    private fun processAudioStream(stream: InputStream) {
        val buffer = ByteArray(4096)
        
        while (isPlaying) {
            val bytesRead = stream.read(buffer)
            if (bytesRead > 0) {
                // 播放音频
                audioTrack?.write(buffer, 0, bytesRead)
                
                // 同时分析音频驱动Live2D
                analyzeAudioForLive2D(buffer)
            }
        }
    }
}
```

#### 2. 音频分析（FFT频谱分析）

```kotlin
// AudioAnalyzer.kt
import android.media.audiofx.Visualizer
import kotlin.math.*

class AudioAnalyzer {
    private var visualizer: Visualizer? = null
    private var fftSize = 512
    private var sampleRate = 44100
    
    fun analyzeAudio(audioData: ByteArray): Float {
        // 将字节数组转换为浮点数数组
        val audioSamples = audioData.map { it.toFloat() / 128f }
        
        // 计算音量（RMS）
        val volume = calculateRMS(audioSamples)
        
        // FFT频谱分析（用于检测音调）
        val spectrum = performFFT(audioSamples)
        
        // 提取特征
        val mouthOpenness = mapVolumeToMouthOpenness(volume)
        val pitch = extractPitch(spectrum)
        
        return mouthOpenness
    }
    
    private fun calculateRMS(samples: List<Float>): Float {
        var sum = 0f
        for (sample in samples) {
            sum += sample * sample
        }
        return sqrt(sum / samples.size)
    }
    
    private fun mapVolumeToMouthOpenness(volume: Float): Float {
        // 将音量映射到0.0-1.0的嘴型开放度
        // 0.0 = 闭嘴，1.0 = 最大开口
        return (volume * 2f).coerceIn(0f, 1f)
    }
    
    private fun performFFT(samples: List<Float>): FloatArray {
        // 简化的FFT实现（实际应使用FFT库）
        // 这里使用Android的Visualizer API会更简单
        return FloatArray(fftSize)
    }
    
    private fun extractPitch(spectrum: FloatArray): Float {
        // 提取基频（音调）
        // 可以用峰值检测算法
        var maxIndex = 0
        var maxValue = 0f
        
        for (i in spectrum.indices) {
            if (spectrum[i] > maxValue) {
                maxValue = spectrum[i]
                maxIndex = i
            }
        }
        
        // 转换为频率
        return maxIndex * sampleRate / fftSize
    }
}
```

#### 3. 使用Android Visualizer API（更简单）

```kotlin
// Live2DAudioDriver.kt
import android.media.audiofx.Visualizer
import android.media.MediaPlayer

class Live2DAudioDriver {
    private var visualizer: Visualizer? = null
    private var mediaPlayer: MediaPlayer? = null
    private var onMouthUpdate: ((Float) -> Unit)? = null
    
    fun setupAudioVisualizer(audioUrl: String) {
        mediaPlayer = MediaPlayer().apply {
            setDataSource(audioUrl)
            prepare()
        }
        
        // 创建Visualizer连接到MediaPlayer
        val audioSessionId = mediaPlayer?.audioSessionId ?: 0
        
        visualizer = Visualizer(audioSessionId).apply {
            captureSize = Visualizer.getCaptureSizeRange()[1] // 最大采样
            setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
                override fun onWaveFormDataCapture(
                    visualizer: Visualizer,
                    waveform: ByteArray,
                    samplingRate: Int
                ) {
                    // 波形数据（用于音量检测）
                    val volume = calculateVolume(waveform)
                    onMouthUpdate?.invoke(volume)
                }
                
                override fun onFftDataCapture(
                    visualizer: Visualizer,
                    fft: ByteArray,
                    samplingRate: Int
                ) {
                    // FFT数据（用于频谱分析）
                    val pitch = extractPitch(fft)
                    // 可以根据音调调整表情
                }
            }, Visualizer.getMaxCaptureRate() / 2, true, true)
            
            enabled = true
        }
        
        mediaPlayer?.start()
    }
    
    private fun calculateVolume(waveform: ByteArray): Float {
        var sum = 0f
        for (i in waveform.indices step 2) {
            val sample = (waveform[i].toInt() shl 8) or waveform[i + 1].toInt()
            val normalized = sample / 32768f
            sum += normalized * normalized
        }
        val rms = sqrt(sum / (waveform.size / 2))
        
        // 映射到0.0-1.0
        return (rms * 3f).coerceIn(0f, 1f)
    }
    
    private fun extractPitch(fft: ByteArray): Float {
        // 提取基频
        var maxMagnitude = 0f
        var maxIndex = 0
        
        for (i in 0 until fft.size / 2) {
            val real = fft[i * 2].toFloat()
            val imaginary = fft[i * 2 + 1].toFloat()
            val magnitude = sqrt(real * real + imaginary * imaginary)
            
            if (magnitude > maxMagnitude) {
                maxMagnitude = magnitude
                maxIndex = i
            }
        }
        
        // 转换为频率（Hz）
        return maxIndex * 44100f / fft.size
    }
    
    fun setOnMouthUpdateListener(listener: (Float) -> Unit) {
        onMouthUpdate = listener
    }
    
    fun release() {
        visualizer?.release()
        mediaPlayer?.release()
    }
}
```

#### 4. 驱动Live2D

```kotlin
// DigitalInterviewScreen.kt（修改版）
@Composable
fun DigitalInterviewScreen(
    uiState: DigitalInterviewUiState,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val live2DController = remember { Live2DViewController() }
    val audioDriver = remember { Live2DAudioDriver() }
    
    LaunchedEffect(Unit) {
        // 设置音频驱动回调
        audioDriver.setOnMouthUpdateListener { mouthOpenness ->
            // 更新Live2D嘴型参数
            live2DController.updateMouthOpenness(mouthOpenness)
        }
    }
    
    // 当收到音频URL时
    LaunchedEffect(uiState.currentAudioUrl) {
        uiState.currentAudioUrl?.let { audioUrl ->
            // 设置音频并开始分析
            audioDriver.setupAudioVisualizer(audioUrl)
        }
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        // Live2D视图
        Live2DView(
            controller = live2DController,
            modifier = Modifier.align(Alignment.TopEnd)
        )
    }
    
    DisposableEffect(Unit) {
        onDispose {
            audioDriver.release()
        }
    }
}
```

---

### 方案二：使用WebRTC实时音频流

如果第三方API支持WebRTC，可以直接获取实时音频流：

```kotlin
// WebRTCAudioDriver.kt
class WebRTCAudioDriver {
    private var peerConnection: PeerConnection? = null
    private var audioTrack: AudioTrack? = null
    private var visualizer: Visualizer? = null
    
    suspend fun setupWebRTCConnection(rtcConfig: RTCConfiguration) {
        peerConnection = PeerConnectionFactory.createPeerConnection(
            rtcConfig,
            object : PeerConnectionObserver() {
                override fun onTrack(event: RtpTransceiver?) {
                    if (event?.track is AudioTrack) {
                        val track = event.track as AudioTrack
                        setupAudioVisualizer(track)
                    }
                }
            }
        )
    }
    
    private fun setupAudioVisualizer(audioTrack: AudioTrack) {
        // 创建AudioTrack用于播放
        this.audioTrack = createAudioTrack()
        
        // 设置音频接收回调
        audioTrack.setSink { audioBuffer ->
            // 播放音频
            audioTrack.write(audioBuffer.toByteArray(), 0, audioBuffer.size)
            
            // 分析音频驱动Live2D
            analyzeAudioBuffer(audioBuffer)
        }
        
        // 使用Visualizer分析
        val audioSessionId = audioTrack.audioSessionId
        visualizer = Visualizer(audioSessionId).apply {
            captureSize = Visualizer.getCaptureSizeRange()[1]
            setDataCaptureListener(/* ... */)
            enabled = true
        }
    }
    
    private fun analyzeAudioBuffer(buffer: FloatArray) {
        // 计算音量
        val volume = calculateRMS(buffer)
        
        // 更新Live2D
        live2DController.updateMouthOpenness(volume)
    }
}
```

---

## 🎨 Live2D参数映射

### 嘴型参数

```kotlin
// Live2DController.kt
class Live2DViewController {
    private var mouthOpenness = 0f
    
    fun updateMouthOpenness(value: Float) {
        mouthOpenness = value.coerceIn(0f, 1f)
        // 更新Live2D模型参数
        // ParamMouthOpenY: 嘴型开放度
        live2DModel.setParameterValue("ParamMouthOpenY", mouthOpenness)
    }
    
    fun updateWithAudioFeatures(volume: Float, pitch: Float) {
        // 根据音量和音调调整多个参数
        val mouthOpenY = volume * 0.8f
        val mouthForm = if (pitch > 300) 0.5f else -0.5f // 根据音调调整嘴型
        
        live2DModel.setParameterValue("ParamMouthOpenY", mouthOpenY)
        live2DModel.setParameterValue("ParamMouthForm", mouthForm)
    }
}
```

### 表情参数

```kotlin
fun updateExpressionWithAudio(audioFeatures: AudioFeatures) {
    // 根据音频特征调整表情
    val volume = audioFeatures.volume
    val pitch = audioFeatures.pitch
    
    // 高音量 -> 惊讶表情
    if (volume > 0.7f) {
        live2DModel.setParameterValue("ParamEyeLOpen", 1f)
        live2DModel.setParameterValue("ParamEyeROpen", 1f)
    }
    
    // 低音调 -> 柔和表情
    if (pitch < 200) {
        live2DModel.setParameterValue("ParamEyebrowLY", 0.3f)
        live2DModel.setParameterValue("ParamEyebrowRY", 0.3f)
    }
}
```

---

## 📊 完整流程示例

### 后端API返回音频

```typescript
// backend-api/src/services/digital-human.service.ts
export class DigitalHumanService {
  async generateResponseWithAudio(userVoice: Buffer) {
    // 1. ASR识别（第三方API）
    const text = await volcEngineASR.recognize(userVoice);
    
    // 2. LLM生成回复（您的DeepSeek）
    const response = await deepSeekService.generate(text);
    
    // 3. TTS合成（您的阿里云TTS）
    const audioResult = await ttsService.textToSpeech({
      text: response,
    });
    
    // 4. 返回音频URL和文本
    return {
      audioUrl: audioResult.audioPath, // 音频文件URL
      text: response,
      // 可选：也返回音频流URL（WebRTC）
      streamUrl: audioResult.streamUrl,
    };
  }
}
```

### Android端接收并驱动Live2D

```kotlin
// DigitalInterviewScreen.kt（完整版）
@Composable
fun DigitalInterviewScreen(
    uiState: DigitalInterviewUiState,
    onBackClick: () -> Unit
) {
    val context = LocalContext.current
    val live2DController = remember { Live2DViewController() }
    val audioDriver = remember { Live2DAudioDriver() }
    
    // 当收到新的音频响应时
    LaunchedEffect(uiState.currentResponse) {
        uiState.currentResponse?.let { response ->
            // 方式1：从URL加载音频
            response.audioUrl?.let { audioUrl ->
                audioDriver.setupAudioVisualizer(audioUrl)
            }
            
            // 方式2：从WebRTC流接收
            response.streamUrl?.let { streamUrl ->
                audioDriver.setupWebRTCConnection(streamUrl)
            }
        }
    }
    
    // 音频驱动Live2D回调
    LaunchedEffect(Unit) {
        audioDriver.setOnMouthUpdateListener { mouthOpenness ->
            live2DController.updateMouthOpenness(mouthOpenness)
        }
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        // Live2D数字人视图
        Live2DView(
            controller = live2DController,
            modifier = Modifier
                .size(200.dp)
                .align(Alignment.TopEnd)
        )
        
        // 其他UI...
    }
    
    DisposableEffect(Unit) {
        onDispose {
            audioDriver.release()
        }
    }
}
```

---

## ✅ 总结

### 回答您的问题

**Q: 第三方API返回的音频能否直接驱动Live2D？**

**A: 可以！** 但需要：

1. ✅ **接收音频**：从URL或WebRTC流接收
2. ✅ **音频解码**：转换为PCM格式
3. ✅ **实时分析**：使用Android Visualizer API分析音频
4. ✅ **参数映射**：将音频特征映射到Live2D参数
5. ✅ **实时更新**：在播放音频的同时更新Live2D动画

### 推荐方案

1. **使用Android Visualizer API**（最简单）
   - 直接连接到MediaPlayer或AudioTrack
   - 自动提供波形和FFT数据
   - 无需手动FFT实现

2. **实时音频流处理**
   - 适合WebRTC实时流
   - 延迟更低
   - 体验更好

3. **音频特征提取**
   - 音量 → 嘴型开放度
   - 音调 → 表情变化
   - 频谱 → 更丰富的动画

---

## 📚 参考代码

我已经在您的项目中看到有Live2D相关的代码，可以在此基础上集成音频驱动功能。

需要我帮您：
1. 实现完整的音频驱动Live2D代码
2. 集成到您现有的DigitalInterviewScreen
3. 优化音频分析算法

请告诉我您的需求！

