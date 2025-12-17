import SwiftUI

@MainActor
final class JobPreferenceViewModel: ObservableObject {
  @Published var categories: [JobDictionaryCategory] = []
  @Published var selected: Set<String> = []
  @Published var isLoading = false
  @Published var isSaving = false
  @Published var message: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      async let dictionaryTask = appState.jobsService.getJobDictionary()
      async let preferenceTask = appState.jobsService.getPreferences()
      categories = try await dictionaryTask
      if let prefs = try? await preferenceTask {
        selected = Set(prefs.positions.map { $0.id })
      }
      message = nil
    } catch {
      self.message = error.localizedDescription
    }
  }

  func toggle(position: JobDictionaryPosition) {
    if selected.contains(position.id) {
      selected.remove(position.id)
    } else {
      selected.insert(position.id)
    }
  }

  func save(using appState: AppState) async {
    guard !isSaving else { return }
    isSaving = true
    defer { isSaving = false }
    do {
      _ = try await appState.jobsService.updatePreferences(positionIds: Array(selected))
      message = "已保存岗位意向"
    } catch {
      message = error.localizedDescription
    }
  }
}

struct JobPreferencesView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel = JobPreferenceViewModel()
  @State private var showLogin = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text("为你匹配心仪岗位，可多选")
            .font(AppFont.body(14))
            .foregroundStyle(AppColor.textSecondary)

          ForEach(viewModel.categories) { category in
            VStack(alignment: .leading, spacing: 10) {
              Text(category.name)
                .font(AppFont.title(16))
              FlowLayout(category.positions) { position in
                let isSelected = viewModel.selected.contains(position.id)
                Button {
                  viewModel.toggle(position: position)
                } label: {
                  Text(position.name)
                    .font(AppFont.body(13))
                    .foregroundStyle(isSelected ? AppColor.accent : AppColor.textPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(isSelected ? AppColor.accent.opacity(0.12) : AppColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))
                }
                .buttonStyle(.plain)
              }
            }
            .padding()
            .background(AppColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
          }

          PrimaryButton(title: "保存意向", isLoading: viewModel.isSaving) {
            guard appState.isLoggedIn else {
              showLogin = true
              return
            }
            Task { await viewModel.save(using: appState) }
          }

          if let message = viewModel.message {
            Text(message)
              .font(AppFont.caption(12))
              .foregroundStyle(message.contains("已") ? AppColor.textSecondary : .red)
          }
        }
        .padding(16)
      }
      .background(AppColor.backgroundGradient.ignoresSafeArea())
      .navigationTitle("岗位偏好")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
      .task { await viewModel.load(using: appState) }
      .refreshable { await viewModel.load(using: appState) }
      .sheet(isPresented: $showLogin) {
        LoginView { data in
          appState.updateAuth(token: data.token, user: data.user)
          showLogin = false
        }
        .environmentObject(appState)
      }
    }
  }
}
