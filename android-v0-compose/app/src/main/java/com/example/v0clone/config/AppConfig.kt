package com.example.v0clone.config

import com.xlwl.AiMian.BuildConfig
import com.xlwl.AiMian.data.repository.ClientRuntimeConfigRepository
import com.xlwl.AiMian.di.AppModule
import com.example.v0clone.data.model.ClientRuntimeConfigDto
import java.net.URI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import android.util.Log

private const val DEFAULT_API_PORT = 3001
private const val DEFAULT_ASR_PORT = 3002
private const val DEFAULT_TTS_PORT = 3003
private const val DEFAULT_API_PATH = "api/"
private const val DEFAULT_AIRI_WEB_URL = "http://10.0.2.2:3000/avatar"

private val defaultApiBaseUrl: String
    get() = ensureTrailingSlash("http://${BuildConfig.API_HOST}:$DEFAULT_API_PORT/$DEFAULT_API_PATH")

private fun ensureTrailingSlash(url: String): String =
    if (url.endsWith('/')) url else "$url/"

private fun resolveUrl(raw: String?, fallback: String, ensureTrailingSlash: Boolean = false): String {
    val candidate = raw?.trim().orEmpty().ifEmpty { fallback.trim() }
    return if (ensureTrailingSlash) ensureTrailingSlash(candidate) else candidate
}

private fun nonBlank(s: String?): String? = s?.trim()?.takeIf { it.isNotEmpty() }

object AppConfig {

    private const val TAG = "AppConfig"

    @Volatile
    private var clientRuntime: ClientRuntimeConfigDto? = null
    
    // 配置监听器（观察 Repository 的配置变化）
    private var configListenerJob: kotlinx.coroutines.Job? = null
    
