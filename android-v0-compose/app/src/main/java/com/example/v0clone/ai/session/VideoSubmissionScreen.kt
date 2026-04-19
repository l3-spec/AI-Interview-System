package com.xlwl.AiMian.ai.session

import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.OssRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.util.concurrent.Executors

private val bgColor = Color(0xFF0C1220)
private val accentColor = Color(0xFF4A9EFF)

/**
 * 视频答题提交页面（面试后录制答题视频）
 *
 * 替代 DigitalInterviewScreen，用于面试结束后提交答题视频。
 * 不包含数字人/语音对话逻辑，仅处理视频录制和上传。
 */
@Composable
fun VideoSubmissionScreen(
    state: AiInterviewFlowState,
    repository: AiInterviewRepository,
    ossRepository: OssRepository,
    onClose: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    val sortedQuestions = remember(state.sessionId, state.questions) {
        state.questions.sortedBy { it.questionIndex }
    }
    var currentIndex by remember(state.sessionId) { mutableIntStateOf(0) }
    var isSubmitting by remember(state.sessionId) { mutableStateOf(false) }
    var statusMessage by remember(state.sessionId) { mutableStateOf<String?>(null) }
    var errorMessage by remember(state.sessionId) { mutableStateOf<String?>(null) }
    var isRecording by remember { mutableStateOf(false) }
    var recordingDuration by remember { mutableStateOf(0) }
    var videoFile by remember { mutableStateOf<File?>(null) }
    var hasRecorded by remember { mutableStateOf(false) }

    val currentQuestion = sortedQuestions.getOrNull(currentIndex)
    val currentDisplayIndex = (currentQuestion?.questionIndex ?: currentIndex) + 1
    val totalQuestions = state.totalQuestions

    // 计时器
    LaunchedEffect(isRecording) {
        if (isRecording) {
            while (isRecording) {
                delay(1000)
                recordingDuration++
            }
        } else {
            recordingDuration = 0
        }
    }

    // 错误提示
    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            errorMessage = null
        }
    }

    // 视频录制器
    var videoCapture: VideoCapture<Recorder>? by remember { mutableStateOf(null) }
    var recording: Recording? by remember { mutableStateOf(null) }
    var tempVideoFile by remember { mutableStateOf<File?>(null) }

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            recording?.stop()
            cameraExecutor.shutdown()
        }
    }

    // 权限
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (!allGranted) {
            errorMessage = "需要相机和麦克风权限才能录制答题视频"
        }
    }

    LaunchedEffect(Unit) {
        val permissions = arrayOf(
            android.Manifest.permission.CAMERA,
            android.Manifest.permission.RECORD_AUDIO
        )
        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(context, it) == android.content.pm.PackageManager.PERMISSION_GRANTED
        }
        if (!allGranted) {
            permissionLauncher.launch(permissions)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // 顶部栏
            TopBar(
                currentIndex = currentDisplayIndex,
                totalQuestions = totalQuestions,
                statusMessage = statusMessage,
                onBack = onBack
            )

            // 进度条
            LinearProgressIndicator(
                progress = { currentIndex.toFloat() / totalQuestions },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp),
                color = accentColor,
                trackColor = Color.White.copy(alpha = 0.1f)
            )

            // 题目区域
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "第 $currentDisplayIndex / $totalQuestions 题",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = currentQuestion?.questionText ?: "题目加载中...",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )

                    if (hasRecorded) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .background(Color.Green.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = Color.Green,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "已录制",
                                color = Color.Green,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // 摄像头预览 + 录制控制
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.3f))
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // 摄像头预览
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = androidx.camera.view.PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.setSurfaceProvider(previewView.surfaceProvider)
                                }
                                val recorder = Recorder.Builder()
                                    .setQualitySelector(QualitySelector.from(Quality.HD))
                                    .build()
                                videoCapture = VideoCapture.withOutput(recorder)

                                val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
                                try {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        cameraSelector,
                                        preview,
                                        videoCapture
                                    )
                                } catch (e: Exception) {
                                    Log.e("VideoSubmission", "Camera bind failed", e)
                                }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // 录制指示器
                    if (isRecording) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(12.dp)
                                .background(Color.Red.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.FiberManualRecord,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = formatDuration(recordingDuration),
                                    color = Color.White,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // 录制按钮
                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // 上一题
                    IconButton(
                        onClick = {
                            if (currentIndex > 0) {
                                currentIndex--
                                hasRecorded = false
                                videoFile = null
                            }
                        },
                        enabled = currentIndex > 0 && !isRecording && !isSubmitting,
                        modifier = Modifier
                            .size(48.dp)
                            .background(
                                if (currentIndex > 0) Color.White.copy(alpha = 0.1f) else Color.Gray.copy(alpha = 0.3f),
                                CircleShape
                            )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "上一题",
                            tint = Color.White
                        )
                    }

                    // 录制按钮
                    Button(
                        onClick = {
                            if (isRecording) {
                                // 停止录制
                                recording?.stop()
                                recording = null
                                isRecording = false
                            } else {
                                // 开始录制
                                val outputFile = File.createTempFile(
                                    "video_${currentIndex}_",
                                    ".mp4",
                                    context.cacheDir
                                )
                                tempVideoFile = outputFile
                                val outputOptions = FileOutputOptions.Builder(outputFile).build()

                                recording = videoCapture?.output
                                    ?.prepareRecording(context, outputOptions)
                                    ?.withAudioEnabled()
                                    ?.start(cameraExecutor) { event ->
                                        when (event) {
                                            is VideoRecordEvent.Finalize -> {
                                                if (!event.hasError()) {
                                                    videoFile = outputFile
                                                    hasRecorded = true
                                                } else {
                                                    errorMessage = "视频录制失败: ${event.error}"
                                                }
                                            }
                                        }
                                    }
                                isRecording = true
                            }
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isRecording) Color.Red else accentColor
                        ),
                        shape = CircleShape,
                        modifier = Modifier.size(72.dp)
                    ) {
                        Icon(
                            imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.FiberManualRecord,
                            contentDescription = if (isRecording) "停止录制" else "开始录制",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // 下一题 / 提交
                    if (currentIndex < totalQuestions - 1) {
                        IconButton(
                            onClick = {
                                currentIndex++
                                hasRecorded = false
                                videoFile = null
                            },
                            enabled = !isRecording && !isSubmitting,
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    if (!isRecording) Color.White.copy(alpha = 0.1f) else Color.Gray.copy(alpha = 0.3f),
                                    CircleShape
                                )
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "下一题",
                                tint = Color.White
                            )
                        }
                    } else {
                        // 提交按钮
                        Button(
                            onClick = {
                                // 提交所有答案
                                coroutineScope.launch {
                                    isSubmitting = true
                                    statusMessage = "正在提交..."
                                    // TODO: 实现批量上传
                                    isSubmitting = false
                                    onClose()
                                }
                            },
                            enabled = !isRecording && !isSubmitting,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            ),
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            } else {
                                Text("提交全部", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    currentIndex: Int,
    totalQuestions: Int,
    statusMessage: String?,
    onBack: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .size(36.dp)
                .background(Color.White.copy(alpha = 0.1f), CircleShape)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "返回",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }

        Text(
            text = "答题录制",
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium
        )

        // 状态
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Color.White.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$currentIndex/$totalQuestions",
                color = Color.White,
                fontSize = 12.sp
            )
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%02d:%02d".format(m, s)
}
