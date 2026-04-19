package com.xlwl.AiMian.ai.guide

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import android.media.*
import android.media.audiofx.*
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.PI
import kotlin.math.sin

private val GuideBgWhite = Color(0xFFFFFFFF)
private val GuideTextPrimary = Color(0xFF1A1A1A)
private val GuideTextSecondary = Color(0xFF666666)
private val GuideGreen = Color(0xFF00C78A)
private val GuideButtonBg = Color(0xFF2C2D31)
private val GuideSurface = Color(0xFFF7F8FA)
private val GuideBlue = Color(0xFF3860F4)
private val GuideRed = Color(0xFFFF5A5A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InterviewDeviceTestScreen(
    onBack: () -> Unit,
    onFinish: () -> Unit
) {
    val context = LocalContext.current
    var hasAudioPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasAudioPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasAudioPermission) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    var isSpeakerTest by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(true) }

    // --- 音频测试逻辑 ---
    val sampleRate = 44100
    
    // 扬声器测试音频生成与播放
    LaunchedEffect(isSpeakerTest, isPlaying) {
        if (isSpeakerTest && isPlaying) {
            val bufferSize = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val audioTrack = AudioTrack(
                AudioManager.STREAM_MUSIC,
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize,
                AudioTrack.MODE_STREAM
            )
            
            val frequency = 440.0 // 440Hz 柔和音
            val buffer = ShortArray(bufferSize)
            var phase = 0.0
            
            audioTrack.play()
            
            withContext(Dispatchers.Default) {
                while (isSpeakerTest && isPlaying) {
                    for (i in buffer.indices) {
                        // 生成正弦波，并添加简单的包络以使其听起来更柔和
                        val envelope = if (isPlaying) 0.3f else 0f
                        buffer[i] = (sin(phase) * Short.MAX_VALUE * envelope).toInt().toShort()
                        phase += 2.0 * PI * frequency / sampleRate
                    }
                    audioTrack.write(buffer, 0, buffer.size)
                }
            }
            audioTrack.stop()
            audioTrack.release()
        }
    }

    // 麦克风回环测试（Loopback）
    LaunchedEffect(isSpeakerTest, isPlaying, hasAudioPermission) {
        if (!isSpeakerTest && isPlaying && hasAudioPermission) {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val outBufferSize = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val bufferSize = maxOf(minBufferSize, outBufferSize)
            
            // 使用 VOICE_COMMUNICATION 以获得系统级回声消除
            val audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )
            
            // 使用 STREAM_VOICE_CALL 以配合 AEC
            val audioTrack = AudioTrack(
                AudioManager.STREAM_VOICE_CALL,
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize,
                AudioTrack.MODE_STREAM
            )
            
            // 显式开启回声消除、噪声抑制和自动增益控制（如果支持）
            val sessionId = audioRecord.audioSessionId
            var aec: AcousticEchoCanceler? = null
            var ns: NoiseSuppressor? = null
            var agc: AutomaticGainControl? = null
            
            if (AcousticEchoCanceler.isAvailable()) {
                aec = AcousticEchoCanceler.create(sessionId)?.apply { enabled = true }
            }
            if (NoiseSuppressor.isAvailable()) {
                ns = NoiseSuppressor.create(sessionId)?.apply { enabled = true }
            }
            if (AutomaticGainControl.isAvailable()) {
                agc = AutomaticGainControl.create(sessionId)?.apply { enabled = true }
            }

            val buffer = ShortArray(bufferSize)
            val originalMode = audioManager.mode
            
            try {
                // 设置为通话模式以充分利用系统音频处理能力
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioRecord.startRecording()
                audioTrack.play()
                
                withContext(Dispatchers.Default) {
                    while (!isSpeakerTest && isPlaying) {
                        val readCount = audioRecord.read(buffer, 0, bufferSize)
                        if (readCount > 0) {
                            // 稍微降低增益以防反馈回路激增产生啸叫 (0.6倍缩放)
                            for (i in 0 until readCount) {
                                buffer[i] = (buffer[i] * 0.6f).toInt().toShort()
                            }
                            audioTrack.write(buffer, 0, readCount)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                runCatching {
                    audioManager.mode = originalMode
                    aec?.release()
                    ns?.release()
                    agc?.release()
                    audioRecord.stop()
                    audioRecord.release()
                    audioTrack.stop()
                    audioTrack.release()
                }
            }
        }
    }

    Scaffold(
        containerColor = GuideBgWhite,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "调整麦克和扬声器",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = GuideTextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "返回",
                            tint = GuideTextPrimary
                        )
                    }
                },
                actions = {
                    Row(
                        modifier = Modifier
                            .padding(end = 16.dp)
                            .background(Color(0xFFF5F5F5), RoundedCornerShape(16.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(Color.Black, CircleShape)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(4.dp)
                                    .background(Color.White, CircleShape)
                                    .align(Alignment.Center)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = GuideBgWhite
                )
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(GuideBgWhite)
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .navigationBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (isSpeakerTest) "确认音量合适后，将进入麦克风检测" else "确认收音正常后，将正式接入面试",
                    color = GuideTextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                Button(
                    onClick = {
                        if (isSpeakerTest) {
                            isSpeakerTest = false
                        } else {
                            if (hasAudioPermission) {
                                onFinish()
                            } else {
                                permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(27.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GuideButtonBg,
                        contentColor = GuideGreen
                    )
                ) {
                    Text(
                        text = if (isSpeakerTest) "确定音量合适" else "开始面试",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = "2/2",
                    fontSize = 16.sp,
                    color = GuideTextSecondary,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = GuideRed,
                    modifier = Modifier.size(16.dp).padding(top = 2.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Column {
                    Text(
                        text = "本场面试要求使用麦克风和扬声器，请保持设备开启",
                        color = GuideTextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                DeviceTestCard(
                    modifier = Modifier.weight(1f),
                    title = "扬声器检测",
                    icon = "🔊", // Emoji simplified
                    isActive = isSpeakerTest,
                    statusText = if (isSpeakerTest) "检测中" else "已完成"
                )
                DeviceTestCard(
                    modifier = Modifier.weight(1f),
                    title = "麦克风检测",
                    icon = "🎙️",
                    isActive = !isSpeakerTest,
                    statusText = if (!isSpeakerTest) "检测中" else "待检测"
                )
            }

            Spacer(modifier = Modifier.height(64.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE5F7F1))
                        .clickable { isPlaying = !isPlaying },
                    contentAlignment = Alignment.Center
                ) {
                    if (isPlaying) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(6.dp, 24.dp).background(GuideGreen, RoundedCornerShape(3.dp)))
                            Box(modifier = Modifier.size(6.dp, 24.dp).background(GuideGreen, RoundedCornerShape(3.dp)))
                        }
                    } else {
                        // Play icon triangle
                        androidx.compose.foundation.Canvas(modifier = Modifier.size(24.dp)) {
                            val path = androidx.compose.ui.graphics.Path().apply {
                                moveTo(0f, 0f)
                                lineTo(size.width, size.height / 2f)
                                lineTo(0f, size.height)
                                close()
                            }
                            drawPath(path, color = GuideGreen)
                        }
                    }
                }

                Spacer(modifier = Modifier.width(24.dp))

                Column {
                    Text(
                        text = if (isSpeakerTest) "测试音频正在播放" else "请对着麦克风说话",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = GuideTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isSpeakerTest) "请注意调节音量" else "识别环境噪音中",
                        fontSize = 14.sp,
                        color = GuideTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Progress bar
            AudioVisualizer(isPlaying = isPlaying)

        }
    }
}

@Composable
private fun DeviceTestCard(
    modifier: Modifier = Modifier,
    title: String,
    icon: String,
    isActive: Boolean,
    statusText: String
) {
    Surface(
        modifier = modifier.height(96.dp),
        color = GuideSurface,
        shape = RoundedCornerShape(16.dp),
        border = if (isActive) androidx.compose.foundation.BorderStroke(1.dp, GuideBlue.copy(alpha = 0.3f)) else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = icon, fontSize = 16.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = statusText,
                    fontSize = 12.sp,
                    color = if (isActive) GuideBlue else GuideTextSecondary,
                    fontWeight = FontWeight.Medium
                )
            }
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = if (isActive) GuideTextPrimary else GuideTextSecondary
            )
        }
    }
}

