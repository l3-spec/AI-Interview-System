package com.xlwl.AiMian.ui.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
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
import com.xlwl.AiMian.data.model.HomeFeedTargetType
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.foundation.shape.CircleShape
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import java.text.DecimalFormat

/**
 * AI面试系统首页 - 优化版
 * 
 * 优化点：
 * 1. 瀑布流布局（错落有致）✅
 * 2. 固定顶部搜索栏 ✅
 * 3. 上拉加载更多 ✅
 * 4. 深色底部导航样式 ✅
 * 5. 紧凑布局 - Banner与搜索栏无间距 ✅
 * 6. 移除badge标签 ✅
 * 7. 图片更大，标题一行、标签一行 ✅
 * 8. 职岗/企业卡片差异化展示 ✅
 */
private val GradientTop = Color(0xFF00ADC1)
private val GradientBottom = Color(0xFFE3F4FB)
private val PageBackground = Color(0xFFEBEBEB)
private val AccentOrange = Color(0xFFEC7C38)
private val PlaceholderGray = Color(0xFFB5B7B8)
private val TextPrimary = Color(0xFF000000)
private val CardTitleColor = TextPrimary
private val CardSubtleText = Color(0xFFB5B7B8)
private val SalaryColor = Color(0xFFEC7C38)
private val HomeTopBarExpandedHeight = 76.dp
private val HomeTopBarCollapsedHeight = 54.dp
private val HomeTopBarMaxOffset = 120.dp
private val HomeHeaderApproxHeight = HomeTopBarExpandedHeight + 64.dp
private val FigmaLetterSpacing = (-0.32).sp

private val AvatarFallbackColors = listOf(
    Color(0xFFFDE68A), // Amber
    Color(0xFFBFDBFE), // Blue
    Color(0xFFC6F6D5), // Green
    Color(0xFFFED7AA), // Orange
    Color(0xFFE9D5FF), // Purple
    Color(0xFFFECACA), // Red
    Color(0xFF99F6E4), // Teal
    Color(0xFFDDD6FE), // Violet
    Color(0xFFFBCFE8), // Pink
    Color(0xFFCFFAFE), // Cyan
    Color(0xFFF5F3FF), // Indigo
    Color(0xFFFEF3C7), // Yellow
    Color(0xFFE0F2FE), // Light Blue
    Color(0xFFECFDF5)  // Emerald
)

private val JobGradientOptions = listOf(
    listOf(Color(0xFFF97316), Color(0xFFFFEDD5)), // 橙色
    listOf(Color(0xFF0EA5E9), Color(0xFFE0F2FE)), // 蓝色
    listOf(Color(0xFF8B5CF6), Color(0xFFEDE9FE)), // 紫色
    listOf(Color(0xFF14B8A6), Color(0xFFCCFBF1)), // 青色
    listOf(Color(0xFFF43F5E), Color(0xFFFFF1F2))  // 红色
)

