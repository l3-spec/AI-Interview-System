package com.example.v0clone.data.model

import com.google.gson.annotations.SerializedName

/**
 * GET /api/public/client-runtime-config 返回的 data 段。
 * 字段均为可选：未返回时回退到 BuildConfig。
 */
data class ClientRuntimeConfigDto(
    @SerializedName("version") val version: String? = null,  // 配置版本号
    @SerializedName("apiBaseUrl") val apiBaseUrl: String? = null,
    @SerializedName("realtimeSocketUrl") val realtimeSocketUrl: String? = null,
    @SerializedName("asrServiceWsUrl") val asrServiceWsUrl: String? = null,
    @SerializedName("ttsServiceWsUrl") val ttsServiceWsUrl: String? = null,
    @SerializedName("asrServiceHttpUrl") val asrServiceHttpUrl: String? = null,
    @SerializedName("ttsServiceHttpUrl") val ttsServiceHttpUrl: String? = null,
    @SerializedName("qwenAsrModel") val qwenAsrModel: String? = null,
    @SerializedName("qwenTtsModel") val qwenTtsModel: String? = null,
    @SerializedName("ttsVoice") val ttsVoice: String? = null,
    @SerializedName("ttsLanguage") val ttsLanguage: String? = null,
    @SerializedName("ttsInstructions") val ttsInstructions: String? = null,
    @SerializedName("dashScopeApiKey") val dashScopeApiKey: String? = null,
    @SerializedName("dashScopeBaseUrl") val dashScopeBaseUrl: String? = null,
    @SerializedName("volcanoAppId") val volcanoAppId: String? = null,
    @SerializedName("volcanoApiKey") val volcanoApiKey: String? = null,
    @SerializedName("duixBaseConfigUrl") val duixBaseConfigUrl: String? = null,
    @SerializedName("duixModelUrl") val duixModelUrl: String? = null,
    @SerializedName("airiWebUrl") val airiWebUrl: String? = null,
    @SerializedName("aliyunAvatarProjectId") val aliyunAvatarProjectId: String? = null,
    @SerializedName("aliyunAvatarApiUrl") val aliyunAvatarApiUrl: String? = null,
    @SerializedName("aliyunAvatarInstanceId") val aliyunAvatarInstanceId: String? = null,
    @SerializedName("aliyunAccessKeyId") val aliyunAccessKeyId: String? = null,
    @SerializedName("aliyunAccessKeySecret") val aliyunAccessKeySecret: String? = null,
    @SerializedName("volcanoTtsHost") val volcanoTtsHost: String? = null,
    @SerializedName("volcanoTtsPath") val volcanoTtsPath: String? = null,
    @SerializedName("vadThreshold") val vadThreshold: Float? = null,
    @SerializedName("bargeInVadThreshold") val bargeInVadThreshold: Float? = null,
    @SerializedName("speechCooldownMs") val speechCooldownMs: Long? = null,
    // ===== 应用版本更新信息 =====
    @SerializedName("latestVersionName") val latestVersionName: String? = null,
    @SerializedName("latestVersionCode") val latestVersionCode: Int = 0,
    @SerializedName("forceUpdate") val forceUpdate: Boolean = false,
    @SerializedName("downloadUrl") val downloadUrl: String? = null,
    @SerializedName("releaseNotes") val releaseNotes: String? = null,
)
