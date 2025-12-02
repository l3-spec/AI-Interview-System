package com.xlwl.AiMian.config

import com.xlwl.AiMian.BuildConfig

private const val DEFAULT_API_PORT = 3001
private const val DEFAULT_API_PATH = "api/"
private const val DEFAULT_AIRI_WEB_URL = "http://10.0.2.2:3000/avatar"

private val defaultApiBaseUrl: String
    get() = ensureTrailingSlash("http://${BuildConfig.API_HOST}:$DEFAULT_API_PORT/$DEFAULT_API_PATH")

private fun ensureTrailingSlash(url: String): String =
    if (url.endsWith('/')) url else "$url/"

private fun resolveUrl(raw: String?, fallback: String, ensureTrailingSlash: Boolean = false): String {
    val candidate = raw?.trim().orEmpty().ifEmpty { fallback.trim() }
    val normalized = if (ensureTrailingSlash) ensureTrailingSlash(candidate) else candidate
    return normalized
}

object AppConfig {
    val apiBaseUrl: String by lazy {
        resolveUrl(BuildConfig.API_BASE_URL, defaultApiBaseUrl, ensureTrailingSlash = true)
    }

    val airiWebUrl: String by lazy {
        resolveUrl(BuildConfig.AIRI_WEB_URL, DEFAULT_AIRI_WEB_URL)
    }

    val realtimeVoiceWsUrl: String by lazy {
        // Reuse API host but strip trailing "/api/" so socket.io connects to the root server port.
        val normalized = apiBaseUrl
            .removeSuffix("api/")
            .removeSuffix("api")
            .trimEnd('/')
        val defaultNormalized = defaultApiBaseUrl
            .removeSuffix("api/")
            .removeSuffix("api")
            .trimEnd('/')
        normalized.ifEmpty { defaultNormalized }
    }

    val duixBaseConfigUrl: String by lazy {
        BuildConfig.DUIX_BASE_CONFIG_URL.trim()
    }

    val duixModelUrl: String by lazy {
        BuildConfig.DUIX_MODEL_URL.trim()
    }
}
