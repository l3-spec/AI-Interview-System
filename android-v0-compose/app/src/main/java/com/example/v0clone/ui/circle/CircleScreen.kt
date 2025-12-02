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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Visibility
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
import java.text.DecimalFormat
import kotlinx.coroutines.flow.distinctUntilChanged

// 根据Figma设计规范定义颜色，与职岗页保持统一的头部样式
private val PageBackground = Color(0xFFF4F5F6)
private val HeroGradientStart = Color(0xFF00ACC3)
private val HeroGradientEnd = Color(0xFFE9F7F9)
private val SearchPlaceholder = Color(0xFFA6ABB1)
private val PrimaryText = Color(0xFF2D3036)
private val AccentOrange = Color(0xFFF28B3F)
private val WhiteColor = Color(0xFFFFFFFF)
private val CardCorner = 8.dp
private val CircleTopBarExpandedHeight = 76.dp
private val CircleTopBarCollapsedHeight = 54.dp
private val CircleTopBarMaxOffset = 120.dp
private val CircleHeaderApproxHeight = CircleTopBarExpandedHeight + 64.dp

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
            contentPadding = PaddingValues(bottom = 140.dp)
        ) {
            item(key = "header-spacer") {
                Spacer(modifier = Modifier.height(headerPlaceholderHeight + 12.dp))
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
                                .padding(horizontal = 24.dp, vertical = 48.dp)
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
                                    .padding(horizontal = 12.dp, vertical = 8.dp)
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
                                    .padding(horizontal = 24.dp, vertical = 48.dp)
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

        CreatePostDock(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 144.dp),
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
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(5.dp)  // Figma gap
        ) {
            // 图片区域 - 根据Figma，高度有170px和227px两种，创造错落感
            val imageAspectRatio = when (card.id.hashCode() % 3) {
                0 -> 170f / 227f  // 长图
                1 -> 170f / 170f  // 正方形
                else -> 170f / 200f  // 中等高度
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
            
            // 标题和标签区域 - padding改为4dp
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)  // Figma gap
            ) {
                // 标题和标签
                Column {
                    Text(
                        text = card.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = PrimaryText,
                            fontWeight = FontWeight.Medium,  // PingFang SC Medium
                            fontSize = 14.sp,
                            lineHeight = 21.sp,
                            letterSpacing = (-0.32).sp
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (card.tags.isNotEmpty()) {
                        Text(
                            text = card.tags.take(2).joinToString(" ") { "#$it" },
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = AccentOrange,
                                fontWeight = FontWeight.Normal,  // PingFang SC Regular
                                fontSize = 12.sp,
                                lineHeight = 21.sp,
                                letterSpacing = (-0.32).sp
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            
            // 作者和浏览数区域 - padding 4dp
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),  // Figma gap
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    AuthorAvatar(
                        name = card.authorName,
                        avatarUrl = card.authorAvatar
                    )
                    Text(
                        text = card.authorName,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = PrimaryText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Light,  // PingFang SC Light
                            lineHeight = 21.sp,
                            letterSpacing = (-0.32).sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)  // Figma gap
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Visibility,
                        contentDescription = null,
                        tint = SearchPlaceholder,
                        modifier = Modifier.size(16.dp)  // Figma 16px
                    )
                    Text(
                        text = formatCompactViewCount(card.viewCount),
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = SearchPlaceholder,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Light,
                            lineHeight = 21.sp,
                            letterSpacing = (-0.32).sp
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun AuthorAvatar(
    name: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier
) {
    if (!avatarUrl.isNullOrBlank()) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = name,
            modifier = modifier
                .size(24.dp)  // Figma设计是24px
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Surface(
            modifier = modifier.size(24.dp),  // Figma设计是24px
            shape = CircleShape,
            color = Color(0xFFEFF1F4)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = name.firstOrNull()?.uppercaseChar()?.toString() ?: "星",
                    style = MaterialTheme.typography.labelLarge.copy(
                        color = Color(0xFF4B5563),
                        fontWeight = FontWeight.SemiBold
                    )
                )
            }
        }
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

@Composable
private fun CreatePostDock(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .size(48.dp)  // 根据Figma设计调整为48dp
            .clip(CircleShape)
            .clickable(onClick = onClick),
        color = AccentOrange,
        shadowElevation = 2.dp  // Figma设计的阴影
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

@Composable
private fun CircleHeader(
    progress: Float,
    onSearchClick: () -> Unit,
    onHeightChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val barHeight = lerp(CircleTopBarExpandedHeight, CircleTopBarCollapsedHeight, progress)
    val horizontalPadding = lerp(16.dp, 14.dp, progress)
    val verticalPadding = lerp(12.dp, 10.dp, progress)
    val titleSize = lerp(26.sp, 22.sp, progress)
    val fieldHeight = lerp(42.dp, 38.dp, progress)
    val searchIconSize = lerp(18.dp, 16.dp, progress)
    val rowSpacing = lerp(14.dp, 10.dp, progress)
    val bottomPadding = lerp(14.dp, 10.dp, progress)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .onGloballyPositioned { onHeightChanged(it.size.height) }
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(HeroGradientStart, HeroGradientEnd)
                )
            )
            .padding(bottom = bottomPadding)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
                .padding(horizontal = horizontalPadding, vertical = verticalPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(rowSpacing)
        ) {
            Text(
                text = "职圈",
                fontSize = titleSize,
                fontWeight = FontWeight.SemiBold,
                color = PrimaryText
            )
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                shadowElevation = 6.dp,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .height(fieldHeight)
                    .weight(1f)
                    .clickable(onClick = onSearchClick)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_search),
                        contentDescription = "搜索职圈",
                        tint = SearchPlaceholder,
                        modifier = Modifier.size(searchIconSize)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "搜索",
                            color = SearchPlaceholder,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Normal
                        )
                    }
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
            0 -> 227
            1 -> 170
            else -> 200
        }
        val content = 88
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
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
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

private fun formatCompactViewCount(value: Int): String {
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
