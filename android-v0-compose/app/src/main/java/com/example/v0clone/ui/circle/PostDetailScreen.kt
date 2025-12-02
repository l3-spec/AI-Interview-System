package com.xlwl.AiMian.ui.circle

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.model.ExpertPost
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

private val ScreenBackground = Color.White
private val PrimaryText = Color(0xFF242525)
private val SecondaryText = Color(0xFFB5B7B8)
private val MutedText = Color(0xFF858687)
private val AccentText = Color(0xFFFF6B00) // Updated to match screenshot orange/red
private val DividerColor = Color(0xFFE5E7EB)
private val SectionBackground = Color(0xFFF8F8F8)

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

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = ScreenBackground,
        topBar = {
            Surface(color = Color.White) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(47.dp)
                        .padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回",
                            tint = PrimaryText
                        )
                    }
                }
            }
        },
        bottomBar = {
            detail?.let {
                PostDetailBottomBar(
                    likeCount = it.likeCount,
                    collectCount = it.collectCount,
                    commentCount = it.commentCount
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
                    contentPadding = PaddingValues(
                        start = 12.dp,
                        end = 12.dp,
                        top = 12.dp,
                        bottom = 120.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item { PostHeader(detail) }
                    item { PostAuthor(detail.author) }
                    detail.heroImageUrl?.let { hero ->
                        item { PostHeroImage(hero) }
                    }
                    if (detail.sections.isNotEmpty()) {
                        item { PostBodyText(detail.sections) }
                    }
                    if (gallery.isNotEmpty()) {
                        item { PostInlineGallery(gallery) }
                    }
                    item { CommentInputPlaceholder() }
                    item { PostCommentsHeader(count = detail.commentCount) }
                    items(detail.comments, key = { it.id }) { comment ->
                        PostCommentItem(comment)
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
}

@Composable
private fun PostDetailLoading(modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = AccentText)
    }
}

@Composable
private fun PostDetailErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium.copy(color = SecondaryText),
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = AccentText),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    text = "重新加载",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun PostHeader(detail: PostDetail) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = detail.title,
            color = PrimaryText,
            fontSize = 24.sp, // Larger title
            fontWeight = FontWeight.Bold, // Bolder title
            lineHeight = 32.sp
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = detail.publishDate,
                color = SecondaryText,
                fontSize = 12.sp,
                lineHeight = 18.sp
            )
            Icon(
                imageVector = Icons.Outlined.Visibility,
                contentDescription = null,
                tint = SecondaryText,
                modifier = Modifier.size(14.dp) // Slightly smaller icon
            )
            Text(
                text = detail.viewCount,
                color = SecondaryText,
                fontSize = 12.sp,
                lineHeight = 18.sp
            )
        }
    }
}


@Composable
private fun PostHeroImage(imageUrl: String) {
    AsyncImage(
        model = imageUrl,
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .aspectRatio(351f / 197f)
    )
}


@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PostAuthor(author: PostAuthor) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (author.avatarUrl != null) {
            AsyncImage(
                model = author.avatarUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(40.dp) // Larger avatar
                    .clip(CircleShape)
            )
        } else {
            Surface(
                modifier = Modifier.size(40.dp), // Larger avatar
                shape = CircleShape,
                color = author.avatarColor.copy(alpha = 0.16f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = author.name.take(1),
                        color = author.avatarColor,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = author.name,
                color = AccentText, // Orange color
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                lineHeight = 20.sp
            )
            if (author.title.isNotBlank()) {
                Text(
                    text = author.title,
                    color = SecondaryText,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }
        }
    }
}

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
        fontSize = 14.sp,
        lineHeight = 22.sp,
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun PostInlineGallery(imageUrls: List<String>) {
    if (imageUrls.isEmpty()) return
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        imageUrls.take(2).forEach { url ->
            AsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .aspectRatio(154f / 206f)
            )
        }
        if (imageUrls.size == 1) {
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun PostCommentsHeader(count: Int) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        HorizontalDivider(color = DividerColor)
        Text(
            text = "共${count}条评论",
            color = SecondaryText,
            fontSize = 12.sp,
            lineHeight = 18.sp
        )
    }
}


@Composable
private fun PostCommentItem(comment: PostComment) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            modifier = Modifier.size(32.dp), // Slightly smaller than author
            shape = CircleShape,
            color = comment.avatarColor.copy(alpha = 0.16f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = comment.author.take(1),
                    color = comment.avatarColor,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = comment.author,
                color = AccentText, // Orange color
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                lineHeight = 18.sp
            )
            Text(
                text = comment.content,
                color = PrimaryText,
                fontSize = 14.sp,
                lineHeight = 22.sp
            )
            Text(
                text = comment.time,
                color = MutedText,
                fontSize = 12.sp,
                lineHeight = 18.sp
            )
        }
    }
}


@Composable
private fun CommentInputPlaceholder() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp), // More rounded
        color = SectionBackground,
        border = BorderStroke(1.dp, Color(0xFFE5E7EB)) // Add border
    ) {
        Text(
            text = "添加评论", // Changed text
            color = SecondaryText,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
        )
    }
}


