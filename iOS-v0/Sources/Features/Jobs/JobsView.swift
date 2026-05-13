import SwiftUI

// MARK: - 排序枚举
enum JobSort: String {
  case recommended = "recommended"
  case latest = "latest"
}

// MARK: - ViewModel
@MainActor
final class JobsViewModel: ObservableObject {
  // 数据
  @Published var jobs: [JobSummary] = []
  @Published var banners: [Banner] = []
  @Published var currentBannerIndex: Int = 0
  @Published var preferredPositions: [JobPreferencePosition] = []

  // 状态
  @Published var isLoading: Bool = false
  @Published var isPaginating: Bool = false
  @Published var isPreferenceLoading: Bool = false
  @Published var hasMore: Bool = true
  @Published var page: Int = 1

  // 筛选
  @Published var searchInput: String = ""
  @Published var keyword: String = ""
  @Published var sort: JobSort = .recommended
  @Published var cityLabel: String = "城市"
  @Published var city: String? = nil
  @Published var onlyRemote: Bool = false

  @Published var error: String?

  private var bannerTimerTask: Task<Void, Never>?

  deinit {
    bannerTimerTask?.cancel()
  }

  func onAppear(using appState: AppState) async {
    if !appState.sharedJobKeyword.isEmpty && keyword.isEmpty {
      searchInput = appState.sharedJobKeyword
      keyword = appState.sharedJobKeyword
    }
    startBannerAutoScroll()
    async let bannersTask: Void = loadBanners(using: appState)
    async let prefsTask: Void = loadPreferences(using: appState, initial: true)
    async let jobsTask: Void = load(using: appState)
    _ = await (bannersTask, prefsTask, jobsTask)
  }

  func startBannerAutoScroll() {
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

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let response = try await appState.jobsService.getPublicJobs(
        page: 1,
        pageSize: 20,
        keyword: keyword.isEmpty ? nil : keyword,
        location: city,
        remoteOnly: onlyRemote ? true : nil,
        sort: sort.rawValue,
        dictionaryPositionIds: positionIdsQuery()
      )
      jobs = response.data ?? []
      hasMore = response.hasMore ?? false
      page = response.page ?? 1
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }

  func loadMore(using appState: AppState) async {
    guard hasMore, !isLoading, !isPaginating else { return }
    isPaginating = true
    defer { isPaginating = false }
    do {
      let next = page + 1
      let response = try await appState.jobsService.getPublicJobs(
        page: next,
        pageSize: 20,
        keyword: keyword.isEmpty ? nil : keyword,
        location: city,
        remoteOnly: onlyRemote ? true : nil,
        sort: sort.rawValue,
        dictionaryPositionIds: positionIdsQuery()
      )
      jobs.append(contentsOf: response.data ?? [])
      hasMore = response.hasMore ?? false
      page = response.page ?? next
    } catch {
      self.error = error.localizedDescription
    }
  }

  func submitSearch(using appState: AppState) {
    keyword = searchInput.trimmingCharacters(in: .whitespacesAndNewlines)
    Task { await load(using: appState) }
  }

  func clearSearch(using appState: AppState) {
    searchInput = ""
    keyword = ""
    Task { await load(using: appState) }
  }

  func changeSort(_ next: JobSort, using appState: AppState) {
    guard sort != next else { return }
    sort = next
    Task { await load(using: appState) }
  }

  func applyCity(_ value: String?, using appState: AppState) {
    city = value
    cityLabel = (value?.isEmpty == false) ? (value ?? "城市") : "城市"
    Task { await load(using: appState) }
  }

  func applyRemote(_ value: Bool, using appState: AppState) {
    onlyRemote = value
    Task { await load(using: appState) }
  }

  func loadBanners(using appState: AppState) async {
    do {
      banners = try await appState.contentService.getBanners()
    } catch {
      // 轮播为非关键数据，静默失败
    }
  }

  func loadPreferences(using appState: AppState, initial: Bool) async {
    guard appState.isLoggedIn else { return }
    isPreferenceLoading = true
    defer { isPreferenceLoading = false }
    do {
      let prefs = try await appState.jobsService.getPreferences()
      preferredPositions = prefs.positions
      if initial && !preferredPositions.isEmpty {
        await load(using: appState)
      }
    } catch {
      // 偏好失败不阻塞列表
    }
  }

