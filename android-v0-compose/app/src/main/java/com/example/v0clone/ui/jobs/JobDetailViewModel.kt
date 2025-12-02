package com.xlwl.AiMian.ui.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.JobDetailDto
import com.xlwl.AiMian.data.repository.JobQueryParams
import com.xlwl.AiMian.data.repository.JobRepository
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import java.time.Instant
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class JobDetailUiState(
    val isLoading: Boolean = true,
    val job: JobDetail? = null,
    val error: String? = null,
    val isApplying: Boolean = false,
    val applySuccess: Boolean = false,
    val applyError: String? = null,
    val recommended: List<JobListing> = emptyList(),
    val isLoadingRecommendations: Boolean = false,
    val recommendationError: String? = null,
    val isCheckingResume: Boolean = false,
    val hasAiResumeReport: Boolean? = null
)

class JobDetailViewModel(
    private val repository: JobRepository,
    private val aiInterviewRepository: AiInterviewRepository,
    private val jobId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(JobDetailUiState())
    val uiState: StateFlow<JobDetailUiState> = _uiState.asStateFlow()
    private val _events = MutableSharedFlow<JobDetailEvent>()
    val events: SharedFlow<JobDetailEvent> = _events.asSharedFlow()
    private var lastDetailDto: JobDetailDto? = null
    private var recommendationPage: Int = 1

    init {
        loadJob()
    }

    fun retry() {
        loadJob()
    }

    private fun loadJob() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    error = null,
                    recommended = emptyList(),
                    recommendationError = null,
                    isLoadingRecommendations = false,
                    isCheckingResume = false,
                    hasAiResumeReport = null
                )
            }
            val result = repository.getJobDetail(jobId)
            if (result.isSuccess) {
                val now = Instant.now()
                val detailDto = result.getOrNull()
                if (detailDto != null) {
                    lastDetailDto = detailDto
                    recommendationPage = 1
                    val detail = detailDto.toJobDetail(now)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            job = detail,
                            error = null
                        )
                    }
                    loadRecommendations(reset = true)
                } else {
                    handleJobError("加载岗位详情失败")
                }
            } else {
                val message = result.exceptionOrNull()?.message ?: "加载岗位详情失败"
                handleJobError(message)
            }
        }
    }

    private fun handleJobError(message: String) {
        lastDetailDto = null
        recommendationPage = 1
        _uiState.update {
            it.copy(
                isLoading = false,
                job = null,
                error = message,
                recommended = emptyList(),
                isLoadingRecommendations = false,
                recommendationError = null
            )
        }
    }

    fun refreshRecommendations() {
        if (_uiState.value.isLoadingRecommendations) return
        loadRecommendations(reset = false)
    }

    private fun loadRecommendations(reset: Boolean) {
        val detailDto = lastDetailDto ?: return
        val page = if (reset) 1 else recommendationPage
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingRecommendations = true,
                    recommendationError = null,
                    recommended = if (reset) emptyList() else it.recommended
                )
            }
            val query = JobQueryParams(
                keyword = detailDto.title.takeIf { it.isNotBlank() },
                location = detailDto.location,
                category = detailDto.category,
                sort = "recommended"
            )
            val result = repository.getJobs(page = page, pageSize = 3, params = query)
            if (result.isSuccess) {
                val paged = result.getOrNull()
                val now = Instant.now()
                val items = paged?.list
                    ?.map { it.toJobListing(now) }
                    ?.filter { it.id != detailDto.id }
                    ?.take(3)
                    ?: emptyList()
                val hasMore = paged?.hasMore ?: false
                recommendationPage = if (hasMore) page + 1 else 1
                _uiState.update {
                    it.copy(
                        recommended = items,
                        isLoadingRecommendations = false,
                        recommendationError = null
                    )
                }
            } else {
                val message = result.exceptionOrNull()?.message ?: "推荐岗位加载失败"
                _uiState.update {
                    it.copy(
                        isLoadingRecommendations = false,
                        recommendationError = message
                    )
                }
            }
        }
    }

    fun onApplyClicked(message: String? = null) {
        val current = _uiState.value
        if (current.isApplying || current.isCheckingResume || current.applySuccess) {
            return
        }
        if (current.hasAiResumeReport == true) {
            viewModelScope.launch { submitApplication(message) }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(isCheckingResume = true, applyError = null)
            }
            val resumeResult = aiInterviewRepository.hasCompletedResumeReport()
            resumeResult.onSuccess { hasResume ->
                if (hasResume) {
                    _uiState.update {
                        it.copy(hasAiResumeReport = true)
                    }
                    submitApplication(message)
                } else {
                    _uiState.update {
                        it.copy(
                            isCheckingResume = false,
                            hasAiResumeReport = false
                        )
                    }
                    val job = _uiState.value.job
                    _events.emit(
                        JobDetailEvent.RequireInterview(
                            position = job?.title ?: "",
                            category = job?.category ?: "",
                            jobId = job?.id
                        )
                    )
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        isCheckingResume = false,
                        applyError = throwable.message ?: "检查 AI 简历失败"
                    )
                }
            }
        }
    }

    private suspend fun submitApplication(message: String? = null) {
        _uiState.update {
            it.copy(
                isCheckingResume = false,
                isApplying = true,
                applyError = null
            )
        }

        val result = repository.applyForJob(jobId, message)
        if (result.isSuccess) {
            _uiState.update {
                it.copy(
                    isApplying = false,
                    applySuccess = true,
                    applyError = null,
                    hasAiResumeReport = true
                )
            }
        } else {
            val messageText = result.exceptionOrNull()?.message ?: "提交岗位申请失败"
            if (messageText.contains("已经申请")) {
                _uiState.update {
                    it.copy(
                        isApplying = false,
                        applySuccess = true,
                        applyError = null,
                        hasAiResumeReport = true
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isApplying = false,
                        applySuccess = false,
                        applyError = messageText
                    )
                }
            }
        }
    }

    sealed class JobDetailEvent {
        data class RequireInterview(val position: String, val category: String, val jobId: String?) : JobDetailEvent()
    }

    companion object {
        fun provideFactory(
            repository: JobRepository,
            aiInterviewRepository: AiInterviewRepository,
            jobId: String
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(JobDetailViewModel::class.java)) {
                        return JobDetailViewModel(repository, aiInterviewRepository, jobId) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class")
                }
            }
    }
}
