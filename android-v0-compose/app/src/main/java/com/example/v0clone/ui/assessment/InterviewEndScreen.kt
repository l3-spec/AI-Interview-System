package com.xlwl.AiMian.ui.assessment

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    val primaryText = Color(0xFF1E1E1E)
    val secondaryText = Color(0xFF4A4A4A)
    val accentTeal = Color(0xFF0DB3C9)
    val accentOrange = Color(0xFFFFA247)
    val highlightOrange = Color(0xFFF57C00)
    val borderGray = Color(0xFFB8BDC5)
    val countdown = remember { mutableIntStateOf(3) }

    LaunchedEffect(countdown.intValue) {
        if (countdown.intValue > 0) {
            delay(1000)
            countdown.intValue -= 1
        } else {
            onNavigateHome()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        IconButton(
            onClick = onNavigateHome,
            modifier = Modifier.align(Alignment.TopStart)
        ) {
            Icon(imageVector = Icons.Filled.ArrowBack, contentDescription = "返回")
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 32.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = true),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Illustration(accentTeal = accentTeal, accentOrange = accentOrange)

                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = "恭喜完成面试！",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = primaryText,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = buildAnnotatedString {
                        append("评估完成后，详细的面试报告将会出现在\n【我的】频道的【")
                        withStyle(
                            androidx.compose.ui.text.SpanStyle(
                                color = highlightOrange,
                                fontWeight = FontWeight.Medium
                            )
                        ) {
                            append("简历报告")
                        }
                        append("】中")
                    },
                    fontSize = 14.sp,
                    color = secondaryText,
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = onNavigateHome,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = primaryText
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .border(
                            width = 1.dp,
                            color = borderGray,
                            shape = RoundedCornerShape(10.dp)
                        )
                ) {
                    Text(
                        text = "返回主页",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "${countdown.intValue}s",
                    color = Color(0xFF8A8A8A),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Normal
                )
            }
        }
    }
}

/**
 * 面试结束页面插图
 * 包含：笔记本电脑屏幕（显示橙色圆圈和白色对勾）、右侧人物、底部波浪和植物元素
 */
@Composable
private fun Illustration(
    accentTeal: Color,
    accentOrange: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp),
        contentAlignment = Alignment.Center
    ) {
        // 背景波浪形状
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // 底部波浪形状
            val wavePath = Path().apply {
                moveTo(0f, height * 0.75f)
                // 第一个波浪
                quadraticBezierTo(width * 0.15f, height * 0.65f, width * 0.3f, height * 0.7f)
                quadraticBezierTo(width * 0.45f, height * 0.75f, width * 0.6f, height * 0.7f)
                quadraticBezierTo(width * 0.75f, height * 0.65f, width * 0.9f, height * 0.7f)
                quadraticBezierTo(width * 0.95f, height * 0.72f, width, height * 0.7f)
                lineTo(width, height)
                lineTo(0f, height)
                close()
            }
            drawPath(wavePath, color = accentTeal.copy(alpha = 0.2f))

            // 植物元素（简化为小圆形）
            drawCircle(
                color = accentOrange.copy(alpha = 0.3f),
                radius = 8.dp.toPx(),
                center = Offset(width * 0.25f, height * 0.85f)
            )
            drawCircle(
                color = accentOrange.copy(alpha = 0.25f),
                radius = 6.dp.toPx(),
                center = Offset(width * 0.35f, height * 0.88f)
            )
            drawCircle(
                color = accentOrange.copy(alpha = 0.3f),
                radius = 7.dp.toPx(),
                center = Offset(width * 0.7f, height * 0.86f)
            )
        }

        // 主要内容区域
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧：笔记本电脑屏幕
            Box(
                modifier = Modifier
                    .width(180.dp)
                    .height(140.dp)
                    .padding(end = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                // 笔记本电脑屏幕背景
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                listOf(
                                    accentTeal.copy(alpha = 0.25f),
                                    accentTeal.copy(alpha = 0.15f)
                                )
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = 2.dp,
                            color = accentTeal.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    // 橙色圆圈和白色对勾
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .background(accentOrange, shape = CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = "完成",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }
            }

            // 右侧：人物形象（简化为圆形头像和身体）
            Column(
                modifier = Modifier
                    .width(100.dp)
                    .height(180.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // 头部
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    accentTeal.copy(alpha = 0.4f),
                                    accentTeal.copy(alpha = 0.2f)
                                )
                            ),
                            shape = CircleShape
                        )
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // 身体（简化为矩形）
                Box(
                    modifier = Modifier
                        .width(60.dp)
                        .height(80.dp)
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    accentTeal.copy(alpha = 0.3f),
                                    accentTeal.copy(alpha = 0.2f)
                                )
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                )
            }
        }
    }
}
