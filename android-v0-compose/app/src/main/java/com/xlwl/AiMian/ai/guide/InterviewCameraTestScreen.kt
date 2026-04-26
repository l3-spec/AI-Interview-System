package com.xlwl.AiMian.ai.guide

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.util.Log
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import kotlinx.coroutines.launch
import android.widget.Toast

private val GuideBgWhite = Color(0xFFFFFFFF)
private val GuideTextPrimary = Color(0xFF1A1A1A)
private val GuideTextSecondary = Color(0xFF666666)
private val GuideGreen = Color(0xFF00C78A)
private val GuideButtonBg = Color(0xFF2C2D31)
private val GuideButtonLightBg = Color(0xFFE8F7F2)
private val GuideRed = Color(0xFFFF5A5A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InterviewCameraTestScreen(
    repository: AiInterviewRepository,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    var hasAudioPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true
        hasAudioPermission = permissions[Manifest.permission.RECORD_AUDIO] == true
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission || !hasAudioPermission) {
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        }
    }

    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var isUploading by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = GuideBgWhite,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "拍摄面试照",
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
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = GuideTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
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
                    text = "请拍照并上传你的照片正式加入面试",
                    color = GuideTextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                if (capturedBitmap == null) {
                    Button(
                        onClick = {
                            val capture = imageCapture ?: return@Button
                            capture.takePicture(
                                ContextCompat.getMainExecutor(context),
                                object : ImageCapture.OnImageCapturedCallback() {
                                    override fun onCaptureSuccess(imageProxy: ImageProxy) {
                                        val bitmap = imageProxy.toBitmap()
                                        capturedBitmap = bitmap
                                        imageProxy.close()
                                    }

                                    override fun onError(exception: ImageCaptureException) {
                                        Log.e("CameraTest", "Photo capture failed: ${exception.message}", exception)
                                    }
                                }
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp),
                        enabled = hasCameraPermission,
                        shape = RoundedCornerShape(27.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GuideButtonBg,
                            contentColor = GuideGreen
                        )
                    ) {
                        Text("开始拍照", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Button(
                            onClick = { capturedBitmap = null },
                            modifier = Modifier
                                .weight(1f)
                                .height(54.dp),
                            shape = RoundedCornerShape(27.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GuideButtonLightBg,
                                contentColor = GuideGreen
                            )
                        ) {
                            Text("重拍", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                        }
                        Button(
                            onClick = {
                                val bitmap = capturedBitmap ?: return@Button
                                isUploading = true
                                scope.launch {
                                    val result = repository.uploadFacePhoto(bitmap)
                                    isUploading = false
                                    result.onSuccess {
                                        onNext()
                                    }.onFailure { error ->
                                        Toast.makeText(context, error.message ?: "图片上传失败", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(54.dp),
                            enabled = !isUploading,
                            shape = RoundedCornerShape(27.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GuideButtonBg,
                                contentColor = GuideGreen
                            )
                        ) {
                            if (isUploading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = GuideGreen,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("下一步", fontSize = 16.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
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
                    text = "1/2",
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
                        text = "本场面试要求使用摄像头和麦克风，请保持设备开启",
                        color = GuideTextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 4f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                if (hasCameraPermission) {
                    if (capturedBitmap != null) {
                        Image(
                            bitmap = capturedBitmap!!.asImageBitmap(),
                            contentDescription = "Captured Photo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(16.dp)
                                .size(24.dp)
                                .background(GuideGreen, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    } else {
                        AndroidView(
                            factory = { ctx ->
                                val previewView = PreviewView(ctx).apply {
                                    layoutParams = ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    scaleType = PreviewView.ScaleType.FILL_CENTER
                                }

                                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                                cameraProviderFuture.addListener({
                                    val cameraProvider = cameraProviderFuture.get()
                                    val preview = Preview.Builder().build().also {
                                        it.setSurfaceProvider(previewView.surfaceProvider)
                                    }
                                    val imageCaptureBuilder = ImageCapture.Builder()
                                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                                        .build()
                                    imageCapture = imageCaptureBuilder

                                    val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

                                    try {
                                        cameraProvider.unbindAll()
                                        cameraProvider.bindToLifecycle(
                                            lifecycleOwner,
                                            cameraSelector,
                                            preview,
                                            imageCaptureBuilder
                                        )
                                    } catch (exc: Exception) {
                                        Log.e("CameraTest", "Use case binding failed", exc)
                                    }
                                }, ContextCompat.getMainExecutor(ctx))

                                previewView
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    
                    // Face Overlay
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val ovalWidth = size.width * 0.55f
                        val ovalHeight = size.height * 0.55f
                        val ovalRect = androidx.compose.ui.geometry.Rect(
                            offset = Offset(size.width / 2 - ovalWidth / 2, size.height / 2 - ovalHeight / 2),
                            size = Size(ovalWidth, ovalHeight)
                        )

                        // If not captured, show dashed oval and darken edges
                        if (capturedBitmap == null) {
                            drawRect(
                                color = Color.Black.copy(alpha = 0.3f),
                                size = size
                            )
                            drawOval(
                                color = Color.Transparent,
                                topLeft = ovalRect.topLeft,
                                size = ovalRect.size,
                                blendMode = BlendMode.Clear
                            )
                        }
                        
                        drawOval(
                            color = Color.White,
                            topLeft = ovalRect.topLeft,
                            size = ovalRect.size,
                            style = Stroke(
                                width = 4f,
                                pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f)
                            )
                        )
                    }
                } else {
                    Text(
                        text = "需要相机权限",
                        color = Color.White,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }
}
