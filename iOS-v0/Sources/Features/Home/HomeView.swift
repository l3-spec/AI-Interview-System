import SwiftUI

/// 首页 ViewModel - 对齐 Android `HomeViewModel`
/// 负责：Banner 加载、瀑布流内容加载、分页加载更多、Banner 自动轮播
@MainActor
final class HomeViewModel: ObservableObject {
  @Published var banners: [Banner] = []
  @Published var currentBannerIndex: Int = 0
  @Published var cards: [HomeFeedItem] = []
  @Published var isLoading: Bool = false
  @Published var isLoadingMore: Bool = false
  @Published var hasMore: Bool = true
  @Published var error: String?

  private var currentPage: Int = 1
  private let pageSize: Int = 12
  private var bannerTimerTask: Task<Void, Never>?

  func refresh(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    error = nil
    defer { isLoading = false }

    currentPage = 1
    do {
      async let bannersTask = appState.contentService.getBanners()
      async let feedTask = appState.contentService.getHomeFeed(page: 1, pageSize: pageSize)
      let bannerList = try await bannersTask
      let feed = try await feedTask
      banners = bannerList
      cards = feed.list
      hasMore = feed.hasMore
      currentPage = feed.page
      if bannerTimerTask == nil && !bannerList.isEmpty {
        startBannerAutoScroll()
      }
    } catch {
      self.error = error.localizedDescription
    }
  }

  func loadMore(using appState: AppState) async {
    guard hasMore, !isLoadingMore else { return }
    isLoadingMore = true
    defer { isLoadingMore = false }
    do {
      let next = currentPage + 1
      let feed = try await appState.contentService.getHomeFeed(page: next, pageSize: pageSize)
      cards.append(contentsOf: feed.list)
      hasMore = feed.hasMore
      currentPage = feed.page
    } catch {
      self.error = error.localizedDescription
    }
  }

