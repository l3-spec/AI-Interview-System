package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.model.AppVersionInfo

class AppUpdateRepository(private val api: ApiService) {

    suspend fun checkUpdate(currentVersionCode: Int): Result<AppVersionInfo?> {
        return runCatching {
            val response = api.getAppVersion(
                platform = "ANDROID",
                currentVersionCode = currentVersionCode
            )
            if (!response.success) {
                throw IllegalStateException(response.message ?: "检测更新失败")
            }
            response.data
        }
    }
}
