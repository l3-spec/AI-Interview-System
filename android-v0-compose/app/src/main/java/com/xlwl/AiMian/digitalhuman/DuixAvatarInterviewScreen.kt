package com.xlwl.AiMian.digitalhuman

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
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
import kotlinx.coroutines.launch
import com.xlwl.AiMian.config.AppConfig
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
import androidx.compose.ui.text.style.TextOverflow
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
import com.xlwl.AiMian.ai.realtime.RealtimeVoiceManager
import com.xlwl.AiMian.ai.realtime.ConnectionState
import com.example.v0clone.model.DimensionScore
import com.example.v0clone.model.InterviewReport
import com.example.v0clone.model.MultimodalSummary
import com.example.v0clone.model.QuestionDetail

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalDensity
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.min
import kotlin.math.roundToInt



@SuppressLint("MissingPermission")
@Composable
fun DuixAvatarInterviewScreen(
    projectId: String,
    /** 传给后端的岗位短标签（应与题干分开，勿传整段题目） */
    jobPositionLabel: String? = null,
    interviewQuestion: String? = null,
    onInterviewComplete: (sessionId: String) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
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

    val scope = rememberCoroutineScope()

    val realtimeVoiceManager = remember(context) { 
        RealtimeVoiceManager(context).apply {
            setVadEnabled(true)
        }
    }
    
    val connectionState by realtimeVoiceManager.connectionState.collectAsState()
    val isRecording by realtimeVoiceManager.isRecordingFlow.collectAsState()
    val partialTranscript by realtimeVoiceManager.partialTranscript.collectAsState()
    val _messages by realtimeVoiceManager.conversation.collectAsState()
    val interviewCompleted by realtimeVoiceManager.interviewCompleted.collectAsState()
    val ttsProgress by realtimeVoiceManager.ttsPlaybackProgress.collectAsState()
    val isDhSpeaking by realtimeVoiceManager.isDigitalHumanSpeaking.collectAsState()

    val avatarController = remember(activity, realtimeVoiceManager) {
        if (activity == null) {
            Log.e("DuixAvatarScreen", "无法获取 Activity，控制器初始化失败")
            return@remember null
        }
        DuixAvatarController(
            activity = activity,
            realtimeVoiceManager = realtimeVoiceManager,
            onSessionReady = {
                Log.d("DuixAvatarScreen", "Session ready, connecting websocket...")
                // 发起 WS 长连接
            },
            onError = { error ->
                Log.e("DuixAvatarScreen", "Error: $error")
            }
        )
    }

    val isReady = avatarController?.isReady?.collectAsState()?.value ?: false

    DisposableEffect(Unit) {
        onDispose {
            realtimeVoiceManager.setDigitalHumanController(null)
        }
    }

    LaunchedEffect(avatarController, isReady) {
        val c = avatarController
        if (c != null && isReady) {
            realtimeVoiceManager.setDigitalHumanController(c)
        }
    }

    LaunchedEffect(interviewCompleted) {
        if (interviewCompleted) {
            onInterviewComplete("some_session_id")
        }
    }
    val dialogState = avatarController?.dialogState?.collectAsState()?.value ?: 0
    val userVolume = avatarController?.userVolume?.collectAsState()?.value ?: 0f
    val avatarVolume = avatarController?.avatarVolume?.collectAsState()?.value ?: 0f
    val latencyMetrics = avatarController?.latencyMetrics?.collectAsState()?.value ?: emptyMap()

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
    }

    LaunchedEffect(Unit) {
        if (!hasAudioPermission || !hasCameraPermission) {
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        }
    }

    // Connect to websocket when Duix session is ready
    LaunchedEffect(isReady) {
        if (isReady && connectionState == ConnectionState.DISCONNECTED) {
            val serverUrl = AppConfig.realtimeVoiceWsUrl
            Log.i("DuixAvatarScreen", "📡 Initiating WebSocket connection to: $serverUrl")
            
            scope.launch {
                realtimeVoiceManager.initialize(
                    serverUrl = serverUrl,
                    sessionId = java.util.UUID.randomUUID().toString(),
                    jobPosition = jobPositionLabel?.takeIf { it.isNotBlank() }
                        ?: interviewQuestion?.takeIf { it.length <= 40 }
                        ?: "AI面试官",
                    userId = "user_${System.currentTimeMillis()}"
                )
            }
        }
    }

    // The initial greeting is now handled by the backend's voice_response (Server-side TTS)
    // following the join_session event. This prevents double-greetings and optimizes the flow.

    DisposableEffect(lifecycleOwner) {
         val observer = LifecycleEventObserver { _, event ->
             when (event) {
                 Lifecycle.Event.ON_DESTROY -> avatarController?.release()
                 else -> {}
             }
         }
         lifecycleOwner.lifecycle.addObserver(observer)
         onDispose { 
             lifecycleOwner.lifecycle.removeObserver(observer)
             avatarController?.release()
         }
    }

    var isCameraMaximized by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(if (isReady) Color.Transparent else Color.Black)
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
            .graphicsLayer(
                scaleX = 1.0f,
                scaleY = 1.14f
            )
            .zIndex(1f)

        // Remote Avatar Video
        Box(
            modifier = if (isCameraMaximized) PIP_MODIFIER else MAX_MODIFIER.offset(y = (-50).dp)
        ) {
            if (avatarController != null) {
                DuixAvatarScreen(
                    modifier = Modifier.fillMaxSize(),
                    controller = avatarController
                )
            }
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

        // Real-time Subtitles Overlay (bottom area)
        val userTranscript by realtimeVoiceManager.partialTranscript.collectAsState()
        val latestAIStreamingText by realtimeVoiceManager.latestDigitalHumanText.collectAsState()
        val latestAIHistoryMessage = _messages.lastOrNull { it.role == com.xlwl.AiMian.ai.realtime.ConversationRole.DIGITAL_HUMAN }?.text
        val displayAIText = latestAIStreamingText ?: latestAIHistoryMessage
        
        if (!isCameraMaximized) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .zIndex(5f)
                    .padding(bottom = 100.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                        )
                    )
                    .padding(horizontal = 24.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // User Subtitle (Me) - Displayed when user is speaking
                if (userTranscript.isNotBlank() && userTranscript != "正在聆听，请开始说话...") {
                    Text(
                        text = "我: $userTranscript",
                        color = Color(0xFF00C78A), // Greenish for user
                        fontSize = 16.sp,
                        lineHeight = 22.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Normal,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                
                // Interviewer Subtitle (AI) — 固定两行，随 TTS 进度滚动窗口
                displayAIText?.let { aiText ->
                    InterviewerTwoLineSubtitle(
                        fullText = aiText,
                        progress = ttsProgress,
                        isSpeaking = isDhSpeaking,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Top UI (Close button and Watermark mask)
        Box(
            modifier = Modifier
                .padding(top = 40.dp, start = 16.dp)
                .align(Alignment.TopStart)
                .zIndex(20f)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = {
                        avatarController?.release()
                        onBack()
                    },
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "退出", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
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

        // Interaction removed as per user request (Auto-VAD only)
        // Center UI if wait for user answer logic removed here

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

        when {
            !isReady -> {
                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)).zIndex(30f), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(color = Color(0xFF00C78A))
                        val statusText = avatarController?.statusMessage?.collectAsState()?.value ?: "正在唤起数字人面试官..."
                        Text(statusText, color = Color.White, fontSize = 14.sp)
                    }
                }
            }
            connectionState == ConnectionState.CONNECTING -> {
                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)).zIndex(30f), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(color = Color(0xFF00C78A))
                        Text("连接到实时语音服务...", color = Color.White, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

// 面试结果展示页面
@Composable
fun InterviewResultScreen(
    report: InterviewReport,
    onBack: () -> Unit,
    onRetest: () -> Unit
) {
    val listState = rememberLazyListState()
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(top = 80.dp, bottom = 32.dp)
        ) {
            item {
                // 总分卡片
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "面试总分",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 14.sp
                        )
                        Text(
                            text = "${(report.overallScore * 10).toInt()}分",
                            color = Color(0xFF00C78A),
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Bold
                        )
                        val rating = remember(report.overallScore) {
                            when {
                                report.overallScore >= 9f -> "优秀"
                                report.overallScore >= 8f -> "良好"
                                report.overallScore >= 7f -> "中等"
                                else -> "待提升"
                            }
                        }
                        Text(
                            text = rating,
                            color = Color(0xFF00C78A),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
            item {
                // 优势&待提升
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "✅ 你的优势",
                                    color = Color(0xFF00C78A),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                report.strengths.forEach { strength ->
                                    Text(
                                        text = "• $strength",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        lineHeight = 20.sp
                                    )
                                }
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "⚠️ 待提升",
                                    color = Color(0xFFFF9800),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                report.improvements.forEach { improve ->
                                    Text(
                                        text = "• $improve",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        lineHeight = 20.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
            item {
                // 6维度评分雷达图
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "📊 六大能力评分",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        CompetencyRadarChart(
                            competencies = report.dimensions,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                        )
                    }
                }
            }
            item {
                // 维度详细评分
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "📋 能力详情",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        report.dimensions.forEach { dimension ->
                            DimensionDetailItem(dimension = dimension)
                        }
                    }
                }
            }
            item {
                // 多模态分析
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "🎤 多模态表现分析",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        
                        MultimodalMetricItem("表情稳定性", report.multimodalSummary.expressionStability)
                        MultimodalMetricItem("眼神交流", report.multimodalSummary.eyeContact)
                        MultimodalMetricItem("语气稳定性", report.multimodalSummary.toneStability)
                        MultimodalMetricItem("语言流畅度", report.multimodalSummary.speechFluency)
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "卡顿次数",
                                color = Color.White,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "${report.multimodalSummary.hesitationCount} 次",
                                color = if (report.multimodalSummary.hesitationCount <= 3) Color(0xFF00C78A) else Color(0xFFFF9800),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
            item {
                // 逐题详情
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "📝 逐题答题详情",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        
                        report.questionDetails.forEachIndexed { index, question ->
                            QuestionItem(question, index + 1)
                            if (index < report.questionDetails.size - 1) {
                                HorizontalDivider(
                                    color = Color.White.copy(alpha = 0.1f),
                                    thickness = 0.5.dp,
                                    modifier = Modifier.padding(vertical = 12.dp)
                                )
                            }
                        }
                    }
                }
            }
            item {
                // 底部按钮
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = onBack,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(40.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333333),
                            contentColor = Color.White
                        ),
                        contentPadding = PaddingValues(vertical = 14.dp)
                    ) {
                        Text("返回首页", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                    Button(
                        onClick = onRetest,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(40.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF00C78A),
                            contentColor = Color.White
                        ),
                        contentPadding = PaddingValues(vertical = 14.dp)
                    ) {
                        Text("重新面试", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        
        // 顶部返回按钮
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .padding(top = 40.dp, start = 16.dp)
                .size(36.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                .align(Alignment.TopStart)
                .zIndex(20f)
        ) {
            Icon(Icons.Default.Close, contentDescription = "返回", tint = Color.White, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun CompetencyRadarChart(
    competencies: List<DimensionScore>,
    modifier: Modifier = Modifier,
    gridLevels: Int = 4
) {
    BoxWithConstraints(modifier = modifier) {
        val density = LocalDensity.current
        val widthPx = constraints.maxWidth.toFloat()
        val heightPx = constraints.maxHeight.toFloat()
        val sizePx = min(widthPx, heightPx)
        val center = Offset(widthPx / 2f, heightPx / 2f)
        val radius = sizePx / 2f * 0.72f
        val angleStep = (2.0 * PI) / competencies.size
        val startAngle = -PI / 2.0
        val strokeWidth = with(density) { 1.dp.toPx() }
        val labelPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            textAlign = android.graphics.Paint.Align.CENTER
            color = android.graphics.Color.parseColor("#99FFFFFF")
            textSize = with(density) { 14.sp.toPx() }
        }
        Canvas(modifier = Modifier.fillMaxSize()) {
            // Draw grid levels
            for (level in 1..gridLevels) {
                val ratio = level / gridLevels.toFloat()
                val path = Path()
                competencies.indices.forEach { index ->
                    val angle = startAngle + index * angleStep
                    val point = Offset(
                        x = center.x + cos(angle).toFloat() * radius * ratio,
                        y = center.y + sin(angle).toFloat() * radius * ratio
                    )
                    if (index == 0) {
                        path.moveTo(point.x, point.y)
                    } else {
                        path.lineTo(point.x, point.y)
                    }
                }
                path.close()
                drawPath(
                    path = path,
                    color = Color.White.copy(alpha = 0.1f),
                    style = Stroke(width = strokeWidth)
                )
            }

            // Draw axes
            competencies.indices.forEach { index ->
                val angle = startAngle + index * angleStep
                val point = Offset(
                    x = center.x + cos(angle).toFloat() * radius,
                    y = center.y + sin(angle).toFloat() * radius
                )
                drawLine(
                    color = Color.White.copy(alpha = 0.1f),
                    start = center,
                    end = point,
                    strokeWidth = strokeWidth
                )
            }

            // Draw data area
            val dataPath = Path()
            competencies.forEachIndexed { index, competency ->
                val valueRatio = (competency.score / 10f).coerceIn(0f, 1f)
                val angle = startAngle + index * angleStep
                val point = Offset(
                    x = center.x + cos(angle).toFloat() * radius * valueRatio,
                    y = center.y + sin(angle).toFloat() * radius * valueRatio
                )
                if (index == 0) {
                    dataPath.moveTo(point.x, point.y)
                } else {
                    dataPath.lineTo(point.x, point.y)
                }
            }
            dataPath.close()
            drawPath(
                path = dataPath,
                color = Color(0xFF00C78A).copy(alpha = 0.2f)
            )
            drawPath(
                path = dataPath,
                color = Color(0xFF00C78A),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
            )

            // Draw points
            competencies.forEachIndexed { index, competency ->
                val valueRatio = (competency.score / 10f).coerceIn(0f, 1f)
                val angle = startAngle + index * angleStep
                val point = Offset(
                    x = center.x + cos(angle).toFloat() * radius * valueRatio,
                    y = center.y + sin(angle).toFloat() * radius * valueRatio
                )
                drawCircle(
                    color = Color(0xFF00C78A),
                    radius = with(density) { 4.dp.toPx() },
                    center = point
                )
            }

            // Draw labels
            drawIntoCanvas { canvas ->
                competencies.forEachIndexed { index, competency ->
                    val angle = startAngle + index * angleStep
                    val labelRadius = radius + with(density) { 20.dp.toPx() }
                    val x = center.x + cos(angle).toFloat() * labelRadius
                    val y = center.y + sin(angle).toFloat() * labelRadius
                    canvas.nativeCanvas.drawText(
                        competency.dimension,
                        x,
                        y + labelPaint.textSize / 3f,
                        labelPaint
                    )
                }
            }
        }
    }
}

@Composable
private fun MultimodalMetricItem(name: String, score: Float) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = name,
                color = Color.White,
                fontSize = 14.sp
            )
            Text(
                text = "${(score * 10).toInt()}分",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color.White.copy(alpha = 0.1f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth((score / 10f).coerceIn(0f, 1f))
                    .background(Color(0xFF00C78A))
            )
        }
    }
}

@Composable
private fun QuestionItem(question: QuestionDetail, index: Int) {
    var expanded by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier.clickable { expanded = !expanded },
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "$index. ${question.questionText}",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
        
        if (expanded) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "你的回答:",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = question.answerText,
                    color = Color.White,
                    fontSize = 13.sp,
                    lineHeight = 20.sp
                )
                
                Text(
                    text = "评分维度:",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                question.dimensionScores.forEach { (dim, score) ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = dim,
                            color = Color.White,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "${(score * 10).toInt()}分",
                            color = Color(0xFF00C78A),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                
                Text(
                    text = "评价:",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = question.feedback,
                    color = Color(0xFF00C78A),
                    fontSize = 13.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
private fun DimensionDetailItem(dimension: DimensionScore) {
    var expanded by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = dimension.icon,
                    fontSize = 18.sp
                )
                Column {
                    Text(
                        text = dimension.dimension,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = dimension.description,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 11.sp
                    )
                }
            }
            Text(
                text = "${(dimension.score * 10).toInt()}分",
                color = Color(0xFF00C78A),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }
        if (expanded) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MultimodalMetricItem(name = "内容评分", score = dimension.contentScore)
                MultimodalMetricItem(name = "多模态表现", score = dimension.multimodalScore)
                Text(
                    text = "评价:",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = dimension.feedback,
                    color = Color(0xFF00C78A),
                    fontSize = 13.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
fun LocalCameraPreview(lifecycleOwner: LifecycleOwner) {
    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
                // 关键修正1：强制使用 TextureView (COMPATIBLE 模式)。
                // 避免与 Aliyun 数字人的 SurfaceView 发生底层窗口争夺导致的黑屏/覆盖问题
                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            }
            
            // 关键修正2：将相机绑定逻辑放在 factory 中，只执行一次。
            // 原先在 update 中，由于界面的音量动画导致每秒重绘数十次，会疯狂触发 unbindAll/bindToLifecycle
            // 最终导致系统 Binder 通信过载 (Too many transaction errors) 并引发闪退和黑屏
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
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
            }, ContextCompat.getMainExecutor(ctx))
            
            previewView
        },
        update = { 
            // 保持空，避免在重绘时重复触发耗时操作 
        },
        modifier = Modifier.fillMaxSize()
    )
}

/**
 * 面试官字幕：最多两行，按 [progress] 与当前朗读位置滑动文本窗口。
 */
@Composable
private fun InterviewerTwoLineSubtitle(
    fullText: String,
    progress: Float,
    isSpeaking: Boolean,
    modifier: Modifier = Modifier
) {
    val p = if (isSpeaking) progress.coerceIn(0f, 1f) else 1f
    val windowed = remember(fullText, p) { subtitleWindowForProgress(fullText, p) }
    Text(
        text = "面试官: $windowed",
        color = Color.White,
        fontSize = 17.sp,
        lineHeight = 24.sp,
        maxLines = 2,
        overflow = TextOverflow.Clip,
        textAlign = TextAlign.Center,
        fontWeight = FontWeight.Bold,
        modifier = modifier
    )
}

/** 约两行汉字容量（Compose 未测量前用字符数近似） */
private fun subtitleWindowForProgress(full: String, progress: Float, maxChars: Int = 44): String {
    if (full.isEmpty()) return full
    val p = progress.coerceIn(0f, 1f)
    if (full.length <= maxChars) return full
    val readIdx = ((full.length - 1) * p).roundToInt().coerceIn(0, full.lastIndex)
    val half = maxChars / 2
    var end = (readIdx + half).coerceAtMost(full.length)
    var start = (readIdx - half).coerceAtLeast(0)
    if (end - start < maxChars) start = (end - maxChars).coerceAtLeast(0)
    if (end - start < maxChars) end = (start + maxChars).coerceAtMost(full.length)
    return full.substring(start, end)
}

private fun Context.findActivity(): Activity? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}

