package com.xlwl.AiMian.ai.prep

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.navigation.Routes
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrepRoute(navController: NavController, position: String, flowState: AiInterviewFlowState?) {
    val steps = remember(flowState?.jobTarget) {
        listOf(
            PrepTip(
                icon = Icons.Outlined.Timer,
                title = "环境准备",
                detail = "保持安静背景与良好网络，摄像头对准正面并保证光线均匀"
            ),
            PrepTip(
                icon = Icons.Outlined.Bolt,
                title = "设备检查",
                detail = "提前检查数字人面试所需的摄像头、麦克风和耳机，建议开启勿扰模式"
            ),
            PrepTip(
                icon = Icons.Outlined.CheckCircle,
                title = "流程说明",
                detail = "数字人面试官将围绕 ${flowState?.jobTarget ?: position} 职位提出情景题，建议按 STAR 法作答"
            )
        )
    }

    val categoryLabel = remember(flowState) { flowState?.jobCategory?.takeIf { it.isNotBlank() } }
    val subCategoryLabel = remember(flowState) { flowState?.jobSubCategory?.takeIf { it.isNotBlank() } }
    val plannedMinutes = remember(flowState) { flowState?.plannedDurationMinutes?.takeIf { it > 0 } }

    val previewQuestions = remember(flowState) {
        flowState?.questions?.take(3)?.mapIndexed { index, question ->
            "第${index + 1}题：${question.questionText}"
        } ?: emptyList()
    }

    val processGuides = remember {
        listOf(
            "进入面试间后，数字人面试官会先向你致意并确认设备状态。",
            "每道题都有充足的准备时间，可选择文字或视频作答，保持回答结构完整。",
            "答完所有题目后点击完成，系统将在后台整理并生成评估报告。"
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFFFFE8D6), Color(0xFFF4F7FB))
                )
            )
    ) {
        TopAppBar(
            title = {
                Text(
                    text = "数字人面试指导",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )
            },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "返回")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.Transparent,
                navigationIconContentColor = Color(0xFF1F2937),
                titleContentColor = Color(0xFF1F2937)
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        Surface(
            modifier = Modifier
                .padding(horizontal = 20.dp)
                .fillMaxWidth(),
            color = Color.White,
            shape = RoundedCornerShape(28.dp),
            tonalElevation = 6.dp,
            shadowElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 28.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "即将面试职位",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF6B7280))
                )
                Text(
                    text = flowState?.jobTarget ?: position,
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1F2937)
                    )
                )

                if (categoryLabel != null || subCategoryLabel != null || plannedMinutes != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categoryLabel?.let { InfoChip(label = "职位大类", value = it) }
                        subCategoryLabel?.let { InfoChip(label = "职位方向", value = it) }
                        plannedMinutes?.let { InfoChip(label = "预计时长", value = "约 ${it} 分钟") }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                steps.forEach { tip ->
                    PrepTipRow(tip = tip)
                }

                if (flowState != null) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "AI 面试将包含约 ${flowState.totalQuestions} 道题目",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF1F2937), fontWeight = FontWeight.Medium)
                            )
                            previewQuestions.forEach { q ->
                                Text(
                                    text = q,
                                    style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF64748B))
                                )
                            }
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFFBEB),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "数字人面试流程",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color(0xFF854D0E),
                                fontWeight = FontWeight.Medium
                            )
                        )
                        processGuides.forEachIndexed { index, guide ->
                            Text(
                                text = "${index + 1}. $guide",
                                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF9A6B2F))
                            )
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFF3E6),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    val durationHint = plannedMinutes?.let { "数字人面试预计用时约 ${it} 分钟，" } ?: "AI 面试预计 8 - 10 轮问答，"
                    Text(
                        text = durationHint + "请保持镜头前的自信与微笑。",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        color = Color(0xFF9A6B2F),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        val encodedSessionId = remember(flowState?.sessionId) {
            flowState?.sessionId?.takeIf { it.isNotBlank() }?.let { URLEncoder.encode(it, "UTF-8") }
        }
        val canStart = flowState != null && encodedSessionId != null

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 24.dp),
            color = Color(0xFFFFFBEB),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 22.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "准备完成后即可进入数字人面试间",
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = Color(0xFF9A6B2F),
                        fontWeight = FontWeight.SemiBold
                    )
                )
                Text(
                    text = "请再次确认摄像头、麦克风正常，保持环境安静与光线均匀。",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFFB45309)),
                    textAlign = TextAlign.Center
                )

                Button(
                    onClick = {
                        if (canStart) {
                            navController.currentBackStackEntry?.savedStateHandle?.set("ai_interview_flow", flowState)
                            navController.navigate("${Routes.SESSION}/$encodedSessionId") {
                                launchSingleTop = true
                            }
                        }
                    },
                    enabled = canStart,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF8C42),
                        contentColor = Color.White,
                        disabledContainerColor = Color(0xFFFECACA),
                        disabledContentColor = Color(0xFF7C2D12)
                    )
                ) {
                    Text("进入数字人面试间")
                }

                TextButton(onClick = { navController.popBackStack() }) {
                    Text("返回修改岗位或流程", color = Color(0xFFB45309))
                }

                if (!canStart) {
                    Text(
                        text = "未获取到有效的面试会话，请返回上一页重新生成。",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFFD97706)),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

private data class PrepTip(
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val title: String,
    val detail: String
)

@Composable
private fun InfoChip(label: String, value: String) {
    Surface(
        color = Color(0xFFFFF7ED),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF9A6B2F))
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color(0xFF1F2937),
                    fontWeight = FontWeight.SemiBold
                )
            )
        }
    }
}

@Composable
private fun PrepTipRow(tip: PrepTip) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            color = Color(0xFFFF8C42).copy(alpha = 0.12f),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                tip.icon,
                contentDescription = null,
                tint = Color(0xFFFF8C42),
                modifier = Modifier.padding(10.dp)
            )
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = tip.title,
                style = MaterialTheme.typography.titleMedium.copy(
                    color = Color(0xFF1F2937),
                    fontWeight = FontWeight.SemiBold
                )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = tip.detail,
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280)),
                textAlign = TextAlign.Start
            )
        }
    }
}
