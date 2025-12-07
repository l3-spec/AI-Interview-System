import SwiftUI

@MainActor
final class InterviewHistoryViewModel: ObservableObject {
  @Published var sessions: [AiInterviewSessionSummary] = []
  @Published var isLoading = false
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let response = try await appState.aiInterviewService.history()
      sessions = response.sessions ?? []
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct InterviewHistoryView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = InterviewHistoryViewModel()

  var body: some View {
    NavigationStack {
      Group {
        if viewModel.isLoading {
          ProgressView()
        } else {
          List {
            ForEach(viewModel.sessions) { session in
              VStack(alignment: .leading, spacing: 6) {
                Text(session.jobTarget ?? "未命名职位")
                  .font(AppFont.title(16))
                Text("状态: \(session.status ?? "-")")
                  .font(AppFont.caption(12))
                  .foregroundStyle(.secondary)
                if let created = session.createdAt {
                  Text("创建时间 \(created)")
                    .font(AppFont.caption(12))
                    .foregroundStyle(.secondary)
                }
              }
              .padding(.vertical, 6)
            }
          }
          #if os(iOS)
          .listStyle(.insetGrouped)
          #endif
        }
      }
      .navigationTitle("AI 面试记录")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") {
            dismiss()
          }
        }
      }
      .task {
        await viewModel.load(using: appState)
      }
      .refreshable {
        await viewModel.load(using: appState)
      }
    }
  }

  @Environment(\.dismiss) private var dismiss
}
