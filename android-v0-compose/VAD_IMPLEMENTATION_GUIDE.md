# VAD（语音活动检测）实现指南

## 当前状态

**当前系统采用手动控制模式**：
- 用户点击"开始答题" → 开始录音
- 用户点击"结束回答" → 停止录音并识别

**不是真正的VAD**：没有自动检测说话/静音，没有自动停止录音。

## VAD实现方案

### 方案1：客户端VAD（推荐）

#### 优点
- 响应快速，无网络延迟
- 可以完全控制逻辑
- 不依赖阿里云服务端VAD

#### 实现步骤

##### 1. 创建VAD检测器

```kotlin
// VoiceActivityDetector.kt
class VoiceActivityDetector(
    private val sampleRate: Int = 16000,
    private val silenceThresholdDb: Float = -40f,  // 静音阈值（分贝）
    private val silenceDurationMs: Long = 2000,     // 静音持续时间（毫秒）
    private val speechMinDurationMs: Long = 500     // 最小说话时间
) {
    companion object {
        private const val TAG = "VoiceActivityDetector"
    }

    enum class State {
        SILENCE,    // 静音
        SPEECH,     // 说话中
        TRANSITION  // 过渡状态
    }

    private var currentState = State.SILENCE
    private var speechStartTime: Long = 0
    private var silenceStartTime: Long = 0
    
    /**
     * 分析音频帧
     * @param audioData PCM音频数据
     * @return VAD状态
     */
    fun analyze(audioData: ByteArray): VadResult {
        // 计算音频能量（RMS）
        val rms = calculateRMS(audioData)
        
        // 转换为分贝
        val db = 20 * log10(rms)
        
        val now = System.currentTimeMillis()
        val isSpeech = db > silenceThresholdDb
        
        // 状态机
        when (currentState) {
            State.SILENCE -> {
                if (isSpeech) {
                    // 检测到说话
                    speechStartTime = now
                    currentState = State.TRANSITION
                    Log.d(TAG, "检测到说话开始: ${db}dB")
                }
            }
            
            State.TRANSITION -> {
                if (isSpeech) {
                    // 持续说话超过最小时间
                    if (now - speechStartTime >= speechMinDurationMs) {
                        currentState = State.SPEECH
                        silenceStartTime = 0
                        Log.d(TAG, "确认说话状态")
                    }
                } else {
                    // 误触发，返回静音
                    currentState = State.SILENCE
                }
            }
            
            State.SPEECH -> {
                if (!isSpeech) {
                    // 检测到静音
                    if (silenceStartTime == 0L) {
                        silenceStartTime = now
                        Log.d(TAG, "检测到静音开始")
                    }
                    
                    // 静音持续超过阈值
                    if (now - silenceStartTime >= silenceDurationMs) {
                        currentState = State.SILENCE
                        val speechDuration = silenceStartTime - speechStartTime
                        Log.d(TAG, "说话结束，时长: ${speechDuration}ms")
                        
                        return VadResult(
                            state = State.SILENCE,
                            db = db,
                            speechEnded = true,
                            speechDuration = speechDuration
                        )
                    }
                } else {
                    // 继续说话，重置静音计时
                    silenceStartTime = 0
                }
            }
        }
        
        return VadResult(
            state = currentState,
            db = db,
            speechEnded = false,
            speechDuration = 0
        )
    }
    
    /**
     * 计算音频RMS（均方根）
     */
    private fun calculateRMS(audioData: ByteArray): Float {
        var sum = 0.0
        val samples = audioData.size / 2
        
        for (i in 0 until samples) {
            val sample = ((audioData[i * 2 + 1].toInt() shl 8) or 
                         (audioData[i * 2].toInt() and 0xFF)).toShort()
            val normalized = sample / 32768.0
            sum += normalized * normalized
        }
        
        return sqrt(sum / samples).toFloat()
    }
    
    /**
     * 重置检测器
     */
    fun reset() {
        currentState = State.SILENCE
        speechStartTime = 0
        silenceStartTime = 0
    }
}

data class VadResult(
    val state: VoiceActivityDetector.State,
    val db: Float,
    val speechEnded: Boolean,
    val speechDuration: Long
)
```

##### 2. 修改RealtimeVoiceManager

