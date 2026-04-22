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
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.data.repository.OssRepository
import com.xlwl.AiMian.data.repository.UserRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class ProfileViewModel(
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository,
    private val ossRepository: OssRepository,
    private val authManager: AuthManager
) : ViewModel() {

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user

    private val _regions = MutableStateFlow<List<RegionDictionaryItem>>(emptyList())
    val regions: StateFlow<List<RegionDictionaryItem>> = _regions

    private val _isUpdating = MutableStateFlow(false)
    val isUpdating: StateFlow<Boolean> = _isUpdating

    init {
        viewModelScope.launch {
            authManager.userFlow.collect {
                _user.value = it
            }
        }
        loadRegions()
    }

    private fun loadRegions() {
        viewModelScope.launch {
            userRepository.getRegionTree().onSuccess {
                _regions.value = it
            }
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
            _isUpdating.value = true
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
            userRepository.updateProfile(request).onSuccess { updatedUser ->
                authManager.updateUser(updatedUser)
                _user.value = updatedUser
            }
            _isUpdating.value = false
        }
    }

    fun uploadAvatar(context: Context, uri: Uri) {
        viewModelScope.launch {
            val file = uriToFile(context, uri) ?: return@launch
            val userId = _user.value?.id ?: "unknown"
            ossRepository.uploadImage(file, "users/$userId/avatar_${System.currentTimeMillis()}.jpg")
                .onSuccess { result ->
                    result.url?.let { url ->
                        updateProfile(avatar = url)
                    }
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

    companion object {
        fun provideFactory(
            userRepository: UserRepository,
            authRepository: AuthRepository,
            ossRepository: OssRepository,
            authManager: AuthManager
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return ProfileViewModel(userRepository, authRepository, ossRepository, authManager) as T
            }
        }
    }
}
