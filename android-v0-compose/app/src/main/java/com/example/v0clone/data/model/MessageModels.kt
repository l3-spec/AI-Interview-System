package com.xlwl.AiMian.data.model

/**
 * 消息中心 - 会话摘要
 */
data class MessageSummary(
    val id: String,
    val title: String,
    val summary: String?,
    val type: String,
    val status: String,
    val unreadCount: Int,
    val lastActivityAt: String,
    val lastReadAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val latestEntry: MessageEntry?
)

/**
 * 消息中心 - 消息详情
 */
data class MessageDetail(
    val id: String,
    val title: String,
    val summary: String?,
    val type: String,
    val status: String,
    val unreadCount: Int,
    val lastActivityAt: String,
    val lastReadAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val entries: List<MessageEntry>
)

/**
 * 会话内单条消息
 */
data class MessageEntry(
    val id: String,
    val senderType: String,
    val senderId: String?,
    val senderName: String?,
    val content: String,
    val metadata: Map<String, Any>?,
    val createdAt: String
)

/**
 * 创建留言
 */
data class CreateMessageRequest(
    val title: String,
    val content: String,
    val type: String? = null
)

/**
 * 回复留言
 */
data class ReplyMessageRequest(
    val content: String,
    val metadata: Map<String, Any>? = null
)

/**
 * 标记已读响应
 */
data class MessageReadResponse(
    val id: String,
    val status: String,
    val unreadCount: Int,
    val lastReadAt: String?
)
