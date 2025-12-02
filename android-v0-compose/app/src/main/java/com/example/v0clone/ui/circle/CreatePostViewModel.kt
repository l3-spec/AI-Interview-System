package com.xlwl.AiMian.ui.circle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
import java.io.File
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CreatePostUiState(
    val isPublishing: Boolean = false,
    val error: String? = null,
    val success: UserPost? = null
)

class CreatePostViewModel(private val repository: ContentRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(CreatePostUiState())
    val uiState: StateFlow<CreatePostUiState> = _uiState.asStateFlow()

    fun publish(
        title: String,
        content: String,
        tags: List<String>,
        imageFiles: List<File>
    ) {
        if (_uiState.value.isPublishing) return
        viewModelScope.launch {
            _uiState.update { it.copy(isPublishing = true, error = null, success = null) }
            val result = repository.createUserPost(title, content, tags, imageFiles)
            result.fold(
                onSuccess = { post ->
                    _uiState.value = CreatePostUiState(
                        isPublishing = false,
                        error = null,
                        success = post
                    )
                },
                onFailure = { throwable ->
                    _uiState.update {
                        it.copy(
                            isPublishing = false,
                            error = throwable.message ?: "发布失败，请稍后再试"
                        )
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun consumeSuccess() {
        _uiState.update { it.copy(success = null) }
    }

    companion object {
        fun provideFactory(repository: ContentRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(CreatePostViewModel::class.java)) {
                        return CreatePostViewModel(repository) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class: $modelClass")
                }
            }
    }
}
