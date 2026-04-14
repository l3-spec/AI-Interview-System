import SwiftUI

@MainActor
final class CircleViewModel: ObservableObject {
  @Published var hotPosts: [UserPost] = []
  @Published var expertPosts: [ExpertPost] = []
  @Published var isLoading = false
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      async let hotTask = appState.contentService.getUserPosts(page: 1, pageSize: 20, isHot: true)
      async let expertTask = appState.contentService.getExpertPosts(page: 1, pageSize: 12)
      hotPosts = try await hotTask.list
      expertPosts = try await expertTask.list
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct CircleView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = CircleViewModel()
  @State private var showCreate = false
  @State private var showMyPosts = false
  @State private var showLogin = false

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        HStack {
          Text("职圈")
            .font(AppFont.title(22))
            .foregroundStyle(AppColor.textPrimary)
          Spacer()
          Button {
            guard appState.isLoggedIn else {
              showLogin = true
              return
            }
            showMyPosts = true
          } label: {
            PillTag("我的", foreground: AppColor.textPrimary, background: AppColor.outline)
          }
          Button {
            guard appState.isLoggedIn else {
              showLogin = true
              return
            }
            showCreate = true
          } label: {
            PillTag("发帖", foreground: AppColor.accent, background: AppColor.accent.opacity(0.16))
          }
        }
        .padding(.horizontal, 16)

        Text("职圈热点")
          .font(AppFont.title(20))
          .foregroundStyle(AppColor.textPrimary)
          .padding(.horizontal, 16)
          .padding(.top, 8)

        LazyVStack(spacing: 12) {
          ForEach(viewModel.hotPosts) { post in
            NavigationLink(value: post.id) {
              UserPostRow(post: post)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, 16)

        Text("大咖分享")
          .font(AppFont.title(20))
          .foregroundStyle(AppColor.textPrimary)
          .padding(.horizontal, 16)

        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 12) {
            ForEach(viewModel.expertPosts) { post in
              NavigationLink(value: post.id) {
                ExpertCard(post: post)
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.horizontal, 16)
          .padding(.bottom, 12)
        }

        if let error = viewModel.error {
          Text(error)
            .foregroundStyle(.red)
            .font(AppFont.caption(12))
            .padding(.horizontal, 16)
        }
      }
      .padding(.bottom, 24)
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .navigationDestination(for: String.self) { id in
      PostDetailView(postId: id)
    }
    .sheet(isPresented: $showCreate) {
      CreatePostView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showMyPosts) {
      MyPostsView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showLogin) {
      LoginView { data in
        appState.updateAuth(token: data.token, user: data.user)
        showLogin = false
      }
      .environmentObject(appState)
    }
    .task {
      await viewModel.load(using: appState)
    }
    .refreshable {
      await viewModel.load(using: appState)
    }
  }
}

private struct ExpertCard: View {
  let post: ExpertPost

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      AsyncImage(url: URL(string: post.coverImage ?? "")) { image in
        image.resizable().scaledToFill()
      } placeholder: {
        Color.gray.opacity(0.2)
      }
      .frame(width: 220, height: 132)
      .clipShape(RoundedRectangle(cornerRadius: 16))

      VStack(alignment: .leading, spacing: 6) {
        Text(post.title)
          .font(AppFont.title(15))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(2)
        Text("\(post.expertName) · \(post.expertCompany)")
          .font(AppFont.caption(12))
          .foregroundStyle(AppColor.textSecondary)
      }
    }
    .frame(width: 220, alignment: .leading)
    .padding(10)
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
  }
}

struct PostDetailView: View {
  @EnvironmentObject private var appState: AppState
  @State private var post: UserPost?
  @State private var expertPost: ExpertPost?
  @State private var isLoading = false
  @State private var error: String?
  let postId: String

  init(postId: String) {
    self.postId = postId
  }

  var body: some View {
    Group {
      if let post {
        ScrollView {
          VStack(alignment: .leading, spacing: 12) {
            Text(post.title)
              .font(AppFont.title(22))
            Text(post.content)
              .font(AppFont.body(15))
              .foregroundStyle(AppColor.textSecondary)
            if !post.images.isEmpty {
              ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                  ForEach(post.images, id: \.self) { image in
                    AsyncImage(url: URL(string: image)) { img in
                      img.resizable().scaledToFill()
                    } placeholder: {
                      Color.gray.opacity(0.2)
                    }
                    .frame(width: 200, height: 140)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                  }
                }
              }
            }
          }
          .padding(16)
        }
      } else if let expertPost {
        ScrollView {
          VStack(alignment: .leading, spacing: 12) {
            Text(expertPost.title)
              .font(AppFont.title(22))
            Text(expertPost.content)
              .font(AppFont.body(15))
              .foregroundStyle(AppColor.textSecondary)
          }
          .padding(16)
        }
      } else if isLoading {
        ProgressView()
      } else {
        Text(error ?? "帖子不存在")
          .foregroundStyle(.red)
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .task {
      await load()
    }
  }

  private func load() async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      if let detail = try? await appState.contentService.getUserPostDetail(id: postId) {
        post = detail
      } else {
        expertPost = try await appState.contentService.getExpertPostDetail(id: postId)
      }
    } catch {
      self.error = error.localizedDescription
    }
  }
}
