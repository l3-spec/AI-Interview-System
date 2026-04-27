package com.xlwl.AiMian.ai.realtime

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.media.audiofx.Visualizer
import android.os.SystemClock
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

/** 后端 Socket `candidate_turn_recorded`：绑定该轮答题视频时使用 sequence */
data class CandidateTurnRecorded(
    val sessionId: String,
    val sequence: Int,
    val turnId: String?,
    val questionIndex: Int?,
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
        private const val ASR_RECONNECT_GAP_MS = 220L
        private const val ASR_POST_CONNECT_WAIT_MS = 400L
        /** 抢话用 VAD：阈值略高减轻外放回声误触，时长略短以更快打断 */
        private const val BARGE_IN_SPEECH_MIN_MS = 350L
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
    private val qwen3Tts = Qwen3TtsWsClient(cacheDir = getTtsDebugDir())
    private var useQwen3Asr = false  // 是否启用 Qwen3 ASR（由服务端配置决定）
    private var useQwen3Tts = false  // 是否启用 Qwen3 TTS
    
    // VAD检测器
    private val vadDetector = VoiceActivityDetector(
        sampleRate = SAMPLE_RATE,
        silenceThresholdDb = AppConfig.vadThreshold,
        silenceDurationMs = 2000,        // 2秒静音后自动结束
        speechMinDurationMs = 500,       // 至少说0.5秒
        maxSpeechDurationMs = MAX_RECORDING_DURATION_MS.toLong()
    )

    /** 仅在「不向 ASR 推流」时运行，用于用户抢话打断播音 */
    private val bargeInVadDetector = VoiceActivityDetector(
        sampleRate = SAMPLE_RATE,
        silenceThresholdDb = AppConfig.bargeInVadThreshold,
        silenceDurationMs = 2000,
        speechMinDurationMs = BARGE_IN_SPEECH_MIN_MS,
        maxSpeechDurationMs = MAX_RECORDING_DURATION_MS.toLong()
    )
    
    private var vadEnabled = true  // VAD是否启用

    private var socket: Socket? = null
    private var audioRecord: AudioRecord? = null
    private var acousticEchoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
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
    private var lastVoiceResponseKey: String? = null
    private var lastVoiceResponseAtMs: Long = 0L

    // 标记是否有正在等待 TTS 播放的响应，防止 isSpeaking 收集器过早将 _isDigitalHumanSpeaking 置为 false
    @Volatile
    private var awaitingTtsPlayback = false

    /**
     * 在此时间戳（[SystemClock.elapsedRealtime]）之前不向 ASR 推流、不采纳 ASR 最终结果，用于外放回声与 ASR 侧缓冲尾包。
     * 播报开始前设为 [Long.MAX_VALUE]；播报结束后再设为 now + [AppConfig.speechCooldownMs]。
     */
    @Volatile
    private var micToAsrAllowedAfterElapsedRealtime: Long = 0L

    @Volatile
    private var bargeInLastHandledElapsedRealtime: Long = 0L

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

    private val _candidateTurnRecorded = MutableSharedFlow<CandidateTurnRecorded>(extraBufferCapacity = 8)
    val candidateTurnRecorded: SharedFlow<CandidateTurnRecorded> = _candidateTurnRecorded.asSharedFlow()

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
            lastVoiceResponseKey = null
            lastVoiceResponseAtMs = 0L

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
                Log.i(TAG, "✅ WebSocket连接成功: $serverUrl, SocketID: ${newSocket.id()}")
                _connectionState.value = ConnectionState.CONNECTED
                joinSession(sessionId, userId, jobPosition, background)
                showToast("AI面试官已上线")
            }
            newSocket.on(Socket.EVENT_DISCONNECT) {
                Log.w(TAG, "❌ WebSocket连接断开: $serverUrl")
                _connectionState.value = ConnectionState.DISCONNECTED
                socket = null
            }
            newSocket.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val err = args.getOrNull(0)
                Log.e(TAG, "❌ WebSocket连接错误: $err, URL: $serverUrl")
                _connectionState.value = ConnectionState.DISCONNECTED
                socket = null
                showToast("连接服务器失败，请检查网络")
                err?.toString()?.let { _errors.tryEmit(it) }
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
            newSocket.on("candidate_turn_recorded") { args ->
                safeHandleEvent("candidate_turn_recorded", args) { jo ->
                    val sid = jo.optString("sessionId")
                    val seq = jo.optInt("sequence", -1)
                    if (sid.isBlank() || seq < 0) return@safeHandleEvent
                    val tid = jo.optString("turnId").takeIf { it.isNotBlank() }
                    val qRaw = if (jo.isNull("questionIndex")) null else jo.opt("questionIndex")
                    val qIdx = when (qRaw) {
                        is Number -> qRaw.toInt().takeIf { it >= 0 }
                        else -> null
                    }
                    scope.launch {
                        _candidateTurnRecorded.emit(
                            CandidateTurnRecorded(sid, seq, tid, qIdx)
                        )
                    }
                }
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
                                micToAsrAllowedAfterElapsedRealtime = Long.MAX_VALUE
                                _isDigitalHumanSpeaking.value = true
                                if (vadEnabled) {
                                    bargeInVadDetector.reset()
                                    Log.i(TAG, "🎙️ [FLOW] Qwen3 TTS 播放正式开始 -> 保持采麦以支持 VAD 抢话")
                                    ensureRecordingForBargeIn()
                                } else {
                                    Log.i(TAG, "🎙️ [FLOW] Qwen3 TTS 播放正式开始 -> 关闭录音（VAD 已关闭）")
                                    stopRecordingInternal()
                                }
                            } else {
                                // TTS 停止播放：只有在没有等待中的新响应时才标记说话结束
                                if (awaitingTtsPlayback) {
                                    Log.d(TAG, "TTS isSpeaking=false 但仍在等待新响应音频，忽略此处状态重置")
                                    return@collect
                                }
                                
                                Log.i(TAG, "🎙️ [FLOW] Qwen3 TTS 播报结束")
                                _isDigitalHumanSpeaking.value = false
                                if (!_interviewCompleted.value && vadEnabled) {
                                    scheduleResumeListeningAfterSpeakerPlayback()
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
                            if (result.text.isBlank()) return@collect
                            val nowRt = SystemClock.elapsedRealtime()
                            if (nowRt < micToAsrAllowedAfterElapsedRealtime) {
                                Log.w(TAG, "丢弃 ASR（仍在扬声器/缓冲冷却内）: ${result.text}")
                                return@collect
                            }
                            if (looksLikeAcousticEchoOfLastAvatar(result.text)) {
                                Log.w(TAG, "丢弃 ASR（与最近面试官字幕高度相似，疑外放回声）: ${result.text}")
                                return@collect
                            }
                            withContext(Dispatchers.Main) {
                                _partialTranscript.value = result.text
                            }
                            submitUserText(result.text)
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
        if (useQwen3Asr) {
            bargeInVadDetector.reset()
            ensureRecordingForBargeIn()
        } else {
            stopRecordingInternal()
        }
        
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
                
                Log.d(TAG, "创建AudioRecord - source=VOICE_COMMUNICATION, sampleRate=$SAMPLE_RATE, bufferSize=$bufferSize")
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
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
                enableMicAudioEffects(recorder.audioSessionId)
                
                // 重置VAD
                if (vadEnabled) {
                    vadDetector.reset()
                    bargeInVadDetector.reset()
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
            Log.i(TAG, "interrupt: 统一停止 MediaPlayer / Socket 流式 / Qwen3 TTS，并打断数字人")
            // 与 stopAllAudio 一致：覆盖所有播音路径；并额外 stopAudio() 停掉 DUIX 文件播放等
            stopAllAudio()
            runCatching { digitalHumanController?.interruptPlayback() }
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
        micToAsrAllowedAfterElapsedRealtime = 0L
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
        lastVoiceResponseKey = null
        lastVoiceResponseAtMs = 0L
        awaitingTtsPlayback = false
        micToAsrAllowedAfterElapsedRealtime = 0L
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
                    val avatarAudioBlockingMic =
                        _isDigitalHumanSpeaking.value || awaitingTtsPlayback

                    // Qwen3 ASR 模式：实时推流，服务端 VAD + 识别
                    if (useQwen3Asr) {
                        // 仅在允许时向 ASR 送流；阻塞期间仍分析麦克风流，用独立 VAD 做抢话检测
                        if (shouldStreamMicToQwen3Asr()) {
                            qwen3Asr.sendAudio(buffer, 0, bytesRead)
                            totalBytes += bytesRead
                            if (!speechDetected) {
                                speechDetected = true
                            }
                        } else if (vadEnabled) {
                            val barge = bargeInVadDetector.analyze(buffer)
                            if (barge.state == VoiceActivityDetector.State.SPEECH) {
                                handleUserSpeechBargeIn()
                            }
                        }
                        // Qwen3 ASR 使用服务端 VAD，客户端不需要本地 VAD 断句
                        // 但仍保留超时保护
                    } else {
                        // 本地 VAD + 阿里云 ASR：播音/等待 TTS 时只跑抢话 VAD，避免外放触发主 VAD 断句
                        if (vadEnabled && avatarAudioBlockingMic) {
                            val barge = bargeInVadDetector.analyze(buffer)
                            if (barge.state == VoiceActivityDetector.State.SPEECH) {
                                handleUserSpeechBargeIn()
                            }
                        }
                    }

                    // VAD：阿里云 ASR 且数字人播音中仅抢话分支已处理，跳过主 VAD；Qwen3 ASR 仍跑主 VAD
                    val skipMainVad = !useQwen3Asr && vadEnabled && avatarAudioBlockingMic
                    if (!skipMainVad) {
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
                    }
                    
                    // 超时保护
                    val elapsed = System.currentTimeMillis() - recordingStartTime
                    if (elapsed >= MAX_RECORDING_DURATION_MS) {
                        Log.w(TAG, "🎙️ [FLOW] 录音超时（${MAX_RECORDING_DURATION_MS}ms），强制结束")
                        isRecording = false
                        break
                    }
                    
                    // Qwen3 ASR 模式下的额外保护：如果检测到说话但长时间没收到 ASR 结果
                    if (useQwen3Asr && speechDetected && elapsed > 15000) { // 15秒无响应
                         Log.w(TAG, "🎙️ [FLOW] Qwen3 ASR 响应过慢，尝试重启识别")
                         // 此处不强制断开，但记录警告
                    }
                    
                } else if (bytesRead < 0) {
                    Log.e(TAG, "🎙️ [FLOW] 录音读取失败: bytesRead=$bytesRead")
                    _errors.tryEmit("录音读取失败: $bytesRead")
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "🎙️ [FLOW] VAD录音异常", e)
            _errors.tryEmit(e.message ?: "录音失败")
        } finally {
            Log.i(TAG, "🎙️ [FLOW] VAD录音循环结束 - 总字节数: $totalBytes, 说话检测: $speechDetected")
            
            try {
                recorder.stop()
            } catch (e: Exception) {
                Log.e(TAG, "停止recorder时出错", e)
            }
            releaseMicAudioEffects()
            recorder.release()
            audioRecord = null
            isRecording = false
            _isRecordingFlow.value = false
            
            // Qwen3 ASR 模式下无需本地处理（服务端自动识别并通过 WebSocket 返回结果）
            if (useQwen3Asr) {
                Log.i(TAG, "🎙️ [FLOW] Qwen3 ASR 录音已结束，等待服务端识别结果")
                // 关键修复：Qwen3 ASR 模式结束后，如果长时间没等到结果，也应该允许重启录音
                scope.launch {
                    delay(5000) // 等待5秒
                    if (!isRecording && !_isDigitalHumanSpeaking.value && !awaitingTtsPlayback) {
                        Log.d(TAG, "🎙️ [FLOW] Qwen3 ASR 结束5秒后仍空闲，尝试恢复监听")
                        tryAutoStartRecordingIfIdle()
                    }
                }
            } else if (speechDetected && totalBytes > 0) {
                processRecordedAudio(true, sessionId)
            } else {
                Log.i(TAG, "🎙️ [FLOW] 未检测到有效语音，准备重新开始监听")
                _partialTranscript.value = ""
                recordedBuffer?.reset()
                recordedBuffer = null
                // 关键修复：静音/空闲结束后也要尝试重启录音，否则循环会断掉
                scope.launch {
                    delay(100)
                    tryAutoStartRecordingIfIdle()
                }
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
            
            // 手动模式下，如果处理完后没有触发说话，也要尝试重启
            scope.launch {
                delay(1000)
                tryAutoStartRecordingIfIdle()
            }
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
                Log.w(TAG, "🎙️ [FLOW] ASR未识别到语音内容")
                _partialTranscript.value = ""
                _isProcessing.value = false
                // _errors.tryEmit("未识别到语音内容") // 静音时不报错，直接重启
                tryAutoStartRecordingIfIdle()
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
            val sessionId = data.optString("sessionId", currentSessionId ?: "")
            val ttsSessionIdFromServer = data.optString("ttsSessionId", "").takeIf { it.isNotBlank() }
            if (ttsSessionIdFromServer != null && currentSessionId != null &&
                ttsSessionIdFromServer != currentSessionId
            ) {
                Log.w(
                    TAG,
                    "voice_response 中 ttsSessionId=$ttsSessionIdFromServer 与当前 Socket sessionId=$currentSessionId 不一致，TTS 微服务可能收不到与 App 相同的会话键",
                )
            }
            val questionIndex = data.optInt("questionIndex", -1)
            val willSpeak = text.isNotBlank() || !audioUrl.isNullOrBlank()
            val isCompletedFlag = data.optBoolean("isCompleted", false) ||
                data.optString("status").equals("completed", ignoreCase = true) ||
                data.optString("event").equals("completed", ignoreCase = true)

            Log.i(TAG, "收到语音响应 - text=$text, ttsMode=$ttsMode, audioUrl=$audioUrl")

            _ttsPlaybackProgress.value = 0f

            // 生成文本的唯一标识
            val textHash = if (text.isNotBlank()) {
                text.hashCode().toString() + "_" + text.length
            } else if (!audioUrl.isNullOrBlank()) {
                audioUrl.hashCode().toString()
            } else {
                null
            }

            val responseKey = listOf(sessionId, ttsMode.lowercase(Locale.ROOT), textHash ?: "", audioUrl ?: "")
                .joinToString("|")
            val now = SystemClock.elapsedRealtime()
            if (responseKey == lastVoiceResponseKey && now - lastVoiceResponseAtMs < 4_000L) {
                Log.w(TAG, "跳过短时间重复 voice_response，避免重复播报 - key=$responseKey")
                return
            }
            lastVoiceResponseKey = responseKey
            lastVoiceResponseAtMs = now

            // Qwen3 流式音频由 TTS WebSocket 推送。这里不能 clear Qwen3 TTS，
            // 否则会把服务端刚提交的流式播报清掉，再触发本地兜底造成多路播放。
            if (ttsMode.equals("qwen3_streaming", ignoreCase = true)) {
                stopAllAudio(stopQwenTts = false, stopSocketStreamingAudio = false)
            } else {
                stopAllAudio()
            }
            
            if (willSpeak) {
                micToAsrAllowedAfterElapsedRealtime = Long.MAX_VALUE
                if (vadEnabled) {
                    // 不向 ASR 推流期间保持采麦 + 抢话 VAD（含非 Qwen3 ASR，主 VAD 在播音时会跳过断句）
                    bargeInVadDetector.reset()
                    ensureRecordingForBargeIn()
                } else {
                    stopRecordingInternal()
                }
                _isDigitalHumanSpeaking.value = true
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
                // 服务器已经下发了结束播报，不再额外播放本地 farewell，避免结束页前重复播报。
                markInterviewCompleted("voice-response", speakFarewell = false, stopCurrentAudio = false)
            }

            // 严格互斥：优先流式，次之本地合成，再次之音频包
            if (ttsMode.equals("qwen3_streaming", ignoreCase = true)) {
                Log.i(TAG, "Qwen3 TTS 流式模式激活 - 独占模式, textHash=$textHash")
                if (textHash != null) {
                    playedTextHashes.add(textHash)
                    currentPlayingTextHash = null
                }
                
                // 关键修复：在这种模式下，即使 WS 暂时没连上，我们也优先尝试连接而不是直接触发火山兜底
                if (qwen3Tts.state.value != Qwen3TtsWsClient.State.SESSION_ACTIVE &&
                    qwen3Tts.state.value != Qwen3TtsWsClient.State.CONNECTED) {
                    Log.w(TAG, "⚠️ TTS WebSocket 尚未就绪，尝试建立连接并等待数据...")
                    initQwen3Services(sessionId)
                    
                    // 流式模式下只等待 TTS WebSocket；不要立刻本地兜底，否则服务端流随后到达会双播。
                }
                // 流程交给 qwen3Tts 内部解决，不要再往下跑
                return
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
                            Log.w(TAG, "⚠️ [FLOW] TTS 播放超时（10s），强制清除锁定状态恢复监听")
                            awaitingTtsPlayback = false
                            _isDigitalHumanSpeaking.value = false // 关键：同时重置说话状态
                            currentPlayingTextHash = null
                            tryAutoStartRecordingIfIdle()
                        }
                    }
                } else {
                    Log.i(TAG, "使用火山引擎TTS播放 - textHash=$textHash")
                    playClientSideTts(text, textHash)
                }
            } else if (!audioUrl.isNullOrBlank()) {
                val fullUrl = if (audioUrl.startsWith("http")) audioUrl else {
                    val baseUrl = AppConfig.apiBaseUrl.removeSuffix("/api/").removeSuffix("/api")
                    if (audioUrl.startsWith("/")) "$baseUrl$audioUrl" else "$baseUrl/$audioUrl"
                }
                Log.i(TAG, "使用服务器端TTS音频 - url=$fullUrl, textHash=$textHash")
                playAudioFromUrl(fullUrl, textHash, text)
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

    private fun markInterviewCompleted(
        reason: String? = null,
        speakFarewell: Boolean = true,
        stopCurrentAudio: Boolean = true
    ) {
        if (_interviewCompleted.value) return
        Log.i(TAG, "标记面试已完成${reason?.let { "：$it" } ?: ""}")
        if (stopCurrentAudio) {
            qwen3Tts.resetPlaybackProgress()
            stopAllAudio()
        }
        _ttsPlaybackProgress.value = 0f
        _interviewCompleted.value = true
        stopRecordingInternal()
        if (!speakFarewell) return

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
                    
                    // 外放场景：与 Qwen3 流式相同，冷却 + 必要时重连 ASR 再监听
                    if (!_interviewCompleted.value && vadEnabled && _connectionState.value == ConnectionState.CONNECTED) {
                        scheduleResumeListeningAfterSpeakerPlayback()
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

    /**
     * 强制停止所有正在播报的音频，确保全局唯一性
     */
    fun stopAllAudio(
        stopQwenTts: Boolean = true,
        stopSocketStreamingAudio: Boolean = true
    ) {
        Log.i(TAG, "执行强制停止所有音频播报：Socket 流式 AudioTrack, MediaPlayer, Qwen3TTS")
        
        // 0. Socket 下发的 PCM 流（audio_chunk → AudioTrack + DUIX pushPcm）
        if (stopSocketStreamingAudio) {
            stopStreamingAudio()
        }
        
        // 1. 停止 MediaPlayer (火山 / 本地文件 / 服务端音频包)
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "停止 MediaPlayer 异常: ${e.message}")
        }
        mediaPlayer = null
        mediaProgressJob?.cancel()
        mediaProgressJob = null
        
        // 2. 停止 Qwen3 TTS 流式播报（未启用时 send 可能无 WS，可忽略）
        if (stopQwenTts) {
            try {
                qwen3Tts.clearAndStop()
            } catch (e: Exception) {
                Log.w(TAG, "停止 Qwen3 TTS 异常: ${e.message}")
            }
        }
        
        // 3. 重置状态位（随后若继续播新语音，handleVoiceResponse 会再置为阻断 ASR）
        _isDigitalHumanSpeaking.value = false
        awaitingTtsPlayback = false
        micToAsrAllowedAfterElapsedRealtime = 0L
        activeAudioHash = null
        currentPlayingTextHash = null
        
        // 4. 重置 UI 进度与嘴型
        _ttsPlaybackProgress.value = 0f
        digitalHumanController?.resetMouth()
        releaseVisualizer()
    }

    /**
     * 播音或即将播音时仍保持 AudioRecord，用于本地 VAD 抢话；若之前被停掉则拉起一路监听。
     */
    private fun ensureRecordingForBargeIn() {
        if (!vadEnabled || _interviewCompleted.value) return
        if (_connectionState.value != ConnectionState.CONNECTED) return
        if (isRecording) return
        Log.d(TAG, "ensureRecordingForBargeIn: 拉起采麦用于抢话检测")
        startRecording()
    }

    /**
     * 本地 VAD 认定用户正在持续说话且当前不应向 ASR 推流时：打断播音 / 跳过后冷却，并刷新 ASR 会话。
     */
    private fun handleUserSpeechBargeIn() {
        val nowRt = SystemClock.elapsedRealtime()
        if (nowRt - bargeInLastHandledElapsedRealtime < 350L) return
        val inCooldown = nowRt < micToAsrAllowedAfterElapsedRealtime
        val aiPlaying = _isDigitalHumanSpeaking.value || awaitingTtsPlayback
        if (!inCooldown && !aiPlaying) return
        bargeInLastHandledElapsedRealtime = nowRt

        if (aiPlaying) {
            Log.i(TAG, "🎙️ [BARGE-IN] 检测到用户语音，打断数字人播音并通知后端")
            interrupt()
        } else {
            Log.i(TAG, "🎙️ [BARGE-IN] 播音后冷却中检测到用户开口，提前恢复 ASR")
        }
        bargeInVadDetector.reset()
        scope.launch {
            if (useQwen3Asr && currentSessionId != null) {
                withContext(Dispatchers.IO) {
                    runCatching {
                        qwen3Asr.disconnect()
                        delay(ASR_RECONNECT_GAP_MS)
                        qwen3Asr.connect(AppConfig.asrServiceWsUrl, currentSessionId!!)
                    }.onFailure { e -> Log.e(TAG, "抢话后重连 ASR 失败: ${e.message}") }
                }
                delay(ASR_POST_CONNECT_WAIT_MS)
            }
            micToAsrAllowedAfterElapsedRealtime = 0L
        }
    }

    /**
     * 是否允许把麦克风 PCM 推给 Qwen3 ASR。
     * 数字人/TTS 播音时扬声器声会被 mic 拾取，易被识别成「用户在说话」——不是服务端把 TTS 文本转给 ASR，而是声学回声。
     */
    private fun shouldStreamMicToQwen3Asr(): Boolean {
        if (_isDigitalHumanSpeaking.value || awaitingTtsPlayback) return false
        if (SystemClock.elapsedRealtime() < micToAsrAllowedAfterElapsedRealtime) return false
        return true
    }

    private fun normalizeForEchoCompare(s: String) =
        s.replace(Regex("\\s+"), "").lowercase(Locale.ROOT)

    /** 外放回声：识别结果与最近面试官字幕高度重合则丢弃（避免迟滞 ASR 尾包误提交） */
    private fun looksLikeAcousticEchoOfLastAvatar(asr: String): Boolean {
        val av = normalizeForEchoCompare(_latestDigitalHumanText.value ?: return false)
        val u = normalizeForEchoCompare(asr)
        if (u.length < 12 || av.length < 12) return false
        if (av.contains(u) || u.contains(av)) return true
        val win = 16
        if (u.length >= win) {
            for (i in 0..u.length - win) {
                if (av.contains(u.substring(i, i + win))) return true
            }
        }
        return false
    }

    /**
     * 数字人播报结束后：等待 [AppConfig.speechCooldownMs]，必要时断开并重连 Qwen3 ASR 以丢弃服务端缓冲音频，再自动开麦。
     */
    private fun scheduleResumeListeningAfterSpeakerPlayback() {
        if (_interviewCompleted.value || !vadEnabled) return
        if (_connectionState.value != ConnectionState.CONNECTED) return
        micToAsrAllowedAfterElapsedRealtime = SystemClock.elapsedRealtime() + AppConfig.speechCooldownMs
        scope.launch {
            delay(AppConfig.speechCooldownMs)
            if (_interviewCompleted.value) return@launch
            if (useQwen3Asr && currentSessionId != null) {
                withContext(Dispatchers.IO) {
                    runCatching {
                        qwen3Asr.disconnect()
                        delay(ASR_RECONNECT_GAP_MS)
                        qwen3Asr.connect(AppConfig.asrServiceWsUrl, currentSessionId!!)
                    }.onFailure { Log.e(TAG, "重启 Qwen3 ASR 失败: ${it.message}") }
                }
                delay(ASR_POST_CONNECT_WAIT_MS)
            }
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
        if (SystemClock.elapsedRealtime() < micToAsrAllowedAfterElapsedRealtime) return

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
        releaseMicAudioEffects()
        try {
            audioRecord?.release()
        } catch (_: Exception) {
        }
        audioRecord = null
        isRecording = false
        _isRecordingFlow.value = false
    }

    private fun enableMicAudioEffects(audioSessionId: Int) {
        releaseMicAudioEffects()

        if (audioSessionId == AudioRecord.ERROR || audioSessionId == AudioRecord.ERROR_BAD_VALUE) {
            Log.w(TAG, "AEC/NS 跳过：无效 audioSessionId=$audioSessionId")
            return
        }

        if (AcousticEchoCanceler.isAvailable()) {
            try {
                acousticEchoCanceler = AcousticEchoCanceler.create(audioSessionId)?.apply {
                    enabled = true
                }
                Log.i(TAG, "AEC 回声消除已${if (acousticEchoCanceler?.enabled == true) "启用" else "创建但未启用"}")
            } catch (e: Throwable) {
                Log.w(TAG, "AEC 回声消除启用失败: ${e.message}")
                acousticEchoCanceler = null
            }
        } else {
            Log.w(TAG, "当前设备不支持 AEC 回声消除")
        }

        if (NoiseSuppressor.isAvailable()) {
            try {
                noiseSuppressor = NoiseSuppressor.create(audioSessionId)?.apply {
                    enabled = true
                }
                Log.i(TAG, "NS 降噪已${if (noiseSuppressor?.enabled == true) "启用" else "创建但未启用"}")
            } catch (e: Throwable) {
                Log.w(TAG, "NS 降噪启用失败: ${e.message}")
                noiseSuppressor = null
            }
        } else {
            Log.w(TAG, "当前设备不支持 NS 降噪")
        }
    }

    private fun releaseMicAudioEffects() {
        try {
            acousticEchoCanceler?.release()
        } catch (_: Throwable) {
        }
        acousticEchoCanceler = null

        try {
            noiseSuppressor?.release()
        } catch (_: Throwable) {
        }
        noiseSuppressor = null
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
            // 支持多种格式：直接二进制 (ByteArray) 或 Base64 (String)
            val rawData = data.opt("data") ?: data.opt("audio")
            val audioData = when (rawData) {
                is ByteArray -> rawData
                is String -> {
                    try {
                        android.util.Base64.decode(rawData, android.util.Base64.DEFAULT)
                    } catch (e: Exception) {
                        Log.e(TAG, "Base64解码音频失败", e)
                        null
                    }
                }
                else -> {
                    Log.w(TAG, "收到未知格式的audio_chunk: ${rawData?.javaClass?.name}")
                    null
                }
            } ?: return
            
            Log.d(TAG, "收到 audio_chunk: size=${audioData.size}, format=${data.optString("format", "unknown")}")

            // 初始化或获取 AudioTrack
            if (audioTrack == null || audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                val minBufSize = AudioTrack.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                
                Log.i(TAG, "初始化 AudioTrack - sampleRate=$SAMPLE_RATE, minBufSize=$minBufSize")
                audioTrack = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
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
                
                audioTrack?.setVolume(1.0f)
                audioTrack?.play()
                _isDigitalHumanSpeaking.value = true
                
                // 设置数字人开始接收流
                digitalHumanController?.startPush()
                Log.i(TAG, "AudioTrack 已启动并开始推送 PCM 给数字人")
            }

            // 1. 播放声音
            val writeResult = audioTrack?.write(audioData, 0, audioData.size)
            if (writeResult != null && writeResult < 0) {
                Log.e(TAG, "AudioTrack.write 错误: $writeResult")
            }
            
            // 3. (调试) 保存 PCM 原始数据
            saveDebugPcmChunk(audioData)
            
            // 2.驱动数字人嘴型
            // 将 PCM 直接喂给数字人引擎
            digitalHumanController?.pushPcm(audioData)
            
        } catch (e: Exception) {
            Log.e(TAG, "处理音频分片失败", e)
        }
    }

    private fun getTtsDebugDir(): File {
        val dir = context.getExternalFilesDir("tts_debug") ?: File(context.cacheDir, "tts_debug")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private var debugPcmFile: File? = null
    private fun saveDebugPcmChunk(data: ByteArray) {
        try {
            if (debugPcmFile == null) {
                debugPcmFile = File(getTtsDebugDir(), "DEBUG_WS_CHUNK_${System.currentTimeMillis()}.pcm")
                Log.i(TAG, "==== TTS DEBUG: WS CHUNK SAVING STARTED ====")
                Log.i(TAG, "Path: ${debugPcmFile?.absolutePath}")
                Log.i(TAG, "=============================================")
            }
            java.io.FileOutputStream(debugPcmFile!!, true).use { it.write(data) }
        } catch (e: Exception) {
            Log.e(TAG, "保存调试PCM失败", e)
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

    /**
     * 释放所有资源并断开所有服务
     * 到了面试完成页面后，应调用此方法销毁数字人、停止语音、断开 ASR/TTS 服务
     */
    fun release() {
        Log.i(TAG, "♻️ 正在断开所有服务并释放资源...")
        
        // 1. 停止所有音频播放 (MediaPlayer, Qwen3)
        stopAllAudio()
        
        // 2. 停止录音 (AudioRecord)
        stopRecordingInternal()
        
        // 3. 断开主 WebSocket (Socket.io)
        try {
            socket?.off()
            socket?.disconnect()
            socket = null
        } catch (e: Exception) {
            Log.e(TAG, "断开主Socket异常", e)
        }
        
        // 4. 释放 Qwen3 ASR & TTS 客户端
        try {
            qwen3Asr.release()
            qwen3Tts.release()
        } catch (e: Exception) {
            Log.e(TAG, "释放Qwen3服务异常", e)
        }
        
        // 5. 释放本地播放资源 (AudioTrack, Visualizer)
        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (_: Exception) {}
        
        try {
            releaseVisualizer()
        } catch (_: Exception) {}

        // 6. 停止活跃的进度轮询
        mediaProgressJob?.cancel()
        mediaProgressJob = null

        // 7. 取消协程作用域（断开所有协程中的网络操作）
        try {
            scope.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "取消协程作用域异常", e)
        }
        
        _connectionState.value = ConnectionState.DISCONNECTED
        _isDigitalHumanSpeaking.value = false
        _isRecordingFlow.value = false
        _isProcessing.value = false
        
        Log.i(TAG, "✅ RealtimeVoiceManager 已完全释放资源")
    }

    private fun showToast(message: String) {
        scope.launch(kotlinx.coroutines.Dispatchers.Main) {
            android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_SHORT).show()
        }
    }
}
