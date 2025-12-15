package com.xlwl.AiMian.ui.profile

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.model.VerificationInfo
import com.xlwl.AiMian.data.model.VerificationStatusType
import com.xlwl.AiMian.data.repository.VerificationRepository
import com.xlwl.AiMian.ui.components.CompactTopBar
import java.io.File
import kotlinx.coroutines.launch

private val GradientTop = Color(0xFF00ACC3)
private val GradientBottom = Color(0xFFE9F7F9)
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
    onBack: () -> Unit
) {
    val viewModel: VerificationViewModel = viewModel(
        factory = VerificationViewModel.provideFactory(repository)
    )
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

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
        onLegalPersonChange = viewModel::updateLegalPerson,
        onRegistrationNumberChange = viewModel::updateRegistrationNumber,
        onLicenseSelected = viewModel::selectLicense,
        onClearLocalLicense = viewModel::clearLocalLicense,
        onSubmit = viewModel::submit
    )
}

@Composable
private fun VerificationScreen(
    uiState: VerificationUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onLegalPersonChange: (String) -> Unit,
    onRegistrationNumberChange: (String) -> Unit,
    onLicenseSelected: (File, String) -> Unit,
    onClearLocalLicense: () -> Unit,
    onSubmit: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val pickLicenseLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            val file = persistIdCardToCache(context, uri)
            if (file != null) {
                onLicenseSelected(file, file.absolutePath)
            } else {
                scope.launch { snackbarHostState.showSnackbar("选择图片失败，请重试") }
            }
        }
    }
    val statusType = VerificationStatusType.fromStatus(uiState.status?.status)
    val licensePreview = uiState.localLicensePath ?: uiState.businessLicenseUrl
    val isApproved = statusType == VerificationStatusType.APPROVED

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(GradientTop, GradientBottom),
                    startY = 0f,
                    endY = 720f
                )
            )
    ) {
        Scaffold(
            topBar = {
                CompactTopBar(
                    title = "实名认证",
                    onBack = onBack,
                    containerColor = Color.White,
                    contentColor = Color.Black
                )
            },
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
            containerColor = Color.Transparent
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
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatusCard(
                        statusType = statusType,
                        status = uiState.status,
                        onRefresh = onRefresh
                    )

                    if (statusType == VerificationStatusType.REJECTED && !uiState.status?.reviewComments.isNullOrBlank()) {
                        ReviewCommentCard(uiState.status?.reviewComments.orEmpty())
                    }

                    FormCard(
                        legalPerson = uiState.legalPerson,
                        registrationNumber = uiState.registrationNumber,
                        enabled = !isApproved && !uiState.submitting,
                        onLegalPersonChange = onLegalPersonChange,
                        onRegistrationNumberChange = onRegistrationNumberChange
                    )

                    IdCardUploadCard(
                        preview = licensePreview,
                        isApproved = isApproved,
                        isSubmitting = uiState.submitting,
                        onPick = {
                            pickLicenseLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        onClear = onClearLocalLicense
                    )

                    TipsCard(statusType = statusType)

                    Button(
                        onClick = onSubmit,
                        enabled = !uiState.submitting && !isApproved,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AccentOrange,
                            disabledContainerColor = AccentOrange.copy(alpha = 0.3f)
                        )
                    ) {
                        if (uiState.submitting) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
                            Text(
                                text = when (statusType) {
                                    VerificationStatusType.NOT_SUBMITTED -> "提交认证"
                                    VerificationStatusType.REJECTED -> "重新提交认证"
                                    VerificationStatusType.PENDING -> "更新资料"
                                    VerificationStatusType.APPROVED -> "已通过认证"
                                },
                                style = MaterialTheme.typography.titleMedium.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold
                                )
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun StatusCard(
    statusType: VerificationStatusType,
    status: VerificationInfo?,
    onRefresh: () -> Unit
) {
    val (label, desc, color) = when (statusType) {
        VerificationStatusType.NOT_SUBMITTED -> Triple("未认证", "提交身份证信息，完成个人实名认证", Color(0xFF606266))
        VerificationStatusType.PENDING -> Triple("审核中", "资料已提交，预计1-2个工作日完成核验", WarningYellow)
        VerificationStatusType.APPROVED -> Triple("已认证", "个人身份已验证，可正常使用全部功能", SuccessGreen)
        VerificationStatusType.REJECTED -> Triple("已驳回", status?.reviewComments?.takeIf { it.isNotBlank() }
            ?: "资料未通过审核，请根据反馈重新提交", ErrorRed)
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatusBadge(text = label, color = color)
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF303133))
                    )
                }
                if (!status?.updatedAt.isNullOrBlank() && statusType != VerificationStatusType.NOT_SUBMITTED) {
                    Text(
                        text = "最近更新：${status?.updatedAt.orEmpty()}",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF909399),
                            fontSize = 12.sp
                        )
                    )
                }
            }
            IconButton(onClick = onRefresh) {
                Icon(
                    imageVector = Icons.Outlined.Refresh,
                    contentDescription = "刷新",
                    tint = Color(0xFF606266)
                )
            }
        }
    }
}

