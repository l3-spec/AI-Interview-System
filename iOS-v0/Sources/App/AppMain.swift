import SwiftUI

@main
struct AIInterviewApp: App {
  @StateObject private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(appState)
        .preferredColorScheme(.dark) // 默认深色模式，对齐 Android
    }
  }
}
