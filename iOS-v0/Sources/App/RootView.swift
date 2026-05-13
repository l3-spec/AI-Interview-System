import SwiftUI

/// 根视图 - 对齐 Android V0App
/// 支持底部导航栏、AI 入口按钮、根据路由隐藏底栏等
struct RootView: View {
  @EnvironmentObject private var appState: AppState
  @State private var homePath = NavigationPath()
  @State private var jobsPath = NavigationPath()
  @State private var circlePath = NavigationPath()
  @State private var profilePath = NavigationPath()
  @State private var showAiEntry = false

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
        .padding(.bottom, appState.shouldHideBottomBar ? 0 : 72)
        .background(AppColor.backgroundLight.ignoresSafeArea())

        // 底部导航栏和 AI 按钮（对齐 Android FrostedGlassBottomBar + AIInterviewFab）
        if !appState.shouldHideBottomBar {
          ZStack(alignment: .top) {
            // 底栏（占满宽度，顶部圆角 24）
            FrostedTabBar(
              selected: appState.selectedTab,
              onSelect: { tab in
                withAnimation(.spring(duration: 0.25)) {
                  appState.selectedTab = tab
                  switch tab {
                  case .home: appState.updateRoute(.home)
                  case .jobs: appState.updateRoute(.jobs)
                  case .circle: appState.updateRoute(.circle)
                  case .profile: appState.updateRoute(.profile)
                  }
                }
              },
              bottomInset: geometry.safeAreaInsets.bottom
            )

            // AI 入口按钮悬浮在底栏顶部上方20pt（对齐 Android offset(y = -20)）
            AiEntryButton(isActive: appState.isAiSelected) {
              showAiEntry = true
              appState.updateRoute(.ai)
            }
            .offset(y: -20)
            .zIndex(10)
          }
          .transition(.opacity)
          .ignoresSafeArea(edges: .bottom)
        }
      }
      .sheet(isPresented: $showAiEntry) {
        AiInterviewEntryView()
          .environmentObject(appState)
      }
    }
  }
}