@Composable
fun HomeScreen(
    repository: ContentRepository,
    onCardClick: (ContentCard) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onBannerClick: (BannerData) -> Unit = {}
) {
    val viewModel: HomeViewModel = viewModel(factory = HomeViewModel.provideFactory(repository))
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val maxOffsetPx = with(density) { HomeTopBarMaxOffset.toPx() }
    val navPadding = WindowInsets.navigationBars.asPaddingValues()
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
            .background(PageBackground)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(GradientTop, GradientBottom),
                        startY = 0f,
                        endY = 520f
                    )
                )
        )

        var headerHeightPx by remember { mutableStateOf(0) }
        val headerPlaceholderHeight = if (headerHeightPx > 0) {
            with(density) { headerHeightPx.toDp() }
        } else {
            HomeHeaderApproxHeight
        }

        // 主内容区域 - 减少间距使页面更紧凑
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 12.dp,
                end = 12.dp,
                bottom = navPadding.calculateBottomPadding() + 64.dp
            ),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            item(key = "header-spacer") {
                Spacer(modifier = Modifier.height(headerPlaceholderHeight))
            }

            // Banner轮播
            item {
                BannerCarousel(
                    banners = uiState.banners,
                    currentIndex = uiState.currentBannerIndex,
                    onBannerClick = onBannerClick
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
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = AccentOrange,
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
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "没有更多内容了",
                            color = CardSubtleText,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
        
        // 固定的顶部搜索栏（浮在内容上方，与职岗页保持一致）
        HomeHeader(
            progress = topBarProgress,
            onSearchClick = onSearchClick,
            onHeightChanged = { headerHeightPx = it },
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }
}

/**
 * 顶部搜索栏（与职岗页保持一致的头部缩放与样式）
 * 减少底部 padding，使 banner 紧贴搜索栏
 */
@Composable
private fun HomeHeader(
    progress: Float,
    onSearchClick: () -> Unit,
    onHeightChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val barHeight = lerp(HomeTopBarExpandedHeight, HomeTopBarCollapsedHeight, progress)
    val horizontalPadding = lerp(12.dp, 12.dp, progress)
    val verticalPadding = lerp(15.dp, 11.dp, progress)
    val titleSize = lerp(24.sp, 20.sp, progress)
    val fieldHeight = lerp(32.dp, 30.dp, progress)
    val searchIconSize = lerp(12.dp, 12.dp, progress)
    val rowSpacing = lerp(32.dp, 20.dp, progress)
    val bottomPadding = lerp(4.dp, 2.dp, progress)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .onGloballyPositioned { onHeightChanged(it.size.height) }
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(GradientTop, GradientBottom),
                    startY = 0f,
                    endY = 520f
                )
            )
            .padding(bottom = bottomPadding)
    ) {
        // 允许内容从状态栏下方开始绘制（沉浸式），但实际部件通过 padding 避开状态栏
        Spacer(modifier = Modifier.statusBarsPadding())
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
                .padding(horizontal = horizontalPadding, vertical = verticalPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(rowSpacing)
        ) {
            Text(
                text = "首页",
                fontSize = titleSize,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                letterSpacing = FigmaLetterSpacing
            )
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(8.dp),
                shadowElevation = 0.dp,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .height(fieldHeight)
                    .weight(1f)
                    .clickable(onClick = onSearchClick)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 24.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_search),
                        contentDescription = "搜索",
                        tint = PlaceholderGray,
                        modifier = Modifier.size(searchIconSize)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "搜索",
                            color = PlaceholderGray,
                            style = TextStyle(
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Light,
                                lineHeight = 21.sp,
                                letterSpacing = FigmaLetterSpacing
                            )
                        )
                    }
                }
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
        modifier = Modifier.fillMaxWidth()
    ) {
        // Banner卡片
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(161.dp)
                .clip(RoundedCornerShape(12.dp))
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
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        lineHeight = 26.sp
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = banner.subtitle,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }
        
        // 轮播指示器 - 减少与下方内容的间距
        if (banners.isNotEmpty()) {
            Spacer(modifier = Modifier.height(6.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                banners.forEachIndexed { index, _ ->
                    val isActive = index == currentIndex % banners.size
                    val activeColor = Color(0xFFEC7C38)
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .width(if (isActive) 12.dp else 4.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (isActive) activeColor
                                else Color.White.copy(alpha = 0.2f)
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
            .padding(vertical = 8.dp),
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
        val image = when {
            card.targetType == HomeFeedTargetType.JOB && card.imageUrl.isNullOrBlank() -> 160
            card.targetType == HomeFeedTargetType.COMPANY && card.imageUrl.isNullOrBlank() -> 160
            card.id.hashCode() % 3 == 0 -> 240
            else -> 190
        }
        val content = 56 // 标题 + 标签（精简后更少）
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
        modifier = Modifier.fillMaxWidth(),
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
 * 单个内容卡片 - 优化版
 * 
 * 改动：
 * - 移除 badge 标签（"热门帖子"/"热门职岗"等）
 * - 图片占比增大
 * - 精简为标题一行 + 标签一行
 * - 移除 summary、作者头像、浏览数底部行
 * - 职岗/企业卡片差异化展示
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
            defaultElevation = 0.dp,
            pressedElevation = 0.dp
        )
    ) {
        Column {
            // 图片区域 - 增大高度
            val imageHeight = when {
                card.targetType == HomeFeedTargetType.JOB && card.imageUrl.isNullOrBlank() -> 160.dp
                card.targetType == HomeFeedTargetType.COMPANY && card.imageUrl.isNullOrBlank() -> 160.dp
                card.id.hashCode() % 3 == 0 -> 240.dp
                else -> 190.dp
            }

            when {
                // 职岗卡片 - 无图时用背景色+内容展示
                card.targetType == HomeFeedTargetType.JOB && card.imageUrl.isNullOrBlank() -> {
                    JobCardHero(
                        card = card,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(imageHeight)
                    )
                }
                // 企业卡片 - 无图时参考职岗的渐变展示
                card.targetType == HomeFeedTargetType.COMPANY && card.imageUrl.isNullOrBlank() -> {
                    CompanyCardHero(
                        card = card,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(imageHeight)
                    )
                }
                // 有图的卡片（帖子/有图企业/有图职岗）
                !card.imageUrl.isNullOrBlank() -> {
                    Image(
                        painter = rememberAsyncImagePainter(card.imageUrl),
                        contentDescription = card.title,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(imageHeight),
                        contentScale = ContentScale.Crop
                    )
                }
                // 其他无图帖子 - 渐变占位
                else -> {
                    GenericCardHero(
                        card = card,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(imageHeight)
                    )
                }
            }

            // 底部文字区域 - 精简版：根据卡片类型展示不同内容
            when (card.targetType) {
                HomeFeedTargetType.JOB -> {
                    // 职岗：标签一行 + 薪资一行
                    Column(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        val jobTags = card.tags
                            .filter { it != card.location && it.isNotBlank() }
                            .take(2)
                            .joinToString(" ") { "#$it" }
                        if (jobTags.isNotBlank()) {
                            Text(
                                text = jobTags,
                                fontSize = 12.sp,
                                color = AccentOrange,
                                fontWeight = FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 18.sp,
                                letterSpacing = FigmaLetterSpacing
                            )
                        }
                        card.salary?.takeIf { it.isNotBlank() }?.let { sal ->
                            Text(
                                text = sal,
                                fontSize = 12.sp,
                                color = SalaryColor,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 18.sp,
                                letterSpacing = FigmaLetterSpacing
                            )
                        }
                    }
                }
                HomeFeedTargetType.COMPANY -> {
                    // 企业：公司名称 + 公司标签
                    Column(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = card.title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = CardTitleColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 21.sp,
                            letterSpacing = FigmaLetterSpacing
                        )
                        val companyTags = card.tags
                            .take(3)
                            .filter { it.isNotBlank() }
                            .joinToString(" ") { "#$it" }
                        if (companyTags.isNotBlank()) {
                            Text(
                                text = companyTags,
                                fontSize = 12.sp,
                                color = AccentOrange,
                                fontWeight = FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 18.sp,
                                letterSpacing = FigmaLetterSpacing
                            )
                        }
                    }
                }
                else -> {
                    // 帖子：标题一行 + 标签一行
                    Column(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = card.title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = CardTitleColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 21.sp,
                            letterSpacing = FigmaLetterSpacing
                        )
                        val tagLine = card.tags
                            .take(2)
                            .filter { it.isNotBlank() }
                            .joinToString(" ") { "#$it" }
                        if (tagLine.isNotBlank()) {
                            Text(
                                text = tagLine,
                                fontSize = 12.sp,
                                color = AccentOrange,
                                fontWeight = FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 18.sp,
                                letterSpacing = FigmaLetterSpacing
                            )
                        }
                    }
                }
            }

            // 恢复发帖人 & 浏览量 row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 10.dp, end = 10.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    key(card.id) {
                        AuthorAvatar(
                            name = card.author,
                            avatarUrl = card.avatarUrl,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = card.author,
                        style = TextStyle(
                            color = CardSubtleText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal,
                            letterSpacing = FigmaLetterSpacing
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                if (card.targetType == HomeFeedTargetType.POST && card.views.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Visibility,
                            contentDescription = null,
                            tint = CardSubtleText.copy(alpha = 0.6f),
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = formatCompactViewCount(card.views.toIntOrNull() ?: 0),
                            style = TextStyle(
                                color = CardSubtleText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Normal,
                                letterSpacing = FigmaLetterSpacing
                            )
                        )
                    }
                }
            }
        }
    }
}

