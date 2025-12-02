package com.xlwl.AiMian.ai.realtime.volc

import android.content.Context
import android.util.Log
import com.bytedance.speech.speechengine.SpeechEngine
import com.bytedance.speech.speechengine.SpeechEngineDefines
import com.bytedance.speech.speechengine.SpeechEngineGenerator
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import kotlin.math.abs

/**
 * 火山引擎语音识别与VAD管理器
 *
 * - 负责编排 SpeechEngine 的生命周期
 * - 暴露部分/最终识别结果以及 VAD 事件
 * - 支持客户端本地 VAD 判断和音量回调
 */
class VolcAsrManager(private val context: Context) : SpeechEngine.SpeechListener {

    data class Credentials(
        val appId: String,
        val token: String,
        val cluster: String,
        val address: String? = null,
        val uri: String? = null,
        val resourceId: String? = null,
        val language: String? = null,
        val reqParamsJson: String? = null,
        val vadStartSilenceMs: Int? = null,
        val vadEndSilenceMs: Int? = null
    )

    data class AsrResult(
        val text: String,
        val isFinal: Boolean,
        val raw: JSONObject? = null
    )

    enum class VadState { IDLE, SPEAKING, SILENCE }

    private var engine: SpeechEngine? = null
    private var isEngineReady = false
    private var isSessionActive = false
    private var lastCredentials: Credentials? = null
    private var currentSessionId: String? = null
    private var currentUid: String? = null
    private var sampleRate: Int = DEFAULT_SAMPLE_RATE

    private val _partialText = MutableStateFlow("")
    val partialText: StateFlow<String> = _partialText.asStateFlow()

    private val _finalResults = MutableSharedFlow<AsrResult>(
        replay = 0,
        extraBufferCapacity = 8,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val finalResults: SharedFlow<AsrResult> = _finalResults.asSharedFlow()

    private val _vadState = MutableStateFlow(VadState.IDLE)
    val vadState: StateFlow<VadState> = _vadState.asStateFlow()

    private val _volumeLevel = MutableStateFlow(0f)
    val volumeLevel: StateFlow<Float> = _volumeLevel.asStateFlow()

    private val _errors = MutableSharedFlow<String>(
        replay = 0,
        extraBufferCapacity = 4,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    fun prepareEnvironment() {
        SpeechEngineGenerator.PrepareEnvironment(context.applicationContext, null)
    }

    private fun ensureEngine() {
        if (engine != null) return
        val instance = SpeechEngineGenerator.getInstance()
        instance.createEngine()
        instance.setListener(this)
        engine = instance
    }

    /**
     * 配置火山引擎 ASR SDK。相同配置会被复用。
     */
    fun configure(credentials: Credentials) {
        if (lastCredentials == credentials && isEngineReady) {
            return
        }

        // 如果已有引擎则销毁后重新获取，避免遗留状态
        if (engine != null && isEngineReady) {
            try {
                engine?.destroyEngine()
            } catch (ignored: Exception) {
            }
            engine = null
            isEngineReady = false
        }

        prepareEnvironment()
        ensureEngine()
        val speechEngine = engine ?: run {
            _errors.tryEmit("ASR引擎实例创建失败")
            return
        }

        lastCredentials = credentials
        currentUid = null
        currentSessionId = null

        try {
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_ENGINE_NAME_STRING,
                SpeechEngineDefines.ASR_ENGINE
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_APP_ID_STRING,
                credentials.appId
            )
            val rawToken = credentials.token.trim()
            val tokenBody = when {
                rawToken.startsWith("Bearer;") -> rawToken.removePrefix("Bearer;").trim()
                rawToken.startsWith("Bearer ") -> rawToken.removePrefix("Bearer ").trim()
                else -> rawToken
            }
            // 火山SDK要求initEngine阶段传入纯token（无Bearer前缀），详见TOKEN_FORMAT_FIX.md
            val tokenForEngine = tokenBody
            val tokenPreview = when {
                tokenForEngine.isBlank() -> "<empty>"
                tokenForEngine.length <= 12 -> tokenForEngine
                else -> tokenForEngine.take(12) + "..."
            }
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_APP_TOKEN_STRING,
                tokenForEngine
            )
            Log.d(
                TAG,
                "设置ASR AppToken: preview=$tokenPreview, length=${tokenForEngine.length}"
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_ASR_ADDRESS_STRING,
                credentials.address ?: DEFAULT_ADDRESS
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_ASR_URI_STRING,
                credentials.uri ?: DEFAULT_URI
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_ASR_CLUSTER_STRING,
                credentials.cluster
            )
            credentials.resourceId?.takeIf { it.isNotBlank() }?.let {
                speechEngine.setOptionString(
                    SpeechEngineDefines.PARAMS_KEY_RESOURCE_ID_STRING,
                    it
                )
            }
            credentials.language?.takeIf { it.isNotBlank() }?.let {
                speechEngine.setOptionString(
                    SpeechEngineDefines.PARAMS_KEY_ASR_LANGUAGE_STRING,
                    it
                )
            }

            // 默认开启标点、语句返回
            speechEngine.setOptionBoolean(
                SpeechEngineDefines.PARAMS_KEY_ASR_SHOW_PUNC_BOOL,
                true
            )
            speechEngine.setOptionBoolean(
                SpeechEngineDefines.PARAMS_KEY_ASR_SHOW_UTTER_BOOL,
                true
            )
            speechEngine.setOptionBoolean(
                SpeechEngineDefines.PARAMS_KEY_ENABLE_GET_VOLUME_BOOL,
                true
            )

            credentials.reqParamsJson?.takeIf { it.isNotBlank() }?.let {
                speechEngine.setOptionString(
                    SpeechEngineDefines.PARAMS_KEY_ASR_REQ_PARAMS_STRING,
                    it
                )
            }

            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_ASR_VAD_START_SILENCE_TIME_INT,
                credentials.vadStartSilenceMs ?: DEFAULT_VAD_START_MS
            )
            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_ASR_VAD_END_SILENCE_TIME_INT,
                credentials.vadEndSilenceMs ?: DEFAULT_VAD_END_MS
            )

