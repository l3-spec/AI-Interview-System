import Foundation

/// 应用导航路由定义 - 对齐 Android Routes
enum AppRoute: Hashable {
  // 主要标签页
  case home
  case jobs
  case circle
  case profile
  
  // 认证
  case login
  case register
  
  // 职岗相关
  case jobDetail(String) // jobId
  case company(String) // companyId
  case editIntention
  case jobSelection
  
  // AI 面试相关
  case ai
  case guide(position: String, category: String)
  case prep(position: String)
  case session(String) // sessionId
  case digitalInterview
  case interviewComplete
  
  // 职圈相关
  case createPost
  case circleTopic(topicId: String, topicTitle: String)
  case postDetail(String) // postId
  case content(String) // contentId
  
  // 个人中心相关
  case profileSettings
  case profileMyPosts
  case profileMessages(filter: String?)
  case profileMessageDetail(String) // messageId
  case profileMessageCompose
  case profileVerification
  case profileAssessments
  case profileAssessmentCategory(categoryId: String, categoryName: String)
  case profileAssessmentTake(String) // assessmentId
  case profileAssessmentResult
  case profileResumeReport
  case profileContact
  case profilePersonalInfo
  case profilePrivacy
  case profileJobFavorites
  case profilePostFavorites
  case profileDeliveries(String) // status
  
  /// 判断是否应该隐藏底栏
  static func shouldHideBottomBar(for route: AppRoute, isLoggedIn: Bool) -> Bool {
    switch route {
    case .home, .jobs, .circle:
      return false
    case .profile:
      return !isLoggedIn
    case .login, .register,
         .createPost,
         .editIntention,
         .ai,
         .digitalInterview,
         .interviewComplete,
         .jobDetail,
         .company,
         .postDetail,
         .content,
         .circleTopic,
         .guide,
         .prep,
         .session:
      return true
    default:
      return false
    }
  }
  
  /// 判断是否是 AI 相关路由
  static func isAiRoute(_ route: AppRoute) -> Bool {
    switch route {
    case .ai, .guide, .prep, .session, .digitalInterview:
      return true
    default:
      return false
    }
  }
  
  /// 将路由转换为标签索引
  static func routeToTabIndex(_ route: AppRoute) -> AppTab? {
    switch route {
    case .home, .content:
      return .home
    case .jobs, .editIntention, .jobDetail, .company, .jobSelection:
      return .jobs
    case .circle, .circleTopic, .createPost, .postDetail:
      return .circle
    case .profile:
      return .profile
    default:
      return nil
    }
  }
}