    /**
     * 启动配置监听器
     * 当 Repository 中的配置更新时，自动同步到 AppConfig
     * 应该在 Application.onCreate() 中调用
     */
    fun startConfigListener(scope: CoroutineScope) {
        configListenerJob?.cancel() // 取消旧的监听器
        
        configListenerJob = scope.launch(Dispatchers.Main) {
            try {
                AppModule.configRepository.config.collectLatest { config ->
                    if (config != null) {
                        Log.i(TAG, "🔄 配置已更新: version=${config.version}")
                        applyClientRuntime(config)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ 配置监听器异常", e)
            }
        }
    }

    /**
     * 由 [com.xlwl.AiMian.data.repository.ClientRuntimeConfigRepository] 在冷启动时调用。
     */
    fun applyClientRuntime(config: ClientRuntimeConfigDto) {
        clientRuntime = config
        Log.d(TAG, "✅ 配置已应用: version=${config.version}")
    }

    val volcanoAppId: String
        get() = nonBlank(clientRuntime?.volcanoAppId) ?: (BuildConfig.VOLCANO_APP_ID.takeIf { it.isNotBlank() } ?: "")

    val volcanoApiKey: String
        get() = nonBlank(clientRuntime?.volcanoApiKey) ?: (BuildConfig.VOLCANO_API_KEY.takeIf { it.isNotBlank() } ?: "")

    val isVolcanoEnabled: Boolean
        get() = volcanoAppId.isNotBlank() && volcanoApiKey.isNotBlank()

    val volcanoTtsHost: String
        get() = nonBlank(clientRuntime?.volcanoTtsHost) ?: "openspeech.bytedance.com"

    val volcanoTtsPath: String
        get() = nonBlank(clientRuntime?.volcanoTtsPath) ?: "/api/v1/tts"

    val ttsVoice: String
        get() = nonBlank(clientRuntime?.ttsVoice) ?: "BV700_V2_streaming"

    val apiBaseUrl: String
        get() = resolveUrl(nonBlank(clientRuntime?.apiBaseUrl), resolveUrl(BuildConfig.API_BASE_URL, defaultApiBaseUrl, ensureTrailingSlash = true), ensureTrailingSlash = true)

    val airiWebUrl: String
        get() = resolveUrl(nonBlank(clientRuntime?.airiWebUrl), resolveUrl(BuildConfig.AIRI_WEB_URL, DEFAULT_AIRI_WEB_URL))

    val realtimeVoiceWsUrl: String
        get() {
            val fromServer = nonBlank(clientRuntime?.realtimeSocketUrl)
            if (fromServer != null) {
                return fromServer.trimEnd('/')
            }
            val normalized = apiBaseUrl
                .removeSuffix("api/")
                .removeSuffix("api")
                .trimEnd('/')
            val defaultNormalized = defaultApiBaseUrl
                .removeSuffix("api/")
                .removeSuffix("api")
                .trimEnd('/')
            return normalized.ifEmpty { defaultNormalized }
        }

    val duixBaseConfigUrl: String
        get() = nonBlank(clientRuntime?.duixBaseConfigUrl) ?: BuildConfig.DUIX_BASE_CONFIG_URL.trim()

    val duixModelUrl: String
        get() = nonBlank(clientRuntime?.duixModelUrl) ?: BuildConfig.DUIX_MODEL_URL.trim()

    val dashScopeApiKey: String
        get() = nonBlank(clientRuntime?.dashScopeApiKey) ?: BuildConfig.DASHSCOPE_API_KEY

    val dashScopeBaseUrl: String
        get() = nonBlank(clientRuntime?.dashScopeBaseUrl) ?: BuildConfig.DASHSCOPE_BASE_URL

    val aliyunAvatarProjectId: String
        get() = nonBlank(clientRuntime?.aliyunAvatarProjectId) ?: BuildConfig.ALIYUN_AVATAR_PROJECT_ID

    val aliyunAvatarApiUrl: String
        get() = nonBlank(clientRuntime?.aliyunAvatarApiUrl) ?: BuildConfig.ALIYUN_AVATAR_API_URL

    val aliyunAvatarInstanceId: String
        get() = nonBlank(clientRuntime?.aliyunAvatarInstanceId) ?: BuildConfig.ALIYUN_AVATAR_INSTANCE_ID

    val aliyunAccessKeyId: String
        get() {
            val fromServer = nonBlank(clientRuntime?.aliyunAccessKeyId)
            if (fromServer != null) return fromServer
            
            // 【安全警告】不再使用 BuildConfig 中的硬编码值
            // AccessKey 必须由服务端 /api/client-runtime-config 接口动态下发
            val buildConfigValue = BuildConfig.ALIYUN_ACCESS_KEY_ID
            if (buildConfigValue.isNotBlank()) {
                android.util.Log.w("AppConfig", 
                    "⚠️ AccessKey 从 BuildConfig 回退，这不应该是生产环境的行为！" +
                    "请确保服务端 /api/client-runtime-config 正确返回 aliyunAccessKeyId")
            }
            return buildConfigValue
        }

    val aliyunAccessKeySecret: String
        get() {
            val fromServer = nonBlank(clientRuntime?.aliyunAccessKeySecret)
            if (fromServer != null) return fromServer
            
            // 【安全警告】不再使用 BuildConfig 中的硬编码值
            // AccessKey 必须由服务端 /api/client-runtime-config 接口动态下发
            val buildConfigValue = BuildConfig.ALIYUN_ACCESS_KEY_SECRET
            if (buildConfigValue.isNotBlank()) {
                android.util.Log.w("AppConfig", 
                    "⚠️ AccessKeySecret 从 BuildConfig 回退，这不应该是生产环境的行为！" +
                    "请确保服务端 /api/client-runtime-config 正确返回 aliyunAccessKeySecret")
            }
            return buildConfigValue
        }

    val vadThreshold: Float
        get() = clientRuntime?.vadThreshold ?: -40f

    val bargeInVadThreshold: Float
        get() = clientRuntime?.bargeInVadThreshold ?: -32f

    val speechCooldownMs: Long
        get() = clientRuntime?.speechCooldownMs ?: 4200L

    /** Qwen3 TTS session.create 的 instructions，由服务端 TTS_INSTRUCTIONS 统一下发 */
    val qwen3TtsInstructions: String
        get() = nonBlank(clientRuntime?.ttsInstructions)
            ?: "你是一位资深、严谨的男性面试官。请以沉稳、厚重、专业且略带严厉的男声语调进行对话，语气要正式、公正、节奏平稳。"

    // ============================================================
    // Qwen3 ASR/TTS 微服务（由服务端配置完整 URL，无则回退为「与 API 同 host + 默认端口」）
    // ============================================================

    private val apiHost: String
        get() {
            val r = runCatching { URI(apiBaseUrl) }.getOrNull()
            val h = r?.host?.trim()?.takeIf { it.isNotEmpty() }
            return h ?: apiBaseUrl
                .removePrefix("https://")
                .removePrefix("http://")
                .substringBefore(":")
                .substringBefore("/")
                .ifEmpty { "10.0.2.2" }
        }

    val asrServiceWsUrl: String
        get() = nonBlank(clientRuntime?.asrServiceWsUrl) ?: "ws://$apiHost:$DEFAULT_ASR_PORT/ws/asr"

    val ttsServiceWsUrl: String
        get() = nonBlank(clientRuntime?.ttsServiceWsUrl) ?: "ws://$apiHost:$DEFAULT_TTS_PORT/ws/tts"

    val asrServiceHttpUrl: String
        get() = nonBlank(clientRuntime?.asrServiceHttpUrl) ?: "http://$apiHost:$DEFAULT_ASR_PORT"

    val ttsServiceHttpUrl: String
        get() = nonBlank(clientRuntime?.ttsServiceHttpUrl) ?: "http://$apiHost:$DEFAULT_TTS_PORT"
}
