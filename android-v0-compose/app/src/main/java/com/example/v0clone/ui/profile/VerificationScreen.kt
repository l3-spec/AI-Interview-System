package com.xlwl.AiMian.ui.profile

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import com.xlwl.AiMian.R
import com.xlwl.AiMian.ui.design.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.data.model.VerificationInfo
import com.xlwl.AiMian.data.model.VerificationStatusType
import com.xlwl.AiMian.data.repository.VerificationRepository
import com.xlwl.AiMian.ui.components.CompactTopBar
import com.xlwl.AiMian.data.auth.AuthManager
import kotlinx.coroutines.launch

private val GradientTop = Color(0xFF00ACC3)
private val GradientMid = Color(0xFF40C4D8)
private val GradientBottom = Color(0xFFE9F7F9)
private val PageGradient = Brush.verticalGradient(
    colors = listOf(GradientTop, GradientMid, GradientBottom),
    startY = 0f,
    endY = Float.POSITIVE_INFINITY
)
private val CardBackground = Color.White.copy(alpha = 0.96f)
private val AccentOrange = Color(0xFFEC7C38)
private val CardStroke = Color(0xFFE6E7EB)
private val SuccessGreen = Color(0xFF1BC184)
private val WarningYellow = Color(0xFFFFB74D)
private val ErrorRed = Color(0xFFE57373)
private val InfoBlue = Color(0xFF4FC3F7)

@Composable
fun VerificationRoute(
    repository: VerificationRepository,
    authManager: AuthManager,
    onBack: () -> Unit
) {
    val viewModel: VerificationViewModel = viewModel(
        factory = VerificationViewModel.provideFactory(repository, authManager)
    )
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            // 给用户一点反馈时间再返回
            kotlinx.coroutines.delay(1500)
            onBack()
        }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    LaunchedEffect(uiState.message) {
        uiState.message?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    VerificationScreen(
        uiState = uiState,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onRefresh = { viewModel.loadStatus() },
        onRealNameChange = viewModel::updateRealName,
        onIdNumberChange = viewModel::updateIdNumber,
        onPhoneChange = viewModel::updatePhoneNumber,
        onCodeChange = viewModel::updateVerificationCode,
        onSendCode = viewModel::sendVerificationCode,
        onToggleAgreement = viewModel::toggleAgreement,
        onSubmit = viewModel::submit
    )
}

