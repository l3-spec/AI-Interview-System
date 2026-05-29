package com.xlwl.AiMian.ui.profile

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.model.RegionDictionaryItem
import com.xlwl.AiMian.data.model.UpdateProfileRequest
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.model.Banner
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.data.repository.OssRepository
import com.xlwl.AiMian.data.repository.UserRepository
import com.xlwl.AiMian.ui.components.BannerData
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

data class ProfileUiState(
    val user: User? = null,
    val regions: List<RegionDictionaryItem> = emptyList(),
    val banners: List<BannerData> = emptyList(),
    val currentBannerIndex: Int = 0,
    val isUpdating: Boolean = false,
    val isLoading: Boolean = false,
    val isUploadingAvatar: Boolean = false,
    val error: String? = null
)

class ProfileViewModel(
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository,
    private val ossRepository: OssRepository,
    private val contentRepository: ContentRepository,
    private val authManager: AuthManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authManager.userFlow.collect { user ->
                _uiState.update { it.copy(user = user) }
            }
        }
        loadRegions()
        refreshBanners()
        startBannerAutoScroll()
    }

    private fun loadRegions() {
        viewModelScope.launch {
            userRepository.getRegionTree().onSuccess { regions ->
                _uiState.update { it.copy(regions = regions) }
            }
        }
    }

    fun refreshBanners() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            contentRepository.getProfileBanners().onSuccess { banners ->
                _uiState.update { it.copy(
                    banners = banners.map { b -> b.toBannerData() },
                    isLoading = false
                )}
            }.onFailure {
                // Banner加载失败静默处理，不阻塞页面也不弹错误提示
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    private fun startBannerAutoScroll() {
        viewModelScope.launch {
            while (true) {
                delay(5000)
                val bannerCount = _uiState.value.banners.size
                if (bannerCount > 1) {
                    _uiState.update { it.copy(
                        currentBannerIndex = (it.currentBannerIndex + 1) % (bannerCount * 100)
                    )}
                }
            }
        }
    }

    private suspend fun updateProfileInternal(request: UpdateProfileRequest): Result<User> {
        return userRepository.updateProfile(request).onSuccess { updatedUser ->
            authManager.updateUser(updatedUser)
            _uiState.update { it.copy(user = updatedUser) }
        }
    }

    fun updateProfile(
        name: String? = null,
        avatar: String? = null,
        gender: String? = null,
        region: String? = null,
        phone: String? = null,
        signature: String? = null,
        openToCompanies: Boolean? = null,
        autoPublish: Boolean? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdating = true) }
            val request = UpdateProfileRequest(
                name = name,
                avatar = avatar,
                gender = gender,
                region = region,
                phone = phone,
                signature = signature,
                openToCompanies = openToCompanies,
                autoPublish = autoPublish
            )
            updateProfileInternal(request)
            _uiState.update { it.copy(isUpdating = false) }
        }
    }

    fun uploadAvatar(context: Context, uri: Uri) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingAvatar = true, error = null) }
            val file = uriToFile(context, uri)
            if (file == null) {
                _uiState.update { it.copy(isUploadingAvatar = false, error = "图片读取失败，请重试") }
                return@launch
            }
            val userId = _uiState.value.user?.id ?: "unknown"
            ossRepository.uploadImage(file, "users/$userId/avatar_${System.currentTimeMillis()}.jpg")
                .onSuccess { result ->
                    result.url?.let { url ->
                        val request = UpdateProfileRequest(avatar = url)
                        updateProfileInternal(request)
                            .onSuccess { _uiState.update { it.copy(isUploadingAvatar = false) } }
                            .onFailure { e ->
                                _uiState.update { it.copy(isUploadingAvatar = false, error = "头像保存失败: ${e.message}") }
                            }
                    } ?: run {
                        _uiState.update { it.copy(isUploadingAvatar = false, error = "头像上传成功但未获取到地址") }
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isUploadingAvatar = false, error = "头像上传失败: ${e.message}") }
                }
        }
    }

    private fun uriToFile(context: Context, uri: Uri): File? {
        val contentResolver = context.contentResolver
        val tempFile = File(context.cacheDir, "temp_avatar_${System.currentTimeMillis()}.jpg")
        return try {
            contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            tempFile
        } catch (e: Exception) {
            null
        }
    }

    fun sendVerificationCode(phone: String) {
        viewModelScope.launch {
            authRepository.requestLoginCode(SendCodeRequest(phone))
        }
    }

    private fun Banner.toBannerData() = BannerData(
        id = id,
        imageUrl = imageUrl,
        label = subtitle,
        title = title,
        subtitle = description,
        linkType = linkType,
        linkId = linkId
    )

    companion object {
        fun provideFactory(
            userRepository: UserRepository,
            authRepository: AuthRepository,
            ossRepository: OssRepository,
            contentRepository: ContentRepository,
            authManager: AuthManager
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return ProfileViewModel(
                    userRepository,
                    authRepository,
                    ossRepository,
                    contentRepository,
                    authManager
                ) as T
            }
        }
    }
}
