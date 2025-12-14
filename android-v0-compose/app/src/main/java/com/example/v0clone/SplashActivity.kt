package com.xlwl.AiMian

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import com.xlwl.AiMian.R

/**
 * 启动页 Activity
 * 显示应用图标并添加渐变动画效果
 */
@SuppressLint("CustomSplashScreen")
class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            SplashScreen {
                // 延迟后跳转到主页面
                navigateToMain()
            }
        }
    }
    
    /**
     * 跳转到主页面
     */
    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish() // 关闭启动页，防止返回
        // 添加淡入淡出的过渡动画
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }
}

/**
 * 启动页 Compose UI
 * 根据Figma设计实现：渐变背景、居中Logo、底部文字
 * Figma设计规范：
 * - 背景渐变：从 #00ACC3 到 #EBEBEB，从 31.65% 位置开始过渡
 * - Logo尺寸：80x50px（在375px宽度屏幕上）
 * - Logo位置：垂直居中偏上
 * - 底部文字："星链未来 成就职业梦想"，橙色 #EC7C38，20sp，PingFang SC Semibold
 * @param onSplashFinished 启动页完成回调
 */
@Composable
fun SplashScreen(onSplashFinished: () -> Unit) {
    var startAnimation by remember { mutableStateOf(false) }
    val alphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "logo_alpha"
    )

    LaunchedEffect(Unit) {
        startAnimation = true
        delay(2000)
        onSplashFinished()
    }

    // 根据Figma设计：渐变从31.65%位置开始过渡
    // 使用 colorStops 精确控制渐变位置
    val gradient = remember {
        Brush.verticalGradient(
            colorStops = arrayOf(
                0f to Color(0xFF00ACC3),   // 顶部浅蓝色
                0.3165f to Color(0xFF00ACC3), // 保持到31.65%
                1f to Color(0xFFEBEBEB)    // 底部浅灰色
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradient)
    ) {
        // Logo区域：垂直居中偏上，水平居中
        // Figma设计：Logo尺寸80x50px，padding horizontal 48px, vertical 96px
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp, vertical = 96.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo尺寸：根据Figma设计，在375px宽度屏幕上为80x50px
            // 转换为dp：80px ≈ 80dp, 50px ≈ 50dp (mdpi基准)
            Image(
                painter = painterResource(id = R.drawable.login_logo),
                contentDescription = "Starlink Future logo",
                modifier = Modifier
                    .width(80.dp)
                    .height(50.dp)
                    .alpha(alphaAnim)
            )
        }

        // 底部文字：根据Figma设计
        // 文字："星链未来 成就职业梦想"
        // 颜色：#EC7C38 (橙色)
        // 字体：PingFang SC Semibold, 20sp
        // 位置：底部居中
        Text(
            text = "星链未来 成就职业梦想",
            color = Color(0xFFEC7C38),
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 72.dp)
                .alpha(alphaAnim)
        )
    }
}
