package com.xlwl.AiMian.ui.circle

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavBackStackEntry
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.repository.ContentRepository
import kotlinx.coroutines.flow.distinctUntilChanged
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.foundation.shape.CircleShape
import java.text.DecimalFormat
import androidx.compose.ui.text.TextStyle

// 根据Figma设计规范定义颜色和尺寸
private val PageBackground = Color(0xFFF4F5F6) // 与首页保持一致的柔和灰背景
private val HeroGradientStart = Color(0xFF00ACC3) // 顶部蓝色
private val HeroGradientEnd = Color(0xFFE9F7F9) // 首页同款浅蓝过渡
private val SearchPlaceholder = Color(0xFFB5B7B8) // 根据Figma设计：灰色占位 #B5B7B8
private val PrimaryText = Color(0xFF000000) // 根据Figma设计：黑色 #000000
private val AccentOrange = Color(0xFFEC7C38) // 根据Figma设计：橙色 #EC7C38
private val WhiteColor = Color(0xFFFFFFFF)
private val CardCorner = 8.dp // 根据Figma设计：卡片圆角8px
private val CircleTopBarExpandedHeight = 68.dp // 紧贴状态栏的更紧凑高度
private val CircleTopBarCollapsedHeight = 52.dp
private val CircleTopBarMaxOffset = 120.dp
private val CircleHeaderApproxHeight = CircleTopBarExpandedHeight + 16.dp // 预估高度用于占位

private val AvatarFallbackColors = listOf(
    Color(0xFFFDE68A), // Amber
    Color(0xFFBFDBFE), // Blue
    Color(0xFFC6F6D5), // Green
    Color(0xFFFED7AA), // Orange
    Color(0xFFE9D5FF), // Purple
    Color(0xFFFECACA), // Red
    Color(0xFF99F6E4)  // Teal
)

@Composable
fun CircleRoute(
    repository: ContentRepository,
    backStackEntry: NavBackStackEntry,
    onCardClick: (CircleCard) -> Unit,
    onSearchClick: () -> Unit,
    onCreatePost: () -> Unit
) {
    val viewModel: CircleViewModel = viewModel(
        factory = CircleViewModel.provideFactory(repository)
    )
    val uiState by viewModel.uiState.collectAsState()
    val refreshSignalFlow = remember(backStackEntry) {
        backStackEntry.savedStateHandle.getStateFlow("should_refresh_circle", false)
    }
    val shouldRefresh by refreshSignalFlow.collectAsState()

    LaunchedEffect(shouldRefresh) {
        if (shouldRefresh) {
            viewModel.refresh()
            backStackEntry.savedStateHandle["should_refresh_circle"] = false
        }
    }

    CircleScreen(
        uiState = uiState,
        onRetry = { viewModel.refresh() },
        onLoadMore = { viewModel.loadMore() },
        onSearchClick = onSearchClick,
        onCardClick = onCardClick,
        onCreatePost = onCreatePost
    )
}

