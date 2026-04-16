package com.xlwl.AiMian.digitalhuman

import androidx.compose.ui.graphics.Color

// 面试对话消息类型
enum class ConversationRole { USER, AI }

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val role: ConversationRole,
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

// UI 颜色主题
object AliyunAvatarTheme {
    val bgColor = Color(0xFF0C1220)
    val accentColor = Color(0xFF4A9EFF)
    val userBubbleColor = Color(0xFF4A9EFF)
    val aiBubbleColor = Color(0xFF1E2A3A)
}
