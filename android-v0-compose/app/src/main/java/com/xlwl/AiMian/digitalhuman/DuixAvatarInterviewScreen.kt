package com.xlwl.AiMian.digitalhuman

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.util.Log
import android.view.ViewGroup
import android.view.WindowManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import com.example.v0clone.config.AppConfig
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
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.gestures.detectDragGestures
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
import com.xlwl.AiMian.ai.realtime.TranscriptDelta
import com.xlwl.AiMian.ai.realtime.ConnectionState
import com.xlwl.AiMian.ai.realtime.ConnectionPhase
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.utils.DeviceIdManager
import com.example.v0clone.model.DimensionScore
import com.example.v0clone.model.InterviewReport
import com.example.v0clone.model.MultimodalSummary
import com.example.v0clone.model.QuestionDetail
import java.io.File
import java.util.concurrent.Executors
import android.widget.Toast
import kotlinx.coroutines.isActive

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
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.platform.LocalDensity
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.min
import kotlin.math.max
import kotlin.math.roundToInt
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize



@SuppressLint("MissingPermission")
@Composable
fun DuixAvatarInterviewScreen(
    projectId: String,
    /** 传给后端的岗位短标签（应与题干分开，勿传整段题目） */
    jobPositionLabel: String? = null,
    interviewQuestion: String? = null,
    /** 与 backend-api / Prisma 会话一致，用于沟通记录与答题视频绑定 */
    interviewSessionId: String? = null,
    candidateUserId: String? = null,
    /** 可选：收到 `candidate_turn_recorded` 后可将本地录像上传并调用 [AiInterviewRepository.uploadConversationTurnVideoFile] */
    aiInterviewRepository: AiInterviewRepository? = null,
    onInterviewComplete: (sessionId: String, isCompleted: Boolean) -> Unit = { _, _ -> },
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

    var videoCapture by remember { mutableStateOf<VideoCapture<Recorder>?>(null) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }
    var currentVideoFile by remember { mutableStateOf<File?>(null) }
    var currentRecordingQuestionIndex by remember { mutableStateOf<Int?>(null) }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    // 每一题答题计时器状态
    var secondsLeft by remember { mutableIntStateOf(0) }

    val realtimeVoiceManager = remember(context) { 
        RealtimeVoiceManager(context).apply {
            setVadEnabled(true)
        }
    }
    
    val connectionState by realtimeVoiceManager.connectionState.collectAsState()
    val connectionPhase by realtimeVoiceManager.connectionPhase.collectAsState()
    val isRecording by realtimeVoiceManager.isRecordingFlow.collectAsState()
    val partialTranscript by realtimeVoiceManager.partialTranscript.collectAsState()
    val _messages by realtimeVoiceManager.conversation.collectAsState()
    val interviewCompleted by realtimeVoiceManager.interviewCompleted.collectAsState()
    val ttsProgress by realtimeVoiceManager.ttsPlaybackProgress.collectAsState()
    val isDhSpeaking by realtimeVoiceManager.isDigitalHumanSpeaking.collectAsState()
    val timeLimit by realtimeVoiceManager.timeLimit.collectAsState()
    val currentQuestionIndex by realtimeVoiceManager.currentQuestionIndex.collectAsState()

    // 标记首题是否已开始播放（只触发一次，用于控制 loading 遮罩消失时机）
    // 期望流程：连接中 → 连接成功（题目准备中） → 首题 TTS 开始播放（loading 消失）
    var isFirstVoiceReceived by remember { mutableStateOf(false) }

    // 监听 isDhSpeaking，一旦数字人开始说话（收到并播放首题第一个语音包），隐藏加载转圈
    LaunchedEffect(isDhSpeaking) {
        if (isDhSpeaking && !isFirstVoiceReceived) {
            Log.i("DuixAvatarScreen", "首题 TTS 开始播放，关闭准备中 loading 遮罩")
            isFirstVoiceReceived = true
        }
    }



    // 开始录制视频
    fun startVideoRecording(ctx: Context, questionIndex: Int) {
        val capture = videoCapture
        if (capture == null) {
            Log.w("DuixAvatarScreen", "videoCapture 尚未就绪，无法录像")
            return
        }
        if (activeRecording != null) {
            Log.d("DuixAvatarScreen", "已有正在进行的录像，忽略")
            return
        }
        
        try {
            val outputFile = File.createTempFile(
                "interview_q_${questionIndex}_",
                ".mp4",
                ctx.cacheDir
            )
            currentVideoFile = outputFile
            currentRecordingQuestionIndex = questionIndex
            
            val outputOptions = FileOutputOptions.Builder(outputFile).build()
            
            activeRecording = capture.output
                .prepareRecording(ctx, outputOptions)
                .withAudioEnabled()
                .start(cameraExecutor) { event ->
                    when (event) {
                        is VideoRecordEvent.Finalize -> {
                            if (event.hasError()) {
                                Log.e("DuixAvatarScreen", "视频录制失败: ${event.error}")
                                if (currentVideoFile == outputFile) {
                                    currentVideoFile = null
                                    currentRecordingQuestionIndex = null
                                }
                            } else {
                                Log.i("DuixAvatarScreen", "视频录制成功，文件: ${outputFile.absolutePath}")
                            }
                        }
                    }
                }
            Log.i("DuixAvatarScreen", "已拉起答题视频录像：questionIndex=$questionIndex")
        } catch (e: Exception) {
            Log.e("DuixAvatarScreen", "开始录像出错", e)
        }
    }

    // 停止录制视频
    fun stopVideoRecording() {
        val r = activeRecording
        if (r != null) {
            Log.i("DuixAvatarScreen", "触发停止录像")
            r.stop()
            activeRecording = null
        }
    }

    // 答题倒计时控制器
    // 标记当前题目的倒计时是否已经启动（避免 isDhSpeaking 反复变化时重复触发）
    var countdownStarted by remember { mutableStateOf(false) }
    // 记录上一帧的 isDhSpeaking 状态，用于做「true→false」边缘检测
    var prevIsDhSpeaking by remember { mutableStateOf(false) }

    // 收到新题目（timeLimit 变化）时重置倒计时与启动标记
    LaunchedEffect(timeLimit) {
        countdownStarted = false
        secondsLeft = 0
        // 重置上一帧状态：question_start 时数字人通常即将开始读题
        prevIsDhSpeaking = false
        Log.d("DuixAvatarScreen", "收到新题目 timeLimit=$timeLimit，重置倒计时状态")
    }

    // 当数字人「刚读完题」（isDhSpeaking 由 true 变为 false）时启动倒计时
    // 边缘检测保证只触发一次，即使后续 isDhSpeaking 再次抖动也不会重启
    LaunchedEffect(isDhSpeaking, timeLimit) {
        val limit = timeLimit
        val justFinishedSpeaking = prevIsDhSpeaking && !isDhSpeaking
        prevIsDhSpeaking = isDhSpeaking

        if (justFinishedSpeaking && limit != null && limit > 0 && !countdownStarted) {
            countdownStarted = true
            secondsLeft = limit
            Log.i("DuixAvatarScreen", "数字人读题完毕，启动答题倒计时 ${limit}s")
        }
    }

    LaunchedEffect(secondsLeft) {
        if (secondsLeft > 0) {
            delay(1000L)
            secondsLeft--
            if (secondsLeft == 0) {
                Log.w("DuixAvatarScreen", "答题倒计时结束，按当前已识别文本正常提交")
                Toast.makeText(context, "答题时间到，已自动提交并进入下一题", Toast.LENGTH_SHORT).show()

                // 1. 获取当前已经识别的内容（可能为空字符串，表示用户超时未作答）
                val currentText = realtimeVoiceManager.partialTranscript.value.trim()

                // 2. 停止录音与录像，让本题答题流程正常收尾
                realtimeVoiceManager.stopRecording()
                stopVideoRecording()

                // 3. 提交答案，并通过 isTimeout=true 标志告知后端为「超时正常完成」
                //    后端据此区分「超时」与「主动跳过」，无需在文本中夹带 [超时未作答] 占位符
                realtimeVoiceManager.submitUserText(
                    text = currentText,
                    isTimeout = true
                )
            }
        }
    }

    // 客户端防挂起兜底：如果面试总时长超过 20 分钟（1200 秒），自动结束面试
    LaunchedEffect(Unit) {
        delay(1200 * 1000L) // 20分钟
        if (!interviewCompleted) {
            Log.w("DuixAvatarScreen", "面试达到 20 分钟客户端最大时长限制，强制退出")
            Toast.makeText(context, "面试已达到最大时长，自动为您结束面试", Toast.LENGTH_LONG).show()
            realtimeVoiceManager.release()
            onInterviewComplete(interviewSessionId.orEmpty(), false)
        }
    }

    // 视频录制生命周期控制器
    LaunchedEffect(isDhSpeaking, timeLimit, interviewCompleted) {
        val limit = timeLimit
        if (!isDhSpeaking && limit != null && limit > 0 && !interviewCompleted) {
            val qIdx = currentQuestionIndex ?: 0
            startVideoRecording(context, qIdx)
        } else {
            stopVideoRecording()
        }
    }

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

    // 加载遮罩仅由「数字人开始说话」触发关闭，不做超时兜底，
    // 确保 App 只在收到真实语音流后才隐藏"面试官准备"提示。

    DisposableEffect(Unit) {
        onDispose {
            realtimeVoiceManager.setDigitalHumanController(null)
            realtimeVoiceManager.release()
            stopVideoRecording()
            cameraExecutor.shutdown()
        }
    }

    LaunchedEffect(avatarController, isReady) {
        val c = avatarController
        if (c != null && isReady) {
            realtimeVoiceManager.setDigitalHumanController(c)
        }
    }

    val isCompletedSuccessfully by realtimeVoiceManager.isInterviewCompletedSuccessfully.collectAsState()

    LaunchedEffect(interviewCompleted, interviewSessionId) {
        if (interviewCompleted) {
            realtimeVoiceManager.release()
            onInterviewComplete(interviewSessionId.orEmpty(), isCompletedSuccessfully)
        }
    }

    LaunchedEffect(aiInterviewRepository, interviewSessionId, realtimeVoiceManager) {
        val repo = aiInterviewRepository ?: return@LaunchedEffect
        val sid = interviewSessionId?.takeIf { it.isNotBlank() } ?: return@LaunchedEffect
        realtimeVoiceManager.candidateTurnRecorded.collect { ev ->
            if (ev.sessionId == sid) {
                Log.i(
                    "DuixAvatarScreen",
                    "沟通回合已落库 sequence=${ev.sequence} qIdx=${ev.questionIndex}，准备上传临时视频文件"
                )
                scope.launch(Dispatchers.IO) {
                    delay(800) // 延迟等待 CameraX 完成文件落盘并 finalize
                    val fileToUpload = currentVideoFile
                    if (fileToUpload != null && fileToUpload.exists() && fileToUpload.length() > 0) {
                        Log.i("DuixAvatarScreen", "开始上传本地临时视频文件: ${fileToUpload.absolutePath} 绑定 sequence=${ev.sequence}")
                        val result = repo.uploadConversationTurnVideoFile(
                            sessionId = sid,
                            sequence = ev.sequence,
                            file = fileToUpload
                        )
                        result.onSuccess { videoUrl ->
                            Log.i("DuixAvatarScreen", "视频上传并绑定成功，OSS URL: $videoUrl")
                            fileToUpload.delete()
                        }.onFailure { throwable ->
                            Log.e("DuixAvatarScreen", "视频上传绑定失败: ${throwable.message}", throwable)
                        }
                    } else {
                        Log.w("DuixAvatarScreen", "未找到有效的临时视频文件或文件大小为 0，跳过直传绑定")
                    }
                }
            }
        }
    }
    val dialogState = avatarController?.dialogState?.collectAsState()?.value ?: 0
    val userVolume = avatarController?.userVolume?.collectAsState()?.value ?: 0f
    val avatarVolume = avatarController?.avatarVolume?.collectAsState()?.value ?: 0f
    val latencyMetrics = avatarController?.latencyMetrics?.collectAsState()?.value ?: emptyMap()

    // 4个音量柱独立的弹性物理动画，错开阻尼比与刚度，实现极其灵动平滑的交互波形
    val waveHeight1 by animateDpAsState(
        targetValue = if (avatarVolume > 5) (10.dp + (avatarVolume.dp * 0.35f)).coerceAtMost(40.dp) else 4.dp,
        animationSpec = spring(dampingRatio = 0.52f, stiffness = Spring.StiffnessMediumLow),
        label = "wave_h_1"
    )
    val waveHeight2 by animateDpAsState(
        targetValue = if (avatarVolume > 5) (10.dp + (avatarVolume.dp * 0.65f)).coerceAtMost(40.dp) else 4.dp,
        animationSpec = spring(dampingRatio = 0.58f, stiffness = Spring.StiffnessMedium),
        label = "wave_h_2"
    )
    val waveHeight3 by animateDpAsState(
        targetValue = if (avatarVolume > 5) (10.dp + (avatarVolume.dp * 0.48f)).coerceAtMost(40.dp) else 4.dp,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessLow),
        label = "wave_h_3"
    )
    val waveHeight4 by animateDpAsState(
        targetValue = if (avatarVolume > 5) (10.dp + (avatarVolume.dp * 0.25f)).coerceAtMost(40.dp) else 4.dp,
        animationSpec = spring(dampingRatio = 0.50f, stiffness = Spring.StiffnessMedium),
        label = "wave_h_4"
    )

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
            // 面试通信架构改造后：RealtimeVoiceManager.initialize 不再走 Socket.IO，
            // 而是调用 backend-api /api/gateway/join 获取 TTS/ASR WebSocket 地址，再直连 WS。
            // 所以 serverUrl 这里传入 REST 基础地址（AppConfig.apiBaseUrl）仅用于日志/保留。
            val serverUrl = AppConfig.apiBaseUrl
            Log.i("DuixAvatarScreen", "📡 Initiating gateway join via REST: $serverUrl")
            
            scope.launch {
                val deviceId = DeviceIdManager.getDeviceId(context)
                realtimeVoiceManager.initialize(
                    serverUrl = serverUrl,
                    sessionId = interviewSessionId?.takeIf { it.isNotBlank() }
                        ?: java.util.UUID.randomUUID().toString(),
                    jobPosition = jobPositionLabel?.takeIf { it.isNotBlank() }
                        ?: interviewQuestion?.takeIf { it.length <= 40 }
                        ?: "AI面试官",
                    userId = candidateUserId?.takeIf { it.isNotBlank() }
                        ?: "user_${System.currentTimeMillis()}",
                    deviceId = deviceId
                )
            }
        }
    }

    // The initial greeting is now handled by the backend's voice_response (Server-side TTS)
    // following the join_session event. This prevents double-greetings and optimizes the flow.

    DisposableEffect(lifecycleOwner) {
         val observer = LifecycleEventObserver { _, event ->
             when (event) {
                 Lifecycle.Event.ON_DESTROY -> {
                     realtimeVoiceManager.setDigitalHumanController(null)
                     avatarController?.release()
                 }
                 else -> {}
             }
         }
         lifecycleOwner.lifecycle.addObserver(observer)
         onDispose { 
             lifecycleOwner.lifecycle.removeObserver(observer)
             realtimeVoiceManager.setDigitalHumanController(null)
             avatarController?.release()
         }
    }

    var isCameraMaximized by remember { mutableStateOf(false) }
    var pipOffset by remember { mutableStateOf(Offset.Zero) }

    // 加载保存的 PIP 位置
    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("duix_pip_prefs", Context.MODE_PRIVATE)
        val x = prefs.getFloat("pip_x", 0f)
        val y = prefs.getFloat("pip_y", 0f)
        pipOffset = Offset(x, y)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(if (isReady) Color.Transparent else Color.Black)
    ) {
        val PIP_MODIFIER = Modifier
            .padding(top = 60.dp, end = 20.dp)
            .size(110.dp, 160.dp)
            .align(Alignment.TopEnd)
            .offset { IntOffset(pipOffset.x.roundToInt(), pipOffset.y.roundToInt()) }
            .clip(RoundedCornerShape(12.dp))
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { isCameraMaximized = !isCameraMaximized })
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragEnd = {
                        val prefs = context.getSharedPreferences("duix_pip_prefs", Context.MODE_PRIVATE)
                        prefs.edit()
                            .putFloat("pip_x", pipOffset.x)
                            .putFloat("pip_y", pipOffset.y)
                            .apply()
                    }
                ) { change, dragAmount ->
                    change.consume()
                    pipOffset += dragAmount
                }
            }
            .zIndex(10f)

        val MAX_MODIFIER = Modifier
            .fillMaxSize()
            .graphicsLayer(
                scaleX = 1.0f,
                scaleY = 1.3f
            )
            .zIndex(1f)

        // Remote Avatar Video
        Box(
            modifier = if (isCameraMaximized) PIP_MODIFIER else MAX_MODIFIER
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
                LocalCameraPreview(
                    lifecycleOwner = lifecycleOwner,
                    onVideoCaptureCreated = { videoCapture = it }
                )
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
        val rawDisplayAIText = latestAIStreamingText?.takeIf { it.isNotBlank() } ?: latestAIHistoryMessage
        // 优化4：清理 markdown 标记 (**, *, #, [text](url) 等)，避免未渲染符号污染字幕
        val displayAIText = remember(rawDisplayAIText) { rawDisplayAIText?.let { cleanMarkdownForSubtitle(it) } }
        
        // Debug logging for UI state
        LaunchedEffect(displayAIText, isDhSpeaking, timeLimit) {
            Log.d("DuixAvatarScreen", "UI State: displayAIText=${displayAIText?.length ?: 0} chars, isDhSpeaking=$isDhSpeaking, timeLimit=$timeLimit")
        }
        val transcriptDelta by realtimeVoiceManager.transcriptDelta.collectAsState(initial = null)

        // KTV 字幕：基于字符类型的逐字推进（中文约 4-5 字/秒，标点处自动停顿）
        var ktvTimeBasedIndex by remember { mutableStateOf(0) }

        // KTV 字幕：当显示文本变化时重置
        LaunchedEffect(displayAIText) {
            ktvTimeBasedIndex = 0
        }

        // KTV 字幕：数字人说话状态变化时处理
        // 优化2：动态语速 + 标点停顿，使高亮节奏更贴近真实语音
        LaunchedEffect(isDhSpeaking, displayAIText) {
            if (isDhSpeaking && !displayAIText.isNullOrEmpty()) {
                ktvTimeBasedIndex = 0
                val text = displayAIText
                var i = 0
                while (isActive && i < text.length) {
                    val c = text[i]
                    // 基础间隔 ~220ms/字（约 4.5 字/秒）
                    val baseDelay = 220L
                    // 标点后额外停顿
                    val pause = when (c) {
                        '，', ',' -> 300L
                        '。', '！', '？', '!', '?', '；', ';' -> 500L
                        '：', ':', '、' -> 200L
                        else -> 0L
                    }
                    kotlinx.coroutines.delay(baseDelay + pause)
                    i++
                    ktvTimeBasedIndex = i
                }
            } else if (!isDhSpeaking) {
                ktvTimeBasedIndex = 0
            }
        }

        // KTV 字幕：根据 transcriptDelta 精确校正（如果可用）
        LaunchedEffect(transcriptDelta) {
            if (isDhSpeaking) {
                transcriptDelta?.let { delta ->
                    val fullText = displayAIText ?: ""
                    if (fullText.isNotEmpty() && delta.text.isNotBlank()) {
                        val foundIdx = fullText.indexOf(delta.text, ktvTimeBasedIndex)
                        if (foundIdx != -1) {
                            ktvTimeBasedIndex = foundIdx + delta.text.length
                        }
                    }
                }
            }
        }

        // 计算最终高亮进度：时间估算为主，ttsProgress 为辅
        val rawProgress = if (ktvTimeBasedIndex > 0 && (displayAIText?.length ?: 0) > 0) {
            ktvTimeBasedIndex.toFloat() / displayAIText!!.length.toFloat()
        } else {
            ttsProgress
        }
        // KTV 字幕：平滑动画过渡
        val finalHighlightProgress by animateFloatAsState(
            targetValue = if (isDhSpeaking) rawProgress.coerceIn(0f, 1f) else 1f,
            animationSpec = tween(durationMillis = 120, easing = LinearEasing),
            label = "ktv_highlight_progress"
        )

        // Real-time Subtitles Overlay (bottom area) — 仅在有字幕内容时才显示，避免空透明黑条
        val showUserSubtitle = userTranscript.isNotBlank() && userTranscript != "正在聆听，请开始说话..."
        // 字幕仅在语音流到达后才显示（避免 question_start 控制消息先到时提前展示文本）
        val showAISubtitle = !displayAIText.isNullOrEmpty() && isFirstVoiceReceived
        val showCountdown = !isDhSpeaking && timeLimit != null && (timeLimit ?: 0) > 0 && !interviewCompleted
        
        if (showUserSubtitle || showAISubtitle || showCountdown) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .zIndex(15f)
                    .padding(bottom = if (isCameraMaximized) 40.dp else 60.dp)
                    .padding(horizontal = 24.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    color = Color.Black.copy(alpha = 0.65f),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        width = 0.5.dp,
                        color = Color.White.copy(alpha = 0.18f)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Interviewer Subtitle (AI) — KTV Style (面试官在上)
                        if (showAISubtitle) {
                            InterviewerTwoLineSubtitle(
                                fullText = displayAIText!!,
                                progress = finalHighlightProgress,
                                isSpeaking = isDhSpeaking,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                                
                        // User Subtitle (Me) — 用户字幕在下方
                        if (showUserSubtitle) {
                            UserRealtimeSubtitle(
                                text = userTranscript,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                            )
                        }
                                
                        // Circular Countdown
                        if (showCountdown && secondsLeft > 0) {
                            Spacer(modifier = Modifier.height(16.dp))
                            CircularCountdown(
                                totalTimeSeconds = timeLimit!!,
                                secondsLeft = secondsLeft,
                                modifier = Modifier.size(60.dp)
                            )
                        }
                    }
                }
            }
        }


        // Spacer for bottom padding if needed
        Spacer(modifier = Modifier.height(16.dp))

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
                        // release() will be handled by DisposableEffect onDispose
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
        // 使用弹簧物理动效高度（waveHeight1-4）追踪音量跳动
        if (avatarVolume > 5 && !isCameraMaximized) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 40.dp, end = 24.dp)
                    .zIndex(20f),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(waveHeight1, waveHeight2, waveHeight3, waveHeight4).forEach { height ->
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(height)
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
            // 首题语音尚未到达前的加载蒙版，根据连接阶段展示不同提示
            !isFirstVoiceReceived -> {
                val phaseMessage = remember(connectionPhase) {
                    when (connectionPhase) {
                        ConnectionPhase.CONNECTING_TTS -> "连接语音服务..."
                        ConnectionPhase.CONNECTING_ASR -> "连接语音识别服务..."
                        else -> "面试官正在准备资料，请稍后..."
                    }
                }
                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)).zIndex(30f), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator(color = Color(0xFF00C78A))
                        Text(phaseMessage, color = Color.White, fontSize = 14.sp)
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
fun LocalCameraPreview(
    lifecycleOwner: LifecycleOwner,
    onVideoCaptureCreated: (VideoCapture<Recorder>?) -> Unit
) {
    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            }
            
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                
                val recorder = Recorder.Builder()
                    .setQualitySelector(QualitySelector.from(Quality.HD))
                    .build()
                val videoCapture = VideoCapture.withOutput(recorder)
                
                onVideoCaptureCreated(videoCapture)

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
 * 动态字幕字号：字数越多字号越小，最低 12sp
 * ≤20字→22sp, 20-200字线性缩小至12sp, >200字→12sp
 */
