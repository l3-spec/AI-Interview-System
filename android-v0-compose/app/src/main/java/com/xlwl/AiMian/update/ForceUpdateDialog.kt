package com.xlwl.AiMian.update

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.xlwl.AiMian.update.AppUpdateManager.DownloadState
import kotlinx.coroutines.launch

/**
 * 强制更新弹窗
 *
 * 功能：
 * - 显示更新标题、版本号、更新内容
 * - 下载按钮触发 APK 下载
 * - 实时显示下载进度条
 * - 强制更新模式下不可关闭弹窗
 * - 下载完成后自动调起安装
 *
 * @param updateInfo 版本更新信息
 * @param updateManager 更新管理器
 * @param onDismiss 关闭回调（非强制更新时可用）
 */
@Composable
fun ForceUpdateDialog(
    updateInfo: AppUpdateManager.UpdateInfo,
    updateManager: AppUpdateManager,
    onDismiss: () -> Unit = {},
) {
    val downloadState by updateManager.downloadState.collectAsState()
    val downloadProgress by updateManager.downloadProgress.collectAsState()
    val errorMessage by updateManager.errorMessage.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    // 强制更新时不可关闭
    val dismissable = !updateInfo.forceUpdate

    Dialog(
        onDismissRequest = {
            if (dismissable) onDismiss()
        },
        properties = DialogProperties(
            dismissOnBackPress = dismissable,
            dismissOnClickOutside = dismissable,
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.White
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // 标题
                Text(
                    text = if (updateInfo.forceUpdate) "发现新版本（必须更新）" else "发现新版本",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1A1A1A),
                    textAlign = TextAlign.Center,
                )

                Spacer(modifier = Modifier.height(12.dp))

                // 版本号
                Text(
                    text = "最新版本：${updateInfo.latestVersionName ?: "未知"}",
                    fontSize = 16.sp,
                    color = Color(0xFF666666),
                )

                // 更新说明
                val notes = updateInfo.releaseNotes
                if (!notes.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFF5F5F5))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = notes,
                            fontSize = 14.sp,
                            color = Color(0xFF333333),
                            lineHeight = 20.sp,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // 下载进度条
                if (downloadState == DownloadState.DOWNLOADING) {
                    LinearProgressIndicator(
                        progress = { downloadProgress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Color(0xFF4A90D9),
                        trackColor = Color(0xFFE0E0E0),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "下载中... $downloadProgress%",
                        fontSize = 13.sp,
                        color = Color(0xFF999999),
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // 错误信息
                if (downloadState == DownloadState.FAILED && errorMessage != null) {
                    Text(
                        text = errorMessage ?: "下载失败，请重试",
                        fontSize = 13.sp,
                        color = Color(0xFFE53935),
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // 按钮区域
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 非强制更新时显示"稍后提醒"按钮
                    if (!updateInfo.forceUpdate) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFF999999)
                            )
                        ) {
                            Text("稍后提醒")
                        }
                    }

                    // 下载/安装按钮
                    Button(
                        onClick = {
                            when (downloadState) {
                                DownloadState.IDLE, DownloadState.FAILED -> {
                                    val url = updateInfo.downloadUrl
                                    if (url.isNullOrBlank()) {
                                        return@Button
                                    }
                                    coroutineScope.launch {
                                        val apkFile = updateManager.downloadApk(url)
                                        if (apkFile != null) {
                                            updateManager.installApk(apkFile)
                                        }
                                    }
                                }
                                DownloadState.COMPLETED -> {
                                    // 如果下载完成但未安装，可重新尝试
                                    // 实际场景下载完会自动安装
                                }
                                DownloadState.DOWNLOADING -> {
                                    // 下载中，不做操作
                                }
                            }
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp),
                        enabled = downloadState != DownloadState.DOWNLOADING,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4A90D9),
                            disabledContainerColor = Color(0xFFB0C4DE),
                        ),
                    ) {
                        Text(
                            text = when (downloadState) {
                                DownloadState.IDLE -> "立即更新"
                                DownloadState.DOWNLOADING -> "下载中..."
                                DownloadState.COMPLETED -> "下载完成"
                                DownloadState.FAILED -> "重新下载"
                            },
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }
}
