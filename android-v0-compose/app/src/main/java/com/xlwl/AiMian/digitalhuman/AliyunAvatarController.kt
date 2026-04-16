package com.xlwl.AiMian.digitalhuman

import android.annotation.SuppressLint
import android.app.Activity
import android.util.Log
import android.view.SurfaceView
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.tongyi.video_chat_sdk.Constant
import com.tongyi.video_chat_sdk.Constant.ChatMessageType
import com.tongyi.video_chat_sdk.Constant.TYAvatarRenderType
import com.tongyi.video_chat_sdk.Constant.TYVoiceChatMode
import com.tongyi.video_chat_sdk.Constant.TYVolumeSourceType
import com.tongyi.video_chat_sdk.conv.ConvConstants
import com.tongyi.video_chat_sdk.conv.ConvConstants.DialogState
import com.tongyi.video_chat_sdk.data.IChatCallback
import com.tongyi.video_chat_sdk.data.TYError
import com.tongyi.video_chat_sdk.data.TYVoiceChatMessage
import com.tongyi.video_chat_sdk.data.request.TYDialogConfig
import com.tongyi.video_chat_sdk.data.request.TYRtcConfig
import com.tongyi.video_chat_sdk.data.response.TYAvatarInitData
import com.tongyi.video_chat_sdk.TYVideoChat
import com.xlwl.AiMian.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 阿里云数字人（通义万相 2D）控制器
 *
 * 通过 TYVideoChat SDK 驱动云渲染 2D 数字人。
 * 内部处理 ASR → LLM → TTS → 数字人驱动全流程。
 *
 * 使用云渲染模式（REMOTE_RENDER_AVATAR）：
 * 1. 从后端获取 TYAvatarInitData（CreateChatSession API）
 * 2. init(activity, initData, dialogConfig)
 * 3. start(chatCallback)
 *
 * @param activity 用于初始化 SDK 的 Activity（必须）
 * @param projectId 阿里云数字人项目 ID（默认从 BuildConfig 读取）
 * @param onSessionReady 数字人初始化完成时的回调
 * @param onMessageReceived 收到消息时的回调 (text, isUserMessage)
 * @param onStateChanged 对话状态变化时的回调
 * @param onError 错误发生时的回调
 */
