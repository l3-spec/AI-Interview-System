package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.model.JobPreferenceDto
import com.xlwl.AiMian.data.model.UpdateJobPreferencesRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class JobPreferenceRepository(private val apiService: ApiService) {

    suspend fun fetchPreferences(): Result<JobPreferenceDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getJobPreferences()
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: response.error ?: "获取意向职岗失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun savePreferences(positionIds: List<String>): Result<JobPreferenceDto> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.updateJobPreferences(UpdateJobPreferencesRequest(positionIds))
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: response.error ?: "保存意向职岗失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
