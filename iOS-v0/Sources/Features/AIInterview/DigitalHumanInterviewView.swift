import SwiftUI
import Combine

// MARK: - 数字人面试视图（真实 TTS/ASR 引擎）
/// 对齐 Android `DuixAvatarInterviewScreen` 的 UX 结构：
/// - 沉浸式深色背景（数字人视窗占据主体）
/// - 中间展示虚拟形象（当前使用渐变脉冲占位，实际 DUIX 集成留待后续）
/// - 顶部是题目/进度，底部是语音控制面板与字幕
/// 与 Android 一致的事件：开始/结束录音、切换下一题、关闭会话
@MainActor
final class DigitalHumanSessionViewModel: ObservableObject {
  @Published var isDigitalHumanSpeaking: Bool = false
  @Published var isRecording: Bool = false
  @Published var partialTranscript: String = ""
  @Published var lastAnswer: String = ""
  @Published var statusMessage: String = "准备就绪"
  @Published var currentQuestionIndex: Int = 0
  @Published var isCompleted: Bool = false
  @Published var permissionDenied: String?

  /// 语音引擎（TTS + ASR）
  let speechEngine = SpeechEngine()
  private var cancellables: Set<Combine.AnyCancellable> = []
  private var speakingTask: Task<Void, Never>?
  private var didRequestPermissions = false

  let questions: [AiInterviewQuestion]
  let jobTarget: String
  let sessionId: String?

  init(flow: AiInterviewFlowState) {
    self.questions = flow.questions
    self.jobTarget = flow.jobTarget
    self.sessionId = flow.sessionId
    bindEngine()
  }

  /// 便捷构造：允许独立演示模式
  init(jobTarget: String, questions: [AiInterviewQuestion]) {
    self.questions = questions
    self.jobTarget = jobTarget
    self.sessionId = nil
    bindEngine()
  }

  /// 语音引擎状态 -> 视图状态桥接
  private func bindEngine() {
    speechEngine.$state
      .receive(on: DispatchQueue.main)
      .sink { [weak self] newState in
        guard let self else { return }
        switch newState {
        case .speaking:
          self.isDigitalHumanSpeaking = true
          self.statusMessage = "数字人正在说话…"
        case .listening:
          self.isDigitalHumanSpeaking = false
          self.isRecording = true
          self.statusMessage = "录音中…再次点击结束以提交"
        case .idle:
          self.isDigitalHumanSpeaking = false
          self.isRecording = false
        case .permissionDenied(let msg):
          self.permissionDenied = msg
          self.statusMessage = msg
        case .error(let msg):
          self.statusMessage = msg
        }
      }
      .store(in: &cancellables)

    speechEngine.$partialTranscript
      .receive(on: DispatchQueue.main)
      .assign(to: &$partialTranscript)
  }

  var currentQuestion: AiInterviewQuestion? {
    guard currentQuestionIndex < questions.count else { return nil }
    return questions[currentQuestionIndex]
  }

  var totalQuestions: Int { questions.count }

  /// 数字人播报当前问题（真实 TTS）
  func startSpeakingCurrentQuestion() {
    speakingTask?.cancel()
    guard let q = currentQuestion else { return }
    speakingTask = Task { [weak self] in
      guard let self else { return }
      await self.ensurePermissionsIfNeeded()
      await MainActor.run {
        self.speechEngine.speak(q.questionText)
      }
    }
  }

  /// 开始/结束录音
  func toggleRecording(using appState: AppState) {
    if isRecording {
      let text = speechEngine.stopListening()
      commitAnswer(text: text, using: appState)
    } else {
      Task { [weak self] in
        guard let self else { return }
        let ok = await self.ensurePermissionsIfNeeded()
        guard ok else { return }
        _ = await self.speechEngine.startListening()
      }
    }
  }

  private func ensurePermissionsIfNeeded() async -> Bool {
    if didRequestPermissions { return true }
    didRequestPermissions = true
    let ok = await speechEngine.requestPermissions()
    if !ok {
      await MainActor.run {
        self.permissionDenied = "语音或麦克风权限被拒绝"
      }
    }
    return ok
  }