```kotlin
// RealtimeVoiceManager.kt - 添加VAD支持

class RealtimeVoiceManager(private val context: Context) {
    // ... 现有代码 ...
    
    private val vadDetector = VoiceActivityDetector(
        silenceThresholdDb = -40f,      // 可配置
        silenceDurationMs = 2000,        // 2秒静音后自动停止
        speechMinDurationMs = 500        // 至少说话0.5秒
    )
    
    private var vadEnabled = true  // 可以通过UI切换
    
    /**
     * 启动VAD模式录音
     */
    fun startVadRecording() {
        Log.d(TAG, "启动VAD模式录音")
        
        if (isRecording) {
            Log.w(TAG, "已在录音，忽略")
            return
        }
        
        if (_connectionState.value != ConnectionState.CONNECTED) {
            _errors.tryEmit("语音服务尚未连接")
            return
        }
        
        scope.launch {
            try {
                val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
                val bufferSize = if (minBuffer > 0) minBuffer * 2 else SAMPLE_RATE * 2
                
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    CHANNEL_CONFIG,
                    AUDIO_FORMAT,
                    bufferSize
                )
                
                if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                    _errors.tryEmit("麦克风初始化失败")
                    recorder.release()
                    return@launch
                }
                
                vadDetector.reset()
                recordedBuffer = ByteArrayOutputStream()
                audioRecord = recorder
                recorder.startRecording()
                isRecording = true
                _isRecordingFlow.value = true
                
                recordingJob = launch { recordWithVad(recorder) }
                Log.i(TAG, "VAD录音已启动")
                
            } catch (e: Exception) {
                Log.e(TAG, "启动VAD录音失败", e)
                _errors.tryEmit(e.message ?: "启动录音失败")
                stopRecordingInternal()
            }
        }
    }
    
    /**
     * 带VAD的录音循环
     */
    private suspend fun recordWithVad(recorder: AudioRecord) = withContext(Dispatchers.IO) {
        val buffer = ByteArray(2048)
        var totalBytes = 0
        var speechDetected = false
        
        Log.d(TAG, "开始VAD录音循环，等待检测说话...")
        
        try {
            while (isRecording) {
                val bytesRead = recorder.read(buffer, 0, buffer.size)
                
                if (bytesRead > 0) {
                    // VAD分析
                    val vadResult = vadDetector.analyze(buffer)
                    
                    // 更新UI状态
                    when (vadResult.state) {
                        VoiceActivityDetector.State.SILENCE -> {
                            if (!speechDetected) {
                                _partialTranscript.value = "正在聆听，请开始说话..."
                            }
                        }
                        VoiceActivityDetector.State.TRANSITION,
                        VoiceActivityDetector.State.SPEECH -> {
                            if (!speechDetected) {
                                speechDetected = true
                                Log.i(TAG, "检测到说话，开始录音")
                            }
                            _partialTranscript.value = "正在录音... (${vadResult.db.toInt()}dB)"
                            
                            // 缓冲音频
                            recordedBuffer?.write(buffer, 0, bytesRead)
                            totalBytes += bytesRead
                        }
                    }
                    
                    // 检测到说话结束
                    if (vadResult.speechEnded) {
                        Log.i(TAG, "检测到说话结束，停止录音 - 时长: ${vadResult.speechDuration}ms")
                        isRecording = false
                        break
                    }
                    
                } else if (bytesRead < 0) {
                    Log.e(TAG, "录音读取失败: $bytesRead")
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "VAD录音异常", e)
        } finally {
            Log.i(TAG, "VAD录音结束 - 总字节: $totalBytes")
            recorder.stop()
            recorder.release()
            audioRecord = null
            isRecording = false
            _isRecordingFlow.value = false
            
            if (speechDetected && totalBytes > 0) {
                processRecordedAudio(true, currentSessionId!!)
            } else {
                Log.w(TAG, "未检测到有效语音")
                _partialTranscript.value = ""
                recordedBuffer?.reset()
            }
        }
    }
    
    // ... 其他代码保持不变 ...
}
```

##### 3. 修改UI界面

