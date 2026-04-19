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
import com.example.v0clone.model.DimensionScore
import com.example.v0clone.model.InterviewReport
import com.example.v0clone.model.MultimodalSummary
import com.example.v0clone.model.QuestionDetail
import com.tongyi.video_chat_sdk.conv.ConvConstants
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
