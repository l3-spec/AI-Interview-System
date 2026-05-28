package com.xlwl.AiMian

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.xlwl.AiMian.digitalhuman.DuixAvatarInterviewScreen

/**
 * DUiX 数字人面试 Activity
 *
 * 使用 DUiX SDK 实现 2D 数字人交互。
 * 完整替代 Aliyun 通义万相数字人功能。
 *
 * 启动参数（Intent extras）：
 * - position: 岗位名称
 * - questionText: 当前面试题目
 * - sessionId: 会话 ID
 * - currentQuestion: 当前第几题
 * - totalQuestions: 总题数
 */
class DuixAvatarInterviewActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemBars()
        window.setBackgroundDrawableResource(android.R.color.black)

        val position = intent.getStringExtra("position") ?: "面试岗位"
        val questionText = intent.getStringExtra("questionText") ?: "请做一下自我介绍"
        val sessionId = intent.getStringExtra("sessionId") ?: ""

        setContent {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color(0xFF0C1220)
            ) {
                // 使用本地 DUiX SDK 直连处理
                DuixAvatarInterviewScreen(
                    projectId = com.example.v0clone.config.AppConfig.aliyunAvatarProjectId,
                    jobPositionLabel = position,
                    interviewQuestion = questionText,
                    interviewSessionId = sessionId.takeIf { it.isNotBlank() },
                    onInterviewComplete = { completedSessionId, isCompleted ->
                        // TODO: 调用后端标记面试完成
                        finish()
                    },
                    onBack = {
                        finish()
                    }
                )
            }
        }
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
    }
}
