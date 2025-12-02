package com.xlwl.AiMian.data.model

import com.google.gson.annotations.SerializedName

data class JobDictionaryCategory(
    val id: String,
    val code: String,
    val name: String,
    val description: String? = null,
    val sortOrder: Int = 0,
    @SerializedName("isActive")
    val isActive: Boolean = true,
    @SerializedName("positions")
    val positions: List<JobDictionaryPosition> = emptyList()
)

data class JobDictionaryPosition(
    val id: String,
    val categoryId: String,
    val code: String,
    val name: String,
    val description: String? = null,
    val sortOrder: Int = 0,
    @SerializedName("isActive")
    val isActive: Boolean = true,
    val tags: List<String> = emptyList()
)
