package com.xlwl.AiMian.ui.jobs

import androidx.compose.ui.graphics.Color

data class JobListing(
    val id: String,
    val title: String,
    val company: String,
    val companyTagline: String,
    val companyLogo: String?,
    val location: String,
    val salary: String,
    val experience: String,
    val education: String,
    val type: String?,
    val level: String?,
    val applications: Int,
    val interviews: Int,
    val tags: List<String>,
    val posted: String,
    val isRemote: Boolean,
    val badgeColor: Color,
    val dictionaryPositionName: String?
)

data class JobSection(
    val title: String,
    val subtitle: String,
    val jobs: List<JobListing>
)

data class CompanyShowcase(
    val id: String,
    val name: String,
    val role: String,
    val hiringCount: Int,
    val gradient: List<Color>
)

data class JobDetail(
    val id: String,
    val title: String,
    val companyId: String,
    val company: String,
    val companyTagline: String,
    val companyLogo: String?,
    val category: String,
    val location: String,
    val salary: String,
    val experience: String,
    val education: String,
    val type: String?,
    val level: String?,
    val applications: Int,
    val interviews: Int,
    val tags: List<String>,
    val posted: String,
    val isRemote: Boolean,
    val description: String,
    val responsibilities: List<String>,
    val requirements: List<String>,
    val highlights: List<String>,
    val perks: List<String>,
    val badgeColor: Color
)

data class CompanyProfile(
    val id: String,
    val name: String,
    val tagline: String,
    val description: String,
    val gradient: List<Color>,
    val stats: List<CompanyStat>,
    val highlights: List<String>,
    val culture: List<String>,
    val openRoles: List<JobListing>,
    val website: String,
    val location: String
)

data class CompanyStat(
    val label: String,
    val value: String,
    val accent: Color
)

data class JobPreferenceItem(
    val id: String,
    val name: String,
    val categoryName: String? = null,
    val sortOrder: Int = 0
)
