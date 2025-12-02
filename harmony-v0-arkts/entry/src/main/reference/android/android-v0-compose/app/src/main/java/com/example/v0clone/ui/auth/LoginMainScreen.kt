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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.model.LoginRequest
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
import com.google.gson.Gson
import kotlinx.coroutines.launch

/**
 * 主登录页 - 根据Figma设计实现
 * 包含Logo、两个登录按钮（授权手机号登录、验证码登录）
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

    val gradient = remember {
        Brush.verticalGradient(
            colors = listOf(Color(0xFF00ACC3), Color(0xFFEBEBEB))
        )
    }

    val requiredPermissions = remember {
        val permissions = mutableListOf(Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            permissions.add(Manifest.permission.READ_PHONE_NUMBERS)
        }
        permissions.toTypedArray()
    }

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
            val sendResult = repo.requestLoginCode(SendCodeRequest(phone))
            sendResult.onSuccess { data ->
                val code = data.code
                if (code.isNullOrEmpty()) {
                    loading = false
                    pendingAutoLogin = false
                    info = "验证码已发送至 ${maskPhoneNumber(phone)}，请手动输入验证码完成登录"
                    onRequestCodeLogin(phone)
                } else {
                    val loginResult = repo.login(LoginRequest(phone, code))
                    loginResult.onSuccess { loginData ->
                        loading = false
                        pendingAutoLogin = false
                        info = null
                        error = null
                        onLoginSuccess(loginData.token, gson.toJson(loginData.user))
                    }.onFailure { throwable ->
                        loading = false
                        pendingAutoLogin = false
                        info = null
                        error = throwable.message ?: "登录失败，请稍后重试"
                    }
                }
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp, vertical = 90.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(42.dp))
            Image(
                painter = painterResource(id = R.drawable.login_logo),
                contentDescription = "Starlink Future logo",
                modifier = Modifier
                    .size(width = 192.dp, height = 120.dp)
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
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

                OutlinedButton(
                    onClick = { onRequestCodeLogin(null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB5B7B8)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB5B7B8))
                ) {
                    Text(
                        text = "验证码登陆",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFB5B7B8)
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        modifier = Modifier.size(14.dp),
                        color = Color(0xFFEC7C38),
                        shape = CircleShape
                    ) {}
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
                        lineHeight = 16.sp
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