@Composable
private fun VerificationScreen(
    uiState: VerificationUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onRealNameChange: (String) -> Unit,
    onIdNumberChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSendCode: () -> Unit,
    onToggleAgreement: (Boolean) -> Unit,
    onSubmit: () -> Unit
) {
    val view = LocalView.current
    val statusBarColor = Color.White

    // Set status bar color to match page gradient
    if (!view.isInEditMode) {
        androidx.compose.runtime.SideEffect {
            val window = (view.context as ComponentActivity).window
            window.statusBarColor = statusBarColor.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }
    val statusType = VerificationStatusType.fromStatus(uiState.status?.status)
    val isApproved = statusType == VerificationStatusType.APPROVED
    val navPadding = WindowInsets.navigationBars.asPaddingValues()

    Scaffold(
        containerColor = Color.White,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .statusBarsPadding()
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.padding(start = 8.dp, top = 8.dp)
                ) {
                    Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.ArrowBack,
                        contentDescription = "返回",
                        tint = Color.Black,
                        modifier = Modifier.size(24.dp)
                    )
                }
                
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 16.dp)
                ) {
                    Text(
                        text = "实名认证",
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 32.sp,
                            color = Color(0xFF1A1A1A)
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "根据国家法律要求，为了保障您的权益，请完成实名认证。",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color(0xFF999999),
                            lineHeight = 20.sp
                        )
                    )
                }
            }
        },
        snackbarHost = { 
            SnackbarHost(hostState = snackbarHostState) { data ->
                Card(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (data.visuals.message.contains("成功")) SuccessGreen else Color(0xFF323232)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = if (data.visuals.message.contains("成功")) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = Color.White
                        )
                        Text(
                            text = data.visuals.message,
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    ) { padding ->
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    if (statusType == VerificationStatusType.APPROVED) {
                        ApprovedStatusSection(uiState.status)
                    } else {
                        // Rejection feedback
                        if (statusType == VerificationStatusType.REJECTED && !uiState.status?.reviewComments.isNullOrBlank()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(ErrorRed.copy(alpha = 0.1f))
                                    .padding(16.dp)
                            ) {
                                Text(
                                    text = "未通过原因：${uiState.status?.reviewComments}",
                                    color = ErrorRed,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        // Identity Section
                        SectionHeader(title = "身份信息")
                        
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            ModernTextField(
                                value = uiState.realName,
                                onValueChange = onRealNameChange,
                                placeholder = "请输入您的真实姓名",
                                label = "真实姓名",
                                enabled = !uiState.submitting
                            )
                            
                            ModernTextField(
                                value = uiState.idNumber,
                                onValueChange = onIdNumberChange,
                                placeholder = "请输入18位身份证号",
                                label = "身份证号",
                                enabled = !uiState.submitting
                            )
                        }

                        // Phone Section
                        SectionHeader(title = "手机验证")
                        
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            ModernTextField(
                                value = uiState.phoneNumber,
                                onValueChange = onPhoneChange,
                                placeholder = "请输入手机号码",
                                label = "手机号码",
                                enabled = !uiState.submitting
                            )
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.Bottom
                            ) {
                                ModernTextField(
                                    value = uiState.verificationCode,
                                    onValueChange = onCodeChange,
                                    placeholder = "请输入验证码",
                                    label = "验证码",
                                    modifier = Modifier.weight(1f),
                                    enabled = !uiState.submitting
                                )
                                
                                TextButton(
                                    onClick = onSendCode,
                                    enabled = uiState.phoneNumber.length == 11 && uiState.countdown == 0 && !uiState.isSendingCode,
                                    modifier = Modifier.padding(bottom = 4.dp)
                                ) {
                                    Text(
                                        text = when {
                                            uiState.isSendingCode -> "发送中..."
                                            uiState.countdown > 0 -> "${uiState.countdown}s"
                                            else -> "获取验证码"
                                        },
                                        color = if (uiState.phoneNumber.length == 11 && uiState.countdown == 0) AccentOrange else Color(0xFFBFBFBF),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.weight(1f))

                        // Agreement and Submit
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Checkbox(
                                    checked = uiState.isAgreed,
                                    onCheckedChange = onToggleAgreement,
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = AccentOrange,
                                        uncheckedColor = Color(0xFFD9D9D9)
                                    )
                                )
                                Text(
                                    text = "我已阅读并同意《用户协议》和《隐私政策》",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Color(0xFF8C8C8C)
                                    )
                                )
                            }

                            Button(
                                onClick = onSubmit,
                                enabled = !uiState.submitting && isFormValid(uiState),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(54.dp),
                                shape = RoundedCornerShape(27.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = AccentOrange,
                                    disabledContainerColor = AccentOrange.copy(alpha = 0.4f)
                                )
                            ) {
                                if (uiState.submitting) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                                } else {
                                    Text(
                                        text = "开始认证",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp + navPadding.calculateBottomPadding()))
                }
            }
    }
}

@Composable
private fun ApprovedStatusSection(status: VerificationInfo?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Outlined.CheckCircle,
            contentDescription = null,
            tint = SuccessGreen,
            modifier = Modifier.size(80.dp)
        )
        Text(
            text = "您已完成实名认证",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1F1F1F)
            )
        )
        Text(
            text = "身份信息已通过安全核验",
            style = MaterialTheme.typography.bodyMedium.copy(
                color = Color(0xFF8C8C8C)
            )
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall.copy(
            fontWeight = FontWeight.Bold,
            color = Color(0xFF1F1F1F)
        ),
        modifier = Modifier.padding(top = 8.dp)
    )
}

@Composable
private fun ModernTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.copy(
                color = Color(0xFF8C8C8C),
                fontWeight = FontWeight.Medium
            )
        )
        TextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = Color(0xFFBFBFBF)) },
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = true,
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color(0xFFF7F8FA),
                unfocusedContainerColor = Color(0xFFF7F8FA),
                disabledContainerColor = Color(0xFFF7F8FA).copy(alpha = 0.5f),
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
                cursorColor = AccentOrange
            ),
            shape = RoundedCornerShape(12.dp),
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                color = Color(0xFF1F1F1F),
                fontWeight = FontWeight.Medium
            )
        )
    }
}

private fun isFormValid(uiState: VerificationUiState): Boolean {
    return uiState.realName.isNotBlank() && 
           uiState.idNumber.length == 18 &&
           uiState.phoneNumber.length == 11 && 
           uiState.verificationCode.length >= 4 &&
           uiState.isAgreed &&
           !uiState.isSendingCode
}

