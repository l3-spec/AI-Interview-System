package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.CreateDigitalHumanSessionRequest
import com.xlwl.AiMian.data.model.DigitalHumanEndSessionRequest
import com.xlwl.AiMian.data.model.DigitalHumanSessionDto
import com.xlwl.AiMian.data.model.DigitalHumanTextDriveRequest
import com.xlwl.AiMian.data.model.DigitalHumanTextDriveResultDto
import retrofit2.http.Body
import retrofit2.http.POST

interface DigitalHumanApi {

    @POST("digital-human/session/create")
    suspend fun createRealtimeSession(
        @Body request: CreateDigitalHumanSessionRequest
    ): ApiResponse<DigitalHumanSessionDto>

    @POST("digital-human/session/text-drive")
    suspend fun driveWithText(
        @Body request: DigitalHumanTextDriveRequest
    ): ApiResponse<DigitalHumanTextDriveResultDto>

    @POST("digital-human/session/end")
    suspend fun endSession(
        @Body request: DigitalHumanEndSessionRequest
    ): ApiResponse<Unit>
}
