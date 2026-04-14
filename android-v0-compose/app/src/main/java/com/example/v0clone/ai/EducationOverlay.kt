package com.xlwl.AiMian.ai

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex

enum class EducationStep {
    STEP_1_LISTEN,
    STEP_2_THINK_TIME,
    STEP_3_START_EARLY,
    STEP_4_ANSWER_TIME,
    STEP_5_END_EARLY,
    STEP_6_DONE
}

@Composable
fun EducationOverlay(
    modifier: Modifier = Modifier,
    onComplete: () -> Unit
) {
    var currentStep by remember { mutableStateOf(EducationStep.STEP_1_LISTEN) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.8f))
            .zIndex(10f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top Section - Empty for spacing
            Spacer(modifier = Modifier.weight(1f))

            if (currentStep == EducationStep.STEP_6_DONE) {
                // Step 6 is a modal in the center
                Step6Modal(onComplete = onComplete)
                Spacer(modifier = Modifier.weight(1f))
            } else {
                // Steps 1 to 5 instructions
                InstructionTextAndDashedLine(step = currentStep) {
                    // Next step clicked
                    val nextStep = EducationStep.values().getOrNull(currentStep.ordinal + 1)
                    if (nextStep != null) {
                        currentStep = nextStep
                    } else {
                        onComplete()
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Bottom Panel mimicking the real UI but highlighted
                MockBottomPanel(step = currentStep)
            }
        }
    }
}

@Composable
private fun InstructionTextAndDashedLine(step: EducationStep, onNext: () -> Unit) {
    val (text, dashHeight, pointToRight) = when (step) {
        EducationStep.STEP_1_LISTEN -> Triple("请认真听题，\nAI面试官将随机提问", 40.dp, false)
        EducationStep.STEP_2_THINK_TIME -> Triple("你有 30 秒时间思考答案", 60.dp, false)
        EducationStep.STEP_3_START_EARLY -> Triple("如果你已准备好，\n可点击下方按钮立即开始", 70.dp, false)
        EducationStep.STEP_4_ANSWER_TIME -> Triple("你将有 3 分钟的作答时间，\n请清晰表达你的观点", 40.dp, false)
        EducationStep.STEP_5_END_EARLY -> Triple("如果你已完成回答，\n可点击下方按钮结束本题", 70.dp, false)
        else -> Triple("", 0.dp, false)
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = text,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        Surface(
            color = Color(0xFFF08D4F),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.clickable { onNext() }
        ) {
            Text(
                text = "我知道了",
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                color = Color.White,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp
            )
        }

        Canvas(
            modifier = Modifier
                .width(2.dp)
                .height(dashHeight)
        ) {
            drawLine(
                color = Color.White,
                start = Offset(0f, 0f),
                end = Offset(0f, dashHeight.toPx()),
                strokeWidth = 3f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
            )
        }
    }
}

@Composable
private fun MockBottomPanel(step: EducationStep) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Highlighting the info box based on step
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF1E1E2E).copy(alpha = 0.9f)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                when (step) {
                    EducationStep.STEP_1_LISTEN -> {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("面试官提问中...", color = Color(0xFF43C1C9), fontSize = 14.sp)
                        }
                        Text("请您做一个自我介绍", color = Color.White, fontSize = 16.sp)
                    }
                    EducationStep.STEP_2_THINK_TIME, EducationStep.STEP_3_START_EARLY -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("答题思考时间", color = Color.White.copy(alpha=0.7f), fontSize = 14.sp)
                            Text("03:00", color = Color(0xFFF08D4F), fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("30", color = Color.White, fontSize = 48.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    EducationStep.STEP_4_ANSWER_TIME, EducationStep.STEP_5_END_EARLY -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("请回答，我在听", color = Color.White.copy(alpha=0.7f), fontSize = 16.sp)
                            Text("03:00", color = Color(0xFFF08D4F), fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(30.dp))
                    }
                    else -> {}
                }
            }
        }

        // Action Button
        val isBtnActive = step == EducationStep.STEP_3_START_EARLY || step == EducationStep.STEP_5_END_EARLY
        val btnText = if (step == EducationStep.STEP_4_ANSWER_TIME || step == EducationStep.STEP_5_END_EARLY) "结束答题" else "开始答题"

        Button(
            onClick = { /* mocked */ },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isBtnActive) Color(0xFFF08D4F) else Color(0xFF4A4A4A),
                contentColor = if (isBtnActive) Color.White else Color(0xFFA0A0A0)
            ),
            shape = RoundedCornerShape(26.dp)
        ) {
            Text(
                text = btnText,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun Step6Modal(onComplete: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF1E1E2E)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "我们已完成所有引导,\n点击下方按钮，让我们开始面试吧",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                lineHeight = 28.sp
            )

            Button(
                onClick = onComplete,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF08D4F),
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(26.dp)
            ) {
                Text(
                    text = "开始面试",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
