import SwiftUI

/// 根视图 - 对齐 Android V0App
/// 支持底部导航栏、AI 入口按钮、根据路由隐藏底栏等
struct RootView: View {
  @EnvironmentObject private var appState: AppState
  @State private var homePath = NavigationPath()
  @State private var jobsPath = NavigationPath()
  @State private var circlePath = NavigationPath()
  @State private var profilePath = NavigationPath()

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .bottom) {
        // 主要内容区域
        Group {
          switch appState.selectedTab {
          case .home:
            NavigationStack(path: $homePath) {
              HomeView()
                .onAppear { appState.updateRoute(.home) }
            }
          case .jobs:
            NavigationStack(path: $jobsPath) {
              JobsView()
                .onAppear { appState.updateRoute(.jobs) }
            }
          case .circle:
            NavigationStack(path: $circlePath) {
              CircleView()
                .onAppear { appState.updateRoute(.circle) }
            }
          case .profile:
            NavigationStack(path: $profilePath) {
              ProfileView(onRequireLogin: { appState.selectedTab = .profile })
                .onAppear { appState.updateRoute(.profile) }
            }
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.bottom, appState.shouldHideBottomBar ? 0 : 110)
        .background(AppColor.backgroundGradient.ignoresSafeArea())

        // 底部导航栏和 AI 按钮
        if !appState.shouldHideBottomBar {
          VStack(spacing: 0) {
            // AI 入口按钮（悬浮在底栏上方）
            AiEntryButton(isActive: appState.isAiSelected) {
              appState.updateRoute(.ai)
              // TODO: 导航到 AI 面试入口
            }
            .offset(y: -32)
            .zIndex(10)
            
            // 底栏
            FrostedTabBar(selected: appState.selectedTab) { tab in
              withAnimation(.spring(duration: 0.25)) {
                appState.selectedTab = tab
                switch tab {
                case .home:
                  appState.updateRoute(.home)
                case .jobs:
                  appState.updateRoute(.jobs)
                case .circle:
                  appState.updateRoute(.circle)
                case .profile:
                  appState.updateRoute(.profile)
                }
              }
            }
          }
          .padding(.bottom, max(0, geometry.safeAreaInsets.bottom - 15))
          .transition(.opacity)
        }
      }
    }
  }
}
