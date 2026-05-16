package com.xlwl.AiMian.ai.realtime

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import com.xlwl.AiMian.config.AppConfig
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

data class TranscriptDelta(
    val text: String,
    val audioTime: Int, // 毫秒
    val responseId: String
)

/**
 * Qwen3 TTS WebSocket 客户端
 *
 * 直连 TTS 微服务（ws://host:3003/ws/tts），实现双轨混合流式语音合成。
 *
 * 协议流程：
 *   1. 连接成功后发送 session.create（含 voice / sampleRate / instructions 等配置）
 *   2. 收到 session.created → 就绪
 *   3. 后端通过 Redis 或客户端直接发送 text.append + text.commit
 *   4. 收到 tts.audio_chunk（Base64 PCM）→ 数字人流式时仅 pushPcm；否则写入 AudioTrack；可同时缓存 WAV
 *   5. 收到 tts.response_done → 单次合成完成
 *   6. 发送 session.finish 关闭会话
 */
class Qwen3TtsWsClient(
    private val cacheDir: File,
    /**
     * 须与 DUIX [ai.guiji.duix.sdk] `pushPcm` 约定一致：引擎侧按 **16kHz / mono / PCM16 LE** 解读。
     * 若此处用 24000 而直接 `pushPcm` 给数字人，听感会降调、拖慢、发闷（并非 SDK 刻意「变声」）。
     */
    private val sampleRate: Int = 16000,
    /**
     * 百炼 Qwen3 实时 TTS 的 `voice`（如 Cherry、Ethan）。
     * 若为空字符串，则不在 session.create 里传 voice，由 tts-service 的 `TTS_VOICE` 环境变量决定（避免 App 写死覆盖服务端配置）。
     * 勿使用 CosyVoice 名（如 siqi）作 voice。
     */
    private val voice: String = "",
) {
    companion object {
        private const val TAG = "Qwen3TtsWsClient"
        private const val RECONNECT_DELAY_MS = 3000L
    }

    enum class State { DISCONNECTED, CONNECTING, CONNECTED, SESSION_ACTIVE, CLOSED }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _state = MutableStateFlow(State.DISCONNECTED)
    val state: StateFlow<State> = _state.asStateFlow()

    /** 当前 TTS 会话 ID（与后端保持一致） */
    private val _sessionId = MutableStateFlow<String?>(null)
    val sessionId: StateFlow<String?> = _sessionId.asStateFlow()

    /** 单次合成完成事件 */
    private val _responseDone = MutableSharedFlow<String>(extraBufferCapacity = 5)
    val responseDone: SharedFlow<String> = _responseDone.asSharedFlow()

    /** 错误事件 */
    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 5)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    /** 实时增量字幕事件（用于KTV效果） */
    private val _transcriptDelta = MutableSharedFlow<TranscriptDelta>(extraBufferCapacity = 10)
    val transcriptDelta: SharedFlow<TranscriptDelta> = _transcriptDelta.asSharedFlow()

    /** 是否正在播放音频 */
    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    /** 实时 RMS 值（用于驱动数字人嘴型，0.0~1.0） */
    private val _mouthRms = MutableStateFlow(0f)
    val mouthRms: StateFlow<Float> = _mouthRms.asStateFlow()

    /** 当前句 TTS 播放进度 0~1，供两行字幕随朗读滚动 */
    private val _playbackProgress = MutableStateFlow(0f)
    val playbackProgress: StateFlow<Float> = _playbackProgress.asStateFlow()

    private var playbackPollJob: Job? = null
    private var finalUtterancePcmBytes = 0

    /**
     * 为 true 时：PCM 块通过 [onDuixPcmChunk] 推给 DUIX（pushPcm），
     * 合成结束不再调用 [duixAudioSink] 整段 WAV（避免口型滞后、双路音频）。
     */
    var preferStreamPcmForDuix: Boolean = false

    var onDuixPcmStreamStart: (() -> Unit)? = null
    var onDuixPcmChunk: ((ByteArray) -> Unit)? = null
    var onDuixPcmStreamEnd: (() -> Unit)? = null
    private var duixStreamSessionActive = false

    private var webSocket: WebSocket? = null
    private var audioTrack: AudioTrack? = null
    private val isPlaying = AtomicBoolean(false)
    private var audioChunkCount = 0

    // WAV 缓存（供 DUIX 引擎使用）
    private var currentWavFile: File? = null
    private var pcmOutputStream: FileOutputStream? = null
    private var totalPcmBytes = 0

    // 会话未就绪时缓存待合成文本，SESSION_ACTIVE 后自动发送
    private val pendingTexts = mutableListOf<String>()

    /** DUIX 音频回调 — 合成完成后将 WAV 路径回调给 DUIX 引擎驱动唇形 */
    var duixAudioSink: ((String) -> Unit)? = null

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MINUTES)  // WebSocket 不超时
        .writeTimeout(10, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    /**
     * 连接到 TTS 微服务
     * @param wsUrl WebSocket 地址，如 ws://10.0.2.2:3003/ws/tts
     * @param sid 可选的会话 ID（与面试 sessionId 关联）
     */
    fun connect(wsUrl: String, sid: String? = null) {
        if (_state.value == State.CONNECTING || _state.value == State.SESSION_ACTIVE) {
            Log.w(TAG, "TTS 已在连接/活跃状态，忽略重复连接")
            return
        }

        _state.value = State.CONNECTING
        Log.i(TAG, "连接 TTS 微服务: $wsUrl")

        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "TTS WebSocket 已连接")
                _state.value = State.CONNECTED
                // 自动创建会话
                createSession(sid)
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "TTS WebSocket 连接失败: ${t.message}")
                _state.value = State.DISCONNECTED
                _errors.tryEmit("TTS连接失败: ${t.message}")
                cleanup()
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "TTS WebSocket 已关闭: code=$code, reason=$reason")
                _state.value = State.CLOSED
                cleanup()
            }
        })
    }

    /**
     * 创建 TTS 会话
     */
    private fun createSession(sid: String?) {
        val msg = JSONObject().apply {
            put("type", "session.create")
            sid?.let { put("sessionId", it) }
            put("config", JSONObject().apply {
                if (voice.isNotBlank()) {
                    put("voice", voice)
                }
                put("sampleRate", sampleRate)
                put("responseFormat", "pcm")
                put("mode", "server_commit")
                put("language", "Chinese")
                put("instructions", AppConfig.qwen3TtsInstructions)
            })
        }
        send(msg)
    }

    /**
     * 发送文本到 TTS 微服务（追加模式）
     * 会话未就绪时自动缓存，就绪后自动发送
     */
    fun appendText(text: String) {
        if (_state.value != State.SESSION_ACTIVE) {
            Log.w(TAG, "TTS 会话未就绪，缓存待发送文本: ${text.take(30)}")
            synchronized(pendingTexts) {
                pendingTexts.add(text)
            }
            return
        }
        val msg = JSONObject().apply {
            put("type", "text.append")
            put("text", text)
        }
        send(msg)
    }

    /**
     * 提交文本缓冲区，触发合成
     * 会话未就绪时标记待提交，就绪后自动触发
     */
    fun commitText() {
        if (_state.value != State.SESSION_ACTIVE) {
            synchronized(pendingTexts) {
                if (pendingTexts.isNotEmpty()) {
                    Log.d(TAG, "TTS 会话未就绪，标记缓存需要提交")
                }
            }
            return
        }
        send(JSONObject().apply { put("type", "text.commit") })
    }

    /**
     * 清空当前缓冲区（用于打断）
     */
    fun clearAndStop() {
        send(JSONObject().apply { put("type", "text.clear") })
        endDuixStream()
        stopAudioPlayback()
    }

    /**
     * 一步到位：发送文本 + 提交
     */
    fun speak(text: String) {
        appendText(text)
        commitText()
    }

    /**
     * 结束会话
     */
    fun finishSession() {
        send(JSONObject().apply { put("type", "session.finish") })
    }

    /**
     * 断开连接并释放资源
     */
    fun disconnect() {
        try {
            finishSession()
            webSocket?.close(1000, "client disconnect")
        } catch (e: Exception) {
            Log.w(TAG, "断开连接异常: ${e.message}")
        }
        cleanup()
        _state.value = State.DISCONNECTED
    }

    fun release() {
        disconnect()
        scope.cancel()
    }

    fun resetPlaybackProgress() {
        _playbackProgress.value = 0f
        finalUtterancePcmBytes = 0
        stopPlaybackPoll()
    }

    // ===================== 内部实现 =====================

    private fun stopPlaybackPoll() {
        playbackPollJob?.cancel()
        playbackPollJob = null
    }

    private fun startPlaybackPoll() {
        stopPlaybackPoll()
        playbackPollJob = scope.launch {
            while (isActive) {
                kotlinx.coroutines.delay(80)
                val track = audioTrack ?: break
                if (track.state != AudioTrack.STATE_INITIALIZED) break

                if (track.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    val headFrames = track.playbackHeadPosition.toLong() and 0xFFFFFFFFL
                    val playedBytes = headFrames * 2L
                    val denom = (if (finalUtterancePcmBytes > 0) finalUtterancePcmBytes else totalPcmBytes)
                        .coerceAtLeast(1)
                        .toLong()
                    _playbackProgress.value = (playedBytes.toFloat() / denom).coerceIn(0f, 0.999f)
                }
            }
        }
    }

    private fun ensureDuixStreamStarted() {
        if (!duixStreamSessionActive && preferStreamPcmForDuix && onDuixPcmChunk != null) {
            duixStreamSessionActive = true
            try {
                onDuixPcmStreamStart?.invoke()
            } catch (e: Exception) {
                Log.e(TAG, "DUIX startPush 失败: ${e.message}")
            }
        }
    }

    private fun endDuixStream() {
        if (!duixStreamSessionActive) return
        duixStreamSessionActive = false
        try {
            onDuixPcmStreamEnd?.invoke()
        } catch (e: Exception) {
            Log.e(TAG, "DUIX stopPush 失败: ${e.message}")
        }
    }

    private fun resetUtterancePlaybackState() {
        _playbackProgress.value = 0f
        finalUtterancePcmBytes = 0
        stopPlaybackPoll()
    }

    /**
     * 会话就绪后，将缓存的待合成文本全部发送并提交
     */
    private fun flushPendingTexts() {
        val textsToSend: List<String>
        synchronized(pendingTexts) {
            textsToSend = pendingTexts.toList()
            pendingTexts.clear()
        }
        if (textsToSend.isEmpty()) return

        Log.i(TAG, "会话就绪，刷送 ${textsToSend.size} 条缓存文本")
        for (text in textsToSend) {
            val msg = JSONObject().apply {
                put("type", "text.append")
                put("text", text)
            }
            send(msg)
        }
        send(JSONObject().apply { put("type", "text.commit") })
    }

    private fun send(json: JSONObject) {
        try {
            webSocket?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "发送消息失败: ${e.message}")
        }
    }

    private fun handleMessage(raw: String) {
        try {
            val json = JSONObject(raw)
            when (json.optString("type")) {
                "session.created" -> {
                    val sid = json.optString("sessionId")
                    _sessionId.value = sid
                    _state.value = State.SESSION_ACTIVE
                    Log.i(TAG, "TTS 会话已创建: sessionId=$sid")
                    // 数字人流式 PCM 与本地扬声器二选一，避免同一路 TTS 听感「双重播放」
                    if (onDuixPcmChunk == null) {
                        initAudioTrack()
                    } else {
                        Log.i(TAG, "已连接数字人流式 PCM，跳过 AudioTrack（仅 DUIX 出声）")
                    }
                    flushPendingTexts()
                }

                "tts.audio_chunk" -> {
                    val audioBase64 = json.optString("audio")
                    if (audioBase64.isNotEmpty()) {
                        processAudioChunk(audioBase64)
                    }
                }

                "tts.transcript_delta" -> {
                    val text = json.optString("text", "")
                    val audioTime = json.optInt("audioTime", 0)
                    val responseId = json.optString("responseId", "")
                    if (text.isNotEmpty()) {
                        _transcriptDelta.tryEmit(TranscriptDelta(text, audioTime, responseId))
                    }
                }

                "tts.response_done" -> {
                    val responseId = json.optString("responseId", "")
                    Log.i(TAG, "TTS 单次合成完成: responseId=$responseId, chunks=$audioChunkCount")
                    finishWavFile()
                    audioChunkCount = 0
                    _responseDone.tryEmit(responseId)
                }

                "tts.session_finished" -> {
                    Log.i(TAG, "TTS 会话已结束")
                    stopAudioPlayback()
                    _state.value = State.CONNECTED
                }

                "tts.clear" -> {
                    Log.i(TAG, "收到 tts.clear，服务端要求中断当前播放")
                    stopAudioPlayback()
                    resetUtterancePlaybackState()
                    audioChunkCount = 0
                }

                // tts-service 在 DashScope session.created 时转发（与本地 session.created 成对出现）
                "tts.session_created" -> {
                    Log.i(
                        TAG,
                        "上游 TTS 会话已创建: dashscopeSessionId=${json.optString("dashscopeSessionId")}"
                    )
                }

                "tts.error", "error" -> {
                    val error = json.optString("error", json.optString("message", "未知TTS错误"))
                    Log.e(TAG, "TTS 错误: $error")
                    _errors.tryEmit(error)
                }

                else -> Log.d(TAG, "TTS 未知消息: ${json.optString("type")}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "解析 TTS 消息失败: ${e.message}")
        }
    }

    /**
     * 处理收到的 PCM 音频块
     * - 若已绑定 [onDuixPcmChunk]：只推数字人，不写 AudioTrack（避免扬声器+数字人双路重音）
     * - 否则：写入 AudioTrack；并缓存 PCM / RMS 供 DUIX 整段 WAV 等逻辑使用
     */
    private fun processAudioChunk(audioBase64: String) {
        try {
            if (audioChunkCount == 0) {
                resetUtterancePlaybackState()
            }
            val pcmData = Base64.decode(audioBase64, Base64.DEFAULT)
            audioChunkCount++

            // 核心修复：只要设置了数字人回调（onDuixPcmChunk），就绝不使用本地 AudioTrack 播音
            // 防止 AudioTrack + DUiX 双重播报
            if (onDuixPcmChunk != null) {
                if (audioTrack != null) {
                    try {
                        audioTrack?.stop()
                        audioTrack?.release()
                    } catch (_: Exception) {
                    }
                    audioTrack = null
                    stopPlaybackPoll()
                    Log.i(TAG, "DETECTED DH SINK: Disabling local AudioTrack playback to prevent double-voice.")
                }
            }

            ensureDuixStreamStarted()
            try {
                onDuixPcmChunk?.invoke(pcmData)
            } catch (e: Exception) {
                Log.e(TAG, "DUIX pushPcm 失败: ${e.message}")
            }

            // 如果没有设置数字人回调，则走本地 AudioTrack 播放。
            // 注意：这里只初始化播放器，实际写入在下方统一执行一次，避免同一个 PCM chunk 双写导致重复播报。
            if (onDuixPcmChunk == null) {
                if (audioTrack == null) {
                    initAudioTrack()
                }
            }
            
            if (onDuixPcmChunk != null) {
                if (audioChunkCount == 1) {
                    _isSpeaking.value = true
                }
            } else {
                audioTrack?.let { track ->
                    if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                        Log.i(TAG, "AudioTrack 开始播放流式音频 ($sampleRate Hz)")
                        track.play()
                        isPlaying.set(true)
                        _isSpeaking.value = true
                        startPlaybackPoll()
                    }
                    val result = track.write(pcmData, 0, pcmData.size)
                    if (result < 0) {
                        Log.e(TAG, "AudioTrack.write 错误: $result")
                    } else if (audioChunkCount % 10 == 0) {
                        Log.v(TAG, "AudioTrack 写入成功: $result bytes (chunk $audioChunkCount)")
                    }
                }
            }

            // 缓存 PCM 到文件（生成 WAV 给 DUIX）
            if (pcmOutputStream == null) {
                startNewWavCache()
            }
            pcmOutputStream?.write(pcmData)
            totalPcmBytes += pcmData.size

            // 计算 RMS 驱动嘴型
            val rms = calculateRms(pcmData)
            _mouthRms.value = rms

        } catch (e: Exception) {
            Log.e(TAG, "处理音频块失败: ${e.message}")
        }
    }

    /**
     * 初始化 AudioTrack（低延迟流式播放）
     */
    private fun initAudioTrack() {
        try {
            audioTrack?.release()
            val minBufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .build()
                )
                .setBufferSizeInBytes(minBufferSize * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            audioTrack?.setVolume(1f)
            Log.i(TAG, "✅ AudioTrack 初始化成功: sampleRate=$sampleRate, bufferSize=${minBufferSize * 2}")
        } catch (e: Exception) {
            Log.e(TAG, "AudioTrack 初始化失败: ${e.message}")
        }
    }

    private fun startNewWavCache() {
        try {
            currentWavFile = File(cacheDir, "DEBUG_QWEN3_${System.currentTimeMillis()}.wav")
            pcmOutputStream = FileOutputStream(currentWavFile!!)
            // 先写 44 字节占位（后面 finishWavFile 时回填 WAV 头）
            pcmOutputStream!!.write(ByteArray(44))
            totalPcmBytes = 0
        } catch (e: Exception) {
            Log.e(TAG, "创建 WAV 缓存失败: ${e.message}")
        }
    }

    /**
     * 合成完成后回填 WAV 头，然后通知 DUIX 引擎
     */
    private fun finishWavFile() {
        try {
            finalUtterancePcmBytes = totalPcmBytes

            pcmOutputStream?.flush()
            pcmOutputStream?.close()
            pcmOutputStream = null

            val wavFile = currentWavFile
            currentWavFile = null
            val pcmLen = totalPcmBytes
            totalPcmBytes = 0

            if (wavFile == null || pcmLen <= 0) {
                wavFile?.delete()
                endDuixStream()
                stopPlaybackPoll()
                _playbackProgress.value = 1f
                _isSpeaking.value = false
                _mouthRms.value = 0f
                return
            }

            RandomAccessFile(wavFile, "rw").use { raf ->
                writeWavHeader(raf, sampleRate, 1, pcmLen)
            }

            Log.i(TAG, "==== TTS DEBUG: QWEN3 WAV SAVED ====")
            Log.i(TAG, "Path: ${wavFile.absolutePath}")
            Log.i(TAG, "Size: $pcmLen bytes PCM")
            Log.i(TAG, "=====================================")

            val useWavForDuix = !preferStreamPcmForDuix || onDuixPcmChunk == null
            if (useWavForDuix) {
                duixAudioSink?.invoke(wavFile.absolutePath)
            } else {
                endDuixStream()
            }

            scope.launch {
                val durationMs = (pcmLen.toLong() * 1000) / (sampleRate * 2)
                kotlinx.coroutines.delay(durationMs + 200)
                stopPlaybackPoll()
                _playbackProgress.value = 1f
                _isSpeaking.value = false
                _mouthRms.value = 0f
            }
        } catch (e: Exception) {
            Log.e(TAG, "完成 WAV 文件失败: ${e.message}")
        }
    }

    private fun writeWavHeader(raf: RandomAccessFile, sampleRate: Int, channels: Int, pcmBytes: Int) {
        val byteRate = sampleRate * channels * 2
        val blockAlign = channels * 2
        raf.seek(0)
        raf.writeBytes("RIFF")
        raf.writeIntLE(pcmBytes + 36)
        raf.writeBytes("WAVE")
        raf.writeBytes("fmt ")
        raf.writeIntLE(16)
        raf.writeShortLE(1)
        raf.writeShortLE(channels)
        raf.writeIntLE(sampleRate)
        raf.writeIntLE(byteRate)
        raf.writeShortLE(blockAlign)
        raf.writeShortLE(16)
        raf.writeBytes("data")
        raf.writeIntLE(pcmBytes)
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

    /**
     * 从 16bit PCM 数据计算 RMS 值（0.0 ~ 1.0）
     */
    private fun calculateRms(pcmData: ByteArray): Float {
        if (pcmData.size < 2) return 0f
        var sum = 0.0
        val sampleCount = pcmData.size / 2
        for (i in 0 until sampleCount) {
            val low = pcmData[i * 2].toInt() and 0xFF
            val high = pcmData[i * 2 + 1].toInt()
            val sample = (high shl 8) or low
            val normalized = sample / 32768.0
            sum += normalized * normalized
        }
        val rms = kotlin.math.sqrt(sum / sampleCount).toFloat()
        // 映射到 0~0.8 范围（TTS 音量通常不会满幅）
        return (rms * 3f).coerceIn(0f, 0.8f)
    }

    private fun stopAudioPlayback() {
        try {
            stopPlaybackPoll()
            endDuixStream()
            audioTrack?.pause()
            audioTrack?.flush()
            isPlaying.set(false)
            _isSpeaking.value = false
            _mouthRms.value = 0f
        } catch (e: Exception) {
            Log.w(TAG, "停止播放异常: ${e.message}")
        }
    }

    private fun cleanup() {
        try {
            stopPlaybackPoll()
            endDuixStream()
            audioTrack?.release()
            audioTrack = null
            pcmOutputStream?.close()
            pcmOutputStream = null
            isPlaying.set(false)
            _isSpeaking.value = false
            _mouthRms.value = 0f
            _playbackProgress.value = 0f
        } catch (e: Exception) {
            Log.w(TAG, "清理资源异常: ${e.message}")
        }
    }
}
