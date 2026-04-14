package com.xlwl.AiMian.duix

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.xlwl.AiMian.digitalhuman.DigitalHumanController

/**
 * Live2D-powered digital human renderer.
 *
 * Uses WebView + PIXI.js + pixi-live2d-display (Plan D: Live2D Cubism SDK).
 * Falls back to animated placeholder face when model files are unavailable.
 *
 * @param modelPath   Relative path in assets, e.g. "live2d/model/haru/"
 * @param modifier    Compose modifier
 */
@Composable
fun DuixViewHost(
    modelUrl: String,
    baseConfigUrl: String,
    modifier: Modifier = Modifier,
    onReadyChanged: (Boolean) -> Unit,
    onStatusChanged: (String) -> Unit,
    installAudioSink: (sink: (String) -> Unit) -> Unit
) {
    // Extract relative path from the full modelUrl or use default
    // modelUrl format: "file:///android_asset/live2d/model/haru/" or just "live2d/model/haru/"
    val modelPath = remember(modelUrl) {
        modelUrl.removePrefix("file:///android_asset/")
            .removePrefix("file:///android_res/raw/")
            .removeSuffix("/")
            .ifEmpty { "live2d/model/haru" }
    }

    var isReady by remember { mutableStateOf(false) }

    Live2DWebView(
        modelPath = modelPath,
        modifier = modifier.fillMaxSize(),
        onReady = { ready ->
            isReady = ready
            onReadyChanged(ready)
        },
        onStatus = onStatusChanged
    )

    // Provide audio sink for lip-sync via WebView
    DisposableEffect(Unit) {
        // The WebView handles audio playback internally via TTS audio callbacks
        onDispose { }
    }
}

/**
 * Creates a [DigitalHumanController] backed by the Live2D WebView.
 * Call this from the screen that owns the DuixViewHost composable.
 */
fun createLive2DDigitalHumanController(
    webView: android.webkit.WebView
): DigitalHumanController {
    val bridge = Live2DJSBridge(webView)
    return object : com.xlwl.AiMian.digitalhuman.DigitalHumanController {
        override fun updateMouthOpenness(value: Float) {
            bridge.setMouthOpenness(value)
        }

        override fun updateMouthForm(value: Float) {
            bridge.setMouthForm(value)
        }

        override fun resetMouth() {
            bridge.resetMouth()
        }

        override fun onTtsPlayback(audioPath: String?, text: String?) {
            // For WebView-based rendering, audio is handled by the TTS service directly.
            // The WebView receives mouth openness updates via the LipSyncDriver.
            bridge.resetMouth()
        }
    }
}
