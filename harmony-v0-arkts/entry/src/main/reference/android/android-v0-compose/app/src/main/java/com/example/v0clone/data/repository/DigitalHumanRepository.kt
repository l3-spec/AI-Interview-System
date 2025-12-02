package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.DigitalHumanApi
import com.xlwl.AiMian.data.model.CreateDigitalHumanSessionRequest
import com.xlwl.AiMian.data.model.DigitalHumanEndSessionRequest
import com.xlwl.AiMian.data.model.DigitalHumanSession
import com.xlwl.AiMian.data.model.DigitalHumanTextDriveRequest
import com.xlwl.AiMian.data.model.DigitalHumanTextDriveResult
import com.xlwl.AiMian.data.model.toModel

class DigitalHumanRepository(
    private val api: DigitalHumanApi
) {

    suspend fun createSession(
        request: CreateDigitalHumanSessionRequest
    ): Result<DigitalHumanSession> = runCatching {
        val response = api.createRealtimeSession(request)
        val payload = response.data
        if (response.success && payload != null) {
            payload.toModel()
        } else {
            throw IllegalStateException(response.message ?: response.error ?: "创建数字人会话失败")
        }
    }

    suspend fun driveWithText(
        request: DigitalHumanTextDriveRequest
    ): Result<DigitalHumanTextDriveResult> = runCatching {
        val response = api.driveWithText(request)
        val payload = response.data
        if (response.success && payload != null) {
            payload.toModel()
        } else {
            throw IllegalStateException(response.message ?: response.error ?: "数字人播报失败")
        }
    }

    suspend fun endSession(sessionId: String): Result<Unit> = runCatching {
        val response = api.endSession(DigitalHumanEndSessionRequest(sessionId))
        if (response.success) {
            Unit
        } else {
            throw IllegalStateException(response.message ?: response.error ?: "结束数字人会话失败")
        }
    }
}
