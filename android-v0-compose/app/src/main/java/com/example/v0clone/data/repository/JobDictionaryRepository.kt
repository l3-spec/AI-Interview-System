package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.JobDictionaryApi
import com.xlwl.AiMian.data.model.JobDictionaryCategory
import com.xlwl.AiMian.data.model.JobDictionaryPosition

class JobDictionaryRepository(private val api: JobDictionaryApi) {

    suspend fun fetchDictionary(includeInactive: Boolean = false): List<JobDictionaryCategory> {
        val response = api.getJobDictionary()
        if (!response.success) {
            throw IllegalStateException(response.message ?: "无法获取职岗字典")
        }
        val categories = response.data.orEmpty()
        return categories
            .filter { includeInactive || it.isActive }
            .sortedBy { it.sortOrder }
            .map { category ->
                category.copy(
                    positions = category.positions
                        .filter { includeInactive || it.isActive }
                        .sortedBy(JobDictionaryPosition::sortOrder)
                )
            }
    }
}
