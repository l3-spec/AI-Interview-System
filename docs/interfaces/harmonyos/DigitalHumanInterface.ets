// ==================== 统一数字人接口 - HarmonyOS 实现 ====================
// 实现 docs/interfaces/UNIFIED_INTERFACE.md 中定义的接口
//
// @since 2026-04-14
// @status 🟡 进行中

// MARK: - DigitalHuman 主接口

interface DigitalHuman {
    // 生命周期
    start(): Promise<boolean>  // 启动数字人
    stop(): Promise<boolean>   // 停止数字人
    isReady(): boolean         // 是否就绪
    
    // 音频驱动（唇形同步）
    sendAudio(audioData: Uint8Array): void  // 发送音频数据驱动口型
    sendText(text: string): void            // 发送文字（备用）
    
    // 语音交互
    speak(text: string): Promise<boolean>  // 数字人说话
    stopSpeaking(): void                    // 停止说话
    
    // 配置
    setStyle(style: HumanStyle): void
    setEmotion(emotion: HumanEmotion): void
}

// MARK: - 枚举定义

enum HumanStyle {
    CARTOON,     // 卡通风格
    REALISTIC,   // 真人风格
    STYLE_2D     // 2D 风格
}

enum HumanEmotion {
    NEUTRAL,     // 中性
    HAPPY,       // 开心
    SERIOUS,     // 严肃
    THINKING     // 思考
}

// MARK: - DigitalHumanListener 回调接口

interface DigitalHumanListener {
    onReady(): void                                    // 数字人准备就绪
    onError(error: Error): void                        // 发生错误
    onSpeakingStarted(): void                          // 开始说话
    onSpeakingFinished(): void                         // 说话结束
    onAudioLevel(level: number): void                  // 音频级别（用于UI可视化）
    onEmotionChanged(emotion: HumanEmotion): void     // 情绪变化
}

// MARK: - AudioPipeline 接口

interface AudioPipeline {
    start(): Promise<boolean>
    stop(): void
    
    // 音频输入
    sendAudioInput(audioData: Uint8Array): void
    
    // 配置
    setASRProvider(provider: ASRProvider): void
    setTTSProvider(provider: TTSProvider): void
    setLLMProvider(provider: LLMProvider): void
    
    // 回调
    setListener(listener: AudioPipelineListener): void
}

// MARK: - AudioPipelineListener 回调接口

interface AudioPipelineListener {
    onAudioInputRecognized(text: string): void     // ASR 识别结果
    onLLMResponse(text: string): void             // LLM 回复
    onTTSGenerated(audioData: Uint8Array): void   // TTS 音频
    onError(error: Error): void
}

// MARK: - Provider 枚举

enum ASRProvider {
    VOLCENGINE,   // 火山引擎
    OTHER
}

enum TTSProvider {
    VOLCENGINE,   // 火山引擎
    OTHER
}

enum LLMProvider {
    DEEPSEEK,     // DeepSeek
    OTHER
}

// MARK: - 工厂函数

// TODO: ArkTS 工厂函数实现
// function createDigitalHuman(
//     config: DigitalHumanConfig,
//     listener: DigitalHumanListener
// ): DigitalHuman

// function createAudioPipeline(
//     config: AudioPipelineConfig,
//     listener: AudioPipelineListener
// ): AudioPipeline

// MARK: - 配置结构体

class DigitalHumanConfig {
    modelPath: string        // Live2D 模型路径
    serverUrl: string        // 后端服务器 URL
    style: HumanStyle = HumanStyle.CARTOON
    emotion: HumanEmotion = HumanEmotion.NEUTRAL
    
    constructor(modelPath: string, serverUrl: string) {
        this.modelPath = modelPath
        this.serverUrl = serverUrl
    }
}

class AudioPipelineConfig {
    asrProvider: ASRProvider = ASRProvider.VOLCENGINE
    ttsProvider: TTSProvider = TTSProvider.VOLCENGINE
    llmProvider: LLMProvider = LLMProvider.DEEPSEEK
    apiKeys: Record<string, string>  // 各 provider 的 API keys
    
    constructor(
        asrProvider: ASRProvider = ASRProvider.VOLCENGINE,
        ttsProvider: TTSProvider = TTSProvider.VOLCENGINE,
        llmProvider: LLMProvider = LLMProvider.DEEPSEEK,
        apiKeys: Record<string, string> = {}
    ) {
        this.asrProvider = asrProvider
        this.ttsProvider = ttsProvider
        this.llmProvider = llmProvider
        this.apiKeys = apiKeys
    }
}