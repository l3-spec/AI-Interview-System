package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.AiInterviewCreateSessionData
import com.xlwl.AiMian.data.model.AiInterviewSessionDetail
import com.xlwl.AiMian.data.model.AiInterviewSessionSummary
import com.xlwl.AiMian.data.model.AiInterviewSessionsResponse
import com.xlwl.AiMian.data.model.AiInterviewSubmitAnswerRequest
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.model.NextAiInterviewQuestionResponse
import com.xlwl.AiMian.data.model.SubmitAiInterviewAnswerResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface AiInterviewApi {

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

  @POST("ai-interview/complete/{sessionId}")
  suspend fun complete(
    @Path("sessionId") sessionId: String
  ): SubmitAiInterviewAnswerResponse

  @GET("ai-interview/history")
  suspend fun getInterviewHistory(): AiInterviewSessionsResponse
}
