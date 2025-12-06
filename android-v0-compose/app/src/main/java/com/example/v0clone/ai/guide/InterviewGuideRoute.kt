package com.xlwl.AiMian.ai.guide

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.TouchApp
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import kotlinx.coroutines.launch

private enum class FocusTarget { Card, Button }

private data class GuideCardData(
    val title: String,
    val subtitle: String? = null,
    val timer: String? = null,
    val highlightValue: String? = null
)

private data class GuideStep(
    val instructions: List<String>,
    val card: GuideCardData?,
    val actionText: String,
    val focusTarget: FocusTarget,
    val showAcknowledge: Boolean = true,
    val showHandPointer: Boolean = false,
    val pointerHeight: Dp = 56.dp,
    val bodyBottomPadding: Dp = 220.dp,
    val cardBottomPadding: Dp = 136.dp,
    val backgroundRes: Int = R.drawable.guide_step_1
)

private val AccentOrange = Color(0xFFE7743A)
private val CardBackground = Color(0xF0F4F5F7)
private val ScrimBrush = Brush.verticalGradient(
    listOf(
        Color(0x99000000),
        Color(0xCC0A0A0A),
        Color(0xCC0A0A0A)
    )
)

private val GUIDE_STEPS = listOf(
    GuideStep(
        instructions = listOf("请认真听题，AI", "面试官将随机提问", "请尽量在安静的环境下进行"),
        card = GuideCardData(
            title = "面试官提问中...",
            subtitle = "请您做一个自我介绍",
            timer = "03:00"
        ),
        actionText = "开始答题",
        focusTarget = FocusTarget.Card,
        pointerHeight = 62.dp,
        backgroundRes = R.drawable.guide_step_1
    ),
    GuideStep(
        instructions = listOf("你有 30 秒时间思考答案"),
        card = GuideCardData(
            title = "答题思考时间",
            timer = "03:00",
            highlightValue = "30"
        ),
        actionText = "开始答题",
        focusTarget = FocusTarget.Card,
        pointerHeight = 62.dp,
        backgroundRes = R.drawable.guide_step_2
    ),
    GuideStep(
        instructions = listOf("如果你已准备好", "可点击下方按钮立即开始"),
        card = GuideCardData(
            title = "答题思考时间",
            timer = "03:00",
            highlightValue = "30"
        ),
        actionText = "开始答题",
        focusTarget = FocusTarget.Button,
        pointerHeight = 74.dp,
        bodyBottomPadding = 210.dp,
        backgroundRes = R.drawable.guide_step_3
    ),
    GuideStep(
        instructions = listOf("你将有 3 分钟的作答时间，", "请清晰阐述表达你的观点"),
        card = GuideCardData(
            title = "请回答，我在听",
            timer = "03:00"
        ),
        actionText = "结束答题",
        focusTarget = FocusTarget.Card,
        pointerHeight = 62.dp,
        backgroundRes = R.drawable.guide_step_4
    ),
    GuideStep(
        instructions = listOf("如果你已完成回答", "可点击下方按钮结束本题"),
        card = GuideCardData(
            title = "请回答，我在听",
            timer = "03:00"
        ),
        actionText = "结束答题",
        focusTarget = FocusTarget.Button,
        pointerHeight = 74.dp,
        bodyBottomPadding = 210.dp,
        backgroundRes = R.drawable.guide_step_5
    )
)

@Composable
fun InterviewGuideRoute(
    position: String,
    category: String,
    jobId: String? = null,
    repository: AiInterviewRepository,
    onBack: () -> Unit,
    onContinue: (AiInterviewFlowState) -> Unit
) {
    var stepIndex by remember { mutableStateOf(0) }
    var isGenerating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val steps = GUIDE_STEPS

    fun startGeneration() {
        if (isGenerating) return
        isGenerating = true
        errorMessage = null
        scope.launch {
            val request = CreateAiInterviewSessionRequest(
                jobId = jobId,
                jobTarget = position,
                jobCategory = category.takeIf { it.isNotBlank() },
                jobSubCategory = position,
                questionCount = null
            )
            val result = repository.createSession(request)
            result.onSuccess { payload ->
                val state = AiInterviewFlowState(
                    jobId = payload.jobId ?: jobId,
                    sessionId = payload.sessionId,
                    jobTarget = position,
                    totalQuestions = payload.totalQuestions,
                    questions = payload.questions,
                    jobCategory = payload.jobCategory ?: category,
                    jobSubCategory = payload.jobSubCategory ?: position,
                    plannedDurationMinutes = payload.plannedDuration,
                    prompt = payload.prompt
                )
                isGenerating = false
                onContinue(state)
            }.onFailure { throwable ->
                errorMessage = throwable.message ?: "生成面试题失败，请重试"
                isGenerating = false
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GuideScreen(
            step = steps[stepIndex],
            isGenerating = isGenerating,
            onBack = {
                if (stepIndex > 0) {
                    stepIndex--
                } else {
                    onBack()
                }
            },
            onPrimary = {
                if (stepIndex < steps.lastIndex) {
                    stepIndex++
                } else {
                    startGeneration()
                }
            }
        )

        if (isGenerating) {
            LoadingOverlay()
        }

        AnimatedVisibility(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp),
            visible = errorMessage != null
        ) {
            ErrorBanner(
                message = errorMessage ?: "",
                onRetry = { startGeneration() }
            )
        }
    }
}

@Composable
private fun GuideScreen(
    step: GuideStep,
    isGenerating: Boolean,
    onBack: () -> Unit,
    onPrimary: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        GuideBackground(step.backgroundRes)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            GuideTopBar(onBack = onBack)

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                GuideInstructionCluster(step = step)

                step.card?.let {
                    GuideCard(
                        card = it,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 12.dp)
                            .padding(bottom = step.cardBottomPadding)
                    )
                }
            }

            PrimaryActionButton(
                text = step.actionText,
                onClick = onPrimary,
                enabled = !isGenerating
            )
        }
    }
}