private fun dynamicSubtitleFontSize(textLen: Int): Float {
    return when {
        textLen <= 20 -> 22f
        textLen <= 200 -> 22f - (textLen - 20).toFloat() / 180f * 10f
        else -> 12f
    }
}

/**
 * 根据字号估算字幕窗口可容纳的字符数
 * 每行约 280dp / fontSizeSp 个字，预留 3 行空间
 */
private fun subtitleWindowCapacity(fontSizeSp: Float): Int {
    return ((280f / fontSizeSp) * 3f).toInt().coerceIn(30, 120)
}

/**
 * 用户实时字幕（我）：动态字号 + 文字滚动顶走旧内容，无 "..." 截断
 */
@Composable
private fun UserRealtimeSubtitle(
    text: String,
    modifier: Modifier = Modifier
) {
    if (text.isEmpty()) return

    val displayText = "我: $text"
    val textLen = displayText.length

    // 动态字号
    val targetFontSize = dynamicSubtitleFontSize(textLen)
    val animatedFontSize by animateFloatAsState(
        targetValue = targetFontSize,
        animationSpec = tween(durationMillis = 200, easing = FastOutSlowInEasing),
        label = "user_subtitle_font"
    )

    // 根据字号计算窗口容量
    val capacity = subtitleWindowCapacity(animatedFontSize)
    
    // 超过容量时只显示尾部最新内容，旧文字被"顶走"
    val windowText = if (displayText.length > capacity) {
        displayText.substring(displayText.length - capacity)
    } else {
        displayText
    }

    // 行数也随字号动态调整
    val maxLines = when {
        animatedFontSize >= 20f -> 2
        animatedFontSize >= 16f -> 3
        else -> 4
    }

    Text(
        text = windowText,
        color = Color(0xFF00C78A),
        fontSize = animatedFontSize.sp,
        lineHeight = (animatedFontSize * 1.4f).sp,
        maxLines = maxLines,
        overflow = TextOverflow.Clip,
        textAlign = TextAlign.Center,
        fontWeight = FontWeight.Normal,
        modifier = modifier,
        style = TextStyle(
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.8f),
                offset = Offset(2f, 2f),
                blurRadius = 4f
            )
        )
    )
}


