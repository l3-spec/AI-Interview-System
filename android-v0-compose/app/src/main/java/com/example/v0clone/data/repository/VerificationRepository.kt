package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.model.VerificationInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class VerificationRepository(private val apiService: ApiService) {

    suspend fun getStatus(): Result<VerificationInfo?> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getVerificationStatus()
            if (response.success) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取认证状态失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitVerification(
        legalPerson: String,
        registrationNumber: String,
        businessLicenseFile: File?,
        existingLicenseUrl: String?
    ): Result<VerificationInfo> = withContext(Dispatchers.IO) {
        try {
            val textType = "text/plain".toMediaType()
            val legalPersonBody = legalPerson.toRequestBody(textType)
            val registrationBody = registrationNumber.toRequestBody(textType)
            val licensePart = when {
                businessLicenseFile != null -> {
                    val mediaType = when (businessLicenseFile.extension.lowercase()) {
                        "png" -> "image/png"
                        "jpg", "jpeg" -> "image/jpeg"
                        "webp" -> "image/webp"
                        "gif" -> "image/gif"
                        else -> "application/octet-stream"
                    }.toMediaTypeOrNull() ?: "application/octet-stream".toMediaType()
                    val body = businessLicenseFile.asRequestBody(mediaType)
                    MultipartBody.Part.createFormData(
                        "businessLicense",
                        businessLicenseFile.name,
                        body
                    )
                }

                !existingLicenseUrl.isNullOrBlank() -> MultipartBody.Part.createFormData(
                    "businessLicense",
                    existingLicenseUrl
                )

                else -> null
            }

            if (licensePart == null) {
                return@withContext Result.failure(Exception("请上传身份证照片"))
            }

            val response = apiService.submitVerification(
                businessLicense = licensePart,
                legalPerson = legalPersonBody,
                registrationNumber = registrationBody
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "提交认证失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun requestVerificationCode(phone: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.sendVerificationCode(com.xlwl.AiMian.data.model.SendCodeRequest(phone))
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message ?: "发送验证码失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitPersonalVerification(
        realName: String,
        idNumber: String,
        phone: String,
        code: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = com.xlwl.AiMian.data.model.PersonalVerificationRequest(realName, idNumber, phone, code)
            val response = apiService.submitPersonalVerification(request)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message ?: "实名认证失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
