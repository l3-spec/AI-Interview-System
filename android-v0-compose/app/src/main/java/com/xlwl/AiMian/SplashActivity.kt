package com.xlwl.AiMian

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.R
import com.xlwl.AiMian.config.ConfigUpdateStrategy
import com.xlwl.AiMian.data.repository.ClientRuntimeConfigRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@SuppressLint("CustomSplashScreen")
class SplashActivity : ComponentActivity() {
    
    companion object {
        private const val TAG = "SplashActivity"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.i(TAG, "🎬 SplashActivity 创建")
        
        setContent {
            SplashScreen(
                onSplashComplete = {
                    navigateToMain()
                }
            )
        }
    }
    
    override fun onResume() {
        super.onResume()
        
        // 热启动：检查配置是否需要更新
        ConfigUpdateStrategy.onResume(this)
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }
}

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    var startAnimation by remember { mutableStateOf(false) }

    // Logo 弹性缩放动画 (带来 Apple 级 Overshoot 物理弹性)
    val scaleAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.3f,
        animationSpec = spring(
            dampingRatio = 0.58f, // 适度的回弹阻尼感
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "logo_scale"
    )

    // Logo 淡入动画
    val logoAlphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 800, easing = LinearOutSlowInEasing),
        label = "logo_alpha"
    )

    // 品牌文字 Y 轴浮升动画
    val textYOffsetAnim by animateDpAsState(
        targetValue = if (startAnimation) 0.dp else 24.dp,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "text_y_offset"
    )

    // 品牌文字延迟淡入动画，体现视觉层叠美感
    val textAlphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 900, delayMillis = 150, easing = LinearOutSlowInEasing),
        label = "text_alpha"
    )

    val context = androidx.compose.ui.platform.LocalContext.current
    
    LaunchedEffect(Unit) {
        startAnimation = true
        // 热启动检查配置更新（在后台线程）
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                com.xlwl.AiMian.config.ConfigUpdateStrategy.onResume(context = context)
            } catch (e: Exception) {
                android.util.Log.e("SplashActivity", "配置更新检查失败", e)
            }
        }
        kotlinx.coroutines.delay(1800) // 给予足够动画时间后自动跳转
        onSplashComplete()
    }

    // 渐变背景：顶部青色 → 底部浅蓝白
    val gradientBrush = Brush.verticalGradient(
        colorStops = arrayOf(
            0f to Color(0xFF00ADC1),
            0.3165f to Color(0xFF00ADC1),
            1f to Color(0xFFE3F4FB)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = gradientBrush)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // ===== Logo 品牌组合 (图标 + 副标题) =====
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(bottom = 40.dp)
            ) {
                // 显著放大后的 U 图标，带阻尼弹性缩放和淡入
                Image(
                    painter = painterResource(id = R.drawable.splash_icon),
                    contentDescription = "U-Talent Logo",
                    modifier = Modifier
                        .size(120.dp)
                        .graphicsLayer(
                            scaleX = scaleAnim,
                            scaleY = scaleAnim,
                            alpha = logoAlphaAnim
                        ),
                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                )
                
                Spacer(modifier = Modifier.height(18.dp))
                
                // 柚汀教育科技 中文部分，带有延时浮现与微位移动画
                Text(
                    text = "柚 汀 教 育 科 技",
                    color = Color.White.copy(alpha = 0.88f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 4.sp,
                    modifier = Modifier
                        .graphicsLayer(
                            alpha = textAlphaAnim,
                            translationY = with(LocalDensity.current) { textYOffsetAnim.toPx() }
                        )
                )
            }
        }
    }
}
