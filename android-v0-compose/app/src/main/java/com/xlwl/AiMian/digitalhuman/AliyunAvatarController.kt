package com.xlwl.AiMian.digitalhuman

import android.annotation.SuppressLint
import android.app.Activity
import android.util.Log
import android.view.SurfaceView
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
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
 * 使用云渲染模式（REMOTE_RENDER_AVATAR）：
 * 1. 调用灵眸 OpenAPI CreateChatSession 获取 TYAvatarInitData（RTC入会信息）
 * 2. init(activity, initData, dialogConfig) — 初始化SDK
 * 3. start(chatCallback) — 启动对话流程
 *
 * 官方文档：https://help.aliyun.com/zh/avatar/avatar-application/developer-reference/digital-people-conversation-androidsdk
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

    private val _userVolume = MutableStateFlow(0f)
    val userVolume: StateFlow<Float> = _userVolume.asStateFlow()

    private val _avatarVolume = MutableStateFlow(0f)
    val avatarVolume: StateFlow<Float> = _avatarVolume.asStateFlow()

    private val _latencyMetrics = MutableStateFlow<Map<String, String>>(emptyMap())
    val latencyMetrics: StateFlow<Map<String, String>> = _latencyMetrics.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /**
     * 初始化并启动数字人会话（云渲染模式）
     *
     * 流程（对照官方文档）：
     * 1. 调用灵眸 OpenAPI CreateChatSession 获取 TYAvatarInitData
     *    - 包含 sessionId、rtcParams（RTC入会信息）、avatarAssets（资产信息）
     * 2. TYVideoChat.getInstance() 获取单例
     * 3. 配置 TYDialogConfig（renderType、mode、keepAlive等）
     * 4. init(activity, initData, dialogConfig) 初始化SDK
     * 5. start(chatCallback) 启动对话流程
     *
     * @param initData 灵眸 CreateChatSession API 返回的 TYAvatarInitData
     */
    @SuppressLint("MissingPermission")
    fun startSession(initData: TYAvatarInitData? = null) {
        scope.launch {
            if (initData == null) {
                _statusMessage.value = "⚠️ 初始化数据为空"
                Log.e(TAG, "initData 为 null，无法启动数字人")
                return@launch
            }

            Log.d(TAG, "📥 云渲染模式初始化")
            Log.d(TAG, "   sessionId: ${initData.sessionId}")
            Log.d(TAG, "   rtcParams: ${initData.rtcParams?.toString()?.take(200) ?: "null"}")

            _statusMessage.value = "正在连接数字人服务..."
            _isReady.value = false

            // ====== 步骤1: 构建对话配置（对照官方文档 TYDialogConfig）======
            val dialogConfig = TYDialogConfig().apply {
                // renderType: 渲染类型（当前仅支持云渲染）
                renderType = TYAvatarRenderType.REMOTE_RENDER_AVATAR
                // mode: 对话模式
                mode = TYVoiceChatMode.TAP2TALK
                // keepAlive: 是否开启心跳保活
                keepAlive = true
                // keepAlivePeriod: 心跳保活间隔（默认10s）
                keepAlivePeriod = 10000
                // outboundSampleRate: TTS音频播放采样率（建议 48000）
                outboundSampleRate = 48000
            }

            // ====== 步骤2: 获取 TYVideoChat 单例 ======
            tyVideoChat = TYVideoChat.getInstance()

            // ====== 步骤3: 配置 RTC 音频参数（可选，对照官方文档扩展接口）======
            tyVideoChat?.getRtcConfig()?.apply {
                // TTS音频增益（默认100，值域[0,400]）
                setPlayOutAudioVolume(100)
                // VAD唤起前采集音量（默认100）
                setRecordAudioVolumeBeforeVAD(100)
            }

            // ====== 步骤4: 初始化 SDK（对照官方文档 init 方法）======
            _statusMessage.value = "正在初始化数字人..."
            Log.d(TAG, "🔧 调用 init(activity, initData, dialogConfig)...")

            val initResult = tyVideoChat?.init(activity, initData, dialogConfig)
            Log.d(TAG, "   init 返回: $initResult")

            if (initResult == false) {
                _statusMessage.value = "❌ SDK 初始化失败"
                Log.e(TAG, "init 返回 false，SDK 初始化失败")
                onError?.invoke("SDK 初始化失败")
                return@launch
            }

            // ====== 步骤5: 启动对话流程（对照官方文档 start 方法）======
            Log.d(TAG, "🚀 调用 start(chatCallback)...")
            tyVideoChat?.start(chatCallback)
        }
    }

    /**
     * 发送面试题目（prompt 模式，触发数字人主动说话）
     * 对照官方文档 requestToRespond 方法
     * @param question 面试题目文本
     */
    fun sendInterviewQuestion(question: String) {
        if (_isReady.value) {
            Log.d(TAG, "📤 sendInterviewQuestion: $question")
            // type="prompt" 表示把文本送大模型回答
            tyVideoChat?.requestToRespond("prompt", question)
        } else {
            Log.w(TAG, "sendInterviewQuestion called but not ready")
        }
    }

    /** 打断数字人当前说话（对照官方文档 interrupt 方法）*/
    fun interrupt() {
        Log.d(TAG, "⏹️ 打断数字人说话")
        tyVideoChat?.interrupt()
    }

    /** 获取渲染 SurfaceView */
    fun getSurfaceView(): SurfaceView? = currentSurfaceView

    // ///////////////// DigitalHumanController 接口 /////////////////
    // 云渲染模式下，口型由云端驱动，无需手动控制
    override fun updateMouthOpenness(value: Float) {}
    override fun updateMouthForm(value: Float) {}
    override fun resetMouth() {}
    override fun onTtsPlayback(audioPath: String?, text: String?) {}

    /** 释放资源（对照官方文档 exit 方法）*/
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

    // ///////////////// IChatCallback 实现（对照官方文档回调列表）///////////////
    private val chatCallback = object : IChatCallback {

        /**
         * onStartResult: 对话启动结果
         * 鉴权、客户端加入通道成功后回调
         */
        override fun onStartResult(isSuccess: Boolean, errorInfo: TYError?) {
            Log.d(TAG, "onStartResult: success=$isSuccess, error=$errorInfo")
            if (isSuccess) {
                _statusMessage.value = "✅ 对话通道已建立"
            } else {
                val msg = "启动失败: ${errorInfo?.message ?: "未知错误"} (code=${errorInfo?.key})"
                _statusMessage.value = msg
                Log.e(TAG, msg)
                onError?.invoke(msg)
            }
        }

        /** onInterruptResult: 主动打断的回调（手动打断或语音打断）*/
        override fun onInterruptResult(isSuccess: Boolean, errorInfo: TYError?) {
            Log.d(TAG, "onInterruptResult: success=$isSuccess")
        }

        /**
         * onReadyToSpeech: 对话准备完成
         * 三端（客户端/VoiceChat/Avatar）均加入通道后回调，此时才能调用业务接口
         */
        override fun onReadyToSpeech() {
            Log.d(TAG, "✅ onReadyToSpeech - 数字人已就绪，可以开始对话")
            _isReady.value = true
            _statusMessage.value = "✅ 请点击数字人开始对话"
            onSessionReady?.invoke()
        }

        /** onStateChanged: 数字人状态切换 */
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

        /** onVolumeChanged: 音频强度回调 */
        override fun onVolumeChanged(audioLevel: Float, audioType: TYVolumeSourceType) {
            // audioLevel: [0, 100]
            if (audioType == TYVolumeSourceType.MIC) {
                _userVolume.value = audioLevel
            } else {
                _avatarVolume.value = audioLevel
            }
        }

        /**
         * onMessageReceived: 对话过程中的文本详情回调
         * TYVoiceChatMessage 包含: chatMessageType(SPEAKING/RESPONDING), chatMessageText, isFinish
         */
        override fun onMessageReceived(message: TYVoiceChatMessage) {
            Log.d(TAG, "onMessageReceived: text=${message.chatMessageText?.take(50)}, type=${message.chatMessageType}, isFinish=${message.isFinish}")
            val text = message.chatMessageText ?: return
            if (text.isNotBlank()) {
                val isUser = message.chatMessageType == ChatMessageType.SPEAKING
                onMessageReceived?.invoke(text, isUser)
            }
        }

        /**
         * onGotRenderView: RTC准备好的渲染组件
         * 云渲染模式下，数字人视频流通过此回调获取 SurfaceView
         */
        override fun onGotRenderView(renderView: SurfaceView) {
            Log.d(TAG, "✅ onGotRenderView - RTC 渲染视图就绪")
            currentSurfaceView = renderView
            _surfaceView.value = renderView
            try {
                // 设置为背景层（在窗口之下），但需要主布局透明才能看到
                // 或者设置为 MediaOverlay 置于窗口之上但其他 UI 之下
                renderView.setZOrderMediaOverlay(true)
                renderView.holder.setFormat(android.graphics.PixelFormat.TRANSLUCENT)
            } catch (e: Exception) {
                Log.e(TAG, "setFormat error", e)
            }
        }

        /** onErrorReceived: 对话过程中的异常回调 */
        override fun onErrorReceived(errorInfo: TYError) {
            val msg = "错误: ${errorInfo.message} (code=${errorInfo.key})"
            Log.e(TAG, "❌ onErrorReceived: $errorInfo")
            _statusMessage.value = msg
            onError?.invoke(msg)
        }

        /** onPerformanceInfoTrack: 对话过程中的性能监测（耗时统计）*/
        override fun onPerformanceInfoTrack(
            performanceInfoType: Constant.TYPerformanceInfoType,
            performanceInfo: String
        ) {
            Log.d(TAG, "📊 Performance: $performanceInfoType = $performanceInfo")
            val current = _latencyMetrics.value.toMutableMap()
            current[performanceInfoType.name] = performanceInfo
            _latencyMetrics.value = current
        }

        /** onLocalAvatarDidAudioLag: 端渲染数字人音频卡顿（云渲染模式下不会触发）*/
        override fun onLocalAvatarDidAudioLag() {
            Log.w(TAG, "⚠️ onLocalAvatarDidAudioLag")
        }

        /** onLocalAvatarRealtimeFps: 端渲染实时FPS（云渲染模式下不会触发）*/
        override fun onLocalAvatarRealtimeFps(fps: Float) {
            Log.v(TAG, "🎬 FPS: $fps")
        }

        /** onLocalAvatarRealtimeBSInfo: 端渲染 BlendShape 信息（云渲染模式下不会触发）*/
        override fun onLocalAvatarRealtimeBSInfo(bsInfo: String) {
            Log.v(TAG, "😐 BlendShape: $bsInfo")
        }

        /**
         * onLocalAvatarAudioDataToPlay: 端渲染待播放的音频数据
         * 云渲染模式下返回 false，由 SDK 内部处理
         */
        override fun onLocalAvatarAudioDataToPlay(audioData: ByteArray, sampleRate: Int): Boolean {
            return false // false = SDK 内部播放音频
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
    // 关键修正：使用 collectAsState 动态观察 SurfaceView 状态
    val renderView by controller.surfaceView.collectAsState()

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
            val sv = renderView
            if (sv != null && sv.parent != container) {
                Log.d("AliyunAvatarView", "RTC RenderView 就绪，开始挂载到界面: $sv")
                container.removeAllViews()
                
                // 确保是从旧父容器中移除
                (sv.parent as? ViewGroup)?.removeView(sv)
                
                container.addView(sv, FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
            }
        }
    )
}