@Composable
private fun ReviewCommentCard(comment: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Outlined.ErrorOutline,
                contentDescription = null,
                tint = ErrorRed
            )
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "审核反馈",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF2C2F36)
                    )
                )
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = Color(0xFF606266),
                        lineHeight = 20.sp
                    )
                )
            }
        }
    }
}

@Composable
private fun FormCard(
    legalPerson: String,
    registrationNumber: String,
    enabled: Boolean,
    onLegalPersonChange: (String) -> Unit,
    onRegistrationNumberChange: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "身份信息",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            )
            Text(
                text = "用于个人实名认证，与企业端后台区分，请填写与身份证一致的信息。",
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF606266))
            )
            OutlinedTextField(
                value = legalPerson,
                onValueChange = onLegalPersonChange,
                label = { Text("姓名") },
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = registrationNumber,
                onValueChange = onRegistrationNumberChange,
                label = { Text("身份证号码") },
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }
    }
}

@Composable
private fun IdCardUploadCard(
    preview: String?,
    isApproved: Boolean,
    isSubmitting: Boolean,
    onPick: () -> Unit,
    onClear: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "身份证照片",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            )
            IdCardPreview(preview = preview)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onPick,
                    enabled = !isApproved && !isSubmitting,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = AccentOrange
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CloudUpload,
                        contentDescription = null,
                        tint = AccentOrange
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text("上传/更换")
                }
                TextButton(
                    onClick = onClear,
                    enabled = preview != null && !isApproved && !isSubmitting,
                    modifier = Modifier.height(44.dp)
                ) {
                    Text("清除", color = Color(0xFF606266))
                }
            }
            Text(
                text = "请上传本人身份证正反面照片，画面清晰无遮挡，支持常见图片格式。",
                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF606266))
            )
        }
    }
}

@Composable
private fun IdCardPreview(preview: String?) {
    val gradient = Brush.linearGradient(
        colors = listOf(Color(0xFFE8F7FF), Color(0xFFD7ECFF))
    )
    Card(
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE6E7EB)),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(gradient),
            contentAlignment = Alignment.Center
        ) {
            if (preview.isNullOrEmpty()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CloudUpload,
                        contentDescription = null,
                        tint = Color(0xFF9DA3AE),
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = "上传身份证照片",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color(0xFF9DA3AE),
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
            } else {
                AsyncImage(
                    model = preview,
                    contentDescription = "身份证预览",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                        .clip(RoundedCornerShape(10.dp)),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}

@Composable
private fun TipsCard(statusType: VerificationStatusType) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = InfoBlue
                )
                Text(
                    text = "提交提示",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.SemiBold
                    )
                )
            }
            Text(
                text = "确保姓名、身份证号码与上传照片一致，必要时会进行人脸识别核验以确认本人操作。",
                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF606266))
            )
            HorizontalDivider(color = CardStroke)
            Text(
                text = when (statusType) {
                    VerificationStatusType.PENDING -> "审核中期间可再次提交更新资料，新提交会覆盖旧申请。"
                    VerificationStatusType.REJECTED -> "根据审核反馈调整后重新提交，一般可在1个工作日内重新审核。"
                    VerificationStatusType.APPROVED -> "认证通过后资料将锁定，如需修改请联系平台客服。"
                    VerificationStatusType.NOT_SUBMITTED -> "完整提交资料后，预计1-2个工作日完成审核。"
                },
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color(0xFF7A7E85),
                    lineHeight = 18.sp
                )
            )
        }
    }
}

@Composable
private fun StatusBadge(text: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = color,
                fontWeight = FontWeight.SemiBold
            )
        )
    }
}

private fun persistIdCardToCache(context: Context, uri: Uri): File? {
    return runCatching {
        val extension = when (context.contentResolver.getType(uri)) {
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/gif" -> "gif"
            else -> "jpg"
        }
        val tempFile = File(context.cacheDir, "idcard-${System.currentTimeMillis()}.$extension")
        context.contentResolver.openInputStream(uri)?.use { input ->
            tempFile.outputStream().use { output ->
                input.copyTo(output)
            }
        } ?: return null
        tempFile
    }.getOrNull()
}
