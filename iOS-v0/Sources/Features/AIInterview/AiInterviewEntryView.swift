import SwiftUI

@MainActor
final class AiInterviewFlowViewModel: ObservableObject {
  @Published var jobTarget: String = ""
  @Published var companyTarget: String = ""
  @Published var background: String = ""
  @Published var questionCount: Int = 5
  @Published var isCreating = false
  @Published var isSubmitting = false
  @Published var flowState: AiInterviewFlowState?
  @Published var currentQuestion: AiInterviewQuestion?
  @Published var currentIndex: Int = 0
  @Published var answerText: String = ""
  @Published var status: String?
  @Published var isCompleted: Bool = false

  func start(using appState: AppState) async {
    guard !jobTarget.isEmpty else {
      status = "请输入目标岗位"
      return
    }
    isCreating = true
    defer { isCreating = false }
    do {
      let data = try await appState.aiInterviewService.createSession(
        request: CreateAiInterviewSessionRequest(
          jobId: nil,
          jobTarget: jobTarget,
          jobCategory: nil,
          jobSubCategory: nil,
          companyTarget: companyTarget.isEmpty ? nil : companyTarget,
          background: background.isEmpty ? nil : background,
          questionCount: questionCount
        )
      )
      let state = AiInterviewFlowState(
        sessionId: data.sessionId,
        jobTarget: data.jobTarget ?? jobTarget,
        totalQuestions: data.totalQuestions,
        questions: data.questions,
        jobCategory: data.jobCategory,
        jobSubCategory: data.jobSubCategory,
        plannedDurationMinutes: data.plannedDuration,
        prompt: data.prompt,
        jobId: data.jobId
      )
      flowState = state
      currentIndex = 0
      currentQuestion = data.questions.first
      status = nil
      isCompleted = false
      answerText = ""
    } catch {
      status = error.localizedDescription
    }
  }

  func submit(using appState: AppState) async {
    guard let flowState else { return }
    guard let question = currentQuestion else { return }
    guard !answerText.isEmpty else {
      status = "请输入回答"
      return
    }
    isSubmitting = true
    defer { isSubmitting = false }
    do {
      let response = try await appState.aiInterviewService.submitAnswer(
        AiInterviewSubmitAnswerRequest(
          sessionId: flowState.sessionId,
          questionIndex: question.questionIndex,
          answerText: answerText,
          answerVideoUrl: nil,
          answerVideoPath: nil,
          answerDuration: nil
        )
      )
      answerText = ""
      if response.isCompleted == true {
        isCompleted = true
        status = response.message ?? "面试已完成"
        return
      }
      // Load next question
      let next = try await appState.aiInterviewService.nextQuestion(sessionId: flowState.sessionId)
      if next.isCompleted == true {
        isCompleted = true
        status = next.message ?? "面试已完成"
      } else {
        currentQuestion = next.question
        currentIndex += 1
        status = response.message
      }
    } catch {
      status = error.localizedDescription
    }
  }
}

struct AiInterviewEntryView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel = AiInterviewFlowViewModel()
  @State private var showLogin = false

  var body: some View {
    NavigationStack {
      Group {
        if let flow = viewModel.flowState, let question = viewModel.currentQuestion {
          InterviewSessionView(flow: flow, currentQuestion: question)
            .environmentObject(viewModel)
        } else {
          form
        }
      }
      .navigationTitle("AI 面试")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
    }
  }

  private var form: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 14) {
        Text("创建你的专属面试")
          .font(AppFont.title(22))
        Text("输入目标岗位、公司与个人背景，系统会生成对应的问题。")
          .font(AppFont.body(14))
          .foregroundStyle(AppColor.textSecondary)

        VStack(alignment: .leading, spacing: 10) {
          Text("目标岗位")
          TextField("例如：前端开发工程师", text: $viewModel.jobTarget)
            .textFieldStyle(.roundedBorder)
          Text("目标公司")
          TextField("可选，例：字节跳动", text: $viewModel.companyTarget)
            .textFieldStyle(.roundedBorder)
          Text("个人背景")
          TextField("示例：3年React，熟悉状态管理", text: $viewModel.background)
            .textFieldStyle(.roundedBorder)
          Text("题目数量：\(viewModel.questionCount)")
          Slider(value: Binding(
            get: { Double(viewModel.questionCount) },
            set: { viewModel.questionCount = Int($0) }
          ), in: 3...10, step: 1)
        }

        PrimaryButton(title: "开始面试", isLoading: viewModel.isCreating) {
          guard appState.isLoggedIn else {
            showLogin = true
            return
          }
          Task { await viewModel.start(using: appState) }
        }

        if let status = viewModel.status {
          Text(status)
            .font(AppFont.caption(12))
            .foregroundStyle(.red)
        }
      }
      .padding(16)
    }
    .sheet(isPresented: $showLogin) {
      LoginView { data in
        appState.updateAuth(token: data.token, user: data.user)
        showLogin = false
      }
      .environmentObject(appState)
    }
  }
}

struct InterviewSessionView: View {
  @EnvironmentObject private var viewModel: AiInterviewFlowViewModel
  @EnvironmentObject private var appState: AppState

  let flow: AiInterviewFlowState
  let currentQuestion: AiInterviewQuestion

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      if viewModel.isCompleted {
        InterviewCompleteView(status: viewModel.status ?? "面试完成")
      } else {
        Text(flow.jobTarget)
          .font(AppFont.title(20))
        ProgressView(value: Double(currentQuestion.questionIndex + 1), total: Double(flow.totalQuestions))
        GlassCard {
          VStack(alignment: .leading, spacing: 10) {
            Text("问题 \(currentQuestion.questionIndex + 1)")
              .font(AppFont.title(16))
            Text(currentQuestion.questionText)
              .font(AppFont.body(15))
              .foregroundStyle(AppColor.textSecondary)
          }
        }
        TextEditor(text: $viewModel.answerText)
          .frame(height: 140)
          .padding(8)
          .background(AppColor.card)
          .clipShape(RoundedRectangle(cornerRadius: 12))
          .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))

        PrimaryButton(title: "提交回答", isLoading: viewModel.isSubmitting) {
          Task { await viewModel.submit(using: appState) }
        }

        if let status = viewModel.status {
          Text(status)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.textSecondary)
        }
      }

      Spacer()
    }
    .padding(16)
  }
}

struct InterviewCompleteView: View {
  let status: String

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "checkmark.seal.fill")
        .font(.system(size: 48))
        .foregroundStyle(AppColor.accent)
      Text("已完成")
        .font(AppFont.title(22))
      Text(status)
        .font(AppFont.body(14))
        .foregroundStyle(AppColor.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }
}