@Composable
private fun PostDetailBottomBar(likeCount: Int, collectCount: Int, commentCount: Int) {
    Surface(color = Color.White, shadowElevation = 8.dp) { // Added elevation
        Column(modifier = Modifier.fillMaxWidth()) {
            HorizontalDivider(color = DividerColor)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .padding(bottom = 20.dp), // Adjust bottom padding for safe area
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp),
                    shape = RoundedCornerShape(18.dp), // Fully rounded
                    color = Color.White,
                    border = BorderStroke(1.dp, SecondaryText)
                ) {
                    Box(
                        contentAlignment = Alignment.CenterStart,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    ) {
                        Text(
                            text = "添加评论",
                            color = SecondaryText,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(20.dp), // Increased spacing
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BottomStat(Icons.Outlined.FavoriteBorder, likeCount)
                    BottomStat(Icons.Outlined.Star, collectCount)
                    BottomStat(Icons.Outlined.ChatBubbleOutline, commentCount)
                }
            }
        }
    }
}

@Composable
private fun BottomStat(icon: ImageVector, count: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = PrimaryText, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(4.dp))
        Text(
            text = count.toString(),
            color = PrimaryText,
            fontSize = 12.sp
        )
    }
}

private data class PostDetail(
    val id: String,
    val title: String,
    val publishDate: String,
    val viewCount: String,
    val likeCount: Int,
    val collectCount: Int,
    val commentCount: Int,
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
    val avatarColor: Color
)
private data class PostDetailUiState(
    val isLoading: Boolean = true,
    val detail: PostDetail? = null,
    val error: String? = null
)

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

    private fun load() {
        viewModelScope.launch {
            _uiState.value = PostDetailUiState(isLoading = true)
            val result = fetchPostDetail()
            result.onSuccess { detail ->
                _uiState.value = PostDetailUiState(isLoading = false, detail = detail)
            }.onFailure { error ->
                val fallback = samplePostDetails().firstOrNull { it.id == postId }
                    ?: fallbackCard?.toFallbackDetail()
                if (fallback != null) {
                    _uiState.value = PostDetailUiState(
                        isLoading = false,
                        detail = fallback,
                        error = error.message
                    )
                } else {
                    _uiState.value = PostDetailUiState(
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
            return userResult
        }
        val expertResult = repository.getExpertPostDetail(postId).map { it.toPostDetail() }
        return expertResult
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

private fun UserPost.toPostDetail(): PostDetail {
    val avatarColor = pickAvatarColor(id)
    val normalizedCollect = max(1, max(shareCount, likeCount / 3))
    val authorName = author?.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 职圈"
    val authorTitle = author?.headline?.takeIf { !it.isNullOrBlank() } ?: "社区热帖"
    return PostDetail(
        id = id,
        title = title,
        publishDate = formatPublishedAt(createdAt),
        viewCount = formatViewCount(viewCount),
        likeCount = likeCount,
        collectCount = normalizedCollect,
        commentCount = commentCount,
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
        title = title,
        publishDate = formatPublishedAt(publishedAt),
        viewCount = formatViewCount(viewCount),
        likeCount = likeCount,
        collectCount = max(1, likeCount / 2),
        commentCount = commentCount,
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
        return "编辑于最近更新"
    }
    return try {
        val instant = Instant.parse(raw)
        val zonedDateTime = instant.atZone(ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        "编辑于${zonedDateTime.format(formatter)}"
    } catch (ex: DateTimeParseException) {
        "编辑于${raw.take(16)}"
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
        title = title,
        publishDate = "发布于 今日更新",
        viewCount = views,
        likeCount = likeCountEstimate,
        collectCount = collectCountEstimate,
        commentCount = commentCountEstimate,
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

private fun samplePostDetails(): List<PostDetail> = listOf(
    PostDetail(
        id = "post_1",
        title = "AI时代下的职业转型指南",
        publishDate = "编辑于2025年10月07日 北京",
        viewCount = "729",
        likeCount = 190,
        collectCount = 190,
        commentCount = 7,
        author = PostAuthor(
            name = "产品老司机",
            title = "简单介绍",
            highlight = "",
            tags = emptyList(),
            avatarColor = Color(0xFFFF8C42),
            avatarUrl = "https://www.figma.com/api/mcp/asset/f0140fe2-8b3a-4dba-bbb2-3adf14adc103"
        ),
        sections = listOf(
            PostSection(
                id = "section_figma_copy",
                title = null,
                paragraphs = listOf(
                    "对留学生而言，回国求职最大的挑战并非能力，而是 “信息差” 和 “时间差”。熟悉并高效利用以下招聘渠道，是成功上岸的第一步。",
                    "第一类：企业官方渠道（最权威，最核心）",
                    "这是所有求职渠道中优先级最高的方式，尤其针对你的目标公司。",
                    "1. 公司官网 Careers Page",
                    "是什么： 几乎所有大中型企业都会在自己的官方网站上设立“人才招聘”或“校园招聘”板块。",
                    "优点：",
                    "信息最准确权威，职位描述（JD）最详细。",
                    "投递流程最正式，直接进入企业人才库（ATS）。",
                    "通常会完整展示企业文化、培养体系，帮助你深入了解公司。",
                    "使用技巧：",
                    "建立你的 “目标公司清单”，定期（每周）巡查其官网的招聘动态。",
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
        title = "数据科学转型记：一年内的成长策略",
        publishDate = "编辑于2024-09-18",
        viewCount = "1.2k",
        likeCount = 256,
        collectCount = 42,
        commentCount = 89,
        author = PostAuthor(
            name = "Milla",
            title = "数据科学家",
            highlight = "从运营转数科一年内，我把所有学习时间拆成“基础、实践、反馈”三段，配合 STAR-LINK 的项目制练习，加速了能力迁移。",
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
        title = "校招算法 Offer 复盘",
        publishDate = "编辑于2024-08-30",
        viewCount = "980",
        likeCount = 312,
        collectCount = 32,
        commentCount = 76,
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
