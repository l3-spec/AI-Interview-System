import Foundation

/// 企业实名认证 / 个人实名认证模型 - 对齐 Android VerificationModels

// MARK: - 企业认证信息
struct VerificationInfo: Codable, Sendable {
  let id: String?
  let status: String?
  let legalPerson: String?
  let registrationNumber: String?
  let businessLicense: String?
  let reviewComments: String?
  let reviewedAt: String?
  let createdAt: String?
  let updatedAt: String?
}

// MARK: - 认证状态
enum VerificationStatusType: String, Sendable {
  case notSubmitted = "NOT_SUBMITTED"
  case pending = "PENDING"
  case approved = "APPROVED"
  case rejected = "REJECTED"

  /// 根据后端原始字符串映射；空值/未知值回退为未提交
  static func fromStatus(_ raw: String?) -> VerificationStatusType {
    switch raw?.uppercased() {
    case "APPROVED": return .approved
    case "REJECTED": return .rejected
    case "PENDING": return .pending
    default: return .notSubmitted
    }
  }
}

// MARK: - 个人实名认证请求
struct PersonalVerificationRequest: Encodable, Sendable {
  let realName: String
  let idNumber: String
  let phone: String
  let code: String
}
