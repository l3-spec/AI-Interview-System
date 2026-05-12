package com.xlwl.AiMian.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.VerificationInfo
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.repository.VerificationRepository
import java.io.File
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.firstOrNull
import com.xlwl.AiMian.data.auth.AuthManager

data class VerificationUiState(
    val isLoading: Boolean = true,
    val submitting: Boolean = false,
    val status: VerificationInfo? = null,
    val realName: String = "",
    val idNumber: String = "",
    val phoneNumber: String = "",
    val verificationCode: String = "",
    val isSendingCode: Boolean = false,
    val countdown: Int = 0,
    val businessLicenseUrl: String? = null,
    val error: String? = null,
    val message: String? = null,
    val isAgreed: Boolean = false,
    val isSuccess: Boolean = false
)

class VerificationViewModel(
    private val repository: VerificationRepository,
    private val authManager: AuthManager
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
                        phoneNumber = info?.registrationNumber.orEmpty(), // Reuse field for phone
                        businessLicenseUrl = info?.businessLicense
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

    fun updateRealName(value: String) {
        _uiState.update { it.copy(realName = value) }
    }

    fun updateIdNumber(value: String) {
        // Basic filtering for digits and 'X' for ID number
        val filtered = value.uppercase().filter { it.isDigit() || it == 'X' }.take(18)
        _uiState.update { it.copy(idNumber = filtered) }
    }

    fun updatePhoneNumber(value: String) {
        // Only allow digits and limit to 11 characters
        val filtered = value.filter { it.isDigit() }.take(11)
        _uiState.update { it.copy(phoneNumber = filtered) }
    }

    fun updateVerificationCode(value: String) {
        // Only allow digits and limit to 6 characters
        val filtered = value.filter { it.isDigit() }.take(6)
        _uiState.update { it.copy(verificationCode = filtered) }
    }

    fun toggleAgreement(value: Boolean) {
        _uiState.update { it.copy(isAgreed = value) }
    }

    fun sendVerificationCode() {
        val current = _uiState.value
        if (current.isSendingCode || current.phoneNumber.length != 11) return
        
        viewModelScope.launch {
            _uiState.update { it.copy(isSendingCode = true, error = null) }
            
            val result = repository.requestVerificationCode(current.phoneNumber)
            
            result.onSuccess {
                _uiState.update { it.copy(isSendingCode = false, countdown = 60) }
                
                // Start countdown
                launch {
                    for (i in 59 downTo 0) {
                        _uiState.update { it.copy(countdown = i) }
                        kotlinx.coroutines.delay(1000)
                    }
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        isSendingCode = false,
                        error = throwable.message ?: "发送验证码失败"
                    )
                }
            }
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
        
        val realName = current.realName.trim()
        val idNumber = current.idNumber.trim()
        val phoneNumber = current.phoneNumber.trim()
        val verificationCode = current.verificationCode.trim()
        
        if (realName.isEmpty()) {
            _uiState.update { it.copy(error = "请输入您的真实姓名") }
            return
        }
        if (idNumber.length != 18) {
            _uiState.update { it.copy(error = "请输入正确的18位身份证号码") }
            return
        }
        if (phoneNumber.length != 11) {
            _uiState.update { it.copy(error = "请输入正确的11位手机号码") }
            return
        }
        if (verificationCode.length < 4) {
            _uiState.update { it.copy(error = "请输入正确的验证码") }
            return
        }
        if (!current.isAgreed) {
            _uiState.update { it.copy(error = "请先阅读并同意用户协议和隐私政策") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, error = null) }
            
            val result = repository.submitPersonalVerification(
                current.realName,
                current.idNumber,
                current.phoneNumber,
                current.verificationCode
            )
            
            result.onSuccess {
                _uiState.update { 
                    it.copy(
                        submitting = false,
                        message = "实名认证成功",
                        isSuccess = true
                    )
                }
                // 更新本地用户认证状态
                viewModelScope.launch {
                    authManager.userFlow.firstOrNull()?.let { user ->
                        authManager.updateUser(user.copy(isVerified = true))
                    }
                }
                // Refresh status to show approved view
                loadStatus()
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        submitting = false,
                        error = throwable.message ?: "提交失败"
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
        super.onCleared()
    }

    companion object {
        fun provideFactory(
            repository: VerificationRepository,
            authManager: AuthManager
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(VerificationViewModel::class.java)) {
                        return VerificationViewModel(repository, authManager) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class: $modelClass")
                }
            }
    }
}
