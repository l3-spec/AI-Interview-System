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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Qwen3 TTS WebSocket 客户端
 *
 * 直连 TTS 微服务（ws://host:3003/ws/tts），实现双轨混合流式语音合成。
 *
 * 协议流程：
 *   1. 连接成功后发送 session.create（含 voice / sampleRate / instructions 等配置）
 *   2. 收到 session.created → 就绪
 *   3. 后端通过 Redis 或客户端直接发送 text.append + text.commit
 *   4. 收到 tts.audio_chunk（Base64 PCM）→ 写入 AudioTrack 或保存 WAV
 *   5. 收到 tts.response_done → 单次合成完成
 *   6. 发送 session.finish 关闭会话
 */
class Qwen3TtsWsClient(
    private val cacheDir: File,
    private val sampleRate: Int = 24000,
    private val voice: String = "Cherry",
    private val instructions: String = "语气专业沉稳，公正严肃但不失礼貌，像一位经验丰富的面试官。"
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

    /** 是否正在播放音频 */
    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    /** 实时 RMS 值（用于驱动数字人嘴型，0.0~1.0） */
    private val _mouthRms = MutableStateFlow(0f)
    val mouthRms: StateFlow<Float> = _mouthRms.asStateFlow()

    private var webSocket: WebSocket? = null
    private var audioTrack: AudioTrack? = null
    private val isPlaying = AtomicBoolean(false)
    private var audioChunkCount = 0

    // WAV 缓存（供 DUIX 引擎使用）
    private var currentWavFile: File? = null
    private var pcmOutputStream: FileOutputStream? = null
    private var totalPcmBytes = 0

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
                put("voice", voice)
                put("sampleRate", sampleRate)
                put("responseFormat", "pcm")
                put("mode", "server_commit")
                put("language", "Auto")
                put("instructions", instructions)
            })
        }
        send(msg)
    }

    /**
     * 发送文本到 TTS 微服务（追加模式）
     */
    fun appendText(text: String) {
        if (_state.value != State.SESSION_ACTIVE) {
            Log.w(TAG, "TTS 会话未就绪，暂存文本: ${text.take(20)}")
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
     */
    fun commitText() {
        if (_state.value != State.SESSION_ACTIVE) return
        send(JSONObject().apply { put("type", "text.commit") })
    }

    /**
     * 清空当前缓冲区（用于打断）
     */
    fun clearAndStop() {
        send(JSONObject().apply { put("type", "text.clear") })
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

    // ===================== 内部实现 =====================

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
                    initAudioTrack()
                }

                "tts.audio_chunk" -> {
                    val audioBase64 = json.optString("audio")
                    if (audioBase64.isNotEmpty()) {
                        processAudioChunk(audioBase64)
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
     * 1. 写入 AudioTrack 实时播放
     * 2. 缓存 PCM 数据用于生成 WAV（DUIX 需要）
     * 3. 计算 RMS 驱动嘴型
     */
    private fun processAudioChunk(audioBase64: String) {
        try {
            val pcmData = Base64.decode(audioBase64, Base64.DEFAULT)
            audioChunkCount++

            // 写入 AudioTrack 实时播放
            audioTrack?.let { track ->
                if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                    track.play()
                    isPlaying.set(true)
                    _isSpeaking.value = true
                }
                track.write(pcmData, 0, pcmData.size)
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
            Log.i(TAG, "AudioTrack 初始化成功: sampleRate=$sampleRate, bufferSize=${minBufferSize * 2}")
        } catch (e: Exception) {
            Log.e(TAG, "AudioTrack 初始化失败: ${e.message}")
        }
    }

    private fun startNewWavCache() {
        try {
            currentWavFile = File(cacheDir, "qwen3_tts_${System.currentTimeMillis()}.wav")
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
            pcmOutputStream?.flush()
            pcmOutputStream?.close()
            pcmOutputStream = null

            val wavFile = currentWavFile ?: return
            if (totalPcmBytes <= 0) {
                wavFile.delete()
                return
            }

            // 回填 WAV 头
            RandomAccessFile(wavFile, "rw").use { raf ->
                writeWavHeader(raf, sampleRate, 1, totalPcmBytes)
            }

            Log.i(TAG, "WAV 文件已生成: ${wavFile.absolutePath} (${totalPcmBytes} bytes PCM)")

            // 通知 DUIX 引擎播放（唇形同步）
            duixAudioSink?.invoke(wavFile.absolutePath)

            // 等待播放完成后标记说话结束
            scope.launch {
                val durationMs = (totalPcmBytes.toLong() * 1000) / (sampleRate * 2)
                kotlinx.coroutines.delay(durationMs + 200)
                _isSpeaking.value = false
                _mouthRms.value = 0f
            }

            currentWavFile = null
            totalPcmBytes = 0
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
            audioTrack?.release()
            audioTrack = null
            pcmOutputStream?.close()
            pcmOutputStream = null
            isPlaying.set(false)
            _isSpeaking.value = false
            _mouthRms.value = 0f
        } catch (e: Exception) {
            Log.w(TAG, "清理资源异常: ${e.message}")
        }
    }
}
