package com.xlwl.AiMian.ai

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.PowerManager
import android.util.Log
import android.view.WindowManager
import android.widget.Toast
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
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.movableContentOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.consumeAllChanges
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.compose.ui.Alignment
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.xlwl.AiMian.ai.realtime.ConversationMessage
import com.xlwl.AiMian.ai.realtime.ConversationRole
import com.xlwl.AiMian.ai.realtime.ConnectionState
import com.xlwl.AiMian.ai.realtime.RealtimeVoiceManager
import com.xlwl.AiMian.config.AppConfig
import com.xlwl.AiMian.duix.DuixViewHost
import com.xlwl.AiMian.ai.video.InterviewVideoRecorder
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.roundToInt

/**
 * 数字人面试页面，支持双击切换主画面与拖动悬浮窗。
 */
@Composable
fun DigitalInterviewScreen(
    uiState: DigitalInterviewUiState,
    onStartAnswer: () -> Unit,
    onRetry: () -> Unit,
    onInterviewComplete: (sessionId: String) -> Unit = {},
    videoRecorder: InterviewVideoRecorder? = null,
    onRecordingFinished: ((File, Long) -> Unit)? = null
) {
    val context = LocalContext.current
    var hasCameraPermission by remember { mutableStateOf(false) }
    var hasMicrophonePermission by remember { mutableStateOf(false) }
    var isCameraEnabled by remember { mutableStateOf(false) }
    var showPermissionDialog by remember { mutableStateOf(false) }
    val voiceManager = remember { RealtimeVoiceManager(context.applicationContext) }
    val coroutineScope = rememberCoroutineScope()
    var duixReady by remember { mutableStateOf(false) }
    var duixStatus by remember { mutableStateOf<String?>("正在准备数字人…") }
    val duixBaseConfigUrl = remember { AppConfig.duixBaseConfigUrl }
    val duixModelUrl = remember { AppConfig.duixModelUrl }
    val activity = context as? Activity
    var showEducationOverlay by rememberSaveable { mutableStateOf(true) }
    val powerManager = remember { context.getSystemService(Context.POWER_SERVICE) as? PowerManager }

    // 沉浸式处理：进入数字人面试页时隐藏系统栏，退出时恢复
    DisposableEffect(activity) {
        val window = activity?.window
        val decorView = window?.decorView
        val controller = if (window != null && decorView != null) {
            WindowInsetsControllerCompat(window, decorView)
        } else {
            null
        }
        val originalStatusColor = window?.statusBarColor
        val originalNavColor = window?.navigationBarColor
        val originalLightStatus = controller?.isAppearanceLightStatusBars
        val originalLightNav = controller?.isAppearanceLightNavigationBars
        val wasKeepingScreenOn = window?.attributes?.flags?.let { flags ->
            flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON != 0
        } ?: false
        val originalBrightness = window?.attributes?.screenBrightness
            ?: WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        val wasPowerSaveMode = powerManager?.isPowerSaveMode == true

        if (window != null && controller != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            controller.isAppearanceLightStatusBars = false
            controller.isAppearanceLightNavigationBars = false
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }

        window?.let { w ->
            // Keep the screen awake and force full brightness for the interview
            w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            w.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
            val attrs = w.attributes
            attrs.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
            w.attributes = attrs
            if (wasPowerSaveMode) {
                Log.i("DigitalInterviewScreen", "检测到省电模式，已强制提高屏幕亮度用于面试")
            }
        }

        onDispose {
            if (window != null && controller != null) {
                controller.show(WindowInsetsCompat.Type.systemBars())
                originalStatusColor?.let { window.statusBarColor = it }
                originalNavColor?.let { window.navigationBarColor = it }
                originalLightStatus?.let { controller.isAppearanceLightStatusBars = it }
                originalLightNav?.let { controller.isAppearanceLightNavigationBars = it }
            }

            if (window != null && !wasKeepingScreenOn) {
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            if (window != null) {
                val attrs = window.attributes
                attrs.screenBrightness = originalBrightness
                window.attributes = attrs
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            voiceManager.cleanup()
        }
    }

    DisposableEffect(videoRecorder) {
        onDispose {
            videoRecorder?.release()
        }
    }
    LaunchedEffect(Unit) {
        voiceManager.setVadEnabled(true)
    }

    val connectionState by voiceManager.connectionState.collectAsState()
    val isRecording by voiceManager.isRecordingFlow.collectAsState()
    val isDigitalHumanSpeaking by voiceManager.isDigitalHumanSpeaking.collectAsState()
    val isProcessing by voiceManager.isProcessing.collectAsState()
    val partialTranscript by voiceManager.partialTranscript.collectAsState()
    val latestDigitalHumanText by voiceManager.latestDigitalHumanText.collectAsState()
    val interviewCompleted by voiceManager.interviewCompleted.collectAsState()
    val conversation by voiceManager.conversation.collectAsState()
    val digitalHumanReady = duixReady
    val digitalHumanStatus = duixStatus
    var hasReportedCompletion by rememberSaveable(uiState.sessionId) { mutableStateOf(false) }
    var autoRecorderEnabled by rememberSaveable { mutableStateOf(true) }

    // 调试日志
    LaunchedEffect(uiState) {
        Log.d("DigitalInterviewScreen", "UI State: isLoading=${uiState.isLoading}, error=${uiState.errorMessage}, question=${uiState.questionText}")
    }

    LaunchedEffect(Unit) {
        voiceManager.errors.collect { message ->
            if (!message.isNullOrBlank()) {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

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

    var connectionRetryCount by remember { mutableStateOf(0) }
    val maxRetries = 3

    LaunchedEffect(uiState.sessionId, hasMicrophonePermission, connectionState, connectionRetryCount) {
        if (uiState.sessionId.isNotBlank() && hasMicrophonePermission && connectionState == ConnectionState.DISCONNECTED) {
            // 避免立即重连导致死循环，增加延时
            kotlinx.coroutines.delay(2000)
            
            Log.d("DigitalInterviewScreen", "Attempting voice service connection (attempt ${connectionRetryCount + 1}/$maxRetries)")
            
            val success = voiceManager.initialize(
                AppConfig.realtimeVoiceWsUrl,
                uiState.sessionId,
                jobPosition = uiState.position
            )
            if (!success) {
                if (connectionRetryCount < maxRetries) {
                    connectionRetryCount += 1
                    Log.w("DigitalInterviewScreen", "Voice service connection failed, will retry...")
                    Toast.makeText(
                        context, 
                        "语音服务连接中... ($connectionRetryCount/$maxRetries)",
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    Log.e("DigitalInterviewScreen", "Voice service connection failed after $maxRetries attempts")
                    Toast.makeText(
                        context,
                        "语音服务连接失败，请检查网络后重启面试",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } else {
                connectionRetryCount = 0
                Log.d("DigitalInterviewScreen", "Voice service connected successfully")
            }
        }
    }

    // Monitor connection state changes
    LaunchedEffect(connectionState) {
        when (connectionState) {
            ConnectionState.CONNECTING -> {
                Log.d("DigitalInterviewScreen", "Voice service: Connecting...")
            }
            ConnectionState.CONNECTED -> {
                Log.d("DigitalInterviewScreen", "Voice service: Connected ✓")
                // Toast.makeText(context, "语音服务已就绪", Toast.LENGTH_SHORT).show()
                connectionRetryCount = 0
            }
            ConnectionState.DISCONNECTED -> {
                Log.w("DigitalInterviewScreen", "Voice service: Disconnected")
            }
        }
    }

    LaunchedEffect(interviewCompleted, uiState.sessionId) {
        if (interviewCompleted && !hasReportedCompletion) {
            hasReportedCompletion = true
            onInterviewComplete(uiState.sessionId)
        }
    }

    val prefs = remember { context.previewPreferences }
    var previewRatio by rememberSaveable(stateSaver = OffsetSaver) {
        mutableStateOf(Offset(0.75f, 0.08f))
    }

    LaunchedEffect(Unit) {
        val stored = prefs.loadPreviewRatio()
        if (stored != null) {
            previewRatio = stored
        }
    }

    fun persistPreviewRatio(ratio: Offset) {
        val clamped = Offset(
            ratio.x.coerceIn(0f, 1f),
            ratio.y.coerceIn(0f, 1f)
        )
        previewRatio = clamped
        prefs.savePreviewRatio(clamped)
    }

    val dynamicStatusMessage = when {
        digitalHumanStatus != null -> digitalHumanStatus
        connectionState == ConnectionState.CONNECTING -> "正在连接语音服务…"
        connectionState == ConnectionState.DISCONNECTED && uiState.sessionId.isNotBlank() -> "语音服务未连接"
        isProcessing -> "数字人正在思考回复…"
        isRecording -> "系统正在聆听"
        isDigitalHumanSpeaking -> "数字人正在回答"
        else -> uiState.statusMessage
    }

    val toggleRecording: () -> Unit = {
        when {
            interviewCompleted -> {
                Toast.makeText(context, "面试已结束", Toast.LENGTH_SHORT).show()
            }
            !hasCameraPermission -> {
                showPermissionDialog = true
            }
            !hasMicrophonePermission -> {
                showPermissionDialog = true
            }

            connectionState != ConnectionState.CONNECTED -> {
                Toast.makeText(context, "语音服务尚未连接", Toast.LENGTH_SHORT).show()
            }

            isProcessing -> {
                Toast.makeText(context, "数字人正在生成回复，请稍候", Toast.LENGTH_SHORT).show()
            }

            else -> {
                if (isDigitalHumanSpeaking) {
                    voiceManager.interrupt()
                }

                if (isRecording) {
                    voiceManager.stopRecording()
                    // Video stop is now handled by LaunchedEffect(isRecording)
                    // Toast.makeText(context, "录音已结束", Toast.LENGTH_SHORT).show()
                } else {
                    onStartAnswer()
                    videoRecorder?.startRecording(
                        uiState.sessionId.ifBlank { "session" },
                        (uiState.currentQuestion - 1).coerceAtLeast(0)
                    )
                    voiceManager.startRecording()
                }
            }
        }
    }

    // 监听面试结束状态
    LaunchedEffect(interviewCompleted) {
        if (interviewCompleted) {
            Log.i("DigitalInterviewScreen", "面试已结束，准备跳转")
            // 延迟一小会儿让结束语播报完（可选）
            kotlinx.coroutines.delay(3000)
            onInterviewComplete(uiState.sessionId)
        }
    }

    // 监听题目变化 - 注意：现在主要依赖WebSocket推送的voice_response来触发说话
    // uiState.questionText主要用于初始题目显示
    // 使用 activeQuestionText 跟踪当前显示的题目（优先使用数字人最新的回复）
    var activeQuestionText by remember(uiState.questionText) { mutableStateOf(uiState.questionText) }
    
    LaunchedEffect(latestDigitalHumanText) {
        if (!latestDigitalHumanText.isNullOrBlank()) {
            activeQuestionText = latestDigitalHumanText ?: ""
        }
    }

    LaunchedEffect(uiState, activeQuestionText) {
        Log.d("DigitalInterviewScreen", "UI State: isLoading=${uiState.isLoading}, error=${uiState.errorMessage}, question=$activeQuestionText")
    }

    // 监听录音状态，当语音录制停止时（包括VAD自动停止），同步停止视频录制
    LaunchedEffect(isRecording) {
        if (!isRecording) {
            // 语音录制已停止（可能是VAD触发，也可能是手动停止）
            // 尝试停止视频录制并提交
            val result = videoRecorder?.stopRecording()
            if (result != null) {
                Log.d("DigitalInterviewScreen", "同步停止视频录制: ${result.file.name}, duration=${result.durationMillis}ms")
                onRecordingFinished?.invoke(result.file, result.durationMillis)
                // Toast.makeText(context, "录音已结束", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // 无需手动按钮，保持自动录音：当连接就绪且双方静默时自动开启录音
    LaunchedEffect(connectionState, digitalHumanReady, isRecording, isProcessing, isDigitalHumanSpeaking, interviewCompleted) {
        Log.d("DigitalInterviewScreen", """
            Auto-recording check:
              autoRecorderEnabled: $autoRecorderEnabled
              digitalHumanReady: $digitalHumanReady
              connectionState: $connectionState
              interviewCompleted: $interviewCompleted
              isRecording: $isRecording
              isProcessing: $isProcessing
              isDigitalHumanSpeaking: $isDigitalHumanSpeaking
        """.trimIndent())
        
        if (autoRecorderEnabled &&
            digitalHumanReady &&
            connectionState == ConnectionState.CONNECTED &&
            !interviewCompleted &&
            !isRecording &&
            !isProcessing &&
            !isDigitalHumanSpeaking
        ) {
            Log.d("DigitalInterviewScreen", "✓ All conditions met, triggering auto-recording...")
            toggleRecording()
        } else {
            val blockers = mutableListOf<String>()
            if (!autoRecorderEnabled) blockers.add("autoRecorderDisabled")
            if (!digitalHumanReady) blockers.add("digitalHumanNotReady")
            if (connectionState != ConnectionState.CONNECTED) blockers.add("notConnected")
            if (interviewCompleted) blockers.add("interviewCompleted")
            if (isRecording) blockers.add("alreadyRecording")
            if (isProcessing) blockers.add("processing")
            if (isDigitalHumanSpeaking) blockers.add("digitalHumanSpeaking")
            
            if (blockers.isNotEmpty()) {
                Log.d("DigitalInterviewScreen", "✗ Auto-recording blocked by: ${blockers.joinToString(", ")}")
            }
        }
    }

    // Fallback: 如果数字人说完话5秒后还没开始录音，尝试手动触发
    LaunchedEffect(isDigitalHumanSpeaking, digitalHumanReady, connectionState) {
        if (!isDigitalHumanSpeaking && digitalHumanReady && connectionState == ConnectionState.CONNECTED && !isRecording) {
            kotlinx.coroutines.delay(5000)
            if (!isRecording && !isProcessing && !interviewCompleted) {
                Log.w("DigitalInterviewScreen", "Fallback: Manually triggering recording after digital human finished speaking")
                Toast.makeText(context, "开始监听您的回答...", Toast.LENGTH_SHORT).show()
                toggleRecording()
            }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        // 第一层：视频/数字人背景层（最底层，zIndex 最小）
        InterviewStage(
            modifier = Modifier
                .fillMaxSize()
                .zIndex(0f),
            hasCameraPermission = hasCameraPermission,
            hasMicrophonePermission = hasMicrophonePermission,
            isCameraEnabled = isCameraEnabled,
            onRequestPermissions = { showPermissionDialog = true },
            previewRatio = previewRatio,
            onPreviewRatioChange = ::persistPreviewRatio,
            digitalHumanReady = digitalHumanReady,
            digitalHumanStatus = digitalHumanStatus,
            duixBaseConfigUrl = duixBaseConfigUrl,
            duixModelUrl = duixModelUrl,
            voiceManager = voiceManager,
            videoRecorder = videoRecorder,
            onDuixReadyChanged = { ready ->
                duixReady = ready
                duixStatus = if (ready) null else "数字人初始化中…"
            },
            onDigitalHumanStatus = { status -> duixStatus = status }
        )

        // 第二层：UI 控制层（中间层，zIndex 中等，不拦截触摸事件）
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 24.dp)
                .zIndex(1f),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                TopSection(
                    currentQuestion = uiState.currentQuestion,
                    totalQuestions = uiState.totalQuestions
                )

            }

            BottomSection(
                uiState = uiState,
                statusMessage = dynamicStatusMessage,
                isDigitalHumanReady = digitalHumanReady,
                digitalHumanStatus = digitalHumanStatus,
                isDigitalHumanSpeaking = isDigitalHumanSpeaking,
                isRecording = isRecording,
                isProcessing = isProcessing,
                interviewCompleted = interviewCompleted,
                connectionState = connectionState,
                partialTranscript = partialTranscript,
                latestDigitalHumanText = activeQuestionText,
                conversation = conversation
            )
        }

        // 第三层：Loading 和 Error 状态覆盖层（最顶层，zIndex 最大，带半透明遮罩）
        if (uiState.isLoading || uiState.errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.7f))
                    .zIndex(2f),
                contentAlignment = Alignment.Center
            ) {
                if (uiState.isLoading) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color.White)
                        uiState.statusMessage?.let {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = it,
                                color = Color.White,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else if (uiState.errorMessage != null) {
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

        if (interviewCompleted) {
            InterviewCompletedOverlay(statusMessage = digitalHumanStatus)
        }

        // 第四层：教育引导层（最顶层，zIndex 3f）
        if (showEducationOverlay) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.8f))
                    .clickable(
                        interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                        indication = null
                    ) { showEducationOverlay = false }
                    .zIndex(3f),
                contentAlignment = Alignment.Center
            ) {
                // 教育引导内容已按需求移除，保持空态遮罩
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
private fun InterviewStage(
    modifier: Modifier = Modifier,
    hasCameraPermission: Boolean,
    hasMicrophonePermission: Boolean,
    isCameraEnabled: Boolean,
    onRequestPermissions: () -> Unit,
    previewRatio: Offset,
    onPreviewRatioChange: (Offset) -> Unit,
    digitalHumanReady: Boolean,
    digitalHumanStatus: String?,
    duixBaseConfigUrl: String,
    duixModelUrl: String,
    voiceManager: RealtimeVoiceManager,
    videoRecorder: InterviewVideoRecorder?,
    onDuixReadyChanged: (Boolean) -> Unit,
    onDigitalHumanStatus: (String) -> Unit
) {
    val density = LocalDensity.current
    val previewWidth = 112.dp
    val previewHeight = 180.dp

    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val maxWidthPx = with(density) { maxWidth.toPx() }
        val maxHeightPx = with(density) { maxHeight.toPx() }
        val previewWidthPx = with(density) { previewWidth.toPx() }
        val previewHeightPx = with(density) { previewHeight.toPx() }
        val maxOffsetPx = Offset(
            (maxWidthPx - previewWidthPx).coerceAtLeast(0f),
            (maxHeightPx - previewHeightPx).coerceAtLeast(0f)
        )

        var previewOffsetPx by remember { mutableStateOf(Offset.Zero) }
        var isSwapped by remember { mutableStateOf(false) }

        LaunchedEffect(maxOffsetPx, previewRatio) {
            previewOffsetPx = Offset(
                (previewRatio.x.coerceIn(0f, 1f) * maxOffsetPx.x).coerceIn(0f, maxOffsetPx.x),
                (previewRatio.y.coerceIn(0f, 1f) * maxOffsetPx.y).coerceIn(0f, maxOffsetPx.y)
            )
        }

        // Fix: Use Unit as key to avoid recreating the gesture detector on every frame
        val dragModifier = Modifier.pointerInput(Unit) {
            detectDragGestures(
                onDrag = { change, dragAmount ->
                    change.consumeAllChanges()
                    val proposed = previewOffsetPx + dragAmount
                    previewOffsetPx = proposed.coerceWithin(maxOffsetPx)
                },
                onDragEnd = {
                    val ratio = Offset(
                        if (maxOffsetPx.x == 0f) 0f else (previewOffsetPx.x / maxOffsetPx.x),
                        if (maxOffsetPx.y == 0f) 0f else (previewOffsetPx.y / maxOffsetPx.y)
                    )
                    onPreviewRatioChange(ratio)
                }
            )
        }

        // Define movable content for Digital Human
        val digitalHumanContent = remember {
            movableContentOf {
                Box(modifier = Modifier.fillMaxSize()) {
                    DuixViewHost(
                        modelUrl = duixModelUrl,
                        baseConfigUrl = duixBaseConfigUrl,
                        modifier = Modifier
                            .matchParentSize()
                            .scale(1.0f)
                            .offset(x = 0.dp)
                            .offset(y = 0.dp),
                        onReadyChanged = onDuixReadyChanged,
                        onStatusChanged = { status ->
                            onDigitalHumanStatus(status)
                        },
                        installAudioSink = { sink ->
                            voiceManager.setDuixAudioSink(sink)
                        }
                    )



                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(width = 180.dp, height = 72.dp)
                            .background(
                                brush = Brush.horizontalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.55f),
                                        Color.Black.copy(alpha = 0.8f)
                                    )
                                )
                            )
                    )
                }
            }
        }

        // Define movable content for User Camera (capture latest state via remember keys)
        val userCameraContent = remember(
            hasCameraPermission,
            hasMicrophonePermission,
            isCameraEnabled,
            onRequestPermissions,
            videoRecorder
        ) {
            movableContentOf {
                UserPreviewTile(
                    modifier = Modifier.fillMaxSize(),
                    hasCameraPermission = hasCameraPermission,
                    hasMicrophonePermission = hasMicrophonePermission,
                    isCameraEnabled = isCameraEnabled,
                    onRequestPermissions = onRequestPermissions,
                    videoRecorder = videoRecorder
                )
            }
        }

        // Main Window Content (Full Screen)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(onDoubleTap = { isSwapped = !isSwapped })
                }
        ) {
            if (!isSwapped) {
                digitalHumanContent()
            } else {
                userCameraContent()
            }
        }

        // Small Window Content (Floating)
        val previewModifier = Modifier
            .offset {
                IntOffset(
                    previewOffsetPx.x.roundToInt(),
                    previewOffsetPx.y.roundToInt()
                )
            }
            .size(previewWidth, previewHeight)
            .zIndex(1f)
            .then(dragModifier)
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { isSwapped = !isSwapped })
            }

        Box(modifier = previewModifier) {
            if (!isSwapped) {
                userCameraContent()
            } else {
                digitalHumanContent()
            }
        }
    }
}

