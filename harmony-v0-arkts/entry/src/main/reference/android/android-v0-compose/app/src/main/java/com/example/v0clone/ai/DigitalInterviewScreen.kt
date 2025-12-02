package com.xlwl.AiMian.ai

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView

/**
 * 数字人面试页面，按照 STAR-LINK Figma 设计实现。
 */
@Composable
fun DigitalInterviewScreen(
    uiState: DigitalInterviewUiState,
    onBackClick: () -> Unit,
    onStartAnswer: () -> Unit,
    onRetry: () -> Unit
) {
    val context = LocalContext.current
    var hasCameraPermission by remember { mutableStateOf(false) }
    var hasMicrophonePermission by remember { mutableStateOf(false) }
    var isCameraEnabled by remember { mutableStateOf(false) }
    var showPermissionDialog by remember { mutableStateOf(false) }

    val requiredPermissions = remember {
        arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: hasCameraPermission
        val micGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: hasMicrophonePermission
        hasCameraPermission = cameraGranted
        hasMicrophonePermission = micGranted
        if (cameraGranted) {
            isCameraEnabled = true
        }
        showPermissionDialog = !(cameraGranted && micGranted)
    }

    LaunchedEffect(Unit) {
        val cameraGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        val micGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        hasCameraPermission = cameraGranted
        hasMicrophonePermission = micGranted
        if (cameraGranted) {
            isCameraEnabled = true
        }
        if (!cameraGranted || !micGranted) {
            showPermissionDialog = true
        }
    }

    LaunchedEffect(hasCameraPermission) {
        if (!hasCameraPermission) {
            isCameraEnabled = false
        }
    }

    LaunchedEffect(hasCameraPermission, hasMicrophonePermission) {
        if (hasCameraPermission && hasMicrophonePermission) {
            showPermissionDialog = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        VideoBackground(uiState.videoUrl)
        GradientOverlay()

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 24.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                TopSection(
                    currentQuestion = uiState.currentQuestion,
                    totalQuestions = uiState.totalQuestions,
                    onBackClick = onBackClick,
                    hasCameraPermission = hasCameraPermission,
                    hasMicrophonePermission = hasMicrophonePermission,
                    isCameraEnabled = isCameraEnabled,
                    onRequestPermissions = { showPermissionDialog = true }
                )

                BottomSection(
                    uiState = uiState,
                    onStartAnswer = onStartAnswer
                )
            }

            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                    uiState.statusMessage?.let {
                        Text(
                            text = it,
                            color = Color.White,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(top = 72.dp)
                        )
                    }
                }
            } else if (uiState.errorMessage != null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = uiState.errorMessage,
                            color = Color.White,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onRetry) {
                            Text("重试连接")
                        }
                    }
                }
            }
        }
    }

    if (showPermissionDialog && (!hasCameraPermission || !hasMicrophonePermission)) {
        AlertDialog(
            onDismissRequest = { showPermissionDialog = false },
            title = { Text(text = "需要摄像头与麦克风权限") },
            text = {
                Text(
                    text = "数字人面试需要摄像头用于画面预览，并使用麦克风采集你的回答。请授权后继续。"
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showPermissionDialog = false
                        permissionLauncher.launch(requiredPermissions)
                    }
                ) {
                    Text("立即授权")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPermissionDialog = false }) {
                    Text("稍后再说")
                }
            }
        )
    }
}

@Composable
private fun TopSection(
    currentQuestion: Int,
    totalQuestions: Int,
    onBackClick: () -> Unit,
    hasCameraPermission: Boolean,
    hasMicrophonePermission: Boolean,
    isCameraEnabled: Boolean,
    onRequestPermissions: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            BackButton(onClick = onBackClick)
            MiniUserPreview(
                hasCameraPermission = hasCameraPermission,
                hasMicrophonePermission = hasMicrophonePermission,
                isCameraEnabled = isCameraEnabled,
                onRequestPermissions = onRequestPermissions
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        QuestionTagChip(
            currentQuestion = currentQuestion,
            totalQuestions = totalQuestions
        )
    }
}

@Composable
private fun BottomSection(
    uiState: DigitalInterviewUiState,
    onStartAnswer: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        QuestionStatusCard(
            isSpeaking = uiState.isSpeaking,
            questionText = uiState.questionText,
            timeRemaining = uiState.timeRemaining,
            statusMessage = uiState.statusMessage
        )

        StartAnswerButton(
            text = if (uiState.isSpeaking) "开始答题" else "继续下一题",
            onClick = onStartAnswer
        )
    }
}

@Composable
private fun GradientOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color.Black.copy(alpha = 0.65f),
                        Color.Black.copy(alpha = 0.25f),
                        Color.Transparent,
                        Color.Transparent,
                        Color.Black.copy(alpha = 0.75f)
                    )
                )
            )
    )
}

