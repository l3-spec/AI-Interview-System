package com.xlwl.AiMian.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.RemoveRedEye
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.lerp
import coil.compose.rememberAsyncImagePainter
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import com.xlwl.AiMian.data.repository.ContentRepository

/**
 * AI面试系统首页 - 优化版
 * 
 * 优化点：
 * 1. 瀑布流布局（错落有致）✅
 * 2. 固定顶部搜索栏 ✅
 * 3. 上拉加载更多 ✅
 * 4. 深色底部导航样式 ✅
 */
private val BackgroundGray = Color(0xFFEBEBEB)
private val AccentOrange = Color(0xFFEC7C38)
private val PlaceholderGray = Color(0xFFB5B7B8)
private val TitleColor = Color(0xFF000000)
private val CardTitleColor = Color(0xFF000000)
private val CardSubtleText = Color(0xFFB5B7B8)
private val TopBarFrom = Color(0xFF00ACC3)
private val TopBarTo = BackgroundGray
private val TopBarExpandedHeight = 103.dp
private val TopBarCollapsedHeight = 68.dp
private val TopBarMaxOffset = 160.dp
@Composable
fun HomeScreen(
    repository: ContentRepository,
    onCardClick: (ContentCard) -> Unit = {},
    onSearchClick: () -> Unit = {}
) {
    val viewModel: HomeViewModel = viewModel(factory = HomeViewModel.provideFactory(repository))
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val maxOffsetPx = with(density) { TopBarMaxOffset.toPx() }
    val topBarProgress by remember(maxOffsetPx) {
        derivedStateOf {
            val index = listState.firstVisibleItemIndex
            val offset = listState.firstVisibleItemScrollOffset
            val rawOffset = if (index > 0) maxOffsetPx else offset.toFloat().coerceAtMost(maxOffsetPx)
            (rawOffset / maxOffsetPx).coerceIn(0f, 1f)
        }
    }
    
    // 监听滚动到底部，触发加载更多
    val currentUiState by rememberUpdatedState(uiState)

    LaunchedEffect(listState) {
        snapshotFlow {
            val layoutInfo = listState.layoutInfo
            val lastVisibleItem = layoutInfo.visibleItemsInfo.lastOrNull()
            val viewportEnd = layoutInfo.viewportEndOffset
            val isAtBottom = if (lastVisibleItem != null) {
                lastVisibleItem.index == layoutInfo.totalItemsCount - 1 &&
                    lastVisibleItem.offset + lastVisibleItem.size >= viewportEnd - 48
            } else {
                false
            }
            isAtBottom to listState.isScrollInProgress
        }
            .distinctUntilChanged()
            .collectLatest { (isAtBottom, isScrolling) ->
                val state = currentUiState
                if (isAtBottom && !isScrolling && !state.isLoadingMore && state.hasMore) {
                    viewModel.loadMore()
                }
            }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundGray)
    ) {
        // 主内容区域
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                top = TopBarExpandedHeight,  // 为固定顶栏留空间
                bottom = 100.dp  // 为底部导航留空间
            )
        ) {
            // Banner轮播
            item {
                BannerCarousel(
                    banners = uiState.banners,
                    currentIndex = uiState.currentBannerIndex,
                    onBannerClick = { banner ->
                        // 处理Banner点击
                    }
                )
            }
            
            // 瀑布流内容卡片（真·双列堆叠，消除上下空隙）
            item {
                MasonryGrid(
                    cards = uiState.contentCards,
                    onCardClick = onCardClick
                )
            }
            
            // 加载更多指示器
            if (uiState.isLoadingMore) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFFFF8C42),
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
            
            // 没有更多数据提示
            if (!uiState.hasMore && uiState.contentCards.isNotEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "没有更多内容了",
                            color = Color(0xFF8C8C8C),
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
        
        // 固定的顶部搜索栏（浮在内容上方）
        StickyTopSearchBar(
            progress = topBarProgress,
            onSearchClick = onSearchClick,
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }
}

/**
 * 固定顶部搜索栏（不随滚动移动）
 */
@Composable
private fun StickyTopSearchBar(
    progress: Float,
    onSearchClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val density = LocalDensity.current
    val barHeight = lerp(TopBarExpandedHeight, TopBarCollapsedHeight, progress)
    val verticalPadding = lerp(12.dp, 6.dp, progress)
    val horizontalPadding = lerp(12.dp, 16.dp, progress)
    val titleSize = lerp(24.sp, 18.sp, progress)
    val searchHeight = lerp(32.dp, 28.dp, progress)
    val searchIconSize = lerp(12.dp, 10.dp, progress)
    val actionSize = lerp(32.dp, 28.dp, progress)
    val actionIconSize = lerp(16.dp, 14.dp, progress)
    val spacerWidth = lerp(12.dp, 8.dp, progress)
    val translateYPx = with(density) { (-12).dp.toPx() } * progress
    val shadowElevation = lerp(0.dp, 10.dp, progress)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(barHeight)
            .graphicsLayer {
                translationY = translateYPx
            },
        color = Color.Transparent,
        shadowElevation = shadowElevation
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(TopBarFrom, TopBarTo)
                    )
                )
        )
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = horizontalPadding, vertical = verticalPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 标题
            Text(
                text = "首页",
                fontSize = titleSize,
                fontWeight = FontWeight.SemiBold,
                color = TitleColor
            )
            
            Spacer(modifier = Modifier.width(spacerWidth))
            
            // 搜索框
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(searchHeight)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White)
                    .clickable { onSearchClick() }
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "搜索",
                        tint = PlaceholderGray,
                        modifier = Modifier.size(searchIconSize)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "搜索",
                        color = PlaceholderGray,
                        fontSize = 12.sp
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(spacerWidth))
            
            // 搜索按钮
            Box(
                modifier = Modifier
                    .size(actionSize)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                AccentOrange,
                                AccentOrange
                            )
                        )
                    )
                    .clickable { onSearchClick() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "搜索",
                    tint = Color.White,
                    modifier = Modifier.size(actionIconSize)
                )
            }
        }
    }
}

