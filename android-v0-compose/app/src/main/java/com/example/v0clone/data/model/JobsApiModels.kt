package com.xlwl.AiMian.data.model

data class JobSummaryDto(
    val id: String,
    val title: String,
    val companyId: String,
    val companyName: String,
    val companyLogo: String? = null,
    val companyTagline: String? = null,
    val badgeColor: String = "#FF8C42",
    val location: String? = null,
    val salary: String? = null,
    val experience: String? = null,
    val education: String? = null,
    val isRemote: Boolean = false,
    val tags: List<String> = emptyList(),
    val category: String? = null,
    val type: String? = null,
    val level: String? = null,
    val applicationCount: Int = 0,
    val interviewCount: Int = 0,
    val postedAt: String,
    val createdAt: String,
    val updatedAt: String,
    val dictionaryPositionId: String? = null,
    val dictionaryPositionCode: String? = null,
    val dictionaryPositionName: String? = null,
    val dictionaryCategoryId: String? = null,
    val dictionaryCategoryName: String? = null
)

data class JobSectionDto(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    val jobs: List<JobSummaryDto> = emptyList()
)

data class CompanyStatDto(
    val label: String,
    val value: String,
    val accent: String? = null
)

data class CompanyShowcaseDto(
    val companyId: String,
    val name: String,
    val role: String,
    val hiringCount: Int,
    val gradient: List<String> = emptyList(),
    val tagline: String? = null,
    val logo: String? = null,
    val focusArea: String? = null,
    val stats: List<CompanyStatDto> = emptyList(),
    val highlights: List<String> = emptyList(),
    val culture: List<String> = emptyList(),
    val locations: List<String> = emptyList()
)

data class JobDetailCompanyDto(
    val id: String,
    val name: String,
    val logo: String? = null,
    val tagline: String? = null,
    val themeColors: List<String> = emptyList(),
    val locations: List<String> = emptyList(),
    val website: String? = null,
    val industry: String? = null,
    val scale: String? = null
)

data class JobDetailDto(
    val id: String,
    val title: String,
    val companyId: String,
    val companyName: String,
    val companyLogo: String? = null,
    val companyTagline: String? = null,
    val badgeColor: String = "#FF8C42",
    val location: String? = null,
    val salary: String? = null,
    val experience: String? = null,
    val education: String? = null,
    val isRemote: Boolean = false,
    val tags: List<String> = emptyList(),
    val category: String? = null,
    val postedAt: String,
    val createdAt: String,
    val updatedAt: String,
    val description: String = "",
    val responsibilities: List<String> = emptyList(),
    val requirements: List<String> = emptyList(),
    val highlights: List<String> = emptyList(),
    val perks: List<String> = emptyList(),
    val type: String? = null,
    val level: String? = null,
    val applicationCount: Int = 0,
    val interviewCount: Int = 0,
    val company: JobDetailCompanyDto? = null,
    val dictionaryPositionId: String? = null,
    val dictionaryPositionCode: String? = null,
    val dictionaryPositionName: String? = null,
    val dictionaryCategoryId: String? = null,
    val dictionaryCategoryName: String? = null
)

data class CompanyShowcaseMeta(
    val role: String? = null,
    val hiringCount: Int = 0
)

data class CompanyProfileDto(
    val id: String,
    val name: String,
    val logo: String? = null,
    val tagline: String? = null,
    val description: String? = null,
    val industry: String? = null,
    val scale: String? = null,
    val focusArea: String? = null,
    val website: String? = null,
    val contact: String? = null,
    val gradient: List<String> = emptyList(),
    val stats: List<CompanyStatDto> = emptyList(),
    val highlights: List<String> = emptyList(),
    val culture: List<String> = emptyList(),
    val locations: List<String> = emptyList(),
    val isVerified: Boolean = false,
    val showcase: CompanyShowcaseMeta? = null,
    val openRoles: List<JobSummaryDto> = emptyList()
)

data class JobApplicationDto(
    val id: String,
    val status: String,
    val message: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val jobId: String,
    val userId: String
)

data class JobApplicationRequest(
    val message: String? = null
)

data class JobListResponse(
    val success: Boolean,
    val data: List<JobSummaryDto>?,
    val total: Int? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val hasMore: Boolean? = null,
    val message: String? = null,
    val error: String? = null
)
