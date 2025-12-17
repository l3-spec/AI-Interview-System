import SwiftUI

@MainActor
final class AssessmentHomeViewModel: ObservableObject {
  @Published var categories: [AssessmentCategory] = []
  @Published var isLoading = false
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      categories = try await appState.assessmentService.getCategories()
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct AssessmentsView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = AssessmentHomeViewModel()

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          header

          if viewModel.isLoading && viewModel.categories.isEmpty {
            ProgressView().frame(maxWidth: .infinity, alignment: .center)
          }

          ForEach(viewModel.categories) { category in
            NavigationLink {
              AssessmentListView(category: category)
            } label: {
              AssessmentCategoryCard(category: category)
            }
            .buttonStyle(.plain)
          }

          if let error = viewModel.error {
            Text(error)
              .font(AppFont.caption(12))
              .foregroundStyle(.red)
              .padding(.top, 8)
          }
        }
        .padding(16)
      }
      .background(AppColor.backgroundGradient.ignoresSafeArea())
      .navigationTitle("测评中心")
      .task { await viewModel.load(using: appState) }
      .refreshable { await viewModel.load(using: appState) }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("测评库")
        .font(AppFont.title(22))
      Text("行业通用、岗位专项测评，一键开启练习与打分。")
        .font(AppFont.body(14))
        .foregroundStyle(AppColor.textSecondary)
    }
  }
}

private struct AssessmentCategoryCard: View {
  let category: AssessmentCategory

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text(category.name)
          .font(AppFont.title(17))
          .foregroundStyle(AppColor.textPrimary)
        Spacer()
        if let icon = category.icon, !icon.isEmpty {
          Text(icon)
            .font(AppFont.title(16))
        }
      }
      if let description = category.description, !description.isEmpty {
        Text(description)
          .font(AppFont.body(13))
          .foregroundStyle(AppColor.textSecondary)
      }
      if !category.assessments.orEmpty.isEmpty {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 8) {
            ForEach(category.assessments.orEmpty.prefix(3)) { item in
              PillTag(item.title, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
            }
          }
        }
      }
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
  }
}

@MainActor
final class AssessmentListViewModel: ObservableObject {
  @Published var assessments: [Assessment] = []
  @Published var isLoading = false
  @Published var error: String?
  private let categoryId: String

  init(categoryId: String) {
    self.categoryId = categoryId
  }

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      assessments = try await appState.assessmentService.getAssessments(categoryId: categoryId).list
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct AssessmentListView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel: AssessmentListViewModel
  let category: AssessmentCategory

  init(category: AssessmentCategory) {
    self.category = category
    _viewModel = StateObject(wrappedValue: AssessmentListViewModel(categoryId: category.id))
  }

  var body: some View {
    List {
      ForEach(viewModel.assessments) { assessment in
        NavigationLink {
          AssessmentDetailView(assessment: assessment)
        } label: {
          VStack(alignment: .leading, spacing: 6) {
            Text(assessment.title)
              .font(AppFont.title(16))
            if let desc = assessment.description {
              Text(desc)
                .font(AppFont.body(13))
                .foregroundStyle(.secondary)
                .lineLimit(2)
            }
            HStack(spacing: 8) {
              PillTag("\(assessment.durationMinutes)分钟", foreground: AppColor.textSecondary, background: AppColor.outline)
              PillTag("难度 \(assessment.difficulty)", foreground: AppColor.textSecondary, background: AppColor.outline)
              PillTag("题目 \(assessment.questionCount ?? 0)", foreground: AppColor.textSecondary, background: AppColor.outline)
            }
          }
          .padding(.vertical, 6)
        }
      }
    }
    .navigationTitle(category.name)
    .task { await viewModel.load(using: appState) }
    .refreshable { await viewModel.load(using: appState) }
    .overlay {
      if viewModel.isLoading {
        ProgressView()
      }
    }
  }
}

