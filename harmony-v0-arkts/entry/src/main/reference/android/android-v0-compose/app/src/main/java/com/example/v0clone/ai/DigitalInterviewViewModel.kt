package com.xlwl.AiMian.ai

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.api.DigitalHumanApi
import com.xlwl.AiMian.data.api.RetrofitClient
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.model.CreateDigitalHumanSessionRequest
import com.xlwl.AiMian.data.model.DigitalHumanSession
import com.xlwl.AiMian.data.model.DigitalHumanTextDriveRequest
import com.xlwl.AiMian.data.repository.DigitalHumanRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DigitalInterviewUiState(
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
    val videoUrl: String? = null,
    val sessionId: String? = null,
    val session: DigitalHumanSession? = null
)

class DigitalInterviewViewModel(
    application: Application,
    private val sessionRequest: CreateDigitalHumanSessionRequest,
    private val position: String,
    private val questionText: String,
    private val currentQuestion: Int,
    private val totalQuestions: Int,
    private val countdownSeconds: Int,
    private val voiceModelOverride: String? = null
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(
        DigitalInterviewUiState(
            position = position,
            questionText = questionText,
            currentQuestion = currentQuestion,
            totalQuestions = totalQuestions,
            initialCountdownSeconds = countdownSeconds,
            timeRemaining = countdownSeconds,
            isSpeaking = true,
            isLoading = true,
            statusMessage = "正在初始化..."
        )
    )
    val uiState: StateFlow<DigitalInterviewUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null
    private var sessionJob: Job? = null
    private lateinit var repository: DigitalHumanRepository
    private val authManager = AuthManager(application)

    init {
        viewModelScope.launch {
            val token = authManager.tokenFlow.first()
            if (token == null) {
                _uiState.update { it.copy(isLoading = false, errorMessage = "未找到用户凭证，请重新登录") }
                return@launch
            }
            val client = RetrofitClient.createOkHttpClient { token }
            val digitalHumanApi = RetrofitClient.createService(DigitalHumanApi::class.java, client)
            repository = DigitalHumanRepository(digitalHumanApi)

            startCountdown()
            connectDigitalHuman()
        }
    }

    private fun connectDigitalHuman() {
        sessionJob?.cancel()
        sessionJob = viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    errorMessage = null,
                    statusMessage = "正在连接数字人..."
                )
            }

            repository.createSession(sessionRequest).onSuccess { session ->
                val playbackUrl = session.hlsUrl ?: session.webRtcUrl ?: session.rtmpUrl
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        session = session,
                        sessionId = session.sessionId,
                        videoUrl = playbackUrl,
                        statusMessage = if (playbackUrl.isNullOrBlank()) {
                            "数字人在线，但暂未获取到视频流"
                        } else {
                            "数字人已就位"
                        }
                    )
                }

                if (!playbackUrl.isNullOrBlank()) {
                    speakQuestion(session.sessionId, questionText)
                } else {
                    _uiState.update {
                        it.copy(
                            errorMessage = "未能获取数字人视频流，请稍后重试",
                            isSpeaking = false
                        )
                    }
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = throwable.message ?: "连接数字人失败",
                        statusMessage = null,
                        isSpeaking = false
                    )
                }
            }
        }
    }

    private fun speakQuestion(sessionId: String, text: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSpeaking = true, statusMessage = "数字人播报中") }
            repository.driveWithText(
                DigitalHumanTextDriveRequest(
                    sessionId = sessionId,
                    text = text,
                    voiceModel = voiceModelOverride ?: sessionRequest.voiceModel,
                    speed = 1.0f,
                    pitch = 0f,
                    volume = 1.0f
                )
            ).onFailure { error ->
                _uiState.update {
                    it.copy(
                        statusMessage = error.message ?: "数字人播报失败",
                        isSpeaking = false
                    )
                }
            }.onSuccess { result ->
                _uiState.update {
                    it.copy(
                        statusMessage = result.message ?: "数字人播报完成",
                        isSpeaking = false
                    )
                }
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
        _uiState.update { it.copy(isSpeaking = false, statusMessage = "请开始作答") }
    }

    fun retryConnection() {
        if(::repository.isInitialized) {
            connectDigitalHuman()
        }
    }

    fun endSession() {
        val sessionId = _uiState.value.sessionId ?: return
        if(::repository.isInitialized) {
            viewModelScope.launch {
                repository.endSession(sessionId)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
        sessionJob?.cancel()
    }

    class Factory(
        private val application: Application,
        private val sessionRequest: CreateDigitalHumanSessionRequest,
        private val position: String,
        private val questionText: String,
        private val currentQuestion: Int,
        private val totalQuestions: Int,
        private val countdownSeconds: Int,
        private val voiceModelOverride: String? = null
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DigitalInterviewViewModel::class.java)) {
                return DigitalInterviewViewModel(
                    application = application,
                    sessionRequest = sessionRequest,
                    position = position,
                    questionText = questionText,
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    countdownSeconds = countdownSeconds,
                    voiceModelOverride = voiceModelOverride
                ) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
