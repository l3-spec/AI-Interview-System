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
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Illustration(accentTeal = accentTeal, accentOrange = accentOrange)

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "恭喜完成面试！",
                    fontSize = 20.sp,
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

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Button(
                    onClick = onNavigateHome,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = primaryText
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .border(
                            width = 1.dp,
                            color = borderGray,
                            shape = RoundedCornerShape(10.dp)
                        )
                ) {
                    Text(text = "返回主页", fontSize = 15.sp, fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "${countdown.intValue}s",
                    color = secondaryText.copy(alpha = 0.7f),
                    fontSize = 13.sp
                )
            }
        }
    }
}

@Composable
private fun Illustration(
    accentTeal: Color,
    accentOrange: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            val blobPath = Path().apply {
                moveTo(0f, height * 0.65f)
                quadraticBezierTo(width * 0.2f, height * 0.2f, width * 0.55f, height * 0.4f)
                quadraticBezierTo(width * 0.85f, height * 0.55f, width, height * 0.28f)
                lineTo(width, height)
                lineTo(0f, height)
                close()
            }
            drawPath(blobPath, color = accentTeal.copy(alpha = 0.15f))

            drawRoundRect(
                color = accentTeal.copy(alpha = 0.22f),
                topLeft = androidx.compose.ui.geometry.Offset(width * 0.18f, height * 0.42f),
                size = androidx.compose.ui.geometry.Size(width * 0.6f, height * 0.24f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(x = 16.dp.toPx(), y = 16.dp.toPx())
            )
        }

        Box(
            modifier = Modifier
                .width(210.dp)
                .height(150.dp)
                .background(
                    brush = Brush.verticalGradient(
                        listOf(accentTeal.copy(alpha = 0.22f), accentTeal.copy(alpha = 0.12f))
                    ),
                    shape = RoundedCornerShape(16.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(74.dp)
                    .background(accentOrange, shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = "完成",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
        }
    }
}
