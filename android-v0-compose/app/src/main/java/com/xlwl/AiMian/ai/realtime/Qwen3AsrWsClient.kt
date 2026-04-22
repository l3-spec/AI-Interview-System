package com.xlwl.AiMian.ai.realtime

import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Qwen3 ASR WebSocket 客户端
 *
 * 直连 ASR 微服务（ws://host:3002/ws/asr），实现实时语音识别。
 *
 * 协议流程：
 *   1. 连接成功后发送 session.create（含 language / sampleRate / vadMode 等配置）
 *   2. 收到 session.created → 就绪
 *   3. 发送 audio.append（Base64 编码 PCM 数据）
 *   4. 收到 asr.partial（实时部分识别结果）
 *   5. 收到 asr.transcription_final 或 asr.transcription_completed（完整识别结果，与 asr-service 一致）
 *   6. 发送 audio.commit（手动模式下手动提交）
 *   7. 发送 session.finish 关闭会话
 *
 * 注意：ASR 微服务支持 server_vad 模式（服务端 VAD），
 * 客户端只需持续推送音频，服务端自动检测语音段落并返回识别结果。
 */
class Qwen3AsrWsClient(
    private val sampleRate: Int = 16000,
    private val language: String = "zh",
    private val vadMode: String = "server_vad"
) {
    companion object {
        private const val TAG = "Qwen3AsrWsClient"
    }

    enum class State { DISCONNECTED, CONNECTING, CONNECTED, SESSION_ACTIVE, CLOSED }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _state = MutableStateFlow(State.DISCONNECTED)
    val state: StateFlow<State> = _state.asStateFlow()

    private val _sessionId = MutableStateFlow<String?>(null)
    val sessionId: StateFlow<String?> = _sessionId.asStateFlow()

    /** 实时部分识别结果 */
    private val _partialResult = MutableStateFlow("")
    val partialResult: StateFlow<String> = _partialResult.asStateFlow()

    /** 完整识别结果（一句话识别完成） */
    data class TranscriptionResult(val text: String, val isFinal: Boolean)
    private val _transcriptionCompleted = MutableSharedFlow<TranscriptionResult>(extraBufferCapacity = 10)
    val transcriptionCompleted: SharedFlow<TranscriptionResult> = _transcriptionCompleted.asSharedFlow()

    /** 语音活动检测事件 */
    private val _speechStarted = MutableSharedFlow<Unit>(extraBufferCapacity = 5)
    val speechStarted: SharedFlow<Unit> = _speechStarted.asSharedFlow()

    private val _speechEnded = MutableSharedFlow<Unit>(extraBufferCapacity = 5)
    val speechEnded: SharedFlow<Unit> = _speechEnded.asSharedFlow()

    /** 错误事件 */
    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 5)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    private var webSocket: WebSocket? = null

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MINUTES)
        .writeTimeout(10, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    /**
     * 连接到 ASR 微服务
     * @param wsUrl WebSocket 地址，如 ws://10.0.2.2:3002/ws/asr
     * @param sid 可选的会话 ID
     */
    fun connect(wsUrl: String, sid: String? = null) {
        if (_state.value == State.CONNECTING || _state.value == State.SESSION_ACTIVE) {
            Log.w(TAG, "ASR 已在连接/活跃状态，忽略重复连接")
            return
        }

        _state.value = State.CONNECTING
        Log.i(TAG, "连接 ASR 微服务: $wsUrl")

        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "ASR WebSocket 已连接")
                _state.value = State.CONNECTED
                createSession(sid)
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "ASR WebSocket 连接失败: ${t.message}")
                _state.value = State.DISCONNECTED
                _errors.tryEmit("ASR连接失败: ${t.message}")
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "ASR WebSocket 已关闭: code=$code, reason=$reason")
                _state.value = State.CLOSED
            }
        })
    }

    private fun createSession(sid: String?) {
        val msg = JSONObject().apply {
            put("type", "session.create")
            sid?.let { put("sessionId", it) }
            put("config", JSONObject().apply {
                put("language", language)
                put("sampleRate", sampleRate)
                put("inputFormat", "pcm")
                put("vadMode", vadMode)
                put("vadSilenceDurationMs", 1500)
            })
        }
        send(msg)
    }

    /**
     * 发送音频数据块（16bit PCM → Base64）
     * 在录音循环中调用
     */
    fun sendAudio(pcmData: ByteArray, offset: Int = 0, length: Int = pcmData.size) {
        if (_state.value != State.SESSION_ACTIVE) return
        val base64 = Base64.encodeToString(pcmData, offset, length, Base64.NO_WRAP)
        val msg = JSONObject().apply {
            put("type", "audio.append")
            put("audio", base64)
        }
        send(msg)
    }

    /**
     * 手动提交音频缓冲区（manual_vad 模式下使用）
     */
    fun commitAudio() {
        if (_state.value != State.SESSION_ACTIVE) return
        send(JSONObject().apply { put("type", "audio.commit") })
    }

    fun finishSession() {
        send(JSONObject().apply { put("type", "session.finish") })
    }

    fun disconnect() {
        try {
            finishSession()
            webSocket?.close(1000, "client disconnect")
        } catch (e: Exception) {
            Log.w(TAG, "断开连接异常: ${e.message}")
        }
        webSocket = null
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
                    Log.i(TAG, "ASR 会话已创建: sessionId=$sid")
                }

                // 实时识别中间结果（asr-service 使用 asr.transcription_partial）
                "asr.partial", "asr.transcription_partial" -> {
                    val part = json.optString("text", "")
                    if (part.isNotEmpty()) {
                        _partialResult.value = part
                    }
                }

                // 完整识别结果（asr-service 使用 asr.transcription_final）
                "asr.transcription_final", "asr.transcription_completed" -> {
                    val finalText = json.optString("text", "")
                    Log.i(TAG, "ASR 识别完成: $finalText")
                    _partialResult.value = ""
                    if (finalText.isNotBlank()) {
                        _transcriptionCompleted.tryEmit(TranscriptionResult(finalText, true))
                    }
                }

                // 语音起始检测
                "asr.speech_started" -> {
                    Log.d(TAG, "ASR 检测到语音起始")
                    _speechStarted.tryEmit(Unit)
                }

                // 语音结束检测（asr-service 使用 asr.speech_stopped）
                "asr.speech_ended", "asr.speech_stopped" -> {
                    Log.d(TAG, "ASR 检测到语音结束")
                    _speechEnded.tryEmit(Unit)
                }

                "asr.error", "error" -> {
                    val error = json.optString("error", json.optString("message", "未知ASR错误"))
                    Log.e(TAG, "ASR 错误: $error")
                    _errors.tryEmit(error)
                }

                "asr.session_finished" -> {
                    Log.i(TAG, "ASR 会话已结束")
                    _state.value = State.CONNECTED
                }

                else -> Log.d(TAG, "ASR 未知消息: ${json.optString("type")}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "解析 ASR 消息失败: ${e.message}")
        }
    }
}
