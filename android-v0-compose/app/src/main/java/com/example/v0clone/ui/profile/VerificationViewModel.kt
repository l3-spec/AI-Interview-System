package com.xlwl.AiMian.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.VerificationInfo
import com.xlwl.AiMian.data.repository.VerificationRepository
import java.io.File
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class VerificationUiState(
    val isLoading: Boolean = true,
    val submitting: Boolean = false,
    val status: VerificationInfo? = null,
    val legalPerson: String = "",
    val registrationNumber: String = "",
    val businessLicenseUrl: String? = null,
    val localLicensePath: String? = null,
    val localLicenseFile: File? = null,
    val error: String? = null,
    val message: String? = null
)

class VerificationViewModel(
    private val repository: VerificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VerificationUiState())
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()

    init {
        loadStatus()
    }

    fun loadStatus() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, message = null) }
            val result = repository.getStatus()
            result.onSuccess { info ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        status = info,
                        legalPerson = info?.legalPerson.orEmpty(),
                        registrationNumber = info?.registrationNumber.orEmpty(),
                        businessLicenseUrl = info?.businessLicense,
                        localLicenseFile = null,
                        localLicensePath = null
                    )
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = throwable.message ?: "获取认证状态失败"
                    )
                }
            }
        }
    }

    fun updateLegalPerson(value: String) {
        _uiState.update { it.copy(legalPerson = value) }
    }

    fun updateRegistrationNumber(value: String) {
        _uiState.update { it.copy(registrationNumber = value) }
    }

    fun selectLicense(file: File, previewPath: String) {
        _uiState.value.localLicenseFile?.takeIf { it != file }?.delete()
        _uiState.update {
            it.copy(
                localLicenseFile = file,
                localLicensePath = previewPath
            )
        }
    }

    fun clearLocalLicense() {
        _uiState.value.localLicenseFile?.delete()
        _uiState.update {
            it.copy(
                localLicenseFile = null,
                localLicensePath = null
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearMessage() {
        _uiState.update { it.copy(message = null) }
    }

    fun submit() {
        val current = _uiState.value
        if (current.submitting) return
        val legalPerson = current.legalPerson.trim()
        val registrationNumber = current.registrationNumber.trim()
        if (legalPerson.isEmpty()) {
            _uiState.update { it.copy(error = "请输入法人姓名") }
            return
        }
        if (registrationNumber.isEmpty()) {
            _uiState.update { it.copy(error = "请输入统一社会信用代码") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, error = null, message = null) }
            val result = repository.submitVerification(
                legalPerson = legalPerson,
                registrationNumber = registrationNumber,
                businessLicenseFile = current.localLicenseFile,
                existingLicenseUrl = current.businessLicenseUrl
            )
            result.onSuccess { info ->
                _uiState.update {
                    it.copy(
                        submitting = false,
                        status = info,
                        legalPerson = info.legalPerson.orEmpty(),
                        registrationNumber = info.registrationNumber.orEmpty(),
                        businessLicenseUrl = info.businessLicense,
                        localLicenseFile = null,
                        localLicensePath = null,
                        message = info.messageOrDefault()
                    )
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        submitting = false,
                        error = throwable.message ?: "提交认证失败，请稍后重试"
                    )
                }
            }
        }
    }

    private fun VerificationInfo?.messageOrDefault(): String =
        this?.let {
            when (it.status?.uppercase()) {
                "APPROVED" -> "认证已通过"
                "PENDING" -> "认证申请已提交，请等待审核"
                "REJECTED" -> "认证申请已更新，请查看反馈"
                else -> "认证申请已提交，请等待审核"
            }
        } ?: "认证申请已提交，请等待审核"

    override fun onCleared() {
        _uiState.value.localLicenseFile?.delete()
        super.onCleared()
    }

    companion object {
        fun provideFactory(repository: VerificationRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(VerificationViewModel::class.java)) {
                        return VerificationViewModel(repository) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class: $modelClass")
                }
            }
    }
}
