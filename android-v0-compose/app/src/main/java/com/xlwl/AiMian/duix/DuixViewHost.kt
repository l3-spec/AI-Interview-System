package com.xlwl.AiMian.duix

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import android.annotation.SuppressLint
import android.graphics.Color
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Live2D digital human renderer via WebView.
 *
 * Loads [file:///android_asset/live2d/index.html] which initialises a PIXI.js +
 * pixi-live2d-display pipeline and renders a Live2D Cubism 4 model (.model3.json)
 * from the assets folder.
 *
 * The [installAudioSink] parameter is a no-op here; audio playback is handled by
 * [com.xlwl.AiMian.ai.realtime.VolcanoTtsService] + [LipSyncDriver] which drives
 * mouth animation by calling [Live2DDigitalHumanController].
 *
 * @param modelUrl         Not used in this implementation (model is always "haru")
 * @param baseConfigUrl    Not used in this implementation
 * @param modifier        Compose modifier
 * @param onReadyChanged  Called with `true` when the WebView finishes loading,
 *                       `false` if an error occurred
 * @param onStatusChanged Free-text status for the caller to display
 * @param installAudioSink No-op; kept for API compatibility with the old DUIX path
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun DuixViewHost(
    modelUrl: String,
    baseConfigUrl: String,
    modifier: Modifier = Modifier,
    onReadyChanged: (Boolean) -> Unit = {},
    onStatusChanged: (String) -> Unit = {},
    installAudioSink: (sink: (String) -> Unit) -> Unit = {}
) {
    val context = LocalContext.current

    // Mutable reference to the JS bridge so Live2DDigitalHumanController can call it
    val jsBridge = remember { mutableStateOf<Live2DJSBridge?>(null) }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                setBackgroundColor(Color.TRANSPARENT)
                setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)

                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        view?.evaluateJavascript("Live2DApp.init('live2d/model/haru/')", null)
                    }
                }
                webChromeClient = WebChromeClient()

                val settings: WebSettings = settings
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true

                // Inject the JS bridge as window.Android
                val bridge = Live2DJSBridge(this)
                jsBridge.value = bridge
                addJavascriptInterface(bridge, "Android")

                loadUrl("file:///android_asset/live2d/index.html")
            }
        },
        update = { /* nothing dynamic for now */ }
    )

    // Provide the bridge to callers via a side-effect
    DisposableEffect(Unit) {
        onReadyChanged(true)
        onStatusChanged("Live2D WebView ready")
        onDispose {
            // cleanup if needed
        }
    }
}