  /// 提交回答到后端乶推进下一题
  private func commitAnswer(text: String, using appState: AppState) {
    let answer = text.trimmingCharacters(in: .whitespacesAndNewlines)
    lastAnswer = answer
    guard !answer.isEmpty else {
      statusMessage = "没有识别到内容，请重试"
      return
    }
    statusMessage = "已提交回答…"

    guard let sessionId, let q = currentQuestion else {
      // 无 sessionId 的演示模式直接本地推进
      nextQuestion()
      return
    }

    Task { [weak self] in
      guard let self else { return }
      do {
        let response = try await appState.aiInterviewService.submitAnswer(
          AiInterviewSubmitAnswerRequest(
            sessionId: sessionId,
            questionIndex: q.questionIndex,
            answerText: answer,
            answerVideoUrl: nil,
            answerVideoPath: nil,
            answerDuration: nil
          )
        )
        if response.isCompleted == true {
          await MainActor.run {
            self.isCompleted = true
            self.statusMessage = response.message ?? "面试已完成"
          }
          return
        }
        let next = try await appState.aiInterviewService.nextQuestion(sessionId: sessionId)
        await MainActor.run {
          if next.isCompleted == true {
            self.isCompleted = true
            self.statusMessage = next.message ?? "面试已完成"
          } else if let nextQ = next.question {
            self.advanceTo(nextQ)
          } else {
            self.nextQuestion()
          }
        }
      } catch {
        await MainActor.run {
          self.statusMessage = "提交失败：\(error.localizedDescription)"
        }
      }
    }
  }

  /// 后端返回的下一题可能不在初始清单中，走索引推进即可
  private func advanceTo(_ next: AiInterviewQuestion) {
    currentQuestionIndex = min(currentQuestionIndex + 1, max(0, questions.count - 1))
    partialTranscript = ""
    lastAnswer = ""
    speechEngine.speak(next.questionText)
  }

  func nextQuestion() {
    guard currentQuestionIndex + 1 < questions.count else {
      isCompleted = true
      statusMessage = "面试已完成"
      return
    }
    currentQuestionIndex += 1
    partialTranscript = ""
    lastAnswer = ""
    startSpeakingCurrentQuestion()
  }

  func cleanup() {
    speakingTask?.cancel()
    speakingTask = nil
    speechEngine.cleanup()
  }
}

