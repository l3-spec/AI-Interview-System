@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.profile

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.ui.components.CompactTopBar
import kotlinx.coroutines.launch

private val PageGradient = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF00ACC3), // 顶部蓝
        Color(0xFFE9F7F9),
        Color(0xFFE9F7F9)
    )
)
private val AccentOrange = Color(0xFFEC7C38)
private val AccentSoft = Color(0xFFFFC48A)
private val TitleColor = Color(0xFF1D1F24)
private val SubtleText = Color(0xFF7C818A)
private val DividerColor = Color(0xFFE9EAEE)
private val CardShape = RoundedCornerShape(12.dp)

@Composable
fun ProfileSettingsRoute(
    authManager: AuthManager,
    onBack: () -> Unit,
    onLogoutSuccess: () -> Unit,
    onNavigatePersonalInfo: () -> Unit,
    onNavigatePrivacy: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showConfirmDialog by rememberSaveable { mutableStateOf(false) }

    val logoutAction = rememberUpdatedState {
        scope.launch {
            authManager.clear()
            onLogoutSuccess()
            Toast.makeText(context, "您已安全退出", Toast.LENGTH_SHORT).show()
        }
    }

    ProfileSettingsScreen(
        onBack = onBack,
        onOptionSelected = { label ->
            when (label) {
                "个人资料" -> onNavigatePersonalInfo()
                "隐私与权限" -> onNavigatePrivacy()
                else -> Toast.makeText(context, "$label 敬请期待", Toast.LENGTH_SHORT).show()
            }
        },
        onLogoutClick = { showConfirmDialog = true }
    )

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("确认退出登录？") },
            text = { Text("退出后需要重新登录才能访问个人信息和消息。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirmDialog = false
                        logoutAction.value.invoke()
                    }
                ) {
                    Text("退出", color = AccentOrange)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

@Composable
private fun ProfileSettingsScreen(
    onBack: () -> Unit,
    onOptionSelected: (String) -> Unit,
    onLogoutClick: () -> Unit
) {
    val scrollState = rememberScrollState()
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "通用设置",
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
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                SettingSection(
                    title = "账号与安全",
                    subtitle = "个人资料、隐私控制",
                    options = listOf(
                        SettingOption(
                            icon = Icons.Outlined.Settings,
                            label = "个人资料",
                            description = "头像、昵称、基础信息"
                        ),
                        SettingOption(
                            icon = Icons.Outlined.PrivacyTip,
                            label = "隐私与权限",
                            description = "登录设备、通知、数据授权"
                        )
                    ),
                    onOptionSelected = onOptionSelected
                )
                SettingSection(
                    title = "帮助与支持",
                    subtitle = "服务与反馈",
                    options = listOf(
                        SettingOption(
                            icon = Icons.Outlined.SupportAgent,
                            label = "客服支持",
                            description = "遇到问题？联系人工客服"
                        )
                    ),
                    onOptionSelected = onOptionSelected
                )
                LogoutCard(onLogoutClick = onLogoutClick)
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun SettingSection(
    title: String,
    subtitle: String? = null,
    options: List<SettingOption>,
    onOptionSelected: (String) -> Unit
) {
    if (options.isEmpty()) return
    Column(
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(
                        brush = Brush.linearGradient(listOf(AccentSoft, AccentOrange)),
                        shape = CircleShape
                    )
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TitleColor
                    )
                )
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = SubtleText,
                            fontSize = 12.sp
                        )
                    )
                }
            }
        }
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = CardShape,
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                options.forEachIndexed { index, option ->
                    SettingRow(option = option, onClick = { onOptionSelected(option.label) })
                    if (index != options.lastIndex) {
                        Divider(
                            color = DividerColor,
                            thickness = 0.6.dp,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingRow(
    option: SettingOption,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(
                    brush = Brush.linearGradient(listOf(AccentSoft, AccentOrange)),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = option.icon,
                contentDescription = option.label,
                tint = Color.White,
                modifier = Modifier.size(18.dp)
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = option.label,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = TitleColor
                )
            )
            option.description?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = SubtleText,
                        fontSize = 12.sp
                    )
                )
            }
        }
        Icon(
            imageVector = Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = Color(0xFFB6BAC1)
        )
    }
}

@Composable
private fun LogoutCard(onLogoutClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, AccentOrange.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(AccentOrange, AccentSoft)
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Logout,
                    contentDescription = "退出登录",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "退出登录",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TitleColor
                    )
                )
                Text(
                    text = "退出后需要重新登录才能接收消息通知并使用AI面试",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = SubtleText,
                        fontSize = 12.sp
                    )
                )
            }
            Button(
                onClick = onLogoutClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AccentOrange,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Text(
                    text = "退出",
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                )
            }
        }
    }
}

private data class SettingOption(
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val label: String,
    val description: String? = null
)
