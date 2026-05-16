package com.xlwl.AiMian

import android.os.Bundle
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.core.view.WindowCompat
import com.xlwl.AiMian.ui.theme.AiMianTheme
// import com.google.accompanist.systemuicontroller.rememberSystemUiController

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 处理 Deep Link
        val deepLinkUrl = intent?.data?.toString()

        // 启用边到边显示
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(
                android.graphics.Color.TRANSPARENT,
                android.graphics.Color.TRANSPARENT
            ),
            navigationBarStyle = SystemBarStyle.auto(
                android.graphics.Color.TRANSPARENT,
                android.graphics.Color.TRANSPARENT
            )
        )
        
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        
        setContent {
            AiMianTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    V0App(initialDeepLink = deepLinkUrl)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 注意：这里由于 V0App 已经渲染，可能需要通过某种全局状态或事件总线来通知导航
        // 为了简单起见，如果是在运行中点击通知，我们可以考虑简单的方案
    }
}

// SetSystemBarsColor 已移到 onCreate 中使用原生 API


