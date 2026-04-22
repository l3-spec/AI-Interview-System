package com.xlwl.AiMian.config

import com.xlwl.AiMian.BuildConfig
import com.xlwl.AiMian.data.model.ClientRuntimeConfigDto
import java.net.URI

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

    @Volatile
    private var clientRuntime: ClientRuntimeConfigDto? = null

    /**
     * 由 [com.xlwl.AiMian.data.repository.ClientRuntimeConfigRepository] 在冷启动时调用。
     */
    fun applyClientRuntime(config: ClientRuntimeConfigDto) {
        clientRuntime = config
    }

    val volcanoAppId: String
        get() = nonBlank(clientRuntime?.volcanoAppId) ?: (BuildConfig.VOLCANO_APP_ID.takeIf { it.isNotBlank() } ?: "")

    val volcanoApiKey: String
        get() = nonBlank(clientRuntime?.volcanoApiKey) ?: (BuildConfig.VOLCANO_API_KEY.takeIf { it.isNotBlank() } ?: "")

    val isVolcanoEnabled: Boolean
        get() = volcanoAppId.isNotBlank() && volcanoApiKey.isNotBlank()

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
        get() = nonBlank(clientRuntime?.aliyunAccessKeyId) ?: BuildConfig.ALIYUN_ACCESS_KEY_ID

    val aliyunAccessKeySecret: String
        get() = nonBlank(clientRuntime?.aliyunAccessKeySecret) ?: BuildConfig.ALIYUN_ACCESS_KEY_SECRET

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