@Composable
private fun InterviewerTwoLineSubtitle(
    fullText: String,
    progress: Float,
    isSpeaking: Boolean,
    modifier: Modifier = Modifier
) {
    if (fullText.isEmpty()) return

    val p = if (isSpeaking) progress.coerceIn(0f, 1f) else 1f

    // 计算当前阅读位置
    val readIdx = (fullText.length * p).roundToInt().coerceIn(0, fullText.length)

    val textLen = fullText.length

    // 动态字号：字数越多越小，22sp→12sp，配合窗口滚动顶走旧文字
    val targetFontSize = dynamicSubtitleFontSize(textLen)
    val animatedFontSize by animateFloatAsState(
        targetValue = targetFontSize,
        animationSpec = tween(durationMillis = 250, easing = FastOutSlowInEasing),
        label = "subtitle_font_size"
    )
    val animatedLineHeight = animatedFontSize * 1.45f

    // 窗口配置：根据实时字号动态计算可容纳字符数
    val maxChars = subtitleWindowCapacity(targetFontSize)
    val maxDisplayLines = when {
        targetFontSize >= 20f -> 3
        targetFontSize >= 16f -> 4
        else -> 5
    }

    // 滑动窗口：高亮点固定在窗口 35% 处，readIdx 推进时窗口自动前移
    // 当文本超过窗口容量时，旧文本随着高亮推进被顶出视野
    val highlightPositionRatio = 0.35f
    val idealStart = (readIdx - (maxChars * highlightPositionRatio).toInt()).coerceIn(0, fullText.length)
    val start: Int
    val end: Int
    if (fullText.length <= maxChars) {
        // 文本短于窗口，显示全部
        start = 0
        end = fullText.length
    } else {
        // 文本长于窗口：窗口跟随高亮滑动，到达末尾后锁定显示最后 maxChars 个字符
        start = idealStart.coerceIn(0, fullText.length - maxChars)
        end = start + maxChars
    }

    val windowText = fullText.substring(start, end)
    val relativeReadIdx = (readIdx - start).coerceIn(0, windowText.length)

    // 优化2：高亮颜色配色
    //   已读 → 绿 (#4CAF50)，当前字 → 白色加粗，未读 → 灰 (#BBBBBB)
    val readColor = Color(0xFF4CAF50)
    val unreadColor = Color(0xFFBBBBBB)
    val currentColor = Color.White

    // 优化3：顶部渐隐 — 当窗口已经向后移（start>0）时，最前面 6 个字 alpha 1.0→0.3
    val fadeCount = 6
    val annotatedString = buildAnnotatedString {
        // 前缀
        withStyle(style = SpanStyle(color = readColor, fontWeight = FontWeight.Medium)) {
            append("面试官: ")
        }
        // 已读部分（含渐隐）
        val readEnd = min(relativeReadIdx, windowText.length)
        for (i in 0 until readEnd) {
            val isFading = start > 0 && i < fadeCount
            val alphaVal = if (isFading) {
                0.3f + (i.toFloat() / fadeCount.toFloat()) * 0.7f
            } else 1f
            withStyle(style = SpanStyle(color = readColor.copy(alpha = alphaVal))) {
                append(windowText[i].toString())
            }
        }
        // 当前字：白色加粗，强烈视觉引导
        if (relativeReadIdx < windowText.length) {
            withStyle(style = SpanStyle(color = currentColor, fontWeight = FontWeight.Bold)) {
                append(windowText[relativeReadIdx].toString())
            }
        }
        // 未读部分：灰色
        if (relativeReadIdx + 1 < windowText.length) {
            withStyle(style = SpanStyle(color = unreadColor)) {
                append(windowText.substring(relativeReadIdx + 1))
            }
        }
    }

    Text(
        text = annotatedString,
        fontSize = animatedFontSize.sp,
        lineHeight = animatedLineHeight.sp,
        maxLines = maxDisplayLines,
        overflow = TextOverflow.Clip,
        textAlign = TextAlign.Start,
        fontWeight = FontWeight.Normal,
        modifier = modifier,
        style = TextStyle(
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.85f),
                offset = Offset(1f, 2f),
                blurRadius = 6f
            )
        )
    )
}

@Composable
fun CircularCountdown(
    totalTimeSeconds: Int,
    secondsLeft: Int,
    modifier: Modifier = Modifier
) {
    val progress by animateFloatAsState(
        targetValue = secondsLeft.toFloat() / totalTimeSeconds.toFloat(),
        animationSpec = tween(durationMillis = 500, easing = LinearEasing),
        label = "countdown_progress"
    )

    Box(contentAlignment = Alignment.Center, modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 4.dp.toPx()
            val radius = (size.minDimension - strokeWidth) / 2f
            
            // 绘制底圈
            drawCircle(
                color = Color.White.copy(alpha = 0.2f),
                radius = radius,
                style = Stroke(width = strokeWidth)
            )
            
            // 绘制进度圈
            drawArc(
                color = Color(0xFF00C78A),
                startAngle = -90f,
                sweepAngle = 360f * progress,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }
        
        Text(
            text = secondsLeft.toString(),
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            style = TextStyle(
                shadow = Shadow(
                    color = Color.Black.copy(alpha = 0.5f),
                    offset = Offset(1f, 1f),
                    blurRadius = 2f
                )
            )
        )
    }
}

private fun Context.findActivity(): Activity? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}

