package com.xlwl.AiMian.ui.components

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.xlwl.AiMian.ui.design.StarLinkAccentOrange

private const val PREFS_NAME = "app_privacy_prefs"
private const val KEY_PRIVACY_AGREED = "privacy_agreed"

@Composable
fun PrivacyPolicyDialog(onAgreed: () -> Unit = {}) {
    val context = LocalContext.current
    val sharedPrefs: SharedPreferences = remember {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    // Default to false (not agreed)
    var showDialog by remember { 
        mutableStateOf(!sharedPrefs.getBoolean(KEY_PRIVACY_AGREED, false)) 
    }
    var showExitConfirm by remember { mutableStateOf(false) }

    if (!showDialog) {
        LaunchedEffect(Unit) {
            onAgreed()
        }
        return
    }

    if (showExitConfirm) {
        AlertDialog(
            onDismissRequest = { showExitConfirm = false },
            title = { Text("温馨提示") },
            text = { Text("您需要同意《个人信息保护指引》才能继续使用我们的应用。如果您不同意，应用将会退出。") },
            confirmButton = {
                TextButton(onClick = { showExitConfirm = false }) {
                    Text("再看看", color = StarLinkAccentOrange)
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    (context as? Activity)?.finish()
                }) {
                    Text("退出应用", color = Color.Gray)
                }
            }
        )
    } else {
        Dialog(
            onDismissRequest = { },
            properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "个人信息保护指引",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                    
                    val annotatedString = buildAnnotatedString {
                        append("欢迎使用AI面试系统！在您开始使用之前，请您仔细阅读")
                        pushStringAnnotation(tag = "UA", annotation = "user_agreement")
                        withStyle(style = SpanStyle(color = StarLinkAccentOrange)) {
                            append("《用户协议》")
                        }
                        pop()
                        append("和")
                        pushStringAnnotation(tag = "PP", annotation = "privacy_policy")
                        withStyle(style = SpanStyle(color = StarLinkAccentOrange)) {
                            append("《隐私政策》")
                        }
                        pop()
                        append("。\n\n")
                        append("为了向您提供AI面试相关的服务，我们可能需要收集您的设备信息、网络信息、麦克风和摄像头权限等。您可以在系统设置中管理您的权限。\n\n")
                        append("点击“同意”即表示您已阅读并同意全部条款。")
                    }
                    
                    ClickableText(
                        text = annotatedString,
                        style = androidx.compose.ui.text.TextStyle(
                            fontSize = 14.sp,
                            lineHeight = 22.sp,
                            color = Color.DarkGray
                        ),
                        onClick = { offset ->
                            annotatedString.getStringAnnotations(tag = "UA", start = offset, end = offset)
                                .firstOrNull()?.let {
                                    // Handle User Agreement click
                                }
                            annotatedString.getStringAnnotations(tag = "PP", start = offset, end = offset)
                                .firstOrNull()?.let {
                                    // Handle Privacy Policy click
                                }
                        }
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        TextButton(
                            onClick = { showExitConfirm = true },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("不同意", color = Color.Gray)
                        }
                        
                        Spacer(modifier = Modifier.width(16.dp))
                        
                        Button(
                            onClick = {
                                sharedPrefs.edit().putBoolean(KEY_PRIVACY_AGREED, true).apply()
                                showDialog = false
                                onAgreed()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = StarLinkAccentOrange),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("同意", color = Color.White)
                        }
                    }
                }
            }
        }
    }
}
