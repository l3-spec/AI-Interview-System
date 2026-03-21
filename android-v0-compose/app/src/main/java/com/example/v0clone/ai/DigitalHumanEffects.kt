package com.xlwl.AiMian.ai

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 数字人说话时的光环脉冲效果。
 * 在数字人面部区域渲染多层半透明辐射环，随说话节奏呼吸式缩放。
 */
@Composable
fun SpeakingAuraOverlay(
    isSpeaking: Boolean,
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF43C1C9)
) {
    AnimatedVisibility(
        visible = isSpeaking,
        enter = fadeIn(animationSpec = tween(400)),
        exit = fadeOut(animationSpec = tween(600)),
        modifier = modifier
    ) {
        val transition = rememberInfiniteTransition(label = "aura")

        val ring1 by transition.animateFloat(
            initialValue = 0.25f,
            targetValue = 0.55f,
            animationSpec = infiniteRepeatable(
                animation = tween(1200, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "ring1"
        )
        val ring2 by transition.animateFloat(
            initialValue = 0.18f,
            targetValue = 0.45f,
            animationSpec = infiniteRepeatable(
                animation = tween(1600, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "ring2"
        )
        val ring3 by transition.animateFloat(
            initialValue = 0.12f,
            targetValue = 0.35f,
            animationSpec = infiniteRepeatable(
                animation = tween(2000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "ring3"
        )

        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2f
            val cy = size.height * 0.42f
            val base = size.minDimension * 0.35f

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        color.copy(alpha = ring3 * 0.25f),
                        Color.Transparent
                    ),
                    center = Offset(cx, cy),
                    radius = base * 1.3f
                ),
                center = Offset(cx, cy),
                radius = base * 1.3f
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        color.copy(alpha = ring2 * 0.2f),
                        Color.Transparent
                    ),
                    center = Offset(cx, cy),
                    radius = base * 0.95f
                ),
                center = Offset(cx, cy),
                radius = base * 0.95f
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        color.copy(alpha = ring1 * 0.12f),
                        Color.Transparent
                    ),
                    center = Offset(cx, cy),
                    radius = base * 0.6f
                ),
                center = Offset(cx, cy),
                radius = base * 0.6f
            )
        }
    }
}

/**
 * 用户回答时的声波可视化条形图。
 * 每根竖条以不同频率和峰值动画模拟真实音频波形。
 */
@Composable
fun VoiceWaveformVisualizer(
    isActive: Boolean,
    modifier: Modifier = Modifier,
    barCount: Int = 20,
    color: Color = Color(0xFFEC7C38)
) {
    AnimatedVisibility(
        visible = isActive,
        enter = fadeIn(tween(200)),
        exit = fadeOut(tween(200)),
        modifier = modifier
    ) {
        val transition = rememberInfiniteTransition(label = "waveform")

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(28.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(barCount) { index ->
                val durationMs = 280 + (index * 47) % 420
                val peakFraction = 0.35f + (index % 5) * 0.13f

                val heightFraction by transition.animateFloat(
                    initialValue = 0.1f,
                    targetValue = peakFraction,
                    animationSpec = infiniteRepeatable(
                        animation = tween(
                            durationMillis = durationMs,
                            easing = FastOutSlowInEasing
                        ),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "bar_$index"
                )

                Box(
                    modifier = Modifier
                        .padding(horizontal = 1.dp)
                        .width(3.dp)
                        .fillMaxHeight(heightFraction)
                        .clip(RoundedCornerShape(1.5.dp))
                        .background(color.copy(alpha = 0.5f + 0.5f * heightFraction))
                )
            }
        }
    }
}

/**
 * 数字人思考中的弹跳圆点动画。
 */
@Composable
fun ThinkingDotsAnimation(
    isVisible: Boolean,
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF43C1C9),
    dotSize: Dp = 7.dp
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(tween(300)),
        exit = fadeOut(tween(200)),
        modifier = modifier
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(3) { index ->
                val transition = rememberInfiniteTransition(label = "dot_$index")
                val yOffset by transition.animateFloat(
                    initialValue = 0f,
                    targetValue = -6f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(
                            durationMillis = 450,
                            delayMillis = index * 140,
                            easing = FastOutSlowInEasing
                        ),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "dot_offset_$index"
                )

                Box(
                    modifier = Modifier
                        .size(dotSize)
                        .offset(y = yOffset.dp)
                        .background(color = color, shape = CircleShape)
                )
            }
        }
    }
}

/**
 * 环形面试进度指示器，显示当前第几题 / 总题数。
 */
@Composable
fun CircularInterviewProgress(
    current: Int,
    total: Int,
    modifier: Modifier = Modifier,
    activeColor: Color = Color(0xFFEC7C38),
    trackColor: Color = Color.White.copy(alpha = 0.2f),
    strokeWidth: Dp = 3.dp
) {
    val safeTotal = if (total > 0) total else 1
    val progress = current.toFloat() / safeTotal
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "progress"
    )

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.matchParentSize()) {
            val stroke = strokeWidth.toPx()
            val radius = (size.minDimension - stroke) / 2f

            drawCircle(
                color = trackColor,
                radius = radius,
                style = Stroke(width = stroke)
            )
            drawArc(
                color = activeColor,
                startAngle = -90f,
                sweepAngle = 360f * animatedProgress,
                useCenter = false,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
                topLeft = Offset(
                    (size.width - radius * 2) / 2f,
                    (size.height - radius * 2) / 2f
                ),
                size = Size(radius * 2, radius * 2)
            )
        }

        Text(
            text = "$current/$safeTotal",
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * 底部渐变遮罩，保证叠加在视频流上的文字清晰可读。
 */
@Composable
fun BottomGradientScrim(
    modifier: Modifier = Modifier,
    height: Dp = 240.dp
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color.Black.copy(alpha = 0.25f),
                        Color.Black.copy(alpha = 0.55f)
                    )
                )
            )
    )
}

/**
 * 面试状态指示牌，显示当前状态（发言中、聆听中、思考中、等待中、连接中）。
 */
@Composable
fun InterviewStateIndicator(
    isRecording: Boolean,
    isSpeaking: Boolean,
    isThinking: Boolean,
    isConnected: Boolean,
    modifier: Modifier = Modifier
) {
    val (label, color, showPulse) = when {
        isThinking -> Triple("思考中", Color(0xFF43C1C9), true)
        isSpeaking -> Triple("面试官发言", Color(0xFF43C1C9), true)
        isRecording -> Triple("正在聆听", Color(0xFFEC7C38), true)
        isConnected -> Triple("等待发言", Color.White.copy(alpha = 0.5f), false)
        else -> Triple("连接中", Color.Yellow, true)
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.Black.copy(alpha = 0.45f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (showPulse) {
            val transition = rememberInfiniteTransition(label = "pulse")
            val pulseAlpha by transition.animateFloat(
                initialValue = 0.4f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(800),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "pulse_alpha"
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .alpha(pulseAlpha)
                    .background(color, CircleShape)
            )
        } else {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(color, CircleShape)
            )
        }

        Text(
            text = label,
            color = Color.White.copy(alpha = 0.9f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
