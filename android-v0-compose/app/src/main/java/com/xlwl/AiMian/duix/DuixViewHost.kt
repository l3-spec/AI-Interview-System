package com.xlwl.AiMian.duix

import android.annotation.SuppressLint
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.xlwl.AiMian.live2d.Live2dDigitalHumanController

/**
 * DuixViewHost - Composable that hosts the Live2D digital human.
 * 
 * Replaces the previous DUIX SDK with a WebView-based Live2D Cubism SDK renderer.
 * All existing code (LipSyncDriver, RealtimeVoiceManager) works without changes.
 * 
 * @param modelUrl Ignored (model is loaded from assets)
 * @param baseConfigUrl Ignored  
 * @param modifier Compose modifier
 * @param onReadyChanged Called when the Live2D model is ready
 * @param onStatusChanged Called with status updates
 * @param installAudioSink Ignored
 * @param externalController Optional controller created externally.
 *        If provided, this host uses it instead of creating its own.
 *        Useful when sharing controller with RealtimeVoiceManager.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun DuixViewHost(
    modelUrl: String,
    baseConfigUrl: String,
    modifier: Modifier = Modifier,
    onReadyChanged: (Boolean) -> Unit = {},
    onStatusChanged: (String) -> Unit = {},
    installAudioSink: (sink: (String) -> Unit) -> Unit = {},
    externalController: Live2dDigitalHumanController? = null
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    
    // Use external controller if provided, otherwise create our own
    val controller = externalController ?: remember {
        Live2dDigitalHumanController(context)
    }
    
    var webView by remember { mutableStateOf<WebView?>(null) }
    var initStarted by remember { mutableStateOf(false) }
    
    // Initialize on first composition (but only once)
    LaunchedEffect(Unit) {
        if (!initStarted) {
            initStarted = true
            onStatusChanged("正在初始化数字人...")
            
            controller.createWebView()
            webView = controller.getWebView()
            
            val ok = controller.initialize()
            if (ok) {
                onReadyChanged(true)
                onStatusChanged("数字人已就绪")
                Log.i("DuixViewHost", "✅ Live2D ready")
            } else {
                onReadyChanged(false)
                onStatusChanged("数字人初始化失败")
                Log.e("DuixViewHost", "❌ Live2D init failed")
            }
        }
    }
    
    // Lifecycle management
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> controller.pause()
                Lifecycle.Event.ON_RESUME -> controller.resume()
                Lifecycle.Event.ON_DESTROY -> controller.release()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            // Only release if we created this controller ourselves
            if (externalController == null) {
                controller.release()
            }
        }
    }

    // Render WebView when ready
    if (webView != null) {
        AndroidView(
            factory = { ctx ->
                webView?.apply {
                    if (layoutParams == null) {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }
                    setBackgroundColor(android.graphics.Color.TRANSPARENT)
                } ?: WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(android.graphics.Color.TRANSPARENT)
                }
            },
            modifier = modifier.fillMaxSize()
        ) { /* WebView already configured */ }
    } else {
        LoadingPlaceholder(modifier)
    }
}

@Composable
private fun LoadingPlaceholder(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2
            val cy = size.height / 2
            val r = size.minDimension * 0.3f
            val pulse = (kotlin.math.sin(System.currentTimeMillis() / 500.0) + 1) / 2
            val alpha = (0.3f + pulse * 0.3f).toFloat()
            drawCircle(
                color = androidx.compose.ui.graphics.Color(0xFFE8D5C4),
                radius = r,
                center = androidx.compose.ui.geometry.Offset(cx, cy),
                alpha = alpha
            )
        }
    }
}
