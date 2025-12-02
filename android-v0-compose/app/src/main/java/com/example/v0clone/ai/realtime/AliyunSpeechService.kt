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
import java.io.IOException
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class AliyunSpeechService(private val context: Context) {
    companion object {
        private const val TAG = "AliyunSpeechService"
        private const val SUCCESS_STATUS = 20000000
    }

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val mutex = Mutex()
    private var cachedConfig: AliyunConfig? = null

    private data class AliyunConfig(
        val token: String,
        val expireTime: Long,
        val appKey: String,
        val region: String,
        val asr: AsrConfig,
        val tts: TtsConfig
    )

    private data class AsrConfig(
        val endpoint: String,
        val format: String,
        val sampleRate: Int,
        val enablePunctuation: String,
        val enableITN: String,
        val enableVAD: String
    )

    private data class TtsConfig(
        val endpoint: String,
        val voice: String,
        val format: String,
        val sampleRate: Int
    )

    private suspend fun fetchConfig(): AliyunConfig {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("${resolveApiBaseUrl()}voice/aliyun-token")
                .get()
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IOException("获取阿里云配置失败: ${response.code}")
                }
                val body = response.body?.string() ?: throw IOException("阿里云配置响应为空")
                val root = JSONObject(body)
                if (!root.optBoolean("success", false)) {
                    val message = root.optString("message", "未知错误")
                    throw IOException(message)
                }
                val data = root.getJSONObject("data")
                val asrJson = data.getJSONObject("asr")
                val ttsJson = data.getJSONObject("tts")
                AliyunConfig(
                    token = data.getString("token"),
                    expireTime = data.getLong("expireTime"),
                    appKey = data.getString("appKey"),
                    region = data.getString("region"),
                    asr = AsrConfig(
                        endpoint = asrJson.getString("endpoint"),
                        format = asrJson.getString("format"),
                        sampleRate = asrJson.getInt("sampleRate"),
                        enablePunctuation = asrJson.optString("enablePunctuation", "true"),
                        enableITN = asrJson.optString("enableITN", "true"),
                        enableVAD = asrJson.optString("enableVAD", "false"),
                    ),
                    tts = TtsConfig(
                        endpoint = ttsJson.getString("endpoint"),
                        voice = ttsJson.getString("voice"),
                        format = ttsJson.getString("format"),
                        sampleRate = ttsJson.getInt("sampleRate"),
                    ),
                )
            }
        }
    }

    private fun resolveApiBaseUrl(): String {
        val base = AppConfig.apiBaseUrl.trim()
        if (base.contains("/api/")) {
            return ensureTrailingSlash(base)
        }
        val withApi = if (base.endsWith("/")) base + "api/" else "$base/api/"
        return ensureTrailingSlash(withApi)
    }

    private fun ensureTrailingSlash(url: String): String = if (url.endsWith('/')) url else "$url/"

    private suspend fun ensureConfig(force: Boolean = false): AliyunConfig {
        return mutex.withLock {
            val now = System.currentTimeMillis()
            if (!force) {
                val cached = cachedConfig
                if (cached != null && now < cached.expireTime - 60_000) {
                    return cached
                }
            }
            val fresh = fetchConfig()
            cachedConfig = fresh
            fresh
        }
    }

    suspend fun recognizePcm(audioData: ByteArray): String {
        if (audioData.isEmpty()) {
            return ""
        }
        val config = ensureConfig()
        Log.d(TAG, "ASR开始: endpoint=${config.asr.endpoint}, format=${config.asr.format}, sampleRate=${config.asr.sampleRate}, bytes=${audioData.size}")
        val params = mutableListOf(
            "appkey=${config.appKey}",
            "format=${config.asr.format}",
            "sample_rate=${config.asr.sampleRate}",
            "enable_punctuation_prediction=${config.asr.enablePunctuation}",
            "enable_inverse_text_normalization=${config.asr.enableITN}"
        )
        if (config.asr.enableVAD.equals("true", ignoreCase = true)) {
            params += "enable_voice_detection=true"
        }
        val url = config.asr.endpoint + "?" + params.joinToString("&")
        val requestBody = audioData.toRequestBody("application/octet-stream".toMediaType())

        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(url)
                .post(requestBody)
                .header("X-NLS-Token", config.token)
                .build()

            httpClient.newCall(request).execute().use { response ->
                val respBody = response.body?.string() ?: throw IOException("ASR响应为空")
                if (!response.isSuccessful) {
                    Log.e(TAG, "ASR失败: code=${response.code}, body=$respBody")
                    throw IOException("阿里云ASR调用失败: ${response.code}")
                }
                val json = JSONObject(respBody)
                val status = json.optInt("status")
                if (status != SUCCESS_STATUS) {
                    val message = json.optString("message", json.optString("msg", "识别失败"))
                    throw IOException(message)
                }
                val result = json.optString("result", "")
                Log.d(TAG, "ASR成功: text=$result")
                result
            }
        }
    }

    suspend fun synthesizeSpeech(text: String, retryCount: Int = 0): File {
        val config = ensureConfig(force = retryCount > 0) // 如果是重试，强制刷新配置
        
        Log.d(TAG, "TTS开始 (尝试${retryCount + 1}次): endpoint=${config.tts.endpoint}, voice=${config.tts.voice}, format=${config.tts.format}, textLen=${text.length}")
        
        // 清理文本，移除可能导致问题的特殊字符
        val cleanText = text.trim().take(500) // 限制最大长度为500字符
        if (cleanText.isEmpty()) {
            throw IOException("TTS文本为空")
        }
        
        val payload = JSONObject().apply {
            put("appkey", config.appKey)
            put("text", cleanText)
            put("format", config.tts.format)
            put("sample_rate", config.tts.sampleRate)
            put("voice", config.tts.voice)
        }
        
        Log.d(TAG, "TTS请求payload: ${payload.toString().take(200)}...")

        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(config.tts.endpoint)
                .post(payload.toString().toRequestBody("application/json".toMediaType()))
                .header("X-NLS-Token", config.token)
                .header("Content-Type", "application/json")
                .build()

            httpClient.newCall(request).execute().use { response ->
                val bytes = response.body?.bytes() ?: throw IOException("TTS响应为空")
                
                if (!response.isSuccessful) {
                    val errorBody = String(bytes)
                    Log.e(TAG, "❌ TTS失败: code=${response.code}, headers=${response.headers}, body=$errorBody")
                    
                    // 如果是400错误且未重试过，尝试重新获取token并重试
                    if (response.code == 400 && retryCount < 2) {
                        Log.w(TAG, "⚠️ TTS返回400错误，可能是token过期，尝试重新获取token并重试...")
                        delay(500) // 短暂延迟
                        return@withContext synthesizeSpeech(text, retryCount + 1)
                    }
                    
                    // 尝试解析错误信息
                    val errorMessage = try {
                        val errorJson = JSONObject(errorBody)
                        errorJson.optString("message", errorJson.optString("msg", "未知错误"))
                    } catch (e: Exception) {
                        errorBody.take(200)
                    }
                    
                    throw IOException("阿里云TTS调用失败: ${response.code} - $errorMessage")
                }
                
                // 检查返回的内容类型
                val contentType = response.header("Content-Type", "")
                Log.d(TAG, "TTS响应Content-Type: $contentType, size=${bytes.size}")
                
                if (bytes.size < 100) {
                    Log.w(TAG, "⚠️ TTS响应数据过小，可能不是有效的音频文件")
                }
                
                val suffix = config.tts.format.ifBlank { "mp3" }
                val file = File(context.cacheDir, "aliyun_tts_${System.currentTimeMillis()}.$suffix")
                file.outputStream().use { it.write(bytes) }
                Log.i(TAG, "✅ TTS成功: file=${file.absolutePath}, size=${bytes.size} bytes")
                file
            }
        }
    }
}