```kotlin
// DigitalInterviewScreen.kt - 添加VAD模式切换

@Composable
fun DigitalInterviewScreen(/* ... */) {
    // ... 现有代码 ...
    
    var vadMode by rememberSaveable { mutableStateOf(false) }
    
    // VAD模式切换
    val toggleRecording: () -> Unit = {
        if (vadMode) {
            // VAD自动模式
            if (isRecording) {
                voiceManager.stopRecording()
                Toast.makeText(context, "停止聆听", Toast.LENGTH_SHORT).show()
            } else {
                voiceManager.startVadRecording()
                Toast.makeText(context, "开始聆听，请说话", Toast.LENGTH_SHORT).show()
            }
        } else {
            // 手动模式
            if (isRecording) {
                voiceManager.stopRecording()
                Toast.makeText(context, "录音已结束", Toast.LENGTH_SHORT).show()
            } else {
                voiceManager.startRecording()
                Toast.makeText(context, "开始录音", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    // UI布局
    Column {
        // VAD模式开关
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("智能VAD模式")
            Switch(
                checked = vadMode,
                onCheckedChange = { vadMode = it }
            )
        }
        
        // 答题按钮
        StartAnswerButton(
            text = when {
                vadMode && isRecording -> "停止聆听"
                vadMode -> "开始聆听"
                isRecording -> "结束回答"
                else -> "开始答题"
            },
            enabled = connectionState == ConnectionState.CONNECTED,
            onClick = toggleRecording
        )
    }
}
```

##### 4. 配置参数

创建配置类：

```kotlin
// VadConfig.kt
data class VadConfig(
    val silenceThresholdDb: Float = -40f,    // 静音阈值
    val silenceDurationMs: Long = 2000,       // 静音多久停止
    val speechMinDurationMs: Long = 500,      // 最短说话时间
    val maxRecordingMs: Long = 30000          // 最长录音时间
) {
    companion object {
        // 预设配置
        val SENSITIVE = VadConfig(
            silenceThresholdDb = -45f,
            silenceDurationMs = 1500,
            speechMinDurationMs = 300
        )
        
        val NORMAL = VadConfig(
            silenceThresholdDb = -40f,
            silenceDurationMs = 2000,
            speechMinDurationMs = 500
        )
        
        val CONSERVATIVE = VadConfig(
            silenceThresholdDb = -35f,
            silenceDurationMs = 3000,
            speechMinDurationMs = 800
        )
    }
}
```

### 方案2：阿里云服务端VAD

#### 优点
- 阿里云提供的VAD算法
- 实时流式识别
- 边说边识别

#### 实现步骤

1. **启用阿里云VAD**
   ```bash
   # backend-api/.env
   ALIYUN_NLS_ENABLE_VAD=true
   ```

2. **使用流式识别API**
   ```kotlin
   // 需要使用WebSocket连接阿里云
   // 实时发送音频流
   // 接收实时识别结果
   ```

#### 缺点
- 需要持续WebSocket连接到阿里云
- 网络延迟影响体验
- 实现复杂度高

## 推荐方案

### 对于您的场景（面试系统）

我推荐**保持当前的手动模式**，原因：

1. ✅ **面试场景特点**
   - 用户需要思考时间
   - 回答通常较长，会有停顿
   - 不希望被误判为结束

2. ✅ **可靠性**
   - 用户完全控制
   - 不会误触发
   - 简单稳定

3. ✅ **已经工作**
   - 当前实现已经可用
   - ASR和TTS都正常

### 如果需要VAD

如果您确实需要VAD功能，我推荐**方案1（客户端VAD）**：
- 响应快速
- 完全可控
- 可以根据实际测试调整参数

## 测试VAD参数

如果实现VAD，需要测试调整：

```kotlin
// 测试不同环境
1. 安静环境：silenceThresholdDb = -45dB
2. 办公室环境：silenceThresholdDb = -40dB
3. 嘈杂环境：silenceThresholdDb = -35dB

// 测试不同场景
1. 快速问答：silenceDurationMs = 1500ms
2. 正常对话：silenceDurationMs = 2000ms
3. 面试场景：silenceDurationMs = 3000ms
```

## 下一步

请告诉我您的选择：

**A. 保持手动模式**（推荐）
- 无需改动，当前已可用

**B. 实现客户端VAD**
- 我可以提供完整实现代码
- 需要1-2小时开发和测试

**C. 使用阿里云VAD**
- 需要较大改动
- 实现复杂，需要更多时间

---

**创建时间**：2025-11-12

