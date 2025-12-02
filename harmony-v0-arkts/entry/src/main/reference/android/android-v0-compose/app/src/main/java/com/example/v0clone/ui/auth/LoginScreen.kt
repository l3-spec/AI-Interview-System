package com.xlwl.AiMian.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.data.model.LoginRequest
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.google.gson.Gson

@Composable
fun LoginScreen(
    repo: AuthRepository,
    onLoginSuccess: (String, String) -> Unit, // token, userJson
    onGoRegister: () -> Unit
) {
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var sendingCode by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf<String?>(null) }
    var countdown by remember { mutableStateOf(0) }
    var timerJob by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()

    DisposableEffect(Unit) {
        onDispose {
            timerJob?.cancel()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFFFD6BA), // 橙粉色
                        Color(0xFFE3F2FD)  // 浅蓝色
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 标题
            Text(
                text = "欢迎回来",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2C2C2C)
                )
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "登录您的账户",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = Color(0xFF666666)
                )
            )
            Spacer(Modifier.height(40.dp))

            // 登录表单卡片
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp)
                ) {
                    val phoneValue = phone.trim()
                    val codeValue = code.trim()
                    val phoneValid = phoneValue.length == 11
                    val codeValid = codeValue.length == 6

                    // 手机号输入框
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { input ->
                            phone = input.filter { it.isDigit() }.take(11)
                        },
                        label = { Text("手机号") },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth(),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent
                        )
                    )
                    Spacer(Modifier.height(16.dp))

                    // 验证码输入 + 发送按钮
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = code,
                            onValueChange = { input ->
                                code = input.filter { it.isDigit() }.take(6)
                            },
                            label = { Text("验证码") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 56.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent
                            )
                        )
                        Spacer(Modifier.width(12.dp))
                        Button(
                            onClick = {
                                if (!phoneValid) {
                                    error = "请输入11位手机号"
                                    return@Button
                                }
                                sendingCode = true
                                error = null
                                info = null
                                scope.launch {
                                    val res = repo.requestLoginCode(SendCodeRequest(phoneValue))
                                    sendingCode = false
                                    res.onSuccess { data ->
                                        info = "验证码已发送，请注意查收短信"
                                        timerJob?.cancel()
                                        timerJob = scope.launch {
                                            var remaining = data.resendIn
                                            countdown = remaining
                                            while (remaining > 0) {
                                                delay(1000)
                                                remaining--
                                                countdown = remaining
                                            }
                                            countdown = 0
                                        }
                                    }.onFailure {
                                        error = it.message ?: "验证码发送失败"
                                        info = null
                                        countdown = 0
                                    }
                                }
                            },
                            enabled = !sendingCode && countdown == 0 && phoneValid,
                            modifier = Modifier
                                .height(48.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF8C42),
                                disabledContainerColor = Color(0xFFFFC29F),
                                disabledContentColor = Color.White.copy(alpha = 0.7f)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            when {
                                sendingCode -> {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                }
                                countdown > 0 -> {
                                    Text("${countdown}s")
                                }
                                else -> {
                                    Text("发送验证码")
                                }
                            }
                        }
                    }

                    // 错误提示
                    if (error != null) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = error!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    if (info != null) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = info!!,
                            color = Color(0xFF2E7D32),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    Spacer(Modifier.height(24.dp))

                    // 登录按钮
                    Button(
                        onClick = {
                            if (!phoneValid) {
                                error = "请输入11位手机号"
                                return@Button
                            }
                            if (!codeValid) {
                                error = "请输入收到的6位验证码"
                                return@Button
                            }
                            loading = true
                            error = null
                            scope.launch {
                                val res = repo.login(LoginRequest(phoneValue, codeValue))
                                loading = false
                                res.onSuccess { data ->
                                    onLoginSuccess(data.token, Gson().toJson(data.user))
                                }.onFailure { error = it.message }
                            }
                        },
                        enabled = !loading && phoneValid && codeValid,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF8C42) // 橙色主题
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White
                            )
                        } else {
                            Text(
                                "登录",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White
                                )
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // 注册链接
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "还没有账号？",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666)
                        )
                        TextButton(onClick = onGoRegister) {
                            Text(
                                "立即注册",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFFF8C42)
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}
