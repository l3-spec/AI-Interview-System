package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.AuthApi
import com.xlwl.AiMian.data.api.ApiResponse
import com.xlwl.AiMian.data.model.*

class AuthRepository(private val api: AuthApi) {
    suspend fun requestLoginCode(req: SendCodeRequest): Result<LoginCodeData> = safe { api.requestLoginCode(req) }
    suspend fun deviceLogin(req: SendCodeRequest): Result<LoginData> = safe { api.deviceLogin(req) }
    suspend fun login(req: LoginRequest): Result<LoginData> = safe { api.login(req) }
    suspend fun register(req: RegisterRequest): Result<RegisterData> = safe { api.register(req) }
    suspend fun me(bearer: String): Result<User> = safe { api.me(bearer) }
    suspend fun logout(bearer: String): Result<Unit> = safe { api.logout(bearer) }

    private inline fun <reified T> safe(call: () -> ApiResponse<T>): Result<T> {
        return try {
            val resp = call()
            if (resp.success && resp.data != null) Result.success(resp.data)
            else Result.failure(Exception(resp.message ?: "请求失败"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
