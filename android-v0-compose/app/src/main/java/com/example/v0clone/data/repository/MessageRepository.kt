package com.xlwl.AiMian.data.repository

import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.api.PagedData
import com.xlwl.AiMian.data.model.CreateMessageRequest
import com.xlwl.AiMian.data.model.MessageDetail
import com.xlwl.AiMian.data.model.MessageEntry
import com.xlwl.AiMian.data.model.MessageReadResponse
import com.xlwl.AiMian.data.model.MessageSummary
import com.xlwl.AiMian.data.model.ReplyMessageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 消息中心数据仓库
 */
class MessageRepository(private val apiService: ApiService) {

    suspend fun getMessages(
        type: String? = null,
        status: String? = null,
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<MessageSummary>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMessages(page = page, pageSize = pageSize, type = type, status = status)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取消息列表失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMessageDetail(messageId: String): Result<MessageDetail> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMessageDetail(messageId)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取消息详情失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createMessage(
        title: String,
        content: String,
        type: String? = null
    ): Result<MessageDetail> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.createMessage(
                CreateMessageRequest(
                    title = title,
                    content = content,
                    type = type
                )
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "提交留言失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun replyMessage(
        messageId: String,
        content: String,
        metadata: Map<String, Any>? = null
    ): Result<MessageEntry> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.replyMessage(
                messageId,
                ReplyMessageRequest(
                    content = content,
                    metadata = metadata
                )
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "发送回复失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markMessageRead(messageId: String): Result<MessageReadResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.markMessageRead(messageId)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "标记消息失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
