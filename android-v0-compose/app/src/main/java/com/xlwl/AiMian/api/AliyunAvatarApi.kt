package com.xlwl.AiMian.api

import com.google.gson.annotations.SerializedName
import com.tongyi.video_chat_sdk.data.response.TYAvatarInitData
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * 阿里云数字人 CreateChatSession 后端 API
 *
 * Android 客户端不直接调用阿里云 OpenAPI（AccessKey 暴露风险），
 * 而是调用自己的后端，由后端调用阿里云 CreateChatSession API。
 *
 * 请求示例：
 * POST /api/aliyun/avatar/create-session
 * Headers: Authorization: Bearer <user_token>
 * Body: CreateSessionRequest(projectId = "C1vPn2gVB9WVpj8yxLR2jV-g")
 *
 * 响应示例：
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "sessionId": "xxx",
 *     "avatarInitData": { ... TYAvatarInitData JSON ... }
 *   }
 * }
 */

/** 请求体 */
data class CreateSessionRequest(
    @SerializedName("ProjectId")
    val projectId: String,

    @SerializedName("UserId")
    val userId: String = "",

    @SerializedName("Extra")
    val extra: Map<String, String>? = null
)

/** 响应体 */
data class CreateSessionResponse(
    @SerializedName("Code")
    val code: Int,

    @SerializedName("Message")
    val message: String,

    @SerializedName("Data")
    val data: SessionData?
)

data class SessionData(
    @SerializedName("SessionId")
    val sessionId: String,

    @SerializedName("AvatarInitData")
    val avatarInitData: TYAvatarInitData
)

/** Retrofit API 接口 - 后端代理模式 */
@Deprecated("已改用 DashScopeAvatarService 直连 DashScope API，此接口保留用于将来可能回切后端代理模式")
interface AliyunAvatarApi {

    @POST("api/aliyun/avatar/create-session")
    suspend fun createChatSession(
        @Header("Authorization") token: String,
        @Body request: CreateSessionRequest
    ): CreateSessionResponse
}
