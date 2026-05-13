import Foundation
import SwiftUI
#if canImport(Speech)
import Speech
#endif
#if canImport(AVFoundation)
import AVFoundation
#endif

/// 语音引擎对外状态
enum SpeechEngineState: Equatable {
  case idle
  case speaking            // TTS 正在播放
  case listening           // 正在录音识别
  case permissionDenied(String)
  case error(String)
}

/// 语音引擎 - 数字人面试用
/// - TTS：AVSpeechSynthesizer 播报题目
/// - ASR：SFSpeechRecognizer + AVAudioEngine 实时识别候选人回答
/// - 在 macOS 上也可用，若不可用则回退到 stub（只改状态，不出声）
@MainActor
final class SpeechEngine: NSObject, ObservableObject {
  @Published var state: SpeechEngineState = .idle
  @Published var partialTranscript: String = ""
  @Published var finalTranscript: String = ""

  #if canImport(Speech)
  private let recognizer: SFSpeechRecognizer? = SFSpeechRecognizer(
    locale: Locale(identifier: "zh-CN")
  )
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  #endif

  #if canImport(AVFoundation)
  private let audioEngine = AVAudioEngine()
  private let synthesizer = AVSpeechSynthesizer()
  #endif

  override init() {
    super.init()
    #if canImport(AVFoundation)
    synthesizer.delegate = self
    #endif
  }

  // MARK: - 权限

  /// 同时申请语音识别与麦克风权限
  func requestPermissions() async -> Bool {
    #if canImport(Speech) && canImport(AVFoundation)
    let speechOK = await withCheckedContinuation { cont in
      SFSpeechRecognizer.requestAuthorization { status in
        cont.resume(returning: status == .authorized)
      }
    }
    guard speechOK else {
      state = .permissionDenied("请在系统设置中允许语音识别")
      return false
    }

    #if os(iOS)
    let micOK = await withCheckedContinuation { cont in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        cont.resume(returning: granted)
      }
    }
    if !micOK {
      state = .permissionDenied("请在系统设置中允许麦克风")
      return false
    }
    #endif

    return true
    #else
    return false
    #endif
  }

  // MARK: - TTS 播报题目

  func speak(_ text: String) {
    #if canImport(AVFoundation)
    stopListening()
    if synthesizer.isSpeaking {
      synthesizer.stopSpeaking(at: .immediate)
    }
    let utterance = AVSpeechUtterance(string: text)
    utterance.voice = AVSpeechSynthesisVoice(language: "zh-CN")
    utterance.rate = 0.5
    utterance.pitchMultiplier = 1.0
    state = .speaking
    synthesizer.speak(utterance)
    #else
    state = .speaking
    // macOS 无 AVFoundation 场景下给个短暂模拟播报
    Task { [weak self] in
      try? await Task.sleep(nanoseconds: 1_500_000_000)
      await MainActor.run { self?.state = .idle }
    }
    #endif
  }

  func stopSpeaking() {
    #if canImport(AVFoundation)
    if synthesizer.isSpeaking {
      synthesizer.stopSpeaking(at: .immediate)
    }
    #endif
    if case .speaking = state { state = .idle }
  }

  // MARK: - ASR 录音

  /// 开始识别。返回是否成功启动。调用前需确保已 `requestPermissions()`
  func startListening() async -> Bool {
    #if canImport(Speech) && canImport(AVFoundation)
    guard let recognizer, recognizer.isAvailable else {
      state = .error("语音识别暂不可用")
      return false
    }
    stopSpeaking()

    do {
      #if os(iOS)
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers])
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      #endif

      let request = SFSpeechAudioBufferRecognitionRequest()
      request.shouldReportPartialResults = true
      recognitionRequest = request

      let inputNode = audioEngine.inputNode
      let format = inputNode.outputFormat(forBus: 0)
      inputNode.removeTap(onBus: 0)
      inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
        self?.recognitionRequest?.append(buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()

      partialTranscript = ""
      finalTranscript = ""
      state = .listening

      recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
        Task { @MainActor in
          guard let self else { return }
          if let result {
            self.partialTranscript = result.bestTranscription.formattedString
            if result.isFinal {
              self.finalTranscript = self.partialTranscript
            }
          }
          if error != nil {
            self.markIdle()
          }
        }
      }
      return true
    } catch {
      state = .error(error.localizedDescription)
      return false
    }
    #else
    state = .listening
    partialTranscript = ""
    finalTranscript = ""
    return true
    #endif
  }

  /// 停止录音，返回最终识别文本
  @discardableResult
  func stopListening() -> String {
    #if canImport(Speech) && canImport(AVFoundation)
    if audioEngine.isRunning {
      audioEngine.stop()
      audioEngine.inputNode.removeTap(onBus: 0)
    }
    recognitionRequest?.endAudio()
    recognitionTask?.finish()
    recognitionRequest = nil
    recognitionTask = nil
    #if os(iOS)
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    #endif
    #endif
    markIdle()
    let text = finalTranscript.isEmpty ? partialTranscript : finalTranscript
    return text
  }

  /// 重置为 idle（避开 NSObject.finalize 命名冲突）
  private func markIdle() {
    if case .listening = state { state = .idle }
  }

  /// 彻底释放资源
  func cleanup() {
    stopSpeaking()
    _ = stopListening()
    state = .idle
  }
}

#if canImport(AVFoundation)
extension SpeechEngine: AVSpeechSynthesizerDelegate {
  nonisolated func speechSynthesizer(
    _ synthesizer: AVSpeechSynthesizer,
    didFinish utterance: AVSpeechUtterance
  ) {
    Task { @MainActor [weak self] in
      guard let self else { return }
      if case .speaking = self.state { self.state = .idle }
    }
  }

  nonisolated func speechSynthesizer(
    _ synthesizer: AVSpeechSynthesizer,
    didCancel utterance: AVSpeechUtterance
  ) {
    Task { @MainActor [weak self] in
      guard let self else { return }
      if case .speaking = self.state { self.state = .idle }
    }
  }
}
#endif
