import SwiftUI

// MARK: - 主题色常量（对齐 Android `AiInterviewPage` 的暗黑配色）
private enum AiPalette {
  static let pageBackground = Color(hex: 0x111217)
  static let cardBackground = Color(hex: 0x171821)
  static let columnBackground = Color(hex: 0x1D1E28)
  static let textPrimary = Color(hex: 0xECEFF5)
  static let textSecondary = Color(hex: 0xA8A9B6)
  static let textMuted = Color(hex: 0x7E7F8C)
  static let accent = Color(hex: 0x17D9C0)
  static let searchFieldBackground = Color(hex: 0x2A2B34)
  static let categoryItemBackground = Color(hex: 0x20222D)
  static let categorySelectedBackground = Color(hex: 0x1A1B25)
  static let buttonBackground = Color(hex: 0x252632)
  static let buttonSelectedBackground = Color(hex: 0x2F303D)
}

// MARK: - 入口页 ViewModel：加载岗位字典 + 维护选择 + 透传到 Flow
@MainActor
final class AiInterviewEntryViewModel: ObservableObject {
  @Published var categories: [JobDictionaryCategory] = []
  @Published var selectedCategoryId: String?
  @Published var selectedPositionId: String?
  @Published var searchQuery: String = ""
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let data = try await appState.jobsService.getJobDictionary()
      categories = data
      if selectedCategoryId == nil {
        selectedCategoryId = data.first?.id
      }
      errorMessage = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  var selectedCategory: JobDictionaryCategory? {
    categories.first { $0.id == selectedCategoryId }
  }

  var filteredPositions: [JobDictionaryPosition] {
    let positions = selectedCategory?.positions ?? []
    let q = searchQuery.trimmingCharacters(in: .whitespaces).lowercased()
    guard !q.isEmpty else { return positions }
    return positions.filter { p in
      p.name.lowercased().contains(q) ||
      p.code.lowercased().contains(q) ||
      p.tags.contains(where: { $0.lowercased().contains(q) })
    }
  }
}

// MARK: - Flow ViewModel：创建会话 + 推进问答（保留既有流程）
@MainActor
final class AiInterviewFlowViewModel: ObservableObject {
  @Published var jobTarget: String = ""
  @Published var jobCategory: String = ""
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

  func reset() {
    jobTarget = ""
    jobCategory = ""
    companyTarget = ""
    background = ""
    questionCount = 5
    flowState = nil
    currentQuestion = nil
    currentIndex = 0
    answerText = ""
    status = nil
    isCompleted = false
  }

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
          jobCategory: jobCategory.isEmpty ? nil : jobCategory,
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

// MARK: - 入口页：岗位字典选择
struct AiInterviewEntryView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var entryViewModel = AiInterviewEntryViewModel()
  @StateObject private var flowViewModel = AiInterviewFlowViewModel()
  @State private var showLogin = false
  @State private var showPrep = false

  var body: some View {
    NavigationStack {
      ZStack {
        AiPalette.pageBackground.ignoresSafeArea()
        VStack(spacing: 0) {
          topBar
          titleSection
          searchField
            .padding(.horizontal, 16)
            .padding(.top, 12)
          contentRow
            .padding(.top, 16)
        }

        if entryViewModel.isLoading && entryViewModel.categories.isEmpty {
          ProgressView().tint(AiPalette.accent)
        }
      }
      #if os(iOS)
      .navigationBarHidden(true)
      #endif
      .task { await entryViewModel.load(using: appState) }
      .sheet(isPresented: $showLogin) {
        LoginView { data in
          appState.updateAuth(token: data.token, user: data.user)
          showLogin = false
        }
        .environmentObject(appState)
      }
      .sheet(isPresented: $showPrep) {
        AiInterviewPrepView()
          .environmentObject(appState)
          .environmentObject(flowViewModel)
      }
    }
  }

