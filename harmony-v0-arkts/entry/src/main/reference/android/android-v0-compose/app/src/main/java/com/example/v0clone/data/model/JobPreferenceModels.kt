package com.xlwl.AiMian.data.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class JobPreferenceDto(
    val positions: List<JobPreferencePositionDto> = emptyList()
) : Parcelable

@Parcelize
data class JobPreferencePositionDto(
    val id: String,
    val code: String,
    val name: String,
    val categoryId: String? = null,
    val categoryName: String? = null,
    val sortOrder: Int = 0
) : Parcelable

data class UpdateJobPreferencesRequest(
    val positionIds: List<String>
)