/**
 * 职岗卡片 Hero 区域 - 渐变背景 + 职位名 + 薪资
 */
@Composable
private fun JobCardHero(
    card: ContentCard,
    modifier: Modifier = Modifier
) {
    val gradientColors = remember(card.id) {
        val index = (card.id.hashCode() and 0x7FFFFFFF) % JobGradientOptions.size
        JobGradientOptions[index]
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            .background(
                brush = Brush.linearGradient(
                    colors = gradientColors
                )
            )
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(14.dp)
                .offset(y = (-4).dp), // 文字上移
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = card.author, // 公司名称
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 18.sp
            )
            Text(
                text = card.title, // 职岗名称
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 24.sp
            )
        }
    }
}

/**
 * 企业卡片 Hero 区域 - 无图时使用渐变背景 + 企业名称
 */
@Composable
private fun CompanyCardHero(
    card: ContentCard,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(Color(0xFF0EA5E9), Color(0xFFE0F2FE))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = card.title,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 24.sp
            )
            card.author.takeIf { it.isNotBlank() }?.let { author ->
                Text(
                    text = author,
                    color = Color.White.copy(alpha = 0.86f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * 通用无图卡片 Hero 区域 - 帖子类型的渐变背景
 */
@Composable
private fun GenericCardHero(
    card: ContentCard,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(Color(0xFF14B8A6), Color(0xFFCCFBF1))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = card.title,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 24.sp
            )
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
        SubcomposeAsyncImage(
            model = avatarUrl,
            contentDescription = name,
            modifier = modifier
                .clip(CircleShape),
            contentScale = ContentScale.Crop,
            error = {
                AvatarInitialFallback(name = name, modifier = modifier)
            }
        )
    } else {
        AvatarInitialFallback(name = name, modifier = modifier)
    }
}

@Composable
private fun AvatarInitialFallback(
    name: String,
    modifier: Modifier = Modifier
) {
    val trimmedName = name.trim()
    val backgroundColor = remember(trimmedName) {
        val hash = if (trimmedName.isEmpty()) 0 else trimmedName.hashCode()
        val index = (hash and 0x7FFFFFFF) % AvatarFallbackColors.size
        AvatarFallbackColors[index]
    }
    val firstChar = trimmedName.firstOrNull()?.toString() ?: "星"

    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = backgroundColor
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = firstChar,
                style = TextStyle(
                    color = Color(0xFF4B5563).copy(alpha = 0.85f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            )
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
