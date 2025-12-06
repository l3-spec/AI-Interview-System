package com.xlwl.AiMian

import android.os.Build
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.navigation.AppNavHost
import com.xlwl.AiMian.navigation.Routes

// 橙色主色调
val OrangeAccent = Color(0xFFFF8C42)

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
        currentRoute == Routes.AI ||
        currentRoute == Routes.DIGITAL_INTERVIEW ||
        currentRoute == Routes.INTERVIEW_COMPLETE ||
        currentRoute == Routes.EDIT_INTENTION ||
        currentRoute.startsWith(Routes.JOB_DETAIL) ||
        (currentRoute == Routes.PROFILE && token.isNullOrEmpty())

    val aiSelected = isAiRoute(currentRoute)
    val selectedTabIndex = routeToTabIndex(currentRoute, aiSelected)

    Scaffold(containerColor = Color.Transparent) { innerPadding ->
        val density = LocalDensity.current
        val bottomInsetPx = WindowInsets.navigationBars.getBottom(density)
        val bottomInset = with(density) { bottomInsetPx.toDp() }
        val bottomPadding = (bottomInset - 15.dp).coerceAtLeast(0.dp)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = if (hideBottomBar) 0.dp else bottomPadding)
            ) {
                AppNavHost(navController = navController)
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = !hideBottomBar,
                enter = androidx.compose.animation.fadeIn(),
                exit = androidx.compose.animation.fadeOut()
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
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
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = bottomPadding)
                    )

                    FloatingActionButton(
                        onClick = { navController.navigate(Routes.AI) { launchSingleTop = true } },
                        containerColor = Color.Transparent,
                        shape = CircleShape,
                        elevation = FloatingActionButtonDefaults.elevation(
                            defaultElevation = 0.dp,
                            pressedElevation = 0.dp,
                            focusedElevation = 0.dp,
                            hoveredElevation = 0.dp
                        ),
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .offset(y = -(bottomInset + 32.dp))
                            .size(72.dp)
                            .shadow(if (aiSelected) 12.dp else 8.dp, CircleShape, clip = false)
                            .zIndex(10f)
                    ) {
                        AIInterviewFab(selected = aiSelected)
                    }
                }
            }
        }
    }
}

@Composable
private fun AIInterviewFab(selected: Boolean) {
    val backgroundBrush = if (selected) {
        Brush.linearGradient(
            colors = listOf(
                Color(0xFFFF9A3C),
                Color(0xFFFF7A1C)
            )
        )
    } else {
        Brush.linearGradient(
            colors = listOf(
                Color(0xFFFFFFFF),
                Color(0xFFFFF2E6)
            )
        )
    }
    val textColor = if (selected) Color.White else Color(0xFFEC7C38)
    val boxModifier = Modifier
        .size(72.dp)
        .clip(CircleShape)
        .background(
            brush = backgroundBrush,
            shape = CircleShape
        )
        .let { base ->
            if (selected) base else base.border(1.dp, Color(0x33EC7C38), CircleShape)
        }

    Box(
        modifier = boxModifier,
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "AI面",
            style = MaterialTheme.typography.labelLarge.copy(
                color = textColor,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
                fontSize = 15.sp
            )
        )
    }
}

@Composable
private fun FrostedGlassBottomBar(
    selectedIndex: Int,
    onSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val navItems = listOf(
        BottomNavigationItemData("首页", R.drawable.ic_tab_home_filled, R.drawable.ic_tab_home_outline),
        BottomNavigationItemData("职岗", R.drawable.ic_tab_jobs_filled, R.drawable.ic_tab_jobs_outline),
        BottomNavigationItemData("职圈", R.drawable.ic_tab_circle_filled, R.drawable.ic_tab_circle_outline),
        BottomNavigationItemData("我的", R.drawable.ic_tab_profile_filled, R.drawable.ic_tab_profile_outline)
    )

    // 参照截图2：深色半透明底栏，有圆角，无缺口（简洁设计），左右下有间距
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
    ) {
        // 底栏背景（简洁圆角矩形，无缺口）
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(86.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF3C3C3C).copy(alpha = 0.7f),
                            Color(0xFF2F2F2F).copy(alpha = 0.7f)
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(24.dp)
                )
                .then(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        Modifier.graphicsLayer {
                            renderEffect = BlurEffect(15f, 15f)  // 轻微模糊
                            this.clip = true
                        }
                    } else Modifier
                )
        )
        
        // 导航按钮
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(86.dp)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧两个按钮
            BottomItem(
                item = navItems[0],
                selected = selectedIndex == 0,
                onClick = { onSelected(0) }
            )
            BottomItem(
                item = navItems[1],
                selected = selectedIndex == 1,
                onClick = { onSelected(1) }
            )

            // 中间留空（AI面按钮位置）
            Spacer(Modifier.width(68.dp))

            // 右侧两个按钮
            BottomItem(
                item = navItems[2],
                selected = selectedIndex == 2,
                onClick = { onSelected(2) }
            )
            BottomItem(
                item = navItems[3],
                selected = selectedIndex == 3,
                onClick = { onSelected(3) }
            )
        }
    }
}

@Composable
private fun BottomItem(
    item: BottomNavigationItemData,
    selected: Boolean,
    onClick: () -> Unit
) {
    val iconRes = if (selected) item.selectedIconRes else item.unselectedIconRes
    val labelColor = if (selected) Color(0xFFEC7C38) else Color(0xFFB5B7B8)
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp, horizontal = 8.dp)
    ) {
        Image(
            painter = painterResource(id = iconRes),
            contentDescription = item.label,
            modifier = Modifier.size(24.dp)
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = item.label,
            color = labelColor,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}

// 已去掉缺口，使用简单的RoundedCornerShape

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
