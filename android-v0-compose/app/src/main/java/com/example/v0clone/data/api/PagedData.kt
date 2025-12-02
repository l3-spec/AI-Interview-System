package com.xlwl.AiMian.data.api

/**
 * 分页数据
 */
data class PagedData<T>(
    val list: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val hasMore: Boolean
)
