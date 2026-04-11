package com.xlwl.AiMian.ui.circle

import android.app.Activity
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import com.xlwl.AiMian.data.model.ExpertPost
import com.xlwl.AiMian.data.model.PostCommentDto
import com.xlwl.AiMian.data.model.PostEngagement
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.ui.home.ContentCard
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import kotlin.math.abs
import kotlin.math.max
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// ── Figma 设计色彩规范 ──────────────────────────────────────────
private val PageBackground = Color.White
private val PrimaryText = Color(0xFF1A1A1A)      // 标题 & 正文
private val SecondaryText = Color(0xFF999999)     // 元信息、时间戳
private val AccentOrange = Color(0xFFEC7C38)      // 作者名、标签
private val DividerColor = Color(0xFFF0F0F0)      // 分割线
private val InputFieldBg = Color(0xFFF5F5F5)      // 评论输入框底色
private val InputFieldBorder = Color(0xFFE5E5E5)  // 评论输入框边框
private val CommentSheetBackground = Color(0xFF17171B)
private val CommentSheetSurface = Color(0xFF202028)
private val CommentSheetText = Color(0xFFF5F5F7)
private val CommentSheetMeta = Color(0xFF8D8D96)
private val CommentSheetDivider = Color(0xFF2A2A31)

// ═══════════════════════════════════════════════════════════════
//  入口
// ═══════════════════════════════════════════════════════════════
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailRoute(
    postId: String,
    repository: ContentRepository,
    fallbackCard: ContentCard?,
    onBack: () -> Unit
) {
    val viewModel: PostDetailViewModel = viewModel(
        factory = PostDetailViewModel.provideFactory(repository, postId, fallbackCard)
    )
    val uiState by viewModel.uiState.collectAsState()
    val detail = uiState.detail
    var showCommentsSheet by remember { mutableStateOf(false) }
    val commentsSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)

    // ── 状态栏：白底 + 深色图标 ──
    val context = LocalContext.current
    val activity = generateSequence(context) { (it as? android.content.ContextWrapper)?.baseContext }
        .filterIsInstance<Activity>()
        .firstOrNull()

    DisposableEffect(activity) {
        if (activity != null) {
            val window = activity.window
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            val originalStatusBarColor = window.statusBarColor
            val originalDarkIcons = insetsController.isAppearanceLightStatusBars

            window.statusBarColor = android.graphics.Color.WHITE
            insetsController.isAppearanceLightStatusBars = true // 深色图标

            onDispose {
                window.statusBarColor = originalStatusBarColor
                insetsController.isAppearanceLightStatusBars = originalDarkIcons
            }
        } else {
            onDispose {}
        }
    }

    LaunchedEffect(uiState.message) {
        uiState.message?.let { message ->
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            viewModel.consumeMessage()
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = PageBackground,
        contentWindowInsets = WindowInsets(0),
        topBar = {
            // ── 顶部导航栏：返回箭头 + 标题（紧贴状态栏） ──
            Surface(
                color = PageBackground,
                shadowElevation = 0.dp
            ) {
                val statusTopPadding = WindowInsets.statusBars
                    .asPaddingValues()
                    .calculateTopPadding()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = statusTopPadding)
                        .padding(horizontal = 14.dp)
                        .height(40.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .clickableWithoutRipple(onBack),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回",
                            tint = PrimaryText,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = detail?.title ?: "",
                        color = PrimaryText,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 40.dp)
                    )
                }
            }
        },
        bottomBar = {
            detail?.let {
                PostDetailBottomBar(
                    likeCount = it.likeCount,
                    collectCount = it.collectCount,
                    commentCount = it.commentCount,
                    isLiked = it.isLiked,
                    isFavorited = it.isFavorited,
                    isTogglingLike = uiState.isTogglingLike,
                    isTogglingFavorite = uiState.isTogglingFavorite,
                    onOpenComments = { showCommentsSheet = true },
                    onToggleLike = viewModel::toggleLike,
                    onToggleFavorite = viewModel::toggleFavorite
                )
            }
        }
    ) { innerPadding ->
        when {
            uiState.isLoading -> {
                PostDetailLoading(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }
            detail != null -> {
                val gallery = remember(detail) { detail.galleryImages.take(2) }
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(bottom = 20.dp)
                ) {
                    // ── 标签 ──
                    if (detail.author.tags.isNotEmpty()) {
                        item { PostTags(detail.author.tags) }
                    }

                    // ── 作者行 + 浏览量 ──
                    item {
                        PostAuthorRow(
                            author = detail.author,
                            publishDate = detail.publishDate,
                            viewCount = detail.viewCount
                        )
                    }

                    // ── 主图 ──
                    detail.heroImageUrl?.let { hero ->
                        item { PostHeroImage(hero) }
                    }

                    // ── 正文 ──
                    if (detail.sections.isNotEmpty()) {
                        item { PostBodyText(detail.sections) }
                    }

                    // ── 行内图片画廊 ──
                    if (gallery.isNotEmpty()) {
                        item { PostInlineGallery(gallery) }
                    }

                    item {
                        PostCommentsEntry(
                            count = detail.commentCount,
                            onClick = { showCommentsSheet = true }
                        )
                    }
                }
            }
            else -> {
                PostDetailErrorState(
                    message = uiState.error ?: "内容加载失败",
                    onRetry = { viewModel.reload() },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }
        }
    }

    if (showCommentsSheet && detail != null) {
        ModalBottomSheet(
            onDismissRequest = { showCommentsSheet = false },
            sheetState = commentsSheetState,
            containerColor = Color.Transparent,
            dragHandle = null
        ) {
            CommentsBottomSheetContent(
                postAuthorName = detail.author.name,
                comments = detail.comments,
                commentCount = detail.commentCount,
                commentDraft = uiState.pendingComment,
                isSubmittingComment = uiState.isSubmittingComment,
                onCommentChange = viewModel::updatePendingComment,
                onSubmitComment = viewModel::submitComment,
                onClose = { showCommentsSheet = false }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  加载 & 错误状态
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostDetailLoading(modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = AccentOrange, strokeWidth = 2.dp)
    }
}

@Composable
private fun PostDetailErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = message,
                color = SecondaryText,
                fontSize = 15.sp,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                shape = RoundedCornerShape(24.dp)
            ) {
                Text("重新加载", color = Color.White, fontWeight = FontWeight.Medium)
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  头像占位  — 图片加载失败时显示首字母
// ═══════════════════════════════════════════════════════════════
@Composable
private fun AvatarFallback(name: String, color: Color, size: Int) {
    Surface(
        modifier = Modifier.size(size.dp),
        shape = CircleShape,
        color = color.copy(alpha = 0.15f)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = name.take(1),
                color = color,
                fontSize = (size / 2).sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  标签  — Figma: 橙色 #tag
// ═══════════════════════════════════════════════════════════════
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PostTags(tags: List<String>) {
    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        tags.forEach { tag ->
            Text(
                text = "#$tag",
                color = AccentOrange,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 0.sp
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  作者行  — Figma: 头像 + 名字 · 日期 | 浏览量
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostAuthorRow(
    author: PostAuthor,
    publishDate: String,
    viewCount: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 头像
        if (!author.avatarUrl.isNullOrBlank()) {
            SubcomposeAsyncImage(
                model = author.avatarUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape),
                error = {
                    AvatarFallback(
                        name = author.name,
                        color = author.avatarColor,
                        size = 32
                    )
                }
            )
        } else {
            AvatarFallback(
                name = author.name,
                color = author.avatarColor,
                size = 32
            )
        }

        Spacer(Modifier.width(10.dp))

        // 作者名
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = author.name,
                color = PrimaryText,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = listOf(author.title, publishDate)
                    .filter { it.isNotBlank() }
                    .joinToString(" · "),
                color = SecondaryText,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // 浏览量
        Icon(
            imageVector = Icons.Outlined.Visibility,
            contentDescription = null,
            tint = SecondaryText,
            modifier = Modifier.size(15.dp)
        )
        Spacer(Modifier.width(3.dp))
        Text(
            text = viewCount,
            color = SecondaryText,
            fontSize = 12.sp,
            fontWeight = FontWeight.Normal
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  主图  — Figma: 全宽，圆角 8dp
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostHeroImage(imageUrl: String) {
    AsyncImage(
        model = imageUrl,
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(8.dp))
            .aspectRatio(16f / 9f)
    )
}

// ═══════════════════════════════════════════════════════════════
//  正文  — Figma: 15sp 正文，行高 24sp
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostBodyText(sections: List<PostSection>) {
    if (sections.isEmpty()) return
    val content = remember(sections) {
        buildString {
            sections.forEachIndexed { index, section ->
                section.title?.let {
                    append(it)
                    append("\n\n")
                }
                section.paragraphs.forEachIndexed { pIndex, paragraph ->
                    append(paragraph)
                    if (pIndex != section.paragraphs.lastIndex) append("\n\n")
                }
                if (index != sections.lastIndex) append("\n\n")
            }
        }
    }

    Text(
        text = content,
        color = PrimaryText,
        fontSize = 15.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 24.sp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
    )
}

// ═══════════════════════════════════════════════════════════════
//  行内图片画廊  — Figma: 两张并排，圆角 8dp
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostInlineGallery(imageUrls: List<String>) {
    if (imageUrls.isEmpty()) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        imageUrls.take(2).forEach { url ->
            AsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .aspectRatio(1f)
            )
        }
        if (imageUrls.size == 1) {
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  评论入口  — 紧凑摘要，点击上拉全部评论
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostCommentsEntry(
    count: Int,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp)
    ) {
        HorizontalDivider(color = DividerColor, thickness = 0.5.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickableWithoutRipple(onClick)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "全部评论 $count",
                color = PrimaryText,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = if (count > 0) "上拉查看" else "写下第一条评论",
                color = SecondaryText,
                fontSize = 12.sp
            )
        }
        HorizontalDivider(color = DividerColor, thickness = 0.5.dp)
    }
}

// ═══════════════════════════════════════════════════════════════
//  评论项  — 深色抽屉样式
// ═══════════════════════════════════════════════════════════════
@Composable
private fun SheetCommentItem(
    comment: PostComment,
    postAuthorName: String
) {
    val isAuthor = comment.author == postAuthorName
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (!comment.avatarUrl.isNullOrBlank()) {
            SubcomposeAsyncImage(
                model = comment.avatarUrl,
                contentDescription = comment.author,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape),
                error = {
                    AvatarFallback(
                        name = comment.author,
                        color = comment.avatarColor,
                        size = 42
                    )
                }
            )
        } else {
            AvatarFallback(
                name = comment.author,
                color = comment.avatarColor,
                size = 42
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = comment.author,
                    color = Color(0xFFE8E8ED),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
                if (isAuthor) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0x33EC7C38)
                    ) {
                        Text(
                            text = "作者",
                            color = AccentOrange,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            Text(
                text = comment.content,
                color = CommentSheetText,
                fontSize = 16.sp,
                lineHeight = 24.sp
            )
            Text(
                text = "${comment.time}  回复",
                color = CommentSheetMeta,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  底部操作栏  — 评论入口 + 点赞/收藏/评论
// ═══════════════════════════════════════════════════════════════
@Composable
private fun PostDetailBottomBar(
    likeCount: Int,
    collectCount: Int,
    commentCount: Int,
    isLiked: Boolean,
    isFavorited: Boolean,
    isTogglingLike: Boolean,
    isTogglingFavorite: Boolean,
    onOpenComments: () -> Unit,
    onToggleLike: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    val navPadding = WindowInsets.navigationBars.asPaddingValues()
    Surface(
        color = PageBackground,
        shadowElevation = 6.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            HorizontalDivider(color = DividerColor, thickness = 0.5.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp)
                    .padding(bottom = navPadding.calculateBottomPadding()),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp),
                    shape = RoundedCornerShape(18.dp),
                    color = InputFieldBg,
                    border = BorderStroke(0.5.dp, InputFieldBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .clickableWithoutRipple(onOpenComments)
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "添加评论",
                            color = SecondaryText,
                            fontSize = 13.sp
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BottomAction(
                        icon = if (isLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        count = likeCount,
                        tint = if (isLiked) AccentOrange else PrimaryText.copy(alpha = 0.7f),
                        enabled = !isTogglingLike,
                        onClick = onToggleLike
                    )
                    BottomAction(
                        icon = if (isFavorited) Icons.Filled.Star else Icons.Outlined.StarBorder,
                        count = collectCount,
                        tint = if (isFavorited) AccentOrange else PrimaryText.copy(alpha = 0.7f),
                        enabled = !isTogglingFavorite,
                        onClick = onToggleFavorite
                    )
                    BottomAction(
                        icon = Icons.Outlined.ChatBubbleOutline,
                        count = commentCount,
                        tint = PrimaryText.copy(alpha = 0.7f),
                        enabled = true,
                        onClick = onOpenComments
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomAction(
    icon: ImageVector,
    count: Int,
    tint: Color,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (enabled) {
                    Modifier.clickableWithoutRipple(onClick)
                } else {
                    Modifier
                }
            )
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(22.dp)
        )
        Text(
            text = count.toString(),
            color = tint,
            fontSize = 12.sp,
            fontWeight = FontWeight.Normal
        )
    }
}

private fun Modifier.clickableWithoutRipple(onClick: () -> Unit): Modifier {
    return clickable(
        interactionSource = MutableInteractionSource(),
        indication = null,
        onClick = onClick
    )
}

@Composable
private fun CommentsBottomSheetContent(
    postAuthorName: String,
    comments: List<PostComment>,
    commentCount: Int,
    commentDraft: String,
    isSubmittingComment: Boolean,
    onCommentChange: (String) -> Unit,
    onSubmitComment: () -> Unit,
    onClose: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.84f),
        color = CommentSheetBackground,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .navigationBarsPadding()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 42.dp, height = 5.dp)
                        .clip(RoundedCornerShape(100.dp))
                        .background(Color.White.copy(alpha = 0.28f))
                )
                IconButton(
                    onClick = onClose,
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .padding(end = 8.dp)
                        .size(34.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Close,
                        contentDescription = "关闭评论",
                        tint = CommentSheetMeta,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Text(
                text = "全部评论 $commentCount",
                color = CommentSheetText,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
            )

            if (comments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "还没有评论，写下第一条想法",
                        color = CommentSheetMeta,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(bottom = 8.dp)
                ) {
                    items(comments, key = { it.id }) { comment ->
                        SheetCommentItem(
                            comment = comment,
                            postAuthorName = postAuthorName
                        )
                    }
                }
            }

            HorizontalDivider(color = CommentSheetDivider, thickness = 0.5.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(22.dp),
                    color = CommentSheetSurface
                ) {
                    BasicTextField(
                        value = commentDraft,
                        onValueChange = onCommentChange,
                        singleLine = true,
                        enabled = !isSubmittingComment,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { onSubmitComment() }),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(
                            color = CommentSheetText,
                            fontSize = 15.sp
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        decorationBox = { innerTextField ->
                            if (commentDraft.isBlank()) {
                                Text(
                                    text = "留下你的想法吧",
                                    color = CommentSheetMeta,
                                    fontSize = 15.sp
                                )
                            }
                            innerTextField()
                        }
                    )
                }

                Text(
                    text = if (isSubmittingComment) "发送中" else "发布",
                    color = if (commentDraft.isBlank() || isSubmittingComment) {
                        CommentSheetMeta
                    } else {
                        AccentOrange
                    },
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = if (commentDraft.isBlank() || isSubmittingComment) {
                        Modifier
                    } else {
                        Modifier.clickableWithoutRipple(onSubmitComment)
                    }
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  数据模型
// ═══════════════════════════════════════════════════════════════
private data class PostDetail(
    val id: String,
    val source: PostSource,
    val title: String,
    val publishDate: String,
    val viewCount: String,
    val likeCount: Int,
    val collectCount: Int,
    val commentCount: Int,
    val isLiked: Boolean,
    val isFavorited: Boolean,
    val author: PostAuthor,
    val sections: List<PostSection>,
    val comments: List<PostComment>,
    val heroImageUrl: String? = null,
    val galleryImages: List<String> = emptyList()
)

private data class PostAuthor(
    val name: String,
    val title: String,
    val highlight: String,
    val tags: List<String>,
    val avatarColor: Color,
    val avatarUrl: String? = null
)

private data class PostSection(
    val id: String,
    val title: String?,
    val paragraphs: List<String>
)

private data class PostComment(
    val id: String,
    val author: String,
    val identity: String,
    val content: String,
    val time: String,
    val avatarColor: Color,
    val avatarUrl: String? = null
)

private data class PostDetailUiState(
    val isLoading: Boolean = true,
    val detail: PostDetail? = null,
    val error: String? = null,
    val message: String? = null,
    val pendingComment: String = "",
    val isSubmittingComment: Boolean = false,
    val isTogglingLike: Boolean = false,
    val isTogglingFavorite: Boolean = false
)

private enum class PostSource {
    USER,
    EXPERT
}

// ═══════════════════════════════════════════════════════════════
//  ViewModel
// ═══════════════════════════════════════════════════════════════
private class PostDetailViewModel(
    private val repository: ContentRepository,
    private val postId: String,
    private val fallbackCard: ContentCard?
) : ViewModel() {

    private val _uiState = MutableStateFlow(PostDetailUiState())
    val uiState: StateFlow<PostDetailUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun reload() {
        load()
    }

    fun updatePendingComment(value: String) {
        _uiState.value = _uiState.value.copy(
            pendingComment = value.take(500)
        )
    }

    fun consumeMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    fun submitComment() {
        val detail = _uiState.value.detail ?: return
        val content = _uiState.value.pendingComment.trim()
        if (content.isEmpty() || _uiState.value.isSubmittingComment) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingComment = true)
            val result = when (detail.source) {
                PostSource.USER -> repository.createUserPostComment(detail.id, content)
                PostSource.EXPERT -> repository.createExpertPostComment(detail.id, content)
            }

            result.onSuccess { payload ->
                val updatedDetail = applyCommentResult(
                    detail = _uiState.value.detail ?: detail,
                    comment = payload.comment,
                    engagement = payload.engagement
                )
                _uiState.value = _uiState.value.copy(
                    detail = updatedDetail,
                    pendingComment = "",
                    isSubmittingComment = false
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingComment = false,
                    message = error.message ?: "发表评论失败"
                )
            }
        }
    }

    fun toggleLike() {
        val detail = _uiState.value.detail ?: return
        if (_uiState.value.isTogglingLike) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTogglingLike = true)
            val result = when (detail.source) {
                PostSource.USER -> if (detail.isLiked) repository.unlikeUserPost(detail.id) else repository.likeUserPost(detail.id)
                PostSource.EXPERT -> if (detail.isLiked) repository.unlikeExpertPost(detail.id) else repository.likeExpertPost(detail.id)
            }

            result.onSuccess { engagement ->
                val current = _uiState.value.detail ?: detail
                _uiState.value = _uiState.value.copy(
                    detail = current.applyEngagement(engagement),
                    isTogglingLike = false
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    isTogglingLike = false,
                    message = error.message ?: "点赞失败"
                )
            }
        }
    }

    fun toggleFavorite() {
        val detail = _uiState.value.detail ?: return
        if (_uiState.value.isTogglingFavorite) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTogglingFavorite = true)
            val result = when (detail.source) {
                PostSource.USER -> if (detail.isFavorited) repository.unfavoriteUserPost(detail.id) else repository.favoriteUserPost(detail.id)
                PostSource.EXPERT -> if (detail.isFavorited) repository.unfavoriteExpertPost(detail.id) else repository.favoriteExpertPost(detail.id)
            }

            result.onSuccess { engagement ->
                val current = _uiState.value.detail ?: detail
                _uiState.value = _uiState.value.copy(
                    detail = current.applyEngagement(engagement),
                    isTogglingFavorite = false
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    isTogglingFavorite = false,
                    message = error.message ?: "收藏失败"
                )
            }
        }
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                message = null
            )
            val result = fetchPostDetail()
            result.onSuccess { detail ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    detail = detail,
                    error = null
                )
            }.onFailure { error ->
                val fallback = samplePostDetails().firstOrNull { it.id == postId }
                    ?: fallbackCard?.toFallbackDetail()
                if (fallback != null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        detail = fallback,
                        error = error.message
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        detail = null,
                        error = error.message ?: "内容加载失败"
                    )
                }
            }
        }
    }

    private suspend fun fetchPostDetail(): Result<PostDetail> {
        val userResult = repository.getUserPostDetail(postId).map { it.toPostDetail() }
        if (userResult.isSuccess) {
            return userResult.mapCatching { hydrateInteractions(it) }
        }
        val expertResult = repository.getExpertPostDetail(postId).map { it.toPostDetail() }
        return expertResult.mapCatching { hydrateInteractions(it) }
    }

    private suspend fun hydrateInteractions(detail: PostDetail): PostDetail {
        val engagementResult = when (detail.source) {
            PostSource.USER -> repository.getUserPostEngagement(detail.id)
            PostSource.EXPERT -> repository.getExpertPostEngagement(detail.id)
        }
        val commentsResult = when (detail.source) {
            PostSource.USER -> repository.getUserPostComments(detail.id)
            PostSource.EXPERT -> repository.getExpertPostComments(detail.id)
        }

        val withEngagement = engagementResult.getOrNull()?.let { detail.applyEngagement(it) } ?: detail
        val comments = commentsResult.getOrNull()?.map { it.toUiComment() } ?: withEngagement.comments
        return withEngagement.copy(comments = comments)
    }

    private fun applyCommentResult(
        detail: PostDetail,
        comment: PostCommentDto?,
        engagement: PostEngagement?
    ): PostDetail {
        val withEngagement = engagement?.let { detail.applyEngagement(it) } ?: detail
        return if (comment != null) {
            withEngagement.copy(comments = withEngagement.comments + comment.toUiComment())
        } else {
            withEngagement
        }
    }

    companion object {
        fun provideFactory(
            repository: ContentRepository,
            postId: String,
            fallbackCard: ContentCard?
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(PostDetailViewModel::class.java)) {
                        return PostDetailViewModel(repository, postId, fallbackCard) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class")
                }
            }
    }
}

