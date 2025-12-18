package com.xlwl.AiMian.ui.auth

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.TelephonyManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.toggleableState
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.compose.ui.state.ToggleableState
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
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
    onRequestCodeLogin: (String?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val gson = remember { Gson() }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var pendingAutoLogin by remember { mutableStateOf(false) }
    var agreed by remember { mutableStateOf(true) } // 默认已同意

    // 根据Figma设计：渐变从31.65%位置开始过渡
    val gradient = remember {
        Brush.verticalGradient(
            colorStops = arrayOf(
                0f to Color(0xFF00ACC3),   // 顶部浅蓝色
                0.3165f to Color(0xFF00ACC3), // 保持到31.65%
                1f to Color(0xFFEBEBEB)    // 底部浅灰色
            )
        )
    }

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
            .background(gradient)
    ) {
        // 根据Figma设计：Logo距离顶部90px，Logo和按钮之间间距217px
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
            // Logo区域
            Image(
                painter = painterResource(id = R.drawable.login_logo),
                contentDescription = "Starlink Future logo",
                modifier = Modifier
                    .size(width = 192.dp, height = 120.dp)
            )

            // Logo和按钮之间的间距：217px
            Spacer(modifier = Modifier.height(217.dp))

            // 按钮和协议区域
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        if (loading) return@Button
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
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEC7C38)),
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
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // 验证码登录按钮：白色背景，灰色边框和文字
                OutlinedButton(
                    onClick = { onRequestCodeLogin(null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.White, // 白色背景
                        contentColor = Color(0xFFB5B7B8)
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB5B7B8))
                ) {
                    Text(
                        text = "验证码登陆",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFB5B7B8)
                    )
                }

                // 用户协议复选框和文字
                // 根据Figma设计：复选框14x14px，橙色背景，已选中
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(horizontal = 4.dp)
                ) {
                    AgreementCheckbox(
                        checked = agreed,
                        onCheckedChange = { agreed = it }
                    )
                    Text(
                        text = buildAnnotatedString {
                            append("我已阅读并同意")
                            withStyle(SpanStyle(color = Color(0xFF169BD5))) {
                                append("《用户须知》")
                            }
                            append("和")
                            withStyle(SpanStyle(color = Color(0xFF169BD5))) {
                                append("《隐私条款》")
                            }
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Light,
                        color = Color.Black,
                        lineHeight = 21.sp // 根据Figma设计：lineHeight 21
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

/**
 * 用户协议复选框组件
 * 根据Figma设计：14x14px，橙色背景 #EC7C38，白色勾选标记
 */
@Composable
private fun AgreementCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .size(14.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(
                color = if (checked) Color(0xFFEC7C38) else Color.White,
                shape = RoundedCornerShape(4.dp)
            )
            .border(
                width = 1.dp,
                color = if (checked) Color(0xFFEC7C38) else Color(0xFFB5B7B8),
                shape = RoundedCornerShape(4.dp)
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Checkbox
            ) { onCheckedChange(!checked) }
            .semantics { 
                toggleableState = if (checked) ToggleableState.On else ToggleableState.Off 
            },
        contentAlignment = Alignment.Center
    ) {
        if (checked) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(10.dp)
            )
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