@Composable
private fun TopSection(
    currentQuestion: Int,
    totalQuestions: Int
) {
    LaunchedEffect(Unit) {
        Log.d("TopSection", "Rendering top section: question $currentQuestion/$totalQuestions")
    }
    
    Column(modifier = Modifier.fillMaxWidth()) {
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
    statusMessage: String?,
    isDigitalHumanReady: Boolean,
    digitalHumanStatus: String?,
    isDigitalHumanSpeaking: Boolean,
    isRecording: Boolean,
    isProcessing: Boolean,
    interviewCompleted: Boolean,
    connectionState: ConnectionState,
    partialTranscript: String,
    latestDigitalHumanText: String?,
    conversation: List<ConversationMessage>
) {
    LaunchedEffect(Unit) {
        Log.d("BottomSection", "Rendering bottom section: question=${uiState.questionText}")
    }
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {


        ConversationPanel(
            partialTranscript = partialTranscript,
            // 优先显示实时推送的数字人文本，如果没有则显示UI状态中的题目文本
            latestDigitalHumanText = latestDigitalHumanText ?: uiState.questionText,
            conversation = conversation,
            isRecording = isRecording,
            isDigitalHumanSpeaking = isDigitalHumanSpeaking,
            connectionState = connectionState
        )

        if (!isDigitalHumanReady && !digitalHumanStatus.isNullOrBlank()) {
            Text(
                text = digitalHumanStatus,
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 12.sp,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
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
                        Color.White.copy(alpha = 0.65f),
                        Color.White.copy(alpha = 0.25f),
                        Color.Transparent,
                        Color.Transparent,
                        Color(0xFFEBEBEB).copy(alpha = 0.85f)
                    )
                )
            )
    )
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



private data class RoleDisplay(
    val roleLabel: String,
    val contentText: String,
    val activeColor: Color,
    val blinkMs: Int
)

@Composable
private fun ConversationPanel(
    partialTranscript: String,
    latestDigitalHumanText: String?,
    conversation: List<ConversationMessage>,
    isRecording: Boolean,
    isDigitalHumanSpeaking: Boolean,
    connectionState: ConnectionState
) {
    // Determine what to show in the subtitle area
    val display = when {
        // 1. User is speaking (High Priority)
        isRecording -> {
            val text = if (partialTranscript.isNotBlank()) partialTranscript else "..."
            RoleDisplay("我", text, Color(0xFFEC7C38), 550)
        }
        // 2. Digital Human is speaking
        isDigitalHumanSpeaking -> {
            val text = if (!latestDigitalHumanText.isNullOrBlank()) latestDigitalHumanText else "..."
            RoleDisplay("面试官", text, Color(0xFF43C1C9), 1100)
        }
        // 3. Fallback to last message
        else -> {
            val lastMsg = conversation.lastOrNull()
            if (lastMsg != null) {
                val isUser = lastMsg.role == ConversationRole.USER
                RoleDisplay(
                    roleLabel = if (isUser) "我" else "面试官",
                    contentText = lastMsg.text,
                    activeColor = if (isUser) Color(0xFFEC7C38) else Color(0xFF43C1C9),
                    blinkMs = if (isUser) 550 else 1100
                )
            } else {
                // 4. Initial state
                RoleDisplay("", "非常荣幸认识您，让我们像朋友视频那样聊聊工作，您可以介绍一下。", Color.Gray, 900)
            }
        }
    }
    val roleLabel = display.roleLabel
    val contentText = display.contentText
    val activeColor = display.activeColor
    val blinkMs = display.blinkMs

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.Black.copy(alpha = 0.4f)) // Slightly darker for better readability
            .padding(horizontal = 16.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.Center
    ) {
        if (roleLabel.isNotBlank()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 6.dp)
            ) {
                // Only show indicator if actively speaking/recording
                if (isRecording || isDigitalHumanSpeaking) {
                    AnimatedRecordingIndicator(
                        modifier = Modifier.size(10.dp),
                        isSpeaking = true,
                        activeColor = activeColor,
                        blinkDurationMs = blinkMs
                    )
                }
                Text(
                    text = roleLabel,
                    color = activeColor, // Use the active color for the label too
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Text(
            text = contentText,
            color = Color.White,
            fontSize = 16.sp,
            lineHeight = 22.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun InterviewCompletedOverlay(statusMessage: String?) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.75f))
            .zIndex(4f),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CircularProgressIndicator(color = Color.White)
            Text(
                text = "面试已结束，正在为你整理结果…",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            statusMessage?.takeIf { it.isNotBlank() }?.let { hint ->
                Text(
                    text = hint,
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}



@Composable
private fun DigitalHumanPlaceholder(
    modifier: Modifier = Modifier,
    status: String?,
    isCompact: Boolean,
    showLabel: Boolean = true
) {
    val shape = if (isCompact) RoundedCornerShape(12.dp) else RoundedCornerShape(0.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0B1220),
                        Color(0xFF0E1D38),
                        Color(0xFF0B1220)
                    )
                )
            )
            .border(
                width = if (isCompact) 1.dp else 0.dp,
                color = Color.White.copy(alpha = if (isCompact) 0.12f else 0f),
                shape = shape
            )
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            Color(0xFF163B5E).copy(alpha = 0.35f),
                            Color.Transparent,
                            Color(0xFF174B63).copy(alpha = 0.3f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = "DUIX 数字人",
                tint = Color(0xFF7CDAFF),
                modifier = Modifier.size(if (isCompact) 32.dp else 40.dp)
            )
            Text(
                text = "DUIX 数字人",
                color = Color.White,
                fontSize = if (isCompact) 13.sp else 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = status?.takeIf { it.isNotBlank() } ?: "等待唤醒",
                color = Color.White.copy(alpha = 0.7f),
                fontSize = if (isCompact) 11.sp else 13.sp,
                textAlign = TextAlign.Center
            )
        }

    }
}