// ═══════════════════════════════════════════════════════════════
//  数据转换
// ═══════════════════════════════════════════════════════════════
private fun UserPost.toPostDetail(): PostDetail {
    val avatarColor = pickAvatarColor(id)
    val authorName = author?.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 职圈"
    val authorTitle = author?.headline?.takeIf { !it.isNullOrBlank() } ?: "社区热帖"
    return PostDetail(
        id = id,
        source = PostSource.USER,
        title = title,
        publishDate = formatPublishedAt(createdAt),
        viewCount = formatViewCount(viewCount),
        likeCount = likeCount,
        collectCount = max(0, shareCount),
        commentCount = commentCount,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = authorName,
            title = authorTitle,
            highlight = extractHighlight(content, tags),
            tags = tags,
            avatarColor = avatarColor,
            avatarUrl = author?.avatar
        ),
        sections = buildContentSections(content),
        comments = emptyList(),
        heroImageUrl = coverImage,
        galleryImages = images
    )
}

private fun ExpertPost.toPostDetail(): PostDetail {
    val avatarColor = pickAvatarColor(id)
    val authorTitle = listOf(expertCompany, expertTitle)
        .filter { it.isNotBlank() }
        .joinToString(" · ")
    return PostDetail(
        id = id,
        source = PostSource.EXPERT,
        title = title,
        publishDate = formatPublishedAt(publishedAt),
        viewCount = formatViewCount(viewCount),
        likeCount = likeCount,
        collectCount = 0,
        commentCount = commentCount,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = expertName,
            title = authorTitle.ifBlank { "行业专家" },
            highlight = extractHighlight(content, tags),
            tags = tags,
            avatarColor = avatarColor,
            avatarUrl = expertAvatar
        ),
        sections = buildContentSections(content),
        comments = emptyList(),
        heroImageUrl = coverImage
    )
}

