package com.xlwl.AiMian.ui.circle

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.ui.home.ContentCard
import com.xlwl.AiMian.data.model.ExpertPost
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
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
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState())

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Outlined.BookmarkBorder, contentDescription = "收藏")
                    }
                    IconButton(onClick = { }) {
                        Icon(Icons.Outlined.MoreHoriz, contentDescription = "更多")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    navigationIconContentColor = Color(0xFF111827),
                    actionIconContentColor = Color(0xFF111827)
                ),
                scrollBehavior = scrollBehavior
            )
        },
        bottomBar = {
            detail?.let {
                PostDetailBottomBar(
                    likeCount = it.likeCount,
                    commentCount = it.commentCount,
                    shareCount = it.shareCount
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
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFFF5F6FA))
                        .padding(innerPadding),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 120.dp)
                ) {
                    item { PostHeader(detail) }
                    item { PostAuthor(detail.author) }
                    items(detail.sections, key = { it.id }) { section ->
                        PostSection(section)
                    }
                    item {
                        PostCommentsHeader(count = detail.commentCount)
                    }
                    items(detail.comments, key = { it.id }) { comment ->
                        PostCommentItem(comment)
                    }
                    item { Spacer(modifier = Modifier.height(32.dp)) }
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
        CircularProgressIndicator(color = Color(0xFFFF8C42))
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
                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280)),
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF8C42)),
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
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
        Text(
            text = detail.title,
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF111827)
            )
        )

        Spacer(Modifier.height(12.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = detail.publishDate,
                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280))
            )
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .height(12.dp)
                    .width(1.dp)
                    .background(Color(0xFFE5E7EB))
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = "浏览 ${detail.viewCount}",
                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280))
            )
        }
    }
}

@Composable
private fun PostAuthor(author: PostAuthor) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(54.dp),
                    shape = CircleShape,
                    color = author.avatarColor.copy(alpha = 0.16f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = author.name.take(1),
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = author.avatarColor
                            )
                        )
                    }
                }

                Spacer(Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = author.name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF111827)
                        )
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = author.title,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280))
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = author.highlight,
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF4B5563)),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                TextButton(onClick = { }) {
                    Text("关注", color = Color(0xFF6366F1))
                }
            }

            if (author.tags.isNotEmpty()) {
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    author.tags.forEach { tag ->
                        Surface(
                            color = Color(0xFFF3F4F6),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = tag,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6366F1))
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PostSection(section: PostSection) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 20.dp, vertical = 20.dp)
    ) {
        if (!section.title.isNullOrEmpty()) {
            Text(
                text = section.title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF111827)
                )
            )
            Spacer(Modifier.height(12.dp))
        }

        section.paragraphs.forEachIndexed { index, paragraph ->
            Text(
                text = paragraph,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color(0xFF374151),
                    lineHeight = 22.sp
                )
            )
            if (index != section.paragraphs.lastIndex) {
                Spacer(Modifier.height(12.dp))
            }
        }
    }
    Spacer(Modifier.height(12.dp))
}

@Composable
private fun PostCommentsHeader(count: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 20.dp, vertical = 20.dp)
    ) {
        Text(
            text = "社区共创",
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF111827)
            )
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "$count 条高质量互动",
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
        )
    }
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun PostCommentItem(comment: PostComment) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                modifier = Modifier.size(42.dp),
                shape = CircleShape,
                color = comment.avatarColor.copy(alpha = 0.16f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = comment.author.take(1),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = comment.avatarColor
                        )
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = comment.author,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF111827)
                    )
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = comment.identity,
                    style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
                )
            }

            Text(
                text = comment.time,
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF9CA3AF))
            )
        }

        Spacer(Modifier.height(12.dp))

        Text(
            text = comment.content,
            style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF374151)),
            lineHeight = 21.sp
        )
    }
    Divider(color = Color(0xFFF3F4F6), thickness = 1.dp)
}

@Composable
private fun PostDetailBottomBar(likeCount: Int, commentCount: Int, shareCount: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(42.dp),
                shape = RoundedCornerShape(22.dp),
                color = Color(0xFFF3F4F6)
            ) {
                Box(contentAlignment = Alignment.CenterStart, modifier = Modifier.padding(horizontal = 18.dp)) {
                    Text(
                        text = "留下你对职业转型的思考...",
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF9CA3AF))
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                BottomStat(Icons.Outlined.FavoriteBorder, likeCount)
                BottomStat(Icons.Outlined.ChatBubbleOutline, commentCount)
                BottomStat(Icons.Outlined.Send, shareCount)
            }
        }
    }
}

@Composable
private fun BottomStat(icon: ImageVector, count: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(4.dp))
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
        )
    }
}

private data class PostDetail(
    val id: String,
    val title: String,
    val publishDate: String,
    val viewCount: String,
    val likeCount: Int,
    val commentCount: Int,
    val shareCount: Int,
    val author: PostAuthor,
    val sections: List<PostSection>,
    val comments: List<PostComment>
)

