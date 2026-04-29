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
    // 🎨 UI 交付 - Light Theme
    val starLinkOrange = Color(0xFFFF6B00)
    val starLinkBlue = Color(0xFFE2F5FF)
    val textPrimary = Color(0xFF000000)
    val textSecondary = Color(0xFF666666)
    val borderGray = Color(0xFFCCCCCC)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // ── 顶部占位 ──
            Spacer(modifier = Modifier.height(60.dp))

            // ── 核心插画区域 ──
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 24.dp)
            ) {
                // 插画组合
                Box(
                    modifier = Modifier
                        .size(width = 280.dp, height = 200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // 背景浅蓝柔色块
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val path = Path().apply {
                            moveTo(size.width * 0.2f, size.height * 0.5f)
                            quadraticTo(size.width * 0.1f, size.height * 0.2f, size.width * 0.5f, size.height * 0.15f)
                            quadraticTo(size.width * 0.9f, size.height * 0.25f, size.width * 0.85f, size.height * 0.7f)
                            quadraticTo(size.width * 0.7f, size.height * 0.95f, size.width * 0.3f, size.height * 0.85f)
                            close()
                        }
                        drawPath(path, color = starLinkBlue.copy(alpha = 0.6f))
                    }

                    // 笔记本电脑主体 (容器)
                    Column(
                        modifier = Modifier
                            .offset(y = 10.dp)
                            .size(160.dp, 110.dp)
                            .background(Color(0xFF00A2C1), RoundedCornerShape(8.dp))
                            .padding(4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = Color.White,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                // 橙色对勾圆
                                Surface(
                                    modifier = Modifier.size(40.dp),
                                    color = starLinkOrange,
                                    shape = CircleShape
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Check,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.padding(8.dp)
                                    )
                                }
                            }
                        }
                    }
                    
                    // 拟人化小人 (简化为高级几何组合)
                    Box(
                        modifier = Modifier
                            .offset(x = 64.dp, y = (20).dp)
                            .size(36.dp, 90.dp)
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            // 身体
                            drawRoundRect(
                                color = Color(0xFF00A2C1),
                                topLeft = Offset(8.dp.toPx(), 24.dp.toPx()),
                                size = androidx.compose.ui.geometry.Size(20.dp.toPx(), 60.dp.toPx()),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
                            )
                            // 头部
                            drawCircle(
                                color = Color(0xFF00A2C1),
                                radius = 9.dp.toPx(),
                                center = Offset(18.dp.toPx(), 10.dp.toPx())
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(48.dp))

                // ── 标题 ──
                Text(
                    text = "恭喜完成面试！",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = textPrimary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // ── 文字内容 ──
                Text(
                    text = buildAnnotatedString {
                        append("评估完成后，详细的面试报告将会出现在\n【我的】频道的【")
                        withStyle(
                            androidx.compose.ui.text.SpanStyle(
                                color = starLinkOrange,
                                fontWeight = FontWeight.SemiBold
                            )
                        ) {
                            append("简历报告")
                        }
                        append("】中")
                    },
                    fontSize = 14.sp,
                    color = textSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )
            }

            // ── 底部交互 ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                OutlinedButton(
                    onClick = onNavigateHome,
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, borderGray),
                    modifier = Modifier
                        .width(120.dp)
                        .height(44.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = textPrimary)
                ) {
                    Text(
                        text = "返回主页",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}
