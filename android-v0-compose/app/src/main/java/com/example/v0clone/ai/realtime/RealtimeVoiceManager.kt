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
import android.media.AudioTrack
import android.media.AudioAttributes
import com.xlwl.AiMian.ai.realtime.VolcanoTtsService
import com.xlwl.AiMian.ai.realtime.Qwen3AsrWsClient
import com.xlwl.AiMian.ai.realtime.Qwen3TtsWsClient
import com.xlwl.AiMian.config.AppConfig
import com.xlwl.AiMian.digitalhuman.DigitalHumanController
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
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
            Log.i(TAG, "写入WAV头: sampleRate=$sampleRate, channels=$channelCount, pcmBytes=$totalPcmBytes")
            if (sampleRate != 16000) {
                Log.w(TAG, "⚠️ 调试：当前采样率为 $sampleRate 而非 16000，DUiX 可能会播放异常（建议后端强制输出 16k）")
            }
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
    private val volcanoTtsService = VolcanoTtsService(context.applicationContext)

    // Qwen3 ASR/TTS 微服务客户端（WebSocket 长连接）
    private val qwen3Asr = Qwen3AsrWsClient()
    private val qwen3Tts = Qwen3TtsWsClient(cacheDir = context.cacheDir)
    private var useQwen3Asr = false  // 是否启用 Qwen3 ASR（由服务端配置决定）
    private var useQwen3Tts = false  // 是否启用 Qwen3 TTS
    
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
    private var audioTrack: AudioTrack? = null
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

    // 标记是否有正在等待 TTS 播放的响应，防止 isSpeaking 收集器过早将 _isDigitalHumanSpeaking 置为 false
    @Volatile
    private var awaitingTtsPlayback = false

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

    private val _currentQuestionIndex = MutableStateFlow<Int?>(null)
    val currentQuestionIndex: StateFlow<Int?> = _currentQuestionIndex.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    /** TTS 朗读进度 0~1，用于两行字幕滚动（Qwen3 流式 + MediaPlayer） */
    private val _ttsPlaybackProgress = MutableStateFlow(0f)
    val ttsPlaybackProgress: StateFlow<Float> = _ttsPlaybackProgress.asStateFlow()

    private var mediaProgressJob: Job? = null

    private val completionKeywords = listOf(
        "面试结束",
        "结束面试",
        "结束这次面试",
        "结束这个面试",
        "完成面试",
        "完成了面试",
        "帮我结束面试",
        "我答完了",
        "本次面试到此结束",
        "interview finished",
        "interview is over",
        "session completed"
    )

    // 可选的数字人音频分发（用于DUIX推送PCM/WAV）
    private var duixAudioSink: ((String) -> Unit)? = null
    private var preferExternalAudio = false

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
                showToast("AI面试官已上线")
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
                showToast("连接服务器失败，请检查网络")
                args.getOrNull(0)?.toString()?.let { _errors.tryEmit(it) }
            }
            newSocket.on("text_chunk") { args ->
                safeHandleEvent("text_chunk", args) { handleTextChunk(it) }
            }
            newSocket.on("asr_partial") { args ->
                safeHandleEvent("asr_partial", args) { handleAsrPartial(it) }
            }
            newSocket.on("voice_response") { args ->
                safeHandleEvent("voice_response", args) { handleVoiceResponse(it) }
            }
            newSocket.on("status") { args ->
                safeHandleEvent("status", args) { handleStatus(it) }
            }
            newSocket.on("audio_chunk") { args ->
                safeHandleEvent("audio_chunk", args) { handleAudioChunk(it) }
            }
            newSocket.on("error") { args ->
                handleError(args.getOrNull(0))
            }

            Log.d(TAG, "尝试连接实时语音服务: $serverUrl (session=$sessionId)")
            newSocket.connect()
            socket = newSocket

            // 异步连接 Qwen3 ASR/TTS 微服务
            initQwen3Services(sessionId)

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

    /**
     * 初始化 Qwen3 ASR/TTS 微服务连接
     * 先做健康检查，可用则建立 WebSocket 长连接
     */
    private fun initQwen3Services(sessionId: String) {
        scope.launch {
            // 检查 TTS 微服务是否可用
            try {
                val ttsHealthUrl = "${AppConfig.ttsServiceHttpUrl}/health"
                val request = Request.Builder().url(ttsHealthUrl).build()
                val response = downloadClient.newCall(request).execute()
                if (response.isSuccessful) {
                    Log.i(TAG, "Qwen3 TTS 微服务可用，建立 WebSocket 连接")
                    useQwen3Tts = true

                    // 将 DUIX 音频回调桥接给 Qwen3 TTS
                    qwen3Tts.duixAudioSink = duixAudioSink

                    qwen3Tts.connect(AppConfig.ttsServiceWsUrl, sessionId)

                    launch {
                        qwen3Tts.playbackProgress.collect { p ->
                            _ttsPlaybackProgress.value = p
                        }
                    }

                    // 监听 TTS 说话状态 → 驱动数字人嘴型
                    launch {
                        qwen3Tts.mouthRms.collect { rms ->
                            digitalHumanController?.updateMouthOpenness(rms)
                        }
                    }
                    // 监听 TTS 说话状态 → 控制录音
                    launch {
                        qwen3Tts.isSpeaking.collect { speaking ->
                            if (speaking) {
                                // TTS 开始播放 → 标记数字人正在说话，清除等待标志
                                awaitingTtsPlayback = false
                                _isDigitalHumanSpeaking.value = true
                            } else {
                                // TTS 停止播放：只有在没有等待中的 TTS 时才标记说话结束
                                // 避免初始 false 值或 TTS 还没开始时就覆盖 handleVoiceResponse 设置的 true
                                if (awaitingTtsPlayback) {
                                    Log.d(TAG, "TTS isSpeaking=false 但仍在等待 TTS 播放开始，跳过状态重置")
                                    return@collect
                                }
                                _isDigitalHumanSpeaking.value = false
                                if (!_interviewCompleted.value && vadEnabled) {
                                    kotlinx.coroutines.delay(300)
                                    if (!_isDigitalHumanSpeaking.value && !awaitingTtsPlayback) {
                                        Log.i(TAG, "Qwen3 TTS 播放完成，自动开始录音")
                                        startRecording()
                                    }
                                }
                            }
                        }
                    }
                    launch {
                        qwen3Tts.responseDone.collect { responseId ->
                            Log.i(TAG, "Qwen3 TTS 合成完成: responseId=$responseId")
                        }
                    }
                } else {
                    Log.w(TAG, "Qwen3 TTS 微服务不可用 (code=${response.code})，使用火山引擎 TTS")
                }
                response.close()
            } catch (e: Exception) {
                Log.w(TAG, "Qwen3 TTS 健康检查失败: ${e.message}，使用火山引擎 TTS")
            }

            // 检查 ASR 微服务是否可用
            try {
                val asrHealthUrl = "${AppConfig.asrServiceHttpUrl}/health"
                val request = Request.Builder().url(asrHealthUrl).build()
                val response = downloadClient.newCall(request).execute()
                if (response.isSuccessful) {
                    Log.i(TAG, "Qwen3 ASR 微服务可用，建立 WebSocket 连接")
                    useQwen3Asr = true
                    qwen3Asr.connect(AppConfig.asrServiceWsUrl, sessionId)

                    // 监听完整识别结果 → 自动提交
                    launch {
                        qwen3Asr.transcriptionCompleted.collect { result ->
                            Log.i(TAG, "Qwen3 ASR 识别完成: ${result.text}")
                            if (result.text.isNotBlank()) {
                                withContext(Dispatchers.Main) {
                                    _partialTranscript.value = result.text
                                }
                                submitUserText(result.text)
                            }
                        }
                    }
                    // 监听部分识别 → 更新字幕
                    launch {
                        qwen3Asr.partialResult.collect { partial ->
                            if (partial.isNotEmpty()) {
                                _partialTranscript.value = partial
                            }
                        }
                    }
                } else {
                    Log.w(TAG, "Qwen3 ASR 微服务不可用 (code=${response.code})，使用阿里云 ASR")
                }
                response.close()
            } catch (e: Exception) {
                Log.w(TAG, "Qwen3 ASR 健康检查失败: ${e.message}，使用阿里云 ASR")
            }

            Log.i(TAG, "Qwen3 服务初始化完成 - ASR=${if (useQwen3Asr) "Qwen3" else "Aliyun"}, TTS=${if (useQwen3Tts) "Qwen3" else "Volcano"}")
        }
    }

    fun setDigitalHumanController(controller: DigitalHumanController?) {
        digitalHumanController = controller
        val preferStream = controller != null
        qwen3Tts.preferStreamPcmForDuix = preferStream
        if (controller != null) {
            qwen3Tts.onDuixPcmStreamStart = {
                runCatching { controller.startPush() }
                    .onFailure { e -> Log.e(TAG, "DUIX startPush: ${e.message}") }
            }
            qwen3Tts.onDuixPcmChunk = { pcm ->
                runCatching { controller.pushPcm(pcm) }
                    .onFailure { e -> Log.e(TAG, "DUIX pushPcm: ${e.message}") }
            }
            qwen3Tts.onDuixPcmStreamEnd = {
                runCatching { controller.stopPush() }
                    .onFailure { e -> Log.e(TAG, "DUIX stopPush: ${e.message}") }
            }
        } else {
            qwen3Tts.onDuixPcmStreamStart = null
            qwen3Tts.onDuixPcmChunk = null
            qwen3Tts.onDuixPcmStreamEnd = null
        }
        Log.i(TAG, "DigitalHumanController已设置: ${if (controller != null) "成功（流式PCM→DUIX）" else "null"}")
        controller?.resetMouth()
    }

    fun setDuixAudioSink(sink: ((String) -> Unit)?) {
        duixAudioSink = sink
        preferExternalAudio = sink != null
        // 同步给 Qwen3 TTS 客户端
        qwen3Tts.duixAudioSink = sink
        Log.i(
            TAG,
            if (sink != null) {
                "DUIX音频接收器已安装，优先使用数字人通道播放语音并静音本地播放器以避免重复播放"
            } else {
                "DUIX音频接收器已移除，恢复本地播放器输出"
            }
        )
    }

    /**
     * 手动触发数字人说话（使用客户端TTS）
     * 用于在收到纯文本题目时驱动数字人朗读
     */
    fun speak(text: String) {
        if (text.isBlank()) return
        
        val textHash = text.hashCode().toString() + "_" + text.length
        if (playedTextHashes.contains(textHash) || currentPlayingTextHash == textHash) {
            Log.d(TAG, "文本已播放或正在播放，跳过: ${text.take(20)}...")
            return
        }

        Log.i(TAG, "手动触发说话: ${text.take(20)}...")
        
        stopRecordingInternal()
        
        _isDigitalHumanSpeaking.value = true
        awaitingTtsPlayback = true
        _latestDigitalHumanText.value = text
        currentPlayingTextHash = textHash
        
        appendMessage(ConversationMessage(role = ConversationRole.DIGITAL_HUMAN, text = text))
        
        if (useQwen3Tts) {
            qwen3Tts.speak(text)
            playedTextHashes.add(textHash)
            currentPlayingTextHash = null
        } else {
            playClientSideTts(text, textHash)
        }
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
                // 不再清除 AI 字幕，让面试官最后一句话保持显示，
                // 直到下一次 voice_response 到来时自然更新
                
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
            // 清空 Qwen3 TTS 缓冲区并停止播放
            if (useQwen3Tts) {
                qwen3Tts.clearAndStop()
            }
            socket?.emit("interrupt")
        } catch (e: Exception) {
            Log.e(TAG, "发送打断请求失败", e)
        }
    }

    fun handleNetworkInterrupted() {
        Log.w(TAG, "检测到网络中断，暂停当前面试链路")
        try {
            qwen3Asr.disconnect()
            qwen3Tts.disconnect()
            socket?.off()
            socket?.disconnect()
            socket = null
        } catch (_: Exception) {
        }
        recordingJob?.cancel()
        recordingJob = null
        stopRecordingInternal()
        releaseVisualizer()
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {
        }
        mediaPlayer?.release()
        mediaPlayer = null
        _connectionState.value = ConnectionState.DISCONNECTED
        _isProcessing.value = false
        _partialTranscript.value = ""
        awaitingTtsPlayback = false
        mediaProgressJob?.cancel()
        mediaProgressJob = null
        _ttsPlaybackProgress.value = 0f
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
        mediaProgressJob?.cancel()
        mediaProgressJob = null
        mediaPlayer?.release()
        mediaPlayer = null
        digitalHumanController = null
        qwen3Tts.onDuixPcmStreamStart = null
        qwen3Tts.onDuixPcmChunk = null
        qwen3Tts.onDuixPcmStreamEnd = null
        qwen3Tts.preferStreamPcmForDuix = false
        
        playedTextHashes.clear()
        currentPlayingTextHash = null
        awaitingTtsPlayback = false
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
                    // Qwen3 ASR 模式：实时推流，服务端 VAD + 识别
                    if (useQwen3Asr) {
                        qwen3Asr.sendAudio(buffer, 0, bytesRead)
                        totalBytes += bytesRead
                        if (!speechDetected) {
                            speechDetected = true
                        }
                        // Qwen3 ASR 使用服务端 VAD，客户端不需要本地 VAD 断句
                        // 但仍保留超时保护
                    } else {
                        // 原有本地 VAD + 阿里云 ASR 模式
                    }

                    // VAD分析（本地 VAD 模式下有效）
                    val vadResult = vadDetector.analyze(buffer)

                    when (vadResult.state) {
                        VoiceActivityDetector.State.IDLE -> {
                            if (!useQwen3Asr) {
                                _partialTranscript.value = "正在聆听，请开始说话..."
                            }
                        }

                        VoiceActivityDetector.State.SPEECH_START -> {
                            if (!speechDetected) {
                                speechDetected = true
                                Log.i(TAG, "检测到说话，开始录音缓冲")
                            }
                            if (!useQwen3Asr) {
                                _partialTranscript.value = "检测到说话，正在录音... (${vadResult.db.toInt()}dB)"
                            }
                        }

                        VoiceActivityDetector.State.SPEECH -> {
                            val durationSec = vadResult.speechDuration / 1000
                            if (!useQwen3Asr) {
                                _partialTranscript.value = "正在录音... ${durationSec}秒 (${vadResult.db.toInt()}dB)"
                                recordedBuffer?.write(buffer, 0, bytesRead)
                                totalBytes += bytesRead
                            }

                            if (totalBytes % 32768 == 0) {
                                Log.d(TAG, "已录音: ${totalBytes / 1024}KB, 时长: ${durationSec}秒")
                            }
                        }

                        VoiceActivityDetector.State.SPEECH_END -> {
                            if (!useQwen3Asr) {
                                Log.i(TAG, "检测到说话结束 - 时长: ${vadResult.speechDuration}ms, 数据: ${totalBytes}字节")
                                _partialTranscript.value = "说话结束，正在识别..."
                                isRecording = false
                                break
                            }
                            // Qwen3 ASR 模式下不主动断录，让服务端 VAD 控制
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
            
            // Qwen3 ASR 模式下无需本地处理（服务端自动识别并通过 WebSocket 返回结果）
            if (useQwen3Asr) {
                Log.i(TAG, "Qwen3 ASR 录音结束 - 等待服务端返回识别结果")
            } else if (speechDetected && totalBytes > 0) {
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
            val questionIndex = data.optInt("questionIndex", -1)
            val willSpeak = text.isNotBlank() || !audioUrl.isNullOrBlank()
            val isCompletedFlag = data.optBoolean("isCompleted", false) ||
                data.optString("status").equals("completed", ignoreCase = true) ||
                data.optString("event").equals("completed", ignoreCase = true)

            Log.i(TAG, "收到语音响应 - text=$text, ttsMode=$ttsMode, audioUrl=$audioUrl")

            qwen3Tts.resetPlaybackProgress()
            _ttsPlaybackProgress.value = 0f

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
                // 标记正在等待 TTS 播放开始，防止 isSpeaking 收集器初始 false 值覆盖此状态
                awaitingTtsPlayback = true
            }

            _partialTranscript.value = ""
            _isProcessing.value = false

            if (userText.isNotBlank()) {
                appendMessage(ConversationMessage(role = ConversationRole.USER, text = userText))
            }
            appendMessage(ConversationMessage(role = ConversationRole.DIGITAL_HUMAN, text = text))
            _latestDigitalHumanText.value = text
            
            if (questionIndex > 0) {
                Log.i(TAG, "收到题目索引更新: $questionIndex")
                _currentQuestionIndex.value = questionIndex
            }

            val completionHint = isCompletedFlag || completionKeywords.any { keyword ->
                text.contains(keyword, ignoreCase = true)
            }
            if (completionHint) {
                markInterviewCompleted("voice-response")
            }

            if (ttsMode.equals("qwen3_streaming", ignoreCase = true)) {
                // Qwen3 TTS 流式模式：音频通过 TTS WebSocket 直接推送
                // 后端已将文本发送到 TTS 微服务，客户端通过 WebSocket 接收音频流
                Log.i(TAG, "Qwen3 TTS 流式模式 - 音频通过 TTS WebSocket 推送, textHash=$textHash")
                if (textHash != null) {
                    playedTextHashes.add(textHash)
                    currentPlayingTextHash = null
                }
                // _isDigitalHumanSpeaking 和录音由 qwen3Tts.isSpeaking 流控制
                // awaitingTtsPlayback 保持 true 直到 TTS 真正开始播放

                // 安全网：如果 TTS WebSocket 未连接，回退到客户端合成
                if (qwen3Tts.state.value != Qwen3TtsWsClient.State.SESSION_ACTIVE &&
                    qwen3Tts.state.value != Qwen3TtsWsClient.State.CONNECTED) {
                    Log.w(TAG, "⚠️ TTS WebSocket 未连接，qwen3_streaming 回退为客户端合成")
                    if (useQwen3Tts && text.isNotBlank()) {
                        qwen3Tts.speak(text)
                    } else if (text.isNotBlank()) {
                        awaitingTtsPlayback = false
                        playClientSideTts(text, textHash)
                    }
                }
            } else if (ttsMode.equals("client", ignoreCase = true)) {
                if (useQwen3Tts && text.isNotBlank()) {
                    Log.i(TAG, "使用 Qwen3 TTS 播放 - textHash=$textHash")
                    qwen3Tts.speak(text)
                    if (textHash != null) {
                        playedTextHashes.add(textHash)
                        currentPlayingTextHash = null
                    }
                    // awaitingTtsPlayback 保持 true，由 isSpeaking 收集器在 TTS 开始播放时清除
                    // 超时保护：若 TTS 长时间未开始播放，允许恢复录音
                    scope.launch {
                        delay(10_000)
                        if (awaitingTtsPlayback) {
                            Log.w(TAG, "⚠️ TTS 播放超时（10s），强制恢复空闲状态")
                            awaitingTtsPlayback = false
                            if (!_isDigitalHumanSpeaking.value) {
                                tryAutoStartRecordingIfIdle()
                            }
                        }
                    }
                } else {
                    Log.i(TAG, "使用火山引擎TTS播放 - textHash=$textHash")
                    playClientSideTts(text, textHash)
                }
            } else if (!audioUrl.isNullOrBlank()) {
                Log.i(TAG, "使用服务器端TTS音频 - url=$audioUrl, textHash=$textHash")
                playAudioFromPath(audioUrl, textHash, text)
            } else {
                Log.w(TAG, "未提供可播放的音频数据")
                _isDigitalHumanSpeaking.value = false
                awaitingTtsPlayback = false
                currentPlayingTextHash = null
                tryAutoStartRecordingIfIdle()
            }
        } catch (e: Exception) {
            Log.e(TAG, "处理语音响应失败", e)
            _errors.tryEmit(e.message ?: "处理语音响应失败")
            _isDigitalHumanSpeaking.value = false
            awaitingTtsPlayback = false
            currentPlayingTextHash = null
            stopStreamingAudio()
            tryAutoStartRecordingIfIdle()
        }
    }

    private fun stopStreamingAudio() {
        try {
            audioTrack?.let { track ->
                if (track.state == AudioTrack.STATE_INITIALIZED) {
                    track.stop()
                    track.flush()
                    track.release()
                }
            }
            audioTrack = null
            digitalHumanController?.stopPush()
            _isDigitalHumanSpeaking.value = false
        } catch (e: Exception) {
            Log.e(TAG, "停止流式音频失败", e)
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
        qwen3Tts.resetPlaybackProgress()
        _ttsPlaybackProgress.value = 0f
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
        if (useQwen3Tts) {
            qwen3Tts.speak(farewell)
        } else {
            playClientSideTts(farewell, farewell.hashCode().toString())
        }
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
                Log.i(TAG, "开始调用火山引擎TTS - textLen=${text.length}, textHash=$textHash")
                val audioFile = volcanoTtsService.synthesizeSpeech(text)
                Log.i(TAG, "火山TTS成功，开始播放 - file=${audioFile.absolutePath}, textHash=$textHash")
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

    private fun startMediaProgressTicker(mp: MediaPlayer) {
        mediaProgressJob?.cancel()
        mediaProgressJob = scope.launch {
            while (isActive && mp.isPlaying) {
                val d = mp.duration
                if (d > 0) {
                    _ttsPlaybackProgress.value = (mp.currentPosition.toFloat() / d).coerceIn(0f, 0.999f)
                }
                delay(100)
            }
        }
    }

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
        // 关键修复：DUiX 引擎只负责嘴型动画，不负责声音播放，
        // 所以这里绝对不能静音本地播放器，否则听不到声音。
        val muteLocalPlayback = false 

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
                if (muteLocalPlayback) {
                    setVolume(0f, 0f)
                }
                
                setOnPreparedListener {
                    val sessionId = audioSessionId
                    Log.i(TAG, "MediaPlayer准备完成 - audioSessionId=$sessionId, textHash=$textHash")
                    
                    if (sessionId == 0) {
                        Log.e(TAG, "警告：audioSessionId为0，无法初始化Visualizer")
                    }
                    
                    start()
                    Log.i(
                        TAG,
                        "MediaPlayer开始播放 - textHash=$textHash" +
                            if (muteLocalPlayback) "（已静音，避免与数字人双重播放）" else ""
                    )
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = true
                    this@RealtimeVoiceManager.awaitingTtsPlayback = false
                    this@RealtimeVoiceManager.activeAudioHash = textHash
                    this@RealtimeVoiceManager.startMediaProgressTicker(this)
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
                    this@RealtimeVoiceManager.mediaProgressJob?.cancel()
                    this@RealtimeVoiceManager.mediaProgressJob = null
                    this@RealtimeVoiceManager._ttsPlaybackProgress.value = 1f
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = false
                    this@RealtimeVoiceManager.awaitingTtsPlayback = false
                    this@RealtimeVoiceManager.activeAudioHash = null
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
                            delay(300) 
                            Log.i(TAG, "TTS播放完成，VAD模式自动重新开始录音")
                            startRecording()
                        }
                    } else {
                        tryAutoStartRecordingIfIdle()
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "MediaPlayer错误 - what=$what, extra=$extra, textHash=$textHash")
                    this@RealtimeVoiceManager.mediaProgressJob?.cancel()
                    this@RealtimeVoiceManager.mediaProgressJob = null
                    this@RealtimeVoiceManager._isDigitalHumanSpeaking.value = false
                    this@RealtimeVoiceManager.awaitingTtsPlayback = false
                    this@RealtimeVoiceManager.activeAudioHash = null
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
        if (awaitingTtsPlayback) return

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
    private var smoothedMouthValue = 0f
    
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
            val rawMouth = (rms * 3f).coerceIn(0f, 0.8f)
            smoothedMouthValue += 0.35f * (rawMouth - smoothedMouthValue)
            val mouthOpenness = smoothedMouthValue

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
            // 传递 TTS 会话 ID，后端据此通过 Redis 将音频推送到正确的 TTS 微服务会话
            if (useQwen3Tts) {
                qwen3Tts.sessionId.value?.let { put("ttsSessionId", it) }
            }
        }
        
        Log.i(TAG, "通过WebSocket发送text_message - sessionId=$sessionId, text=$normalized, useQwen3Tts=$useQwen3Tts")
        socket?.emit("text_message", payload)
        _isProcessing.value = true
        stopStreamingAudio() // 发送新消息前停止之前的流
    }

    /**
     * 安全地解析 Socket.IO 事件数据为 JSONObject 并执行处理。
     * 兼容 JSONObject 和 String 两种数据格式，防止 ClassCastException 导致事件丢失。
     */
    private fun safeHandleEvent(eventName: String, args: Array<Any>, handler: (JSONObject) -> Unit) {
        try {
            val data = args.getOrNull(0)
            val json = when (data) {
                is JSONObject -> data
                is String -> JSONObject(data)
                else -> {
                    Log.w(TAG, "⚠️ Socket事件 '$eventName' 数据格式不支持: ${data?.javaClass?.name}")
                    return
                }
            }
            handler(json)
        } catch (e: Exception) {
            Log.e(TAG, "处理Socket事件 '$eventName' 异常", e)
        }
    }

    private fun handleTextChunk(data: JSONObject) {
        val text = data.optString("text")
        if (text.isNotBlank()) {
            _latestDigitalHumanText.value = text
            // 同时更新对话历史中的最后一条面试官消息
            updateLastAiMessage(text)
        }
    }

    private fun handleAsrPartial(data: JSONObject) {
        val text = data.optString("text")
        if (text.isNotBlank()) {
            _partialTranscript.value = text
        }
    }

    private fun handleAudioChunk(data: JSONObject) {
        try {
            val audioData = data.opt("data") as? ByteArray ?: return
            
            // 初始化或获取 AudioTrack
            if (audioTrack == null || audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                val minBufSize = AudioTrack.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                
                audioTrack = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                    .setAudioFormat(AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build())
                    .setBufferSizeInBytes(minBufSize * 2)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build()
                
                audioTrack?.play()
                _isDigitalHumanSpeaking.value = true
                
                // 设置数字人开始接收流
                digitalHumanController?.startPush()
            }

            // 1. 播放声音
            audioTrack?.write(audioData, 0, audioData.size)
            
            // 2.驱动数字人嘴型
            // 将 PCM 直接喂给数字人引擎
            digitalHumanController?.pushPcm(audioData)
            
        } catch (e: Exception) {
            Log.e(TAG, "处理音频分片失败", e)
        }
    }

    private fun updateLastAiMessage(text: String) {
        val currentList = _conversation.value.toMutableList()
        val lastIdx = currentList.indexOfLast { it.role == ConversationRole.DIGITAL_HUMAN }
        if (lastIdx != -1) {
            currentList[lastIdx] = currentList[lastIdx].copy(text = text)
            _conversation.value = currentList
        } else {
            appendMessage(ConversationMessage(role = ConversationRole.DIGITAL_HUMAN, text = text))
        }
    }

    private fun showToast(message: String) {
        scope.launch(kotlinx.coroutines.Dispatchers.Main) {
            android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_SHORT).show()
        }
    }
}
