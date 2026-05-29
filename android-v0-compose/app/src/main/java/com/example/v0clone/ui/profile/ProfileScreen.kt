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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import com.example.v0clone.data.api.AuthApi
import com.example.v0clone.data.api.RetrofitClient
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.navigation.Routes
import com.xlwl.AiMian.ui.auth.LoginFlowScreen
import com.google.gson.Gson
import com.xlwl.AiMian.data.repository.UserRepository
import com.xlwl.AiMian.data.repository.OssRepository
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.ui.components.BannerCarousel
import com.xlwl.AiMian.ui.components.BannerData
import kotlinx.coroutines.launch
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Icon
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.ui.components.DataStatItem
import com.xlwl.AiMian.ui.components.GlassCard
import com.xlwl.AiMian.ui.theme.*

private val ProfilePageGradient = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF00ADC1), // 品牌蓝
        Color(0xFF00A3B5), // 深一度
        Color(0xFFF0F4F7), // 背景过渡
        Color(0xFFF7F9FC)
    )
)

@Composable
fun ProfileScreen(
    navController: NavController,
    userRepository: UserRepository,
    authRepository: AuthRepository,
    ossRepository: OssRepository,
    contentRepository: ContentRepository,
    authManager: AuthManager,
    agreed: Boolean = false,
    onAgreedChange: (Boolean) -> Unit = {},
    onBannerClick: (BannerData) -> Unit = {}
) {
    val viewModel: ProfileViewModel = viewModel(factory = ProfileViewModel.provideFactory(
        userRepository,
        authRepository,
        ossRepository,
        contentRepository,
        authManager
    ))
    val uiState by viewModel.uiState.collectAsState()
    val token by authManager.tokenFlow.collectAsState(initial = null)
    val user = uiState.user
    val scope = rememberCoroutineScope()
    val loginClient = remember {
        RetrofitClient.createOkHttpClient(
            tokenProvider = { null }
        )
    }
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
            onGoRegister = { navController.navigate(Routes.REGISTER) },
            agreed = agreed,
            onAgreedChange = onAgreedChange
        )
    } else {
        LoggedInProfileContent(
            uiState = uiState,
            onNavigate = { route ->
                navController.navigate(route) {
                    launchSingleTop = true
                }
            },
            onBannerClick = onBannerClick
        )
    }
}

@Composable
private fun LoggedInProfileContent(
    uiState: ProfileUiState,
    onNavigate: (String) -> Unit,
    onBannerClick: (BannerData) -> Unit
) {
    val user = uiState.user
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
    val handleStat = remember(onNavigate, showComingSoon) {
        { stat: ProfileStat ->
            if (stat.route != null) {
                onNavigate(stat.route)
            } else {
                showComingSoon(stat.label)
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
                route = Routes.PROFILE_JOB_FAVORITES
            )
        )
    }
    val deliveryStats = remember {
        listOf(
            ProfileStat(label = "已投递", value = "0", route = "${Routes.PROFILE_DELIVERIES}/submitted"),
            ProfileStat(label = "被查看", value = "0", route = "${Routes.PROFILE_DELIVERIES}/viewed"),
            ProfileStat(label = "通过初筛", value = "0", route = "${Routes.PROFILE_DELIVERIES}/passed"),
            ProfileStat(label = "不合适", value = "0", route = "${Routes.PROFILE_DELIVERIES}/rejected")
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
                route = Routes.PROFILE_POST_FAVORITES
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
                title = "个人资料",
                iconRes = R.drawable.ic_profile_settings,
                route = Routes.PROFILE_PERSONAL_INFO
            ),
            ProfileShortcut(
                title = "隐私权限",
                iconRes = R.drawable.ic_profile_settings,
                route = Routes.PROFILE_PRIVACY
            ),
            ProfileShortcut(
                title = "联系我们",
                iconRes = R.drawable.ic_profile_contact,
                route = Routes.PROFILE_CONTACT
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ProfilePageGradient)
    ) {
        val navPadding = WindowInsets.navigationBars.asPaddingValues()
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = navPadding.calculateBottomPadding() + 80.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp) // 增加间距避免拥挤
        ) {
            item {
                ProfileHeader(
                    user = user,
                    onVerifyClick = { 
                        if (user?.isVerified == true) {
                            Toast.makeText(context, "您已完成实名认证", Toast.LENGTH_SHORT).show()
                        } else {
                            handleAction(Routes.PROFILE_VERIFICATION, "实名认证")
                        }
                    },
                    onProfileDetailClick = { handleAction(Routes.PROFILE_PERSONAL_INFO, "个人资料") }
                )
            }

            item {
                MyDeliveryCard(
                    shortcuts = deliveryShortcuts,
                    stats = deliveryStats,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) },
                    onStatClick = handleStat,
                    modifier = Modifier
                        .padding(horizontal = 12.dp)
                        .offset(y = (-40).dp) // 向上偏移与 Header 融合
                )
            }

            if (uiState.banners.isNotEmpty()) {
                item(key = "banner-carousel") {
                    BannerCarousel(
                        banners = uiState.banners,
                        currentIndex = uiState.currentBannerIndex,
                        onBannerClick = onBannerClick,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp)
                            .offset(y = (-30).dp)
                    )
                }
            }

            item {
                MyCommunityCard(
                    shortcuts = communityShortcuts,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) },
                    modifier = Modifier
                        .padding(horizontal = 12.dp)
                        .offset(y = (-20).dp)
                )
            }
            item {
                GeneralFunctionsCard(
                    shortcuts = generalFunctions,
                    onShortcutClick = { shortcut -> handleAction(shortcut.route, shortcut.title) },
                    modifier = Modifier
                        .padding(horizontal = 12.dp)
                        .padding(bottom = 12.dp)
                        .offset(y = (-10).dp)
                )
            }
        }
    }
}

