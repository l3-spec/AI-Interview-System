import SwiftUI

@main
struct AIInterviewApp: App {
  @StateObject private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(appState)
        .preferredColorScheme(.light) // 浅色模式，对齐 Android 浅色主题 (BackgroundLight #E3F4FB)
    }
  }
}
