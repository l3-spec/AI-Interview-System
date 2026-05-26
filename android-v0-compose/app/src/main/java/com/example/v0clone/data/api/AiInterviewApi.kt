package com.example.v0clone.data.api

import com.xlwl.AiMian.data.model.AiInterviewCreateSessionData
import com.xlwl.AiMian.data.model.AiInterviewSessionDetail
import com.xlwl.AiMian.data.model.AiInterviewSessionSummary
import com.xlwl.AiMian.data.model.AiInterviewSessionsResponse
import com.xlwl.AiMian.data.model.AiInterviewSubmitAnswerRequest
import com.xlwl.AiMian.data.model.AttachConversationTurnVideoBody
import com.xlwl.AiMian.data.model.AttachConversationTurnVideoData
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.model.NextAiInterviewQuestionResponse
import com.xlwl.AiMian.data.model.SubmitAiInterviewAnswerResponse
import okhttp3.MultipartBody
import retrofit2.http.*

interface AiInterviewApi {

  @Multipart
  @POST("ai-interview/face-photo")
  suspend fun uploadFacePhoto(
    @Part image: MultipartBody.Part
  ): ApiResponse<Unit>

  @POST("ai-interview/create-session")
  suspend fun createSession(
    @Body request: CreateAiInterviewSessionRequest
  ): ApiResponse<AiInterviewCreateSessionData>

  @GET("ai-interview/session/{sessionId}")
  suspend fun getSession(
    @Path("sessionId") sessionId: String
  ): ApiResponse<AiInterviewSessionDetail>

  @GET("ai-interview/next-question/{sessionId}")
  suspend fun nextQuestion(
    @Path("sessionId") sessionId: String
  ): NextAiInterviewQuestionResponse

  @POST("ai-interview/submit-answer")
  suspend fun submitAnswer(
    @Body request: AiInterviewSubmitAnswerRequest
  ): SubmitAiInterviewAnswerResponse

  @PATCH("ai-interview/sessions/{sessionId}/conversation-turns/{sequence}/candidate-video")
  suspend fun attachConversationTurnVideo(
    @Path("sessionId") sessionId: String,
    @Path("sequence") sequence: Int,
    @Body body: AttachConversationTurnVideoBody
  ): ApiResponse<AttachConversationTurnVideoData?>

  @Multipart
  @POST("ai-interview/sessions/{sessionId}/conversation-turns/{sequence}/candidate-video")
  suspend fun uploadConversationTurnVideo(
    @Path("sessionId") sessionId: String,
    @Path("sequence") sequence: Int,
    @Part video: MultipartBody.Part
  ): ApiResponse<AttachConversationTurnVideoData?>

  @POST("ai-interview/complete/{sessionId}")
  suspend fun complete(
    @Path("sessionId") sessionId: String
  ): SubmitAiInterviewAnswerResponse

  @GET("ai-interview/history")
  suspend fun getInterviewHistory(): AiInterviewSessionsResponse
}
