package com.xlwl.AiMian.ai

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.graphics.Brush
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import kotlinx.coroutines.delay
import kotlinx.coroutines.delay

/**
 * 教育引导状态枚举
 */
enum class EducationState {
    START_INTERVIEW,      // 开始面试引导
    THINKING_TIME,        // 思考时间
    READY_TO_ANSWER,       // 准备答题
    ANSWERING             // 答题中
}

/**
 * 教育引导覆盖层组件
 */
@Composable
fun EducationOverlay(
    state: EducationState,
    currentQuestion: Int = 1,
    totalQuestions: Int = 15,
    thinkingTimeSeconds: Int = 30,
    answerTimeMinutes: Int = 3,
    onDismiss: () -> Unit,
    onStartInterview: () -> Unit = {},
    onStartAnswer: () -> Unit = {},
    onEndAnswer: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.8f))
            .zIndex(3f),
        contentAlignment = Alignment.Center
    ) {
        when (state) {
            EducationState.START_INTERVIEW -> {
                StartInterviewGuide(
                    onStartInterview = {
                        onStartInterview()
                        onDismiss()
                    }
                )
            }
            EducationState.THINKING_TIME -> {
                ThinkingTimeGuide(
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    thinkingTimeSeconds = thinkingTimeSeconds,
                    onDismiss = onDismiss,
                    onStartAnswer = {
                        onStartAnswer()
                        onDismiss()
                    }
                )
            }
            EducationState.READY_TO_ANSWER -> {
                ReadyToAnswerGuide(
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    answerTimeMinutes = answerTimeMinutes,
                    onDismiss = onDismiss,
                    onStartAnswer = {
                        onStartAnswer()
                        onDismiss()
                    }
                )
            }
            EducationState.ANSWERING -> {
                AnsweringGuide(
                    currentQuestion = currentQuestion,
                    totalQuestions = totalQuestions,
                    answerTimeMinutes = answerTimeMinutes,
                    onDismiss = onDismiss,
                    onEndAnswer = {
                        onEndAnswer()
                        onDismiss()
                    }
                )
            }
        }
    }
}

/**
 * 开始面试引导页
 */
