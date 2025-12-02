package com.xlwl.AiMian.data.model

import com.google.gson.annotations.SerializedName

data class CreateDigitalHumanSessionRequest(
    val humanModel: String,
    val voiceModel: String,
    val background: String,
    val resolution: String,
    val frameRate: Int
)

data class DigitalHumanSessionDto(
    @SerializedName("SessionId")
    val sessionId: String,
    @SerializedName("Status")
    val status: String?,
    @SerializedName("HumanModel")
    val humanModel: String?,
    @SerializedName("VoiceModel")
    val voiceModel: String?,
    @SerializedName("WebRTCUrl")
    val webRtcUrl: String?,
    @SerializedName("HLSUrl")
    val hlsUrl: String?,
    @SerializedName("RTMPUrl")
    val rtmpUrl: String?,
    @SerializedName("Background")
    val background: String?,
    @SerializedName("Resolution")
    val resolution: String?,
    @SerializedName("FrameRate")
    val frameRate: Int?
)

data class DigitalHumanSession(
    val sessionId: String,
    val status: String?,
    val humanModel: String?,
    val voiceModel: String?,
    val webRtcUrl: String?,
    val hlsUrl: String?,
    val rtmpUrl: String?,
    val background: String?,
    val resolution: String?,
    val frameRate: Int?
)

data class DigitalHumanTextDriveRequest(
    val sessionId: String,
    val text: String,
    val voiceModel: String? = null,
    val speed: Float? = null,
    val pitch: Float? = null,
    val volume: Float? = null
)

data class DigitalHumanTextDriveResultDto(
    val success: Boolean,
    val message: String?,
    val sessionId: String?
)

data class DigitalHumanTextDriveResult(
    val success: Boolean,
    val message: String?,
    val sessionId: String?
)

data class DigitalHumanEndSessionRequest(
    val sessionId: String
)

fun DigitalHumanSessionDto.toModel(): DigitalHumanSession =
    DigitalHumanSession(
        sessionId = sessionId,
        status = status,
        humanModel = humanModel,
        voiceModel = voiceModel,
        webRtcUrl = webRtcUrl,
        hlsUrl = hlsUrl,
        rtmpUrl = rtmpUrl,
        background = background,
        resolution = resolution,
        frameRate = frameRate
    )

fun DigitalHumanTextDriveResultDto.toModel(): DigitalHumanTextDriveResult =
    DigitalHumanTextDriveResult(
        success = success,
        message = message,
        sessionId = sessionId
    )
