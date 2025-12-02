package com.xlwl.AiMian.ui.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.repository.JobRepository
import java.time.Instant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CompanyDetailUiState(
    val isLoading: Boolean = true,
    val profile: CompanyProfile? = null,
    val error: String? = null
)

class CompanyDetailViewModel(
    private val repository: JobRepository,
    private val companyId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(CompanyDetailUiState())
    val uiState: StateFlow<CompanyDetailUiState> = _uiState.asStateFlow()

    init {
        loadCompany()
    }

    fun retry() {
        loadCompany()
    }

    private fun loadCompany() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = repository.getCompanyProfile(companyId)
            if (result.isSuccess) {
                val now = Instant.now()
                val profile = result.getOrNull()?.toCompanyProfile(now)
                _uiState.value = CompanyDetailUiState(
                    isLoading = false,
                    profile = profile,
                    error = null
                )
            } else {
                _uiState.value = CompanyDetailUiState(
                    isLoading = false,
                    profile = null,
                    error = result.exceptionOrNull()?.message ?: "加载企业详情失败"
                )
            }
        }
    }

    companion object {
        fun provideFactory(
            repository: JobRepository,
            companyId: String
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(CompanyDetailViewModel::class.java)) {
                        return CompanyDetailViewModel(repository, companyId) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class")
                }
            }
    }
}
