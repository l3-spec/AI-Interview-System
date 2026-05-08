package com.xlwl.AiMian

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import android.app.Activity
import android.os.Build
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.navigation.AppNavHost
import com.xlwl.AiMian.navigation.Routes
import com.xlwl.AiMian.ui.design.StarLinkAccentOrange
import com.xlwl.AiMian.ui.design.StarLinkPlaceholderGray
import com.xlwl.AiMian.ui.design.StarLinkWhite

private val BottomBarShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)

data class BottomNavigationItemData(
    val label: String,
    @DrawableRes val selectedIconRes: Int,
    @DrawableRes val unselectedIconRes: Int
)

@Composable
fun V0App() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: ""
    val context = LocalContext.current
    val authManager = remember { AuthManager(context) }
    val token by authManager.tokenFlow.collectAsState(initial = null)
    val hideBottomBar = currentRoute.startsWith(Routes.GUIDE) ||
        currentRoute == Routes.LOGIN ||
        currentRoute == Routes.CREATE_POST ||
        currentRoute == Routes.REGISTER ||
        currentRoute.startsWith("content") ||
        currentRoute.startsWith("${Routes.CIRCLE}/") ||
        currentRoute == Routes.AI ||
        currentRoute.startsWith(Routes.DIGITAL_INTERVIEW) ||
        currentRoute == Routes.INTERVIEW_COMPLETE ||
        currentRoute == Routes.EDIT_INTENTION ||
        currentRoute.startsWith(Routes.JOB_DETAIL) ||
        (currentRoute == Routes.PROFILE && token.isNullOrEmpty())

    val aiSelected = isAiRoute(currentRoute)
    val selectedTabIndex = routeToTabIndex(currentRoute, aiSelected)

    // ── 系统状态栏颜色管理 ──
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (context as? Activity)?.window
            if (window != null) {
                val insetsController = WindowCompat.getInsetsController(window, view)
                
                // 需要蓝色渐变背景（白色图标）的路由
                val needsBlueStatus = when {
                    currentRoute == Routes.HOME -> true
                    currentRoute == Routes.JOBS -> true
                    currentRoute == Routes.AI -> true
                    currentRoute == Routes.CIRCLE -> true
                    currentRoute == Routes.PROFILE -> true
                    currentRoute == Routes.LOGIN -> true
                    currentRoute == Routes.REGISTER -> true
                    currentRoute == Routes.JOB_SELECTION -> true
                    currentRoute == Routes.EDIT_INTENTION -> true
                    currentRoute == Routes.PROFILE_RESUME_REPORT -> true
                    currentRoute == Routes.PROFILE_ASSESSMENTS -> true
                    currentRoute.startsWith("content/") -> true
                    currentRoute.startsWith("circle/") -> true
                    else -> false
                }
                
                // Log.d("StatusBar", "Current route: $currentRoute, Needs blue: $needsBlueStatus")
                
                if (needsBlueStatus) {
                    // 开启全屏显示时，状态栏应设为透明，让页面的渐变背景显示出来
                    window.statusBarColor = android.graphics.Color.TRANSPARENT
                    insetsController.isAppearanceLightStatusBars = false // 白色图标
                } else {
                    // 其他页面（如详情页、设置页）默认使用白底黑字
                    window.statusBarColor = android.graphics.Color.WHITE
                    insetsController.isAppearanceLightStatusBars = true // 黑色图标
                }
            }
        }
    }

    Scaffold(containerColor = Color.Transparent) { innerPadding ->
        val density = LocalDensity.current
        val bottomInsetPx = WindowInsets.navigationBars.getBottom(density)
        val bottomInset = with(density) { bottomInsetPx.toDp() }

        Box(
            modifier = Modifier
                .fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    // Allow screens to draw bottom edge-to-edge for gesture bar blending
            ) {
                AppNavHost(navController = navController)
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
            ) {
                androidx.compose.animation.AnimatedVisibility(
                    visible = !hideBottomBar,
                    enter = androidx.compose.animation.fadeIn(),
                    exit = androidx.compose.animation.fadeOut(),
                    modifier = Modifier.align(Alignment.BottomCenter)
                ) {
                    FrostedGlassBottomBar(
                        selectedIndex = selectedTabIndex,
                        onSelected = { index ->
                            when (index) {
                                0 -> navController.navigate(Routes.HOME) { launchSingleTop = true }
                                1 -> navController.navigate(Routes.JOBS) { launchSingleTop = true }
                                2 -> navController.navigate(Routes.CIRCLE) { launchSingleTop = true }
                                3 -> navController.navigate(Routes.PROFILE) { launchSingleTop = true }
                            }
                        },
                        onAiClick = {
                            navController.navigate(Routes.AI) { launchSingleTop = true }
                        },
                        bottomInset = bottomInset
                    )
                }
            }
        }
    }
}

