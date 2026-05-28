package com.example.v0clone.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * 面试网关 REST API
 *
 * 通信架构改造：App 与 backend-api 仅 HTTPS REST 通信，
 * App 与 TTS/ASR 通过 WebSocket 直连。
 * 面试控制信息（开始/题目/结束）通过 TTS WebSocket 控制消息下发。
 */
interface GatewayApi {

    /** 发起面试，由后端返回 TTS/ASR WebSocket 地址 */
    @POST("gateway/join")
    suspend fun joinGateway(
        @Body request: GatewayJoinRequest
    ): Response<GatewayJoinResponse>

    /** 通知后端：当前一句已播放完毕，可继续面试流程 */
    @POST("gateway/playback-done")
    suspend fun playbackDone(
        @Body request: PlaybackDoneRequest
    ): Response<SimpleResponse>

    /** 通知后端：用户主动打断当前播报 */
    @POST("gateway/interrupt")
    suspend fun interruptInterview(
        @Body request: InterruptRequest
    ): Response<SimpleResponse>
}

// ==================== 请求 / 响应数据类 ====================

data class GatewayJoinRequest(
    val sessionId: String,
    val userId: String?,
    val jobPosition: String?,
    val background: String? = null,
    val resumeText: String? = null,
    val deviceId: String? = null,
    val jobId: String? = null
)

data class GatewayJoinResponse(
    val success: Boolean,
    val sessionId: String,
    val services: ServicesInfo
)

data class ServicesInfo(
    val asr: ServiceEndpoint,
    val tts: ServiceEndpoint
)

data class ServiceEndpoint(
    val wsUrl: String,
    val available: Boolean
)

data class PlaybackDoneRequest(
    val sessionId: String,
    val reason: String? = null,
    val questionIndex: Int? = null
)

data class InterruptRequest(
    val sessionId: String,
    val reason: String = "user_interrupt"
)

data class SimpleResponse(
    val success: Boolean
)
