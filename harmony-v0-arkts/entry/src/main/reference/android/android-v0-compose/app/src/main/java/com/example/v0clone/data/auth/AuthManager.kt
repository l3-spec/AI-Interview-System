package com.xlwl.AiMian.data.auth

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
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
}