class AliyunAvatarController(
    private val activity: Activity,
    private val projectId: String = BuildConfig.ALIYUN_AVATAR_PROJECT_ID,
    private val onSessionReady: (() -> Unit)? = null,
    private val onMessageReceived: ((text: String, isUser: Boolean) -> Unit)? = null,
    onStateChanged: ((DialogState) -> Unit)? = null,
    private val onError: ((String) -> Unit)? = null
) : DigitalHumanController {

    private val TAG = "AliyunAvatarController"

    private var tyVideoChat: TYVideoChat? = null
    private var currentSurfaceView: SurfaceView? = null

    private val _dialogState = MutableStateFlow(DialogState.DIALOG_IDLE)
    val dialogState: StateFlow<DialogState> = _dialogState.asStateFlow()

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _statusMessage = MutableStateFlow("正在初始化数字人...")
    val statusMessage: StateFlow<String> = _statusMessage.asStateFlow()

    private val _surfaceView = MutableStateFlow<SurfaceView?>(null)
    val surfaceView: StateFlow<SurfaceView?> = _surfaceView.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /**
     * 初始化并启动数字人会话
     *
     * 真实场景：先从后端调用 CreateChatSession API 获取 initData，再调用此方法。
     * Demo 模式：传入 null 会使用内置的示例数据（仅用于测试，真实 RTC 通道会失败）。
     *
     * @param initData 后端 API 获取的 TYAvatarInitData，传入 null 使用 Demo 数据
     */
    @SuppressLint("MissingPermission")
    fun startSession(initData: TYAvatarInitData? = null) {
        scope.launch {
            _statusMessage.value = "正在连接数字人服务..."
            _isReady.value = false

            // 使用传入的数据或 Demo 数据
            if (initData == null) {
                _statusMessage.value = "⚠️ Demo 模式（未配置后端 API）"
            }

            // 构建对话配置（云渲染 TAP2TALK 模式）
            val dialogConfig = TYDialogConfig()
            dialogConfig.mode = TYVoiceChatMode.TAP2TALK
            dialogConfig.renderType = TYAvatarRenderType.REMOTE_RENDER_AVATAR
            // keepAlive / avatarBlendShapeScale / outboundSampleRate 使用字段直接访问
            // （这些是 Java 私有字段，Kotlin 会通过 getter/setter 转换为属性访问）
            dialogConfig.keepAlive = true
            dialogConfig.avatarBlendShapeScale = 1.0f
            dialogConfig.outboundSampleRate = 48000

            // 获取 TYVideoChat 实例并配置
            tyVideoChat = TYVideoChat.getInstance()

            // 配置 RTC 音频音量
            tyVideoChat?.getRtcConfig()?.apply {
                setPlayOutAudioVolume(100)
                setRecordAudioVolumeBeforeVAD(100)
            }

            _statusMessage.value = "正在初始化数字人..."

            // 云渲染模式：init → start
            tyVideoChat?.init(activity, initData ?: createDemoInitData(), dialogConfig)
            tyVideoChat?.start(chatCallback)
        }
    }

    /**
     * 发送面试题目（prompt 模式，触发数字人主动说话）
     * @param question 面试题目文本
     */
    fun sendInterviewQuestion(question: String) {
        if (_isReady.value) {
            Log.d(TAG, "sendInterviewQuestion: $question")
            tyVideoChat?.requestToRespond("prompt", question)
        } else {
            Log.w(TAG, "sendInterviewQuestion called but not ready")
        }
    }

    /** 打断数字人当前说话 */
    fun interrupt() {
        tyVideoChat?.interrupt()
    }

    /** 获取渲染 SurfaceView */
    fun getSurfaceView(): SurfaceView? = currentSurfaceView

    // ///////////////// DigitalHumanController 接口（无操作，SDK 内部处理） /////////////////
    override fun updateMouthOpenness(value: Float) {}
    override fun updateMouthForm(value: Float) {}
    override fun resetMouth() {}
    override fun onTtsPlayback(audioPath: String?, text: String?) {}

    /** 释放资源 */
    fun release() {
        try {
            tyVideoChat?.exit()
        } catch (e: Exception) {
            Log.e(TAG, "release error", e)
        }
        tyVideoChat = null
        currentSurfaceView = null
        _isReady.value = false
        _dialogState.value = DialogState.DIALOG_IDLE
        _surfaceView.value = null
    }

    // ///////////////// Demo 模式示例数据（真实场景应从后端获取） /////////////////
    private fun createDemoInitData(): TYAvatarInitData {
        // 注意：这是示例数据，真实 RTC 通道会失败。
        // 真实场景：通过后端 CreateChatSession API 获取真实数据。
        val timestamp = (System.currentTimeMillis() / 1000) + 3600
        val json = """
        {
            "rtcParams": {
                "appId": "470552b0-9401-4b2c-8456-df39f2e5a986",
                "channel": "DEMO_CHANNEL_${System.currentTimeMillis().toString().take(8)}",
                "gslb": "https://gw.rtn.aliyuncs.com",
                "timestamp": $timestamp,
                "token": "DEMO_TOKEN",
                "clientUserId": "client-${System.currentTimeMillis()}",
                "serverUserId": "system-6956483516401508",
                "avatarUserId": "avatar-8504256390345063",
                "nonce": ""
            },
            "avatarAssets": {
                "url": "https://daily-avatar-property.oss-cn-beijing.aliyuncs.com/avatar-share-property/AVATAR_2D_MOBILE/Mt.CQKY55EXBBYU2/secret_assets_android.zip",
                "md5": "ACAABC1234567890CEDCA96A1CC2169848",
                "secret": "DEMO_SECRET"
            },
            "sessionId": "DEMO-${java.util.UUID.randomUUID()}"
        }
        """.trimIndent()
        return com.google.gson.Gson().fromJson(json, TYAvatarInitData::class.java)
    }

    // ///////////////// IChatCallback 实现 /////////////////
    private val chatCallback = object : IChatCallback {

        override fun onStartResult(isSuccess: Boolean, errorInfo: TYError?) {
            Log.d(TAG, "onStartResult: success=$isSuccess error=$errorInfo")
            if (isSuccess) {
                _statusMessage.value = "✅ 数字人已就绪"
            } else {
                val msg = "启动失败: ${errorInfo?.message ?: "未知错误"}"
                _statusMessage.value = msg
                onError?.invoke(msg)
            }
        }

        override fun onInterruptResult(isSuccess: Boolean, errorInfo: TYError?) {
            Log.d(TAG, "onInterruptResult: success=$isSuccess")
        }

        override fun onReadyToSpeech() {
            Log.d(TAG, "onReadyToSpeech")
            _isReady.value = true
            _statusMessage.value = "✅ 请点击数字人开始对话"
            onSessionReady?.invoke()
        }

        override fun onStateChanged(state: DialogState) {
            Log.d(TAG, "onStateChanged: $state")
            _dialogState.value = state
            val msg = when (state) {
                ConvConstants.DialogState.DIALOG_IDLE -> "空闲"
                ConvConstants.DialogState.DIALOG_LISTENING -> "🎙️ 我正在听，请说..."
                ConvConstants.DialogState.DIALOG_THINKING -> "🤔 思考中..."
                ConvConstants.DialogState.DIALOG_RESPONDING -> "💬 回答中..."
                else -> state.name
            }
            _statusMessage.value = msg
            onStateChanged?.invoke(state)
        }

        override fun onVolumeChanged(audioLevel: Float, audioType: TYVolumeSourceType) {
            // 可用于音量指示动画
        }

        override fun onMessageReceived(message: TYVoiceChatMessage) {
            Log.d(TAG, "onMessageReceived: $message")
            val text = message.chatMessageText ?: return
            if (text.isNotBlank()) {
                val isUser = message.chatMessageType == ChatMessageType.SPEAKING
                onMessageReceived?.invoke(text, isUser)
            }
        }

        override fun onGotRenderView(renderView: SurfaceView) {
            Log.d(TAG, "onGotRenderView: $renderView")
            currentSurfaceView = renderView
            _surfaceView.value = renderView
            try {
                renderView.setZOrderOnTop(false)
                renderView.holder.setFormat(android.graphics.PixelFormat.TRANSLUCENT)
            } catch (e: Exception) {
                Log.e(TAG, "setFormat error", e)
            }
        }

        override fun onErrorReceived(errorInfo: TYError) {
            val msg = "错误: ${errorInfo.message}"
            Log.e(TAG, "onErrorReceived: $errorInfo")
            _statusMessage.value = msg
            onError?.invoke(msg)
        }

        override fun onPerformanceInfoTrack(
            performanceInfoType: Constant.TYPerformanceInfoType,
            performanceInfo: String
        ) {
            // 性能日志（耗时统计：llmDelay, ttsDelay, avatarDelay, totalDelay）
        }

        override fun onLocalAvatarDidAudioLag() {
            Log.w(TAG, "onLocalAvatarDidAudioLag")
        }

        override fun onLocalAvatarRealtimeFps(fps: Float) {
            Log.v(TAG, "onLocalAvatarRealtimeFps: $fps")
        }

        override fun onLocalAvatarRealtimeBSInfo(bsInfo: String) {
            Log.v(TAG, "onLocalAvatarRealtimeBSInfo: $bsInfo")
        }

        override fun onLocalAvatarAudioDataToPlay(audioData: ByteArray, sampleRate: Int): Boolean {
            // false = SDK 内部播放音频
            return false
        }
    }
}

// ///////////////// Composable 入口 /////////////////
@Composable
fun AliyunAvatarView(
    modifier: Modifier = Modifier,
    controller: AliyunAvatarController
) {
    val lifecycleOwner = LocalLifecycleOwner.current

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
            val sv = controller.getSurfaceView()
            if (sv != null && sv.parent != container) {
                for (i in container.childCount - 1 downTo 0) container.removeViewAt(i)
                if (sv.parent != null) (sv.parent as ViewGroup).removeView(sv)
                container.addView(sv, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
            }
        }
    )
}
