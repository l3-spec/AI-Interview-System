@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavBackStackEntry
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
import kotlinx.coroutines.launch

@Composable
fun MyPostsRoute(
    repository: ContentRepository,
    backStackEntry: NavBackStackEntry,
    onBack: () -> Unit,
    onCreatePost: () -> Unit,
    onPostClick: (String) -> Unit
) {
    var posts by remember { mutableStateOf<List<UserPost>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val refreshSignal by backStackEntry.savedStateHandle
        .getStateFlow("should_refresh_my_posts", false)
        .collectAsState()

    val loadPosts = remember(repository) {
        { refresh: Boolean ->
            scope.launch {
                if (!refresh) {
                    isLoading = true
                } else {
                    isRefreshing = true
                }
                val result = repository.getMyPosts()
                result.onSuccess { paged ->
                    posts = paged.list
                    error = null
                }.onFailure {
                    error = it.message ?: "加载失败，请稍后再试"
                }
                isLoading = false
                isRefreshing = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadPosts(false)
    }

    LaunchedEffect(refreshSignal) {
        if (refreshSignal) {
            backStackEntry.savedStateHandle["should_refresh_my_posts"] = false
            loadPosts(true)
        }
    }

    MyPostsScreen(
        posts = posts,
        isLoading = isLoading,
        isRefreshing = isRefreshing,
        error = error,
        onBack = onBack,
        onRetry = { loadPosts(true) },
        onCreatePost = onCreatePost,
        onPostClick = onPostClick
    )
}

@Composable
private fun MyPostsScreen(
    posts: List<UserPost>,
    isLoading: Boolean,
    isRefreshing: Boolean,
    error: String?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onCreatePost: () -> Unit,
    onPostClick: (String) -> Unit
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "我的发布",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onCreatePost) {
                        Icon(
                            imageVector = Icons.Outlined.Add,
                            contentDescription = "发布"
                        )
                    }
                }
            )
        },
        containerColor = Color(0xFFF5F6F9)
    ) { padding ->
        when {
            isLoading && posts.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFFEC7C38))
                }
            }
            error != null && posts.isEmpty() -> {
                MyPostsEmptyState(
                    title = "加载失败",
                    description = error,
                    actionLabel = "重试",
                    onAction = onRetry,
                    modifier = Modifier.padding(padding)
                )
            }
            posts.isEmpty() -> {
                MyPostsEmptyState(
                    title = "还没有发布内容",
                    description = "分享你的职场动态、经验或问题，和社区一起交流成长。",
                    actionLabel = "立即发布",
                    onAction = onCreatePost,
                    modifier = Modifier.padding(padding)
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isRefreshing) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = Color(0xFFEC7C38)
                                )
                            }
                        }
                    }
                    items(posts, key = { it.id }) { post ->
                        MyPostCard(
                            post = post,
                            onClick = { onPostClick(post.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MyPostCard(
    post: UserPost,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (post.images.isNotEmpty()) {
                    AsyncImage(
                        model = post.images.first(),
                        contentDescription = post.title,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFEDF0F8)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = post.title.take(2),
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            ),
                            color = Color(0xFF4C4F57)
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = post.content,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF7B7E87),
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "浏览 ${post.viewCount}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color(0xFF9CA0A8),
                        fontSize = 12.sp
                    )
                )
                Text(
                    text = post.createdAt.take(16),
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color(0xFF9CA0A8),
                        fontSize = 12.sp
                    )
                )
            }
        }
    }
}

@Composable
private fun MyPostsEmptyState(
    title: String,
    description: String,
    actionLabel: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.Add,
            contentDescription = null,
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color(0xFFF0F2F6)),
            tint = Color(0xFFADB1B9)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = Color(0xFF8B8E96),
                lineHeight = 20.sp
            ),
            modifier = Modifier.padding(horizontal = 24.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        OutlinedButton(
            onClick = onAction,
            shape = RoundedCornerShape(24.dp)
        ) {
            Text(text = actionLabel)
        }
    }
}
