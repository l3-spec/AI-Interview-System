package com.xlwl.AiMian

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
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

@SuppressLint("CustomSplashScreen")
class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SplashScreen(
                onPhoneLoginClick = {
                    // TODO: 跳转到手机号登录页
                },
                onCodeLoginClick = {
                    // TODO: 跳转到验证码登录页
                },
                onLoginSuccess = { token, userJson ->
                    navigateToMain()
                }
            )
        }
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
    onPhoneLoginClick: () -> Unit,
    onCodeLoginClick: () -> Unit,
    onLoginSuccess: (token: String, userJson: String) -> Unit
) {
    var startAnimation by remember { mutableStateOf(false) }
    var agreed by remember { mutableStateOf(true) }

    val alphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "splash_alpha"
    )

    LaunchedEffect(Unit) {
        startAnimation = true
    }

    // 渐变背景：顶部青色 → 底部浅蓝白
    val gradientBrush = Brush.verticalGradient(
        colorStops = arrayOf(
            0f to Color(0xFF00ADC1),
            0.3165f to Color(0xFF00ADC1),
            1f to Color(0xFFE3F4FB)
        )
    )

    val context = androidx.compose.ui.platform.LocalContext.current
    val imageLoader = remember(context) {
        coil.ImageLoader.Builder(context)
            .components {
                add(coil.decode.SvgDecoder.Factory())
            }
            .build()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = gradientBrush)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(120.dp))

            // ===== Logo 图标 =====
            coil.compose.AsyncImage(
                model = R.raw.ic_splash_logo_new,
                imageLoader = imageLoader,
                contentDescription = "STARLINK FUTURE Logo",
                modifier = Modifier
                    .size(195.dp, 143.dp)
                    .alpha(alphaAnim),
                contentScale = androidx.compose.ui.layout.ContentScale.Fit
            )

            Spacer(modifier = Modifier.weight(1f))

            // ===== 主按钮：授权手机号登陆 =====
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .background(Color(0xFFEC7C38), shape = RoundedCornerShape(26.dp))
                    .clickable(enabled = agreed) { onPhoneLoginClick() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "授权手机号登陆",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // ===== 次按钮：验证码登陆（透明底白边框）=====
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .background(Color.Transparent, shape = RoundedCornerShape(26.dp))
                    .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(26.dp))
                    .clickable { onCodeLoginClick() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "验证码登陆",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ===== 协议勾选框 =====
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = agreed,
                    onCheckedChange = { agreed = it },
                    colors = CheckboxDefaults.colors(
                        checkedColor = Color(0xFFEC7C38),
                        uncheckedColor = Color(0xFFB5B7B8)
                    )
                )
                Text(
                    text = buildAnnotatedString {
                        append("我已阅读并同意")
                        withStyle(SpanStyle(color = Color(0xFF00ADC1))) {
                            append("《用户须知》")
                        }
                        append("和")
                        withStyle(SpanStyle(color = Color(0xFF00ADC1))) {
                            append("《隐私条款》")
                        }
                    },
                    color = Color(0xFFB5B7B8),
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