private fun PostDetail.applyEngagement(engagement: PostEngagement): PostDetail {
    return copy(
        likeCount = engagement.likeCount,
        collectCount = engagement.favoriteCount,
        commentCount = engagement.commentCount,
        isLiked = engagement.isLiked,
        isFavorited = engagement.isFavorited
    )
}

private fun PostCommentDto.toUiComment(): PostComment {
    val authorName = author.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 用户"
    return PostComment(
        id = id,
        author = authorName,
        identity = "用户评论",
        content = content,
        time = formatPublishedAt(createdAt),
        avatarColor = pickAvatarColor(author.id ?: authorName),
        avatarUrl = author.avatar
    )
}

private fun buildContentSections(content: String): List<PostSection> {
    val blocks = content.split("\n\n")
        .map { block ->
            block.split("\n")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        }
        .filter { it.isNotEmpty() }

    if (blocks.isEmpty()) {
        return emptyList()
    }

    return blocks.mapIndexed { index, paragraphs ->
        val first = paragraphs.first()
        val isHeading = isHeadingLine(first)
        val title = if (isHeading) first else null
        val body = if (isHeading) paragraphs.drop(1) else paragraphs
        PostSection(
            id = "section_$index",
            title = title,
            paragraphs = if (body.isNotEmpty()) body else listOf(first)
        )
    }
}

