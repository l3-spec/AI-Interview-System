@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.BusinessCenter
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.ui.components.CompactTopBar
import com.xlwl.AiMian.ui.components.GlassCard
import com.xlwl.AiMian.ui.theme.*

private val PageGradient = Brush.verticalGradient(
    colors = listOf(
        SecondaryBlue, // 顶部蓝
        BackgroundLight,
        BackgroundLight
    )
)
private val CardShape = RoundedCornerShape(16.dp)

@Composable
fun ContactUsRoute(
    onBack: () -> Unit,
    onOpenMessages: () -> Unit
) {
    val scrollState = rememberScrollState()
    val navPadding = WindowInsets.navigationBars.asPaddingValues()
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "联系我们",
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .padding(bottom = navPadding.calculateBottomPadding() + 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                ContactHeroCard(onOpenMessages = onOpenMessages)
                ContactMethodCard(onOpenMessages = onOpenMessages)
                SupportTipsCard()
                Spacer(modifier = Modifier.height(6.dp))
            }
        }
    }
}

@Composable
private fun ContactHeroCard(onOpenMessages: () -> Unit) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        containerColor = Color.Transparent
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            PrimaryOrange,
                            AccentSoft,
                        )
                    ),
                    shape = CardShape
                )
                .padding(horizontal = 20.dp, vertical = 24.dp)
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "7×12h 在线支持",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White
                    )
                )
                Text(
                    text = "技术、商务、产品反馈都能在这里找到负责人。我们会在 30 分钟内响应，确保沟通链路不中断。",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                )
                Button(
                    onClick = onOpenMessages,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.2f),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f))
                ) {
                    Text(
                        text = "发起客服消息",
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactMethodCard(onOpenMessages: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    val methods = remember {
        listOf(
            ContactMethod(
                title = "技术支持",
                value = "support@aiinterview.com",
                description = "产品使用、集成问题",
                icon = Icons.Outlined.AlternateEmail
            ),
            ContactMethod(
                title = "商务合作",
                value = "business@aiinterview.com",
                description = "渠道合作、定制需求",
                icon = Icons.Outlined.BusinessCenter
            ),
            ContactMethod(
                title = "在线客服",
                value = "立即进入客服消息",
                description = "与客服一对一沟通",
                icon = Icons.Outlined.SupportAgent,
                onTap = onOpenMessages
            )
        )
    }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "联系方式",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            methods.forEach { method ->
                ContactMethodRow(
                    method = method,
                    onCopy = {
                        clipboard.setText(AnnotatedString(method.value))
                        Toast.makeText(context, "${method.title} 已复制", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}

@Composable
private fun ContactMethodRow(
    method: ContactMethod,
    onCopy: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(
                    brush = Brush.linearGradient(listOf(AccentSoft, PrimaryOrange)),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = method.icon,
                contentDescription = method.title,
                tint = Color.White
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = method.title,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
            )
            Text(
                text = method.value,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF2D3036)
                )
            )
            Text(
                text = method.description,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            )
        }
        TextButton(
            onClick = {
                if (method.onTap != null) {
                    method.onTap.invoke()
                } else {
                    onCopy()
                }
            },
            shape = RoundedCornerShape(18.dp)
        ) {
            Text(
                text = if (method.onTap != null) "进入" else "复制",
                color = PrimaryOrange,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun SupportTipsCard() {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "服务承诺",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            )
            Text(
                text = "• 工作日 9:00-21:00 快速响应，节假日值班支持。\n• 需求、故障会同步到内部工单，处理进度可在消息中心查看。\n• 如需远程协助，请提前备注企业名称与问题描述。",
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = TextSecondary
                )
            )
        }
    }
}

private data class ContactMethod(
    val title: String,
    val value: String,
    val description: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val onTap: (() -> Unit)? = null
)
