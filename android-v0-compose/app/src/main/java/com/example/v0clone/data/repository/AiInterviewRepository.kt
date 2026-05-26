package com.xlwl.AiMian.data.repository

import com.example.v0clone.data.api.AiInterviewApi
import com.example.v0clone.data.api.ApiResponse
import com.xlwl.AiMian.data.model.AiInterviewCreateSessionData
import com.xlwl.AiMian.data.model.AiInterviewSessionDetail
import com.xlwl.AiMian.data.model.AiInterviewSessionSummary
import com.xlwl.AiMian.data.model.AiInterviewSessionsResponse
import com.xlwl.AiMian.data.model.AttachConversationTurnVideoBody
import com.xlwl.AiMian.data.model.AiInterviewSubmitAnswerRequest
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.model.NextAiInterviewQuestionResponse
import com.xlwl.AiMian.data.model.SubmitAiInterviewAnswerResponse
import android.graphics.Bitmap
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID

class AiInterviewRepository(private val api: AiInterviewApi) {

  suspend fun createSession(request: CreateAiInterviewSessionRequest): Result<AiInterviewCreateSessionData> =
    safe { api.createSession(request) }

  suspend fun uploadFacePhoto(bitmap: Bitmap): Result<Unit> = try {
    val bos = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, bos)
    val bytes = bos.toByteArray()
    val requestFile = bytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
    val body = MultipartBody.Part.createFormData("image", "${UUID.randomUUID()}.jpg", requestFile)
    val response = api.uploadFacePhoto(body)
    if (response.success) {
      Result.success(Unit)
    } else {
      Result.failure(Exception(response.message ?: response.error ?: "图片上传失败"))
    }
  } catch (e: Exception) {
    Result.failure(e)
  }

  suspend fun sessionDetail(sessionId: String): Result<AiInterviewSessionDetail> =
    safe { api.getSession(sessionId) }

  suspend fun nextQuestion(sessionId: String): Result<NextAiInterviewQuestionResponse> =
    runCatching { api.nextQuestion(sessionId) }.fold(
      onSuccess = { response ->
        if (response.success) {
          Result.success(response)
        } else {
          Result.failure(Exception(response.message ?: response.error ?: "获取下一题失败"))
        }
      },
      onFailure = { Result.failure(it) }
    )

  suspend fun submitAnswer(request: AiInterviewSubmitAnswerRequest): Result<SubmitAiInterviewAnswerResponse> =
    runCatching { api.submitAnswer(request) }.fold(
      onSuccess = { response ->
        if (response.success) {
          Result.success(response)
        } else {
          Result.failure(Exception(response.message ?: response.error ?: "提交答案失败"))
        }
      },
      onFailure = { Result.failure(it) }
    )

  /**
   * 将已上传 OSS 的 URL 绑定到某轮沟通记录（sequence 来自 Socket `candidate_turn_recorded`）
   */
  suspend fun attachConversationTurnVideoUrl(
    sessionId: String,
    sequence: Int,
    videoUrl: String,
    durationMs: Int? = null
  ): Result<Unit> =
    runCatching {
      val r = api.attachConversationTurnVideo(
        sessionId,
        sequence,
        AttachConversationTurnVideoBody(videoUrl = videoUrl, durationMs = durationMs)
      )
      if (r.success) {
        Unit
      } else {
        throw Exception(r.message ?: r.error ?: "绑定答题视频失败")
      }
    }

  /**
   * 直传本地视频文件，由后端写入 OSS 并绑定到该轮沟通
   */
  suspend fun uploadConversationTurnVideoFile(
    sessionId: String,
    sequence: Int,
    file: File,
    mime: String = "video/mp4"
  ): Result<String> =
    runCatching {
      val body = MultipartBody.Part.createFormData(
        "video",
        file.name,
        file.asRequestBody(mime.toMediaTypeOrNull())
      )
      val r = api.uploadConversationTurnVideo(sessionId, sequence, body)
      if (r.success) {
        r.data?.videoUrl ?: throw Exception("上传成功但未返回 videoUrl")
      } else {
        throw Exception(r.message ?: r.error ?: "上传答题视频失败")
      }
    }

  suspend fun complete(sessionId: String): Result<SubmitAiInterviewAnswerResponse> =
    runCatching { api.complete(sessionId) }.fold(
      onSuccess = { response ->
        if (response.success) {
          Result.success(response)
        } else {
          Result.failure(Exception(response.message ?: response.error ?: "结束面试失败"))
        }
      },
      onFailure = { Result.failure(it) }
    )

  suspend fun getInterviewHistory(): Result<List<AiInterviewSessionSummary>> =
    runCatching { api.getInterviewHistory() }
      .fold(
        onSuccess = { response -> interpretHistory(response) },
        onFailure = { Result.failure(it) }
      )

  suspend fun hasCompletedResumeReport(): Result<Boolean> =
    getInterviewHistory().map { sessions ->
      sessions.any { session ->
        val status = session.status.orEmpty().uppercase()
        val analysis = session.analysisStatus.orEmpty().uppercase()
        val hasResumeType = !session.resumeType.isNullOrBlank()
        val hasReportUrl = !session.reportUrl.isNullOrBlank()
        val reportReady = session.reportReady == true
        status == "COMPLETED" ||
          analysis in setOf("COMPLETED", "FINISHED", "READY") ||
          hasResumeType ||
          hasReportUrl ||
          reportReady
      }
    }

  private fun interpretHistory(response: AiInterviewSessionsResponse): Result<List<AiInterviewSessionSummary>> =
    if (response.success) {
      Result.success(response.sessions.orEmpty())
    } else {
      Result.failure(
        Exception(
          response.message ?: response.error ?: "获取面试记录失败"
        )
      )
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
