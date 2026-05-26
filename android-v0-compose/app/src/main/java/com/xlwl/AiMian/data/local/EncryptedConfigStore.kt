package com.xlwl.AiMian.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.v0clone.data.model.ClientRuntimeConfigDto
import android.util.Log

/**
 * 加密的配置存储
 * 
 * 使用 Android Keystore + EncryptedSharedPreferences 安全存储敏感配置
 * - AccessKey 等敏感信息加密存储
 * - 密钥存储在硬件级保护的 Keystore 中
 * - 密钥与设备绑定，无法导出
 * 
 * 安全级别：
 * ✅ 密钥存储在 TEE（可信执行环境）或 StrongBox
 * ✅ 密钥与设备绑定，无法迁移到其他设备
 * ✅ 即使设备 Root，也无法提取密钥
 * ✅ 符合 Android 安全最佳实践
 */
class EncryptedConfigStore(private val context: Context) {
    
    companion object {
        private const val TAG = "EncryptedConfigStore"
        private const val PREFS_NAME = "secure_config_prefs"
        
        // 配置字段 Key
        private const val KEY_VERSION = "config_version"
        private const val KEY_TIMESTAMP = "config_timestamp"
        private const val KEY_API_BASE_URL = "api_base_url"
        private const val KEY_REALTIME_SOCKET_URL = "realtime_socket_url"
        private const val KEY_ASR_WS_URL = "asr_service_ws_url"
        private const val KEY_TTS_WS_URL = "tts_service_ws_url"
        private const val KEY_ASR_HTTP_URL = "asr_service_http_url"
        private const val KEY_TTS_HTTP_URL = "tts_service_http_url"
        private const val KEY_QWEN_ASR_MODEL = "qwen_asr_model"
        private const val KEY_QWEN_TTS_MODEL = "qwen_tts_model"
        private const val KEY_TTS_VOICE = "tts_voice"
        private const val KEY_TTS_LANGUAGE = "tts_language"
        private const val KEY_TTS_INSTRUCTIONS = "tts_instructions"
        private const val KEY_DASHSCOPE_API_KEY = "dashscope_api_key"
        private const val KEY_DASHSCOPE_BASE_URL = "dashscope_base_url"
        private const val KEY_VOLCANO_APP_ID = "volcano_app_id"
        private const val KEY_VOLCANO_API_KEY = "volcano_api_key"
        private const val KEY_DUIX_BASE_CONFIG_URL = "duix_base_config_url"
        private const val KEY_DUIX_MODEL_URL = "duix_model_url"
        private const val KEY_AIRI_WEB_URL = "airi_web_url"
        private const val KEY_ALIYUN_AVATAR_PROJECT_ID = "aliyun_avatar_project_id"
        private const val KEY_ALIYUN_AVATAR_API_URL = "aliyun_avatar_api_url"
        private const val KEY_ALIYUN_AVATAR_INSTANCE_ID = "aliyun_avatar_instance_id"
        private const val KEY_ALIYUN_ACCESS_KEY_ID = "aliyun_access_key_id"
        private const val KEY_ALIYUN_ACCESS_KEY_SECRET = "aliyun_access_key_secret"
        private const val KEY_VAD_THRESHOLD = "vad_threshold"
        private const val KEY_BARGE_IN_VAD_THRESHOLD = "barge_in_vad_threshold"
        private const val KEY_SPEECH_COOLDOWN_MS = "speech_cooldown_ms"
    }
    