@Composable
private fun CircleScreen(
    uiState: CircleUiState,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onSearchClick: () -> Unit,
    onCardClick: (CircleCard) -> Unit,
    onCreatePost: () -> Unit
) {
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val maxOffsetPx = with(density) { CircleTopBarMaxOffset.toPx() }
    val topBarProgress by remember {
        derivedStateOf {
            val index = listState.firstVisibleItemIndex
            val offset = listState.firstVisibleItemScrollOffset
            val rawOffset = if (index > 0) maxOffsetPx else offset.toFloat().coerceAtMost(maxOffsetPx)
            (rawOffset / maxOffsetPx).coerceIn(0f, 1f)
        }
    }
    val currentUiState by rememberUpdatedState(uiState)
    val navPadding = WindowInsets.navigationBars.asPaddingValues()

    LaunchedEffect(listState) {
        snapshotFlow {
            val layoutInfo = listState.layoutInfo
            val lastVisible = layoutInfo.visibleItemsInfo.lastOrNull()
            val total = layoutInfo.totalItemsCount
            val isAtBottom = lastVisible != null && lastVisible.index >= total - 2
            isAtBottom to listState.isScrollInProgress
        }
            .distinctUntilChanged()
            .collect { (isAtBottom, isScrolling) ->
                val state = currentUiState
                if (isAtBottom && !isScrolling && !state.isLoading && !state.isAppending && state.cards.isNotEmpty()) {
                    onLoadMore()
                }
            }
    }
    var headerHeightPx by remember { mutableStateOf(0) }
    val headerPlaceholderHeight = if (headerHeightPx > 0) {
        with(density) { headerHeightPx.toDp() }
    } else {
        CircleHeaderApproxHeight
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
    ) {
        // 使用首页同款：顶部 #00ACC3 渐变到底部浅蓝 #E9F7F9，保持连贯的上推效果
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(HeroGradientStart, HeroGradientEnd),
                        startY = 0f,
                        endY = 520f
                    )
                )
        )

        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 12.dp,
                end = 12.dp,
                bottom = navPadding.calculateBottomPadding() + 72.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item(key = "header-spacer") {
                Spacer(modifier = Modifier.height(headerPlaceholderHeight))
            }

            when {
                uiState.isLoading && uiState.cards.isEmpty() -> {
                    item {
                        CircleLoading(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp)
                        )
                    }
                }
                uiState.error != null && uiState.cards.isEmpty() -> {
                    item {
                        CircleErrorState(
                            message = uiState.error,
                            onRetry = onRetry,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp)
                        )
                    }
                }
                else -> {
                    if (uiState.error != null && uiState.cards.isNotEmpty()) {
                        item {
                            CircleErrorBanner(
                                message = uiState.error,
                                onRetry = onRetry,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp)
                            )
                        }
                    }

                    if (uiState.cards.isNotEmpty()) {
                        item {
                            CircleMasonryGrid(
                                cards = uiState.cards,
                                onCardClick = onCardClick
                            )
                        }
                    } else {
                        item {
                            CircleEmptyState(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 48.dp)
                            )
                        }
                    }

                    if (uiState.isAppending) {
                        item {
                            CircleLoading(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 16.dp)
                            )
                        }
                    }

                    item { Spacer(modifier = Modifier.height(32.dp)) }
                }
            }
        }

        CircleHeader(
            progress = topBarProgress,
            onSearchClick = onSearchClick,
            onHeightChanged = { headerHeightPx = it },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // 发帖按钮 - 根据Figma设计：距离右边16px，距离底部174px（考虑底部导航栏）
        CreatePostDock(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(
                    end = 16.dp,
                    bottom = navPadding.calculateBottomPadding() + 96.dp
                ),
            onClick = onCreatePost
        )
    }
}

