package com.xlwl.AiMian.ai.session

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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.xlwl.AiMian.ai.DigitalInterviewScreen
import com.xlwl.AiMian.ai.DigitalInterviewUiState
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.repository.AiInterviewRepository

@Composable
fun InterviewSessionRoute(
  sessionId: String,
  initialState: AiInterviewFlowState?,
  repository: AiInterviewRepository,
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
        onBackClick = onBack,
        onStartAnswer = onClose
      )
    }

    else -> LoadingScreen()
  }
}

@Composable
private fun SessionScreen(
  state: AiInterviewFlowState,
  onBackClick: () -> Unit,
  onStartAnswer: () -> Unit
) {
  val currentQuestion = remember(state.sessionId, state.questions) {
    state.questions.minByOrNull { it.questionIndex }
  }

  val uiState = remember(state.sessionId, currentQuestion) {
    DigitalInterviewUiState(
      position = state.jobTarget,
      questionText = currentQuestion?.questionText ?: "STAR-LINK 数字人正在准备题目",
      currentQuestion = (currentQuestion?.questionIndex ?: 0) + 1,
      totalQuestions = state.totalQuestions,
      initialCountdownSeconds = 180,
      timeRemaining = 180,
      isSpeaking = false,
      isLoading = false,
      statusMessage = "请前往全屏数字人面试页面体验沉浸式沟通"
    )
  }

  DigitalInterviewScreen(
    uiState = uiState,
    onBackClick = onBackClick,
    onStartAnswer = onStartAnswer,
    onRetry = {}
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
      text = "正在连接 STAR-LINK 面试间…",
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