@MainActor
final class AssessmentDetailViewModel: ObservableObject {
  @Published var detail: AssessmentDetail?
  @Published var isLoading = false
  @Published var error: String?
  private let id: String
  private let fallback: Assessment?

  init(id: String, fallback: Assessment?) {
    self.id = id
    self.fallback = fallback
    self.detail = fallback.map { AssessmentDetail(id: $0.id, title: $0.title, description: $0.description, coverImage: $0.coverImage, durationMinutes: $0.durationMinutes, difficulty: $0.difficulty, participantCount: $0.participantCount, rating: $0.rating, tags: $0.tags, guidelines: $0.guidelines, category: $0.category, questions: []) }
  }

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      detail = try await appState.assessmentService.getAssessmentDetail(id: id)
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct AssessmentDetailView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel: AssessmentDetailViewModel
  @State private var showTake = false

  init(assessment: Assessment) {
    _viewModel = StateObject(wrappedValue: AssessmentDetailViewModel(id: assessment.id, fallback: assessment))
  }

  var body: some View {
    ScrollView {
      if let detail = viewModel.detail {
        VStack(alignment: .leading, spacing: 12) {
          Text(detail.title)
            .font(AppFont.title(22))
          if let desc = detail.description {
            Text(desc)
              .font(AppFont.body(14))
              .foregroundStyle(AppColor.textSecondary)
          }
          HStack(spacing: 8) {
            PillTag("\(detail.durationMinutes)分钟", foreground: AppColor.textSecondary, background: AppColor.outline)
            PillTag("难度 \(detail.difficulty)", foreground: AppColor.textSecondary, background: AppColor.outline)
            PillTag("参与 \(detail.participantCount)", foreground: AppColor.textSecondary, background: AppColor.outline)
          }
          if !detail.tags.isEmpty {
            FlowLayout(detail.tags) { tag in
              PillTag(tag, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
            }
          }
          if !detail.guidelines.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
              Text("答题指南")
                .font(AppFont.title(16))
              ForEach(detail.guidelines, id: \.self) { guideline in
                HStack(alignment: .top, spacing: 6) {
                  Circle().fill(AppColor.accent).frame(width: 6, height: 6)
                  Text(guideline)
                    .font(AppFont.body(14))
                    .foregroundStyle(AppColor.textSecondary)
                }
              }
            }
          }
          PrimaryButton(title: "开始测评") {
            showTake = true
          }
        }
        .padding(16)
      } else if viewModel.isLoading {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      } else if let error = viewModel.error {
        Text(error)
          .foregroundStyle(.red)
          .padding()
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .navigationTitle("测评详情")
    .task { await viewModel.load(using: appState) }
    .sheet(isPresented: $showTake) {
      if let detail = viewModel.detail {
        AssessmentTakeView(detail: detail)
          .environmentObject(appState)
      }
    }
  }
}

@MainActor
final class AssessmentTakeViewModel: ObservableObject {
  @Published var selections: [String: Set<String>] = [:]
  @Published var isSubmitting = false
  @Published var error: String?
  @Published var result: AssessmentResult?
  let detail: AssessmentDetail
  private let startedAt = Date()

  init(detail: AssessmentDetail) {
    self.detail = detail
  }

  func toggle(question: AssessmentQuestion, option: QuestionOption) {
    let key = question.id
    var set = selections[key, default: []]
    if question.questionType.uppercased().contains("MULTI") {
      if set.contains(option.label) {
        set.remove(option.label)
      } else {
        set.insert(option.label)
      }
    } else {
      set = [option.label]
    }
    selections[key] = set
  }

