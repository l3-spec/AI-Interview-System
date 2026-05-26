package com.xlwl.AiMian.data.repository

import com.example.v0clone.data.api.ApiService
import com.example.v0clone.data.api.ApiResponse
import com.xlwl.AiMian.data.model.RegionDictionaryItem
import com.xlwl.AiMian.data.model.UpdateProfileRequest
import com.xlwl.AiMian.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UserRepository(private val apiService: ApiService) {

    suspend fun updateProfile(request: UpdateProfileRequest): Result<User> = withContext(Dispatchers.IO) {
        runCatching {
            val response = apiService.updateUserProfile(request)
            if (response.success && response.data != null) {
                response.data
            } else {
                throw Exception(response.message ?: "更新资料失败")
            }
        }
    }

    suspend fun getRegionTree(): Result<List<RegionDictionaryItem>> = withContext(Dispatchers.IO) {
        runCatching {
            val response = apiService.getRegionTree()
            if (response.success && response.data != null) {
                response.data
            } else {
                throw Exception(response.message ?: "获取地区列表失败")
            }
        }
    }
}
