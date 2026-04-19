package com.xlwl.AiMian.digitalhuman

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.tongyi.video_chat_sdk.data.response.TYAvatarInitData
import com.xlwl.AiMian.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * 阿里云灵眸 (Lingmou) 数字人会话服务
 * 
 * 遵循 2025-05-27 版本 OpenAPI 规范。
 * 使用 ROA (RESTful) 签名验证。
 */
class AliyunLingmouService(
    private val context: Context,
    private val accessKeyId: String = BuildConfig.ALIYUN_ACCESS_KEY_ID,
    private val accessKeySecret: String = BuildConfig.ALIYUN_ACCESS_KEY_SECRET,
    private val baseUrl: String = "https://lingmou.cn-beijing.aliyuncs.com"
) {

    companion object {
        private const val TAG = "AliyunLingmouService"
        private const val API_VERSION = "2025-05-27"
        private const val ACTION_INIT_SESSION = "CreateChatSession"
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    /**
     * 创建数字人实时对话会话
     * 
     * @param projectId 数字人项目 ID
     * @param instanceId 数字人服务实例 ID
     */
    suspend fun createChatSession(
        projectId: String,
        instanceId: String
    ): Result<Pair<TYAvatarInitData, String>> {
        return withContext(Dispatchers.IO) {
            try {
                // ROA 路径格式：/openapi/chat/init/{projectId}
                val url = "${baseUrl.trimEnd('/')}/openapi/chat/init/$projectId"
                
                val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "android_device"
                
                // 构建基础请求体
                val requestJson = JsonObject().apply {
                    addProperty("instanceId", instanceId)
                    addProperty("platform", "Android")
                    addProperty("deviceId", deviceId)
                    addProperty("appId", context.packageName)
                }
                val requestBody = requestJson.toString().toRequestBody(JSON_MEDIA_TYPE)

                // 1. 构建基础 ROA 请求（待签名）
                val baseRequest = Request.Builder()
                    .url(url)
                    .post(requestBody)
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("x-acs-action", ACTION_INIT_SESSION)
                    .header("x-acs-version", API_VERSION)
                    .build()

                // 2. 调用签名工具生成最终请求
                val signedRequest = AliyunSignatureUtils.getSignedRequest(
                    baseRequest,
                    accessKeyId,
                    accessKeySecret
                )

                Log.d(TAG, ">>> CreateChatSession URL: $url")
                Log.d(TAG, ">>> Action: $ACTION_INIT_SESSION, Version: $API_VERSION")

                // 3. 执行请求
                val response = client.newCall(signedRequest).execute()
                val responseBody = response.body?.string() ?: ""

                Log.d(TAG, "<<< Response code: ${response.code}")
                Log.d(TAG, "<<< Response body (truncated): ${responseBody.take(1000)}")

                if (!response.isSuccessful) {
                    val errorMsg = parseErrorMessage(responseBody, response.code)
                    Log.e(TAG, "CreateChatSession 失败: $errorMsg")
                    return@withContext Result.failure(Exception(errorMsg))
                }

                parseResponse(responseBody)

            } catch (e: Exception) {
                Log.e(TAG, "CreateChatSession 异常", e)
                Result.failure(Exception("连接阿里云服务失败: ${e.message}"))
            }
        }
    }

    private fun parseResponse(responseBody: String): Result<Pair<TYAvatarInitData, String>> {
        return try {
            val json = JsonParser.parseString(responseBody).asJsonObject
            val success = json.get("success")?.asBoolean ?: json.get("Success")?.asBoolean ?: false
            
            if (!success) {
                val code = json.get("code") ?: json.get("Code")
                val message = json.get("message") ?: json.get("Message")
                return Result.failure(Exception("API 逻辑返回失败: [$code] $message"))
            }

            val data = json.getAsJsonObject("data") ?: json.getAsJsonObject("Data")
            val sessionId = data?.get("sessionId")?.asString ?: data?.get("SessionId")?.asString ?: ""
            val initData = gson.fromJson(data, TYAvatarInitData::class.java)

            if (initData == null || sessionId.isEmpty()) {
                Result.failure(Exception("后端返回数据格式不完整"))
            } else {
                Result.success(Pair(initData, sessionId))
            }
        } catch (e: Exception) {
            Result.failure(Exception("解析响应失败: ${e.message}"))
        }
    }

    private fun parseErrorMessage(responseBody: String, statusCode: Int): String {
        return try {
            val json = JsonParser.parseString(responseBody).asJsonObject
            val code = json.get("code")?.asString ?: json.get("Code")?.asString ?: statusCode.toString()
            val message = json.get("message")?.asString ?: json.get("Message")?.asString ?: "未知服务器错误"
            val requestId = json.get("requestId")?.asString ?: json.get("RequestId")?.asString ?: ""
            "[$code] $message (RID: $requestId)"
        } catch (e: Exception) {
            "HTTP $statusCode: ${responseBody.take(200)}"
        }
    }
}
