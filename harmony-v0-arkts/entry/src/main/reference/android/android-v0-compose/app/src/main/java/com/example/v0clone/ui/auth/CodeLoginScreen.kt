package com.xlwl.AiMian.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.buildAnnotatedString
import com.xlwl.AiMian.R
import com.xlwl.AiMian.data.model.LoginRequest
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
import com.google.gson.Gson
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.toggleableState
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue

private enum class LoginField { Phone, Code }

/**
 * 验证码登录页 - 严格按照Figma设计实现
 * 包含Logo、白色卡片、输入框、数字键盘
 */
@Composable
fun CodeLoginScreen(
    repo: AuthRepository,
    initialPhone: String? = null,
    onLoginSuccess: (String, String) -> Unit, // token, userJson
    onBackClick: () -> Unit
) {
    val initialPhoneSanitized = initialPhone?.filter { it.isDigit() }?.take(11).orEmpty()
    var phoneField by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(
            TextFieldValue(
                text = initialPhoneSanitized,
                selection = TextRange(initialPhoneSanitized.length)
            )
        )
    }
    var codeField by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(""))
    }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var sendingCode by remember { mutableStateOf(false) }
    val initialInfoMessage = remember(initialPhone) {
        if (!initialPhone.isNullOrBlank()) {
            "验证码已发送至 ${maskPhoneForDisplay(initialPhone)}，请输入收到的6位验证码"
        } else null
    }
    var info by remember { mutableStateOf(initialInfoMessage) }
    var countdown by remember { mutableStateOf(0) }
    var timerJob by remember { mutableStateOf<Job?>(null) }
    var activeField by remember { mutableStateOf<LoginField?>(null) }
    var showKeyboard by remember { mutableStateOf(false) }
    var phoneFocused by remember { mutableStateOf(false) }
    var codeFocused by remember { mutableStateOf(false) }
    var agreed by remember { mutableStateOf(true) }
    val phoneFocusRequester = remember { FocusRequester() }
    val codeFocusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val softwareKeyboardController = LocalSoftwareKeyboardController.current
    val scope = rememberCoroutineScope()
    val overlayInteractionSource = remember { MutableInteractionSource() }
    val phone = phoneField.text
    val code = codeField.text
    LaunchedEffect(initialPhone) {
        if (!initialPhone.isNullOrBlank()) {
            val normalized = initialPhone.filter { it.isDigit() }.take(11)
            if (phoneField.text != normalized) {
                phoneField = TextFieldValue(
                    text = normalized,
                    selection = TextRange(normalized.length)
                )
            }
        }
    }

    fun updateKeyboardState() {
        val shouldShow = phoneFocused || codeFocused
        showKeyboard = shouldShow
        if (!shouldShow) {
            activeField = null
        }
    }

    fun dismissKeyboard() {
        focusManager.clearFocus(force = true)
        phoneFocused = false
        codeFocused = false
        softwareKeyboardController?.hide()
        updateKeyboardState()
    }

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
                    colorStops = arrayOf(
                        0.0f to Color(0xFF00ACC3),
                        0.3165f to Color(0xFF00ACC3),
                        1f to Color(0xFFEBEBEB)
                    )
                )
            )
    ) {
        val cardBottomOffset = if (showKeyboard) 290.dp else 0.dp
        val cardHeight = 416.dp
        val logoTop = 90.dp
        val logoHeight = 120.dp
        val desiredGap = 120.dp

        BoxWithConstraints(
            modifier = Modifier.fillMaxSize()
        ) {
            val availableHeight = (maxHeight - cardBottomOffset).coerceAtLeast(cardHeight + logoTop + logoHeight)
            val computedGap = (availableHeight - cardHeight - logoTop - logoHeight).coerceIn(0.dp, desiredGap)

            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(logoTop))
                AppLogo(modifier = Modifier.size(width = 192.dp, height = logoHeight))
                Spacer(modifier = Modifier.height(computedGap))
            }

            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = cardBottomOffset)
                    .fillMaxWidth()
                    .height(cardHeight)
                    .shadow(
                        elevation = 16.dp,
                        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                    ),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(
                            start = 48.dp,
                            end = 48.dp,
                            top = 32.dp,
                            bottom = 96.dp
                        ),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "验证码登录",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF242525),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(48.dp))

                    Column(
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(37.dp)
                                .border(
                                    width = 1.dp,
                                    color = Color(0xFFB5B7B8),
                                    shape = RoundedCornerShape(19.dp)
                                )
                                .clickable {
                                    activeField = LoginField.Phone
                                    showKeyboard = true
                                    phoneFocusRequester.requestFocus()
                                }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            BasicTextField(
                                value = phoneField,
                                onValueChange = { newValue ->
                                    val filtered = newValue.text.filter { it.isDigit() }.take(11)
                                    phoneField = TextFieldValue(
                                        text = filtered,
                                        selection = TextRange(filtered.length)
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .focusRequester(phoneFocusRequester)
                                    .onFocusChanged { state ->
                                        phoneFocused = state.isFocused
                                        if (state.isFocused) {
                                            activeField = LoginField.Phone
                                            softwareKeyboardController?.hide()
                                        }
                                        updateKeyboardState()
                                    },
                                singleLine = true,
                                textStyle = TextStyle(
                                    color = Color(0xFF242525),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                ),
                                keyboardOptions = KeyboardOptions(
                                    imeAction = ImeAction.Next,
                                    keyboardType = KeyboardType.Number
                                ),
                                cursorBrush = SolidColor(Color(0xFF242525)),
                                decorationBox = { innerTextField ->
                                    if (phone.isEmpty()) {
                                        Text(
                                            text = "请输入手机号",
                                            color = Color(0xFFB5B7B8),
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                    innerTextField()
                                }
                            )
                        }
                        
                        // 验证码输入框和获取验证码按钮 - 严格按照Figma布局
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(37.dp)
                                    .border(
                                        width = 1.dp,
                                        color = Color(0xFFB5B7B8),
                                        shape = RoundedCornerShape(19.dp)
                                    )
                                    .clickable {
                                        activeField = LoginField.Code
                                        showKeyboard = true
                                        codeFocusRequester.requestFocus()
                                    }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                contentAlignment = Alignment.CenterStart
                            ) {
                                BasicTextField(
                                    value = codeField,
                                    onValueChange = { newValue ->
                                        val filtered = newValue.text.filter { it.isDigit() }.take(6)
                                        codeField = TextFieldValue(
                                            text = filtered,
                                            selection = TextRange(filtered.length)
                                        )
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .focusRequester(codeFocusRequester)
                                        .onFocusChanged { state ->
                                            codeFocused = state.isFocused
                                            if (state.isFocused) {
                                                activeField = LoginField.Code
                                                softwareKeyboardController?.hide()
                                            }
                                            updateKeyboardState()
                                        },
                                    singleLine = true,
                                    textStyle = TextStyle(
                                        color = Color(0xFF242525),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium
                                    ),
                                    keyboardOptions = KeyboardOptions(
                                        imeAction = ImeAction.Done,
                                        keyboardType = KeyboardType.NumberPassword
                                    ),
                                    cursorBrush = SolidColor(Color(0xFF242525)),
                                    decorationBox = { innerTextField ->
                                        if (code.isEmpty()) {
                                            Text(
                                                text = "请输入验证码",
                                                color = Color(0xFFB5B7B8),
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        innerTextField()
                                    }
                                )
                            }
                            
                            // 获取验证码按钮
                            Box(
                                modifier = Modifier
                                    .width(71.dp)
                                    .height(37.dp)
                                    .border(
                                        width = 1.dp,
                                        color = Color(0xFFB5B7B8),
                                        shape = RoundedCornerShape(19.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 8.dp)
                                    .clickable(enabled = !sendingCode && countdown == 0) {
                                        if (phone.length != 11) {
                                            error = "请输入11位手机号"
                                            return@clickable
                                        }
                                        sendingCode = true
                                        error = null
                                        info = null
                                        scope.launch {
                                            val res = repo.requestLoginCode(SendCodeRequest(phone))
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
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                when {
                                    sendingCode -> {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(12.dp),
                                            color = Color(0xFF242525),
                                            strokeWidth = 1.dp
                                        )
                                    }
                                    countdown > 0 -> {
                                        Text(
                                            "${countdown}s",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Light,
                                            color = Color(0xFF242525)
                                        )
                                    }
                                    else -> {
                                        Text(
                                            "获取验证码",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Light,
                                            color = Color(0xFF242525)
        )
    }
}
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Column(
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                if (phone.length != 11) {
                                    error = "请输入11位手机号"
                                    return@Button
                                }
                                if (code.length != 6) {
                                    error = "请输入收到的6位验证码"
                                    return@Button
                                }
                                loading = true
                                error = null
                                scope.launch {
                                    val res = repo.login(LoginRequest(phone, code))
                                    loading = false
                                    res.onSuccess { data ->
                                        onLoginSuccess(data.token, Gson().toJson(data.user))
                                    }.onFailure { error = it.message }
                                }
                            },
                            enabled = !loading && agreed && phone.length == 11 && code.length == 6,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFEC7C38),
                                disabledContainerColor = Color(0xFFEC7C38).copy(alpha = 0.4f)
                            ),
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            if (loading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White
                                )
                            } else {
                                Text(
                                    "注册/登陆",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            AgreementCheckbox(
                                checked = agreed,
                                onCheckedChange = { agreed = it }
                            )
                            AgreementText(
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    if (error != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = error!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp
                        )
                    }
                    
                    if (info != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = info!!,
                            color = Color(0xFF2E7D32),
                            fontSize = 12.sp
                        )
                    }
                }
            }

            AnimatedVisibility(visible = showKeyboard, modifier = Modifier.fillMaxSize()) {
                Box(modifier = Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable(
                                interactionSource = overlayInteractionSource,
                                indication = null
                            ) { dismissKeyboard() }
                    )

                    NumericKeyboard(
                        onKeyPress = { key ->
                            when (key) {
                                "backspace" -> {
                                    when (activeField) {
                                        LoginField.Phone -> if (phone.isNotEmpty()) {
                                            val updated = phone.dropLast(1)
                                            phoneField = phoneField.copy(
                                                text = updated,
                                                selection = TextRange(updated.length)
                                            )
                                        }
                                        LoginField.Code -> if (code.isNotEmpty()) {
                                            val updated = code.dropLast(1)
                                            codeField = codeField.copy(
                                                text = updated,
                                                selection = TextRange(updated.length)
                                            )
                                        }
                                        null -> Unit
                                    }
                                }
                                else -> {
                                    when (activeField) {
                                        LoginField.Phone -> if (phone.length < 11) {
                                            val updated = phone + key
                                            phoneField = phoneField.copy(
                                                text = updated,
                                                selection = TextRange(updated.length)
                                            )
                                        }
                                        LoginField.Code -> if (code.length < 6) {
                                            val updated = code + key
                                            codeField = codeField.copy(
                                                text = updated,
                                                selection = TextRange(updated.length)
                                            )
                                        }
                                        null -> Unit
                                    }
                                }
                            }
                        },
                        onDismiss = { dismissKeyboard() },
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                    )
                }
            }
        }
        
        Box(
            modifier = Modifier
                .padding(start = 16.dp, top = 59.dp)
                .size(24.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(
                    interactionSource = overlayInteractionSource,
                    indication = null,
                    onClick = onBackClick
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "返回",
                tint = Color.Black
            )
        }
    }
}

@Composable
private fun AppLogo(modifier: Modifier = Modifier) {
    androidx.compose.foundation.Image(
        painter = androidx.compose.ui.res.painterResource(id = R.drawable.login_logo),
        contentDescription = "星链未来 Logo",
        modifier = modifier
    )
}

@Composable
private fun AgreementCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .size(18.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(
                color = if (checked) Color(0xFFEC7C38) else Color.White,
                shape = RoundedCornerShape(4.dp)
            )
            .border(
                width = 1.dp,
                color = Color(0xFFB5B7B8),
                shape = RoundedCornerShape(4.dp)
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Checkbox
            ) { onCheckedChange(!checked) }
            .semantics { toggleableState = if (checked) ToggleableState.On else ToggleableState.Off },
        contentAlignment = Alignment.Center
    ) {
        if (checked) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(12.dp)
            )
        }
    }
}

@Composable
private fun AgreementText(modifier: Modifier = Modifier) {
    val agreementText = buildAnnotatedString {
        append("我已阅读并同意")
        withStyle(style = SpanStyle(color = Color(0xFF169BD5))) {
            append("《用户须知》")
        }
        append("和")
        withStyle(style = SpanStyle(color = Color(0xFF169BD5))) {
            append("《隐私条款》")
        }
    }

    Text(
        text = agreementText,
        fontSize = 12.sp,
        fontWeight = FontWeight.Light,
        color = Color(0xFF242525),
        lineHeight = 18.sp,
        modifier = modifier
    )
}

private fun maskPhoneForDisplay(phone: String): String {
    return if (phone.length == 11) {
        phone.replaceRange(3, 7, "****")
    } else phone
}
