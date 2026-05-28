package com.xlwl.AiMian.ui.assessment

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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

/**
 * 未完成面试友情提示屏幕
 * 遵循设计稿：顶部返回、插画、标题与说明、底部重新测试和返回主页按钮
 */
@Composable
fun InterviewUnfinishedScreen(
    onNavigateHome: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    sessionId: String? = null
) {
    // 🎨 UI 颜色系统
    val starLinkOrange = Color(0xFFFF6B00)
    val starLinkYellow = Color(0xFFFFB300)
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
            Spacer(modifier = Modifier.height(24.dp))

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

                    // 电脑主体
                    Column(
                        modifier = Modifier
                            .offset(y = 10.dp)
                            .size(160.dp, 110.dp)
                            .background(Color(0xFFFFB300), RoundedCornerShape(8.dp))
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
                                // 橙黄色感叹号圆
                                Surface(
                                    modifier = Modifier.size(44.dp),
                                    color = starLinkYellow,
                                    shape = CircleShape
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Info,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.padding(8.dp)
                                    )
                                }
                            }
                        }
                    }
                    
                    // 拟人化小人
                    Box(
                        modifier = Modifier
                            .offset(x = 64.dp, y = (20).dp)
                            .size(36.dp, 90.dp)
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            // 身体
                            drawRoundRect(
                                color = Color(0xFFFFB300),
                                topLeft = Offset(8.dp.toPx(), 24.dp.toPx()),
                                size = androidx.compose.ui.geometry.Size(20.dp.toPx(), 60.dp.toPx()),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
                            )
                            // 头部
                            drawCircle(
                                color = Color(0xFFFFB300),
                                radius = 9.dp.toPx(),
                                center = Offset(18.dp.toPx(), 10.dp.toPx())
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // ── 标题 ──
                Text(
                    text = "面试尚未完成",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = textPrimary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // ── 说明 ──
                Text(
                    text = buildAnnotatedString {
                        append("检测到您可能由于环境嘈杂、设备异常，或者是未做好准备，本次面试未能顺利完成。\n\n别担心，期待您")
                        withStyle(
                            androidx.compose.ui.text.SpanStyle(
                                color = starLinkOrange,
                                fontWeight = FontWeight.SemiBold
                            )
                        ) {
                            append("调整好状态")
                        }
                        append("后，随时重新开启测试。")
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
                // 重新测试按钮 (主要按钮)
                Button(
                    onClick = onRetry,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = starLinkOrange, contentColor = Color.White),
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
                        .height(44.dp)
                ) {
                    Text(
                        text = "重新面试",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 返回主页按钮 (描边按钮)
                OutlinedButton(
                    onClick = onNavigateHome,
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, borderGray),
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
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
