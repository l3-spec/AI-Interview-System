package com.xlwl.AiMian.ai.realtime

import android.content.Context
import android.util.Log
import com.example.v0clone.config.AppConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

/**
 * 火山引擎 TTS 服务
 * 文档: https://www.volcengine.com/docs/tts/11960
 */
class VolcanoTtsService(private val context: Context) {

    companion object {
        private const val TAG = "VolcanoTtsService"


        private const val DEFAULT_FORMAT = "wav"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_SPEED = 1.0f
        private const val DEFAULT_PITCH = 1.0f
        private const val DEFAULT_VOLUME = 1.0f
    }

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    // =============================================================
    // 公开 API
    // =============================================================

    suspend fun synthesizeSpeech(text: String, voice: String? = null): File {
        return synthesizeWithViseme(text, voice ?: AppConfig.ttsVoice).audioFile
    }

    suspend fun synthesizeWithViseme(
        text: String,
        voice: String? = null
    ): TtsResult = withContext(Dispatchers.IO) {
        val finalVoice = voice ?: AppConfig.ttsVoice
        val cleanText = text.trim().take(500)
        if (cleanText.isEmpty()) {
            throw IllegalArgumentException("TTS文本不能为空")
        }

        val appId = AppConfig.volcanoAppId
        val apiKey = AppConfig.volcanoApiKey

        Log.d(TAG, "Volcano TTS 配置检查: appId=${appId.takeIf { it.isNotBlank() }?.take(6)?.padEnd(6, '*') ?: "未填"}, apiKey=${if (apiKey.isNotBlank()) "已填(${apiKey.length}字符)" else "未填"}")

        if (appId.isBlank() || appId == "your_app_id_here" || apiKey.isBlank() || apiKey == "your_api_key_here") {
            val errMsg = "Volcano TTS 未完成配置: appId=${if (appId.isBlank()) "空" else appId.take(8)+"..."}, apiKey=${if (apiKey.isBlank()) "空" else "已填"}"
            Log.e(TAG, errMsg)
            throw IllegalStateException(errMsg)
        }

        val requestBody = JSONObject().apply {
            put("appid", appId)
            put("text", cleanText)
            put("voice", finalVoice)
            put("format", DEFAULT_FORMAT)
            put("sample_rate", DEFAULT_SAMPLE_RATE)
            put("speed", DEFAULT_SPEED)
            put("pitch", DEFAULT_PITCH)
            put("volume", DEFAULT_VOLUME)
            put("enable_viseme", true)
            put("viseme_mode", "cv")
        }

        // Bearer Token 认证（Token 就是 API Key）
        val authHeader = "Bearer $apiKey"
        val url = "https://${AppConfig.volcanoTtsHost}${AppConfig.volcanoTtsPath}"

        Log.d(TAG, "Volcano TTS 请求: $url")

        val request = Request.Builder()
            .url(url)
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .header("Authorization", authHeader)
            .header("Content-Type", "application/json")
            .build()

        val response = httpClient.newCall(request).execute()
        val statusCode = response.code
        val errorBody = response.body?.string()?.take(200) ?: ""

        if (statusCode == 404) {
            Log.e(TAG, "Volcano TTS 404 — 请确认: 1) TTS服务已开通 2) 集群地址正确(当前: ${AppConfig.volcanoTtsHost}) 3) appId正确，当前appId=$appId")
            throw IllegalStateException("Volcano TTS 404: 服务未找到，请确认 TTS 服务已开通并检查 appId")
        }

        if (statusCode == 401 || statusCode == 403) {
            Log.e(TAG, "Volcano TTS 认证失败 HTTP $statusCode: appId=$appId, errorBody=$errorBody")
            throw RuntimeException("Volcano TTS 认证失败 HTTP $statusCode: 请检查 appId 和 apiKey 是否正确")
        }

        if (!response.isSuccessful) {
            Log.e(TAG, "Volcano TTS 失败 HTTP $statusCode: $errorBody")
            throw RuntimeException("Volcano TTS 调用失败: HTTP $statusCode, $errorBody")
        }

        val bytes = response.body?.bytes() ?: throw RuntimeException("TTS响应为空")
        if (bytes.isEmpty()) throw RuntimeException("TTS响应为空字节")

        val suffix = DEFAULT_FORMAT
        val debugDir = context.getExternalFilesDir("tts_debug") ?: File(context.cacheDir, "tts_debug")
        if (!debugDir.exists()) debugDir.mkdirs()
        val audioFile = File(debugDir, "DEBUG_VOLCANO_${System.currentTimeMillis()}.$suffix")
        FileOutputStream(audioFile).use { it.write(bytes) }

        Log.i(TAG, "==== TTS DEBUG: VOLCANO WAV SAVED ====")
        Log.i(TAG, "Path: ${audioFile.absolutePath}")
        Log.i(TAG, "Size: ${bytes.size} bytes")
        Log.i(TAG, "=======================================")

        TtsResult(
            audioFile = audioFile,
            visemeTimeline = generateVisemeTimeline(cleanText, bytes.size),
            durationMs = (audioFile.length() * 8 / DEFAULT_SAMPLE_RATE / 16).toLong()
        )
    }

    // =============================================================
    // Viseme 近似时间轴
    // =============================================================

    private fun generateVisemeTimeline(text: String, audioBytes: Int): List<VisemeEvent> {
        val events = mutableListOf<VisemeEvent>()
        if (text.isEmpty()) return events

        val estimatedMs = (audioBytes * 8 / DEFAULT_SAMPLE_RATE / 16).toLong()
        val msPerChar = (estimatedMs.toFloat() / text.length).coerceIn(50f, 300f)

        var currentTime = 0L
        for (c in text) {
            val visemeId = guessVisemeForChar(c)
            val duration = estimateDuration(c, msPerChar.toLong())

            if (events.isNotEmpty() && events.last().visemeId == visemeId) {
                val last = events.last()
                events[events.lastIndex] = last.copy(duration = last.duration + duration, endTime = last.endTime + duration)
            } else {
                events.add(VisemeEvent(visemeId, currentTime, duration, currentTime + duration))
            }
            currentTime += duration
        }
        return events
    }

    private fun guessVisemeForChar(c: Char): Int = when {
        c.isWhitespace() || c in "，。、！？；：" -> 0
        c in "pbmp" -> 1
        c in "fv" -> 2
        c in "zcsdtnl" -> 3
        c == 'r' -> 4
        c in "gkh" -> 5
        c in "jqx" -> 6
        c == 'a' -> 7
        c == 'o' -> 8
        c == 'e' -> 9
        c in "iuü" -> 10
        else -> 3
    }

    private fun estimateDuration(c: Char, base: Long): Long = when {
        c.isWhitespace() -> (base * 0.5).toLong()
        c in "，。、！？；：" -> (base * 1.5).toLong()
        c in "aeiou" -> (base * 1.2).toLong()
        else -> base
    }

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
