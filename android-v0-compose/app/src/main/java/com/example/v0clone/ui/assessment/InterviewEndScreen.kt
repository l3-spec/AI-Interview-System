package com.xlwl.AiMian.ui.assessment

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/**
 * 面试结束屏幕
 * 遵循设计稿：顶部返回、插画、标题与说明、底部描边按钮与倒计时
 */
@Composable
fun InterviewEndScreen(
    onNavigateHome: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 🎨 Figma 颜色规范
    val backgroundStart = Color(0xFF0C1220) // 深蓝底色 (App 统一风格)
    val backgroundEnd = Color(0xFF05101E)   // 更深的底部
    val accentOrange = Color(0xFFF57C00)
    val starLinkWhite = Color(0xFFFFFFFF)
    val secondaryText = Color(0xFFB8BDC5)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(backgroundStart, backgroundEnd)
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ── 核心插画：发光对勾 ──
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color(0xFF4A9EFF).copy(alpha = 0.2f),
                                Color.Transparent
                            )
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape,
                    color = Color(0xFF4A9EFF),
                    shadowElevation = 8.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = "完成",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            // ── 标题 ──
            Text(
                text = "面试已完成",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = starLinkWhite,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── 说明文本 ──
            Text(
                text = buildAnnotatedString {
                    append("评估完成后，详细的面试报告将会出现在\n【我的】频道的【")
                    withStyle(
                        androidx.compose.ui.text.SpanStyle(
                            color = accentOrange,
                            fontWeight = FontWeight.SemiBold
                        )
                    ) {
                        append("简历报告")
                    }
                    append("】中")
                },
                fontSize = 15.sp,
                color = secondaryText,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.height(80.dp))

            // ── 底部操作按钮 ──
            Button(
                onClick = onNavigateHome,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFEC7C38), // 统一品牌橙
                    contentColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .padding(horizontal = 24.dp)
            ) {
                Text(
                    text = "确认",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