@Composable
private fun GuideBackground(backgroundRes: Int) {
    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = backgroundRes),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(ScrimBrush)
        )
    }
}

@Composable
private fun GuideTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.35f),
                shape = CircleShape
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Outlined.ArrowBack,
                        contentDescription = "返回",
                        tint = Color.White
                    )
                }
            }
            Surface(
                color = AccentOrange.copy(alpha = 0.85f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "1/15",
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                )
            }
        }

        Surface(
            color = Color.Black.copy(alpha = 0.25f),
            shape = RoundedCornerShape(18.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(96.dp)
                    .height(136.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Videocam,
                    contentDescription = "摄像头预览占位",
                    tint = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(32.dp)
                )
            }
        }
    }
}

@Composable
private fun GuideInstructionCluster(step: GuideStep) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 24.dp)
                .padding(bottom = step.bodyBottomPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (step.showAcknowledge) {
                Surface(
                    color = AccentOrange,
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        text = "我知道啦",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
                DashedLine(height = step.pointerHeight, color = Color.White.copy(alpha = 0.85f))
                if (step.focusTarget == FocusTarget.Button) {
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }

            step.instructions.forEach { line ->
                Text(
                    text = line,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }
        }

        if (step.showHandPointer) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 130.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DashedLine(height = step.pointerHeight, color = Color.White.copy(alpha = 0.85f))
                Icon(
                    imageVector = Icons.Outlined.TouchApp,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(30.dp)
                )
            }
        }
    }
}

@Composable
private fun DashedLine(height: Dp, color: Color) {
    Canvas(
        modifier = Modifier
            .width(2.dp)
            .height(height)
    ) {
        drawLine(
            color = color,
            start = Offset(size.width / 2f, 0f),
            end = Offset(size.width / 2f, size.height),
            strokeWidth = 3f,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f), 0f)
        )
    }
}

@Composable
private fun GuideCard(card: GuideCardData, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .fillMaxWidth(0.92f)
            .clip(RoundedCornerShape(18.dp)),
        color = CardBackground
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = card.title,
                    color = Color(0xFF1F1F1F),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
                card.timer?.let { TimerPill(it) }
            }

            card.subtitle?.let {
                Text(
                    text = it,
                    color = Color(0xFF1F1F1F),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            card.highlightValue?.let {
                Text(
                    text = it,
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFF1F1F1F),
                    fontWeight = FontWeight.Bold,
                    fontSize = 48.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun TimerPill(timer: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(AccentOrange, CircleShape)
        )
        Text(
            text = timer,
            color = Color(0xFF1F1F1F),
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun PrimaryActionButton(text: String, onClick: () -> Unit, enabled: Boolean) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .navigationBarsPadding(),
        colors = ButtonDefaults.buttonColors(
            containerColor = AccentOrange,
            contentColor = Color.White,
            disabledContainerColor = Color(0xFFE6E6E6),
            disabledContentColor = Color(0xFF8C8C8C)
        ),
        shape = RoundedCornerShape(28.dp)
    ) {
        Text(
            text = text,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp
        )
    }
}

@Composable
private fun LoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CircularProgressIndicator(color = AccentOrange)
            Text(
                text = "正在生成面试题…",
                color = Color.White,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
private fun ErrorBanner(message: String, onRetry: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        color = Color(0xFF2B1D1D),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                color = Color(0xFFFFC8A6),
                fontSize = 14.sp,
                modifier = Modifier.weight(1f, fill = false)
            )
            Spacer(modifier = Modifier.size(12.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("重试", color = Color.White)
            }
        }
    }
}
