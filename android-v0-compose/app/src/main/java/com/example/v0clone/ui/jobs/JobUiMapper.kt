package com.xlwl.AiMian.ui.jobs

import android.graphics.Color as AndroidColor
import androidx.compose.ui.graphics.Color
import com.xlwl.AiMian.data.model.CompanyProfileDto
import com.xlwl.AiMian.data.model.CompanyShowcaseDto
import com.xlwl.AiMian.data.model.CompanyStatDto
import com.xlwl.AiMian.data.model.JobDetailDto
import com.xlwl.AiMian.data.model.JobPreferenceDto
import com.xlwl.AiMian.data.model.JobSectionDto
import com.xlwl.AiMian.data.model.JobSummaryDto
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val DefaultBadgeColor = Color(0xFFFF8C42)
private val DefaultGradient = listOf(Color(0xFFFF8C42), Color(0xFFFFC180))

fun JobSummaryDto.toJobListing(now: Instant = Instant.now()): JobListing =
    JobListing(
        id = id,
        title = title,
        company = companyName,
        companyTagline = companyTagline.orEmpty(),
        companyLogo = companyLogo,
        location = location.orEmpty(),
        salary = salary.orEmpty(),
        experience = experience.orEmpty(),
        education = education.orEmpty(),
        type = type,
        level = level,
        applications = applicationCount,
        interviews = interviewCount,
        tags = tags,
        posted = formatRelativeTime(postedAt, now),
        isRemote = isRemote,
        badgeColor = parseColor(badgeColor, DefaultBadgeColor),
        dictionaryPositionName = dictionaryPositionName
    )

fun JobSectionDto.toJobSection(now: Instant = Instant.now()): JobSection =
    JobSection(
        title = title,
        subtitle = subtitle.orEmpty(),
        jobs = jobs.map { it.toJobListing(now) }
    )

fun CompanyShowcaseDto.toCompanyShowcase(): CompanyShowcase =
    CompanyShowcase(
        id = companyId,
        name = name,
        role = role,
        hiringCount = hiringCount,
        gradient = gradient
            .takeIf { it.isNotEmpty() }
            ?.map { parseColor(it, DefaultBadgeColor) }
            ?: DefaultGradient
    )

fun JobDetailDto.toJobDetail(now: Instant = Instant.now()): JobDetail =
    JobDetail(
        id = id,
        title = title,
        companyId = companyId,
        company = companyName,
        companyTagline = companyTagline.orEmpty(),
        companyLogo = companyLogo,
        category = category.orEmpty(),
        location = location.orEmpty(),
        salary = salary.orEmpty(),
        experience = experience.orEmpty(),
        education = education.orEmpty(),
        type = type,
        level = level,
        applications = applicationCount,
        interviews = interviewCount,
        tags = tags,
        posted = formatRelativeTime(postedAt, now),
        isRemote = isRemote,
        description = description,
        responsibilities = responsibilities,
        requirements = requirements,
        highlights = highlights,
        perks = perks,
        badgeColor = parseColor(badgeColor, DefaultBadgeColor)
    )

fun CompanyProfileDto.toCompanyProfile(now: Instant = Instant.now()): CompanyProfile {
    val gradientColors = gradient
        .takeIf { it.isNotEmpty() }
        ?.map { parseColor(it, DefaultBadgeColor) }
        ?: DefaultGradient

    val statsUi = stats.map(CompanyStatDto::toCompanyStat)
    val locationText = when {
        locations.isNotEmpty() -> locations.joinToString(" / ")
        !focusArea.isNullOrBlank() -> focusArea!!
        else -> ""
    }

    return CompanyProfile(
        id = id,
        name = name,
        tagline = tagline.orEmpty(),
        description = description.orEmpty(),
        gradient = gradientColors,
        stats = statsUi,
        highlights = highlights,
        culture = culture,
        openRoles = openRoles.map { it.toJobListing(now) },
        website = website.orEmpty(),
        location = locationText
    )
}

fun JobPreferenceDto.toPreferenceItems(): List<JobPreferenceItem> =
    positions
        .sortedBy { it.sortOrder }
        .map { preference ->
            JobPreferenceItem(
                id = preference.id,
                name = preference.name,
                categoryName = preference.categoryName,
                sortOrder = preference.sortOrder
            )
        }

private fun CompanyStatDto.toCompanyStat(): CompanyStat = CompanyStat(
    label = label,
    value = value,
    accent = parseColor(accent, DefaultBadgeColor)
)

private fun parseColor(hex: String?, fallback: Color): Color {
    if (hex.isNullOrBlank()) return fallback
    return try {
        Color(AndroidColor.parseColor(hex))
    } catch (error: IllegalArgumentException) {
        fallback
    }
}

private fun formatRelativeTime(timestamp: String?, now: Instant): String {
    if (timestamp.isNullOrBlank()) return "刚刚发布"
    return try {
        val instant = Instant.parse(timestamp)
        if (instant.isAfter(now)) return "刚刚发布"
        val duration = Duration.between(instant, now)
        val minutes = duration.toMinutes()
        val hours = duration.toHours()
        val days = duration.toDays()
        when {
            minutes < 1 -> "刚刚发布"
            minutes < 60 -> "发布于 ${minutes} 分钟前"
            hours < 24 -> "发布于 ${hours} 小时前"
            days < 7 -> "发布于 ${days} 天前"
            else -> {
                val date = instant.atZone(ZoneId.systemDefault()).toLocalDate()
                date.format(RelativeDateFormatter)
            }
        }
    } catch (error: Exception) {
        "刚刚发布"
    }
}

private val RelativeDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("发布于 yyyy年MM月dd日")
