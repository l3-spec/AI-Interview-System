package com.xlwl.AiMian.ai

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DigitalInterviewUiState(
    val sessionId: String = "",
    val position: String = "",
    val questionText: String = "",
    val currentQuestion: Int = 1,
    val totalQuestions: Int = 1,
    val initialCountdownSeconds: Int = 180,
    val timeRemaining: Int = 180,
    val isSpeaking: Boolean = true,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val statusMessage: String? = null,
    val isDigitalHumanReady: Boolean = false
)

class DigitalInterviewViewModel(
    application: Application,
    private val position: String,
    private val questionText: String,
    private val currentQuestion: Int,
    private val totalQuestions: Int,
    private val countdownSeconds: Int,
    private val sessionId: String = ""
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(
        DigitalInterviewUiState(
            sessionId = sessionId,
            position = position,
            questionText = questionText,
            currentQuestion = currentQuestion,
            totalQuestions = totalQuestions,
            initialCountdownSeconds = countdownSeconds,
            timeRemaining = countdownSeconds,
            isSpeaking = true,
            isLoading = false,  // 直接设置为 false，不显示加载遮罩
            statusMessage = null,
            isDigitalHumanReady = true
        )
    )
    val uiState: StateFlow<DigitalInterviewUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    init {
        startCountdown()
        initializeDigitalHuman()
    }

    private fun initializeDigitalHuman() {
        viewModelScope.launch {
            // 模拟短暂的初始化过程，提升体验感
            delay(300)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = null,
                    statusMessage = null,
                    isSpeaking = false,
                    isDigitalHumanReady = true
                )
            }
        }
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            var remaining = countdownSeconds
            while (remaining >= 0) {
                _uiState.update { it.copy(timeRemaining = remaining) }
                delay(1000)
                remaining--
            }
        }
    }

    fun onStartAnswer() {
        _uiState.update {
            it.copy(
                isSpeaking = false,
                statusMessage = null,
                isDigitalHumanReady = true
            )
        }
    }

    fun retryConnection() {
        _uiState.update {
            it.copy(
                errorMessage = null,
                statusMessage = "数字人状态已刷新",
                isDigitalHumanReady = true
            )
        }
    }

    fun endSession() {
        // 暂无额外资源需要回收，保留方法以便后续扩展
    }

    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
    }

    class Factory(
        private val application: Application,
        private val position: String,
        private val questionText: String,
        private val currentQuestion: Int,
        private val totalQuestions: Int,
        private val countdownSeconds: Int,
        private val sessionId: String = ""
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DigitalInterviewViewModel::class.java)) {
                return DigitalInterviewViewModel(
                    application = application,
                    position = position,
                    questionText = questionText,
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    countdownSeconds = countdownSeconds,
                    sessionId = sessionId
                ) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