  func removePreferred(id: String, using appState: AppState) {
    guard !isPreferenceLoading else { return }
    let snapshot = preferredPositions
    let updated = snapshot.filter { $0.id != id }
    preferredPositions = updated
    isPreferenceLoading = true
    Task { [weak self] in
      guard let self = self else { return }
      defer { Task { @MainActor in self.isPreferenceLoading = false } }
      do {
        let saved = try await appState.jobsService.updatePreferences(positionIds: updated.map { $0.id })
        await MainActor.run {
          self.preferredPositions = saved.positions
        }
        await self.load(using: appState)
      } catch {
        await MainActor.run {
          self.preferredPositions = snapshot
        }
      }
    }
  }

  private func positionIdsQuery() -> String? {
    let ids = preferredPositions.map { $0.id }
    return ids.isEmpty ? nil : ids.joined(separator: ",")
  }
}

// MARK: - 主视图
struct JobsView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = JobsViewModel()
  @State private var showPreferences = false
  @State private var showCityPicker = false

  private let gradientTop = Color(hex: 0x00ADC1)
  private let gradientBottom = Color(hex: 0xE3F4FB)
  private let pageBackground = Color(hex: 0xEBEBEB)

  var body: some View {
    ZStack(alignment: .top) {
      pageBackground.ignoresSafeArea()
      LinearGradient(
        colors: [gradientTop, gradientBottom],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 520)
      .ignoresSafeArea(edges: .top)

      ScrollView {
        VStack(spacing: 12) {
          header
          if !viewModel.banners.isEmpty {
            bannerCarousel
              .padding(.horizontal, 12)
          }
          listSection
            .padding(.horizontal, 12)
        }
        .padding(.bottom, 68)
      }
      .refreshable { await viewModel.load(using: appState) }
    }
#if os(iOS)
    .navigationBarHidden(true)
#endif
    .navigationDestination(for: String.self) { id in
      JobDetailView(jobId: id)
    }
    .task { await viewModel.onAppear(using: appState) }
    .sheet(isPresented: $showPreferences) {
      JobPreferencesView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showCityPicker) {
      CityPickerSheet(
        currentCity: viewModel.city,
        onlyRemote: viewModel.onlyRemote
      ) { city, remote in
        viewModel.applyCity(city, using: appState)
        viewModel.applyRemote(remote, using: appState)
        showCityPicker = false
      }
    }
  }

  // MARK: 头部区域
  private var header: some View {
    VStack(spacing: 14) {
      // 标题 + 搜索
      HStack(spacing: 20) {
        Text("职岗")
          .font(.system(size: 24, weight: .semibold, design: .rounded))
          .foregroundStyle(Color.black)
        searchField
      }
      .padding(.horizontal, 12)
      .padding(.top, 10)

      // 意向卡
      intentionCard
        .padding(.horizontal, 16)
    }
    .padding(.bottom, 14)
  }

  private var searchField: some View {
    HStack(spacing: 10) {
      Image(systemName: "magnifyingglass")
        .font(.system(size: 12))
        .foregroundStyle(AppColor.textTertiary)
      TextField("搜索", text: $viewModel.searchInput)
        .font(.system(size: 14))
        .foregroundStyle(AppColor.textPrimary)
#if os(iOS)
        .textInputAutocapitalization(.never)
        .submitLabel(.search)
#endif
        .onSubmit { viewModel.submitSearch(using: appState) }
      if !viewModel.searchInput.isEmpty {
        Button {
          viewModel.clearSearch(using: appState)
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.system(size: 14))
            .foregroundStyle(AppColor.textTertiary)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, 20)
    .frame(height: 32)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }

  private var intentionCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text(intentionTitle)
          .font(.system(size: 24, weight: .semibold, design: .rounded))
          .foregroundStyle(Color.black)
          .lineLimit(1)
        Spacer()
        Button {
          showPreferences = true
        } label: {
          Image(systemName: "square.and.pencil")
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(AppColor.primaryOrange)
        }
        .buttonStyle(.plain)
        if viewModel.isPreferenceLoading {
          ProgressView()
            .scaleEffect(0.7)
            .tint(AppColor.primaryOrange)
        }
      }

      if viewModel.preferredPositions.count > 1 {
        preferenceChips
      }

      HStack {
        HStack(spacing: 22) {
          sortTab("推荐", active: viewModel.sort == .recommended) {
            viewModel.changeSort(.recommended, using: appState)
          }
          sortTab("最新", active: viewModel.sort == .latest) {
            viewModel.changeSort(.latest, using: appState)
          }
        }
        Spacer()
        HStack(spacing: 18) {
          filterPill(viewModel.cityLabel) { showCityPicker = true }
          filterPill("筛选") { showCityPicker = true }
        }
      }
    }
  }

  private var intentionTitle: String {
    if let first = viewModel.preferredPositions.first {
      return "\(first.name) (意向岗位)"
    }
    if !viewModel.keyword.isEmpty {
      return "\(viewModel.keyword) (意向岗位)"
    }
    return "前端开发 (意向岗位)"
  }

  @ViewBuilder
  private var preferenceChips: some View {
    // 简化两列式 chip 容器
    let items = Array(viewModel.preferredPositions)
    WrapChips(items: items) { item in
      PreferenceChip(name: item.name) {
        viewModel.removePreferred(id: item.id, using: appState)
      }
    }
  }

  private func sortTab(_ label: String, active: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(label)
        .font(.system(size: 14, weight: active ? .medium : .regular))
        .foregroundStyle(active ? Color.black : AppColor.textTertiary)
    }
    .buttonStyle(.plain)
  }

  private func filterPill(_ label: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 4) {
        Text(label)
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(AppColor.textTertiary)
        Image(systemName: "chevron.down")
          .font(.system(size: 9, weight: .semibold))
          .foregroundStyle(AppColor.textTertiary)
      }
    }
    .buttonStyle(.plain)
  }

  // MARK: 轮播
  private var bannerCarousel: some View {
    TabView(selection: $viewModel.currentBannerIndex) {
      ForEach(Array(viewModel.banners.enumerated()), id: \.offset) { idx, banner in
        AsyncImage(url: URL(string: banner.imageUrl)) { phase in
          switch phase {
          case .success(let image):
            image.resizable().aspectRatio(contentMode: .fill)
          default:
            LinearGradient(
              colors: [AppColor.primaryBlue.opacity(0.4), AppColor.primaryOrange.opacity(0.4)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 120)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .tag(idx)
      }
    }
#if os(iOS)
    .tabViewStyle(.page(indexDisplayMode: .automatic))
#endif
    .frame(height: 130)
  }

  // MARK: 列表
  @ViewBuilder
  private var listSection: some View {
    if viewModel.isLoading && viewModel.jobs.isEmpty {
      ProgressView()
        .tint(AppColor.primaryOrange)
        .padding(.vertical, 48)
    } else if viewModel.jobs.isEmpty {
      emptyState
    } else {
      LazyVStack(spacing: 12) {
        ForEach(viewModel.jobs) { job in
          NavigationLink(value: job.id) {
            JobCard(job: job)
          }
          .buttonStyle(.plain)
          .onAppear {
            if shouldLoadMore(job) {
              Task { await viewModel.loadMore(using: appState) }
            }
          }
        }
        if viewModel.isPaginating {
          ProgressView().tint(AppColor.primaryOrange).padding(.vertical, 16)
        } else if !viewModel.hasMore && !viewModel.jobs.isEmpty {
          Text("已经到底啦")
            .font(.system(size: 12))
            .foregroundStyle(AppColor.textTertiary)
            .padding(.vertical, 16)
        }
        if let error = viewModel.error {
          Text(error).font(.system(size: 12)).foregroundStyle(.red).padding(.vertical, 8)
        }
      }
    }
  }

  private func shouldLoadMore(_ job: JobSummary) -> Bool {
    guard let idx = viewModel.jobs.firstIndex(where: { $0.id == job.id }) else { return false }
    return idx >= viewModel.jobs.count - 3
  }

  private var emptyState: some View {
    VStack(spacing: 12) {
      Image(systemName: "tray")
        .font(.system(size: 40))
        .foregroundStyle(AppColor.textTertiary)
      Text("暂无相关岗位")
        .font(.system(size: 14))
        .foregroundStyle(AppColor.textSecondary)
      Button {
        Task { await viewModel.load(using: appState) }
      } label: {
        Text("重新加载")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(Color.white)
          .padding(.horizontal, 20)
          .padding(.vertical, 8)
          .background(Capsule().fill(AppColor.primaryOrange))
      }
      .buttonStyle(.plain)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 48)
  }
}
