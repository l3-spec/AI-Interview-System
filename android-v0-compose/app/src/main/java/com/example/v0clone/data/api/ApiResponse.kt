package com.xlwl.AiMian.data.api

/**
 * API 响应包装类
 */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String? = null,
    val error: String? = null
)
