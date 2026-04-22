package com.xlwl.AiMian.data.model

import com.google.gson.annotations.SerializedName

data class RegionDictionaryItem(
    val id: String,
    val code: String?,
    val name: String,
    val level: Int,
    val parentId: String?,
    val sortOrder: Int = 0,
    @SerializedName("isActive")
    val isActive: Boolean = true,
    @SerializedName("children")
    val children: List<RegionDictionaryItem> = emptyList()
)
