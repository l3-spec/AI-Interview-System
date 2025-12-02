package com.xlwl.AiMian.ui.profile

import android.widget.Toast
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.api.AuthApi
import com.xlwl.AiMian.data.api.RetrofitClient
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.navigation.Routes
import com.xlwl.AiMian.ui.auth.LoginFlowScreen
import com.google.gson.Gson
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(navController: NavController) {
    val context = LocalContext.current
    val authManager = remember { AuthManager(context) }
    val token by authManager.tokenFlow.collectAsState(initial = null)
    val userJson by authManager.userJsonFlow.collectAsState(initial = null)
    val scope = rememberCoroutineScope()
    val gson = remember { Gson() }
    val user = remember(userJson) {
        userJson?.let { runCatching { gson.fromJson(it, User::class.java) }.getOrNull() }
    }
    val loginClient = remember { RetrofitClient.createOkHttpClient { null } }
    val loginAuthApi = remember(loginClient) { RetrofitClient.createService(AuthApi::class.java, loginClient) }
    val loginRepo = remember(loginAuthApi) { AuthRepository(loginAuthApi) }

    if (token.isNullOrEmpty()) {
        LoginFlowScreen(
            repo = loginRepo,
            onLoginSuccess = { newToken, newUserJson ->
                scope.launch {
                    authManager.setToken(newToken)
                    authManager.setUserJson(newUserJson)
                }
            },
            onGoRegister = { navController.navigate(Routes.REGISTER) }
        )
    } else {
        LoggedInProfileContent(
            user = user,
            onNavigate = { route ->
                navController.navigate(route) {
                    launchSingleTop = true
                }
            }
        )
    }
}

@Composable
private fun LoggedInProfileContent(
    user: User?,
    onNavigate: (String) -> Unit
) {
    val context = LocalContext.current
    val showComingSoon = remember(context) {
        { label: String ->
            Toast.makeText(context, "$label 敬请期待", Toast.LENGTH_SHORT).show()
        }
    }
    val handleAction = remember(onNavigate, showComingSoon) {
        { route: String?, label: String ->
            if (route != null) {
                onNavigate(route)
            } else {
                showComingSoon(label)
            }
        }
    }

    val deliveryShortcuts = remember {
        listOf(
            ProfileShortcut(
                title = "简历报告",
                iconRes = R.drawable.ic_profile_resume,
                route = Routes.PROFILE_RESUME_REPORT
            ),
            ProfileShortcut(
                title = "AI 面试",
                iconRes = R.drawable.ic_profile_ai,
                route = Routes.AI
            ),
            ProfileShortcut(
                title = "职业测评",
                iconRes = R.drawable.ic_profile_assessment,
                route = Routes.PROFILE_ASSESSMENTS
            ),
            ProfileShortcut(
                title = "职位收藏",
                iconRes = R.drawable.ic_profile_job_favorite,
                route = null
            )
        )
    }
    val deliveryStats = remember {
        listOf(
            ProfileStat(label = "已投递", value = "0"),
            ProfileStat(label = "被查看", value = "0"),
            ProfileStat(label = "通过初筛", value = "0"),
            ProfileStat(label = "不合适", value = "0")
        )
    }
    val communityShortcuts = remember {
        listOf(
            ProfileShortcut(
                title = "我的发布",
                iconRes = R.drawable.ic_profile_my_posts,
                route = Routes.PROFILE_MY_POSTS
            ),
            ProfileShortcut(
                title = "帖子收藏",
                iconRes = R.drawable.ic_profile_post_bookmark,
                route = null
            ),
            ProfileShortcut(
                title = "消息中心",
                iconRes = R.drawable.ic_profile_message_center,
                route = Routes.PROFILE_MESSAGES
            )
        )
    }
    val generalFunctions = remember {
        listOf(
            ProfileShortcut(
                title = "通用设置",
                iconRes = R.drawable.ic_profile_settings,
                route = Routes.PROFILE_SETTINGS
            ),
            ProfileShortcut(
                title = "联系我们",
                iconRes = R.drawable.ic_profile_contact,
                route = null
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFEBEBEB))
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 120.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                HeaderWithDeliverySection(
                    user = user,
                    onVerifyClick = { handleAction(null, "实名认证") },
                    onProfileDetailClick = { handleAction(null, "个人资料") },
                    deliveryShortcuts = deliveryShortcuts,
                    deliveryStats = deliveryStats,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) }
                )
            }
            item {
                MyCommunityCard(
                    shortcuts = communityShortcuts,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
            }
            item {
                GeneralFunctionsCard(
                    shortcuts = generalFunctions,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) },
                    modifier = Modifier
                        .padding(horizontal = 12.dp)
                        .padding(bottom = 12.dp)
                )
            }
        }
    }
}

