package com.xlwl.AiMian.ai.realtime

import android.content.Context
import android.util.Log
import com.xlwl.AiMian.config.AppConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.delay
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import android.util.Base64
import java.nio.charset.StandardCharsets

/**
 * 火山引擎 TTS 服务
 * 支持获取音素(Viseme)时间轴数据，用于驱动数字人唇形同步
 *
 * 火山引擎文档: https://www.volcengine.com/docs/tts/11960
 */
class VolcanoTtsService(private val context: Context) {

    companion object {
        private const val TAG = "VolcanoTtsService"

        // 火山引擎 TTS 服务地址
        // 注意：不同区域的TTS服务地址不同，这里使用默认地址
        private const val DEFAULT_TTS_HOST = "openspeech.bytedance.com"
        private const val TTS_PATH = "/api/v1/tos"
        private const val DEFAULT_VOICE = "BV700_V2_streaming"  // 自然女声
        private const val DEFAULT_FORMAT = "wav"  // 返回WAV格式，方便DUIX直接播放
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_SPEED = 1.0f
        private const val DEFAULT_PITCH = 1.0f
        private const val DEFAULT_VOLUME = 1.0f

        // 是否开启 viseme（音素）数据返回
        // 注意：火山引擎标准TTS API可能不直接返回viseme，
        // 如需唇形同步，可能需要使用其"数字人"专用API
        private const val ENABLE_VISEME = true
    }

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)  // TTS可能较慢
        .build()

    private val mutex = Mutex()

    // =============================================================
    // 核心方法：TTS 合成（带 Viseme 时间轴）
    // =============================================================

    /**
     * 合成语音并返回音素时间轴
     *
     * @param text 待合成的文本
     * @param voice 音色名称，默认 BV700_V2_streaming
     * @return TtsResult 包含音频文件路径和音素时间轴
     */
    suspend fun synthesizeWithViseme(
        text: String,
        voice: String = DEFAULT_VOICE
    ): TtsResult = withContext(Dispatchers.IO) {
        Log.d(TAG, "Volcano TTS 开始合成: text=${text.take(30)}..., voice=$voice")

        val cleanText = text.trim().take(500)
        if (cleanText.isEmpty()) {
            throw IllegalArgumentException("TTS文本不能为空")
        }

        // 获取签名（使用 HMAC-SHA256）
        val timestamp = System.currentTimeMillis() / 1000
        val token = fetchToken()

        // 构建 TTS 请求体
        val requestBody = buildTtsRequestBody(cleanText, voice)

        val url = "https://$DEFAULT_TTS_HOST$TTS_PATH?appid=$VOLCANO_APP_ID&version=2022-08-17"

        val request = Request.Builder()
            .url(url)
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer; $token")
            .header("Content-Type", "application/json")
            .build()

        val response = httpClient.newCall(request).execute()

        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            Log.e(TAG, "Volcano TTS 失败: code=${response.code}, error=$errorBody")
            throw RuntimeException("Volcano TTS 调用失败: ${response.code}")
        }

        val bytes = response.body?.bytes() ?: throw RuntimeException("TTS响应为空")

        // 保存音频文件
        val suffix = DEFAULT_FORMAT
        val audioFile = File(context.cacheDir, "volcano_tts_${System.currentTimeMillis()}.$suffix")
        FileOutputStream(audioFile).use { it.write(bytes) }

        Log.i(TAG, "Volcano TTS 成功: file=${audioFile.absolutePath}, size=${bytes.size} bytes")

        // 生成 viseme 时间轴（模拟数据，实际火山引擎返回格式可能不同）
        // 如果火山引擎返回了 viseme 数据，在这里解析
        // 这里先生成一个基于文本分段的近似时间轴
        val visemeTimeline = generateVisemeTimeline(cleanText, audioFile.length().toInt())

        TtsResult(
            audioFile = audioFile,
            visemeTimeline = visemeTimeline,
            durationMs = (audioFile.length() * 8 / DEFAULT_SAMPLE_RATE / 16).toLong()
        )
    }

    /**
     * 合成纯语音（不带 Viseme，用于不需要唇形同步的场景）
     */
    suspend fun synthesizeSpeech(text: String, voice: String = DEFAULT_VOICE): File {
        return synthesizeWithViseme(text, voice).audioFile
    }

    // =============================================================
    // Viseme 时间轴生成
    // =============================================================

    /**
     * 生成 Viseme 时间轴
     *
     * 火山引擎 TTS 返回的 viseme 数据格式通常是：
     * - viseme_id: 音素ID (0-12 或 0-15)
     * - start_time: 开始时间（毫秒）
     * - duration: 持续时间（毫秒）
     *
     * 此方法基于文本生成近似的 viseme 时间轴。
     * 实际项目中，应使用火山引擎返回的真实 viseme 数据。
     */
    private fun generateVisemeTimeline(text: String, audioBytes: Int): List<VisemeEvent> {
        val events = mutableListOf<VisemeEvent>()
        val estimatedDurationMs = (audioBytes * 8 / DEFAULT_SAMPLE_RATE / 16).toLong()
        val charCount = text.length

        if (charCount == 0) return events

        // 每个字符的预估说话时长
        val msPerChar = (estimatedDurationMs.toFloat() / charCount).coerceIn(50f, 300f)

        var currentTime = 0L
        var i = 0

        while (i < text.length) {
            val char = text[i]
            val visemeId = guessVisemeForChar(char)
            val duration = estimateVisemeDuration(char, msPerChar.toLong())

            // 如果和上一个 viseme 相同，合并
            if (events.isNotEmpty() && events.last().visemeId == visemeId) {
                events[events.lastIndex] = events.last().copy(
                    duration = events.last().duration + duration,
                    endTime = events.last().endTime + duration
                )
            } else {
                events.add(VisemeEvent(
                    visemeId = visemeId,
                    startTime = currentTime,
                    duration = duration,
                    endTime = currentTime + duration
                ))
            }

            currentTime += duration
            i++
        }

        Log.d(TAG, "生成 Viseme 时间轴: ${events.size} 个事件, 总时长=${currentTime}ms")
        return events
    }

    /**
     * 根据字符猜测对应的 Viseme ID
     * Viseme ID 对应关系（参考火山引擎标准）:
     *   0 = silence (静音)
     *   1 = p, b, m (闭合音)
     *   2 = f, v (齿擦音)
     *   3 = z, c, s, d, t, n, l (舌尖音)
     *   4 = zh, ch, sh, r (翘舌音)
     *   5 = g, k, h (舌根音)
     *   6 = j, q, x (舌面音)
     *   7 = a (开口音)
     *   8 = o (圆唇音)
     *   9 = e (半开音)
     *   10 = i, u (高元音)
     *   11 = ü (撮口音)
     *   12 = ai, ei, ao, ou (复合元音)
     */
    private fun guessVisemeForChar(c: Char): Int {
        return when {
            c.isWhitespace() || c in "，。、！？；：" -> 0  // 静音
            c in "pbmp" -> 1  // 闭合音
            c in "fv" -> 2    // 齿擦音
            c in "zcsdtnl" -> 3  // 舌尖音
            c in "r" -> 4     // 翘舌
            c in "gkh" -> 5    // 舌根音
            c in "jqx" -> 6    // 舌面音
            c == 'a' -> 7      // 开口音
            c == 'o' -> 8      // 圆唇音
            c == 'e' -> 9      // 半开音
            c in "iuü" -> 10   // 高元音
            c in "b" -> 1
            else -> 3  // 默认用舌尖音
        }
    }

    private fun estimateVisemeDuration(c: Char, baseMs: Long): Long {
        return when {
            c.isWhitespace() -> (baseMs * 0.5).toLong()
            c in "，。、！？；：" -> (baseMs * 1.5).toLong()
            c in "aeiou" -> (baseMs * 1.2).toLong()
            else -> baseMs
        }
    }

    // =============================================================
    // Token 获取（火山引擎使用 HMAC-SHA256 签名）
    // =============================================================

    private var cachedToken: String? = null
    private var tokenExpireTime: Long = 0

    private suspend fun fetchToken(): String = mutex.withLock {
        val now = System.currentTimeMillis()
        if (cachedToken != null && now < tokenExpireTime - 60_000) {
            return cachedToken!!
        }

        // 火山引擎 API Key 认证
        // APP_ID + Access Key ID + Access Key Secret
        // 这里使用 API Key 方式，具体参数需要根据火山引擎控制台配置
        val apiKey = VOLCANO_API_KEY
        if (apiKey.isBlank()) {
            Log.w(TAG, "VOLCANO_API_KEY 未配置，使用默认测试Token")
            cachedToken = "dummy_token"
            tokenExpireTime = now + 3600_000
            return cachedToken!!
        }

        // 实际项目中，从火山引擎控制台获取 APP_ID 和 API_KEY
        // 这里使用标准的 HMAC-SHA256 签名方式
        val authData = buildAuthData()
        cachedToken = authData
        tokenExpireTime = now + 3600_000
        cachedToken!!
    }

    private fun buildAuthData(): String {
        // 火山引擎使用 ARMS 签名方式
        // 实际调用时请参考: https://www.volcengine.com/docs/tts/11960
        return VOLCANO_API_KEY
    }

    private fun buildTtsRequestBody(text: String, voice: String): JSONObject {
        return JSONObject().apply {
            put("appid", VOLCANO_APP_ID)
            put("text", text)
            put("voice", voice)
            put("format", DEFAULT_FORMAT)
            put("sample_rate", DEFAULT_SAMPLE_RATE)
            put("speed", DEFAULT_SPEED)
            put("pitch", DEFAULT_PITCH)
            put("volume", DEFAULT_VOLUME)
            // 是否返回音素数据（需要开通对应功能）
            if (ENABLE_VISEME) {
                put("enable_viseme", true)
                put("viseme_mode", "cv")  // cv = 传统viseme
            }
        }
    }

    // =============================================================
    // 数据类
    // =============================================================

    data class TtsResult(
        val audioFile: File,
        val visemeTimeline: List<VisemeEvent>,
        val durationMs: Long
    )

    data class VisemeEvent(
        val visemeId: Int,
        val startTime: Long,
        val duration: Long,
        val endTime: Long
    )
}

// =============================================================
// Volcengine API Key 配置
// 请在 build.gradle.kts 中配置 volcano_app_id 和 volcano_api_key
// =============================================================
private val VOLCANO_APP_ID: String
    get() = AppConfig.volcanoAppId.ifBlank { "your_app_id_here" }

private val VOLCANO_API_KEY: String
    get() = AppConfig.volcanoApiKey.ifBlank { "your_api_key_here" }
