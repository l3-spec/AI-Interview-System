package com.xlwl.AiMian.data.model

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

data class CreateAiInterviewSessionRequest(
  val jobTarget: String,
  val jobCategory: String? = null,
  val jobSubCategory: String? = null,
  val companyTarget: String? = null,
  val background: String? = null,
  val questionCount: Int? = null
)

data class AiInterviewCreateSessionData(
  val sessionId: String,
  val questions: List<AiInterviewQuestion>,
  val totalQuestions: Int,
  val jobCategory: String? = null,
  val jobSubCategory: String? = null,
  val plannedDuration: Int? = null,
  val prompt: String? = null
)

@Parcelize
data class AiInterviewQuestion(
  val questionIndex: Int,
  val questionText: String,
  val audioUrl: String? = null,
  val audioPath: String? = null,
  val videoUrl: String? = null,
  val status: String? = null,
  @SerializedName("duration")
  val audioDuration: Int? = null
) : Parcelable

@Parcelize
data class AiInterviewSessionDetail(
  val sessionId: String,
  val userId: String,
  val jobTarget: String,
  val companyTarget: String?,
  val background: String?,
  val status: String,
  val currentQuestion: Int,
  val totalQuestions: Int,
  val questions: List<AiInterviewQuestion>,
  val createdAt: String?,
  val startedAt: String?
) : Parcelable

data class NextAiInterviewQuestionResponse(
  val success: Boolean,
  val question: AiInterviewQuestion?,
  val isCompleted: Boolean? = null,
  val message: String? = null,
  val error: String? = null
)

data class AiInterviewSubmitAnswerRequest(
  val sessionId: String,
  val questionIndex: Int,
  val answerText: String? = null,
  val answerVideoUrl: String? = null,
  val answerVideoPath: String? = null,
  val answerDuration: Int? = null
)

data class SubmitAiInterviewAnswerResponse(
  val success: Boolean,
  val message: String? = null,
  val nextQuestion: Int? = null,
  val isCompleted: Boolean? = null,
  val error: String? = null
)

@Parcelize
data class AiInterviewFlowState(
  val sessionId: String,
  val jobTarget: String,
  val totalQuestions: Int,
  val questions: List<AiInterviewQuestion>,
  val jobCategory: String? = null,
  val jobSubCategory: String? = null,
  val plannedDurationMinutes: Int? = null,
  val prompt: String? = null
) : Parcelable

data class AiInterviewSessionsResponse(
  val success: Boolean,
  val sessions: List<AiInterviewSessionSummary>?,
  val message: String? = null,
  val error: String? = null
)

data class AiInterviewSessionSummary(
  val id: String? = null,
  @SerializedName("sessionId")
  val sessionId: String? = null,
  val jobTarget: String? = null,
  val jobCategory: String? = null,
  val jobSubCategory: String? = null,
  val status: String? = null,
  @SerializedName("analysisStatus")
  val analysisStatus: String? = null,
  val resumeType: String? = null,
  val reportUrl: String? = null,
  @SerializedName("reportReady")
  val reportReady: Boolean? = null,
  val questions: List<AiInterviewSessionQuestionSummary> = emptyList()
)

data class AiInterviewSessionQuestionSummary(
  val questionIndex: Int,
  val questionText: String? = null,
  val status: String? = null
)
