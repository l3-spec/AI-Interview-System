package com.xlwl.AiMian

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
// import com.google.accompanist.systemuicontroller.rememberSystemUiController

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 启用边到边显示
        enableEdgeToEdge()
        
        // 设置系统栏颜色（原生方式）
        window.statusBarColor = android.graphics.Color.parseColor("#00ACC3") // 蓝色状态栏
        // 将系统导航栏设为透明，避免底部出现白色条，交给自定义底栏覆盖
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        
        setContent {
            V0Theme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    V0App()
                }
            }
        }
    }
}

// SetSystemBarsColor 已移到 onCreate 中使用原生 API


