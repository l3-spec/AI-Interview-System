import SwiftUI

struct RootView: View {
  @EnvironmentObject private var appState: AppState
  @State private var homePath = NavigationPath()
  @State private var jobsPath = NavigationPath()
  @State private var circlePath = NavigationPath()
  @State private var profilePath = NavigationPath()
  @State private var showAiInterview = false

  var body: some View {
    ZStack(alignment: .bottom) {
      Group {
        switch appState.selectedTab {
        case .home:
          NavigationStack(path: $homePath) {
            HomeView()
          }
        case .jobs:
          NavigationStack(path: $jobsPath) {
            JobsView()
          }
        case .circle:
          NavigationStack(path: $circlePath) {
            CircleView()
          }
        case .profile:
          NavigationStack(path: $profilePath) {
            ProfileView(onRequireLogin: { appState.selectedTab = .profile })
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .padding(.bottom, 110)
      .background(AppColor.backgroundGradient.ignoresSafeArea())

      VStack(spacing: 12) {
        AiEntryButton(isActive: appState.selectedTab == .home && showAiInterview) {
          showAiInterview = true
        }
        FrostedTabBar(selected: appState.selectedTab) { tab in
          withAnimation(.spring(duration: 0.25)) {
            appState.selectedTab = tab
          }
        }
      }
      .padding(.bottom, 8)
    }
    .sheet(isPresented: $showAiInterview) {
      AiInterviewEntryView()
        .environmentObject(appState)
    }
  }
}
