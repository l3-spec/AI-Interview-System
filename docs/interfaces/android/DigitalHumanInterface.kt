package com.aiinterview.digitalhuman

/**
 * 统一数字人接口 - Android 实现
 * 
 * 实现 docs/interfaces/UNIFIED_INTERFACE.md 中定义的接口
 * 
 * @since 2026-04-14
 * @status 🟡 进行中
 */

interface DigitalHuman {
    // 生命周期
    suspend fun start(): Boolean  // 启动数字人
    suspend fun stop(): Boolean   // 停止数字人
    fun isReady(): Boolean        // 是否就绪
    
    // 音频驱动（唇形同步）
    fun sendAudio(audioData: ByteArray)  // 发送音频数据驱动口型
    fun sendText(text: String)           // 发送文字（备用）
    
    // 语音交互
    suspend fun speak(text: String): Boolean  // 数字人说话
    fun stopSpeaking(): Unit                   // 停止说话
    
    // 配置
    fun setStyle(style: HumanStyle): Unit
    fun setEmotion(emotion: HumanEmotion): Unit
}

enum class HumanStyle {
    CARTOON,     // 卡通风格
    REALISTIC,   // 真人风格
    STYLE_2D     // 2D 风格
}

enum class HumanEmotion {
    NEUTRAL,     // 中性
    HAPPY,       // 开心
    SERIOUS,     // 严肃
    THINKING     // 思考
}

interface DigitalHumanListener {
    fun onReady()                                    // 数字人准备就绪
    fun onError(error: Throwable)                    // 发生错误
    fun onSpeakingStarted()                          // 开始说话
    fun onSpeakingFinished()                         // 说话结束
    fun onAudioLevel(level: Float)                   // 音频级别（用于UI可视化）
    fun onEmotionChanged(emotion: HumanEmotion)     // 情绪变化
}

// ==================== AudioPipeline 接口 ====================

interface AudioPipeline {
    suspend fun start(): Boolean
    fun stop()
    
    // 音频输入
    fun sendAudioInput(audioData: ByteArray)
    
    // 配置
    fun setASRProvider(provider: ASRProvider)
    fun setTTSProvider(provider: TTSProvider)
    fun setLLMProvider(provider: LLMProvider)
    
    // 回调
    fun setListener(listener: AudioPipelineListener)
}

interface AudioPipelineListener {
    fun onAudioInputRecognized(text: String)           // ASR 识别结果
    fun onLLMResponse(text: String)                   // LLM 回复
    fun onTTSGenerated(audioData: ByteArray)          // TTS 音频
    fun onError(error: Throwable)
}

enum class ASRProvider {
    VOLCENGINE,   // 火山引擎
    OTHER
}

enum class TTSProvider {
    VOLCENGINE,   // 火山引擎
    OTHER
}

enum class LLMProvider {
    DEEPSEEK,     // DeepSeek
    OTHER
}

// ==================== 工厂函数 ====================

/**
 * 创建数字人实例
 * 
 * @param config 数字人配置
 * @param listener 事件回调
 * @return DigitalHuman 实例
 */
fun createDigitalHuman(
    config: DigitalHumanConfig,
    listener: DigitalHumanListener
): DigitalHuman {
    // TODO: 实现 Live2D 渲染 + 火山引擎 ASR/TTS 集成
    TODO("等待 Phase 2 实现")
}

data class DigitalHumanConfig(
    val modelPath: String,        // Live2D 模型路径
    val serverUrl: String,        // 后端服务器 URL
    val style: HumanStyle = HumanStyle.CARTOON,
    val emotion: HumanEmotion = HumanEmotion.NEUTRAL
)

/**
 * 创建音频管道实例
 * 
 * @param config 管道配置
 * @param listener 事件回调
 * @return AudioPipeline 实例
 */
fun createAudioPipeline(
    config: AudioPipelineConfig,
    listener: AudioPipelineListener
): AudioPipeline {
    // TODO: 实现 WebRTC + 火山引擎 ASR + DeepSeek + TTS 管道
    TODO("等待 Phase 2 实现")
}

data class AudioPipelineConfig(
    val asrProvider: ASRProvider = ASRProvider.VOLCENGINE,
    val ttsProvider: TTSProvider = TTSProvider.VOLCENGINE,
    val llmProvider: LLMProvider = LLMProvider.DEEPSEEK,
    val apiKeys: Map<String, String>  // 各 provider 的 API keys
)