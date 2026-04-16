package com.xlwl.AiMian.digitalhuman

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.util.Log
import android.view.MotionEvent
import android.view.SurfaceView
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.tongyi.video_chat_sdk.Constant.ChatMessageType
import com.tongyi.video_chat_sdk.conv.ConvConstants
import com.xlwl.AiMian.digitalhuman.AliyunAvatarTheme.bgColor
import com.xlwl.AiMian.digitalhuman.AliyunAvatarTheme.accentColor
import com.xlwl.AiMian.digitalhuman.AliyunAvatarTheme.userBubbleColor
import com.xlwl.AiMian.digitalhuman.AliyunAvatarTheme.aiBubbleColor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * 阿里云数字人面试屏幕
 *
 * 全屏沉浸式数字人面试界面，使用阿里云通义万相 2D 数字人。
 * 支持 TAP2TALK 模式（点击数字人说话）。
 */
@SuppressLint("MissingPermission")
@Composable
fun AliyunAvatarScreen(
    projectId: String = com.xlwl.AiMian.BuildConfig.ALIYUN_AVATAR_PROJECT_ID,
    interviewQuestion: String? = null,
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    // 隐藏系统栏
    DisposableEffect(activity) {
        activity?.let { act ->
            val window = act.window
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            controller.isAppearanceLightStatusBars = false
            controller.isAppearanceLightNavigationBars = false
            controller.hide(WindowInsetsCompat.Type.systemBars())
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        onDispose {
            activity?.let { act ->
                val window = act.window
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.show(WindowInsetsCompat.Type.systemBars())
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    // 创建控制器
    val avatarController = remember {
        AliyunAvatarController(
            activity = activity!!,
            projectId = projectId,
            onSessionReady = { },
            onMessageReceived = { text, isUser ->
                Log.d("AliyunAvatarScreen", "Message: $text (user=$isUser)")
            },
            onStateChanged = { state ->
                Log.d("AliyunAvatarScreen", "State: $state")
            },
            onError = { error ->
                Log.e("AliyunAvatarScreen", "Error: $error")
                Toast.makeText(context, error, Toast.LENGTH_LONG).show()
            }
        )
    }

    val isReady by avatarController.isReady.collectAsState()
    val dialogState by avatarController.dialogState.collectAsState()
    val statusMessage by avatarController.statusMessage.collectAsState()

    // 数字人就绪后，发送初始面试题目
    LaunchedEffect(isReady, interviewQuestion) {
        if (isReady && !interviewQuestion.isNullOrBlank()) {
            avatarController.sendInterviewQuestion(interviewQuestion)
        }
    }

    // 对话列表
    var messages by remember { mutableStateOf(listOf<ChatMessage>()) }

    // 麦克风状态
    var isMuted by remember { mutableStateOf(false) }

    // 生命周期
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> { /* 保持会话 */ }
                Lifecycle.Event.ON_RESUME -> { }
                Lifecycle.Event.ON_DESTROY -> avatarController.release()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            avatarController.release()
        }
    }

    // 权限检查
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            avatarController.startSession()
        } else {
            Toast.makeText(context, "需要麦克风权限才能进行语音对话", Toast.LENGTH_LONG).show()
        }
    }

    // 请求权限并启动
    LaunchedEffect(Unit) {
        val audioPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
        if (audioPermission == PackageManager.PERMISSION_GRANTED) {
            avatarController.startSession()
        } else {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // 数字人渲染层 (底层)
        DigitalHumanSurfaceView(
            modifier = Modifier.fillMaxSize(),
            controller = avatarController
        )

        // 顶部状态栏
        TopBar(
            statusMessage = statusMessage,
            isReady = isReady,
            onBack = {
                avatarController.release()
                onBack()
            },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
        )

        // 底部对话区域
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Color.Black.copy(alpha = 0.6f),
                    RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                )
                .padding(16.dp)
        ) {
            // 对话气泡列表
            if (messages.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .padding(bottom = 12.dp)
                ) {
                    items(messages) { msg ->
                        ChatBubble(
                            message = msg,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // 状态文本
            val currentDialogState = dialogState
            val stateText = when (currentDialogState) {
                ConvConstants.DialogState.DIALOG_LISTENING -> "🎙️ 我正在听，请说..."
                ConvConstants.DialogState.DIALOG_THINKING -> "🤔 思考中..."
                ConvConstants.DialogState.DIALOG_RESPONDING -> "💬 回答中..."
                else -> if (isReady) "👋 点击数字人开始对话" else "⏳ 数字人初始化中..."
            }

            val isListening = currentDialogState == ConvConstants.DialogState.DIALOG_LISTENING

            // 说话动画
            val infiniteTransition = rememberInfiniteTransition(label = "pulse")
            val pulseAlpha by infiniteTransition.animateFloat(
                initialValue = 0.5f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(600, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "pulseAlpha"
            )

            // TAP2TALK 交互区
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        if (isListening) accentColor.copy(alpha = pulseAlpha * 0.3f)
                        else Color.White.copy(alpha = 0.05f)
                    )
                    .then(
                        if (isListening) {
                            Modifier.pointerInput(Unit) {
                                detectTapGestures(
                                    onTap = {
                                        if (isReady) {
                                            avatarController.interrupt()
                                        }
                                    }
                                )
                            }
                        } else Modifier
                    )
                    .clickable(enabled = isReady && !isListening) {
                        avatarController.interrupt()
                    },
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = if (isListening) Icons.Default.Mic else Icons.Default.Person,
                        contentDescription = null,
                        tint = if (isListening) accentColor else Color.White.copy(alpha = 0.7f),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stateText,
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 底部控制栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 麦克风静音
                IconButton(
                    onClick = {
                        isMuted = !isMuted
                    },
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            if (isMuted) Color.Red.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f),
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        contentDescription = if (isMuted) "取消静音" else "静音",
                        tint = Color.White
                    )
                }

                // 返回按钮
                Button(
                    onClick = {
                        avatarController.release()
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("结束面试", color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    statusMessage: String,
    isReady: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 状态指示
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        if (isReady) Color.Green else Color.Yellow,
                        CircleShape
                    )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = statusMessage,
                color = Color.White,
                fontSize = 12.sp
            )
        }

        // 返回按钮
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .size(36.dp)
                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "返回",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun ChatBubble(
    message: ChatMessage,
    modifier: Modifier = Modifier
) {
    val isUser = message.role == ConversationRole.USER
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(
                    if (isUser) userBubbleColor else aiBubbleColor,
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isUser) 16.dp else 4.dp,
                        bottomEnd = if (isUser) 4.dp else 16.dp
                    )
                )
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Text(
                text = message.text,
                color = Color.White,
                fontSize = 14.sp
            )
        }
    }
}

/**
 * 将 TYVideoChat 的 SurfaceView 嵌入到 Compose UI
 */
@Composable
private fun DigitalHumanSurfaceView(
    modifier: Modifier = Modifier,
    controller: AliyunAvatarController
) {
    val sv by controller.surfaceView.collectAsState()

    AndroidView(
        factory = { ctx ->
            FrameLayout(ctx).apply {
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
            }
        },
        modifier = modifier,
        update = { container ->
            val surfaceView = controller.getSurfaceView()
            if (surfaceView != null && surfaceView.parent != container) {
                // 移除旧子视图
                for (i in container.childCount - 1 downTo 0) {
                    container.removeViewAt(i)
                }
                // 添加渲染视图
                if (surfaceView.parent != null) {
                    (surfaceView.parent as ViewGroup).removeView(surfaceView)
                }
                val params = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                container.addView(surfaceView, params)
            }
        }
    )
}