@Composable
private fun ProfileHeader(
    user: User?,
    onVerifyClick: () -> Unit,
    onProfileDetailClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 24.dp, vertical = 20.dp)
            .padding(bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ProfileAvatar(
                    user = user,
                    size = 64.dp,
                    modifier = Modifier.clickable(onClick = onProfileDetailClick)
                ) // 更大的头像，点击可跳转个人资料
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = user?.name?.takeIf { it.isNotBlank() } ?: "星链候选人",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White // 适配深色背景
                            )
                        )
                        
                        if (user?.isVerified == true) {
                            androidx.compose.material3.Surface(
                                modifier = Modifier.height(20.dp),
                                color = Color.White.copy(alpha = 0.2f),
                                shape = CircleShape,
                                border = androidx.compose.foundation.BorderStroke(
                                    width = 1.dp,
                                    color = Color.White.copy(alpha = 0.5f)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Verified,
                                        contentDescription = null,
                                        modifier = Modifier.size(12.dp),
                                        tint = Color(0xFFFF9A3C)
                                    )
                                    Text(
                                        text = "已认证",
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }
                    Text(
                        text = user?.signature?.takeIf { it.isNotBlank() } ?: "让面试更智能，让未来更清晰",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 13.sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(Color.White.copy(alpha = 0.2f), CircleShape)
                    .clickable(onClick = onProfileDetailClick),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_profile_chevron_large),
                    contentDescription = "编辑",
                    modifier = Modifier.size(16.dp),
                    tint = Color.White
                )
            }
        }
        
        if (user?.isVerified != true) {
            Button(
                onClick = onVerifyClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White.copy(alpha = 0.15f),
                    contentColor = Color.White
                ),
                shape = CircleShape,
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))
            ) {
                Text("完成实名认证，解锁 AI 面试功能", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun MyDeliveryCard(
    shortcuts: List<ProfileShortcut>,
    stats: List<ProfileStat>,
    onShortcutClick: (ProfileShortcut) -> Unit,
    onStatClick: (ProfileStat) -> Unit,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "我的投递",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            
            // 统计数据行：使用新的 DataStatItem
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                stats.forEach { stat ->
                    DataStatItem(
                        label = stat.label,
                        value = stat.value,
                        onClick = { onStatClick(stat) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // 移除分割线，改用间距，更显通透
            Spacer(modifier = Modifier.height(4.dp))

            // 图标捷径行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) },
                        isFilled = true,
                        iconColor = PrimaryOrange,
                        modifier = Modifier.weight(1f)
                    )
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
    GlassCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "我的社区",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) },
                        modifier = Modifier.weight(1f)
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
    GlassCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "通用功能",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            // "通用功能"图标行：使用轮廓样式图标
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                shortcuts.forEach { shortcut ->
                    ProfileShortcutItem(
                        shortcut = shortcut,
                        onClick = { onShortcutClick(shortcut) },
                        isFilled = false, // 轮廓样式
                        iconColor = TextPrimary, // 深灰色
                        modifier = Modifier.weight(1f)
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
    modifier: Modifier = Modifier,
    isFilled: Boolean = false,
    iconColor: Color = Color(0xFF242525)
) {
    Column(
        modifier = modifier
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp) // 增加图标与文字间距
    ) {
        Image(
            painter = painterResource(id = shortcut.iconRes),
            contentDescription = shortcut.title,
            modifier = Modifier.size(28.dp), // 增大图标
            colorFilter = if (!isFilled) {
                ColorFilter.tint(iconColor)
            } else {
                null
            }
        )
        Text(
            text = shortcut.title,
            style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp, // 增大字体
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            ),
            textAlign = TextAlign.Center,
            maxLines = 1 // 强制单行
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
    val value: String,
    val route: String? = null
)
