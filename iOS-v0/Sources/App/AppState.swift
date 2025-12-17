import Foundation
import SwiftUI

enum AppTab: Int {
  case home, jobs, circle, profile
}

@MainActor
final class AppState: ObservableObject {
  @Published var authToken: String?
  @Published var currentUser: User?
  @Published var selectedTab: AppTab = .home
  @Published var isLoading: Bool = false
  @Published var sharedJobKeyword: String = ""

  let apiClient: APIClient
  let authService: AuthService
  let jobsService: JobsService
  let contentService: ContentService
  let aiInterviewService: AiInterviewService
  let messagingService: MessagingService
  let assessmentService: AssessmentService
  let appUpdateService: AppUpdateService

  private let authStore = AuthStore()

  init() {
    let config = APIConfig.load()
    let client = APIClient(config: config) { [weak authStore] in
      authStore?.loadToken()
    }
    self.apiClient = client
    self.authService = AuthService(client: client)
    self.jobsService = JobsService(client: client)
    self.contentService = ContentService(client: client)
    self.aiInterviewService = AiInterviewService(client: client)
    self.messagingService = MessagingService(client: client)
    self.assessmentService = AssessmentService(client: client)
    self.appUpdateService = AppUpdateService(client: client)

    self.authToken = authStore.loadToken()
    self.currentUser = authStore.loadUser()
  }

  var isLoggedIn: Bool {
    authToken != nil
  }

  func updateAuth(token: String?, user: User?) {
    authToken = token
    currentUser = user
    authStore.save(token: token)
    authStore.save(user: user)
  }

  func signOut() {
    updateAuth(token: nil, user: nil)
  }
}