// MARK: - 主视图
struct DigitalHumanInterviewView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel: DigitalHumanSessionViewModel
  @State private var pulseScale: CGFloat = 1.0

  init(flow: AiInterviewFlowState) {
    _viewModel = StateObject(wrappedValue: DigitalHumanSessionViewModel(flow: flow))
  }

  /// 演示模式构造（无真实 flow）
  init(jobTarget: String, questions: [AiInterviewQuestion]) {
    _viewModel = StateObject(
      wrappedValue: DigitalHumanSessionViewModel(jobTarget: jobTarget, questions: questions)
    )
  }

  var body: some View {
    ZStack {
      backgroundLayer.ignoresSafeArea()

      VStack(spacing: 0) {
        topBar
        Spacer()
        avatarStage
          .padding(.bottom, 12)
        questionPanel
          .padding(.horizontal, 20)
          .padding(.bottom, 20)
        controlPanel
          .padding(.horizontal, 20)
          .padding(.bottom, 28)
      }

      if viewModel.isCompleted {
        completeOverlay
      }
    }
    #if os(iOS)
    .navigationBarHidden(true)
    .statusBarHidden(true)
    #endif
    .onAppear {
      viewModel.startSpeakingCurrentQuestion()
      startPulse()
    }
    .onDisappear { viewModel.cleanup() }
  }

  // MARK: - 背景层：深色 + 脉冲光晕
  private var backgroundLayer: some View {
    ZStack {
      Color(hex: 0x0B0C10)
      RadialGradient(
        colors: [
          Color(hex: 0x17D9C0).opacity(viewModel.isDigitalHumanSpeaking ? 0.35 : 0.15),
          Color.clear
        ],
        center: .center,
        startRadius: 20,
        endRadius: 320
      )
    }
  }

  // MARK: - 顶部
  private var topBar: some View {
    HStack(alignment: .center) {
      Button {
        viewModel.cleanup()
        dismiss()
      } label: {
        Image(systemName: "xmark")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(.white)
          .frame(width: 36, height: 36)
          .background(Circle().fill(Color.white.opacity(0.12)))
      }
      .buttonStyle(.plain)

      Spacer()

      VStack(spacing: 4) {
        Text(viewModel.jobTarget)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(.white)
        Text("数字人面试 · \(viewModel.currentQuestionIndex + 1)/\(max(viewModel.totalQuestions, 1))")
          .font(.system(size: 11))
          .foregroundStyle(.white.opacity(0.7))
      }

      Spacer()
      Color.clear.frame(width: 36, height: 36)
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }

  // MARK: - 中间数字人占位
  private var avatarStage: some View {
    ZStack {
      Circle()
        .stroke(Color(hex: 0x17D9C0).opacity(0.4), lineWidth: 2)
        .frame(width: 230, height: 230)
        .scaleEffect(pulseScale)
        .opacity(viewModel.isDigitalHumanSpeaking ? 0.8 : 0.3)

      Circle()
        .fill(
          LinearGradient(
            colors: [Color(hex: 0x17D9C0), Color(hex: 0x1E3A5F)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .frame(width: 200, height: 200)

      Image(systemName: "person.crop.circle.badge.waveform")
        .font(.system(size: 72, weight: .light))
        .foregroundStyle(.white.opacity(0.85))

      if viewModel.isRecording {
        Circle()
          .stroke(Color(hex: 0xEC7C38).opacity(0.7), lineWidth: 3)
          .frame(width: 240, height: 240)
          .scaleEffect(pulseScale * 1.05)
      }
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - 题目面板
  private var questionPanel: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 6) {
        Circle().fill(Color(hex: 0x17D9C0)).frame(width: 6, height: 6)
        Text("当前问题")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(Color(hex: 0x17D9C0))
      }
      Text(viewModel.currentQuestion?.questionText ?? "正在加载题目…")
        .font(.system(size: 15))
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, alignment: .leading)

      if !viewModel.partialTranscript.isEmpty {
        Divider().background(Color.white.opacity(0.12))
        Text("识别中：\(viewModel.partialTranscript)")
          .font(.system(size: 12))
          .foregroundStyle(.white.opacity(0.75))
      } else if !viewModel.lastAnswer.isEmpty {
        Divider().background(Color.white.opacity(0.12))
        Text("上一轮回答：\(viewModel.lastAnswer)")
          .font(.system(size: 12))
          .foregroundStyle(.white.opacity(0.75))
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .fill(Color.white.opacity(0.08))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(Color.white.opacity(0.12), lineWidth: 1)
    )
  }

  // MARK: - 底部控制
  private var controlPanel: some View {
    VStack(spacing: 12) {
      Text(viewModel.statusMessage)
        .font(.system(size: 12))
        .foregroundStyle(.white.opacity(0.7))

      HStack(spacing: 16) {
        actionButton(
          icon: "arrow.right",
          title: "下一题",
          tint: Color(hex: 0x2F303D)
        ) {
          viewModel.nextQuestion()
        }

        micButton

        actionButton(
          icon: "text.bubble",
          title: "模拟输入",
          tint: Color(hex: 0x2F303D)
        ) {
          viewModel.partialTranscript = "这是 Stub 模式下的模拟识别文本，用于调试后续问答流程。"
        }
      }
    }
  }

  private var micButton: some View {
    Button {
      viewModel.toggleRecording(using: appState)
    } label: {
      ZStack {
        Circle()
          .fill(viewModel.isRecording ? Color(hex: 0xEC7C38) : Color(hex: 0x17D9C0))
          .frame(width: 72, height: 72)
        Image(systemName: viewModel.isRecording ? "stop.fill" : "mic.fill")
          .font(.system(size: 28, weight: .semibold))
          .foregroundStyle(.white)
      }
    }
    .buttonStyle(.plain)
    .disabled(viewModel.isDigitalHumanSpeaking)
    .opacity(viewModel.isDigitalHumanSpeaking ? 0.5 : 1.0)
  }

  private func actionButton(
    icon: String,
    title: String,
    tint: Color,
    action: @escaping () -> Void
  ) -> some View {
    Button(action: action) {
      VStack(spacing: 4) {
        ZStack {
          Circle().fill(tint).frame(width: 52, height: 52)
          Image(systemName: icon)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(.white)
        }
        Text(title)
          .font(.system(size: 11))
          .foregroundStyle(.white.opacity(0.75))
      }
    }
    .buttonStyle(.plain)
  }

  // MARK: - 完成遮罩
  private var completeOverlay: some View {
    ZStack {
      Color.black.opacity(0.7).ignoresSafeArea()
      VStack(spacing: 14) {
        Image(systemName: "checkmark.seal.fill")
          .font(.system(size: 56))
          .foregroundStyle(Color(hex: 0x17D9C0))
        Text("数字人面试已完成")
          .font(.system(size: 20, weight: .semibold))
          .foregroundStyle(.white)
        Text("后续可在 AI 面试记录中查看回合详情")
          .font(.system(size: 13))
          .foregroundStyle(.white.opacity(0.7))
          .multilineTextAlignment(.center)
        Button {
          viewModel.cleanup()
          dismiss()
        } label: {
          Text("返回")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.black)
            .padding(.horizontal, 32)
            .padding(.vertical, 10)
            .background(Capsule().fill(Color(hex: 0x17D9C0)))
        }
        .buttonStyle(.plain)
        .padding(.top, 12)
      }
      .padding(24)
      .background(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(Color(hex: 0x171821))
      )
      .padding(40)
    }
  }

  // MARK: - 脉冲动画
  private func startPulse() {
    withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
      pulseScale = 1.08
    }
  }
}