@Composable
private fun VideoBackground(videoUrl: String?) {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0F1A))
    ) {
        when {
            videoUrl.isNullOrBlank() -> {
                Icon(
                    imageVector = Icons.Filled.Videocam,
                    contentDescription = "数字人占位",
                    tint = Color.White.copy(alpha = 0.12f),
                    modifier = Modifier
                        .size(120.dp)
                        .align(Alignment.Center)
                )
            }

            videoUrl.startsWith("http", ignoreCase = true) -> {
                val mediaItem = remember(videoUrl) {
                    val builder = MediaItem.Builder().setUri(videoUrl)
                    if (videoUrl.endsWith(".m3u8", ignoreCase = true)) {
                        builder.setMimeType(MimeTypes.APPLICATION_M3U8)
                    }
                    builder.build()
                }

                val exoPlayer = remember(videoUrl) {
                    ExoPlayer.Builder(context).build().apply {
                        setMediaItem(mediaItem)
                        repeatMode = Player.REPEAT_MODE_ALL
                        playWhenReady = true
                        prepare()
                    }
                }

                DisposableEffect(exoPlayer) {
                    onDispose { exoPlayer.release() }
                }

                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            useController = false
                            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                            player = exoPlayer
                        }
                    },
                    update = { playerView ->
                        if (playerView.player !== exoPlayer) {
                            playerView.player = exoPlayer
                        }
                    }
                )
            }

            else -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.VideocamOff,
                        contentDescription = "暂不支持的流",
                        tint = Color.White.copy(alpha = 0.2f),
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = "暂不支持的数字人流地址",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun BackButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.35f))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Filled.ArrowBack,
            contentDescription = "返回",
            tint = Color.White
        )
    }
}

@Composable
private fun QuestionTagChip(
    currentQuestion: Int,
    totalQuestions: Int
) {
    val safeTotal = if (totalQuestions > 0) totalQuestions else 1
    val clamped = currentQuestion.coerceIn(1, safeTotal)

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(Color(0xFFF3F8FB))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = "${clamped}/${safeTotal}",
            color = Color(0xFFEC7C38),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun QuestionStatusCard(
    isSpeaking: Boolean,
    questionText: String,
    timeRemaining: Int,
    statusMessage: String?
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black.copy(alpha = 0.2f))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = when {
                    isSpeaking -> "面试官提问中..."
                    !statusMessage.isNullOrBlank() -> statusMessage
                    else -> "等待你的回答"
                },
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AnimatedRecordingIndicator(
                    isSpeaking = isSpeaking,
                    activeColor = if (isSpeaking) Color(0xFFEC7C38) else Color.White.copy(alpha = 0.4f),
                    modifier = Modifier.size(8.dp)
                )
                Text(
                    text = formatTime(timeRemaining),
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Text(
            text = questionText.ifBlank { "面试官正在准备题目，请稍候…" },
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 22.sp
        )
    }
}

@Composable
private fun MiniUserPreview(
    hasCameraPermission: Boolean,
    hasMicrophonePermission: Boolean,
    isCameraEnabled: Boolean,
    onRequestPermissions: () -> Unit
) {
    Box(
        modifier = Modifier
            .width(100.dp)
            .height(178.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color.Black.copy(alpha = 0.45f))
            .let {
                if (hasCameraPermission && hasMicrophonePermission) {
                    it
                } else {
                    it.clickable(onClick = onRequestPermissions)
                }
            }
    ) {
        if (hasCameraPermission && isCameraEnabled) {
            UserCameraPreview(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(8.dp))
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color(0xFF111827),
                                Color(0xFF1F2937)
                            )
                        )
                    )
                    .padding(horizontal = 12.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.VideocamOff,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (hasCameraPermission) "摄像头已关闭" else "点击授权摄像头",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(8.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(Color.Black.copy(alpha = 0.55f))
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = "我的画面",
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun StartAnswerButton(
    text: String,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFEC7C38),
            contentColor = Color.White
        ),
        shape = RoundedCornerShape(26.dp)
    ) {
        Text(
            text = text,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun AnimatedRecordingIndicator(
    modifier: Modifier = Modifier.size(8.dp),
    isSpeaking: Boolean,
    activeColor: Color = Color.Red
) {
    val infiniteTransition = rememberInfiniteTransition(label = "recording")

    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Box(
        modifier = modifier
            .scale(if (isSpeaking) scale else 1f)
            .alpha(if (isSpeaking) alpha else 0.3f)
            .background(
                color = if (isSpeaking) activeColor else Color.Gray,
                shape = CircleShape
            )
    )
}

private fun formatTime(seconds: Int): String {
    val minutes = seconds / 60
    val remainingSeconds = seconds % 60
    return String.format("%02d:%02d", minutes, remainingSeconds)
}

@Composable
fun UserCameraPreview(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }

    DisposableEffect(lifecycleOwner) {
        val executor = ContextCompat.getMainExecutor(context)
        val listener = Runnable {
            try {
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().apply {
                    setSurfaceProvider(previewView.surfaceProvider)
                }
                val cameraSelector = CameraSelector.Builder()
                    .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
                    .build()

                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview)
            } catch (exception: Exception) {
                Log.e("UserCameraPreview", "Failed to bind camera preview", exception)
            }
        }

        cameraProviderFuture.addListener(listener, executor)

        onDispose {
            try {
                cameraProviderFuture.get().unbindAll()
            } catch (exception: Exception) {
                Log.w("UserCameraPreview", "Failed to release camera preview", exception)
            }
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { previewView }
    )
}
