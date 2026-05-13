import Foundation

/// 企业/个人实名认证服务 - 对齐 Android VerificationRepository + ApiService.verification*
@MainActor
final class VerificationService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  /// 获取企业认证状态
  func getStatus() async throws -> VerificationInfo? {
    try await client.get("verification/status", authorized: true)
  }

  /// 提交/更新企业认证（营业执照 + 法人 + 统一社会信用代码）
  func submitEnterprise(legalPerson: String, registrationNumber: String, businessLicense: Data?) async throws -> VerificationInfo {
    var files: [MultipartFile] = []
    if let businessLicense {
      files.append(MultipartFile(name: "businessLicense",
                                 filename: "license.jpg",
                                 data: businessLicense,
                                 contentType: "image/jpeg"))
    }
    return try await client.upload(
      "verification/submit",
      fields: [
        "legalPerson": legalPerson,
        "registrationNumber": registrationNumber
      ],
      files: files,
      authorized: true
    )
  }

  /// 提交个人实名认证
  func submitPersonal(_ request: PersonalVerificationRequest) async throws {
    let _: ApiResponseMessage = try await client.post("verification/personal", body: request, authorized: true)
  }

  /// 发送实名认证验证码（复用登录短信通道）
  func sendVerificationCode(phone: String) async throws {
    let _: ApiResponseMessage = try await client.post("auth/login/user/code", body: SendCodeRequest(phone: phone))
  }
}