@Composable
private fun HeaderWithDeliverySection(
    user: User?,
    onVerifyClick: () -> Unit,
    onProfileDetailClick: () -> Unit,
    deliveryShortcuts: List<ProfileShortcut>,
    deliveryStats: List<ProfileStat>,
    onShortcutClick: (ProfileShortcut) -> Unit,
    modifier: Modifier = Modifier
) {
    val headerHeight = 156.dp
    val cardOffset = 108.dp
    val containerHeight = cardOffset + 184.dp

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(containerHeight)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(headerHeight)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF00ACC3), Color(0xFFEBEBEB))
                    )
                )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 40.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    ProfileAvatar(user = user, size = 48.dp)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = user?.name?.takeIf { it.isNotBlank() } ?: "星链候选人",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF000000)
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.clickable(onClick = onVerifyClick)
                        ) {
                            Text(
                                text = "实名认证",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontSize = 12.sp,
                                    color = Color(0xFF000000).copy(alpha = 0.5f)
                                )
                            )
                            Image(
                                painter = painterResource(id = R.drawable.ic_profile_chevron_small),
                                contentDescription = "实名认证",
                                modifier = Modifier.size(width = 5.dp, height = 9.dp),
                                colorFilter = ColorFilter.tint(Color(0x80000000))
                            )
                        }
                    }
                }
                Image(
                    painter = painterResource(id = R.drawable.ic_profile_chevron_large),
                    contentDescription = "个人资料",
                    modifier = Modifier
                        .size(width = 9.dp, height = 16.dp)
                        .clickable(onClick = onProfileDetailClick),
                    colorFilter = ColorFilter.tint(Color(0x99000000))
                )
            }
        }

        MyDeliveryCard(
            shortcuts = deliveryShortcuts,
            stats = deliveryStats,
            onShortcutClick = onShortcutClick,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(horizontal = 12.dp)
                .offset(y = cardOffset)
        )
    }
}

@Composable
private fun MyDeliveryCard(
    shortcuts: List<ProfileShortcut>,
    stats: List<ProfileStat>,
    onShortcutClick: (ProfileShortcut) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "我的投递",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF242525)
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(42.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) }
                    )
                }
            }
            HorizontalDivider(
                color = Color(0xFFE6E7EB),
                thickness = 0.5.dp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(42.dp)
            ) {
                stats.forEach { stat ->
                    ProfileStatItem(stat = stat)
                }
            }
        }
    }
}

@Composable
private fun MyCommunityCard(
    shortcuts: List<ProfileShortcut>,
    onShortcutClick: (ProfileShortcut) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "我的社区",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF242525)
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(42.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) }
                    )
                }
            }
        }
    }
}

@Composable
private fun GeneralFunctionsCard(
    shortcuts: List<ProfileShortcut>,
    onShortcutClick: (ProfileShortcut) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "通用功能",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF242525)
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(42.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileShortcutItem(
    shortcut: ProfileShortcut,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(48.dp)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Image(
            painter = painterResource(id = shortcut.iconRes),
            contentDescription = shortcut.title,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = shortcut.title,
            style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Light,
                color = Color(0xFF242525)
            ),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ProfileStatItem(
    stat: ProfileStat,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.width(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = stat.value,
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 24.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF000000)
            )
        )
        Text(
            text = stat.label,
            style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Light,
                color = Color(0xFF242525).copy(alpha = 0.7f)
            ),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ProfileAvatar(
    user: User?,
    modifier: Modifier = Modifier,
    size: Dp = 48.dp
) {
    val context = LocalContext.current
    val avatarUrl = user?.avatar
    if (!avatarUrl.isNullOrBlank()) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(avatarUrl)
                .crossfade(true)
                .build(),
            contentDescription = "用户头像",
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.3f),
                    shape = CircleShape
                )
        )
    } else {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFF60A5FA), Color(0xFF818CF8))
                    )
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.3f),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = user?.name?.firstOrNull()?.uppercaseChar()?.toString() ?: "星",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}

private data class ProfileShortcut(
    val title: String,
    @DrawableRes val iconRes: Int,
    val route: String?
)

private data class ProfileStat(
    val label: String,
    val value: String
)