  func submit(using appState: AppState) async {
    guard !isSubmitting else { return }
    guard let userId = appState.currentUser?.id else {
      error = "请先登录后再提交测评"
      return
    }
    isSubmitting = true
    defer { isSubmitting = false }
    do {
      let answers = detail.questions.map { question in
        UserAnswer(
          questionId: question.id,
          answer: Array(selections[question.id] ?? [])
        )
      }
      let duration = Int(Date().timeIntervalSince(startedAt))
      let payload = SubmitAssessmentRequest(userId: userId, answers: answers, duration: duration)
      result = try await appState.assessmentService.submitAssessment(id: detail.id, request: payload)
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct AssessmentTakeView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel: AssessmentTakeViewModel
  @State private var showLogin = false

  init(detail: AssessmentDetail) {
    _viewModel = StateObject(wrappedValue: AssessmentTakeViewModel(detail: detail))
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          ForEach(viewModel.detail.questions.indices, id: \.self) { idx in
            let question = viewModel.detail.questions[idx]
            VStack(alignment: .leading, spacing: 10) {
              Text("Q\(idx + 1). \(question.questionText)")
                .font(AppFont.title(16))
              VStack(alignment: .leading, spacing: 8) {
                ForEach(question.options, id: \.label) { option in
                  let isSelected = viewModel.selections[question.id, default: []].contains(option.label)
                  Button {
                    viewModel.toggle(question: question, option: option)
                  } label: {
                    HStack {
                      Text(option.label)
                        .font(AppFont.body(14))
                        .foregroundStyle(isSelected ? AppColor.accent : AppColor.textPrimary)
                      Spacer()
                      if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                          .foregroundStyle(AppColor.accent)
                      }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(isSelected ? AppColor.accent.opacity(0.12) : AppColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))
                  }
                  .buttonStyle(.plain)
                }
              }
            }
            .padding()
            .background(AppColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppColor.outline, lineWidth: 1))
          }

          PrimaryButton(title: "提交测评", isLoading: viewModel.isSubmitting) {
            if !appState.isLoggedIn {
              showLogin = true
              return
            }
            Task { await viewModel.submit(using: appState) }
          }

          if let error = viewModel.error {
            Text(error)
              .font(AppFont.caption(12))
              .foregroundStyle(.red)
          }
        }
        .padding(16)
      }
      .background(AppColor.backgroundGradient.ignoresSafeArea())
      .navigationTitle("答题")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
      .sheet(isPresented: $showLogin) {
        LoginView { data in
          appState.updateAuth(token: data.token, user: data.user)
          showLogin = false
        }
        .environmentObject(appState)
      }
      .sheet(item: Binding(
        get: { viewModel.result.map { IdentifiedResult(result: $0) } },
        set: { viewModel.result = $0?.result }
      )) { wrapped in
        AssessmentResultView(result: wrapped.result, detail: viewModel.detail) {
          dismiss()
        }
      }
    }
  }
}

private struct IdentifiedResult: Identifiable {
  let id = UUID()
  let result: AssessmentResult
}

struct AssessmentResultView: View {
  let result: AssessmentResult
  let detail: AssessmentDetail
  var onClose: (() -> Void)?

  var body: some View {
    NavigationStack {
      VStack(spacing: 14) {
        Text("测评完成")
          .font(AppFont.title(22))
        Text(detail.title)
          .font(AppFont.body(14))
          .foregroundStyle(AppColor.textSecondary)
        HStack(spacing: 12) {
          scoreItem("得分", value: "\(result.totalScore)/\(result.maxScore)")
          scoreItem("等级", value: result.resultLevel)
          scoreItem("百分位", value: "\(result.percentage)%")
        }
        Spacer()
      }
      .padding(20)
      .background(AppColor.backgroundGradient.ignoresSafeArea())
      .navigationTitle("结果")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { onClose?() }
        }
      }
    }
  }

  private func scoreItem(_ title: String, value: String) -> some View {
    VStack {
      Text(title)
        .font(AppFont.body(13))
        .foregroundStyle(AppColor.textSecondary)
      Text(value)
        .font(AppFont.title(18))
        .foregroundStyle(AppColor.textPrimary)
    }
    .padding()
    .frame(maxWidth: .infinity)
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))
  }
}

private extension Optional where Wrapped == [Assessment] {
  var orEmpty: [Assessment] { self ?? [] }
}
