package com.xlwl.AiMian.ui.circle

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Search
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavBackStackEntry
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.repository.ContentRepository
import java.text.DecimalFormat
import kotlin.math.max
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map

private val PageBackground = Color(0xFFEBEBEB)
private val HeroGradientStart = Color(0xFF00ACC3)
private val HeroGradientEnd = Color(0xFFEBEBEB)
private val SearchPlaceholder = Color(0xFFB5B7B8)
private val PrimaryText = Color(0xFF111827)
private val AccentOrange = Color(0xFFEC7C38)
private val CardCorner = 16.dp

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

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CircleScreen(
    uiState: CircleUiState,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onSearchClick: () -> Unit,
    onCardClick: (CircleCard) -> Unit,
    onCreatePost: () -> Unit
) {
    val listState = rememberLazyGridState()

    LaunchedEffect(listState, uiState.cards.size, uiState.isAppending, uiState.isLoading) {
        snapshotFlow { listState.layoutInfo }
            .map { info ->
                val lastIndex = info.visibleItemsInfo.lastOrNull()?.index ?: 0
                val total = info.totalItemsCount
                lastIndex to total
            }
            .distinctUntilChanged()
            .filter { (lastIndex, total) ->
                total > 0 && lastIndex >= max(total - 4, 0)
            }
            .collect {
                if (!uiState.isLoading && !uiState.isAppending && uiState.cards.isNotEmpty()) {
                    onLoadMore()
                }
            }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
    ) {
        when {
            uiState.isLoading && uiState.cards.isEmpty() -> {
                CircleLoading(modifier = Modifier.fillMaxSize())
            }
            uiState.error != null && uiState.cards.isEmpty() -> {
                CircleErrorState(
                    message = uiState.error,
                    onRetry = onRetry,
                    modifier = Modifier.fillMaxSize()
                )
            }
            else -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    CircleHeroSection(onSearchClick = onSearchClick)
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        state = listState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentPadding = PaddingValues(
                            start = 12.dp,
                            end = 12.dp,
                            top = 8.dp,
                            bottom = 140.dp
                        ),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (uiState.error != null) {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                CircleErrorBanner(
                                    message = uiState.error,
                                    onRetry = onRetry,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 4.dp)
                                )
                            }
                        }

                        items(
                            items = uiState.cards,
                            key = { it.id }
                        ) { card ->
                            CirclePostCard(
                                card = card,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { onCardClick(card) }
                            )
                        }

                        if (uiState.isAppending) {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                CircleLoading(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 16.dp)
                                )
                            }
                        }

                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Spacer(modifier = Modifier.height(32.dp))
                        }
                    }
                }
            }
        }

        CreatePostDock(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 120.dp),
            onClick = onCreatePost
        )
    }
}

@Composable
private fun CircleHeroSection(onSearchClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(HeroGradientStart, HeroGradientEnd)
                )
            )
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "职圈",
            style = MaterialTheme.typography.headlineSmall.copy(
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-0.2).sp
            )
        )
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color.White)
                .clickable(onClick = onSearchClick)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Outlined.Search,
                contentDescription = "搜索职圈",
                tint = SearchPlaceholder,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "搜索",
                color = SearchPlaceholder,
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
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
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            if (!card.coverImage.isNullOrBlank()) {
                AsyncImage(
                    model = card.coverImage,
                    contentDescription = card.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(topStart = CardCorner, topEnd = CardCorner)),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .background(Color(0xFFE5E7EB))
                )
            }
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                Text(
                    text = card.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = PrimaryText,
                        fontWeight = FontWeight.SemiBold,
                        lineHeight = 22.sp
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (card.tags.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = card.tags.take(2).joinToString(" ") { "#$it" },
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = AccentOrange,
                            fontSize = 12.sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f, fill = true)
                    ) {
                        AuthorAvatar(
                            name = card.authorName,
                            avatarUrl = card.authorAvatar
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = card.authorName,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color(0xFF4B5563),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.End
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Visibility,
                            contentDescription = null,
                            tint = Color(0xFF9CA3AF),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = formatCompactViewCount(card.viewCount),
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color(0xFF9CA3AF),
                                fontSize = 11.sp
                            )
                        )
                    }
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
                .size(28.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Surface(
            modifier = modifier.size(28.dp),
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
private fun CreatePostDock(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .size(56.dp)
            .clip(CircleShape)
            .clickable(onClick = onClick),
        color = AccentOrange,
        shadowElevation = 12.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Outlined.Edit,
                contentDescription = "发布",
                tint = Color.White,
                modifier = Modifier.size(22.dp)
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
