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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import com.xlwl.AiMian.data.model.LoginRequest
import com.xlwl.AiMian.data.model.SendCodeRequest
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.ui.design.StarLinkAccentOrange
import com.xlwl.AiMian.ui.design.StarLinkBackgroundGray
import com.xlwl.AiMian.ui.design.StarLinkPlaceholderGray
import com.xlwl.AiMian.ui.design.StarLinkPrimaryText
import com.xlwl.AiMian.ui.design.StarLinkWhite
import com.xlwl.AiMian.ui.design.starLinkHeroGradient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class LoginField { Phone, Code }

private val AuthCardShape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
private val AuthInputShape = RoundedCornerShape(19.dp)
private val AuthInputTextStyle = TextStyle(
    color = StarLinkPrimaryText,
    fontSize = 14.sp,
    fontWeight = FontWeight.Medium,
    lineHeight = 21.sp,
    letterSpacing = (-0.32).sp
)

@Composable
fun CodeLoginScreen(
    repo: AuthRepository,
    initialPhone: String? = null,
    onLoginSuccess: (String, String) -> Unit,
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
        } else {
            null
        }
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
        onDispose { timerJob?.cancel() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(starLinkHeroGradient())
    ) {
        val keyboardHeight = 290.dp
        val cardHeight = 416.dp
        val brandLockupHeight = 143.dp
        val brandTop = 90.dp
        val desiredGap = 120.dp
        val cardBottomOffset = if (showKeyboard) keyboardHeight else 0.dp

        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val availableHeight = (maxHeight - cardBottomOffset)
                .coerceAtLeast(brandTop + brandLockupHeight + cardHeight)
            val computedGap = (availableHeight - brandTop - brandLockupHeight - cardHeight)
                .coerceIn(0.dp, desiredGap)

            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = brandTop),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                AuthBrandLockup(
                    modifier = Modifier.size(width = 195.dp, height = brandLockupHeight)
                )
                Spacer(modifier = Modifier.height(computedGap))
            }

            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = cardBottomOffset)
                    .fillMaxWidth()
                    .height(cardHeight)
                    .shadow(elevation = 16.dp, shape = AuthCardShape),
                colors = CardDefaults.cardColors(containerColor = StarLinkWhite),
                shape = AuthCardShape
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 48.dp, end = 48.dp, top = 32.dp, bottom = 96.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "验证码登录",
                        color = StarLinkPrimaryText,
                        textAlign = TextAlign.Center,
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            lineHeight = 21.sp,
                            letterSpacing = (-0.32).sp
                        )
                    )

                    Spacer(modifier = Modifier.height(48.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        AuthInputField(
                            value = phoneField,
                            placeholder = "请输入手机号",
                            onValueChange = { newValue ->
                                val filtered = newValue.text.filter { it.isDigit() }.take(11)
                                phoneField = TextFieldValue(
                                    text = filtered,
                                    selection = TextRange(filtered.length)
                                )
                            },
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Next,
                            focusRequester = phoneFocusRequester,
                            onFocusChange = { isFocused ->
                                phoneFocused = isFocused
                                if (isFocused) {
                                    activeField = LoginField.Phone
                                    softwareKeyboardController?.hide()
                                }
                                updateKeyboardState()
                            },
                            onTap = {
                                activeField = LoginField.Phone
                                showKeyboard = true
                                phoneFocusRequester.requestFocus()
                            }
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AuthInputField(
                                value = codeField,
                                placeholder = "请输入验证码",
                                onValueChange = { newValue ->
                                    val filtered = newValue.text.filter { it.isDigit() }.take(6)
                                    codeField = TextFieldValue(
                                        text = filtered,
                                        selection = TextRange(filtered.length)
                                    )
                                },
                                keyboardType = KeyboardType.NumberPassword,
                                imeAction = ImeAction.Done,
                                focusRequester = codeFocusRequester,
                                onFocusChange = { isFocused ->
                                    codeFocused = isFocused
                                    if (isFocused) {
                                        activeField = LoginField.Code
                                        softwareKeyboardController?.hide()
                                    }
                                    updateKeyboardState()
                                },
                                onTap = {
                                    activeField = LoginField.Code
                                    showKeyboard = true
                                    codeFocusRequester.requestFocus()
                                },
                                modifier = Modifier.weight(1f)
                            )

                            CodeActionChip(
                                sendingCode = sendingCode,
                                countdown = countdown,
                                enabled = !sendingCode && countdown == 0,
                                onClick = {
                                    if (phone.length != 11) {
                                        error = "请输入11位手机号"
                                        return@CodeActionChip
                                    }
                                    sendingCode = true
                                    error = null
                                    info = null
                                    scope.launch {
                                        val result = repo.requestLoginCode(SendCodeRequest(phone))
                                        sendingCode = false
                                        result.onSuccess { data ->
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
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
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
                                    val result = repo.login(LoginRequest(phone, code))
                                    loading = false
                                    result.onSuccess { data ->
                                        onLoginSuccess(data.token, Gson().toJson(data.user))
                                    }.onFailure { error = it.message }
                                }
                            },
                            enabled = !loading && agreed && phone.length == 11 && code.length == 6,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = StarLinkAccentOrange,
                                disabledContainerColor = StarLinkAccentOrange.copy(alpha = 0.4f)
                            )
                        ) {
                            if (loading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = StarLinkWhite
                                )
                            } else {
                                Text(
                                    text = "注册/登陆",
                                    style = TextStyle(
                                        color = StarLinkWhite,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        lineHeight = 21.sp,
                                        letterSpacing = (-0.32).sp
                                    )
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            FigmaAgreementCheckbox(
                                checked = agreed,
                                onCheckedChange = { agreed = it }
                            )
                            FigmaAgreementText()
                        }
                    }

                    if (error != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = error!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    if (info != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = info!!,
                            color = Color(0xFF2E7D32),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showKeyboard,
            modifier = Modifier.fillMaxSize()
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable(
                            interactionSource = overlayInteractionSource,
                            indication = null,
                            role = Role.Button
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
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }
        }

        Box(
            modifier = Modifier
                .padding(start = 16.dp, top = 59.dp)
                .size(24.dp)
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
private fun AuthInputField(
    value: TextFieldValue,
    placeholder: String,
    onValueChange: (TextFieldValue) -> Unit,
    keyboardType: KeyboardType,
    imeAction: ImeAction,
    focusRequester: FocusRequester,
    onFocusChange: (Boolean) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(37.dp)
            .border(width = 1.dp, color = StarLinkPlaceholderGray, shape = AuthInputShape)
            .clickable(onClick = onTap)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .onFocusChanged { onFocusChange(it.isFocused) },
            singleLine = true,
            textStyle = AuthInputTextStyle,
            keyboardOptions = KeyboardOptions(
                imeAction = imeAction,
                keyboardType = keyboardType
            ),
            cursorBrush = SolidColor(StarLinkPrimaryText),
            decorationBox = { innerTextField ->
                if (value.text.isEmpty()) {
                    Text(
                        text = placeholder,
                        style = AuthInputTextStyle.copy(color = StarLinkPlaceholderGray)
                    )
                }
                innerTextField()
            }
        )
    }
}

@Composable
private fun CodeActionChip(
    sendingCode: Boolean,
    countdown: Int,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .width(71.dp)
            .height(37.dp)
            .border(width = 1.dp, color = StarLinkPlaceholderGray, shape = AuthInputShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        when {
            sendingCode -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(12.dp),
                    color = StarLinkPrimaryText,
                    strokeWidth = 1.dp
                )
            }

            countdown > 0 -> {
                Text(
                    text = "${countdown}s",
                    style = TextStyle(
                        color = StarLinkPrimaryText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Light,
                        lineHeight = 21.sp,
                        letterSpacing = (-0.32).sp
                    )
                )
            }

            else -> {
                Text(
                    text = "获取验证码",
                    style = TextStyle(
                        color = StarLinkPrimaryText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Light,
                        lineHeight = 21.sp,
                        letterSpacing = (-0.32).sp
                    )
                )
            }
        }
    }
}

private fun maskPhoneForDisplay(phone: String): String {
    return if (phone.length == 11) {
        phone.replaceRange(3, 7, "****")
    } else {
        phone
    }
}
