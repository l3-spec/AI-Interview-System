package com.example.v0clone.ai

import android.net.Uri
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
    val webUrl: String? = null,
    val webViewReloadKey: Int = 0
)

class DigitalInterviewViewModel(
    private val position: String,
    private val questionText: String,
    private val currentQuestion: Int,
    private val totalQuestions: Int,
    private val countdownSeconds: Int,
    private val airiWebUrl: String = DEFAULT_AIRI_WEB_URL
) : ViewModel() {

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

    init {
        startCountdown()
        initializeAiri()
    }

    private fun initializeAiri() {
        viewModelScope.launch {
            val url = buildAiriUrl()
            if (url == null) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "未配置AIRI数字人地址，请检查配置",
                        statusMessage = null,
                        isSpeaking = false,
                        webUrl = null
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = null,
                        statusMessage = "AIRI数字人已就绪",
                        isSpeaking = false,
                        webUrl = url
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
        val targetUrl = buildAiriUrl()
        _uiState.update {
            it.copy(
                errorMessage = if (targetUrl == null) "未配置AIRI数字人地址，请检查配置" else null,
                webUrl = targetUrl,
                statusMessage = if (targetUrl != null) "AIRI数字人已刷新" else it.statusMessage,
                webViewReloadKey = it.webViewReloadKey + 1
            )
        }
    }

    fun endSession() {
        // No-op for AIRI web experience
    }

    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
    }

    private fun buildAiriUrl(): String? {
        val trimmed = airiWebUrl.trim()
        if (trimmed.isEmpty()) return null
        val base = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
        val uri = UriBuilder(base)
        if (position.isNotBlank()) {
            uri.add("position", position)
        }
        if (questionText.isNotBlank()) {
            uri.add("question", questionText)
        }
        uri.add("currentQuestion", currentQuestion.toString())
        uri.add("totalQuestions", totalQuestions.toString())
        uri.add("countdownSeconds", countdownSeconds.toString())
        return uri.build()
    }

    private class UriBuilder(base: String) {
        private val baseUrl = base.trimEnd('/')
        private val params = mutableListOf<Pair<String, String>>()

        fun add(key: String, value: String) {
            params += key to value
        }

        fun build(): String {
            if (params.isEmpty()) return baseUrl
            val query = params.joinToString("&") { (k, v) -> "${k}=${Uri.encode(v)}" }
            return "$baseUrl?$query"
        }
    }

    companion object {
        private const val DEFAULT_AIRI_WEB_URL = "http://10.0.2.2:3000/avatar"
    }

    class Factory(
        private val position: String,
        private val questionText: String,
        private val currentQuestion: Int,
        private val totalQuestions: Int,
        private val countdownSeconds: Int,
        private val airiWebUrl: String = DEFAULT_AIRI_WEB_URL
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DigitalInterviewViewModel::class.java)) {
                return DigitalInterviewViewModel(
                    position = position,
                    questionText = questionText,
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    countdownSeconds = countdownSeconds,
                    airiWebUrl = airiWebUrl
                ) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
