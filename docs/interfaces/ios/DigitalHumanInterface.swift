import Foundation

// ==================== 统一数字人接口 - iOS 实现 ====================
// 实现 docs/interfaces/UNIFIED_INTERFACE.md 中定义的接口
//
// @since 2026-04-14
// @status 🟡 进行中

// MARK: - DigitalHuman 主接口

public protocol DigitalHuman: AnyObject {
    // 生命周期
    func start() async -> Bool  // 启动数字人
    func stop() async -> Bool   // 停止数字人
    var isReady: Bool { get }    // 是否就绪
    
    // 音频驱动（唇形同步）
    func sendAudio(_ audioData: Data)   // 发送音频数据驱动口型
    func sendText(_ text: String)        // 发送文字（备用）
    
    // 语音交互
    func speak(_ text: String) async -> Bool  // 数字人说话
    func stopSpeaking()                        // 停止说话
    
    // 配置
    func setStyle(_ style: HumanStyle)
    func setEmotion(_ emotion: HumanEmotion)
}

// MARK: - 枚举定义

public enum HumanStyle {
    case cartoon      // 卡通风格
    case realistic    // 真人风格
    case style2D      // 2D 风格
}

public enum HumanEmotion {
    case neutral      // 中性
    case happy        // 开心
    case serious      // 严肃
    case thinking     // 思考
}

// MARK: - DigitalHumanListener 回调接口

public protocol DigitalHumanListener: AnyObject {
    func onReady()                                    // 数字人准备就绪
    func onError(_ error: Error)                      // 发生错误
    func onSpeakingStarted()                          // 开始说话
    func onSpeakingFinished()                         // 说话结束
    func onAudioLevel(_ level: Float)                // 音频级别（用于UI可视化）
    func onEmotionChanged(_ emotion: HumanEmotion)   // 情绪变化
}

// MARK: - AudioPipeline 接口

public protocol AudioPipeline: AnyObject {
    func start() async -> Bool
    func stop()
    
    // 音频输入
    func sendAudioInput(_ audioData: Data)
    
    // 配置
    func setASRProvider(_ provider: ASRProvider)
    func setTTSProvider(_ provider: TTSProvider)
    func setLLMProvider(_ provider: LLMProvider)
    
    // 回调
    func setListener(_ listener: AudioPipelineListener)
}

// MARK: - AudioPipelineListener 回调接口

public protocol AudioPipelineListener: AnyObject {
    func onAudioInputRecognized(_ text: String)    // ASR 识别结果
    func onLLMResponse(_ text: String)            // LLM 回复
    func onTTSGenerated(_ audioData: Data)        // TTS 音频
    func onError(_ error: Error)
}

// MARK: - Provider 枚举

public enum ASRProvider {
    case volcengine   // 火山引擎
    case other
}

public enum TTSProvider {
    case volcengine   // 火山引擎
    case other
}

public enum LLMProvider {
    case deepseek     // DeepSeek
    case other
}

// MARK: - 工厂函数

/// 创建数字人实例
/// - Parameters:
///   - config: 数字人配置
///   - listener: 事件回调
/// - Returns: DigitalHuman 实例
public func createDigitalHuman(
    config: DigitalHumanConfig,
    listener: DigitalHumanListener
) -> DigitalHuman {
    // TODO: 实现 Live2D 渲染 + 火山引擎 ASR/TTS 集成
    fatalError("等待 Phase 3 实现")
}

/// 创建音频管道实例
/// - Parameters:
///   - config: 管道配置
///   - listener: 事件回调
/// - Returns: AudioPipeline 实例
public func createAudioPipeline(
    config: AudioPipelineConfig,
    listener: AudioPipelineListener
) -> AudioPipeline {
    // TODO: 实现 WebRTC + 火山引擎 ASR + DeepSeek + TTS 管道
    fatalError("等待 Phase 3 实现")
}

// MARK: - 配置结构体

public struct DigitalHumanConfig {
    public let modelPath: String        // Live2D 模型路径
    public let serverUrl: String        // 后端服务器 URL
    public let style: HumanStyle
    public let emotion: HumanEmotion
    
    public init(
        modelPath: String,
        serverUrl: String,
        style: HumanStyle = .cartoon,
        emotion: HumanEmotion = .neutral
    ) {
        self.modelPath = modelPath
        self.serverUrl = serverUrl
        self.style = style
        self.emotion = emotion
    }
}

public struct AudioPipelineConfig {
    public let asrProvider: ASRProvider
    public let ttsProvider: TTSProvider
    public let llmProvider: LLMProvider
    public let apiKeys: [String: String]  // 各 provider 的 API keys
    
    public init(
        asrProvider: ASRProvider = .volcengine,
        ttsProvider: TTSProvider = .volcengine,
        llmProvider: LLMProvider = .deepseek,
        apiKeys: [String: String] = [:]
    ) {
        self.asrProvider = asrProvider
        self.ttsProvider = ttsProvider
        self.llmProvider = llmProvider
        self.apiKeys = apiKeys
    }
}