  // MARK: - 顶部导航栏
  private var topBar: some View {
    HStack(spacing: 12) {
      Button { dismiss() } label: {
        Image(systemName: "chevron.left")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(AiPalette.textPrimary)
          .frame(width: 36, height: 36)
          .background(Circle().fill(AiPalette.cardBackground))
      }
      .buttonStyle(.plain)
      Spacer()
      Text("AI 面试")
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(AiPalette.textPrimary)
      Spacer()
      Color.clear.frame(width: 36, height: 36)
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }

  private var titleSection: some View {
    HStack {
      Text("想找哪些工作?")
        .font(.system(size: 26, weight: .bold))
        .foregroundStyle(AiPalette.textPrimary)
      Spacer()
    }
    .padding(.horizontal, 16)
    .padding(.top, 6)
  }

  private var searchField: some View {
    HStack(spacing: 8) {
      Image(systemName: "magnifyingglass")
        .font(.system(size: 14))
        .foregroundStyle(AiPalette.textMuted)
      TextField("搜索岗位/标签", text: $entryViewModel.searchQuery)
        .font(.system(size: 14))
        .foregroundStyle(AiPalette.textPrimary)
        .tint(AiPalette.accent)
    }
    .padding(.horizontal, 12)
    .frame(height: 40)
    .background(
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .fill(AiPalette.searchFieldBackground)
    )
  }

  private var contentRow: some View {
    HStack(alignment: .top, spacing: 12) {
      categoryList
        .frame(width: 130)
      positionsArea
        .frame(maxWidth: .infinity)
    }
    .padding(.horizontal, 12)
  }

  // MARK: - 左侧分类列
  private var categoryList: some View {
    ScrollView(showsIndicators: false) {
      VStack(spacing: 8) {
        ForEach(entryViewModel.categories) { category in
          let selected = entryViewModel.selectedCategoryId == category.id
          Button {
            entryViewModel.selectedCategoryId = category.id
            entryViewModel.selectedPositionId = nil
          } label: {
            HStack {
              Text(category.name)
                .font(.system(size: 14, weight: selected ? .semibold : .regular))
                .foregroundStyle(selected ? AiPalette.accent : AiPalette.textPrimary)
                .lineLimit(1)
              Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
              RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(selected ? AiPalette.categorySelectedBackground : AiPalette.categoryItemBackground)
            )
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.bottom, 24)
    }
  }

  // MARK: - 右侧岗位区
  private var positionsArea: some View {
    Group {
      if let error = entryViewModel.errorMessage {
        VStack {
          Text(error)
            .font(.system(size: 13))
            .foregroundStyle(.red.opacity(0.8))
        }
      } else if entryViewModel.filteredPositions.isEmpty {
        VStack(spacing: 8) {
          Image(systemName: "magnifyingglass")
            .font(.system(size: 24))
            .foregroundStyle(AiPalette.textMuted)
          Text("没有匹配的岗位")
            .font(.system(size: 13))
            .foregroundStyle(AiPalette.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 40)
      } else {
        ScrollView(showsIndicators: false) {
          LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            ForEach(entryViewModel.filteredPositions) { position in
              positionCell(position)
            }
          }
          .padding(.bottom, 24)
        }
      }
    }
  }

  private func positionCell(_ position: JobDictionaryPosition) -> some View {
    let selected = entryViewModel.selectedPositionId == position.id
    return Button {
      entryViewModel.selectedPositionId = position.id
      let categoryName = entryViewModel.selectedCategory?.name ?? ""
      flowViewModel.jobTarget = position.name
      flowViewModel.jobCategory = categoryName
      showPrep = true
    } label: {
      VStack(alignment: .leading, spacing: 6) {
        Text(position.name)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(AiPalette.textPrimary)
          .lineLimit(1)
        if let tag = position.tags.first {
          Text(tag)
            .font(.system(size: 11))
            .foregroundStyle(AiPalette.textMuted)
            .lineLimit(1)
        }
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(selected ? AiPalette.buttonSelectedBackground : AiPalette.buttonBackground)
      )
    }
    .buttonStyle(.plain)
  }
}

// MARK: - 准备页：填补充信息 + 开始面试
struct AiInterviewPrepView: View {
  @EnvironmentObject private var appState: AppState
  @EnvironmentObject private var viewModel: AiInterviewFlowViewModel
  @Environment(\.dismiss) private var dismiss
  @State private var showLogin = false

  var body: some View {
    NavigationStack {
      ZStack {
        AiPalette.pageBackground.ignoresSafeArea()
        Group {
          if viewModel.flowState != nil, viewModel.currentQuestion != nil {
            AiInterviewSessionView()
              .environmentObject(viewModel)
          } else {
            prepForm
          }
        }
      }
      .navigationTitle("AI 面试准备")
      #if os(iOS)
      .navigationBarTitleDisplayMode(.inline)
      #endif
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") {
            viewModel.reset()
            dismiss()
          }
          .foregroundStyle(AiPalette.textPrimary)
        }
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

  private var prepForm: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        VStack(alignment: .leading, spacing: 6) {
          Text(viewModel.jobTarget.isEmpty ? "面试岗位" : viewModel.jobTarget)
            .font(.system(size: 22, weight: .bold))
            .foregroundStyle(AiPalette.textPrimary)
          if !viewModel.jobCategory.isEmpty {
            Text(viewModel.jobCategory)
              .font(.system(size: 13))
              .foregroundStyle(AiPalette.textSecondary)
          }
        }

        prepField(label: "目标岗位", placeholder: "例如：前端开发工程师", text: $viewModel.jobTarget)
        prepField(label: "目标公司（可选）", placeholder: "例如：字节跳动", text: $viewModel.companyTarget)
        prepField(label: "个人背景（可选）", placeholder: "示例：3 年 React，熟悉状态管理", text: $viewModel.background)

        VStack(alignment: .leading, spacing: 10) {
          Text("题目数量：\(viewModel.questionCount)")
            .font(.system(size: 14))
            .foregroundStyle(AiPalette.textSecondary)
          Slider(value: Binding(
            get: { Double(viewModel.questionCount) },
            set: { viewModel.questionCount = Int($0) }
          ), in: 3...10, step: 1)
          .tint(AiPalette.accent)
        }

        Button {
          guard appState.isLoggedIn else {
            showLogin = true
            return
          }
          Task { await viewModel.start(using: appState) }
        } label: {
          HStack {
            if viewModel.isCreating {
              ProgressView().tint(.black)
            }
            Text("开始面试")
              .font(.system(size: 15, weight: .semibold))
          }
          .frame(maxWidth: .infinity)
          .frame(height: 48)
          .foregroundStyle(.black)
          .background(Capsule().fill(AiPalette.accent))
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isCreating)

        if let status = viewModel.status {
          Text(status)
            .font(.system(size: 12))
            .foregroundStyle(.red.opacity(0.85))
        }

        Spacer()
      }
      .padding(16)
    }
  }

