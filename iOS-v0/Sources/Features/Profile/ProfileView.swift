import SwiftUI

// MARK: - 数据结构

/// 个人页快捷入口（与 Android `ProfileShortcut` 对齐）
private struct ProfileShortcut: Identifiable, Hashable {
  let id = UUID()
  let title: String
  let systemIcon: String
  let action: ProfileAction
}

/// 个人页投递统计项（与 Android `ProfileStat` 对齐）
private struct ProfileStat: Identifiable, Hashable {
  let id = UUID()
  let label: String
  let value: String
  let action: ProfileAction
}

/// 个人页可点击动作 - 把 Android 路由映射到 iOS 已有页面/敬请期待
private enum ProfileAction: Hashable {
  case resumeReport
  case aiInterview
  case assessments
  case jobFavorites
  case deliveriesSubmitted
  case deliveriesViewed
  case deliveriesPassed
  case deliveriesRejected
  case verification
  case personalInfo
  case myPosts
  case postFavorites
  case messages
  case settings
  case privacy
  case contact
}

// MARK: - ViewModel

/// 个人页 ViewModel - 拉取顶部 banner（对齐 Android `ProfileViewModel`）
@MainActor
final class ProfileViewModel: ObservableObject {
  @Published var banners: [Banner] = []
  @Published var currentBannerIndex: Int = 0

  private var bannerTimerTask: Task<Void, Never>?

  deinit { bannerTimerTask?.cancel() }

  func onAppear(using appState: AppState) async {
    if banners.isEmpty {
      banners = (try? await appState.contentService.getProfileBanners()) ?? []
    }
    startBannerAutoScroll()
  }

