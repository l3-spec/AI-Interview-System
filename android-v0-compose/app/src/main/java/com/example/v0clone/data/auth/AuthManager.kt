package com.xlwl.AiMian.data.auth

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import android.util.Base64
import org.json.JSONObject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "auth")

class AuthManager(private val context: Context) {
    companion object {
        private val KEY_TOKEN = stringPreferencesKey("token")
        private val KEY_USER_JSON = stringPreferencesKey("user_json")
        private val KEY_INTERVIEW_GUIDE_SEEN = booleanPreferencesKey("interview_guide_seen")
        private val KEY_LAST_AI_JOB_ID = stringPreferencesKey("last_ai_job_id")
        private val KEY_LAST_AI_CATEGORY_ID = stringPreferencesKey("last_ai_category_id")
    }

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[KEY_TOKEN] }
        .map { token ->
            if (token.isNullOrBlank()) return@map null

            val expired = isJwtExpired(token)
            if (expired) {
                // 清理过期 token，避免携带失效身份导致 401
                context.dataStore.edit { prefs ->
                    prefs.remove(KEY_TOKEN)
                    prefs.remove(KEY_USER_JSON)
                }
                null
            } else token
        }

    val userJsonFlow: Flow<String?> = context.dataStore.data.map { it[KEY_USER_JSON] }
    val interviewGuideSeenFlow: Flow<Boolean> = context.dataStore.data.map { it[KEY_INTERVIEW_GUIDE_SEEN] ?: false }
    val lastAiJobIdFlow: Flow<String?> = context.dataStore.data.map { it[KEY_LAST_AI_JOB_ID] }
    val lastAiJobCategoryIdFlow: Flow<String?> = context.dataStore.data.map { it[KEY_LAST_AI_CATEGORY_ID] }

    suspend fun setToken(token: String?) {
        context.dataStore.edit { prefs ->
            if (token == null) prefs.remove(KEY_TOKEN) else prefs[KEY_TOKEN] = token
        }
    }

    suspend fun setUserJson(json: String?) {
        context.dataStore.edit { prefs ->
            if (json == null) prefs.remove(KEY_USER_JSON) else prefs[KEY_USER_JSON] = json
        }
    }

    suspend fun setInterviewGuideSeen(seen: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[KEY_INTERVIEW_GUIDE_SEEN] = seen
        }
    }

    suspend fun setLastAiJobSelection(jobId: String?, categoryId: String?) {
        context.dataStore.edit { prefs ->
            if (jobId == null) {
                prefs.remove(KEY_LAST_AI_JOB_ID)
            } else {
                prefs[KEY_LAST_AI_JOB_ID] = jobId
            }

            if (categoryId == null) {
                prefs.remove(KEY_LAST_AI_CATEGORY_ID)
            } else {
                prefs[KEY_LAST_AI_CATEGORY_ID] = categoryId
            }
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    /**
     * 简单解析 JWT 过期时间，过期则返回 true。解析失败时默认认为未过期，避免误删。
     */
    private fun isJwtExpired(token: String): Boolean {
        return try {
            val parts = token.split(".")
            if (parts.size < 2) return false

            val payload = parts[1]
                .replace('-', '+')
                .replace('_', '/')
                .let { Base64.decode(it, Base64.DEFAULT) }
                .let { String(it) }
            val expSeconds = JSONObject(payload).optLong("exp", 0L)
            expSeconds > 0 && System.currentTimeMillis() / 1000 >= expSeconds
        } catch (_: Exception) {
            false
        }
    }
}
