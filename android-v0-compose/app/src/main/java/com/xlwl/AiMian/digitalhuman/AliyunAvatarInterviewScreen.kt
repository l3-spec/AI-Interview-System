package com.xlwl.AiMian.digitalhuman

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import com.xlwl.AiMian.BuildConfig
import android.util.Log
import android.view.ViewGroup
import android.view.WindowManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tongyi.video_chat_sdk.conv.ConvConstants



@SuppressLint("MissingPermission")
@Composable
fun AliyunAvatarInterviewScreen(
    projectId: String,
    interviewQuestion: String? = null,
    onInterviewComplete: (sessionId: String) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current

    // Set FullScreen Immersive
    DisposableEffect(activity) {
        activity?.let { act ->
            val window = act.window
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.isAppearanceLightStatusBars = false
            controller.isAppearanceLightNavigationBars = false
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }
        onDispose {
            activity?.let { act ->
                val window = act.window
                // 不要设置为 true，否则会破坏 MainActivity 全局的 edge-to-edge (decorFitsSystemWindows=false) 状态
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.show(WindowInsetsCompat.Type.systemBars())
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    // 使用 DashScope 直连 ViewModel（不需要后端代理）
    val viewModel: AliyunAvatarViewModel = viewModel(
        factory = AliyunAvatarViewModel.Factory(context)
    )
    val uiState by viewModel.uiState.collectAsState()

    var messages by remember { mutableStateOf(listOf<ChatMessage>()) }

    val avatarController = remember {
        AliyunAvatarController(
            activity = activity!!,
            projectId = projectId,
            onSessionReady = {
                Log.d("AliyunAvatarScreen", "Session ready")
            },
            onMessageReceived = { text, isUser ->
                Log.d("AliyunAvatarScreen", "Message[$isUser]: $text")
                messages = messages + ChatMessage(text = text, role = if (isUser) ConversationRole.USER else ConversationRole.AI)
            },
            onError = { error ->
                Log.e("AliyunAvatarScreen", "Error: $error")
            }
        )
    }

    val isReady by avatarController.isReady.collectAsState()
    val dialogState by avatarController.dialogState.collectAsState()
    val userVolume by avatarController.userVolume.collectAsState()
    val avatarVolume by avatarController.avatarVolume.collectAsState()
    val latencyMetrics by avatarController.latencyMetrics.collectAsState()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    var hasAudioPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true
        hasAudioPermission = permissions[Manifest.permission.RECORD_AUDIO] == true
        if (hasAudioPermission) {
            viewModel.fetchAvatarInitData(
                projectId = BuildConfig.ALIYUN_AVATAR_PROJECT_ID,
                instanceId = BuildConfig.ALIYUN_AVATAR_INSTANCE_ID
            )
        }
    }

    LaunchedEffect(Unit) {
        if (hasAudioPermission && hasCameraPermission) {
            viewModel.fetchAvatarInitData(
                projectId = BuildConfig.ALIYUN_AVATAR_PROJECT_ID,
                instanceId = BuildConfig.ALIYUN_AVATAR_INSTANCE_ID
            )
        } else {
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        }
    }

    // When initData arrives, start session
    LaunchedEffect(uiState) {
        if (uiState is AliyunAvatarUiState.Success) {
            avatarController.startSession((uiState as AliyunAvatarUiState.Success).initData)
        }
    }

    // Trigger initial question when actually ready
    LaunchedEffect(isReady) {
        if (isReady && !interviewQuestion.isNullOrBlank()) {
            avatarController.sendInterviewQuestion(interviewQuestion)
        }
    }

    DisposableEffect(lifecycleOwner) {
         val observer = LifecycleEventObserver { _, event ->
             when (event) {
                 Lifecycle.Event.ON_DESTROY -> avatarController.release()
                 else -> {}
             }
         }
         lifecycleOwner.lifecycle.addObserver(observer)
         onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var isCameraMaximized by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        val PIP_MODIFIER = Modifier
            .padding(top = 60.dp, end = 20.dp)
            .size(110.dp, 160.dp)
            .align(Alignment.TopEnd)
            .clip(RoundedCornerShape(12.dp))
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { isCameraMaximized = !isCameraMaximized })
            }
            .zIndex(10f)

        val MAX_MODIFIER = Modifier
            .fillMaxSize()
            .zIndex(1f)

        // Remote Avatar Video
        Box(modifier = if (!isCameraMaximized) MAX_MODIFIER else PIP_MODIFIER) {
            AliyunAvatarView(
                modifier = Modifier.fillMaxSize(),
                controller = avatarController
            )
            if (isCameraMaximized) {
                // If it's PIP, we just show a border or something similar
                Box(modifier = Modifier.fillMaxSize().background(Color.Transparent))
            }
        }

        // Local Camera Video
        Box(modifier = if (isCameraMaximized) MAX_MODIFIER else PIP_MODIFIER) {
            if (hasCameraPermission) {
                LocalCameraPreview(lifecycleOwner = lifecycleOwner)
            } else {
                Box(modifier = Modifier.fillMaxSize().background(Color.DarkGray), contentAlignment = Alignment.Center) {
                    Icon(imageVector = Icons.Default.Person, contentDescription = null, tint = Color.LightGray)
                }
            }
        }

        // Subtitles Overlay (bottom area)
        val latestAIMessage = messages.lastOrNull { it.role == ConversationRole.AI }?.text
        if (latestAIMessage != null && !isCameraMaximized) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(bottom = 80.dp)
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))))
                    .padding(horizontal = 24.dp, vertical = 40.dp)
            ) {
                Text(
                    text = latestAIMessage,
                    color = Color.White,
                    fontSize = 18.sp,
                    lineHeight = 24.sp,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Top UI (Close button)
        IconButton(
            onClick = {
                avatarController.release()
                onBack()
            },
            modifier = Modifier
                .padding(top = 40.dp, start = 16.dp)
                .size(36.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                .align(Alignment.TopStart)
                .zIndex(20f)
        ) {
            Icon(Icons.Default.Close, contentDescription = "退出", tint = Color.White, modifier = Modifier.size(20.dp))
        }

        // Performance Debug HUD (Top right, subtle)
        if (isReady) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 45.dp, end = 16.dp)
                    .zIndex(20f),
                horizontalAlignment = Alignment.End
            ) {
                latencyMetrics.forEach { (key, value) ->
                    Text(
                        text = "$key: $value",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 8.sp
                    )
                }
            }
        }

        // Center UI if wait for user answer
        val isUserTurn = dialogState == ConvConstants.DialogState.DIALOG_LISTENING || dialogState == ConvConstants.DialogState.DIALOG_IDLE
        if (isUserTurn && isReady) {
            // "开始答题" and "思考时间" overlay
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 120.dp)
                    .zIndex(20f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Thought time
                Box(
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text("答题思考时间", color = Color.White, fontSize = 14.sp)
                }
                Spacer(modifier = Modifier.height(24.dp))
                // Start answer button
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color(0xFF00C78A), CircleShape)
                        .clickable { avatarController.interrupt() },
                    contentAlignment = Alignment.Center
                ) {
                    // Audio Level Pulse if user is speaking
                    if (userVolume > 5) {
                        val infiniteTransition = rememberInfiniteTransition(label = "")
                        val pulseScale by infiniteTransition.animateFloat(
                            initialValue = 1f,
                            targetValue = 1f + (userVolume / 100f) * 0.5f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(300),
                                repeatMode = RepeatMode.Reverse
                            ),
                            label = ""
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .graphicsLayer {
                                    scaleX = pulseScale
                                    scaleY = pulseScale
                                }
                                .background(Color(0xFF00C78A).copy(alpha = 0.3f), CircleShape)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Mic, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
                        Text("开始答题", color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }

        // Avatar Speaking Wave (Bottom right of main video or near subtitles)
        if (avatarVolume > 5 && !isCameraMaximized) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 100.dp, end = 24.dp)
                    .zIndex(20f),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(4) { i ->
                    val h = 10.dp + (avatarVolume.dp * (0.2f + i * 0.2f)).coerceAtMost(40.dp)
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(h)
                            .background(Color(0xFF00C78A), RoundedCornerShape(2.dp))
                    )
                }
            }
        }

        when (uiState) {
            is AliyunAvatarUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)).zIndex(30f), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(color = Color(0xFF00C78A))
                        Text("正在唤起数字人面试官...", color = Color.White, fontSize = 14.sp)
                    }
                }
            }
            is AliyunAvatarUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)).zIndex(30f), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(horizontal = 24.dp)
                    ) {
                        Text(
                            "数字人初始化失败",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            (uiState as AliyunAvatarUiState.Error).message,
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = { 
                                viewModel.fetchAvatarInitData(
                                    projectId = BuildConfig.ALIYUN_AVATAR_PROJECT_ID,
                                    instanceId = BuildConfig.ALIYUN_AVATAR_INSTANCE_ID
                                ) 
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C78A))
                        ) {
                            Text("重新尝试")
                        }
                        TextButton(onClick = onBack) {
                            Text("返回", color = Color.White.copy(alpha = 0.6f))
                        }
                    }
                }
            }
            else -> {}
        }
    }
}

@Composable
fun LocalCameraPreview(lifecycleOwner: LifecycleOwner) {
    AndroidView(
        factory = { ctx ->
            PreviewView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
            }
        },
        update = { previewView ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(previewView.context)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview
                    )
                } catch (exc: Exception) {
                    Log.e("AliyunAvatarInterview", "Use case binding failed", exc)
                }
            }, ContextCompat.getMainExecutor(previewView.context))
        },
        modifier = Modifier.fillMaxSize()
    )
}
