package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.OssConfig
import com.xlwl.AiMian.data.model.OssUploadCompleteRequest
import com.xlwl.AiMian.data.model.OssUploadResult
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface OssApi {

  @GET("oss/config")
  suspend fun getConfig(): ApiResponse<OssConfig>

  @Multipart
  @POST("oss/upload-file")
  suspend fun uploadFile(
    @Part file: MultipartBody.Part,
    @Part("objectKey") objectKey: RequestBody? = null
  ): ApiResponse<OssUploadResult>

  @POST("oss/upload-complete")
  suspend fun uploadComplete(
    @Body request: OssUploadCompleteRequest
  ): ApiResponse<Unit>
}
