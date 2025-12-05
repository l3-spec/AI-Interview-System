package com.xlwl.AiMian.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.AiInterviewSessionSummary
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ResumeReportListItem(
  val sessionId: String,
  val jobTitle: String,
  val jobCategory: String?,
  val jobSubCategory: String?,
  val resumeType: String?,
  val status: String,
  val analysisStatus: String?,
  val reportUrl: String?,
  val isReady: Boolean,
  val testedAt: String?
)

data class ResumeReportUiState(
  val isLoading: Boolean = true,
  val error: String? = null,
  val reports: List<ResumeReportListItem> = emptyList(),
  val selectedReport: ResumeReportListItem? = null
)

class ResumeReportViewModel(
  private val repository: AiInterviewRepository
) : ViewModel() {

  private val _uiState = MutableStateFlow(ResumeReportUiState())
  val uiState: StateFlow<ResumeReportUiState> = _uiState.asStateFlow()

  init {
    loadReports()
  }

  fun loadReports() {
    viewModelScope.launch {
      _uiState.update { it.copy(isLoading = true, error = null) }
      val result = repository.getInterviewHistory()
      result
        .onSuccess { sessions ->
          val reports = sessions.mapNotNull { it.toReportItem() }
          val ready = reports.filter { it.isReady }
          val selected = if (ready.size == 1) ready.first() else null
          val currentSelection = _uiState.value.selectedReport
          val matchedSelection = currentSelection?.let { current ->
            reports.find { candidate -> candidate.sessionId == current.sessionId }
          }
          _uiState.update {
            it.copy(
              isLoading = false,
              error = null,
              reports = reports,
              selectedReport = selected ?: matchedSelection
            )
          }
        }
        .onFailure { throwable ->
          _uiState.update {
            it.copy(
              isLoading = false,
              error = throwable.message ?: "加载简历报告失败"
            )
          }
        }
    }
  }

  fun selectReport(report: ResumeReportListItem) {
    _uiState.update { it.copy(selectedReport = report) }
  }

  fun clearSelection() {
    _uiState.update { it.copy(selectedReport = null) }
  }

  private fun AiInterviewSessionSummary.toReportItem(): ResumeReportListItem? {
    val identifier = sessionId ?: id ?: return null
    val normalizedStatus = status.orEmpty().trim().uppercase()
    val normalizedAnalysis = analysisStatus.orEmpty().trim().uppercase()
    val readyFlags = setOf("COMPLETED", "FINISHED", "READY")
    val hasReportUrl = reportUrl?.isNotBlank() == true
    val isReady = hasReportUrl || (reportReady == true && hasReportUrl)
    val testedAt = startedAt ?: createdAt

    return ResumeReportListItem(
      sessionId = identifier,
      jobTitle = jobTarget?.takeIf { it.isNotBlank() } ?: "AI 视频简历报告",
      jobCategory = jobCategory?.takeIf { it.isNotBlank() },
      jobSubCategory = jobSubCategory?.takeIf { it.isNotBlank() },
      resumeType = resumeType?.takeIf { it.isNotBlank() },
      status = status.orEmpty(),
      analysisStatus = analysisStatus,
      reportUrl = reportUrl,
      isReady = isReady,
      testedAt = testedAt
    )
  }

  companion object {
    fun provideFactory(
      repository: AiInterviewRepository
    ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
      @Suppress("UNCHECKED_CAST")
      override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return ResumeReportViewModel(repository) as T
      }
    }
  }
}
