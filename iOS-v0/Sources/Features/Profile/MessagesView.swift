import SwiftUI

@MainActor
final class MessagesViewModel: ObservableObject {
  @Published var messages: [MessageSummary] = []
  @Published var isLoading = false
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let response = try await appState.messagingService.getMessages()
      messages = response.list
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct MessagesView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = MessagesViewModel()
  @State private var selectedId: String?

  var body: some View {
    NavigationStack {
      List {
        ForEach(viewModel.messages) { message in
          NavigationLink(destination: MessageDetailView(messageId: message.id), tag: message.id, selection: $selectedId) {
            VStack(alignment: .leading, spacing: 6) {
              Text(message.title)
                .font(AppFont.title(15))
              Text(message.summary ?? "")
                .font(AppFont.body(13))
                .foregroundStyle(.secondary)
            }
            .padding(.vertical, 6)
          }
        }
      }
      .navigationTitle("消息中心")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
      .task { await viewModel.load(using: appState) }
      .refreshable { await viewModel.load(using: appState) }
    }
  }

  @Environment(\.dismiss) private var dismiss
}

struct MessageDetailView: View {
  @EnvironmentObject private var appState: AppState
  @State private var detail: MessageDetail?
  @State private var isLoading = false
  @State private var error: String?
  let messageId: String

  var body: some View {
    Group {
      if let detail {
        List {
          Section(detail.title) {
            ForEach(detail.entries) { entry in
              VStack(alignment: .leading, spacing: 6) {
                Text(entry.content)
                  .font(AppFont.body(14))
                Text(entry.createdAt)
                  .font(AppFont.caption(12))
                  .foregroundStyle(.secondary)
              }
            }
          }
        }
      } else if isLoading {
        ProgressView()
      } else {
        Text(error ?? "无法加载消息")
      }
    }
    .navigationTitle("消息详情")
    .task { await load() }
  }

  private func load() async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      detail = try await appState.messagingService.getMessageDetail(id: messageId)
    } catch {
      self.error = error.localizedDescription
    }
  }
}
