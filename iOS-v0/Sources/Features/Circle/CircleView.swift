import SwiftUI

// MARK: - 职圈聚合卡片
/// 将 UserPost / ExpertPost 统一抽象为可在瀑布流中混排的卡片
struct CircleCard: Identifiable, Hashable {
  let id: String
  let title: String
  let coverImage: String?
  let tags: [String]
  let authorName: String
  let authorAvatar: String?
  let viewCount: Int
  let isExpert: Bool
  let summary: String

  static func from(userPost p: UserPost) -> CircleCard {
    CircleCard(
      id: p.id,
      title: p.title,
      coverImage: p.coverImage ?? p.images?.first,
      tags: p.tags,
      authorName: p.author?.name ?? "匿名",
      authorAvatar: p.author?.avatar,
      viewCount: p.viewCount,
      isExpert: false,
      summary: p.content
    )
  }

  static func from(expertPost e: ExpertPost) -> CircleCard {
    CircleCard(
      id: e.id,
      title: e.title,
      coverImage: e.coverImage,
      tags: e.tags,
      authorName: e.expertName,
      authorAvatar: e.expertAvatar,
      viewCount: e.viewCount,
      isExpert: true,
      summary: e.content
    )
  }
}

// MARK: - ViewModel
@MainActor
final class CircleViewModel: ObservableObject {
  @Published var banners: [Banner] = []
  @Published var currentBannerIndex: Int = 0
  @Published var cards: [CircleCard] = []
  @Published var isLoading: Bool = false
  @Published var isAppending: Bool = false
  @Published var hasMore: Bool = true
  @Published var error: String?

  private var userPage: Int = 0
  private var expertPage: Int = 0
  private var userHasMore: Bool = true
  private var expertHasMore: Bool = true
  private let pageSize: Int = 20
  private var bannerTimerTask: Task<Void, Never>?

  deinit {
    bannerTimerTask?.cancel()
  }

  func refresh(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    error = nil
    defer { isLoading = false }

    userPage = 0
    expertPage = 0
    userHasMore = true
    expertHasMore = true
    cards = []

    do {
      async let bannersTask = appState.contentService.getCircleBanners()
      async let firstUser = appState.contentService.getUserPosts(page: 1, pageSize: pageSize, isHot: true)
      async let firstExpert = appState.contentService.getExpertPosts(page: 1, pageSize: pageSize / 2)

      let bannersResult = (try? await bannersTask) ?? []
      let userResult = try await firstUser
      let expertResult = try await firstExpert

      banners = bannersResult
      let userCards = userResult.list.map { CircleCard.from(userPost: $0) }
      let expertCards = expertResult.list.map { CircleCard.from(expertPost: $0) }
      cards = interleave(user: userCards, expert: expertCards)
      userPage = userResult.page
      expertPage = expertResult.page
      userHasMore = userResult.hasMore
      expertHasMore = expertResult.hasMore
      hasMore = userHasMore || expertHasMore

      startBannerAutoScrollIfNeeded()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func loadMore(using appState: AppState) async {
    guard hasMore, !isLoading, !isAppending else { return }
    isAppending = true
    defer { isAppending = false }

    var newCards: [CircleCard] = []
    do {
      if userHasMore {
        let next = try await appState.contentService.getUserPosts(
          page: userPage + 1,
          pageSize: pageSize,
          isHot: true
        )
        newCards.append(contentsOf: next.list.map { CircleCard.from(userPost: $0) })
        userPage = next.page
        userHasMore = next.hasMore
      }
      if expertHasMore {
        let next = try await appState.contentService.getExpertPosts(
          page: expertPage + 1,
          pageSize: pageSize / 2
        )
        newCards.append(contentsOf: next.list.map { CircleCard.from(expertPost: $0) })
        expertPage = next.page
        expertHasMore = next.hasMore
      }
      // 简单去重 + 追加
      var seen = Set(cards.map { $0.id })
      let dedup = newCards.filter { seen.insert($0.id).inserted }
      cards.append(contentsOf: dedup)
      hasMore = userHasMore || expertHasMore
    } catch {
      self.error = error.localizedDescription
    }
  }

  private func interleave(user: [CircleCard], expert: [CircleCard]) -> [CircleCard] {
    // 大致每 4 条 user 插入 1 条 expert
    var result: [CircleCard] = []
    var ui = 0, ei = 0
    while ui < user.count || ei < expert.count {
      for _ in 0..<4 where ui < user.count {
        result.append(user[ui])
        ui += 1
      }
      if ei < expert.count {
        result.append(expert[ei])
        ei += 1
      }
    }
    return result
  }

  private func startBannerAutoScrollIfNeeded() {
    guard bannerTimerTask == nil, !banners.isEmpty else { return }
    bannerTimerTask = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        await MainActor.run {
          guard let self = self, !self.banners.isEmpty else { return }
          self.currentBannerIndex = (self.currentBannerIndex + 1) % self.banners.count
        }
      }
    }
  }

