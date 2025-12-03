package com.xlwl.AiMian.ai.session

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.xlwl.AiMian.ai.DigitalInterviewScreen
import com.xlwl.AiMian.ai.DigitalInterviewUiState
import com.xlwl.AiMian.ai.video.InterviewVideoRecorder
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.model.AiInterviewSubmitAnswerRequest
import com.xlwl.AiMian.data.model.OssUploadCompleteRequest
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.OssRepository
import java.io.File
import kotlinx.coroutines.launch

@Composable
fun InterviewSessionRoute(
  sessionId: String,
  initialState: AiInterviewFlowState?,
  repository: AiInterviewRepository,
  ossRepository: OssRepository,
  onClose: () -> Unit,
  onBack: () -> Unit
) {
  var flowState by remember(sessionId) { mutableStateOf(initialState) }
  var isLoading by remember(sessionId) { mutableStateOf(initialState == null) }
  var errorMessage by remember(sessionId) { mutableStateOf<String?>(null) }
  var reloadToken by remember(sessionId) { mutableStateOf(0) }

  LaunchedEffect(sessionId, reloadToken) {
    if (flowState == null) {
      isLoading = true
      errorMessage = null
      val result = repository.sessionDetail(sessionId)
      result.onSuccess { detail ->
        flowState = AiInterviewFlowState(
          jobId = detail.jobId,
          sessionId = detail.sessionId,
          jobTarget = detail.jobTarget,
          totalQuestions = detail.totalQuestions,
          questions = detail.questions.sortedBy { it.questionIndex }
        )
      }.onFailure { throwable ->
        errorMessage = throwable.message ?: "获取面试详情失败，请稍后重试"
      }
      isLoading = false
    }
  }

  when {
    isLoading -> LoadingScreen()
    errorMessage != null -> ErrorScreen(
      message = errorMessage!!,
      onRetry = {
        flowState = null
        isLoading = true
        errorMessage = null
        reloadToken += 1
      },
      onBack = onBack
    )

    flowState != null -> {
      SessionScreen(
        state = flowState!!,
        repository = repository,
        ossRepository = ossRepository,
        onClose = onClose
      )
    }

    else -> LoadingScreen()
  }
}

@Composable
private fun SessionScreen(
  state: AiInterviewFlowState,
  repository: AiInterviewRepository,
  ossRepository: OssRepository,
  onClose: () -> Unit
) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  val sortedQuestions = remember(state.sessionId, state.questions) {
    state.questions.sortedBy { it.questionIndex }
  }
  var currentIndex by remember(state.sessionId) { mutableIntStateOf(0) }
  var isSubmitting by remember(state.sessionId) { mutableStateOf(false) }
  var statusMessage by remember(state.sessionId) { mutableStateOf<String?>(null) }
  var errorMessage by remember(state.sessionId) { mutableStateOf<String?>(null) }
  val videoRecorder = remember { InterviewVideoRecorder(context) }

  val currentQuestion = sortedQuestions.getOrNull(currentIndex)
  val currentDisplayIndex = (currentQuestion?.questionIndex ?: currentIndex) + 1

  val uiState = remember(state.sessionId, currentIndex, isSubmitting, statusMessage) {
    DigitalInterviewUiState(
      sessionId = state.sessionId,
      position = state.jobTarget,
      questionText = currentQuestion?.questionText ?: "正在获取题目",
      currentQuestion = currentDisplayIndex,
      totalQuestions = state.totalQuestions,
      initialCountdownSeconds = 180,
      timeRemaining = 180,
      isSpeaking = false,
      isLoading = isSubmitting,
      statusMessage = statusMessage
    )
  }

  LaunchedEffect(errorMessage) {
    errorMessage?.let {
      Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
    }
  }

  DigitalInterviewScreen(
    uiState = uiState,
    onStartAnswer = { errorMessage = null },
    onRetry = { errorMessage = null },
    onInterviewComplete = { onClose() },
    videoRecorder = videoRecorder,
    onRecordingFinished = { file: File, durationMs: Long ->
      coroutineScope.launch {
        val questionIndex = currentQuestion?.questionIndex ?: currentIndex
        isSubmitting = true
        statusMessage = "正在上传第${currentDisplayIndex}题视频…"
        errorMessage = null

        val objectKey = "interview-videos/${state.sessionId}/${System.currentTimeMillis()}_${questionIndex}.mp4"
        val uploadResult = ossRepository.uploadVideo(file, objectKey)
        uploadResult.onSuccess { result ->
          val url = result.url ?: ""
          if (url.isBlank()) {
            errorMessage = "未获取到视频地址"
            statusMessage = null
            return@onSuccess
          }

          ossRepository.notifyUploadComplete(
            OssUploadCompleteRequest(
              sessionId = state.sessionId,
              questionIndex = questionIndex,
              ossUrl = url,
              fileSize = file.length(),
              duration = durationMs
            )
          )

          val submitResult = repository.submitAnswer(
            AiInterviewSubmitAnswerRequest(
              sessionId = state.sessionId,
              questionIndex = questionIndex,
              answerVideoUrl = url,
              answerDuration = (durationMs / 1000).toInt().coerceAtLeast(1)
            )
          )

          submitResult.onSuccess {
            file.delete()
            if (currentIndex >= sortedQuestions.lastIndex) {
              repository.complete(state.sessionId)
              statusMessage = "已提交全部题目，面试完成"
              onClose()
            } else {
              currentIndex += 1
              statusMessage = "已提交第${currentDisplayIndex}题，准备下一题"
            }
          }.onFailure { throwable ->
            statusMessage = null
            errorMessage = throwable.message ?: "提交答案失败，请重试"
          }
        }.onFailure { throwable ->
          statusMessage = null
          errorMessage = throwable.message ?: "视频上传失败，请重试"
        }

        isSubmitting = false
      }
    }
  )
}

@Composable
private fun LoadingScreen() {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    CircularProgressIndicator(color = Color(0xFFEC7C38))
    Spacer(modifier = Modifier.height(16.dp))
    Text(
      text = "正在连接面试间…",
      style = MaterialTheme.typography.bodyMedium,
      color = Color(0xFF1F2937)
    )
  }
}

@Composable
private fun ErrorScreen(
  message: String,
  onRetry: () -> Unit,
  onBack: () -> Unit
) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text(
      text = message,
      style = MaterialTheme.typography.bodyMedium,
      color = Color(0xFFEF4444),
      textAlign = TextAlign.Center
    )
    Spacer(modifier = Modifier.height(20.dp))
    Button(
      onClick = onRetry,
      colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEC7C38))
    ) {
      Text("重新加载")
    }
    TextButton(onClick = onBack) {
      Text("返回上一页", color = Color(0xFF1F2937))
    }
  }
}