/**
 * Banner轮播组件
 */
@Composable
private fun BannerCarousel(
    banners: List<BannerData>,
    currentIndex: Int,
    onBannerClick: (BannerData) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 12.dp)
    ) {
        // Banner卡片
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(161.dp)
                .clip(RoundedCornerShape(8.dp))
                .clickable { 
                    if (banners.isNotEmpty()) {
                        onBannerClick(banners[currentIndex % banners.size])
                    }
                }
        ) {
            if (banners.isNotEmpty()) {
                val banner = banners[currentIndex % banners.size]
                
                // 背景图片
                Image(
                    painter = rememberAsyncImagePainter(banner.imageUrl),
                    contentDescription = banner.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                
                // 渐变遮罩
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.7f)
                                ),
                                startY = 100f
                            )
                        )
                )
                
                // 文字内容
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(14.dp)
                ) {
                    Text(
                        text = banner.label,
                        fontSize = 12.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = banner.title,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        lineHeight = 26.sp
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = banner.subtitle,
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }
        
        // 轮播指示器
        if (banners.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                banners.forEachIndexed { index, _ ->
                    val isActive = index == currentIndex % banners.size
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .width(if (isActive) 12.dp else 4.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (isActive) AccentOrange
                                else Color.White
                            )
                    )
                }
            }
        }
    }
}

/**
 * 内容网格中的单行（最多两张卡片）
 */
@Composable
 private fun ContentGridRow(
    cards: List<ContentCard>,
    onCardClick: (ContentCard) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        cards.forEach { card ->
            ContentCardItem(
                card = card,
                modifier = Modifier.weight(1f),
                onClick = { onCardClick(card) }
            )
        }
        if (cards.size == 1) {
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

/**
 * 真·双列 Masonry 瀑布流：按估算高度将卡片分配到更短的一列，避免上下空洞
 */
@Composable
private fun MasonryGrid(
    cards: List<ContentCard>,
    onCardClick: (ContentCard) -> Unit
) {
    // 简单高度估算：依据图片高度模式 + 固定内容高度估计
    fun estimateHeight(card: ContentCard): Int {
        val image = if (card.id.hashCode() % 3 == 0) 227 else 170
        val content = 80 // 标题/标签/底部信息的近似高度
        return image + content
    }

    val leftColumn = mutableListOf<ContentCard>()
    val rightColumn = mutableListOf<ContentCard>()
    var leftH = 0
    var rightH = 0
    cards.forEach { c ->
        val h = estimateHeight(c)
        if (leftH <= rightH) {
            leftColumn += c
            leftH += h
        } else {
            rightColumn += c
            rightH += h
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
                ContentCardItem(card = card, onClick = { onCardClick(card) })
            }
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            rightColumn.forEach { card ->
                ContentCardItem(card = card, onClick = { onCardClick(card) })
            }
        }
    }
}

/**
 * 单个内容卡片（高度自适应，保持错落视觉）
 */
@Composable
 private fun ContentCardItem(
    card: ContentCard,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp,
            pressedElevation = 4.dp
        )
    ) {
        Column {
            val imageHeight = if (card.id.hashCode() % 3 == 0) 227.dp else 170.dp

            Image(
                painter = rememberAsyncImagePainter(card.imageUrl),
                contentDescription = card.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(imageHeight),
                contentScale = ContentScale.Crop
            )

            Column(
                modifier = Modifier.padding(4.dp)
            ) {
                Text(
                    text = card.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = CardTitleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 21.sp
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    card.tags.take(2).forEach { tag ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(AccentOrange.copy(alpha = 0.1f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = tag,
                                fontSize = 12.sp,
                                color = AccentOrange,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp, bottom = 4.dp, start = 4.dp, end = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (card.avatarUrl.isNullOrBlank()) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(
                                        brush = Brush.linearGradient(
                                            colors = listOf(
                                                AccentOrange,
                                                AccentOrange
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = card.author.take(1),
                                    fontSize = 12.sp,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            Image(
                                painter = rememberAsyncImagePainter(card.avatarUrl),
                                contentDescription = "作者头像",
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Text(
                            text = card.author,
                            fontSize = 12.sp,
                            color = Color(0xFF000000)
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.RemoveRedEye,
                            contentDescription = "浏览量",
                            tint = CardSubtleText,
                            modifier = Modifier.size(14.dp)
                        )

                        Spacer(modifier = Modifier.width(4.dp))

                        Text(
                            text = card.views,
                            fontSize = 12.sp,
                            color = CardSubtleText
                        )
                    }
                }
            }
        }
    }
}