@Composable
private fun UserPreviewTile(
    modifier: Modifier = Modifier,
    hasCameraPermission: Boolean,
    hasMicrophonePermission: Boolean,
    isCameraEnabled: Boolean,
    onRequestPermissions: () -> Unit,
    videoRecorder: InterviewVideoRecorder? = null
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black.copy(alpha = 0.45f))
    ) {
        if (hasCameraPermission && isCameraEnabled) {
            UserCameraPreview(
                modifier = Modifier.matchParentSize(),
                videoRecorder = videoRecorder
            )
        } else {
            Column(
                modifier = Modifier.matchParentSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.Videocam,
                    contentDescription = "摄像头权限",
                    tint = Color.White.copy(alpha = 0.75f),
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (hasCameraPermission && !hasMicrophonePermission) {
                        "请检查麦克风权限"
                    } else {
                        "点击授权摄像头/麦克风"
                    },
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 8.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

    }
}

@Composable
private fun StartAnswerButton(
    text: String,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled,
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
    activeColor: Color = Color.Red,
    blinkDurationMs: Int = 1000
) {
    val infiniteTransition = rememberInfiniteTransition(label = "recording")

    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(blinkDurationMs, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(blinkDurationMs, easing = LinearEasing),
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
fun UserCameraPreview(
    modifier: Modifier = Modifier,
    videoRecorder: InterviewVideoRecorder? = null
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }

    LaunchedEffect(videoRecorder, lifecycleOwner) {
        if (videoRecorder != null) {
            videoRecorder.bindPreview(lifecycleOwner, previewView)
        }
    }

    if (videoRecorder == null) {
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
    }

    AndroidView(
        modifier = modifier,
        factory = { previewView }
    )
}


private fun Offset.coerceWithin(max: Offset): Offset = Offset(
    x = x.coerceIn(0f, max.x),
    y = y.coerceIn(0f, max.y)
)

private val OffsetSaver = Saver<Offset, Pair<Float, Float>>(
    save = { it.x to it.y },
    restore = { Offset(it.first, it.second) }
)

private val Context.previewPreferences: SharedPreferences
    get() = getSharedPreferences("digital_interview_preview", Context.MODE_PRIVATE)

private fun SharedPreferences.loadPreviewRatio(): Offset? {
    val x = getFloat(PREF_PREVIEW_X, Float.NaN)
    val y = getFloat(PREF_PREVIEW_Y, Float.NaN)
    return if (x.isNaN() || y.isNaN()) null else Offset(x, y)
}

private fun SharedPreferences.savePreviewRatio(offset: Offset) {
    edit()
        .putFloat(PREF_PREVIEW_X, offset.x)
        .putFloat(PREF_PREVIEW_Y, offset.y)
        .apply()
}

private const val PREF_PREVIEW_X = "preview_ratio_x"
private const val PREF_PREVIEW_Y = "preview_ratio_y"
