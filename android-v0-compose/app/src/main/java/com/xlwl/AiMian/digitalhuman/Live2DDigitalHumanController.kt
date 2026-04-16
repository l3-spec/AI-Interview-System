package com.xlwl.AiMian.digitalhuman

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.xlwl.AiMian.duix.Live2DJSBridge
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Live2D-based implementation of [DigitalHumanController].
 *
 * Collects mouth-parameter updates from [LipSyncDriver] and forwards them
 * to the WebView JS layer via [Live2DJSBridge].
 */
@Composable
fun rememberLive2DDigitalHumanController(
    webViewRef: () -> Live2DJSBridge?
): Live2DDigitalHumanController {
    return remember {
        Live2DDigitalHumanController(webViewRef)
    }
}

class Live2DDigitalHumanController(
    private val webViewRef: () -> Live2DJSBridge?
) : DigitalHumanController {

    private val _mouthOpenness = MutableStateFlow(0f)
    private val _mouthForm = MutableStateFlow(0f)

    override fun updateMouthOpenness(value: Float) {
        _mouthOpenness.value = value.coerceIn(0f, 1f)
        webViewRef()?.setMouthOpenness(_mouthOpenness.value)
    }

    override fun updateMouthForm(value: Float) {
        _mouthForm.value = value.coerceIn(-1f, 1f)
        webViewRef()?.setMouthForm(_mouthForm.value)
    }

    override fun resetMouth() {
        _mouthOpenness.value = 0f
        _mouthForm.value = 0f
        webViewRef()?.resetMouth()
    }

    override fun onTtsPlayback(audioPath: String?, text: String?) {
        // Handled by LipSyncDriver directly
    }

    val mouthOpenness: StateFlow<Float> = _mouthOpenness.asStateFlow()
    val mouthForm: StateFlow<Float> = _mouthForm.asStateFlow()
}
