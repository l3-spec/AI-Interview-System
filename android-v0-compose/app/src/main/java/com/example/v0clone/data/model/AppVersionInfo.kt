package com.xlwl.AiMian.data.model

data class AppVersionInfo(
    val id: String,
    val platform: String,
    val versionName: String,
    val versionCode: Int,
    val downloadUrl: String,
    val releaseNotes: String?,
    val isMandatory: Boolean,
    val isActive: Boolean,
    val shouldUpdate: Boolean = false,
    val forceUpdate: Boolean = false
)
