package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.api.PagedData
import com.xlwl.AiMian.data.model.CompanyProfileDto
import com.xlwl.AiMian.data.model.CompanyShowcaseDto
import com.xlwl.AiMian.data.model.JobApplicationDto
import com.xlwl.AiMian.data.model.JobApplicationRequest
import com.xlwl.AiMian.data.model.JobDetailDto
import com.xlwl.AiMian.data.model.JobSectionDto
import com.xlwl.AiMian.data.model.JobSummaryDto
import kotlin.math.max
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class JobRepository(private val apiService: ApiService) {

    /**
     * 获取公开岗位列表
     */
    suspend fun getJobs(
        page: Int,
        pageSize: Int,
        params: JobQueryParams
    ): Result<PagedData<JobSummaryDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getPublicJobs(
                page = page,
                pageSize = pageSize,
                keyword = params.keyword,
                location = params.location,
                type = params.type,
                level = params.level,
                category = params.category,
                remoteOnly = params.remoteOnly.takeIf { it },
                sort = params.sort,
                experience = params.experience,
                education = params.education,
                dictionaryPositionIds = params.dictionaryPositionIds
                    .takeIf { it.isNotEmpty() }
                    ?.joinToString(",")
            )
            if (response.success) {
                val listings = response.data ?: emptyList()
                val total = response.total ?: listings.size
                val currentPage = response.page ?: page
                val currentPageSize = response.pageSize ?: pageSize
                val sanitizedPage = max(currentPage, 1)
                val sanitizedSize = max(currentPageSize, 1)
                val computedHasMore = response.hasMore
                    ?: (sanitizedPage * sanitizedSize < max(total, listings.size))

                Result.success(
                    PagedData(
                        list = listings,
                        total = total,
                        page = sanitizedPage,
                        pageSize = sanitizedSize,
                        hasMore = computedHasMore
                    )
                )
            } else {
                Result.failure(Exception(response.message ?: response.error ?: "获取岗位列表失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取岗位分区列表
     */
    suspend fun getJobSections(): Result<List<JobSectionDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getJobSections()
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取岗位分区失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取精选企业展示
     */
    suspend fun getCompanyShowcases(): Result<List<CompanyShowcaseDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getCompanyShowcases()
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取企业展示失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取岗位详情
     */
    suspend fun getJobDetail(jobId: String): Result<JobDetailDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getJobDetail(jobId)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取岗位详情失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取企业详情
     */
    suspend fun getCompanyProfile(companyId: String): Result<CompanyProfileDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getCompanyProfile(companyId)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取企业详情失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 提交岗位申请
     */
    suspend fun applyForJob(jobId: String, message: String? = null): Result<JobApplicationDto> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.applyForJob(jobId, JobApplicationRequest(message))
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "提交岗位申请失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}

data class JobQueryParams(
    val keyword: String? = null,
    val location: String? = null,
    val type: String? = null,
    val level: String? = null,
    val category: String? = null,
    val remoteOnly: Boolean = false,
    val sort: String = "recommended",
    val experience: String? = null,
    val education: String? = null,
    val dictionaryPositionIds: List<String> = emptyList()
)