private fun isHeadingLine(line: String): Boolean {
    val trimmed = line.trim()
    if (trimmed.length !in 2..24) return false
    return trimmed.contains(":") || trimmed.contains("：")
}

private fun extractHighlight(content: String, tags: List<String>): String {
    val normalized = content.replace("\n", " ")
        .replace(Regex("""\s+"""), " ")
        .trim()
    if (normalized.isNotEmpty()) {
        val preview = normalized.take(120)
        return if (normalized.length > 120) "$preview..." else preview
    }
    return if (tags.isNotEmpty()) "话题：${tags.joinToString(" · ")}" else "来自 STAR-LINK 社区的精选分享"
}

private fun pickAvatarColor(key: String): Color {
    val palette = listOf(
        Color(0xFFFF8C42),
        Color(0xFF6366F1),
        Color(0xFF0EA5E9),
        Color(0xFF34D399),
        Color(0xFFF97316),
        Color(0xFFEC4899)
    )
    return palette[abs(key.hashCode()) % palette.size]
}

private fun formatPublishedAt(raw: String?): String {
    if (raw.isNullOrBlank()) {
        return "最近更新"
    }
    return try {
        val instant = Instant.parse(raw)
        val zonedDateTime = instant.atZone(ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")
        zonedDateTime.format(formatter)
    } catch (ex: DateTimeParseException) {
        raw.take(16)
    }
}

private fun formatViewCount(count: Int): String = when {
    count >= 1_000_000 -> String.format("%.1fM", count / 1_000_000f)
    count >= 1_000 -> String.format("%.1fk", count / 1_000f)
    else -> count.toString()
}

private fun ContentCard.toFallbackDetail(): PostDetail {
    val viewCountNumber = parseViewCount(views)
    val likeCountEstimate = max(12, viewCountNumber / 12)
    val commentCountEstimate = max(4, viewCountNumber / 20)
    val collectCountEstimate = max(2, viewCountNumber / 24)
    val normalizedSummary = summary?.takeIf { it.isNotBlank() } ?: title
    val paragraphs = normalizedSummary
                .split(Regex("""[。！？!?]\s*"""))
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .takeIf { it.isNotEmpty() }
        ?: listOf("敬请期待完整内容，以下为该主题的关键要点：")

    val sections = listOf(
        PostSection(
            id = "section_preview",
            title = "内容速览",
            paragraphs = paragraphs
        ),
        PostSection(
            id = "section_tags",
            title = "相关话题",
            paragraphs = if (tags.isNotEmpty()) tags.map { "# $it" } else listOf("欢迎关注 STAR-LINK 职圈获取更多原创内容。")
        )
    )

    return PostDetail(
        id = id,
        source = PostSource.USER,
        title = title,
        publishDate = "今日更新",
        viewCount = views,
        likeCount = likeCountEstimate,
        collectCount = collectCountEstimate,
        commentCount = commentCountEstimate,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = author,
            title = "社区精选",
            highlight = normalizedSummary,
            tags = tags,
            avatarColor = pickAvatarColor(id),
            avatarUrl = avatarUrl
        ),
        sections = sections,
        comments = emptyList(),
        heroImageUrl = imageUrl
    )
}

