package com.xlwl.AiMian.ai.realtime

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.audiofx.Visualizer
import android.util.Log
import com.xlwl.AiMian.digitalhuman.DigitalHumanController
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.RandomAccessFile
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlin.math.sqrt

enum class ConversationRole { USER, DIGITAL_HUMAN }

data class ConversationMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: ConversationRole,
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

enum class ConnectionState { DISCONNECTED, CONNECTING, CONNECTED }

class RealtimeVoiceManager(private val context: Context) {
    companion object {
        private const val TAG = "RealtimeVoiceManager"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val MAX_RECORDING_DURATION_MS = 60000  // 最长录音60秒
        private const val VISUALIZER_MAX_RETRY = 5
        private const val VISUALIZER_RETRY_DELAY_MS = 150L
    }

    private suspend fun preparePlayableAudio(sourcePath: String): String? = withContext(Dispatchers.IO) {
        try {
            val localFile = if (sourcePath.startsWith("http", ignoreCase = true)) {
                downloadAudioToCache(sourcePath)
            } else {
                File(sourcePath)
            }
            if (localFile == null || !localFile.exists()) {
                Log.e(TAG, "音频文件不存在: $sourcePath")
                return@withContext null
            }

            val ext = localFile.extension.lowercase(Locale.ROOT)
            if (ext == "wav" || ext == "pcm") {
                return@withContext localFile.absolutePath
            }

            // 将mp3等格式转为wav，便于DUIX正常驱动嘴型
            val wavPath = transcodeToWav(localFile)
            if (wavPath != null) {
                return@withContext wavPath
            }

            Log.w(TAG, "音频转换失败，退回原始格式: $sourcePath")
            localFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "准备音频失败", e)
            null
        }
    }

    private suspend fun downloadAudioToCache(url: String): File? = withContext(Dispatchers.IO) {
        return@withContext try {
            val request = Request.Builder().url(url).build()
            downloadClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.e(TAG, "下载音频失败: code=${response.code}, url=$url")
                    return@use null
                }
                val body = response.body ?: return@use null
                val suffix = url.substringAfterLast('.', "mp3").takeIf { it.length <= 5 } ?: "mp3"
                val file = File(context.cacheDir, "duix_audio_${System.currentTimeMillis()}.$suffix")
                file.outputStream().use { output ->
                    body.byteStream().copyTo(output)
                }
                Log.d(TAG, "音频下载完成: ${file.absolutePath}")
                file
            }
        } catch (e: Exception) {
            Log.e(TAG, "下载音频异常", e)
            null
        }
    }

    private fun transcodeToWav(input: File): String? {
        var extractor: MediaExtractor? = null
        var codec: MediaCodec? = null
        var raf: RandomAccessFile? = null
        return try {
            extractor = MediaExtractor().apply { setDataSource(input.absolutePath) }
            var audioTrack = -1
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                if (mime.startsWith("audio/")) {
                    audioTrack = i
                    break
                }
            }
            if (audioTrack < 0) {
                Log.e(TAG, "未找到音频轨道，无法转码: ${input.absolutePath}")
                return null
            }
            extractor.selectTrack(audioTrack)
            val format = extractor.getTrackFormat(audioTrack)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return null
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

            codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val bufferInfo = MediaCodec.BufferInfo()
            val outputFile = File(context.cacheDir, "duix_audio_${System.currentTimeMillis()}.wav")
            raf = RandomAccessFile(outputFile, "rw").apply {
                // 预留头部
                setLength(0)
                write(ByteArray(44))
            }

            var totalPcmBytes = 0
            val timeoutUs = 10_000L
            var sawInputEOS = false
            var sawOutputEOS = false

            while (!sawOutputEOS) {
                if (!sawInputEOS) {
                    val inputIndex = codec.dequeueInputBuffer(timeoutUs)
                    if (inputIndex >= 0) {
                        val inputBuffer = codec.getInputBuffer(inputIndex) ?: continue
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            codec.queueInputBuffer(
                                inputIndex,
                                0,
                                0,
                                0,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            sawInputEOS = true
                        } else {
                            val presentationTimeUs = extractor.sampleTime
                            codec.queueInputBuffer(
                                inputIndex,
                                0,
                                sampleSize,
                                presentationTimeUs,
                                extractor.sampleFlags
                            )
                            extractor.advance()
                        }
                    }
                }

                var outputIndex = codec.dequeueOutputBuffer(bufferInfo, timeoutUs)
                while (outputIndex >= 0) {
                    val outBuffer = codec.getOutputBuffer(outputIndex)
                    if (bufferInfo.size > 0 && outBuffer != null) {
                        val chunk = ByteArray(bufferInfo.size)
                        outBuffer.get(chunk)
                        outBuffer.clear()
                        raf.seek(44 + totalPcmBytes.toLong())
                        raf.write(chunk)
                        totalPcmBytes += chunk.size
                    }
                    codec.releaseOutputBuffer(outputIndex, false)
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        sawOutputEOS = true
                        break
                    }
                    outputIndex = codec.dequeueOutputBuffer(bufferInfo, timeoutUs)
                }
            }

            // 写入WAV头
            raf.seek(0)
            writeWavHeader(raf, sampleRate, channelCount, totalPcmBytes)
            Log.d(TAG, "转码完成: ${outputFile.absolutePath} (pcmBytes=$totalPcmBytes)")
            outputFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "音频转码失败: ${input.absolutePath}", e)
            null
        } finally {
            try { extractor?.release() } catch (_: Exception) {}
            try { codec?.stop(); codec?.release() } catch (_: Exception) {}
            try { raf?.close() } catch (_: Exception) {}
        }
    }

    private fun writeWavHeader(raf: RandomAccessFile, sampleRate: Int, channels: Int, pcmDataLength: Int) {
        val byteRate = sampleRate * channels * 16 / 8
        val totalDataLen = pcmDataLength + 36
        val blockAlign = channels * 16 / 8

        raf.writeBytes("RIFF")
        raf.writeIntLE(totalDataLen)
        raf.writeBytes("WAVE")
        raf.writeBytes("fmt ")
        raf.writeIntLE(16) // Subchunk1Size for PCM
        raf.writeShortLE(1) // PCM format
        raf.writeShortLE(channels.toShort().toInt())
        raf.writeIntLE(sampleRate)
        raf.writeIntLE(byteRate)
        raf.writeShortLE(blockAlign.toShort().toInt())
        raf.writeShortLE(16) // bits per sample
        raf.writeBytes("data")
        raf.writeIntLE(pcmDataLength)
        raf.setLength((pcmDataLength + 44).toLong())
    }

    private fun RandomAccessFile.writeIntLE(value: Int) {
        write(byteArrayOf(
            (value and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte(),
            ((value shr 16) and 0xFF).toByte(),
            ((value shr 24) and 0xFF).toByte()
        ))
    }

    private fun RandomAccessFile.writeShortLE(value: Int) {
        write(byteArrayOf(
            (value and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte()
        ))
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val aliyunSpeechService = AliyunSpeechService(context.applicationContext)
    
    // VAD检测器
    private val vadDetector = VoiceActivityDetector(
        sampleRate = SAMPLE_RATE,
        silenceThresholdDb = -40f,      // 可以通过配置调整
        silenceDurationMs = 2000,        // 2秒静音后自动结束
        speechMinDurationMs = 500,       // 至少说0.5秒
        maxSpeechDurationMs = MAX_RECORDING_DURATION_MS.toLong()
    )
    
    private var vadEnabled = true  // VAD是否启用

    private var socket: Socket? = null
    private var audioRecord: AudioRecord? = null
    private var mediaPlayer: MediaPlayer? = null
    private var visualizer: Visualizer? = null
    private var digitalHumanController: DigitalHumanController? = null
    private var recordingJob: Job? = null
    private var currentSessionId: String? = null
    private var currentUserId: String? = null
    private var currentJobPosition: String? = null
    private var currentBackground: String? = null
    private var isInitializingSocket = false
    private var lastInitAttemptAt: Long = 0
    private var isRecording = false
    private var recordedBuffer: ByteArrayOutputStream? = null
    
    // 防重复播放机制：记录已播放的文本（使用文本内容的hash）
    private val playedTextHashes = mutableSetOf<String>()
    private var currentPlayingTextHash: String? = null

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _isRecordingFlow = MutableStateFlow(false)
    val isRecordingFlow: StateFlow<Boolean> = _isRecordingFlow.asStateFlow()

    private val _isDigitalHumanSpeaking = MutableStateFlow(false)
    val isDigitalHumanSpeaking: StateFlow<Boolean> = _isDigitalHumanSpeaking.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _partialTranscript = MutableStateFlow("")
    val partialTranscript: StateFlow<String> = _partialTranscript.asStateFlow()

    private val _conversation = MutableStateFlow<List<ConversationMessage>>(emptyList())
    val conversation: StateFlow<List<ConversationMessage>> = _conversation.asStateFlow()

    private val _latestDigitalHumanText = MutableStateFlow<String?>(null)
    val latestDigitalHumanText: StateFlow<String?> = _latestDigitalHumanText.asStateFlow()

    private val _interviewCompleted = MutableStateFlow(false)
    val interviewCompleted: StateFlow<Boolean> = _interviewCompleted.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    private val completionKeywords = listOf(
        "面试结束",
        "结束面试",
        "本次面试到此结束",
        "interview finished",
        "interview is over",
        "session completed"
    )

    // 可选的数字人音频分发（用于DUIX推送PCM/WAV）
    private var duixAudioSink: ((String) -> Unit)? = null

    private val downloadClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    suspend fun initialize(
        serverUrl: String,
        sessionId: String,
        userId: String? = null,
        jobPosition: String? = null,
        background: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            if (isInitializingSocket) {
                Log.w(TAG, "已有WebSocket初始化进行中，忽略重复请求")
                return@withContext false
            }
            if (_connectionState.value == ConnectionState.CONNECTING) {
                Log.w(TAG, "WebSocket正在连接，忽略重复初始化请求")
                return@withContext false
            }
            if (socket?.connected() == true && currentSessionId == sessionId) {
                Log.d(TAG, "已连接到相同会话，跳过重复初始化")
                return@withContext true
            }
            val now = System.currentTimeMillis()
            if (now - lastInitAttemptAt < 4000) {
                Log.w(TAG, "初始化请求过于频繁，稍后重试")
                return@withContext false
            }
            lastInitAttemptAt = now
            isInitializingSocket = true

            // 清理旧连接，避免多个Socket并行重连导致连接风暴
            try {
                socket?.off()
                socket?.disconnect()
            } catch (_: Exception) {
            }
            socket = null

            currentSessionId = sessionId
            currentUserId = userId
            currentJobPosition = jobPosition
            currentBackground = background
            _connectionState.value = ConnectionState.CONNECTING
            _interviewCompleted.value = false
            playedTextHashes.clear()
            currentPlayingTextHash = null

            val options = IO.Options().apply {
                forceNew = true
                // 禁用自动重连，避免同时存在多个Socket重连导致连接风暴。由上层显式控制重连节奏。
                reconnection = false
                reconnectionAttempts = 0
                reconnectionDelay = 0
                reconnectionDelayMax = 0
                randomizationFactor = 0.0
                transports = arrayOf("websocket") // 强制使用websocket，避免polling导致的transport error
            }

            val newSocket = IO.socket(serverUrl, options)
            newSocket.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "WebSocket连接成功: $serverUrl")
                _connectionState.value = ConnectionState.CONNECTED
                joinSession(sessionId, userId, jobPosition, background)
            }
            newSocket.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "WebSocket连接断开")
                _connectionState.value = ConnectionState.DISCONNECTED
                socket = null
            }
            newSocket.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "WebSocket连接错误: ${args.getOrNull(0)}")
                _connectionState.value = ConnectionState.DISCONNECTED
                socket = null
                args.getOrNull(0)?.toString()?.let { _errors.tryEmit(it) }
            }
            newSocket.on("voice_response") { args ->
                handleVoiceResponse(args[0] as JSONObject)
            }
            newSocket.on("status") { args ->
                handleStatus(args[0] as JSONObject)
            }
            newSocket.on("error") { args ->
                handleError(args.getOrNull(0))
            }

            Log.d(TAG, "尝试连接实时语音服务: $serverUrl (session=$sessionId)")
            newSocket.connect()
            socket = newSocket
            true
        } catch (e: Exception) {
            Log.e(TAG, "初始化实时语音服务失败", e)
            _errors.tryEmit(e.message ?: "实时语音服务连接失败")
            _connectionState.value = ConnectionState.DISCONNECTED
            false
        } finally {
            isInitializingSocket = false
        }
    }

    fun setDigitalHumanController(controller: DigitalHumanController?) {
        digitalHumanController = controller
        Log.i(TAG, "DigitalHumanController已设置: ${if (controller != null) "成功" else "null"}")

        controller?.resetMouth()
        if (controller != null) {
            scope.launch {
                delay(500)
                Log.d(TAG, "测试数字人嘴型：设置为0.5")
                controller.updateMouthOpenness(0.5f)
                delay(500)
                Log.d(TAG, "测试数字人嘴型：重置为0")
                controller.updateMouthOpenness(0f)
                Log.i(TAG, "✅ 数字人嘴型测试完成")
            }
        }
    }

    fun setDuixAudioSink(sink: ((String) -> Unit)?) {
        duixAudioSink = sink
    }

    /**
     * 手动触发数字人说话（使用客户端TTS）
     * 用于在收到纯文本题目时驱动数字人朗读
     */
    fun speak(text: String) {
        if (text.isBlank()) return
        
        // 避免重复播放相同内容
        val textHash = text.hashCode().toString() + "_" + text.length
        if (playedTextHashes.contains(textHash) || currentPlayingTextHash == textHash) {
            Log.d(TAG, "文本已播放或正在播放，跳过: ${text.take(20)}...")
            return
        }

        Log.i(TAG, "手动触发说话: ${text.take(20)}...")
        
        // 停止录音，避免自问自答
        stopRecordingInternal()
        
        _isDigitalHumanSpeaking.value = true
        _latestDigitalHumanText.value = text
        currentPlayingTextHash = textHash
        
        // 添加到对话历史
        appendMessage(ConversationMessage(role = ConversationRole.DIGITAL_HUMAN, text = text))
        
        // 使用客户端TTS播放
        playClientSideTts(text, textHash)
    }

    /**
     * 启动VAD智能录音
     * 自动检测说话和静音，智能结束录音
     */
    fun startRecording() {
        Log.d(TAG, "startRecording被调用 - vadEnabled=$vadEnabled, isRecording=$isRecording, connectionState=${_connectionState.value}, sessionId=$currentSessionId")

        if (_interviewCompleted.value) {
            Log.w(TAG, "面试已结束，忽略录音请求")
            return
        }

        if (isRecording) {
            Log.w(TAG, "正在录音，忽略重复请求")
            return
        }
        if (_connectionState.value != ConnectionState.CONNECTED) {
            Log.e(TAG, "语音服务尚未连接，无法开始录音")
            _errors.tryEmit("语音服务尚未连接")
            return
        }
        val sessionId = currentSessionId
        if (sessionId.isNullOrBlank()) {
            Log.e(TAG, "会话未初始化，无法开始录音")
            _errors.tryEmit("会话未初始化")
            return
        }

        Log.i(TAG, "开始初始化录音 - sessionId=$sessionId, VAD=${if (vadEnabled) "启用" else "关闭"}")
        scope.launch {
            try {
                val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
                Log.d(TAG, "AudioRecord最小缓冲区大小: $minBuffer")
                
                val bufferSize = if (minBuffer == AudioRecord.ERROR || minBuffer == AudioRecord.ERROR_BAD_VALUE) {
                    Log.w(TAG, "获取最小缓冲区失败，使用默认值")
                    SAMPLE_RATE * 2
                } else {
                    minBuffer * 2
                }
                
                Log.d(TAG, "创建AudioRecord - sampleRate=$SAMPLE_RATE, bufferSize=$bufferSize")
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    CHANNEL_CONFIG,
                    AUDIO_FORMAT,
                    bufferSize
                )
                
                if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                    Log.e(TAG, "麦克风初始化失败，state=${recorder.state}")
                    _errors.tryEmit("麦克风初始化失败")
                    recorder.release()
                    return@launch
                }
                
                Log.i(TAG, "AudioRecord初始化成功，开始录音")
                
                // 重置VAD
                if (vadEnabled) {
                    vadDetector.reset()
                }
                
                recordedBuffer = ByteArrayOutputStream()
                audioRecord = recorder
                recorder.startRecording()
                isRecording = true
                _isRecordingFlow.value = true
                _partialTranscript.value = if (vadEnabled) "正在聆听，请开始说话..." else ""
                
                recordingJob = if (vadEnabled) {
                    launch { recordWithVad(recorder, sessionId) }
                } else {
                    launch { recordAndBufferAudio(recorder, sessionId) }
                }
                
                Log.i(TAG, "录音已启动")
            } catch (e: Exception) {
                Log.e(TAG, "启动录音失败", e)
                _errors.tryEmit(e.message ?: "启动录音失败")
                stopRecordingInternal()
            }
        }
    }
    
    /**
     * 设置VAD是否启用
     */
    fun setVadEnabled(enabled: Boolean) {
        vadEnabled = enabled
        Log.d(TAG, "VAD模式${if (enabled) "已启用" else "已关闭"}")
    }
    
    /**
     * 获取VAD是否启用
     */
    fun isVadEnabled(): Boolean = vadEnabled

    fun stopRecording() {
        Log.d(TAG, "stopRecording被调用 - isRecording=$isRecording")
        if (!isRecording) {
            Log.w(TAG, "当前未在录音，忽略停止请求")
            return
        }
        Log.i(TAG, "停止录音")
        isRecording = false
        try {
            audioRecord?.stop()
        } catch (e: Exception) {
            Log.e(TAG, "停止录音时出错", e)
        }
    }

    fun interrupt() {
        try {
            socket?.emit("interrupt")
        } catch (e: Exception) {
            Log.e(TAG, "发送打断请求失败", e)
        }
    }

    fun cleanup() {
        try {
            socket?.disconnect()
            socket = null
        } catch (_: Exception) {
        }
        recordingJob?.cancel()
        recordingJob = null
        stopRecordingInternal()
        releaseVisualizer()
        mediaPlayer?.release()
        mediaPlayer = null
        digitalHumanController = null
        
        // 清理防重复播放标记
        playedTextHashes.clear()
        currentPlayingTextHash = null
        _interviewCompleted.value = false

        scope.cancel()
    }

    /**
     * 带VAD的智能录音循环
     */
    private suspend fun recordWithVad(recorder: AudioRecord, sessionId: String) = withContext(Dispatchers.IO) {
        val buffer = ByteArray(2048)
        var totalBytes = 0
        var speechDetected = false
        var recordingStartTime = System.currentTimeMillis()
        
        Log.d(TAG, "开始VAD智能录音循环 - sessionId=$sessionId")
        _partialTranscript.value = "正在聆听，请开始说话..."
        
        try {
            while (isRecording) {
                val bytesRead = recorder.read(buffer, 0, buffer.size)
                
                if (bytesRead > 0) {
                    // VAD分析
                    val vadResult = vadDetector.analyze(buffer)
                    
                    // 根据VAD状态更新UI
                    when (vadResult.state) {
                        VoiceActivityDetector.State.IDLE -> {
                            _partialTranscript.value = "正在聆听，请开始说话..."
                        }
                        
                        VoiceActivityDetector.State.SPEECH_START -> {
                            if (!speechDetected) {
                                speechDetected = true
                                Log.i(TAG, "检测到说话，开始录音缓冲")
                            }
                            _partialTranscript.value = "检测到说话，正在录音... (${vadResult.db.toInt()}dB)"
                        }
                        
                        VoiceActivityDetector.State.SPEECH -> {
                            val durationSec = vadResult.speechDuration / 1000
                            _partialTranscript.value = "正在录音... ${durationSec}秒 (${vadResult.db.toInt()}dB)"
                            
                            // 缓冲音频数据
                            recordedBuffer?.write(buffer, 0, bytesRead)
                            totalBytes += bytesRead
                            
                            if (totalBytes % 32768 == 0) {
                                Log.d(TAG, "已录音: ${totalBytes / 1024}KB, 时长: ${durationSec}秒")
                            }
                        }
                        
                        VoiceActivityDetector.State.SPEECH_END -> {
                            Log.i(TAG, "检测到说话结束 - 时长: ${vadResult.speechDuration}ms, 数据: ${totalBytes}字节")
                            _partialTranscript.value = "说话结束，正在识别..."
                            isRecording = false
                            break
                        }
                    }
                    
                    // 超时保护
                    val elapsed = System.currentTimeMillis() - recordingStartTime
                    if (elapsed >= MAX_RECORDING_DURATION_MS) {
                        Log.w(TAG, "录音超时，强制结束 - 时长: ${elapsed}ms")
                        isRecording = false
                        break
                    }
                    
                } else if (bytesRead < 0) {
                    Log.e(TAG, "录音读取失败: bytesRead=$bytesRead")
                    _errors.tryEmit("录音读取失败: $bytesRead")
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "VAD录音过程中出现异常", e)
            _errors.tryEmit(e.message ?: "录音失败")
        } finally {
            Log.i(TAG, "VAD录音循环结束 - 总字节数: $totalBytes, 统计: ${vadDetector.getStatistics()}")
            
            try {
                recorder.stop()
            } catch (e: Exception) {
                Log.e(TAG, "停止recorder时出错", e)
            }
            recorder.release()
            audioRecord = null
            isRecording = false
            _isRecordingFlow.value = false
            
            // 只有检测到有效语音才处理
            if (speechDetected && totalBytes > 0) {
                processRecordedAudio(true, sessionId)
            } else {
                Log.w(TAG, "未检测到有效语音，取消处理")
                _partialTranscript.value = ""
                recordedBuffer?.reset()
                recordedBuffer = null
            }
        }
    }
    
    /**
     * 手动模式录音循环（不使用VAD）
     */
    private suspend fun recordAndBufferAudio(recorder: AudioRecord, sessionId: String) = withContext(Dispatchers.IO) {
        val buffer = ByteArray(2048)
        var totalBytes = 0
        Log.d(TAG, "开始手动模式录音循环 - sessionId=$sessionId")
        
        try {
            while (isRecording) {
                val bytesRead = recorder.read(buffer, 0, buffer.size)
                if (bytesRead > 0) {
                    recordedBuffer?.write(buffer, 0, bytesRead)
                    totalBytes += bytesRead
                    if (totalBytes % 32768 == 0) { // 每32KB打印一次日志
                        Log.d(TAG, "已录音: ${totalBytes / 1024}KB")
                    }
                } else if (bytesRead < 0) {
                    Log.e(TAG, "录音读取失败: bytesRead=$bytesRead")
                    _errors.tryEmit("录音读取失败: $bytesRead")
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "录音过程中出现异常", e)
            _errors.tryEmit(e.message ?: "录音失败")
        } finally {
            Log.i(TAG, "录音循环结束 - 总字节数: $totalBytes")
            try {
                recorder.stop()
            } catch (e: Exception) {
                Log.e(TAG, "停止recorder时出错", e)
            }
            recorder.release()
            audioRecord = null
            isRecording = false
            _isRecordingFlow.value = false
            processRecordedAudio(totalBytes > 0, sessionId)
        }
    }

    private suspend fun processRecordedAudio(hasAudio: Boolean, sessionId: String) {
        Log.d(TAG, "processRecordedAudio被调用 - hasAudio=$hasAudio, sessionId=$sessionId")
        
        val audioBytes = recordedBuffer?.toByteArray() ?: ByteArray(0)
        recordedBuffer?.reset()
        recordedBuffer = null
        
        Log.d(TAG, "音频数据大小: ${audioBytes.size} bytes (${audioBytes.size / 1024}KB)")
        
        if (!hasAudio || audioBytes.isEmpty()) {
            Log.w(TAG, "未检测到有效音频")
            _errors.tryEmit("未检测到有效音频")
            return
        }
        
        _partialTranscript.value = "正在识别..."
        _isProcessing.value = true
        
        try {
            Log.i(TAG, "开始调用阿里云ASR - 音频大小: ${audioBytes.size} bytes")
            val text = aliyunSpeechService.recognizePcm(audioBytes).trim()
            Log.i(TAG, "ASR识别结果: $text")
            
            if (text.isEmpty()) {
                Log.w(TAG, "ASR未识别到语音内容")
                _partialTranscript.value = ""
                _isProcessing.value = false
                _errors.tryEmit("未识别到语音内容")
                return
            }
            
            _partialTranscript.value = text
            Log.i(TAG, "准备提交用户文本: $text")
            submitUserText(text)
        } catch (e: Exception) {
            Log.e(TAG, "阿里云ASR失败", e)
            _partialTranscript.value = ""
            _isProcessing.value = false
            _errors.tryEmit(e.message ?: "语音识别失败")
        }
    }

    private fun handleVoiceResponse(data: JSONObject) {
        Log.d(TAG, "handleVoiceResponse被调用 - data=$data")
        
        try {
            val audioUrl = data.optString("audioUrl", null)
            val text = data.optString("text", "")
            val ttsMode = data.optString("ttsMode", if (audioUrl.isNullOrBlank()) "client" else "server")
            val userText = data.optString("userText", "")
            val willSpeak = text.isNotBlank() || !audioUrl.isNullOrBlank()
            val isCompletedFlag = data.optBoolean("isCompleted", false) ||
                data.optString("status").equals("completed", ignoreCase = true) ||
                data.optString("event").equals("completed", ignoreCase = true)

            Log.i(TAG, "收到语音响应 - text=$text, ttsMode=$ttsMode, audioUrl=$audioUrl")

            // 生成文本的唯一标识（使用文本内容的hash）
            val textHash = if (text.isNotBlank()) {
                text.hashCode().toString() + "_" + text.length
            } else if (!audioUrl.isNullOrBlank()) {
                audioUrl.hashCode().toString()
            } else {
                null
            }
            
            // 防重复检查：如果正在播放相同的文本，跳过
            if (textHash != null) {
                if (currentPlayingTextHash == textHash) {
                    Log.w(TAG, "⚠️ 检测到重复的语音响应（正在播放中），跳过 - textHash=$textHash")
                    return
                }
                
                if (playedTextHashes.contains(textHash)) {
                    Log.w(TAG, "⚠️ 检测到重复的语音响应（已播放过），跳过 - textHash=$textHash")
                    return
                }
                
                // 标记为正在播放
                currentPlayingTextHash = textHash
            }

            if (willSpeak) {
                // 确保数字人说话期间麦克风关闭，避免自问自答
                stopRecordingInternal()
                _isDigitalHumanSpeaking.value = true
            }

            _partialTranscript.value = ""
            _isProcessing.value = false

            if (userText.isNotBlank()) {
                appendMessage(ConversationMessage(role = ConversationRole.USER, text = userText))
            }
            appendMessage(ConversationMessage(role = ConversationRole.DIGITAL_HUMAN, text = text))
            _latestDigitalHumanText.value = text

            val completionHint = isCompletedFlag || completionKeywords.any { keyword ->
                text.contains(keyword, ignoreCase = true)
            }
            if (completionHint) {
                markInterviewCompleted("voice-response")
            }

            if (ttsMode.equals("client", ignoreCase = true)) {
                Log.i(TAG, "使用客户端TTS播放 - textHash=$textHash")
                playClientSideTts(text, textHash)
            } else if (!audioUrl.isNullOrBlank()) {
                Log.i(TAG, "使用服务器端TTS音频 - url=$audioUrl, textHash=$textHash")
                playAudioFromPath(audioUrl, textHash, text)
            } else {
                Log.w(TAG, "未提供可播放的音频数据")
                // 如果没有音频数据，清除播放标记
                _isDigitalHumanSpeaking.value = false
                currentPlayingTextHash = null
                tryAutoStartRecordingIfIdle()
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理语音响应失败", e)
            _errors.tryEmit(e.message ?: "处理语音响应失败")
            // 出错时清除播放标记
            _isDigitalHumanSpeaking.value = false
            currentPlayingTextHash = null
            tryAutoStartRecordingIfIdle()
        }
    }

    private fun handleStatus(data: JSONObject) {
        val processing = data.optBoolean("isProcessing", false)
        val speaking = data.optBoolean("isDigitalHumanSpeaking", false)
        val completed = data.optBoolean("isCompleted", false) ||
            data.optString("status").equals("completed", ignoreCase = true)
        _isProcessing.value = processing
        _isDigitalHumanSpeaking.value = speaking
        if (completed) {
            markInterviewCompleted("status-event")
        }
    }

    private fun handleError(payload: Any?) {
        val message = when (payload) {
            is JSONObject -> payload.optString("message")
            is String -> payload
            else -> payload?.toString()
        } ?: "未知错误"
        _errors.tryEmit(message)
    }

    private fun markInterviewCompleted(reason: String? = null) {
        if (_interviewCompleted.value) return
        Log.i(TAG, "标记面试已完成${reason?.let { "：$it" } ?: ""}")
        _interviewCompleted.value = true
        stopRecordingInternal()
        val farewell = "您太棒了，感谢完成这次愉快的面聊，我们会尽快完成后续的评测工作，报告会在“我的”“简历报告”里展示，请稍晚些查看该报告。"
        appendMessage(
            ConversationMessage(
                role = ConversationRole.DIGITAL_HUMAN,
                text = farewell
            )
        )
        _latestDigitalHumanText.value = farewell
        playClientSideTts(farewell, farewell.hashCode().toString())
    }

    private fun playClientSideTts(text: String, textHash: String?) {
        Log.d(TAG, "playClientSideTts被调用 - text=$text, textHash=$textHash")
        
        if (text.isBlank()) {
            Log.w(TAG, "TTS文本为空，取消播放")
            currentPlayingTextHash = null
            return
        }
        
        scope.launch {
            try {
                Log.i(TAG, "开始调用阿里云TTS - textLen=${text.length}, textHash=$textHash")
                val audioFile = aliyunSpeechService.synthesizeSpeech(text)
                Log.i(TAG, "TTS成功，开始播放 - file=${audioFile.absolutePath}, textHash=$textHash")
                playAudioFromPath(audioFile.absolutePath, textHash, text)
            } catch (e: Exception) {
                Log.e(TAG, "客户端TTS失败", e)
                _errors.tryEmit(e.message ?: "语音播放失败")
                // TTS失败时清除播放标记
                _isDigitalHumanSpeaking.value = false
                currentPlayingTextHash = null
                tryAutoStartRecordingIfIdle()
            }
        }
    }

    private fun playAudioFromPath(path: String, textHash: String?, digitalHumanText: String?) {
        scope.launch {
            playPreparedAudio(path, textHash, digitalHumanText)
        }
    }
    
    private fun playAudioFromUrl(url: String, textHash: String?, digitalHumanText: String?) {
        scope.launch {
            val downloaded = downloadAudioToCache(url)
            if (downloaded != null) {
                playPreparedAudio(downloaded.absolutePath, textHash, digitalHumanText)
            } else {
                Log.e(TAG, "下载远程音频失败，无法播放 - url=$url")
                _isDigitalHumanSpeaking.value = false
                currentPlayingTextHash = null
                tryAutoStartRecordingIfIdle()
            }
        }
    }

    private var activeAudioHash: String? = null // 记录MediaPlayer当前实际正在播放的文本Hash

    private suspend fun playPreparedAudio(path: String, textHash: String?, digitalHumanText: String?) {
        val preparedPath = preparePlayableAudio(path)
        if (preparedPath == null) {
            Log.e(TAG, "音频预处理失败，无法播放 - path=$path")
            _isDigitalHumanSpeaking.value = false
            currentPlayingTextHash = null
            tryAutoStartRecordingIfIdle()
            return
        }

        Log.d(TAG, "playPreparedAudio - preparedPath=$preparedPath, textHash=$textHash")

        // 将可播放路径同步给数字人
        duixAudioSink?.invoke(preparedPath)

        try {
            // 如果正在播放相同的文本，且MediaPlayer确实在播放中，才跳过
            // 使用 activeAudioHash 而不是 currentPlayingTextHash，因为 currentPlayingTextHash 可能已经被 speak() 更新为新值
            if (textHash != null && activeAudioHash == textHash && mediaPlayer?.isPlaying == true) {
                Log.w(TAG, "⚠️ 检测到重复播放请求（正在播放中），跳过 - textHash=$textHash, path=$preparedPath")
                return
            }
            
            mediaPlayer?.release()
            releaseVisualizer() // 先释放旧的Visualizer
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(preparedPath)
                
                setOnPreparedListener {
                    val sessionId = audioSessionId
                    Log.i(TAG, "MediaPlayer准备完成 - audioSessionId=$sessionId, textHash=$textHash")
                    
                    if (sessionId == 0) {
                        Log.e(TAG, "警告：audioSessionId为0，无法初始化Visualizer")
                    }
                    
                    start()
                    Log.i(TAG, "MediaPlayer开始播放 - textHash=$textHash")
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = true
                    this@RealtimeVoiceManager.activeAudioHash = textHash // 标记当前正在播放的Hash
                    digitalHumanController?.onTtsPlayback(preparedPath, digitalHumanText)
                    
                    // 延迟一小段时间确保播放真正开始后再初始化Visualizer
                    scope.launch {
                        delay(100) // 等待100ms确保播放已开始
                        val finalSessionId = audioSessionId
                        Log.d(TAG, "延迟后的audioSessionId=$finalSessionId")
                        if (finalSessionId != 0) {
                            setupAudioVisualizer()
                        } else {
                            Log.e(TAG, "无法初始化Visualizer：audioSessionId仍为0")
                        }
                    }
                }
                
                setOnCompletionListener {
                    Log.i(TAG, "MediaPlayer播放完成 - textHash=$textHash")
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = false
                    this@RealtimeVoiceManager.activeAudioHash = null // 清除播放标记
                    releaseVisualizer()
                    // 重置数字人嘴型
                    digitalHumanController?.updateMouthOpenness(0f)
                    
                    // 标记为已播放
                    if (textHash != null) {
                        playedTextHashes.add(textHash)
                        currentPlayingTextHash = null
                        Log.d(TAG, "文本播放完成，已标记为已播放 - textHash=$textHash, 已播放总数=${playedTextHashes.size}")
                    }
                    
                    // VAD模式下自动重新开始录音，实现实时互动
                    if (!_interviewCompleted.value && vadEnabled && _connectionState.value == ConnectionState.CONNECTED) {
                        scope.launch {
                            delay(500) // 短暂延迟，避免立即开始录音
                            Log.i(TAG, "TTS播放完成，VAD模式自动重新开始录音")
                            startRecording()
                        }
                    } else {
                        tryAutoStartRecordingIfIdle()
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "MediaPlayer错误 - what=$what, extra=$extra, textHash=$textHash")
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = false
                    this@RealtimeVoiceManager.activeAudioHash = null // 清除播放标记
                    releaseVisualizer()
                    // 出错时清除播放标记
                    currentPlayingTextHash = null
                    tryAutoStartRecordingIfIdle()
                    true
                }
                
                prepareAsync()
            }
        } catch (e: Exception) {
            Log.e(TAG, "播放音频失败", e)
            _errors.tryEmit(e.message ?: "播放音频失败")
            _isDigitalHumanSpeaking.value = false
            tryAutoStartRecordingIfIdle()
        }
    }

    private fun tryAutoStartRecordingIfIdle() {
        if (_interviewCompleted.value) return
        if (!vadEnabled) return
        if (_connectionState.value != ConnectionState.CONNECTED) return
        if (_isRecordingFlow.value) return
        if (_isProcessing.value) return
        if (_isDigitalHumanSpeaking.value) return

        Log.i(TAG, "尝试在空闲状态下自动重启录音")
        startRecording()
    }

    private fun setupAudioVisualizer(retryAttempts: Int = VISUALIZER_MAX_RETRY) {
        try {
            // 先释放旧的Visualizer
            releaseVisualizer()
            
            val player = mediaPlayer
            if (player == null) {
                Log.e(TAG, "MediaPlayer为null，无法初始化Visualizer")
                return
            }
            
            // 确保MediaPlayer正在播放
            if (!player.isPlaying) {
                Log.w(TAG, "MediaPlayer未在播放，延迟初始化Visualizer（剩余重试=$retryAttempts）")
                scheduleVisualizerRetry("MediaPlayer未在播放", retryAttempts)
                return
            }
            
            val audioSessionId = player.audioSessionId
            if (audioSessionId == 0) {
                Log.w(TAG, "无效的audioSessionId: $audioSessionId，MediaPlayer可能未正确初始化（剩余重试=$retryAttempts）")
                scheduleVisualizerRetry("audioSessionId为0", retryAttempts)
                return
            }
            
            Log.d(TAG, "开始设置音频可视化 - audioSessionId=$audioSessionId, isPlaying=${player.isPlaying}")
            
            // 创建Visualizer实例
            val newVisualizer = Visualizer(audioSessionId)
            Log.d(TAG, "Visualizer实例已创建")
            
            // 配置captureSize
            val captureSizeRange = Visualizer.getCaptureSizeRange()
            val targetSize = captureSizeRange[0].coerceAtLeast(256) // 至少256字节
            newVisualizer.captureSize = targetSize
            val setSizeResult = newVisualizer.captureSize
            Log.d(TAG, "Visualizer配置 - captureSize=$targetSize (设置结果=$setSizeResult), range=${captureSizeRange[0]}-${captureSizeRange[1]}")
            
            // 设置数据捕获监听器
            val captureRate = Visualizer.getMaxCaptureRate()
            Log.d(TAG, "设置数据捕获监听器 - captureRate=$captureRate")
            
            newVisualizer.setDataCaptureListener(
                object : Visualizer.OnDataCaptureListener {
                    override fun onWaveFormDataCapture(
                        visualizer: Visualizer?,
                        waveform: ByteArray?,
                        samplingRate: Int
                    ) {
                        if (waveform != null && waveform.isNotEmpty()) {
                            updateDigitalHumanMouth(waveform)
                        }
                    }

                    override fun onFftDataCapture(
                        visualizer: Visualizer?,
                        fft: ByteArray?,
                        samplingRate: Int
                    ) {
                        // 可用于频谱分析
                    }
                },
                captureRate,  // 使用最快更新率
                true,   // 捕获波形数据
                false   // 不捕获FFT数据（暂不需要）
            )
            Log.d(TAG, "数据捕获监听器已设置")
            
            // 启用Visualizer
            newVisualizer.enabled = true
            val enableResult = newVisualizer.enabled
            Log.d(TAG, "尝试启用Visualizer - enabled设置结果=$enableResult")
            
            // 验证启用状态
            val isEnabled = newVisualizer.enabled
            Log.d(TAG, "Visualizer启用状态检查 - enabled=$isEnabled, captureSize=${newVisualizer.captureSize}")
            
            if (isEnabled) {
                visualizer = newVisualizer
                Log.i(TAG, "✅ Visualizer已成功启动并启用 - captureRate=$captureRate, captureSize=${newVisualizer.captureSize}")
                Log.i(TAG, "✅ Visualizer验证通过，数字人嘴型驱动已就绪，等待波形数据...")
                
                // 延迟一小段时间后测试是否收到数据
                scope.launch {
                    delay(500)
                    if (visualizer?.enabled == true) {
                        Log.i(TAG, "✅ Visualizer运行正常，应该开始接收波形数据")
                    } else {
                        Log.e(TAG, "❌ Visualizer在500ms后被禁用，可能有问题")
                    }
                }
            } else {
                Log.e(TAG, "❌ Visualizer启用失败 - enabled仍为false")
                try {
                    newVisualizer.release()
                } catch (e: Exception) {
                    Log.e(TAG, "释放Visualizer失败", e)
                }
                visualizer = null
            }
            
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ 设置音频可视化失败：缺少MODIFY_AUDIO_SETTINGS权限", e)
            _errors.tryEmit("音频可视化需要MODIFY_AUDIO_SETTINGS权限")
        } catch (e: IllegalStateException) {
            Log.e(TAG, "❌ 设置音频可视化失败：MediaPlayer状态异常", e)
            _errors.tryEmit("音频可视化初始化失败（状态异常）")
        } catch (e: RuntimeException) {
            Log.e(TAG, "❌ 设置音频可视化失败：运行时错误", e)
            _errors.tryEmit("音频可视化初始化失败")
        } catch (e: Exception) {
            Log.e(TAG, "❌ 设置音频可视化失败：未知错误", e)
            _errors.tryEmit("音频可视化初始化失败")
        }
    }

    private var lastMouthUpdate = 0L
    private var mouthUpdateCount = 0
    
    private fun updateDigitalHumanMouth(waveform: ByteArray) {
        if (waveform.isEmpty()) {
            if (mouthUpdateCount == 0) {
                Log.w(TAG, "收到空的波形数据")
            }
            return
        }
        
        try {
            // Visualizer波形数据是8位无符号（0-255），中心点在128
            var sum = 0f
            for (i in waveform.indices) {
                val sample = (waveform[i].toInt() and 0xFF) - 128  // 转换为-128到127
                val normalized = sample / 128f
                sum += normalized * normalized
            }
            
            val rms = sqrt(sum / waveform.size)
            // 使用更合理的映射：将RMS值映射到0-1范围，并添加平滑处理
            // RMS通常在0-0.3之间，我们将其映射到0-0.8的嘴型范围
            val mouthOpenness = (rms * 3f).coerceIn(0f, 0.8f)  // 调整放大倍数，避免过度开口
            
            // 更新数字人嘴型
            val controller = digitalHumanController
            if (controller != null) {
                controller.updateMouthOpenness(mouthOpenness)
                
                mouthUpdateCount++
                val now = System.currentTimeMillis()
                // 第一次更新时打印详细信息
                if (mouthUpdateCount == 1) {
                    Log.i(TAG, "🎉 数字人嘴型首次更新 - rms=$rms, mouthOpenness=$mouthOpenness, waveformSize=${waveform.size}")
                    lastMouthUpdate = now
                } else if (now - lastMouthUpdate > 1000) {
                    // 之后每秒打印一次
                    Log.d(TAG, "数字人嘴型更新 #$mouthUpdateCount - rms=$rms, mouthOpenness=$mouthOpenness, waveformSize=${waveform.size}")
                    lastMouthUpdate = now
                }
            } else {
                if (mouthUpdateCount == 0) {
                    Log.w(TAG, "⚠️ DigitalHumanController未设置，无法驱动嘴型（但Visualizer正在工作）")
                    mouthUpdateCount++  // 只警告一次
                } else if (mouthUpdateCount % 100 == 0) {
                    // 每100次更新提醒一次
                    Log.w(TAG, "⚠️ DigitalHumanController仍未设置，已更新${mouthUpdateCount}次但无法驱动嘴型")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ 更新数字人嘴型失败", e)
        }
    }

    private fun appendMessage(message: ConversationMessage) {
        _conversation.update { previous -> previous + message }
    }

    private fun releaseVisualizer() {
        try {
            visualizer?.release()
        } catch (_: Exception) {
        }
        visualizer = null
    }

    private fun scheduleVisualizerRetry(reason: String, remainingAttempts: Int) {
        if (remainingAttempts <= 0) {
            Log.e(TAG, "Visualizer初始化失败，放弃：$reason")
            return
        }
        scope.launch {
            delay(VISUALIZER_RETRY_DELAY_MS)
            Log.d(TAG, "重新尝试初始化Visualizer（剩余${remainingAttempts - 1}次） - 原因：$reason")
            setupAudioVisualizer(remainingAttempts - 1)
        }
    }

    private fun stopRecordingInternal() {
        try {
            audioRecord?.stop()
        } catch (_: Exception) {
        }
        try {
            audioRecord?.release()
        } catch (_: Exception) {
        }
        audioRecord = null
        isRecording = false
        _isRecordingFlow.value = false
    }

    private fun joinSession(sessionId: String, userId: String?, jobPosition: String?, background: String?) {
        val payload = JSONObject().apply {
            put("sessionId", sessionId)
            userId?.let { put("userId", it) }
            jobPosition?.let { put("jobPosition", it) }
            background?.let { put("background", it) }
        }
        socket?.emit("join_session", payload)
    }

    fun submitUserText(text: String) {
        Log.d(TAG, "submitUserText被调用 - text=$text")
        
        val normalized = text.trim()
        if (normalized.isEmpty()) {
            Log.w(TAG, "文本为空，取消提交")
            _isProcessing.value = false
            return
        }
        
        val sessionId = currentSessionId
        if (sessionId.isNullOrBlank()) {
            Log.e(TAG, "会话未初始化，无法提交文本")
            _errors.tryEmit("会话未初始化，无法提交文本")
            _isProcessing.value = false
            return
        }
        
        if (socket == null || !socket!!.connected()) {
            Log.e(TAG, "WebSocket未连接，无法提交文本")
            _errors.tryEmit("WebSocket未连接")
            _isProcessing.value = false
            return
        }
        
        appendMessage(ConversationMessage(role = ConversationRole.USER, text = normalized))
        
        val payload = JSONObject().apply {
            put("text", normalized)
            put("sessionId", sessionId)
            currentUserId?.let { put("userId", it) }
            currentJobPosition?.let { put("jobPosition", it) }
            currentBackground?.let { put("background", it) }
        }
        
        Log.i(TAG, "通过WebSocket发送text_message - sessionId=$sessionId, text=$normalized")
        socket?.emit("text_message", payload)
        _isProcessing.value = true
    }
}
