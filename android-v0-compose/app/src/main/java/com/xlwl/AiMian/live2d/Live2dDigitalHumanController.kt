package com.xlwl.AiMian.live2d

import android.content.Context
import android.util.Log
import com.xlwl.AiMian.digitalhuman.DigitalHumanController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Live2D-based implementation of DigitalHumanController.
 * 
 * Drives a Live2D model (loaded via WebView) using the same
 * interface that the previous DUIX SDK used.
 * 
 * The LipSyncDriver calls these methods to drive mouth animation:
 * - updateMouthOpenness(value: Float) - 0.0 (closed) to 1.0 (open)
 * - updateMouthForm(value: Float) - form/shape of mouth
 * - resetMouth() - return to neutral
 * - onTtsPlayback(audioPath, text) - triggered when TTS audio plays
 */
class Live2dDigitalHumanController(context: Context) : DigitalHumanController {

    companion object {
        private const val TAG = "Live2dController"
    }

    private val webViewManager = Live2dWebViewManager(context)
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // Smoothing for mouth animation
    private var currentOpenness = 0f
    private var targetOpenness = 0f
    private var currentForm = 0f
    private var targetForm = 0f
    private var isSpeaking = false
    
    // Animation smoothing factor (higher = faster response, lower = smoother)
    private val smoothingFactor = 0.3f
    
    // Auto-smoothing job for continuous animation
    private var smoothingJob: kotlinx.coroutines.Job? = null
    private var isInitialized = false

    /**
     * Create the WebView for Live2D rendering.
     * Call this before loading the Compose view.
     */
    fun createWebView() = webViewManager.createWebView()

    /**
     * Initialize the Live2D model.
     * Should be called after the WebView is attached.
     */
    suspend fun initialize(): Boolean {
        if (isInitialized) return true
        Log.i(TAG, "Initializing Live2D model...")
        val result = webViewManager.initialize()
        isInitialized = result
        if (result) {
            Log.i(TAG, "✅ Live2D model initialized successfully")
            startSmoothingLoop()
        } else {
            Log.e(TAG, "❌ Live2D model initialization failed")
        }
        return result
    }

    /**
     * Check if the model is ready.
     */
    fun isReady(): Boolean = webViewManager.isReady() && isInitialized

    /**
     * Pause the renderer (when app backgrounds).
     */
    fun pause() {
        webViewManager.pause()
        smoothingJob?.cancel()
    }

    /**
     * Resume the renderer (when app foregrounds).
     */
    fun resume() {
        webViewManager.resume()
        if (isInitialized) startSmoothingLoop()
    }

    /**
     * Release all resources.
     */
    fun release() {
        smoothingJob?.cancel()
        webViewManager.release()
        isInitialized = false
        Log.d(TAG, "Live2D controller released")
    }

    // =============================================================
    // DigitalHumanController interface implementation
    // =============================================================

    /**
     * Update mouth openness for lip-sync.
     * Called by LipSyncDriver with RMS-driven values (0.0-1.0).
     * 
     * @param value 0.0 = closed, 1.0 = fully open
     */
    override fun updateMouthOpenness(value: Float) {
        targetOpenness = value.coerceIn(0f, 1f)
        if (!isSpeaking) {
            // When not in speaking mode, apply directly
            webViewManager.setMouthOpenness(targetOpenness)
        }
    }

    /**
     * Update mouth form/shape for phoneme-based lip shaping.
     * 
     * @param value -1.0 (narrow/wide) to 1.0 (round/narrow)
     */
    override fun updateMouthForm(value: Float) {
        targetForm = value.coerceIn(-1f, 1f)
        webViewManager.setMouthForm(targetForm)
    }

    /**
     * Reset mouth to neutral (closed) state.
     */
    override fun resetMouth() {
        Log.d(TAG, "resetMouth called")
        targetOpenness = 0f
        currentOpenness = 0f
        targetForm = 0f
        currentForm = 0f
        webViewManager.resetMouth()
    }

    /**
     * Called when TTS playback starts.
     * Switches to speaking mode with active mouth animation.
     * 
     * @param audioPath local audio file path (or null if unavailable)
     * @param text text being spoken (for viseme-based lip sync)
     */
    override fun onTtsPlayback(audioPath: String?, text: String?) {
        Log.i(TAG, "TTS playback started - audioPath=$audioPath, text=${text?.take(30)}")
        isSpeaking = true
        
        // Trigger WebView speaking animation
        webViewManager.startSpeaking()
        
        // Auto-stop speaking after a while (in case no more RMS updates)
        scope.launch {
            delay(5000)
            if (isSpeaking) {
                Log.d(TAG, "Auto-stop speaking mode after 5s timeout")
                stopSpeaking()
            }
        }
    }

    /**
     * Stop the speaking animation and return to idle/breathing.
     */
    fun stopSpeaking() {
        isSpeaking = false
        webViewManager.stopSpeaking()
        // Return mouth to closed
        targetOpenness = 0f
        webViewManager.setMouthOpenness(0f)
    }

    // =============================================================
    // Internal: smoothing loop for natural animation
    // =============================================================

    private fun startSmoothingLoop() {
        smoothingJob?.cancel()
        smoothingJob = scope.launch {
            while (true) {
                if (isSpeaking) {
                    // Smooth interpolation toward target
                    currentOpenness += (targetOpenness - currentOpenness) * smoothingFactor
                    currentForm += (targetForm - currentForm) * smoothingFactor
                    
                    webViewManager.setMouthOpenness(currentOpenness)
                    if (kotlin.math.abs(currentForm) > 0.01f) {
                        webViewManager.setMouthForm(currentForm)
                    }
                }
                delay(16) // ~60fps update rate
            }
        }
    }

    /**
     * Set emotion/expression on the Live2D model.
     * Expressions are defined in the model .exp3.json files.
     * 
     * @param expressionName e.g., "F01" (happy), "F02" (sad), "F03" (angry)
     */
    fun setExpression(expressionName: String) {
        scope.launch {
            evaluateJsSafe("window.Live2DApp && window.Live2DApp.setExpression && window.Live2DApp.setExpression('$expressionName')")
        }
    }

    /**
     * Play a motion from the model's motion files.
     * 
     * @param motionName e.g., "haru_g_m08" (wave), "haru_g_m09" (nod)
     */
    fun playMotion(motionName: String) {
        scope.launch {
            evaluateJsSafe("window.Live2DApp && window.Live2DApp.playMotion && window.Live2DApp.playMotion('$motionName')")
        }
    }

    /**
     * Get the WebView for embedding in Compose.
     * Make sure to call createWebView() first.
     */
    fun getWebView(): android.webkit.WebView? = webViewManager.getWebView()

    @Suppress("UnsafeDynamicallyLoadedCode")
    private fun evaluateJsSafe(js: String) {
        try {
            webViewManager.getWebView()?.evaluateJavascript(js, null)
        } catch (e: Exception) {
            Log.e(TAG, "JS eval failed: $js", e)
        }
    }
}