private data class PostAuthor(
    val name: String,
    val title: String,
    val highlight: String,
    val tags: List<String>,
    val avatarColor: Color
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
    val normalizedShare = max(1, max(shareCount, likeCount / 2))
    val authorName = author?.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 职圈"
    val authorTitle = author?.headline?.takeIf { !it.isNullOrBlank() } ?: "社区热帖"
    return PostDetail(
        id = id,
        title = title,
        publishDate = formatPublishedAt(createdAt),
        viewCount = formatViewCount(viewCount),
        likeCount = likeCount,
        commentCount = commentCount,
        shareCount = normalizedShare,
        author = PostAuthor(
            name = authorName,
            title = authorTitle,
            highlight = extractHighlight(content, tags),
            tags = tags,
            avatarColor = avatarColor
        ),
        sections = buildContentSections(content),
        comments = emptyList()
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
        commentCount = commentCount,
        shareCount = max(1, likeCount / 2),
        author = PostAuthor(
            name = expertName,
            title = authorTitle.ifBlank { "行业专家" },
            highlight = extractHighlight(content, tags),
            tags = tags,
            avatarColor = avatarColor
        ),
        sections = buildContentSections(content),
        comments = emptyList()
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
        return "发布于 最近更新"
    }
    return try {
        val instant = Instant.parse(raw)
        val zonedDateTime = instant.atZone(ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        "发布于 ${zonedDateTime.format(formatter)}"
    } catch (ex: DateTimeParseException) {
        "发布于 ${raw.take(16)}"
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
    val shareCountEstimate = max(2, viewCountNumber / 24)
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
        commentCount = commentCountEstimate,
        shareCount = shareCountEstimate,
        author = PostAuthor(
            name = author,
            title = "社区精选",
            highlight = normalizedSummary,
            tags = tags,
            avatarColor = pickAvatarColor(id)
        ),
        sections = sections,
        comments = emptyList()
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
        publishDate = "发布于 2024-10-01",
        viewCount = "729",
        likeCount = 190,
        commentCount = 120,
        shareCount = 37,
        author = PostAuthor(
            name = "亲友合伙",
            title = "STAR-LINK 职业顾问",
            highlight = "对转型者而言，问题不再是你能胜任哪些事务，而是你能提供“独特值”。我们常用从以下四个维度去盘点“职业资产”，建立认知与影响力。",
            tags = listOf("职业规划", "职场策略"),
            avatarColor = Color(0xFFFF8C42)
        ),
        sections = listOf(
            PostSection(
                id = "section_intro",
                title = "核心框架：企业在选谁",
                paragraphs = listOf(
                    "首先，企业在寻找能够解决实际问题的人，尤其针对岗位的价值回报。",
                    "1. 主动寻找 Careers Page\n招聘前几十天大厂会在企业官网集中发布岗位（校招/社招）。\n企业官网的岗位偏正式且需求明确，适合“目标明确型”候选人。",
                    "2. 灵活使用官方小程序\n建议：关注大厂企业通过微信守候的招聘官方账号（如：腾讯招聘、字节跳动、字节校招）。\n内容更丰富，通常会推送最新的岗位和面试日程，落地效率高。"
                )
            ),
            PostSection(
                id = "section_strategy",
                title = "转型关键动作",
                paragraphs = listOf(
                    "3. 投简历通过企业内推荐\n推荐人一定要是业务线或招聘负责人，最好是企业官方公众号（如腾讯招聘、阿里招聘、字节校招）。",
                    "4. 产品视角梳理作品集\n重点强调：结果导向、指标量化、业务理解。大部分企业青睐可以讲清楚“业务 + 数据 + 价值”的人才。",
                    "5. 结构化面试呈现\n结合 STAR-LINK AI 面试官模拟练习，用 STAR 法则呈现案例，准备好 2-3 个层次递进的问题。"
                )
            ),
            PostSection(
                id = "section_summary",
                title = "最后的提醒",
                paragraphs = listOf(
                    "- 做好长期主义，保持输出与反馈循环。",
                    "- 关注行业真需求，不跟风卷证书。",
                    "- 找同路人结伴，社群共学效率更高。"
                )
            )
        ),
        comments = listOf(
            PostComment(
                id = "comment_1",
                author = "亲友合伙",
                identity = "STAR-LINK 职业顾问",
                content = "高价值岗位的竞争在于：你能否在对方的业务场景中交付成果。建议从岗位 JD 提炼关键词，逐一对应到自己的经历中。",
                time = "2024-09-30 19:00",
                avatarColor = Color(0xFFFF8C42)
            ),
            PostComment(
                id = "comment_2",
                author = "亲友合伙",
                identity = "STAR-LINK 职业顾问",
                content = "如果还在学校的同学，可以参加我们校招冲刺营，从简历诊断到模拟面试一站式服务，欢迎私信了解。",
                time = "2024-09-30 19:00",
                avatarColor = Color(0xFFFF8C42)
            )
        )
    ),
    PostDetail(
        id = "post_2",
        title = "数据科学转型记：一年内的成长策略",
        publishDate = "发布于 2024-09-18",
        viewCount = "1.2k",
        likeCount = 256,
        commentCount = 89,
        shareCount = 24,
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
        )
    ),
    PostDetail(
        id = "post_3",
        title = "校招算法 Offer 复盘",
        publishDate = "发布于 2024-08-30",
        viewCount = "980",
        likeCount = 312,
        commentCount = 76,
        shareCount = 18,
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
        )
    )
)