@Composable
private fun StartInterviewGuide(
    onStartInterview: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // 顶部留白
        Spacer(modifier = Modifier.height(120.dp))
        
        // 引导文本卡片
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Color(0xFF2A2A2A).copy(alpha = 0.9f),
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // "我知道啦" 按钮（右上角）
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    onClick = onStartInterview,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFEC7C38)
                    ),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        text = "我知道啦",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // 引导文本
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "我们已完成所有引导",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "点击下方按钮,让我们开始面试吧",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "请您做一个自我介绍。",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }
            
            // 虚线指示器
            Spacer(modifier = Modifier.height(8.dp))
            DottedLine(
                modifier = Modifier
                    .width(2.dp)
                    .height(40.dp)
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // 开始面试按钮
        Button(
            onClick = onStartInterview,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFEC7C38),
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
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * 思考时间引导页
 */
@Composable
private fun ThinkingTimeGuide(
    currentQuestion: Int,
    totalQuestions: Int,
    thinkingTimeSeconds: Int,
    onDismiss: () -> Unit,
    onStartAnswer: () -> Unit
) {
    var remainingSeconds by remember { mutableIntStateOf(thinkingTimeSeconds) }
    var showAcknowledgeButton by remember { mutableStateOf(true) }
    
    // 倒计时逻辑
    LaunchedEffect(Unit) {
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds--
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 顶部导航和进度
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 返回按钮占位
            Spacer(modifier = Modifier.width(24.dp))
            
            // 进度指示
            Text(
                text = "$currentQuestion/$totalQuestions",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
        
        Spacer(modifier = Modifier.height(80.dp))
        
        // "我知道啦" 按钮
        if (showAcknowledgeButton) {
            TextButton(
                onClick = {
                    showAcknowledgeButton = false
                },
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFFEC7C38)
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Text(
                    text = "我知道啦",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        
        // 提示文本
        Text(
            text = "你有 ${thinkingTimeSeconds} 秒时间思考答案",
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // 虚线指示器
        DottedLine(
            modifier = Modifier
                .width(2.dp)
                .height(40.dp)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // 思考时间卡片
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Color(0xFF2A2A2A).copy(alpha = 0.9f),
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "答题思考时间",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(Color(0xFFEC7C38), CircleShape)
                    )
                    Text(
                        text = "03:00",
                        color = Color(0xFFEC7C38),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // 倒计时数字（居中）
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$remainingSeconds",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // 开始答题按钮
        Button(
            onClick = onStartAnswer,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF693A0D),
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(26.dp)
        ) {
            Text(
                text = "开始答题",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * 准备答题引导页
 */
@Composable
private fun ReadyToAnswerGuide(
    currentQuestion: Int,
    totalQuestions: Int,
    answerTimeMinutes: Int,
    onDismiss: () -> Unit,
    onStartAnswer: () -> Unit
) {
    var showAcknowledgeButton by remember { mutableStateOf(true) }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 顶部导航和进度
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 返回按钮
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "返回",
                    tint = Color.White
                )
            }
            
            // 进度指示
            Text(
                text = "$currentQuestion/$totalQuestions",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
        
        Spacer(modifier = Modifier.height(80.dp))
        
        // "我知道啦" 按钮
        if (showAcknowledgeButton) {
            TextButton(
                onClick = {
                    showAcknowledgeButton = false
                },
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFFEC7C38)
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Text(
                    text = "我知道啦",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        
        // 提示文本
        Text(
            text = "你将有 $answerTimeMinutes 分钟的作答时间，请清晰表达你的观点",
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // 虚线指示器
        DottedLine(
            modifier = Modifier
                .width(2.dp)
                .height(40.dp)
        )
        
        Spacer(modifier = Modifier.weight(1f))
        
        // 开始答题按钮
        Button(
            onClick = onStartAnswer,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFEC7C38),
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(26.dp)
        ) {
            Text(
                text = "开始答题",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * 答题中引导页
 */
@Composable
private fun AnsweringGuide(
    currentQuestion: Int,
    totalQuestions: Int,
    answerTimeMinutes: Int,
    onDismiss: () -> Unit,
    onEndAnswer: () -> Unit
) {
    var remainingSeconds by remember { mutableIntStateOf(answerTimeMinutes * 60) }
    var showAcknowledgeButton by remember { mutableStateOf(true) }
    
    // 倒计时逻辑
    LaunchedEffect(Unit) {
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds--
        }
    }
    
    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeText = String.format("%02d:%02d", minutes, seconds)
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
    ) {
        // 顶部导航和进度
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 返回按钮
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "返回",
                    tint = Color.White
                )
            }
            
            // 进度指示
            Text(
                text = "$currentQuestion/$totalQuestions",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // 底部引导卡片
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Color(0xFF2A2A2A).copy(alpha = 0.9f),
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
                )
                .padding(20.dp)
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 第一行：提示文本和"我知道啦"按钮
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "请回答, 我在听",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                    
                    if (showAcknowledgeButton) {
                        TextButton(
                            onClick = {
                                showAcknowledgeButton = false
                            },
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = Color(0xFFEC7C38)
                            ),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                text = "我知道啦",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    } else {
                        // 倒计时显示
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .background(Color(0xFFEC7C38), CircleShape)
                            )
                            Text(
                                text = timeText,
                                color = Color(0xFFEC7C38),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
                
                // 引导文本（如果显示"我知道啦"按钮）
                if (showAcknowledgeButton) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "如果你已完成回答",
                            color = Color.White,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "可点击下方按钮结束本题",
                            color = Color.White,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                        
                        // 虚线指示器
                        Spacer(modifier = Modifier.height(8.dp))
                        DottedLine(
                            modifier = Modifier
                                .width(2.dp)
                                .height(30.dp)
                        )
                    }
                }
            }
        }
        
        // 结束答题按钮
        Button(
            onClick = onEndAnswer,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFEC7C38),
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(26.dp)
        ) {
            Text(
                text = "结束答题",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * 虚线指示器组件
 */
@Composable
private fun DottedLine(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.0f),
                        Color.White.copy(alpha = 0.5f),
                        Color.White.copy(alpha = 0.0f)
                    )
                )
            )
    )
}