  func startBannerAutoScroll() {
    bannerTimerTask?.cancel()
    bannerTimerTask = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        await MainActor.run {
          guard let self, !self.banners.isEmpty else { return }
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

/// 个人中心 - 严格对齐 Android `ProfileScreen` 布局
/// 顶部蓝绿渐变 + 白色头部卡片（含投递快捷入口与统计）
/// + Banner 轮播 + 我的圈子卡片 + 通用功能卡片 + 退出登录
struct ProfileView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = ProfileViewModel()

  @State private var showLogin = false
  @State private var showHistory = false
  @State private var showMessages = false
  @State private var showPreferences = false
  @State private var showAssessments = false
  @State private var showMyPosts = false
  @State private var showAiInterview = false
  @State private var toastText: String?

  var onRequireLogin: (() -> Void)?

  // MARK: - 配置数据
  private let deliveryShortcuts: [ProfileShortcut] = [
    .init(title: "简历报告", systemIcon: "doc.text", action: .resumeReport),
    .init(title: "AI 面试", systemIcon: "sparkles", action: .aiInterview),
    .init(title: "职业测评", systemIcon: "checkmark.seal", action: .assessments),
    .init(title: "职位收藏", systemIcon: "heart", action: .jobFavorites),
  ]

  private let deliveryStats: [ProfileStat] = [
    .init(label: "已投递", value: "0", action: .deliveriesSubmitted),
    .init(label: "被查看", value: "0", action: .deliveriesViewed),
    .init(label: "通过初筛", value: "0", action: .deliveriesPassed),
    .init(label: "不合适", value: "0", action: .deliveriesRejected),
  ]

  private let communityShortcuts: [ProfileShortcut] = [
    .init(title: "我的发布", systemIcon: "square.text.square", action: .myPosts),
    .init(title: "帖子收藏", systemIcon: "bookmark", action: .postFavorites),
    .init(title: "消息中心", systemIcon: "bell.badge", action: .messages),
  ]

  private let generalFunctions: [ProfileShortcut] = [
    .init(title: "通用设置", systemIcon: "gearshape", action: .settings),
    .init(title: "个人资料", systemIcon: "person.crop.circle", action: .personalInfo),
    .init(title: "隐私权限", systemIcon: "lock.shield", action: .privacy),
    .init(title: "联系我们", systemIcon: "envelope", action: .contact),
  ]

  var body: some View {
    ZStack(alignment: .top) {
      backgroundLayer.ignoresSafeArea()

      if appState.currentUser == nil {
        loggedOutContent
      } else {
        loggedInContent
      }

      // 顶部轻量 toast 提示
      if let toast = toastText {
        toastBanner(text: toast)
          .transition(.move(edge: .top).combined(with: .opacity))
      }
    }
    .task { await viewModel.onAppear(using: appState) }
    .onDisappear { viewModel.stopBannerAutoScroll() }
    .sheet(isPresented: $showLogin) {
      LoginView { data in
        appState.updateAuth(token: data.token, user: data.user)
        showLogin = false
      }
      .environmentObject(appState)
    }
    .sheet(isPresented: $showHistory) {
      InterviewHistoryView().environmentObject(appState)
    }
    .sheet(isPresented: $showMessages) {
      MessagesView().environmentObject(appState)
    }
    .sheet(isPresented: $showPreferences) {
      JobPreferencesView().environmentObject(appState)
    }
    .sheet(isPresented: $showAssessments) {
      AssessmentsView().environmentObject(appState)
    }
    .sheet(isPresented: $showMyPosts) {
      MyPostsView().environmentObject(appState)
    }
    .sheet(isPresented: $showAiInterview) {
      AiInterviewEntryView().environmentObject(appState)
    }
  }

  // MARK: - 背景渐变
  private var backgroundLayer: some View {
    ZStack {
      Color(hex: 0xF4F5F6)
      LinearGradient(
        colors: [Color(hex: 0x00ACC3), Color(hex: 0xE9F7F9), Color(hex: 0xE9F7F9)],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(maxHeight: 320)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
  }

  // MARK: - 未登录占位
  private var loggedOutContent: some View {
    VStack(spacing: 16) {
      Spacer().frame(height: 80)
      Image(systemName: "person.crop.circle.badge.questionmark")
        .font(.system(size: 56))
        .foregroundStyle(AppColor.primaryBlue)
      Text("登录后查看投递、面试与收藏记录")
        .font(.system(size: 15))
        .foregroundStyle(AppColor.textPrimary)
      Button {
        showLogin = true
        onRequireLogin?()
      } label: {
        Text("手机号验证码登录")
          .font(.system(size: 15, weight: .medium))
          .foregroundStyle(.white)
          .padding(.horizontal, 32)
          .padding(.vertical, 12)
          .background(Capsule().fill(AppColor.primaryOrange))
      }
      .buttonStyle(.plain)
      Spacer()
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - 已登录主体
  private var loggedInContent: some View {
    ScrollView(showsIndicators: false) {
      VStack(spacing: 12) {
        Spacer().frame(height: 16)

        headerWithDeliveryCard
          .padding(.horizontal, 12)

        if !viewModel.banners.isEmpty {
          bannerCarousel
            .padding(.horizontal, 12)
        }

        myCommunityCard
          .padding(.horizontal, 12)

        generalFunctionsCard
          .padding(.horizontal, 12)

        signOutRow
          .padding(.horizontal, 12)
          .padding(.top, 4)

        Spacer().frame(height: 88)
      }
    }
  }

  // MARK: - 头部信息 + 投递快捷入口 + 投递统计
  private var headerWithDeliveryCard: some View {
    VStack(alignment: .leading, spacing: 16) {
      profileHeaderRow

      Divider().background(AppColor.dividerGray.opacity(0.6))

      // 4 个快捷入口横向铺开
      HStack(alignment: .top, spacing: 0) {
        ForEach(deliveryShortcuts) { shortcut in
          shortcutCell(shortcut)
            .frame(maxWidth: .infinity)
        }
      }

      Divider().background(AppColor.dividerGray.opacity(0.6))

      // 4 个数据统计
      HStack(alignment: .top, spacing: 0) {
        ForEach(deliveryStats) { stat in
          statCell(stat)
            .frame(maxWidth: .infinity)
        }
      }
    }
    .padding(16)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(Color.white)
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(Color(hex: 0xE6E8EB), lineWidth: 1)
    )
  }

  // 用户头像 + 昵称 + 实名认证按钮
  private var profileHeaderRow: some View {
    HStack(spacing: 12) {
      avatarView
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          Text(appState.currentUser?.name ?? "未设置昵称")
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(AppColor.textPrimary)
          if appState.currentUser?.isVerified == true {
            Image(systemName: "checkmark.seal.fill")
              .font(.system(size: 14))
              .foregroundStyle(AppColor.primaryBlue)
          }
        }
        Text(appState.currentUser?.phone ?? appState.currentUser?.email ?? "")
          .font(.system(size: 12))
          .foregroundStyle(AppColor.textSecondary)
      }
      Spacer()
      verifyButton
    }
  }

  private var avatarView: some View {
    Group {
      if let urlString = appState.currentUser?.avatar,
         let url = URL(string: urlString) {
        AsyncImage(url: url) { phase in
          switch phase {
          case .success(let image):
            image.resizable().scaledToFill()
          default:
            avatarFallback
          }
        }
      } else {
        avatarFallback
      }
    }
    .frame(width: 56, height: 56)
    .clipShape(Circle())
    .overlay(Circle().stroke(Color.white, lineWidth: 2))
  }

  private var avatarFallback: some View {
    ZStack {
      Circle().fill(AppColor.primaryOrange.opacity(0.18))
      Text(String(appState.currentUser?.name?.prefix(1) ?? "我"))
        .font(.system(size: 22, weight: .semibold))
        .foregroundStyle(AppColor.primaryOrange)
    }
  }

  private var verifyButton: some View {
    Button {
      if appState.currentUser?.isVerified == true {
        showToast("您已完成实名认证")
      } else {
        showToast("实名认证 敬请期待")
      }
    } label: {
      let verified = appState.currentUser?.isVerified == true
      Text(verified ? "已认证" : "去认证")
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(verified ? AppColor.primaryBlue : AppColor.primaryOrange)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
          Capsule().fill(
            (verified ? AppColor.primaryBlue : AppColor.primaryOrange).opacity(0.12)
          )
        )
    }
    .buttonStyle(.plain)
  }

  // MARK: - 单个快捷入口
  private func shortcutCell(_ shortcut: ProfileShortcut) -> some View {
    Button {
      handle(action: shortcut.action, label: shortcut.title)
    } label: {
      VStack(spacing: 8) {
        ZStack {
          Circle()
            .fill(AppColor.primaryBlue.opacity(0.12))
            .frame(width: 44, height: 44)
          Image(systemName: shortcut.systemIcon)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(AppColor.primaryBlue)
        }
        Text(shortcut.title)
          .font(.system(size: 12))
          .foregroundStyle(AppColor.textPrimary)
      }
    }
    .buttonStyle(.plain)
  }

  // MARK: - 单个投递统计项
  private func statCell(_ stat: ProfileStat) -> some View {
    Button {
      handle(action: stat.action, label: stat.label)
    } label: {
      VStack(spacing: 6) {
        Text(stat.value)
          .font(.system(size: 20, weight: .semibold, design: .rounded))
          .foregroundStyle(AppColor.textPrimary)
        Text(stat.label)
          .font(.system(size: 12))
          .foregroundStyle(AppColor.textSecondary)
      }
    }
    .buttonStyle(.plain)
  }

  // MARK: - Banner 轮播
  private var bannerCarousel: some View {
    let banners = viewModel.banners
    return ZStack(alignment: .bottomTrailing) {
      #if os(iOS)
      TabView(selection: $viewModel.currentBannerIndex) {
        ForEach(Array(banners.enumerated()), id: \.element.id) { idx, banner in
          bannerCell(banner).tag(idx)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      .frame(height: 110)
      #else
      bannerCell(banners[min(viewModel.currentBannerIndex, banners.count - 1)])
        .frame(height: 110)
      #endif

      // 自定义指示器
      HStack(spacing: 4) {
        ForEach(0..<banners.count, id: \.self) { i in
          Capsule()
            .fill(i == viewModel.currentBannerIndex ? Color.white : Color.white.opacity(0.5))
            .frame(width: i == viewModel.currentBannerIndex ? 14 : 6, height: 4)
        }
      }
      .padding(8)
    }
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
  }

  private func bannerCell(_ banner: Banner) -> some View {
    ZStack(alignment: .bottomLeading) {
      AsyncImage(url: URL(string: banner.imageUrl)) { phase in
        switch phase {
        case .success(let image):
          image.resizable().scaledToFill()
        default:
          LinearGradient(
            colors: [AppColor.primaryBlue.opacity(0.4), AppColor.primaryOrange.opacity(0.4)],
            startPoint: .topLeading, endPoint: .bottomTrailing
          )
        }
      }
      LinearGradient(
        colors: [Color.black.opacity(0.0), Color.black.opacity(0.45)],
        startPoint: .top, endPoint: .bottom
      )
      VStack(alignment: .leading, spacing: 2) {
        Text(banner.title)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(.white)
        Text(banner.subtitle)
          .font(.system(size: 11))
          .foregroundStyle(.white.opacity(0.85))
      }
      .padding(12)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - 我的圈子
  private var myCommunityCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("我的圈子")
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(AppColor.textPrimary)
      HStack(alignment: .top, spacing: 0) {
        ForEach(communityShortcuts) { shortcut in
          shortcutCell(shortcut).frame(maxWidth: .infinity)
        }
      }
    }
    .padding(16)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.white)
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(Color(hex: 0xE6E8EB), lineWidth: 1)
    )
  }

  // MARK: - 通用功能
  private var generalFunctionsCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("通用功能")
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(AppColor.textPrimary)
      VStack(spacing: 0) {
        ForEach(Array(generalFunctions.enumerated()), id: \.element.id) { idx, shortcut in
          generalFunctionRow(shortcut)
          if idx < generalFunctions.count - 1 {
            Divider().background(AppColor.dividerGray.opacity(0.5))
          }
        }
      }
    }
    .padding(16)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.white)
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(Color(hex: 0xE6E8EB), lineWidth: 1)
    )
  }

  private func generalFunctionRow(_ shortcut: ProfileShortcut) -> some View {
    Button {
      handle(action: shortcut.action, label: shortcut.title)
    } label: {
      HStack(spacing: 12) {
        ZStack {
          Circle().fill(AppColor.primaryBlue.opacity(0.12)).frame(width: 32, height: 32)
          Image(systemName: shortcut.systemIcon)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(AppColor.primaryBlue)
        }
        Text(shortcut.title)
          .font(.system(size: 14))
          .foregroundStyle(AppColor.textPrimary)
        Spacer()
        Image(systemName: "chevron.right")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(AppColor.textTertiary)
      }
      .padding(.vertical, 12)
    }
    .buttonStyle(.plain)
  }

  // MARK: - 退出登录
  private var signOutRow: some View {
    Button {
      appState.signOut()
    } label: {
      Text("退出登录")
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(AppColor.primaryOrange)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
          RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.white)
        )
        .overlay(
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(Color(hex: 0xE6E8EB), lineWidth: 1)
        )
    }
    .buttonStyle(.plain)
  }

  // MARK: - Toast
  private func toastBanner(text: String) -> some View {
    Text(text)
      .font(.system(size: 13))
      .foregroundStyle(.white)
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
      .background(Capsule().fill(Color.black.opacity(0.78)))
      .padding(.top, 80)
      .frame(maxWidth: .infinity)
  }

  private func showToast(_ text: String) {
    withAnimation(.easeInOut(duration: 0.2)) { toastText = text }
    Task {
      try? await Task.sleep(nanoseconds: 1_500_000_000)
      await MainActor.run {
        withAnimation(.easeInOut(duration: 0.2)) { toastText = nil }
      }
    }
  }

  // MARK: - 动作分发
  private func handle(action: ProfileAction, label: String) {
    switch action {
    case .aiInterview:
      showAiInterview = true
    case .assessments:
      showAssessments = true
    case .myPosts:
      showMyPosts = true
    case .messages:
      showMessages = true
    case .personalInfo:
      // 复用岗位偏好作为资料编辑入口
      showPreferences = true
    case .resumeReport, .jobFavorites, .deliveriesSubmitted, .deliveriesViewed,
         .deliveriesPassed, .deliveriesRejected, .verification, .postFavorites,
         .settings, .privacy, .contact:
      showToast("\(label) 敬请期待")
    }
  }
}
