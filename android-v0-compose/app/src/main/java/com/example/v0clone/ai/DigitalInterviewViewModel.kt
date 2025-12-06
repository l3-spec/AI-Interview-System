package com.xlwl.AiMian.ai

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.AiInterviewSubmitAnswerRequest
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.OssRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File

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
    val isUploading: Boolean = false,
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
    private val sessionId: String = "",
    private val ossRepository: OssRepository,
    private val aiInterviewRepository: AiInterviewRepository
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
            isLoading = false,
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

    fun updateCurrentQuestion(index: Int) {
        if (index > 0 && index != _uiState.value.currentQuestion) {
            _uiState.update {
                it.copy(currentQuestion = index)
            }
        }
    }

    fun submitAnswer(videoFile: File, durationMillis: Long) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true, statusMessage = "正在上传视频...") }
            
            try {
                // 1. Upload video to OSS
                val objectKey = "interview/${sessionId}/${currentQuestion}_${System.currentTimeMillis()}.mp4"
                val uploadResult = ossRepository.uploadVideo(videoFile, objectKey)
                
                if (uploadResult.isFailure) {
                    throw uploadResult.exceptionOrNull() ?: Exception("视频上传失败")
                }
                
                val videoUrl = uploadResult.getOrNull()?.url ?: throw Exception("未获取到视频地址")
                Log.d("DigitalInterviewVM", "Video uploaded successfully: $videoUrl")

                // 2. Submit answer to backend
                val request = AiInterviewSubmitAnswerRequest(
                    sessionId = sessionId,
                    questionIndex = currentQuestion - 1, // 0-based index
                    answerVideoUrl = videoUrl,
                    answerDuration = (durationMillis / 1000).toInt()
                )
                
                val submitResult = aiInterviewRepository.submitAnswer(request)
                
                if (submitResult.isSuccess) {
                    val response = submitResult.getOrNull()
                    if (response?.isCompleted == true) {
                        _uiState.update { it.copy(isUploading = false, statusMessage = "面试已完成") }
                        // Activity will handle completion via onInterviewComplete callback if needed, 
                        // but currently we might need a way to signal completion state or just let the flow continue.
                        // For now, we rely on the UI to react to completion or just wait for the next question logic (if any).
                        // However, since this is a "submit answer" action, we usually expect to move to next question or finish.
                    } else {
                        _uiState.update { it.copy(isUploading = false, statusMessage = "答案提交成功") }
                    }
                } else {
                    throw submitResult.exceptionOrNull() ?: Exception("提交答案失败")
                }
                
            } catch (e: Exception) {
                Log.e("DigitalInterviewVM", "Submit answer failed", e)
                _uiState.update { 
                    it.copy(
                        isUploading = false, 
                        errorMessage = "提交失败: ${e.message}",
                        statusMessage = null
                    ) 
                }
            }
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
        private val sessionId: String = "",
        private val ossRepository: OssRepository,
        private val aiInterviewRepository: AiInterviewRepository
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
                    sessionId = sessionId,
                    ossRepository = ossRepository,
                    aiInterviewRepository = aiInterviewRepository
                ) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
