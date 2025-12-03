package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiResponse
import com.xlwl.AiMian.data.api.OssApi
import com.xlwl.AiMian.data.model.OssConfig
import com.xlwl.AiMian.data.model.OssUploadCompleteRequest
import com.xlwl.AiMian.data.model.OssUploadResult
import java.io.File
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

class OssRepository(private val api: OssApi) {

  suspend fun fetchConfig(): Result<OssConfig> = safe { api.getConfig() }

  suspend fun uploadVideo(file: File, objectKey: String?): Result<OssUploadResult> =
    runCatching {
      val requestBody = file.asRequestBody("video/mp4".toMediaType())
      val part = MultipartBody.Part.createFormData("file", file.name, requestBody)
      val objectKeyBody = objectKey?.toRequestBody("text/plain".toMediaType())
      val response = api.uploadFile(part, objectKeyBody)
      if (response.success && response.data != null) {
        response.data
      } else {
        throw IllegalStateException(response.message ?: response.error ?: "视频上传失败")
      }
    }

  suspend fun notifyUploadComplete(request: OssUploadCompleteRequest): Result<Unit> =
    runCatching {
      val response = api.uploadComplete(request)
      if (response.success) {
        Unit
      } else {
        throw IllegalStateException(response.message ?: response.error ?: "上传完成回调失败")
      }
    }

  private suspend fun <T> safe(block: suspend () -> ApiResponse<T>): Result<T> =
    try {
      val response = block()
      if (response.success && response.data != null) {
        Result.success(response.data)
      } else {
        Result.failure(Exception(response.message ?: response.error ?: "请求失败"))
      }
    } catch (e: Exception) {
      Result.failure(e)
    }
}