  private func prepField(label: String, placeholder: String, text: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label)
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(AiPalette.textSecondary)
      TextField("", text: text, prompt:
        Text(placeholder).foregroundColor(AiPalette.textMuted)
      )
      .font(.system(size: 14))
      .foregroundStyle(AiPalette.textPrimary)
      .padding(.horizontal, 12)
      .frame(height: 44)
      .background(
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(AiPalette.cardBackground)
      )
    }
  }
}

// MARK: - 会话页：题目 + 回答 + 进度
struct AiInterviewSessionView: View {
  @EnvironmentObject private var viewModel: AiInterviewFlowViewModel
  @EnvironmentObject private var appState: AppState
  @State private var showDigitalHuman = false

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        if viewModel.isCompleted {
          AiInterviewCompleteView(status: viewModel.status ?? "面试完成")
        } else if let flow = viewModel.flowState, let question = viewModel.currentQuestion {
          Text(flow.jobTarget)
            .font(.system(size: 20, weight: .bold))
            .foregroundStyle(AiPalette.textPrimary)
          ProgressView(
            value: Double(question.questionIndex + 1),
            total: Double(flow.totalQuestions)
          )
          .tint(AiPalette.accent)

          // 数字人面试入口（Stub 引擎）
          Button {
            showDigitalHuman = true
          } label: {
            HStack(spacing: 10) {
              Image(systemName: "person.crop.circle.badge.waveform")
                .font(.system(size: 18, weight: .medium))
              Text("切换到数字人面试")
                .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(AiPalette.accent)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(
              RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(AiPalette.accent.opacity(0.6), lineWidth: 1)
                .background(
                  RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(AiPalette.accent.opacity(0.08))
                )
            )
          }
          .buttonStyle(.plain)

          VStack(alignment: .leading, spacing: 10) {
            Text("问题 \(question.questionIndex + 1) / \(flow.totalQuestions)")
              .font(.system(size: 14, weight: .semibold))
              .foregroundStyle(AiPalette.accent)
            Text(question.questionText)
              .font(.system(size: 15))
              .foregroundStyle(AiPalette.textPrimary)
          }
          .padding(14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .fill(AiPalette.cardBackground)
          )

          ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .fill(AiPalette.cardBackground)
            TextEditor(text: $viewModel.answerText)
              .scrollContentBackground(.hidden)
              .padding(8)
              .frame(height: 160)
              .foregroundStyle(AiPalette.textPrimary)
              .tint(AiPalette.accent)
            if viewModel.answerText.isEmpty {
              Text("在此输入你的回答…")
                .font(.system(size: 14))
                .foregroundStyle(AiPalette.textMuted)
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .allowsHitTesting(false)
            }
          }
          .frame(height: 160)

          Button {
            Task { await viewModel.submit(using: appState) }
          } label: {
            HStack {
              if viewModel.isSubmitting {
                ProgressView().tint(.black)
              }
              Text("提交回答")
                .font(.system(size: 15, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(.black)
            .background(Capsule().fill(AiPalette.accent))
          }
          .buttonStyle(.plain)
          .disabled(viewModel.isSubmitting)

          if let status = viewModel.status {
            Text(status)
              .font(.system(size: 12))
              .foregroundStyle(AiPalette.textSecondary)
          }
        }
      }
      .padding(16)
    }
    .sheet(isPresented: $showDigitalHuman) {
      if let flow = viewModel.flowState {
        DigitalHumanInterviewView(flow: flow)
          .environmentObject(appState)
      }
    }
  }
}

// MARK: - 完成态
struct AiInterviewCompleteView: View {
  let status: String

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "checkmark.seal.fill")
        .font(.system(size: 56))
        .foregroundStyle(AiPalette.accent)
      Text("面试已完成")
        .font(.system(size: 22, weight: .bold))
        .foregroundStyle(AiPalette.textPrimary)
      Text(status)
        .font(.system(size: 14))
        .foregroundStyle(AiPalette.textSecondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(40)
  }
}