  func stopBannerAutoScroll() {
    bannerTimerTask?.cancel()
    bannerTimerTask = nil
  }
}

// MARK: - 主视图
struct CircleView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = CircleViewModel()
  @State private var showCreate = false
  @State private var showMyPosts = false
  @State private var showLogin = false

  var body: some View {
    ZStack(alignment: .top) {
      backgroundLayer.ignoresSafeArea()

      ScrollView(showsIndicators: false) {
        VStack(spacing: 12) {
          Spacer().frame(height: 64)

          if !viewModel.banners.isEmpty {
            bannerCarousel
              .padding(.horizontal, 12)
          }

          if viewModel.isLoading && viewModel.cards.isEmpty {
            ProgressView().tint(AppColor.primaryOrange).padding(.top, 64)
          } else if viewModel.cards.isEmpty {
            emptyState
          } else {
            WaterfallGrid(items: viewModel.cards) { card in
              NavigationLink(value: DetailRoute.postDetail(card.id)) {
                CircleCardView(card: card)
              }
              .buttonStyle(.plain)
              .onAppear { handleAppear(card) }
            }
            .padding(.horizontal, 12)
          }

          if viewModel.isAppending {
            ProgressView().tint(AppColor.primaryOrange).padding(.vertical, 16)
          } else if !viewModel.hasMore && !viewModel.cards.isEmpty {
            Text("已经到底啦")
              .font(.system(size: 12))
              .foregroundStyle(AppColor.textTertiary)
              .padding(.vertical, 16)
          }

          if let error = viewModel.error {
            Text(error)
              .font(.system(size: 12))
              .foregroundStyle(.red)
              .padding(.vertical, 8)
          }

          Spacer().frame(height: 60)
        }
      }
      .refreshable { await viewModel.refresh(using: appState) }

      topHeader
    }
    .navigationDestination(for: String.self) { id in
      PostDetailView(postId: id)
    }
    .navigationDestination(for: DetailRoute.self) { route in
      switch route {
      case .postDetail(let id):
        PostDetailView(postId: id).environmentObject(appState)
      case .jobDetail(let id):
        JobDetailView(jobId: id).environmentObject(appState)
      case .company(let id):
        CompanyDetailView(companyId: id).environmentObject(appState)
      }
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
      if viewModel.cards.isEmpty {
        await viewModel.refresh(using: appState)
      }
    }
    .onDisappear { viewModel.stopBannerAutoScroll() }
  }

  // MARK: - 背景渐变
  private var backgroundLayer: some View {
    ZStack {
      Color(hex: 0xF4F5F6)
      LinearGradient(
        colors: [Color(hex: 0x00ACC3), Color(hex: 0xE9F7F9)],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(maxHeight: 520)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
  }

  // MARK: - 顶部标题栏（标题 + 我的 + 发帖）
  private var topHeader: some View {
    HStack {
      Text("职圈")
        .font(.system(size: 22, weight: .semibold, design: .rounded))
        .foregroundStyle(Color.black)
      Spacer()
      Button {
        guard appState.isLoggedIn else { showLogin = true; return }
        showMyPosts = true
      } label: {
        Text("我的")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(AppColor.textPrimary)
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
          .background(Capsule().fill(Color.white.opacity(0.85)))
      }
      .buttonStyle(.plain)
      Button {
        guard appState.isLoggedIn else { showLogin = true; return }
        showCreate = true
      } label: {
        HStack(spacing: 4) {
          Image(systemName: "square.and.pencil")
            .font(.system(size: 12, weight: .semibold))
          Text("发帖")
            .font(.system(size: 13, weight: .semibold))
        }
        .foregroundStyle(Color.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
        .background(Capsule().fill(AppColor.primaryOrange))
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }

  // MARK: - 轮播
  private var bannerCarousel: some View {
    TabView(selection: $viewModel.currentBannerIndex) {
      ForEach(Array(viewModel.banners.enumerated()), id: \.element.id) { idx, banner in
        ZStack(alignment: .bottomLeading) {
          AsyncImage(url: URL(string: banner.imageUrl)) { image in
            image.resizable().scaledToFill()
          } placeholder: {
            LinearGradient(
              colors: [AppColor.primaryBlue.opacity(0.4), AppColor.primaryOrange.opacity(0.4)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          }
          LinearGradient(colors: [.black.opacity(0.45), .clear], startPoint: .bottom, endPoint: .top)
          VStack(alignment: .leading, spacing: 2) {
            Text(banner.title)
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(.white)
            Text(banner.subtitle)
              .font(.system(size: 11))
              .foregroundStyle(.white.opacity(0.9))
          }
          .padding(12)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .tag(idx)
      }
    }
#if os(iOS)
    .tabViewStyle(.page(indexDisplayMode: .automatic))
#endif
    .frame(height: 150)
  }

  private var emptyState: some View {
    VStack(spacing: 12) {
      Image(systemName: "bubble.left.and.bubble.right")
        .font(.system(size: 40))
        .foregroundStyle(AppColor.textTertiary)
      Text("暂无内容")
        .font(.system(size: 14))
        .foregroundStyle(AppColor.textSecondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
  }

  private func handleCardTap(_ card: CircleCard) {
    appState.updateRoute(.postDetail(card.id))
  }

  private func handleAppear(_ card: CircleCard) {
    guard let idx = viewModel.cards.firstIndex(where: { $0.id == card.id }) else { return }
    if idx >= viewModel.cards.count - 4 {
      Task { await viewModel.loadMore(using: appState) }
    }
  }
}

// MARK: - 单卡片
struct CircleCardView: View {
  let card: CircleCard

  // 通过 id 哈希分配封面高度
  private var coverHeight: CGFloat {
    let h = abs(card.id.hashValue) % 3
    return [220, 180, 160][h]
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      coverArea
      VStack(alignment: .leading, spacing: 6) {
        if card.isExpert {
          HStack(spacing: 4) {
            Image(systemName: "star.fill")
              .font(.system(size: 10))
              .foregroundStyle(AppColor.primaryOrange)
            Text("大咖")
              .font(.system(size: 10, weight: .semibold))
              .foregroundStyle(AppColor.primaryOrange)
          }
        }
        Text(card.title)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(2)
        HStack(spacing: 4) {
          Circle()
            .fill(AppColor.primaryBlue.opacity(0.2))
            .frame(width: 16, height: 16)
            .overlay(
              Group {
                if let avatar = card.authorAvatar, let url = URL(string: avatar) {
                  AsyncImage(url: url) { img in
                    img.resizable().scaledToFill()
                  } placeholder: {
                    EmptyView()
                  }
                  .frame(width: 16, height: 16)
                  .clipShape(Circle())
                } else {
                  Text(card.authorName.prefix(1))
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(AppColor.primaryBlue)
                }
              }
            )
          Text(card.authorName)
            .font(.system(size: 11))
            .foregroundStyle(AppColor.textSecondary)
            .lineLimit(1)
          Spacer()
          Image(systemName: "eye")
            .font(.system(size: 10))
            .foregroundStyle(AppColor.textTertiary)
          Text("\(card.viewCount)")
            .font(.system(size: 10))
            .foregroundStyle(AppColor.textTertiary)
        }
      }
      .padding(.horizontal, 10)
      .padding(.bottom, 10)
    }
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xE6E8EB), lineWidth: 1))
  }

  @ViewBuilder
  private var coverArea: some View {
    if let cover = card.coverImage, !cover.isEmpty, let url = URL(string: cover) {
      AsyncImage(url: url) { phase in
        switch phase {
        case .success(let image):
          image.resizable().aspectRatio(contentMode: .fill)
        default:
          gradientFallback
        }
      }
      .frame(height: coverHeight)
      .frame(maxWidth: .infinity)
      .clipped()
      .clipShape(
        UnevenRoundedRectangle(
          topLeadingRadius: 12,
          bottomLeadingRadius: 0,
          bottomTrailingRadius: 0,
          topTrailingRadius: 12
        )
      )
    } else {
      gradientFallback
        .frame(height: coverHeight)
        .clipShape(
          UnevenRoundedRectangle(
            topLeadingRadius: 12,
            bottomLeadingRadius: 0,
            bottomTrailingRadius: 0,
            topTrailingRadius: 12
          )
        )
        .overlay(
          Text(card.title.prefix(8))
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
        )
    }
  }

  private var gradientFallback: some View {
    let palettes: [[Color]] = [
      [Color(hex: 0xFFB199), Color(hex: 0xFF0844)],
      [Color(hex: 0x42E695), Color(hex: 0x3BB2B8)],
      [Color(hex: 0x6A85B6), Color(hex: 0xBAC8E0)],
      [Color(hex: 0xF093FB), Color(hex: 0xF5576C)],
      [Color(hex: 0x4FACFE), Color(hex: 0x00F2FE)]
    ]
    let palette = palettes[abs(card.id.hashValue) % palettes.count]
    return LinearGradient(colors: palette, startPoint: .topLeading, endPoint: .bottomTrailing)
  }
}

// MARK: - 帖子详情（保留早期实现，结合用户帖与大咖帖）
struct PostDetailView: View {
  @EnvironmentObject private var appState: AppState
  @State private var post: UserPost?
  @State private var expertPost: ExpertPost?
  @State private var isLoading = false
  @State private var error: String?
  let postId: String

  var body: some View {
    Group {
      if let post {
        userPostBody(post)
      } else if let expertPost {
        expertPostBody(expertPost)
      } else if isLoading {
        ProgressView().tint(AppColor.primaryOrange)
      } else {
        Text(error ?? "帖子不存在")
          .foregroundStyle(.red)
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .task { await load() }
  }

  private func userPostBody(_ post: UserPost) -> some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        Text(post.title)
          .font(.system(size: 22, weight: .semibold, design: .rounded))
          .foregroundStyle(AppColor.textPrimary)
        if let author = post.author {
          HStack(spacing: 8) {
            Circle()
              .fill(AppColor.primaryBlue.opacity(0.2))
              .frame(width: 28, height: 28)
              .overlay(Text((author.name ?? "?").prefix(1)).font(.system(size: 12, weight: .semibold)))
            VStack(alignment: .leading, spacing: 2) {
              Text(author.name ?? "匿名")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(AppColor.textPrimary)
              if let head = author.headline {
                Text(head)
                  .font(.system(size: 11))
                  .foregroundStyle(AppColor.textTertiary)
              }
            }
          }
        }
        Text(post.content)
          .font(.system(size: 15))
          .foregroundStyle(AppColor.textSecondary)
          .lineSpacing(4)
        if let images = post.images, !images.isEmpty {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack {
              ForEach(images, id: \.self) { url in
                AsyncImage(url: URL(string: url)) { image in
                  image.resizable().scaledToFill()
                } placeholder: {
                  Color.gray.opacity(0.2)
                }
                .frame(width: 220, height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 12))
              }
            }
          }
        }
        if !post.tags.isEmpty {
          HStack(spacing: 6) {
            ForEach(post.tags.prefix(6), id: \.self) { tag in
              Text("#\(tag)")
                .font(.system(size: 11))
                .foregroundStyle(AppColor.primaryBlue)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(AppColor.primaryBlue.opacity(0.12)))
            }
          }
        }
        statsBar(views: post.viewCount, likes: post.likeCount, comments: post.commentCount)
      }
      .padding(16)
    }
  }

  private func expertPostBody(_ post: ExpertPost) -> some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        if let cover = post.coverImage, let url = URL(string: cover) {
          AsyncImage(url: url) { image in
            image.resizable().aspectRatio(contentMode: .fill)
          } placeholder: {
            Color.gray.opacity(0.2)
          }
          .frame(height: 180)
          .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        Text(post.title)
          .font(.system(size: 22, weight: .semibold, design: .rounded))
        HStack(spacing: 8) {
          Circle()
            .fill(AppColor.primaryOrange.opacity(0.2))
            .frame(width: 36, height: 36)
            .overlay(Text(post.expertName.prefix(1)).font(.system(size: 14, weight: .semibold)))
          VStack(alignment: .leading, spacing: 2) {
            Text(post.expertName)
              .font(.system(size: 14, weight: .semibold))
            Text("\(post.expertTitle) · \(post.expertCompany)")
              .font(.system(size: 12))
              .foregroundStyle(AppColor.textTertiary)
          }
        }
        Text(post.content)
          .font(.system(size: 15))
          .foregroundStyle(AppColor.textSecondary)
          .lineSpacing(4)
        statsBar(views: post.viewCount, likes: post.likeCount, comments: post.commentCount ?? 0)
      }
      .padding(16)
    }
  }

  private func statsBar(views: Int, likes: Int, comments: Int) -> some View {
    HStack(spacing: 16) {
      Label("\(views)", systemImage: "eye")
      Label("\(likes)", systemImage: "hand.thumbsup")
      Label("\(comments)", systemImage: "bubble.right")
    }
    .font(.system(size: 12))
    .foregroundStyle(AppColor.textTertiary)
    .padding(.top, 4)
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
