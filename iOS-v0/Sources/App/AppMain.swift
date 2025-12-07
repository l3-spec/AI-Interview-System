import SwiftUI

@main
struct AIInterviewApp: App {
  @StateObject private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(appState)
    }
  }
}
