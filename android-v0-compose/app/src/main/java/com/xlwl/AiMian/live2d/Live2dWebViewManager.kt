package com.xlwl.AiMian.live2d

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * WebView-based Live2D renderer using pixi-live2d-display.
 * 
 * Loads the Live2D model from local assets (haru model) and exposes
 * mouth control via JavaScript interface for lip-sync.
 */
@SuppressLint("SetJavaScriptEnabled")
class Live2dWebViewManager(private val context: Context) {

    companion object {
        private const val TAG = "Live2dWebViewManager"
        
        // Path to the Live2D assets directory
        private const val LIVE2D_ASSET_PATH = "live2d/"
        private const val MODEL_PATH = "live2d/model/haru/"
        
        // Timeout for model initialization
        private const val INIT_TIMEOUT_MS = 15000L
    }

    private var webView: WebView? = null
    private var isReady = false
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // JavaScript callback interface exposed to WebView
    class Live2DJsInterface(
        private val onReady: () -> Unit,
        private val onError: (String) -> Unit
    ) {
        @JavascriptInterface
        fun onReady() {
            Log.i(TAG, "Live2D WebView ready callback received")
            onReady()
        }

        @JavascriptInterface
        fun onError(msg: String) {
            Log.e(TAG, "Live2D WebView error: $msg")
            onError(msg)
        }
    }

    /**
     * Create and configure the WebView for Live2D rendering.
     * Must be called on the main thread.
     */
    fun createWebView(): WebView {
        Log.d(TAG, "Creating Live2D WebView")
        
        val wv = WebView(context).apply {
            // Basic setup
            setBackgroundColor(android.graphics.Color.TRANSPARENT)
            
            // Enable JavaScript (required for PIXI.js + pixi-live2d)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                
                // Performance settings
                cacheMode = WebSettings.LOAD_DEFAULT
                allowFileAccess = true
                allowContentAccess = true
                
                // Disable zoom (no pinch-to-zoom needed)
                setSupportZoom(false)
                displayZoomControls = false
            }
            
            // Transparent background
            setLayerType(android.webkit.WebView.LAYER_TYPE_HARDWARE, null)
        }
        
        webView = wv
        return wv
    }

    /**
     * Initialize the Live2D model in the WebView.
     * Loads the HTML page from assets and starts the model.
     * 
     * @return true if initialization started successfully
     */
    suspend fun initialize(): Boolean = suspendCancellableCoroutine { cont ->
        val wv = webView
        if (wv == null) {
            Log.e(TAG, "WebView not created yet")
            cont.resume(false)
            return@suspendCancellableCoroutine
        }

        Log.i(TAG, "Initializing Live2D WebView...")
        isReady = false

        wv.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d(TAG, "WebView page finished: $url")
            }
        }

        wv.webChromeClient = WebChromeClient()

        // JavaScript interface for callbacks from WebView
        val jsInterface = Live2DJsInterface(
            onReady = {
                mainHandler.post {
                    isReady = true
                    Log.i(TAG, "Live2D model is ready!")
                    if (cont.isActive) cont.resume(true)
                }
            },
            onError = { msg ->
                mainHandler.post {
                    Log.e(TAG, "Live2D error: $msg")
                    // Even on error, we consider it "ready" (showPlaceholder will be used)
                    isReady = true
                    if (cont.isActive) cont.resume(true)
                }
            }
        )
        wv.addJavascriptInterface(jsInterface, "Android")

        // Load the Live2D HTML page from assets
        val htmlUrl = "file:///android_asset/${LIVE2D_ASSET_PATH}index.html"
        Log.d(TAG, "Loading Live2D HTML: $htmlUrl")
        
        wv.loadUrl(htmlUrl)

        // Timeout handling
        mainHandler.postDelayed({
            if (cont.isActive && !isReady) {
                Log.w(TAG, "Live2D init timeout, assuming ready")
                isReady = true
                cont.resume(true)
            }
        }, INIT_TIMEOUT_MS)
    }

    /**
     * Set the mouth openness (0.0 = closed, 1.0 = fully open).
     * Used for lip-sync driven by audio amplitude.
     */
    fun setMouthOpenness(value: Float) {
        val wv = webView ?: return
        val clamped = value.coerceIn(0f, 1f)
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp.setMouthOpenness($clamped)")
        }
    }

    /**
     * Set the mouth form/shape (-1.0 = narrow, 0.0 = neutral, 1.0 = wide).
     * Used for phoneme-based lip shaping.
     */
    fun setMouthForm(value: Float) {
        val wv = webView ?: return
        val clamped = value.coerceIn(-1f, 1f)
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp.setMouthForm($clamped)")
        }
    }

    /**
     * Reset mouth to neutral (closed) position.
     */
    fun resetMouth() {
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp.reset()")
        }
    }

    /**
     * Check if the WebView and model are ready.
     */
    fun isReady(): Boolean = isReady

    /**
     * Pause the WebView rendering (when app is backgrounded).
     */
    fun pause() {
        webView?.onPause()
        Log.d(TAG, "Live2D WebView paused")
    }

    /**
     * Resume the WebView rendering (when app is foregrounded).
     */
    fun resume() {
        webView?.onResume()
        Log.d(TAG, "Live2D WebView resumed")
    }

    /**
     * Get the underlying WebView instance.
     */
    fun getWebView(): WebView? = webView

    /**
     * Release the WebView resources.
     */
    fun release() {
        Log.d(TAG, "Releasing Live2D WebView")
        mainHandler.post {
            webView?.apply {
                stopLoading()
                clearHistory()
                clearCache(true)
                loadUrl("about:blank")
                removeJavascriptInterface("Android")
                onPause()
                destroy()
            }
            webView = null
            isReady = false
        }
    }

    /**
     * Trigger a idle/breathing animation.
     * Live2D models often have idle animations via motion files.
     */
    fun playIdleMotion() {
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp && window.Live2DApp.playMotion && window.Live2DApp.playMotion('idle')")
        }
    }

    /**
     * Speak animation (mouth movement while talking).
     */
    fun startSpeaking() {
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp && window.Live2DApp.startSpeaking && window.Live2DApp.startSpeaking()")
        }
    }

    /**
     * Stop speaking animation.
     */
    fun stopSpeaking() {
        mainHandler.post {
            evaluateJsSafe("window.Live2DApp && window.Live2DApp.stopSpeaking && window.Live2DApp.stopSpeaking()")
        }
    }

    @Suppress("UnsafeDynamicallyLoadedCode")
    private fun evaluateJsSafe(js: String) {
        try {
            webView?.evaluateJavascript(js) { result ->
                Log.v(TAG, "JS result: $result")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to evaluate JS: $js", e)
        }
    }
}
