package com.xlwl.AiMian.digitalhuman

import android.webkit.WebView
import com.xlwl.AiMian.duix.Live2DJSBridge

/**
 * [DigitalHumanController] implementation backed by the Live2D WebView.
 *
 * Each instance owns a [Live2DJSBridge] that communicates with the
 * WebView's JavaScript layer via evaluateJavascript.
 *
 * Used by [com.xlwl.AiMian.duix.DuixViewHost] via
 * [com.xlwl.AiMian.duix.createLive2DDigitalHumanController].
 */
class Live2DDigitalHumanController(
    private val webView: WebView
) : DigitalHumanController {

    private val bridge = Live2DJSBridge(webView)

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
        // Audio playback is handled by VolcanoTtsService.
        // Reset mouth after audio finishes to return to idle expression.
        bridge.resetMouth()
    }
}
