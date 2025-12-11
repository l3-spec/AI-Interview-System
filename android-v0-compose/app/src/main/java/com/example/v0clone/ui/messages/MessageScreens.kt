@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.messages

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AddComment
import androidx.compose.material.icons.outlined.MarkEmailUnread
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavBackStackEntry
import com.xlwl.AiMian.data.model.MessageDetail
import com.xlwl.AiMian.data.model.MessageEntry
import com.xlwl.AiMian.data.model.MessageSummary
import com.xlwl.AiMian.data.repository.MessageRepository
import com.xlwl.AiMian.ui.components.CompactTopBar
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val AccentOrange = Color(0xFFEC7C38)
private val MutedText = Color(0xFF868A93)
private val BubbleUser = Brush.verticalGradient(listOf(Color(0xFFFFA768), Color(0xFFEC7C38)))
private val BubbleSystem = Color.White
private val ChatBackground = Color(0xFFF6F7FB)

private val dateFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
private val chatDateFormatter = DateTimeFormatter.ofPattern("M月d日 HH:mm")

@Composable
fun MessageCenterRoute(
    repository: MessageRepository,
    backStackEntry: NavBackStackEntry,
    onBack: () -> Unit,
    onMessageSelected: (String) -> Unit,
    onCompose: () -> Unit
) {
    var uiState by remember { mutableStateOf(MessageCenterUiState(isLoading = true)) }
    var selectedType by rememberSaveable { mutableStateOf(MessageType.ALL) }
    val scope = rememberCoroutineScope()
    val refreshSignal by backStackEntry.savedStateHandle
        .getStateFlow("should_refresh_messages", false)
        .collectAsState()

    val loadMessages = remember(repository) {
        { refresh: Boolean ->
            scope.launch {
                uiState = uiState.copy(
                    isLoading = if (!refresh) true else uiState.isLoading,
                    isRefreshing = refresh,
                    error = null
                )
        val result = repository.getMessages(
            type = selectedType.typeKey,
            status = selectedType.statusKey,
            page = 1,
            pageSize = 20
        )
                result.onSuccess { paged ->
                    uiState = uiState.copy(
                        isLoading = false,
                        isRefreshing = false,
                        messages = paged.list,
                        error = null
                    )
                }.onFailure {
                    uiState = uiState.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = it.message ?: "消息加载失败，请稍后再试"
                    )
                }
            }
        }
    }

    LaunchedEffect(selectedType) {
        loadMessages(false)
    }

    LaunchedEffect(refreshSignal) {
        if (refreshSignal) {
            backStackEntry.savedStateHandle["should_refresh_messages"] = false
            loadMessages(true)
        }
    }

    MessageCenterScreen(
        uiState = uiState,
        selectedType = selectedType,
        onBack = onBack,
        onCompose = onCompose,
        onRetry = { loadMessages(true) },
        onTypeChange = { type ->
            selectedType = type
        },
        onMessageClick = onMessageSelected
    )
}

@Composable
private fun MessageCenterScreen(
    uiState: MessageCenterUiState,
    selectedType: MessageType,
    onBack: () -> Unit,
    onCompose: () -> Unit,
    onRetry: () -> Unit,
    onTypeChange: (MessageType) -> Unit,
    onMessageClick: (String) -> Unit
) {
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "消息",
                onBack = onBack,
                containerColor = Color.White,
                contentColor = MaterialTheme.colorScheme.onSurface,
                shadowElevation = 0.dp,
                actions = {
                    IconButton(onClick = onCompose) {
                        Icon(
                            imageVector = Icons.Outlined.AddComment,
                            contentDescription = "新建留言"
                        )
                    }
                }
            )
        },
        containerColor = Color.White
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // 搜索栏
            SearchBar(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            )
            MessageFilterBar(selectedType = selectedType, onTypeChange = onTypeChange)
            when {
                uiState.isLoading && uiState.messages.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = AccentOrange)
                    }
                }
                uiState.error != null && uiState.messages.isEmpty() -> {
                    MessageEmptyState(
                        title = "消息加载失败",
                        description = uiState.error,
                        actionLabel = "重试",
                        onAction = onRetry
                    )
                }
                uiState.messages.isEmpty() -> {
                    MessageEmptyState(
                        title = "暂无消息",
                        description = "系统的最新动态、互动提醒都会在这里出现。",
                        actionLabel = "去留言",
                        onAction = onCompose
                    )
                }
                else -> {
                    MessageList(
                        messages = uiState.messages,
                        isRefreshing = uiState.isRefreshing,
                        onMessageClick = onMessageClick
                    )
                }
            }
        }
    }
}