@Composable
private fun AudioVisualizer(isPlaying: Boolean) {
    val barCount = 30
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 0 until barCount) {
            // Randomly animate volume level if playing
            val targetLevel = remember(isPlaying) { if (isPlaying) (Math.random() * 0.8 + 0.2).toFloat() else 0.1f }
            val animatedLevel by animateFloatAsState(
                targetValue = targetLevel,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = (400..800).random(), easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = ""
            )
            
            // Re-trigger random target when playing
            var currentLevel by remember { mutableStateOf(0.1f) }
            LaunchedEffect(isPlaying) {
                while(isPlaying) {
                    currentLevel = (Math.random() * 0.8 + 0.2).toFloat()
                    delay((200..600).random().toLong())
                }
                currentLevel = 0.1f
            }
            
            val explicitAnimatedLevel by animateFloatAsState(
                targetValue = currentLevel,
                animationSpec = tween(durationMillis = 300),
                label = "volume"
            )

            // Make the first few green, the rest gray just like screenshot
            val isGreenPart = i < barCount * 0.3f
            
            val barHeight = 4.dp + 24.dp * explicitAnimatedLevel

            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(barHeight)
                    .background(
                        color = if (isGreenPart) GuideGreen else Color(0xFFE0E0E0),
                        shape = RoundedCornerShape(1.5.dp)
                    )
            )
        }
    }
}
