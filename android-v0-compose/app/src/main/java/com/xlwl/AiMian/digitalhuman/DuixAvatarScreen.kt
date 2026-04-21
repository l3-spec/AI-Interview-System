package com.xlwl.AiMian.digitalhuman

import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * Android 平台 DUiX 数字人 Compose 包装视图
 */
@Composable
fun DuixAvatarScreen(
    modifier: Modifier = Modifier,
    controller: DuixAvatarController
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val renderView by controller.textureView.collectAsState()

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_DESTROY -> controller.release()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    AndroidView(
        factory = { ctx -> FrameLayout(ctx) },
        modifier = modifier,
        update = { container ->
            val tv = renderView
            if (tv != null && tv.parent != container) {
                Log.d("DuixAvatarScreen", "DUiX TextureView 就绪，开始挂载到界面")
                container.removeAllViews()
                
                (tv.parent as? ViewGroup)?.removeView(tv)
                
                container.addView(tv, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
            }
        }
    )
}