@Composable
private fun MessageFilterBar(
    selectedType: MessageType,
    onTypeChange: (MessageType) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MessageType.values().forEach { type ->
            FilterChip(
                selected = selectedType == type,
                onClick = { onTypeChange(type) },
                label = {
                    Text(
                        text = type.display,
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium)
                    )
                },
                leadingIcon = if (type == MessageType.UNREAD && type != selectedType) {
                    { Icon(imageVector = Icons.Outlined.MarkEmailUnread, contentDescription = null, modifier = Modifier.size(16.dp)) }
                } else null,
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AccentOrange,
                    selectedLabelColor = Color.White,
                    labelColor = MutedText,
                    iconColor = MutedText,
                    selectedLeadingIconColor = Color.White
                ),
                shape = RoundedCornerShape(20.dp)
            )
        }
    }
}

@Composable
private fun MessageList(
    messages: List<MessageSummary>,
    isRefreshing: Boolean,
    onMessageClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(0.dp), // 移除间距，使用分隔线
        contentPadding = PaddingValues(
            bottom = 16.dp
        )
    ) {
        if (isRefreshing) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = AccentOrange
                    )
                }
            }
        }
        items(messages, key = { it.id }) { message ->
            MessageItemCard(
                summary = message,
                onClick = { onMessageClick(message.id) }
            )
        }
    }
}

// 搜索栏组件
@Composable
private fun SearchBar(
    modifier: Modifier = Modifier
) {
    var searchText by rememberSaveable { mutableStateOf("") }
    
    OutlinedTextField(
        value = searchText,
        onValueChange = { searchText = it },
        placeholder = {
            Text(
                text = "搜索联系人,公司,聊天记录",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MutedText,
                    fontSize = 14.sp
                )
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = "搜索",
                tint = MutedText,
                modifier = Modifier.size(20.dp)
            )
        },
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp),
        shape = RoundedCornerShape(22.dp),
        singleLine = true,
        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = Color(0xFFE9ECF1),
            focusedBorderColor = AccentOrange
        )
    )
}

@Composable
private fun MessageItemCard(
    summary: MessageSummary,
    onClick: () -> Unit
) {
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isSystemNotification = summary.type == "SYSTEM"
    val isUnread = summary.status == "UNREAD" || summary.unreadCount > 0
    
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onClick = onClick
                ),
            color = Color.White,
            shape = RoundedCornerShape(0.dp) // 移除圆角，使用扁平设计
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
            // 左侧图标/头像
            if (isSystemNotification) {
                // 系统通知：橙色圆形图标，带白色铃铛
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(AccentOrange),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "系统通知",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            } else {
                // HR消息：圆形头像
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFFFFD54F), Color(0xFFFFB300))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    // 这里可以显示头像图片，暂时显示首字母
                    Text(
                        text = summary.title.firstOrNull()?.toString() ?: "?",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                    )
                }
            }
            
            // 中间内容区域
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // 发送者信息/标题
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isSystemNotification) {
                        Text(
                            text = summary.title,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                                color = Color.Black
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    } else {
                        // HR消息：显示发送者信息
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = summary.title, // 发送者姓名
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 16.sp,
                                    color = Color.Black
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            // 职位/公司信息（如果有）
                            summary.summary?.takeIf { it.isNotBlank() }?.let { companyInfo ->
                                Text(
                                    text = "·$companyInfo",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = MutedText,
                                        fontSize = 12.sp
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                    
                    // 时间戳或未读指示器
                    if (isUnread && summary.unreadCount == 0) {
                        // 未读指示器：橙色圆点
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(AccentOrange)
                        )
                    } else {
                        Text(
                            text = formatDate(summary.lastActivityAt),
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = MutedText,
                                fontSize = 12.sp
                            )
                        )
                    }
                }
                
                // 消息预览
                summary.latestEntry?.let { entry ->
                    Text(
                        text = entry.content,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MutedText,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                } ?: summary.summary?.let { summaryText ->
                    Text(
                        text = summaryText,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MutedText,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // 右侧未读数徽章（如果有）
            if (isUnread && summary.unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(AccentOrange)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = summary.unreadCount.toString(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    )
                }
            }
        }
        }
        // 分隔线
        Divider(
            color = Color(0xFFE9ECF1),
            thickness = 0.5.dp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
    }
}

