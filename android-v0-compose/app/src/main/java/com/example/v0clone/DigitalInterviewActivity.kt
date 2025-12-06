package com.xlwl.AiMian

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.xlwl.AiMian.ai.DigitalInterviewScreen
import com.xlwl.AiMian.ai.DigitalInterviewViewModel
import com.xlwl.AiMian.data.api.AiInterviewApi
import com.xlwl.AiMian.data.api.OssApi
import com.xlwl.AiMian.data.api.RetrofitClient
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.OssRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/**
 * 数字人面试全屏Activity
 * 隐藏系统栏，提供沉浸式体验
 */
class DigitalInterviewActivity : ComponentActivity() {

    private lateinit var viewModel: DigitalInterviewViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 隐藏系统栏，实现全屏沉浸式体验
        hideSystemBars()
        
        // 设置窗口背景为黑色，避免白色背景遮挡
        window.setBackgroundDrawableResource(android.R.color.black)

        setupAudioManager()

        val position = intent.getStringExtra("position") ?: "产品经理"
        val questionText = intent.getStringExtra("questionText") ?: "请您做一个自我介绍"
        val totalQuestions = intent.getIntExtra("totalQuestions", 15)
        val currentQuestion = intent.getIntExtra("currentQuestion", 1)
        val countdownSeconds = intent.getIntExtra("countdownSeconds", 180)
        val sessionId = intent.getStringExtra("sessionId") ?: ""

        // Initialize dependencies
        val authManager = AuthManager(applicationContext)
        // Blocking call to get token is not ideal but acceptable for Activity initialization if fast,
        // or we can use a runBlocking since we need the token for Retrofit.
        // Better approach: RetrofitClient usually takes a provider or we pass the token.
        // Looking at NavGraph, RetrofitClient.createOkHttpClient { token } is used.
        
        val token = runBlocking { authManager.tokenFlow.first() }
        val client = RetrofitClient.createOkHttpClient { token }
        val aiInterviewApi = RetrofitClient.createService(AiInterviewApi::class.java, client)
        val ossApi = RetrofitClient.createService(OssApi::class.java, client)
        val aiInterviewRepository = AiInterviewRepository(aiInterviewApi)
        val ossRepository = OssRepository(ossApi)

        val factory = DigitalInterviewViewModel.Factory(
            application = application,
            position = position,
            questionText = questionText,
            currentQuestion = currentQuestion,
            totalQuestions = totalQuestions,
            countdownSeconds = countdownSeconds,
            sessionId = sessionId,
            ossRepository = ossRepository,
            aiInterviewRepository = aiInterviewRepository
        )
        viewModel = ViewModelProvider(this, factory)[DigitalInterviewViewModel::class.java]

        // 使用 Compose 设置内容
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0C1220)
                ) {
                    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                    
                    DigitalInterviewScreen(
                        uiState = uiState,
                        onStartAnswer = { viewModel.onStartAnswer() },
                        onRetry = { viewModel.retryConnection() },
                        onInterviewComplete = { finish() },
                        onRecordingFinished = { file, duration ->
                            viewModel.submitAnswer(file, duration)
                        },
                        onQuestionIndexChange = { index ->
                            viewModel.updateCurrentQuestion(index)
                        }
                    )
                }
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

    override fun onDestroy() {
        super.onDestroy()
        if (::viewModel.isInitialized) {
            viewModel.endSession()
        }
    }

    private fun setupAudioManager() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = true
    }
}
