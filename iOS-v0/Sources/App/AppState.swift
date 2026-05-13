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
  @Published var currentRoute: AppRoute = .home
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
  let verificationService: VerificationService
  let userService: UserService
  let runtimeConfigService: RuntimeConfigService

  private let authStore = AuthStore()

  init() {
    let config = APIConfig.load()
    let store = authStore
    let client = APIClient(config: config) {
      store.loadToken()
    }
    self.apiClient = client
    self.authService = AuthService(client: client)
    self.jobsService = JobsService(client: client)
    self.contentService = ContentService(client: client)
    self.aiInterviewService = AiInterviewService(client: client)
    self.messagingService = MessagingService(client: client)
    self.assessmentService = AssessmentService(client: client)
    self.appUpdateService = AppUpdateService(client: client)
    self.verificationService = VerificationService(client: client)
    self.userService = UserService(client: client)
    self.runtimeConfigService = RuntimeConfigService(client: client)

    self.authToken = authStore.loadToken()
    self.currentUser = authStore.loadUser()
    
    // 监听 401 未授权错误
    NotificationCenter.default.addObserver(
      forName: .apiUnauthorized,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        self?.handleUnauthorized()
      }
    }
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  var isLoggedIn: Bool {
    authToken != nil
  }
  
  /// 是否应该隐藏底栏
  var shouldHideBottomBar: Bool {
    AppRoute.shouldHideBottomBar(for: currentRoute, isLoggedIn: isLoggedIn)
  }
  
  /// AI 按钮是否选中
  var isAiSelected: Bool {
    AppRoute.isAiRoute(currentRoute)
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
  
  /// 处理未授权错误
  private func handleUnauthorized() {
    signOut()
    // 可以在这里触发导航到登录页
  }
  
  /// 更新当前路由
  func updateRoute(_ route: AppRoute) {
    currentRoute = route
    if let tab = AppRoute.routeToTabIndex(route) {
      selectedTab = tab
    }
  }
  
  // AuthStore 代理方法
  var interviewGuideSeen: Bool {
    get { authStore.interviewGuideSeen }
    set { authStore.interviewGuideSeen = newValue }
  }
  
  var lastAiJobId: String? {
    get { authStore.lastAiJobId }
    set { authStore.lastAiJobId = newValue }
  }
  
  var lastAiCategoryId: String? {
    get { authStore.lastAiCategoryId }
    set { authStore.lastAiCategoryId = newValue }
  }
  
  func setLastAiJobSelection(jobId: String?, categoryId: String?) {
    authStore.setLastAiJobSelection(jobId: jobId, categoryId: categoryId)
  }
}
