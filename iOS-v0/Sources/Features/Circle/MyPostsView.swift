import SwiftUI

@MainActor
final class MyPostsViewModel: ObservableObject {
  @Published var posts: [UserPost] = []
  @Published var isLoading = false
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      posts = try await appState.contentService.getMyPosts().list
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct MyPostsView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel = MyPostsViewModel()
  @State private var showLogin = false

  var body: some View {
    NavigationStack {
      Group {
        if viewModel.isLoading {
          ProgressView()
        } else {
          List {
            ForEach(viewModel.posts) { post in
              NavigationLink(destination: PostDetailView(postId: post.id)) {
                VStack(alignment: .leading, spacing: 6) {
                  Text(post.title)
                    .font(AppFont.title(15))
                  Text(post.content)
                    .font(AppFont.body(13))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                }
                .padding(.vertical, 4)
              }
            }
          }
          #if os(iOS)
          .listStyle(.insetGrouped)
          #endif
        }
      }
      .navigationTitle("我的帖子")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
      .task {
        if appState.isLoggedIn {
          await viewModel.load(using: appState)
        } else {
          showLogin = true
        }
      }
      .refreshable {
        guard appState.isLoggedIn else { return }
        await viewModel.load(using: appState)
      }
      .sheet(isPresented: $showLogin) {
        LoginView { data in
          appState.updateAuth(token: data.token, user: data.user)
          Task { await viewModel.load(using: appState) }
          showLogin = false
        }
        .environmentObject(appState)
      }
    }
  }
}
