package com.xlwl.AiMian

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.xlwl.AiMian.ai.DigitalInterviewScreen
import com.xlwl.AiMian.ai.DigitalInterviewViewModel
import com.xlwl.AiMian.data.model.CreateDigitalHumanSessionRequest

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

        setupAudioManager()

        val position = intent.getStringExtra("position") ?: "产品经理"
        val questionText = intent.getStringExtra("questionText") ?: "请您做一个自我介绍"
        val totalQuestions = intent.getIntExtra("totalQuestions", 15)
        val currentQuestion = intent.getIntExtra("currentQuestion", 1)
        val countdownSeconds = intent.getIntExtra("countdownSeconds", 180)
        val humanModel = intent.getStringExtra("humanModel") ?: "tech_female_01"
        val voiceModel = intent.getStringExtra("voiceModel") ?: "zh-CN-XiaoxiaoNeural"
        val background = intent.getStringExtra("background") ?: "office"
        val resolution = intent.getStringExtra("resolution") ?: "720p"
        val frameRate = intent.getIntExtra("frameRate", 25)

        val sessionRequest = CreateDigitalHumanSessionRequest(
            humanModel = humanModel,
            voiceModel = voiceModel,
            background = background,
            resolution = resolution,
            frameRate = frameRate
        )

        val factory = DigitalInterviewViewModel.Factory(
            application = application,
            sessionRequest = sessionRequest,
            position = position,
            questionText = questionText,
            currentQuestion = currentQuestion,
            totalQuestions = totalQuestions,
            countdownSeconds = countdownSeconds
        )
        viewModel = ViewModelProvider(this, factory)[DigitalInterviewViewModel::class.java]

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val uiState = viewModel.uiState.collectAsStateWithLifecycle().value

                    DigitalInterviewScreen(
                        uiState = uiState,
                        onBackClick = { finish() },
                        onStartAnswer = {
                            viewModel.onStartAnswer()
                        },
                        onRetry = { viewModel.retryConnection() }
                    )
                }
            }
        }
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
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