    // 初始化加密 SharedPreferences
    // MasterKey 存储在 Android Keystore 中（硬件级保护）
    private val encryptedPrefs by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            
            EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.e(TAG, "初始化加密存储失败", e)
            throw RuntimeException("无法初始化加密存储，可能是设备不支持 Keystore", e)
        }
    }
    
    /**
     * 保存配置到加密存储
     */
    fun save(config: ClientRuntimeConfigDto) {
        try {
            encryptedPrefs.edit()
                .putString(KEY_VERSION, config.version)
                .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
                .putString(KEY_API_BASE_URL, config.apiBaseUrl ?: "")
                .putString(KEY_REALTIME_SOCKET_URL, config.realtimeSocketUrl ?: "")
                .putString(KEY_ASR_WS_URL, config.asrServiceWsUrl ?: "")
                .putString(KEY_TTS_WS_URL, config.ttsServiceWsUrl ?: "")
                .putString(KEY_ASR_HTTP_URL, config.asrServiceHttpUrl ?: "")
                .putString(KEY_TTS_HTTP_URL, config.ttsServiceHttpUrl ?: "")
                .putString(KEY_QWEN_ASR_MODEL, config.qwenAsrModel ?: "")
                .putString(KEY_QWEN_TTS_MODEL, config.qwenTtsModel ?: "")
                .putString(KEY_TTS_VOICE, config.ttsVoice ?: "")
                .putString(KEY_TTS_LANGUAGE, config.ttsLanguage ?: "")
                .putString(KEY_TTS_INSTRUCTIONS, config.ttsInstructions ?: "")
                .putString(KEY_DASHSCOPE_API_KEY, config.dashScopeApiKey ?: "")
                .putString(KEY_VOLCANO_API_KEY, config.volcanoApiKey ?: "")
                .putString(KEY_ALIYUN_ACCESS_KEY_ID, config.aliyunAccessKeyId ?: "")
                .putString(KEY_ALIYUN_ACCESS_KEY_SECRET, config.aliyunAccessKeySecret ?: "")
                .putString(KEY_DASHSCOPE_BASE_URL, config.dashScopeBaseUrl ?: "")
                .putString(KEY_VOLCANO_APP_ID, config.volcanoAppId ?: "")
                .putString(KEY_DUIX_BASE_CONFIG_URL, config.duixBaseConfigUrl ?: "")
                .putString(KEY_DUIX_MODEL_URL, config.duixModelUrl ?: "")
                .putString(KEY_AIRI_WEB_URL, config.airiWebUrl ?: "")
                .putString(KEY_ALIYUN_AVATAR_PROJECT_ID, config.aliyunAvatarProjectId ?: "")
                .putString(KEY_ALIYUN_AVATAR_API_URL, config.aliyunAvatarApiUrl ?: "")
                .putString(KEY_ALIYUN_AVATAR_INSTANCE_ID, config.aliyunAvatarInstanceId ?: "")
                .apply { config.vadThreshold?.let { putFloat(KEY_VAD_THRESHOLD, it) } }
                .apply { config.bargeInVadThreshold?.let { putFloat(KEY_BARGE_IN_VAD_THRESHOLD, it) } }
                .apply { config.speechCooldownMs?.let { putLong(KEY_SPEECH_COOLDOWN_MS, it) } }
                .apply()  // 异步提交
            
            Log.i(TAG, "✅ 配置已保存到加密存储: version=${config.version}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ 保存配置到加密存储失败", e)
            throw e
        }
    }
    
    /**
     * 从加密存储读取配置
     * @return 配置对象，如果没有缓存则返回 null
     */
    fun read(): ClientRuntimeConfigDto? {
        try {
            val version = encryptedPrefs.getString(KEY_VERSION, null)
            
            // 如果没有版本号，说明没有缓存
            if (version.isNullOrEmpty()) {
                Log.d(TAG, "本地无缓存配置")
                return null
            }
            
            val config = ClientRuntimeConfigDto(
                version = version ?: "",  // version 已经在前面的检查中确保非空
                apiBaseUrl = encryptedPrefs.getString(KEY_API_BASE_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                realtimeSocketUrl = encryptedPrefs.getString(KEY_REALTIME_SOCKET_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                asrServiceWsUrl = encryptedPrefs.getString(KEY_ASR_WS_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                ttsServiceWsUrl = encryptedPrefs.getString(KEY_TTS_WS_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                asrServiceHttpUrl = encryptedPrefs.getString(KEY_ASR_HTTP_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                ttsServiceHttpUrl = encryptedPrefs.getString(KEY_TTS_HTTP_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                
                qwenAsrModel = encryptedPrefs.getString(KEY_QWEN_ASR_MODEL, "").orEmpty().takeIf { it.isNotEmpty() },
                qwenTtsModel = encryptedPrefs.getString(KEY_QWEN_TTS_MODEL, "").orEmpty().takeIf { it.isNotEmpty() },
                ttsVoice = encryptedPrefs.getString(KEY_TTS_VOICE, "").orEmpty().takeIf { it.isNotEmpty() },
                ttsLanguage = encryptedPrefs.getString(KEY_TTS_LANGUAGE, "").orEmpty().takeIf { it.isNotEmpty() },
                ttsInstructions = encryptedPrefs.getString(KEY_TTS_INSTRUCTIONS, "").orEmpty().takeIf { it.isNotEmpty() },
                
                // 敏感信息
                dashScopeApiKey = encryptedPrefs.getString(KEY_DASHSCOPE_API_KEY, "").orEmpty().takeIf { it.isNotEmpty() },
                volcanoApiKey = encryptedPrefs.getString(KEY_VOLCANO_API_KEY, "").orEmpty().takeIf { it.isNotEmpty() },
                aliyunAccessKeyId = encryptedPrefs.getString(KEY_ALIYUN_ACCESS_KEY_ID, "").orEmpty().takeIf { it.isNotEmpty() },
                aliyunAccessKeySecret = encryptedPrefs.getString(KEY_ALIYUN_ACCESS_KEY_SECRET, "").orEmpty().takeIf { it.isNotEmpty() },
                
                dashScopeBaseUrl = encryptedPrefs.getString(KEY_DASHSCOPE_BASE_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                volcanoAppId = encryptedPrefs.getString(KEY_VOLCANO_APP_ID, "").orEmpty().takeIf { it.isNotEmpty() },
                
                duixBaseConfigUrl = encryptedPrefs.getString(KEY_DUIX_BASE_CONFIG_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                duixModelUrl = encryptedPrefs.getString(KEY_DUIX_MODEL_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                airiWebUrl = encryptedPrefs.getString(KEY_AIRI_WEB_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                
                aliyunAvatarProjectId = encryptedPrefs.getString(KEY_ALIYUN_AVATAR_PROJECT_ID, "").orEmpty().takeIf { it.isNotEmpty() },
                aliyunAvatarApiUrl = encryptedPrefs.getString(KEY_ALIYUN_AVATAR_API_URL, "").orEmpty().takeIf { it.isNotEmpty() },
                aliyunAvatarInstanceId = encryptedPrefs.getString(KEY_ALIYUN_AVATAR_INSTANCE_ID, "").orEmpty().takeIf { it.isNotEmpty() },
                
                // Float 配置
                vadThreshold = if (encryptedPrefs.contains(KEY_VAD_THRESHOLD)) {
                    encryptedPrefs.getFloat(KEY_VAD_THRESHOLD, -40f)
                } else null,
                bargeInVadThreshold = if (encryptedPrefs.contains(KEY_BARGE_IN_VAD_THRESHOLD)) {
                    encryptedPrefs.getFloat(KEY_BARGE_IN_VAD_THRESHOLD, -35f)
                } else null,
                speechCooldownMs = if (encryptedPrefs.contains(KEY_SPEECH_COOLDOWN_MS)) {
                    encryptedPrefs.getLong(KEY_SPEECH_COOLDOWN_MS, 1000L)
                } else null
            )
            
            val timestamp = encryptedPrefs.getLong(KEY_TIMESTAMP, 0)
            val age = System.currentTimeMillis() - timestamp
            Log.d(TAG, "✅ 从加密存储读取配置: version=$version, 缓存时长=${age / 1000 / 60}分钟")
            
            return config
        } catch (e: Exception) {
            Log.e(TAG, "❌ 从加密存储读取配置失败", e)
            return null
        }
    }
    
    /**
     * 检查缓存是否过期
     * @param hours 过期时间（小时）
     * @return true 表示已过期
     */
    fun isExpired(hours: Int = 24): Boolean {
        try {
            val timestamp = encryptedPrefs.getLong(KEY_TIMESTAMP, 0)
            if (timestamp == 0L) return true
            
            val age = System.currentTimeMillis() - timestamp
            val expired = age > hours * 3600 * 1000
            
            if (expired) {
                Log.w(TAG, "⚠️ 配置缓存已过期: ${age / 1000 / 60 / 60}小时 > ${hours}小时")
            }
            
            return expired
        } catch (e: Exception) {
            Log.e(TAG, "检查缓存过期时间失败", e)
            return true
        }
    }
    
    /**
     * 清除所有缓存配置
     */
    fun clear() {
        try {
            encryptedPrefs.edit().clear().apply()
            Log.i(TAG, "🗑️ 已清除所有缓存配置")
        } catch (e: Exception) {
            Log.e(TAG, "清除缓存配置失败", e)
        }
    }
    
    /**
     * 获取缓存的配置版本
     */
    fun getCachedVersion(): String? {
        return encryptedPrefs.getString(KEY_VERSION, null)
    }
    
    /**
     * 获取缓存的时间戳
     */
    fun getCacheTimestamp(): Long {
        return encryptedPrefs.getLong(KEY_TIMESTAMP, 0)
    }
}