private fun parseViewCount(value: String): Int {
    val trimmed = value.trim()
    if (trimmed.isEmpty()) return 48
    return when {
        trimmed.endsWith("M", true) -> (trimmed.dropLast(1).toFloatOrNull()?.times(1_000_000))?.toInt() ?: 240
        trimmed.endsWith("K", true) -> (trimmed.dropLast(1).toFloatOrNull()?.times(1_000))?.toInt() ?: 180
        else -> trimmed.filter { it.isDigit() }.takeIf { it.isNotEmpty() }?.toIntOrNull() ?: 120
    }
}

// ═══════════════════════════════════════════════════════════════
//  示例数据
// ═══════════════════════════════════════════════════════════════
private fun samplePostDetails(): List<PostDetail> = listOf(
    PostDetail(
        id = "post_1",
        source = PostSource.USER,
        title = "AI时代下的职业转型指南",
        publishDate = "2025/11/07 07:44",
        viewCount = "729",
        likeCount = 190,
        collectCount = 190,
        commentCount = 7,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = "产品老司机",
            title = "简单介绍",
            highlight = "",
            tags = listOf("AI", "职业转型"),
            avatarColor = Color(0xFFFF8C42),
            avatarUrl = "https://www.figma.com/api/mcp/asset/f0140fe2-8b3a-4dba-bbb2-3adf14adc103"
        ),
        sections = listOf(
            PostSection(
                id = "section_figma_copy",
                title = null,
                paragraphs = listOf(
                    "对留学生而言，回国求职最大的挑战并非能力，而是「信息差」和「时间差」。熟悉并高效利用以下招聘渠道，是成功上岸的第一步。",
                    "第一类：企业官方渠道（最权威，最核心）",
                    "这是所有求职渠道中优先级最高的方式，尤其针对你的目标公司。",
                    "1. 公司官网 Careers Page",
                    "是什么： 几乎所有大中型企业都会在自己的官方网站上设立「人才招聘」或「校园招聘」板块。",
                    "优点：",
                    "信息最准确权威，职位描述（JD）最详细。",
                    "投递流程最正式，直接进入企业人才库（ATS）。",
                    "通常会完整展示企业文化、培养体系，帮助你深入了解公司。",
                    "使用技巧：",
                    "建立你的「目标公司清单」，定期（每周）巡查其官网的招聘动态。",
                    "很多公司的内推码也需要在官网投递时填写。",
                    "注意申请截止日期。",
                    "留学生注意： 务必仔细阅读毕业时间要求。大部分企业对海外院校毕业生的毕业时间要求比较宽松（如2023年9月 - 2024年8月），并在官网有明确说明。",
                    "2. 官方招聘公众号",
                    "是什么： 绝大多数企业都会运营专门的招聘微信公众号（如：腾讯招聘、阿里招聘、字节跳动招聘）。",
                    "优点：",
                    "信息推送及时，通常会比官网更早释放招聘开启信号。",
                    "内容形式更活泼，会有招聘直播、员工分享、攻略干货等。",
                    "可以一键投递，非常方便。",
                    "使用技巧：",
                    "为你心仪的公司公众号星标，避免错过推送。",
                    "积极参与公众号的互动活动（如直播提问），有可能增加你的曝光度。"
                )
            )
        ),
        comments = listOf(
            PostComment(
                id = "comment_1",
                author = "产品老司机",
                identity = "",
                content = "这里展示评论的文字内容这里展示评论的文字内容这里展示评论的文字内容",
                time = "2025-05-16 13:00",
                avatarColor = Color(0xFFFF8C42)
            ),
            PostComment(
                id = "comment_2",
                author = "产品老司机",
                identity = "",
                content = "这里展示评论的文字内容这里展示评论的文字内容这里展示评论的文字内容",
                time = "2025-05-16 13:00",
                avatarColor = Color(0xFFFF8C42)
            ),
            PostComment(
                id = "comment_3",
                author = "产品老司机",
                identity = "",
                content = "这里展示评论的文字内容这里展示评论的文字内容这里展示评论的文字内容",
                time = "2025-05-16 13:00",
                avatarColor = Color(0xFFFF8C42)
            )
        ),
        heroImageUrl = "https://www.figma.com/api/mcp/asset/d07aecb5-ffe9-4b96-a74d-e8cbae1f6b4b",
        galleryImages = listOf(
            "https://www.figma.com/api/mcp/asset/350d0d2b-6d03-4267-a45b-5a54c6571b82",
            "https://www.figma.com/api/mcp/asset/a11fac0f-45d3-4107-be38-1b02342e186d"
        )
    ),
    PostDetail(
        id = "post_2",
        source = PostSource.USER,
        title = "数据科学转型记：一年内的成长策略",
        publishDate = "2024/09/18",
        viewCount = "1.2k",
        likeCount = 256,
        collectCount = 42,
        commentCount = 89,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = "Milla",
            title = "数据科学家",
            highlight = "从运营转数科一年内，我把所有学习时间拆成「基础、实践、反馈」三段，配合 STAR-LINK 的项目制练习，加速了能力迁移。",
            tags = listOf("职业转型", "数科成长"),
            avatarColor = Color(0xFF38B2AC)
        ),
        sections = listOf(
            PostSection(
                id = "section_data_intro",
                title = "路线拆解",
                paragraphs = listOf(
                    "第一阶段：数据基础。掌握 SQL、数据可视化，理解常见的统计指标。",
                    "第二阶段：模型实践。选择一到两个方向，反复练习建模 + 复盘，建议从 Kaggle 或 STAR-LINK 的实战营入手。",
                    "第三阶段：业务应用。把模型的价值用业务语言讲清楚，复盘每一次需求改进带来的指标变化。"
                )
            )
        ),
        comments = listOf(
            PostComment(
                id = "comment_milla_1",
                author = "Milla",
                identity = "数据科学家",
                content = "欢迎同学们来社群讨论学习计划，我会每周更新打卡模板。",
                time = "2024-09-20 21:00",
                avatarColor = Color(0xFF38B2AC)
            )
        ),
        heroImageUrl = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
    ),
    PostDetail(
        id = "post_3",
        source = PostSource.USER,
        title = "校招算法 Offer 复盘",
        publishDate = "2024/08/30",
        viewCount = "980",
        likeCount = 312,
        collectCount = 32,
        commentCount = 76,
        isLiked = false,
        isFavorited = false,
        author = PostAuthor(
            name = "阿星",
            title = "校招算法生",
            highlight = "整个秋招阶段我总结了 3 点：项目要有指标、表达要结构化、业务理解要扎实。",
            tags = listOf("校招攻略", "算法工程师"),
            avatarColor = Color(0xFF6366F1)
        ),
        sections = listOf(
            PostSection(
                id = "section_offer",
                title = "面试复盘",
                paragraphs = listOf(
                    "技术面：重点在算法题 + 项目深挖，建议准备好模型指标与调优思路。",
                    "主管面：更多问业务场景，需要你把算法落地价值讲明白。",
                    "HR 面：关注长期规划与团队协作，诚实表达动机。"
                )
            )
        ),
        comments = listOf(
            PostComment(
                id = "comment_axing",
                author = "阿星",
                identity = "校招算法生",
                content = "有需要简历模板的同学可以在评论区留言，我整理了通关清单。",
                time = "2024-09-02 18:30",
                avatarColor = Color(0xFF6366F1)
            )
        ),
        heroImageUrl = "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=1200&q=80"
    )
)
