package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/login/user/code")
    suspend fun requestLoginCode(@Body req: SendCodeRequest): ApiResponse<LoginCodeData>

    @POST("auth/login/user")
    suspend fun login(@Body req: LoginRequest): ApiResponse<LoginData>

    @POST("auth/register/user")
    suspend fun register(@Body req: RegisterRequest): ApiResponse<RegisterData>

    @GET("auth/me")
    suspend fun me(@Header("Authorization") bearer: String): ApiResponse<User>

    @POST("auth/logout")
    suspend fun logout(@Header("Authorization") bearer: String): ApiResponse<Unit>
}