@Composable
private fun CirclePostCard(
    card: CircleCard,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        shape = RoundedCornerShape(CardCorner),
        colors = CardDefaults.cardColors(containerColor = WhiteColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // 图片区域 - 增大图片占比，创造错落感
            val imageAspectRatio = when (card.id.hashCode() % 3) {
                0 -> 170f / 240f  // 长图（更高）
                1 -> 170f / 190f  // 略高于正方形
                else -> 170f / 210f  // 中等高度
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(imageAspectRatio)
                    .clip(RoundedCornerShape(topStart = CardCorner, topEnd = CardCorner))
            ) {
                if (!card.coverImage.isNullOrBlank()) {
                    AsyncImage(
                        model = card.coverImage,
                        contentDescription = card.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color(0xFFE5E7EB))
                    )
                }

                if (card.isExpert) {
                    Surface(
                        color = AccentOrange.copy(alpha = 0.9f),
                        shape = RoundedCornerShape(bottomEnd = 8.dp),
                        modifier = Modifier.align(Alignment.TopStart)
                    ) {
                        Text(
                            text = "大咖观点",
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            
            // 精简底部：标题一行 + 标签一行
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = card.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = PrimaryText,
                        fontWeight = FontWeight.Medium,
                        fontSize = 14.sp,
                        lineHeight = 21.sp,
                        letterSpacing = (-0.32).sp
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (card.tags.isNotEmpty()) {
                    Text(
                        text = card.tags.take(2).joinToString(" ") { "#$it" },
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = AccentOrange,
                            fontWeight = FontWeight.Normal,
                            fontSize = 12.sp,
                            lineHeight = 18.sp,
                            letterSpacing = (-0.32).sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // 恢复发帖人 & 浏览量 row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 8.dp, end = 8.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    CircleAuthorAvatar(
                        name = card.authorName,
                        avatarUrl = card.authorAvatar,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = card.authorName,
                        style = TextStyle(
                            color = SearchPlaceholder,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal,
                            letterSpacing = (-0.32).sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Visibility,
                        contentDescription = null,
                        tint = SearchPlaceholder.copy(alpha = 0.6f),
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = formatCircleViewCount(card.viewCount),
                        style = TextStyle(
                            color = SearchPlaceholder,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal,
                            letterSpacing = (-0.32).sp
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun CircleAuthorAvatar(
    name: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier
) {
    if (!avatarUrl.isNullOrBlank()) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = name,
            modifier = modifier
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        val backgroundColor = remember(name) {
            val index = (name.hashCode() and 0x7FFFFFFF) % AvatarFallbackColors.size
            AvatarFallbackColors[index]
        }
        val firstChar = name.firstOrNull()?.uppercaseChar()?.toString() ?: "星"

        Surface(
            modifier = modifier,
            shape = CircleShape,
            color = backgroundColor
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = firstChar,
                    style = TextStyle(
                        color = Color(0xFF4B5563).copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }
    }
}

private fun formatCircleViewCount(value: Int): String {
    return when {
        value >= 10000 -> {
            val df = DecimalFormat("0.#")
            "${df.format(value / 10000.0)}万"
        }
        value >= 1000 -> {
            val df = DecimalFormat("0.#")
            "${df.format(value / 1000.0)}k"
        }
        else -> value.coerceAtLeast(0).toString()
    }
}


@Composable
private fun CircleLoading(modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = AccentOrange)
    }
}

@Composable
private fun CircleErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium.copy(color = SearchPlaceholder),
                textAlign = TextAlign.Center
            )
            androidx.compose.material3.Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(text = "重新加载", color = Color.White)
            }
        }
    }
}

@Composable
private fun CircleErrorBanner(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall.copy(color = SearchPlaceholder),
                modifier = Modifier.weight(1f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "重试",
                style = MaterialTheme.typography.labelLarge.copy(color = AccentOrange),
                modifier = Modifier.clickable(onClick = onRetry)
            )
        }
    }
}

@Composable
private fun CircleEmptyState(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "暂无圈子内容",
            style = MaterialTheme.typography.bodyMedium.copy(color = SearchPlaceholder),
            textAlign = TextAlign.Center
        )
        Text(
            text = "点击下方发布按钮，抢先分享第一篇帖子吧！",
            style = MaterialTheme.typography.bodySmall.copy(color = SearchPlaceholder),
            textAlign = TextAlign.Center
        )
    }
}

/**
 * 发帖浮动按钮 - 根据Figma设计实现
 * Figma设计规范：
 * - 尺寸：48x48px
 * - 位置：右下角，距离右边16px，距离底部174px（考虑底部导航栏）
 * - 颜色：橙色 #EC7C38
 * - 阴影：0px 2px 2px 0px rgba(0,0,0,0.25)
 */
