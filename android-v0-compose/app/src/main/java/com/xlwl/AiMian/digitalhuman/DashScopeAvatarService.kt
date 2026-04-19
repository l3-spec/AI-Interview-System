package com.xlwl.AiMian.digitalhuman

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
 * DashScope 数字人会话服务
 *
 * 调用阿里云 DashScope OpenAPI 创建数字人实时会话。
 * 端渲染模式下，SDK 自动下载数字人模型到本地并渲染。
 *
 * @param apiKey DashScope API Key（sk-xxx 格式）
 * @param baseUrl DashScope API 基础 URL
 */
class DashScopeAvatarService(
    private val apiKey: String = BuildConfig.DASHSCOPE_API_KEY,
    private val baseUrl: String = BuildConfig.DASHSCOPE_BASE_URL
) {

    companion object {
        private const val TAG = "LingMouAvatarService"
        // 灵眸 OpenAPI 端点
        private const val CREATE_SESSION_PATH = "/openapi/chat/init/"
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
     * @param projectId 数字人项目 ID（灵眸平台的项目 ID）
     * @param instanceId 数字人服务实例 ID（购买的服务订单实例）
     * @return Result<Pair<TYAvatarInitData, String>> 返回初始化数据和 sessionId
     */
    suspend fun createChatSession(
        projectId: String,
        instanceId: String
    ): Result<Pair<TYAvatarInitData, String>> {
        return withContext(Dispatchers.IO) {
            try {
                val url = "${baseUrl.trimEnd('/')}$CREATE_SESSION_PATH$projectId"
                Log.d(TAG, ">>> CreateChatSession URL: $url")
                Log.d(TAG, ">>> ProjectId: $projectId, InstanceId: $instanceId")

                // 构建请求体 — 灵眸 OpenAPI 格式
                val requestJson = JsonObject().apply {
                    addProperty("instanceId", instanceId)
                    addProperty("platform", "Android")
                }
                val requestBody = requestJson.toString()
                    .toRequestBody(JSON_MEDIA_TYPE)

                Log.d(TAG, ">>> Request body: $requestJson")

                // 构建请求
                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer $apiKey")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("x-acs-version", "2025-05-27")
                    .post(requestBody)
                    .build()

                // 执行请求
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                Log.d(TAG, "<<< Response code: ${response.code}")
                Log.d(TAG, "<<< Response body: ${responseBody.take(2000)}")

                if (!response.isSuccessful) {
                    val errorMsg = parseErrorMessage(responseBody, response.code)
                    Log.e(TAG, "CreateChatSession 失败: $errorMsg")
                    return@withContext Result.failure(Exception(errorMsg))
                }

                // 解析响应
                val result = parseResponse(responseBody)
                result

            } catch (e: Exception) {
                Log.e(TAG, "CreateChatSession 异常", e)
                Result.failure(Exception("网络请求失败: ${e.message}"))
            }
        }
    }

    /**
     * 解析灵眸 CreateChatSession 响应
     *
     * 灵眸响应格式：
     * {
     *   "success": true,
     *   "data": {
     *     "sessionId": "xxx",
     *     "rtcParams": { ... },
     *     "avatarAssets": [
     *       { "url": "...", "md5": "...", "secret": "...", "type": "..." }
     *     ],
     *     "expiredAt": 1234567890
     *   },
     *   "code": 200,
     *   "message": "success"
     * }
     */
    private fun parseResponse(responseBody: String): Result<Pair<TYAvatarInitData, String>> {
        return try {
            val json = JsonParser.parseString(responseBody).asJsonObject

            // 检查 success 字段
            val success = json.get("success")?.asBoolean ?: json.get("Success")?.asBoolean ?: false
            if (!success) {
                val code = json.get("code")?.asString ?: json.get("Code")?.asString ?: "unknown"
                val message = json.get("message")?.asString ?: json.get("Message")?.asString ?: "未知错误"
                return Result.failure(Exception("API 返回失败: [$code] $message"))
            }

            // 解析 data 字段
            val data = json.getAsJsonObject("data") ?: json.getAsJsonObject("Data")
            if (data == null) {
                return Result.failure(Exception("响应中未找到 data 字段"))
            }

            val sessionId = data.get("sessionId")?.asString
                ?: data.get("SessionId")?.asString
                ?: data.get("session_id")?.asString
                ?: ""

            if (sessionId.isEmpty()) {
                return Result.failure(Exception("响应中未找到 sessionId"))
            }

            // 将 data 解析为 TYAvatarInitData
            val initData = gson.fromJson(data, TYAvatarInitData::class.java)
            if (initData == null) {
                return Result.failure(Exception("无法解析 TYAvatarInitData"))
            }

            Log.d(TAG, "✅ 解析成功, sessionId=$sessionId")
            Log.d(TAG, "   avatarAssets: ${initData.avatarAssets?.toString()?.take(200)}")
            Log.d(TAG, "   rtcParams: ${initData.rtcParams?.toString()?.take(200)}")

            Result.success(Pair(initData, sessionId))

        } catch (e: Exception) {
            Log.e(TAG, "解析响应失败", e)
            Result.failure(Exception("解析响应失败: ${e.message}"))
        }
    }

    /**
     * 解析错误信息
     */
    private fun parseErrorMessage(responseBody: String, statusCode: Int): String {
        return try {
            val json = JsonParser.parseString(responseBody).asJsonObject
            val code = json.get("code")?.asString
                ?: json.get("Code")?.asString
                ?: json.get("error_code")?.asString
                ?: statusCode.toString()
            val message = json.get("message")?.asString
                ?: json.get("Message")?.asString
                ?: json.get("error_message")?.asString
                ?: "未知错误"
            val requestId = json.get("request_id")?.asString
                ?: json.get("RequestId")?.asString
                ?: ""
            "[$code] $message (requestId=$requestId)"
        } catch (e: Exception) {
            "HTTP $statusCode: ${responseBody.take(200)}"
        }
    }
}
