package com.xlwl.AiMian.live2d

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.xlwl.AiMian.duix.DuixViewHost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.sqrt

/**
 * Simple test screen for the Live2D digital human.
 * Tests lip-sync and voice interaction.
 */
@Composable
fun Live2dTestScreen(
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var isModelReady by remember { mutableStateOf(false) }
    var duixStatus by remember { mutableStateOf<String?>("正在准备数字人...") }
    var isRecording by remember { mutableStateOf(false) }
    var mouthOpenness by remember { mutableFloatStateOf(0f) }
    
    // Create a shared controller that both DuixViewHost and lip-sync will use
    val controller = remember {
        Live2dDigitalHumanController(context)
    }
    
    var webView by remember { mutableStateOf<android.webkit.WebView?>(null) }
    
    // Initialize
    LaunchedEffect(Unit) {
        controller.createWebView()
        webView = controller.getWebView()
        val ok = controller.initialize()
        isModelReady = ok
        duixStatus = if (ok) "数字人已就绪" else "初始化失败"
    }
    
    // Permission handling
    var hasMicPermission by remember { mutableStateOf(false) }
    val micPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasMicPermission = granted
    }
    
    LaunchedEffect(Unit) {
        hasMicPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        
        if (!hasMicPermission) {
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }
    
    // RMS-based lip sync
    var lipSyncJob by remember { mutableStateOf<Job?>(null) }
    
    fun startLipSync() {
        if (!hasMicPermission) {
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            return
        }
        
        lipSyncJob?.cancel()
        isRecording = true
        
        lipSyncJob = scope.launch(Dispatchers.IO) {
            try {
                val sampleRate = 16000
                val bufferSize = AudioRecord.getMinBufferSize(
                    sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
                ).coerceAtLeast(2048)
                
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize
                )
                
                if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                    recorder.release()
                    return@launch
                }
                
                recorder.startRecording()
                val buffer = ByteArray(bufferSize)
                
                while (isActive && isRecording) {
                    val bytesRead = recorder.read(buffer, 0, buffer.size)
                    if (bytesRead > 0) {
                        // Calculate RMS
                        var sum = 0.0
                        for (i in 0 until bytesRead step 2) {
                            if (i + 1 < bytesRead) {
                                val sample = (buffer[i].toInt() and 0xFF) or 
                                            (buffer[i + 1].toInt() shl 8)
                                val s = sample.toShort().toDouble()
                                sum += s * s
                            }
                        }
                        val rms = sqrt(sum / (bytesRead / 2)).coerceIn(0.0, 32768.0)
                        val normalized = (rms / 32768.0 * 2.5).coerceIn(0.0, 1.0).toFloat()
                        
                        mouthOpenness = normalized
                        controller.updateMouthOpenness(normalized)
                    }
                    delay(16) // ~60fps
                }
                
                recorder.stop()
                recorder.release()
            } catch (e: Exception) {
                Log.e("Live2dTest", "Lip sync error", e)
            }
        }
    }
    
    fun stopLipSync() {
        lipSyncJob?.cancel()
        lipSyncJob = null
        isRecording = false
        mouthOpenness = 0f
        controller.updateMouthOpenness(0f)
        controller.resetMouth()
    }
    
    DisposableEffect(Unit) {
        onDispose {
            stopLipSync()
            controller.release()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Digital human
        if (webView != null) {
            DuixViewHost(
                modelUrl = "",
                baseConfigUrl = "",
                modifier = Modifier.fillMaxSize(),
                onReadyChanged = { ready -> isModelReady = ready },
                onStatusChanged = { status -> duixStatus = status }
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(duixStatus ?: "加载中...", color = Color.White)
                }
            }
        }
        
        // UI overlay
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top: back button and status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Gray.copy(alpha = 0.7f)
                    )
                ) {
                    Text("← 返回")
                }
                
                Text(
                    text = duixStatus ?: "",
                    color = Color.White,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .background(
                            Color.Black.copy(alpha = 0.5f),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
            
            // Bottom: controls
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Recording indicator
                if (isRecording) {
                    Text(
                        text = "🎤 正在聆听... (RMS: ${"%.2f".format(mouthOpenness)})",
                        color = Color.Red,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(8.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Manual mouth control slider
                Text(
                    text = "嘴型控制",
                    color = Color.White,
                    fontSize = 14.sp
                )
                Slider(
                    value = mouthOpenness,
                    onValueChange = { 
                        mouthOpenness = it
                        controller.updateMouthOpenness(it)
                    },
                    valueRange = 0f..1f,
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Record button
                Button(
                    onClick = { 
                        if (isRecording) stopLipSync()
                        else startLipSync()
                    },
                    enabled = isModelReady && hasMicPermission,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRecording) Color.Red else Color.Blue,
                        disabledContainerColor = Color.Gray
                    ),
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                ) {
                    Text(
                        text = if (isRecording) "⏹" else "🎤",
                        fontSize = 24.sp
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = if (isRecording) "点击停止" else "点击开始语音测试",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 12.sp
                )
            }
        }
    }
}
