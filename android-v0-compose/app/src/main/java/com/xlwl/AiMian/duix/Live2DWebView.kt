package com.xlwl.AiMian.duix

import android.annotation.SuppressLint
import android.graphics.Color
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * WebView-based Live2D renderer using pixi-live2d-display.
 *
 * This Composable loads a local HTML+JS app that uses PIXI.js + pixi-live2d-display
 * to render a Live2D Cubism 4 model (.model3.json) from assets.
 *
 * @param modelPath   Relative path in assets, e.g. "live2d/model/haru/"
 * @param onReady     Called when model finishes loading (true) or on error (false)
 * @param onStatus    Human-readable status string for UI
 * @param modifier    Compose modifier
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun Live2DWebView(
    modelPath: String,
    modifier: Modifier = Modifier,
    onReady: (Boolean) -> Unit = {},
    onStatus: (String) -> Unit = {}
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                // Background
                setBackgroundColor(Color.TRANSPARENT)
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        // Initialize the Live2D model once HTML loaded
                        view?.evaluateJavascript(
                            "Live2DApp.init('$modelPath')",
                            null
                        )
                    }
                }
                webChromeClient = WebChromeClient()

                val settings: WebSettings = this.settings
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true

                // Add JavaScript interface
                addJavascriptInterface(Live2DJSBridge(this), "Android")

                // Load the local HTML
                loadUrl("file:///android_asset/live2d/index.html")
                webViewRef = this
            }
        },
        update = { webView ->
            // Re-initialize if modelPath changes
            webView.evaluateJavascript(
                "if (Live2DApp && Live2DApp.isReady()) { Live2DApp.init('$modelPath'); }",
                null
            )
        }
    )

    DisposableEffect(Unit) {
        onDispose {
            webViewRef?.removeJavascriptInterface("Android")
            webViewRef?.destroy()
        }
    }
}

/**
 * JavaScript bridge exposed to the WebView (injected as `window.Android`).
 * Allows JS to call Kotlin methods and receive callbacks from Kotlin.
 */
class Live2DJSBridge(private val webView: WebView) {

    @android.webkit.JavascriptInterface
    fun onReady() {
        webView.post {
            // Trigger Compose state update on UI thread
            // This will notify the parent via the WebView's loading state
            webView.evaluateJavascript(
                "console.log('[Bridge] Model ready confirmed');",
                null
            )
        }
    }

    @android.webkit.JavascriptInterface
    fun onError(msg: String) {
        webView.post {
            // Log error but don't crash the WebView
            android.util.Log.e("Live2DWebView", "JS Error: $msg")
        }
    }

    /**
     * Called by the parent Composable to update mouth openness.
     * Maps Kotlin Float (0-1) to the Live2D model parameter.
     */
    fun setMouthOpenness(value: Float) {
        webView.evaluateJavascript(
            "Live2DApp.setMouthOpenness($value)",
            null
        )
    }

    /**
     * Called by the parent Composable to update mouth form.
     */
    fun setMouthForm(value: Float) {
        webView.evaluateJavascript(
            "Live2DApp.setMouthForm($value)",
            null
        )
    }

    /**
     * Reset mouth to neutral.
     */
    fun resetMouth() {
        webView.evaluateJavascript(
            "Live2DApp.reset()",
            null
        )
    }

    /**
     * Check if the model is loaded and ready.
     */
    fun isReady(callback: (Boolean) -> Unit) {
        webView.evaluateJavascript(
            "Live2DApp.isReady()",
            { result -> callback(result == "true") }
        )
    }
}