  /// 启动 Banner 自动轮播 - 每 3 秒切换一次
  private func startBannerAutoScroll() {
    bannerTimerTask?.cancel()
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

/// 首页 - 对齐 Android `HomeScreen`
/// 顶部渐变 + 固定搜索栏 + Banner 轮播 + 瀑布流内容 + 下拉刷新 + 上拉加载更多
struct HomeView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = HomeViewModel()
  @State private var searchText: String = ""
  @State private var showAi: Bool = false

  var body: some View {
    ZStack(alignment: .top) {
      // 顶部蓝色渐变 + 浅底色
      backgroundLayer
        .ignoresSafeArea()

      ScrollView(showsIndicators: false) {
        VStack(spacing: 8) {
          // 顶部占位，让内容从搜索栏下方开始
          Spacer().frame(height: 76)

          // Banner 轮播
          if !viewModel.banners.isEmpty {
            bannerCarousel
              .padding(.horizontal, 12)
          }

          // 瀑布流内容卡片
          if !viewModel.cards.isEmpty {
            WaterfallGrid(items: viewModel.cards) { card in
              NavigationLink(value: detailRoute(for: card)) {
                HomeFeedCard(item: card)
              }
              .buttonStyle(.plain)
              .onAppear { handleAppear(card) }
            }
            .padding(.horizontal, 12)
            .padding(.top, 4)
          } else if viewModel.isLoading {
            ProgressView()
              .padding(.top, 64)
          }

          // 底部加载指示器
          if viewModel.isLoadingMore {
            ProgressView()
              .padding(.vertical, 16)
          } else if !viewModel.hasMore && !viewModel.cards.isEmpty {
            Text("没有更多内容了")
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

          Spacer().frame(height: 40)
        }
      }
      .refreshable {
        await viewModel.refresh(using: appState)
      }

      // 固定顶部搜索栏
      searchHeader
    }
    .task {
      if viewModel.cards.isEmpty {
        await viewModel.refresh(using: appState)
      }
    }
    .onDisappear { viewModel.stopBannerAutoScroll() }
    .sheet(isPresented: $showAi) {
      AiInterviewEntryView()
        .environmentObject(appState)
    }
    .navigationDestination(for: DetailRoute.self) { route in
      switch route {
      case .jobDetail(let id):
        JobDetailView(jobId: id).environmentObject(appState)
      case .postDetail(let id):
        PostDetailView(postId: id).environmentObject(appState)
      case .company(let id):
        CompanyDetailView(companyId: id).environmentObject(appState)
      }
    }
  }

  // MARK: - 背景渐变

  private var backgroundLayer: some View {
    ZStack {
      Color(hex: 0xEBEBEB)
      LinearGradient(
        colors: [Color(hex: 0x00ADC1), Color(hex: 0xE3F4FB)],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(maxHeight: 520)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
  }

  // MARK: - 搜索栏

  private var searchHeader: some View {
    HStack(spacing: 12) {
      HStack(spacing: 8) {
        Image(systemName: "magnifyingglass")
          .foregroundStyle(AppColor.textSecondary)
        TextField("搜索岗位/关键词", text: $searchText)
          .font(.system(size: 14))
          .onSubmit {
            appState.sharedJobKeyword = searchText
            appState.selectedTab = .jobs
          }
        if !searchText.isEmpty {
          Button { searchText = "" } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundStyle(AppColor.textTertiary)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 14)
      .frame(height: 40)
      .background(
        Capsule().fill(Color.white.opacity(0.95))
      )

      Button {
        showAi = true
      } label: {
        Image(systemName: "sparkles")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(.white)
          .frame(width: 40, height: 40)
          .background(Circle().fill(AppColor.primaryOrange))
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 16)
    .padding(.top, 8)
    .frame(maxWidth: .infinity)
  }

  // MARK: - Banner 轮播

  private var bannerCarousel: some View {
    TabView(selection: $viewModel.currentBannerIndex) {
      ForEach(Array(viewModel.banners.enumerated()), id: \.element.id) { index, banner in
        ZStack(alignment: .bottomLeading) {
          AsyncImage(url: URL(string: banner.imageUrl)) { image in
            image.resizable().scaledToFill()
          } placeholder: {
            Rectangle().fill(Color.white.opacity(0.4))
          }
          LinearGradient(
            colors: [.black.opacity(0.55), .clear],
            startPoint: .bottom,
            endPoint: .top
          )
          VStack(alignment: .leading, spacing: 4) {
            Text(banner.title)
              .font(.system(size: 16, weight: .semibold))
              .foregroundStyle(.white)
            Text(banner.subtitle)
              .font(.system(size: 12))
              .foregroundStyle(.white.opacity(0.9))
          }
          .padding(12)
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .tag(index)
      }
    }
    .frame(height: 160)
    #if os(iOS)
    .tabViewStyle(.page(indexDisplayMode: .always))
    .indexViewStyle(.page(backgroundDisplayMode: .always))
    #endif
  }

  // MARK: - 行为

  private func handleCardTap(_ card: HomeFeedItem) {
    switch card.targetType {
    case .post:
      appState.updateRoute(.postDetail(card.targetId))
    case .job:
      appState.updateRoute(.jobDetail(card.targetId))
    case .company:
      appState.updateRoute(.company(card.targetId))
    }
  }

  /// 将卡片目标映射为详情路由，配合 NavigationLink(value:) 使用
  private func detailRoute(for card: HomeFeedItem) -> DetailRoute {
    switch card.targetType {
    case .post: return .postDetail(card.targetId)
    case .job: return .jobDetail(card.targetId)
    case .company: return .company(card.targetId)
    }
  }

  private func handleAppear(_ card: HomeFeedItem) {
    // 当渲染到倒数第 3 张时，触发加载更多
    guard let idx = viewModel.cards.firstIndex(where: { $0.id == card.id }) else { return }
    if idx >= viewModel.cards.count - 3 {
      Task { await viewModel.loadMore(using: appState) }
    }
  }
}

// MARK: - 瀑布流两列布局（对齐 Android MasonryGrid）

/// 左右分列摆放，根据 index 奇偶交替
struct WaterfallGrid<Item: Identifiable, ItemView: View>: View {
  let items: [Item]
  let content: (Item) -> ItemView

  var body: some View {
    let (left, right) = split()
    HStack(alignment: .top, spacing: 8) {
      VStack(spacing: 8) {
        ForEach(left) { item in content(item) }
      }
      VStack(spacing: 8) {
        ForEach(right) { item in content(item) }
      }
    }
  }

  private func split() -> ([Item], [Item]) {
    var left: [Item] = []
    var right: [Item] = []
    for (index, item) in items.enumerated() {
      if index.isMultiple(of: 2) {
        left.append(item)
      } else {
        right.append(item)
      }
    }
    return (left, right)
  }
}