@Composable
fun MessageDetailRoute(
    repository: MessageRepository,
    messageId: String,
    onBack: () -> Unit,
    onMessagesShouldRefresh: () -> Unit
) {
    var detail by remember { mutableStateOf<MessageDetail?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var isSending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val context = androidx.compose.ui.platform.LocalContext.current

    val loadDetail = remember(repository, messageId) {
        {
            scope.launch {
                isLoading = true
                val result = repository.getMessageDetail(messageId)
                result.onSuccess { data ->
                    detail = data
                    error = null
                    onMessagesShouldRefresh()
                    scrollToBottom(listState)
                }.onFailure {
                    error = it.message ?: "获取消息详情失败"
                }
                isLoading = false
            }
        }
    }

    LaunchedEffect(messageId) {
        loadDetail()
    }

    MessageDetailScreen(
        detail = detail,
        isLoading = isLoading,
        error = error,
        isSending = isSending,
        listState = listState,
        onBack = onBack,
        onRetry = { loadDetail() },
        onSend = { text ->
            if (text.isBlank()) return@MessageDetailScreen
            scope.launch {
                isSending = true
                val result = repository.replyMessage(messageId, text)
                result.onSuccess { entry ->
                    val current = detail
                    if (current != null) {
                        val updated = current.copy(entries = current.entries + entry)
                        detail = updated
                        onMessagesShouldRefresh()
                        scrollToBottom(listState)
                    }
                }.onFailure {
                    Toast.makeText(context, it.message ?: "发送失败，请稍后再试", Toast.LENGTH_SHORT).show()
                }
                isSending = false
            }
        }
    )
}

@Composable
private fun MessageDetailScreen(
    detail: MessageDetail?,
    isLoading: Boolean,
    error: String?,
    isSending: Boolean,
    listState: LazyListState,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onSend: (String) -> Unit
) {
    Scaffold(
        topBar = {
            // 自定义顶部栏：显示聊天对象姓名和职位
            ChatTopBar(
                name = detail?.title ?: "消息",
                subtitle = detail?.summary ?: "",
                onBack = onBack
            )
        },
        containerColor = ChatBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading && detail == null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = AccentOrange)
                    }
                }
                error != null && detail == null -> {
                    MessageEmptyState(
                        title = "加载失败",
                        description = error,
                        actionLabel = "重试",
                        onAction = onRetry
                    )
                }
                detail != null -> {
                    Box(Modifier.fillMaxSize()) {
                        ChatContent(
                            detail = detail,
                            entries = detail.entries,
                            listState = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(bottom = 96.dp)
                        )
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                        ) {
                            Divider(color = Color(0xFFE2E5EC))
                            MessageInputBar(
                                enabled = !isSending,
                                onSend = onSend,
                                isSending = isSending
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatContent(
    entries: List<MessageEntry>,
    listState: LazyListState,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        state = listState,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(entries, key = { it.id }) { entry ->
            val isUser = entry.senderType == "USER"
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
            ) {
                Column(
                    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                ) {
                    Text(
                        text = formatDate(entry.createdAt),
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MutedText,
                            fontSize = 11.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (isUser) {
                        UserBubble(entry.content)
                    } else {
                        SystemBubble(entry.content)
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageInputBar(
    enabled: Boolean,
    onSend: (String) -> Unit,
    isSending: Boolean
) {
    var input by rememberSaveable { mutableStateOf("") }
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        // 附件图标
        IconButton(
            onClick = { /* TODO: 处理附件 */ },
            enabled = enabled,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.AttachFile,
                contentDescription = "附件",
                tint = MutedText,
                modifier = Modifier.size(20.dp)
            )
        }
        
        // 图片图标
        IconButton(
            onClick = { /* TODO: 处理图片 */ },
            enabled = enabled,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.Image,
                contentDescription = "图片",
                tint = MutedText,
                modifier = Modifier.size(20.dp)
            )
        }
        
        // 输入框
        OutlinedTextField(
            value = input,
            onValueChange = { input = it },
            placeholder = { 
                Text(
                    text = "回复消息",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MutedText,
                        fontSize = 14.sp
                    )
                )
            },
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 40.dp, max = 120.dp),
            enabled = enabled,
            shape = RoundedCornerShape(20.dp),
            maxLines = 4,
            colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color(0xFFE9ECF1),
                focusedBorderColor = AccentOrange
            )
        )
        
        // 发送按钮
        IconButton(
            onClick = {
                if (input.isNotBlank() && !isSending) {
                    onSend(input.trim())
                    input = ""
                }
            },
            enabled = enabled && input.isNotBlank() && !isSending,
            modifier = Modifier.size(40.dp)
        ) {
            if (isSending) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = AccentOrange
                )
            } else {
                Icon(
                    imageVector = Icons.Outlined.Send,
                    contentDescription = "发送",
                    tint = if (input.isNotBlank()) AccentOrange else MutedText,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
fun MessageComposeRoute(
    repository: MessageRepository,
    onBack: () -> Unit,
    onMessageCreated: (MessageDetail) -> Unit
) {
    var title by rememberSaveable { mutableStateOf("") }
    var content by rememberSaveable { mutableStateOf("") }
    var selectedType by rememberSaveable { mutableStateOf(MessageComposeType.SUPPORT) }
    var isSubmitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    Scaffold(
        topBar = {
            CompactTopBar(
                title = "留言反馈",
                onBack = onBack,
                containerColor = Color.White,
                contentColor = MaterialTheme.colorScheme.onSurface,
                shadowElevation = 0.dp
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "留言主题",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
            )
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                placeholder = { Text("请简要概括您的问题或反馈") },
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Text(
                text = "留言类型",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MessageComposeType.values().forEach { type ->
                    FilterChip(
                        selected = selectedType == type,
                        onClick = { selectedType = type },
                        label = { Text(type.display) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AccentOrange,
                            selectedLabelColor = Color.White,
                            labelColor = MutedText
                        )
                    )
                }
            }
            Text(
                text = "留言内容",
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
            )
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                placeholder = { Text("描述您遇到的问题、建议或反馈，我们的团队会尽快回复您。") },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 160.dp),
                minLines = 6,
                maxLines = 10
            )
            OutlinedButton(
                onClick = {
                    if (title.isBlank() || content.isBlank()) {
                        Toast.makeText(context, "请完善留言标题和内容", Toast.LENGTH_SHORT).show()
                        return@OutlinedButton
                    }
                    scope.launch {
                        isSubmitting = true
                        val result = repository.createMessage(
                            title = title.trim(),
                            content = content.trim(),
                            type = selectedType.key
                        )
                        result.onSuccess {
                            Toast.makeText(context, "留言已提交，我们会尽快回复您", Toast.LENGTH_SHORT).show()
                            onMessageCreated(it)
                        }.onFailure {
                            Toast.makeText(context, it.message ?: "提交失败，请稍后再试", Toast.LENGTH_SHORT).show()
                        }
                        isSubmitting = false
                    }
                },
                enabled = !isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .size(18.dp)
                            .padding(end = 8.dp),
                        strokeWidth = 2.dp,
                        color = AccentOrange
                    )
                }
                Text(
                    text = if (isSubmitting) "正在提交..." else "提交留言",
                    color = AccentOrange,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
    }
}

// ==================== UI 组件与工具函数 ====================

@Composable
private fun MessageEmptyState(
    title: String,
    description: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.AddComment,
            contentDescription = null,
            tint = AccentOrange.copy(alpha = 0.4f),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium.copy(color = MutedText, lineHeight = 20.sp),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedButton(onClick = onAction, shape = RoundedCornerShape(22.dp)) {
            Text(text = actionLabel, color = AccentOrange, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun UserBubble(content: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(BubbleUser)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            text = content,
            style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
        )
    }
}

@Composable
private fun SystemBubble(content: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(BubbleSystem)
            .border(
                width = 1.dp,
                color = Color(0xFFE0E4EC),
                shape = RoundedCornerShape(18.dp)
            )
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            text = content,
            style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF20232A))
        )
    }
}

private fun formatDate(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    return runCatching {
        val instant = Instant.parse(raw)
        instant.atZone(ZoneId.systemDefault()).format(dateFormatter)
    }.getOrElse { raw.take(16) }
}

// 格式化聊天时间戳（显示"10月17日 20:24"格式）
private fun formatChatDate(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    return runCatching {
        val instant = Instant.parse(raw)
        instant.atZone(ZoneId.systemDefault()).format(chatDateFormatter)
    }.getOrElse { raw.take(16) }
}

// 判断是否应该显示时间戳（如果两条消息间隔超过5分钟，显示时间戳）
private fun shouldShowTimestamp(prevTime: String, currentTime: String): Boolean {
    return runCatching {
        val prev = Instant.parse(prevTime)
        val current = Instant.parse(currentTime)
        val diffMinutes = java.time.Duration.between(prev, current).toMinutes()
        diffMinutes >= 5
    }.getOrElse { true }
}

private suspend fun scrollToBottom(listState: LazyListState) {
    kotlinx.coroutines.delay(50)
    listState.animateScrollToItem(maxOf(listState.layoutInfo.totalItemsCount - 1, 0))
}

private data class MessageCenterUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val messages: List<MessageSummary> = emptyList(),
    val error: String? = null
)

private enum class MessageType(
    val display: String,
    val typeKey: String?,
    val statusKey: String?
) {
    ALL("全部", null, null),
    SYSTEM("系统通知", "SYSTEM", null),
    INTERACTION("互动提醒", "INTERACTION", null),
    SUPPORT("客服消息", "SUPPORT", null),
    UNREAD("未读", null, "UNREAD")
}

private enum class MessageComposeType(val display: String, val key: String) {
    SUPPORT("客服支持", "SUPPORT"),
    PRODUCT("功能建议", "INTERACTION"),
    SYSTEM("系统问题", "SYSTEM")
}
