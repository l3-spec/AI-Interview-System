import Foundation

// MARK: - 请求
struct LoginRequest: Encodable, Sendable {
  let phone: String
  let code: String
}

struct SendCodeRequest: Encodable, Sendable {
  let phone: String
}

struct RegisterRequest: Encodable, Sendable {
  let email: String
  let password: String
  let name: String
  let phone: String?
}

/// 更新个人资料 - 对齐 Android `UpdateProfileRequest`
struct UpdateProfileRequest: Encodable, Sendable {
  var name: String?
  var avatar: String?
  var gender: String?
  var region: String?
  var phone: String?
  var signature: String?
  var openToCompanies: Bool?
  var autoPublish: Bool?
}

// MARK: - 实体
struct User: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let email: String
  let name: String?
  let avatar: String?
  let phone: String?
  /// 性别 - 对齐 Android User.gender
  let gender: String?
  /// 所在地区名称
  let region: String?
  /// 个性签名
  let signature: String?
  /// 是否开放企业查看（默认 true）
  let openToCompanies: Bool?
  /// 是否自动发布（默认 true）
  let autoPublish: Bool?
  /// 是否已实名认证
  let isVerified: Bool?
}

struct LoginData: Decodable, Sendable {
  let user: User
  let token: String
  let isNewUser: Bool?
}

struct RegisterData: Decodable, Sendable {
  let user: User
  let token: String
}

struct LoginCodeData: Decodable, Sendable {
  let expiresIn: Int
  let resendIn: Int
  let code: String?
}