            // 统一按照 16k 单声道 20ms 数据包推送
            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_CHANNEL_NUM_INT,
                1
            )
            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_ASR_PACKAGE_SIZE_INT,
                PACKAGE_SIZE_BYTES
            )

            val initCode = speechEngine.initEngine()
            if (initCode == SpeechEngineDefines.ERR_NO_ERROR) {
                speechEngine.setContext(context.applicationContext)
                isEngineReady = true
            } else {
                _errors.tryEmit("ASR引擎初始化失败: $initCode")
                Log.e(TAG, "initEngine failed: $initCode")
            }
        } catch (e: Exception) {
            Log.e(TAG, "配置ASR引擎失败", e)
            _errors.tryEmit("配置ASR引擎失败: ${e.message}")
        }
    }

    /**
     * 启动一次新的识别会话
     */
    fun startSession(
        sessionId: String = UUID.randomUUID().toString(),
        uid: String = sessionId,
        sampleRate: Int = DEFAULT_SAMPLE_RATE
    ) {
        val speechEngine = engine
        if (speechEngine == null || !isEngineReady) {
            _errors.tryEmit("ASR引擎尚未准备好")
            return
        }

        currentSessionId = sessionId
        currentUid = uid
        this.sampleRate = sampleRate

        try {
            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_SAMPLE_RATE_INT,
                sampleRate
            )
            speechEngine.setOptionInt(
                SpeechEngineDefines.PARAMS_KEY_UP_CHANNEL_NUM_INT,
                1
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_UID_STRING,
                uid
            )
            speechEngine.setOptionString(
                SpeechEngineDefines.PARAMS_KEY_START_ENGINE_PAYLOAD_STRING,
                buildStartPayload(sessionId, uid, sampleRate)
            )

            val startCode = speechEngine.sendDirective(
                SpeechEngineDefines.DIRECTIVE_START_ENGINE,
                ""
            )
            if (startCode != SpeechEngineDefines.ERR_NO_ERROR) {
                _errors.tryEmit("ASR引擎启动失败: $startCode")
                Log.e(TAG, "DIRECTIVE_START_ENGINE failed: $startCode")
                return
            }

            val sessionCode = speechEngine.sendDirective(
                SpeechEngineDefines.DIRECTIVE_EVENT_START_SESSION,
                JSONObject(mapOf("reqid" to sessionId)).toString()
            )
            if (sessionCode != SpeechEngineDefines.ERR_NO_ERROR) {
                _errors.tryEmit("ASR会话启动失败: $sessionCode")
                Log.e(TAG, "DIRECTIVE_EVENT_START_SESSION failed: $sessionCode")
                return
            }

            isSessionActive = true
            _vadState.value = VadState.IDLE
            _partialText.value = ""
            Log.d(TAG, "ASR session started: $sessionId")
        } catch (e: Exception) {
            Log.e(TAG, "启动ASR会话失败", e)
            _errors.tryEmit("启动ASR会话失败: ${e.message}")
        }
    }

    /**
     * 传入PCM音频数据
     */
    fun feedAudio(data: ByteArray, length: Int = data.size) {
        val speechEngine = engine ?: return
        if (!isSessionActive || length <= 0) return

        val result = try {
            speechEngine.feedAudio(data, length)
        } catch (e: Exception) {
            Log.e(TAG, "ASR读取音频失败", e)
            ERR_UNKNOWN_RESULT
        }

        if (result != SpeechEngineDefines.ERR_NO_ERROR) {
            Log.w(TAG, "feedAudio non-zero result: $result")
        }
    }

    /**
     * 结束当前识别会话
     */
    fun stopSession() {
        if (!isSessionActive) return
        val speechEngine = engine ?: return

        try {
            speechEngine.sendDirective(
                SpeechEngineDefines.DIRECTIVE_EVENT_FINISH_SESSION,
                ""
            )
            speechEngine.sendDirective(
                SpeechEngineDefines.DIRECTIVE_STOP_ENGINE,
                ""
            )
        } catch (e: Exception) {
            Log.e(TAG, "停止ASR会话失败", e)
        } finally {
            isSessionActive = false
            _vadState.value = VadState.IDLE
            _partialText.value = ""
            Log.d(TAG, "ASR session stopped")
        }
    }

    fun release() {
        stopSession()
        try {
            engine?.destroyEngine()
        } catch (ignored: Exception) {
        }
        engine = null
        isEngineReady = false
        lastCredentials = null
    }

    override fun onSpeechMessage(type: Int, data: ByteArray, len: Int) {
        when (type) {
            SpeechEngineDefines.MESSAGE_TYPE_PARTIAL_RESULT,
            SpeechEngineDefines.MESSAGE_TYPE_ALL_PARTIAL_RESULT -> {
                parseResult(data, len, isFinalHint = false)?.let { result ->
                    _partialText.value = result.text
                }
            }

            SpeechEngineDefines.MESSAGE_TYPE_FINAL_RESULT -> {
                val result = parseResult(data, len, isFinalHint = true)
                if (result != null && result.text.isNotBlank()) {
                    _partialText.value = ""
                    _finalResults.tryEmit(result.copy(isFinal = true))
                }
                stopSession()
            }

            SpeechEngineDefines.MESSAGE_TYPE_VAD_BEGIN -> {
                _vadState.value = VadState.SPEAKING
                Log.d(TAG, "VAD begin")
            }

            SpeechEngineDefines.MESSAGE_TYPE_VAD_END,
            SpeechEngineDefines.MESSAGE_TYPE_VAD_REAL_END -> {
                _vadState.value = VadState.SILENCE
                Log.d(TAG, "VAD end")
            }

            SpeechEngineDefines.MESSAGE_TYPE_VOLUME_LEVEL -> {
                parseVolumeLevel(data, len)
            }

            SpeechEngineDefines.MESSAGE_TYPE_ENGINE_ERROR -> {
                val payload = safeDecode(data, len)
                val message = payload ?: "ASR引擎错误: $type"
                _errors.tryEmit(message)
                Log.e(TAG, "Engine error: $message")
            }

            else -> {
                if (len > 0) {
                    val preview = safeDecode(data, len)
                    Log.v(TAG, "Unhandled speech message type=$type payload=${preview?.take(128)}")
                } else {
                    Log.v(TAG, "Unhandled speech message type=$type len=$len")
                }
            }
        }
    }

    private fun parseVolumeLevel(data: ByteArray, len: Int) {
        if (len <= 0) return
        val level = try {
            when {
                len >= 4 -> {
                    val floatVal = ByteBuffer.wrap(data, 0, 4)
                        .order(ByteOrder.LITTLE_ENDIAN)
                        .float
                    abs(floatVal)
                }
                len >= 2 -> {
                    val shortVal = ByteBuffer.wrap(data, 0, 2)
                        .order(ByteOrder.LITTLE_ENDIAN)
                        .short
                    abs(shortVal / 32768f)
                }
                else -> {
                    abs(data[0].toInt()) / 127f
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "解析音量失败", e)
            return
        }
        _volumeLevel.value = level.coerceIn(0f, 1f)
    }

    private fun parseResult(data: ByteArray, len: Int, isFinalHint: Boolean): AsrResult? {
        val payload = safeDecode(data, len) ?: return null
        if (!payload.startsWith("{") && !payload.startsWith("[")) {
            return null
        }

        return try {
            val json = JSONObject(payload)
            val sequence = json.optInt("sequence", 0)
            val resultArray = json.optJSONArray("result")

            var text = json.optString("text").orEmpty()
            var utterances: JSONArray? = null

            if (resultArray != null && resultArray.length() > 0) {
                val first = resultArray.optJSONObject(0)
                if (first != null) {
                    if (text.isBlank()) {
                        text = first.optString("text").orEmpty()
                    }
                    utterances = first.optJSONArray("utterances")
                }
            }

            if ((text.isBlank() || text == "null") && utterances != null && utterances.length() > 0) {
                val builder = StringBuilder()
                for (i in 0 until utterances.length()) {
                    val utter = utterances.optJSONObject(i) ?: continue
                    builder.append(utter.optString("text").orEmpty())
                }
                text = builder.toString()
            }

            var isFinal = isFinalHint || sequence < 0
            if (!isFinal && utterances != null) {
                for (i in 0 until utterances.length()) {
                    val utter = utterances.optJSONObject(i) ?: continue
                    if (utter.optBoolean("definite", false)) {
                        isFinal = true
                        break
                    }
                }
            }

            AsrResult(
                text = text.trim(),
                isFinal = isFinal,
                raw = json
            )
        } catch (e: Exception) {
            Log.e(TAG, "解析ASR结果失败", e)
            null
        }
    }

    private fun safeDecode(data: ByteArray, len: Int): String? {
        return try {
            if (len <= 0) return null
            String(data, 0, len, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.w(TAG, "Payload decode failed", e)
            null
        }
    }

    private fun buildStartPayload(sessionId: String, uid: String, rate: Int): String {
        val baseParams = JSONObject().apply {
            put("reqid", sessionId)
            put("workflow", "audio_in,resample,partition,vad,fe,decode")
            put("sequence", 1)
            put("nbest", 1)
            put("show_utterances", true)
            put("vad_signal", false)
        }

        val customParams = lastCredentials?.reqParamsJson
            ?.takeIf { it.isNotBlank() }
            ?.let {
                runCatching { JSONObject(it) }.getOrNull()
            }

        val request = JSONObject(baseParams.toString())
        if (customParams != null) {
            val iterator = customParams.keys()
            while (iterator.hasNext()) {
                val key = iterator.next() as? String ?: continue
                request.putOpt(key, customParams.opt(key))
            }
        }

        return JSONObject().apply {
            put("app", JSONObject().apply {
                put("appid", lastCredentials?.appId)
                put("token", lastCredentials?.token)
                put("cluster", lastCredentials?.cluster ?: DEFAULT_CLUSTER)
            })
            put("user", JSONObject().apply {
                put("uid", uid)
            })
            put("audio", JSONObject().apply {
                put("format", "pcm")
                put("codec", "raw")
                put("rate", rate)
                put("bits", 16)
                put("channel", 1)
                put("language", lastCredentials?.language ?: DEFAULT_LANGUAGE)
            })
            put("request", request)
        }.toString()
    }

    companion object {
        private const val TAG = "VolcAsrManager"
        private const val DEFAULT_ADDRESS = "wss://openspeech.bytedance.com"
        private const val DEFAULT_URI = "/api/v2/asr"
        private const val DEFAULT_CLUSTER = "volcengine_streaming_common"
        private const val DEFAULT_LANGUAGE = "zh-CN"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_VAD_START_MS = 250
        private const val DEFAULT_VAD_END_MS = 600
        private const val PACKAGE_SIZE_BYTES = 640 // 20ms @16k mono 16-bit
        private const val ERR_UNKNOWN_RESULT = -1
    }
}
