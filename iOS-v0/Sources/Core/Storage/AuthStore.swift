import Foundation

/// 认证存储管理器 - 对齐 Android AuthManager 功能
/// 支持 JWT token 过期检查、面试引导状态、最后选择的 AI 岗位等
final class AuthStore {
  private let tokenKey = "aiinterview.token"
  private let userKey = "aiinterview.user"
  private let interviewGuideSeenKey = "aiinterview.interview_guide_seen"
  private let lastAiJobIdKey = "aiinterview.last_ai_job_id"
  private let lastAiCategoryIdKey = "aiinterview.last_ai_category_id"
  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  /// 加载 token，自动检查过期并清理
  func loadToken() -> String? {
    guard let token = defaults.string(forKey: tokenKey), !token.isEmpty else {
      return nil
    }
    
    // 检查 JWT 是否过期
    if isJwtExpired(token) {
      // 清理过期 token，避免携带失效身份导致 401
      clear()
      return nil
    }
    
    return token
  }

  func save(token: String?) {
    if let token {
      defaults.set(token, forKey: tokenKey)
    } else {
      defaults.removeObject(forKey: tokenKey)
    }
  }

  func loadUser() -> User? {
    guard
      let data = defaults.data(forKey: userKey),
      let user = try? JSONDecoder().decode(User.self, from: data)
    else { return nil }
    return user
  }

  func save(user: User?) {
    guard let user else {
      defaults.removeObject(forKey: userKey)
      return
    }
    if let data = try? JSONEncoder().encode(user) {
      defaults.set(data, forKey: userKey)
    }
  }
  
  /// 是否已看过面试引导
  var interviewGuideSeen: Bool {
    get {
      defaults.bool(forKey: interviewGuideSeenKey)
    }
    set {
      defaults.set(newValue, forKey: interviewGuideSeenKey)
    }
  }
  
  /// 最后选择的 AI 岗位 ID
  var lastAiJobId: String? {
    get {
      defaults.string(forKey: lastAiJobIdKey)
    }
    set {
      if let value = newValue {
        defaults.set(value, forKey: lastAiJobIdKey)
      } else {
        defaults.removeObject(forKey: lastAiJobIdKey)
      }
    }
  }
  
  /// 最后选择的 AI 岗位分类 ID
  var lastAiCategoryId: String? {
    get {
      defaults.string(forKey: lastAiCategoryIdKey)
    }
    set {
      if let value = newValue {
        defaults.set(value, forKey: lastAiCategoryIdKey)
      } else {
        defaults.removeObject(forKey: lastAiCategoryIdKey)
      }
    }
  }
  
  /// 设置最后选择的 AI 岗位
  func setLastAiJobSelection(jobId: String?, categoryId: String?) {
    lastAiJobId = jobId
    lastAiCategoryId = categoryId
  }
  
  /// 清空所有认证信息
  func clear() {
    defaults.removeObject(forKey: tokenKey)
    defaults.removeObject(forKey: userKey)
    // 注意：不清空 interviewGuideSeen 和 lastAiJobId，这些是用户偏好设置
  }
  
  /// 简单解析 JWT 过期时间，过期则返回 true。解析失败时默认认为未过期，避免误删。
  private func isJwtExpired(_ token: String) -> Bool {
    let parts = token.split(separator: ".")
    guard parts.count >= 2 else { return false }
    
    guard let payloadData = Data(base64Encoded: String(parts[1]).base64URLDecoded),
          let json = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
          let expSeconds = json["exp"] as? TimeInterval,
          expSeconds > 0 else {
      return false
    }
    
    let currentSeconds = Date().timeIntervalSince1970
    return currentSeconds >= expSeconds
  }
}

private extension String {
  /// Base64 URL 解码（将 - 替换为 +，_ 替换为 /）
  var base64URLDecoded: String {
    var base64 = self
      .replacingOccurrences(of: "-", with: "+")
      .replacingOccurrences(of: "_", with: "/")
    
    // 补齐 padding
    let remainder = base64.count % 4
    if remainder > 0 {
      base64.append(String(repeating: "=", count: 4 - remainder))
    }
    
    return base64
  }
}
