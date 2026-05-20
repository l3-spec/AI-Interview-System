package com.xlwl.AiMian.ui.auth

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.TelephonyManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.ui.design.StarLinkAccentOrange
import com.xlwl.AiMian.ui.design.StarLinkPlaceholderGray
import com.xlwl.AiMian.ui.design.StarLinkPrimaryText
import com.xlwl.AiMian.ui.design.StarLinkWhite
import com.xlwl.AiMian.ui.design.starLinkHeroGradient
import com.google.gson.Gson
import kotlinx.coroutines.launch

/**
 * 主登录页 - 根据Figma设计实现
 * Figma设计规范：
 * - 背景渐变：从 #00ACC3 到 #EBEBEB，从 31.65% 位置开始过渡
 * - Logo位置：距离顶部 90px，Logo 和按钮之间间距 217px
 * - Logo尺寸：192x120px
 * - 按钮高度：48px，圆角 24px
 * - 按钮间距：16px
 * - 复选框：14x14px，橙色 #EC7C38，已选中
 * - 协议文字：12sp，PingFang SC Light，黑色，链接蓝色 #169BD5
 * 包含Logo、两个登录按钮（授权手机号登录、验证码登录）、用户协议复选框
 */
@Composable
fun LoginMainScreen(
    repo: AuthRepository,
    onLoginSuccess: (String, String) -> Unit,
    onRequestCodeLogin: (String?) -> Unit,
    agreed: Boolean,
    onAgreedChange: (Boolean) -> Unit,
    onNavigatePrivacy: () -> Unit = {},
    onNavigateUserInstructions: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val gson = remember { Gson() }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var pendingAutoLogin by remember { mutableStateOf(false) }

    val requiredPermissions = remember {
        val permissions = mutableListOf(Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            permissions.add(Manifest.permission.READ_PHONE_NUMBERS)
        }
        permissions.toTypedArray()
    }
    val navPadding = WindowInsets.navigationBars.asPaddingValues()

    fun performAutoLogin() {
        loading = true
        val phone = getDevicePhoneNumber(context)
        if (phone.isNullOrEmpty()) {
            loading = false
            pendingAutoLogin = false
            info = null
            error = "未能读取有效手机号，请使用验证码登录"
            return
        }

        info = "已识别手机号 ${maskPhoneNumber(phone)}，正在为您登录..."
        scope.launch {
            val loginResult = repo.deviceLogin(SendCodeRequest(phone))
            loginResult.onSuccess { loginData ->
                loading = false
                pendingAutoLogin = false
                error = null
                info = if (loginData.isNewUser) "已为您创建账号并完成登录" else null
                onLoginSuccess(loginData.token, gson.toJson(loginData.user))
            }.onFailure { throwable ->
                loading = false
                pendingAutoLogin = false
                info = null
                error = throwable.message ?: "手机号授权登录失败"
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.entries.all { it.value }
        if (pendingAutoLogin) {
            if (granted) {
                performAutoLogin()
            } else {
                loading = false
                pendingAutoLogin = false
                info = null
                error = "未授予读取手机号权限，无法自动登录"
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(starLinkHeroGradient())
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    start = 48.dp,
                    end = 48.dp,
                    top = 90.dp,
                    bottom = navPadding.calculateBottomPadding() + 96.dp
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Top
        ) {
            AuthBrandLockup(
                modifier = Modifier
                    .size(width = 240.dp, height = 180.dp)
            )

            Spacer(modifier = Modifier.height(180.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        if (loading) return@Button
                        if (!agreed) {
                            error = "请阅读并同意用户协议和隐私条款"
                            return@Button
                        }
                        error = null
                        info = null
                        val missingPermissions = requiredPermissions.filter {
                            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
                        }
                        pendingAutoLogin = true
                        if (missingPermissions.isNotEmpty()) {
                            permissionLauncher.launch(missingPermissions.toTypedArray())
                        } else {
                            performAutoLogin()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StarLinkAccentOrange),
                    shape = RoundedCornerShape(24.dp),
                    enabled = !loading
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "授权手机号登陆",
                            color = StarLinkWhite,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                OutlinedButton(
                    onClick = { onRequestCodeLogin(null) },
                    modifier = Modifier
                        .fillMaxWidth()
                    .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.Transparent,
                        contentColor = StarLinkWhite
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, StarLinkWhite.copy(alpha = 0.5f))
                ) {
                    Text(
                        text = "验证码登陆",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = StarLinkWhite
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(horizontal = 4.dp)
                ) {
                    FigmaAgreementCheckbox(
                        checked = agreed,
                        onCheckedChange = onAgreedChange
                    )
                    FigmaAgreementText(
                        onPrivacyClick = onNavigatePrivacy,
                        onAgreementClick = onNavigateUserInstructions
                    )
                }

                if (error != null) {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                if (info != null) {
                    Text(
                        text = info!!,
                        color = Color(0xFF2E7D32),
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

private fun maskPhoneNumber(phone: String): String {
    return if (phone.length == 11) {
        phone.replaceRange(3, 7, "****")
    } else phone
}

@SuppressLint("MissingPermission")
private fun getDevicePhoneNumber(context: Context): String? {
    val hasReadState = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_PHONE_STATE
    ) == PackageManager.PERMISSION_GRANTED
    val hasReadNumbers = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_PHONE_NUMBERS
        ) == PackageManager.PERMISSION_GRANTED
    } else {
        true
    }

    if (!hasReadState || !hasReadNumbers) return null

    val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: return null
    return try {
        val rawNumber = telephonyManager.line1Number ?: return null
        val digits = rawNumber.filter { it.isDigit() }
        if (digits.length < 7) return null
        val normalized = when {
            digits.length >= 11 -> digits.takeLast(11)
            else -> digits
        }
        if (normalized.length == 11) normalized else null
    } catch (_: SecurityException) {
        null
    }
}
