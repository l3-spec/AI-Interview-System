package com.xlwl.AiMian.digitalhuman

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.tongyi.video_chat_sdk.data.response.TYAvatarInitData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AliyunAvatarUiState {
    object Idle : AliyunAvatarUiState()
    object Loading : AliyunAvatarUiState()
    data class Success(val initData: TYAvatarInitData, val sessionId: String) : AliyunAvatarUiState()
    data class Error(val message: String) : AliyunAvatarUiState()
}

/**
 * 阿里云数字人 ViewModel
 *
 * 使用 DashScopeAvatarService 直接调用 DashScope API，
 * 获取 TYAvatarInitData 用于初始化数字人 SDK。
 *
 * @param dashScopeService DashScope 直连服务
 */
class AliyunAvatarViewModel(
    private val dashScopeService: DashScopeAvatarService
) : ViewModel() {

    companion object {
        private const val TAG = "AliyunAvatarViewModel"
    }

    private val _uiState = MutableStateFlow<AliyunAvatarUiState>(AliyunAvatarUiState.Idle)
    val uiState: StateFlow<AliyunAvatarUiState> = _uiState

    /**
     * 获取数字人初始化数据
     *
     * 通过 DashScope API 创建会话，获取 RTC 参数和数字人资产信息。
     *
     * @param projectId 数字人项目 ID
     * @param instanceId 数字人服务实例 ID
     */
    fun fetchAvatarInitData(projectId: String, instanceId: String) {
        if (_uiState.value is AliyunAvatarUiState.Loading) return

        _uiState.value = AliyunAvatarUiState.Loading
        viewModelScope.launch {
            Log.d(TAG, "正在调用 DashScope CreateChatSession, projectId=$projectId, instanceId=$instanceId")
            val result = dashScopeService.createChatSession(projectId, instanceId)
            result.onSuccess { (initData, sessionId) ->
                Log.d(TAG, "✅ CreateChatSession 成功, sessionId=$sessionId")
                _uiState.value = AliyunAvatarUiState.Success(
                    initData = initData,
                    sessionId = sessionId
                )
            }.onFailure { error ->
                Log.e(TAG, "❌ CreateChatSession 失败: ${error.message}")
                _uiState.value = AliyunAvatarUiState.Error(
                    error.message ?: "获取数字人参数失败"
                )
            }
        }
    }

    class Factory(
        private val dashScopeService: DashScopeAvatarService = DashScopeAvatarService()
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(AliyunAvatarViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return AliyunAvatarViewModel(dashScopeService) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