@Composable
private fun FrostedGlassBottomBar(
    selectedIndex: Int,
    onSelected: (Int) -> Unit,
    onAiClick: () -> Unit,
    bottomInset: androidx.compose.ui.unit.Dp,
    modifier: Modifier = Modifier
) {
    val navItems = listOf(
        BottomNavigationItemData("首页", R.drawable.ic_tab_home_filled, R.drawable.ic_tab_home_outline),
        BottomNavigationItemData("职岗", R.drawable.ic_tab_jobs_filled, R.drawable.ic_tab_jobs_outline),
        BottomNavigationItemData("职圈", R.drawable.ic_tab_circle_filled, R.drawable.ic_tab_circle_outline),
        BottomNavigationItemData("我的", R.drawable.ic_tab_profile_filled, R.drawable.ic_tab_profile_outline)
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(72.dp + bottomInset)
                .clip(BottomBarShape)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFF8F8F8).copy(alpha = 0.92f),
                            Color(0xFFFFFFFF).copy(alpha = 0.96f)
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.7f),
                    shape = BottomBarShape
                )
                .then(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        Modifier.graphicsLayer {
                            renderEffect = BlurEffect(18f, 18f)
                            clip = true
                        }
                    } else Modifier
                )
                .shadow(10.dp, BottomBarShape, clip = false)
        )

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(72.dp + bottomInset)
                .padding(bottom = bottomInset)
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            BottomItem(item = navItems[0], selected = selectedIndex == 0, onClick = { onSelected(0) })
            BottomItem(item = navItems[1], selected = selectedIndex == 1, onClick = { onSelected(1) })
            Spacer(modifier = Modifier.width(72.dp))
            BottomItem(item = navItems[2], selected = selectedIndex == 2, onClick = { onSelected(2) })
            BottomItem(item = navItems[3], selected = selectedIndex == 3, onClick = { onSelected(3) })
        }

        FloatingActionButton(
            onClick = onAiClick,
            containerColor = Color.Transparent,
            shape = CircleShape,
            elevation = FloatingActionButtonDefaults.elevation(
                defaultElevation = 0.dp,
                pressedElevation = 0.dp,
                focusedElevation = 0.dp,
                hoveredElevation = 0.dp
            ),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-20).dp)
                .size(72.dp)
                .shadow(12.dp, CircleShape, clip = false)
        ) {
            AIInterviewFab()
        }
    }
}

@Composable
private fun AIInterviewFab() {
    val brush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFFF9A3C),
            Color(0xFFFF7A1C)
        )
    )

    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(brush = brush, shape = CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "AI面",
            style = MaterialTheme.typography.labelLarge.copy(
                color = StarLinkWhite,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        )
    }
}

@Composable
private fun BottomItem(
    item: BottomNavigationItemData,
    selected: Boolean,
    onClick: () -> Unit
) {
    val iconRes = if (selected) item.selectedIconRes else item.unselectedIconRes
    val labelColor = if (selected) StarLinkAccentOrange else StarLinkPlaceholderGray

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .width(44.dp)
            .clickable(onClick = onClick)
    ) {
        Image(
            painter = painterResource(id = iconRes),
            contentDescription = item.label,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = item.label,
            style = MaterialTheme.typography.labelSmall.copy(
                color = labelColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold
            )
        )
    }
}

private fun isAiRoute(route: String): Boolean {
    if (route.isBlank()) return false
    return route == Routes.AI ||
        route.startsWith(Routes.GUIDE) ||
        route.startsWith(Routes.PREP) ||
        route.startsWith(Routes.SESSION) ||
        route == Routes.DIGITAL_INTERVIEW
}

private fun routeToTabIndex(route: String, aiSelected: Boolean): Int {
    if (aiSelected) return -1
    if (route.isBlank()) return 0
    return when {
        route == Routes.HOME || route.startsWith("content") -> 0
        route == Routes.JOBS ||
            route == Routes.EDIT_INTENTION ||
            route.startsWith("${Routes.JOB_DETAIL}/") ||
            route.startsWith("${Routes.COMPANY}/") -> 1
        route == Routes.CIRCLE ||
            route.startsWith("${Routes.CIRCLE}/") ||
            route.startsWith(Routes.CIRCLE_TOPIC) -> 2
        route == Routes.PROFILE -> 3
        else -> -1
    }
}