@Composable
private fun CreatePostDock(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .size(60.dp) // 提升触达面积
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        color = AccentOrange, // 根据Figma设计：橙色 #EC7C38
        shadowElevation = 6.dp // 更柔和的浮起感
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Outlined.Edit,
                contentDescription = "发布",
                tint = WhiteColor,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * 职圈顶部搜索栏 - 根据Figma设计实现
 * Figma设计规范：
 * - 顶部区域：从#00ACC3到#EBEBEB的渐变，从31.65%位置开始过渡
 * - 标题"职圈"：24sp，Semibold，黑色
 * - "大咖分享"：14sp，Medium，黑色，50%透明度
 * - 搜索框：白色背景，32px高度，8px圆角，12px占位文字
 * - 内边距：左右12px，上下12px
 */
@Composable
private fun CircleHeader(
    progress: Float,
    onSearchClick: () -> Unit,
    onHeightChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val barHeight = lerp(CircleTopBarExpandedHeight, CircleTopBarCollapsedHeight, progress)
    val horizontalPadding = lerp(18.dp, 14.dp, progress)
    val verticalPadding = lerp(12.dp, 10.dp, progress)
    val titleSize = lerp(24.sp, 20.sp, progress)
    val subtitleSize = lerp(14.sp, 12.sp, progress)
    val fieldHeight = lerp(44.dp, 40.dp, progress)
    val searchIconSize = lerp(18.dp, 16.dp, progress)
    val rowSpacing = lerp(18.dp, 12.dp, progress)
    val containerTopPadding = lerp(0.dp, 0.dp, progress)
    val containerBottomPadding = lerp(14.dp, 12.dp, progress)
    val searchCorner = lerp(16.dp, 14.dp, progress)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .onGloballyPositioned { onHeightChanged(it.size.height) }
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(HeroGradientStart, HeroGradientEnd),
                    startY = 0f,
                    endY = 520f
                )
            )
            .padding(
                top = containerTopPadding,
                bottom = containerBottomPadding,
                start = horizontalPadding,
                end = horizontalPadding
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(rowSpacing)
        ) {
            // 标题"职圈" - 根据Figma设计：24sp，Semibold，黑色
            Text(
                text = "职圈",
                fontSize = titleSize,
                fontWeight = FontWeight.SemiBold, // PingFang SC Semibold
                color = PrimaryText,
                letterSpacing = (-0.32).sp // 根据Figma设计：letterSpacing -0.32px
            )
            
            // "大咖分享"文字 - 根据Figma设计：14sp，Medium，50%透明度
            Text(
                text = "大咖分享",
                fontSize = subtitleSize,
                fontWeight = FontWeight.Medium, // PingFang SC Medium
                color = PrimaryText.copy(alpha = 0.55f), // 55%透明度
                letterSpacing = (-0.32).sp
            )
            
            // 搜索框 - 根据Figma设计：白色背景，32px高度，8px圆角
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(searchCorner),
                shadowElevation = 6.dp,
                modifier = Modifier
                    .height(fieldHeight)
                    .weight(1f)
                    .clickable(onClick = onSearchClick)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp) // 根据Figma设计：间距10px
                ) {
                    Icon(
                        painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_search),
                        contentDescription = "搜索职圈",
                        tint = SearchPlaceholder,
                        modifier = Modifier.size(searchIconSize)
                    )
                    Text(
                        text = "搜索",
                        color = SearchPlaceholder,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Light, // PingFang SC Light
                        letterSpacing = (-0.32).sp
                    )
                }
            }
        }
    }
}

@Composable
private fun CircleMasonryGrid(
    cards: List<CircleCard>,
    onCardClick: (CircleCard) -> Unit
) {
    fun estimateHeight(card: CircleCard): Int {
        val image = when (card.id.hashCode() % 3) {
            0 -> 240
            1 -> 190
            else -> 210
        }
        val content = 52 // 精简后：标题一行 + 标签一行
        return image + content
    }

    val leftColumn = mutableListOf<CircleCard>()
    val rightColumn = mutableListOf<CircleCard>()
    var leftHeight = 0
    var rightHeight = 0

    cards.forEach { card ->
        val height = estimateHeight(card)
        if (leftHeight <= rightHeight) {
            leftColumn += card
            leftHeight += height
        } else {
            rightColumn += card
            rightHeight += height
        }
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            leftColumn.forEach { card ->
                CirclePostCard(
                    card = card,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onCardClick(card) }
                )
            }
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            rightColumn.forEach { card ->
                CirclePostCard(
                    card = card,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onCardClick(card) }
                )
            }
        }
    }
}
