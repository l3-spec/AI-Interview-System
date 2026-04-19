package com.xlwl.AiMian.ai.session

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.model.OssUploadCompleteRequest
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.OssRepository

private val bgColor = Color(0xFF0C1220)
private val accentColor = Color(0xFF4A9EFF)

@Composable
fun InterviewSessionRoute(
  sessionId: String,
  initialState: AiInterviewFlowState?,
  repository: AiInterviewRepository,
  ossRepository: OssRepository,
  onClose: () -> Unit,
  onBack: () -> Unit
) {
  val context = LocalContext.current
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
      VideoSubmissionScreen(
        state = flowState!!,
        repository = repository,
        ossRepository = ossRepository,
        onClose = onClose,
        onBack = onBack
      )
    }
    else -> LoadingScreen()
  }
}

@Composable
private fun LoadingScreen() {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .statusBarsPadding()
      .navigationBarsPadding()
      .padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    CircularProgressIndicator(color = accentColor)
    Spacer(modifier = Modifier.height(16.dp))
    Text(
      text = "正在加载面试内容…",
      style = MaterialTheme.typography.bodyMedium,
      color = Color.White
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
      .statusBarsPadding()
      .navigationBarsPadding()
      .padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text(
      text = message,
      style = MaterialTheme.typography.bodyMedium,
      color = Color.White,
      textAlign = TextAlign.Center
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
      onClick = onRetry,
      colors = ButtonDefaults.buttonColors(
        containerColor = accentColor
      )
    ) {
      Text("重新尝试", color = Color.White)
    }
    Spacer(modifier = Modifier.height(12.dp))
    TextButton(onClick = onBack) {
      Text("返回上一页", color = Color.White.copy(alpha = 0.7f))
    }
  }
}
