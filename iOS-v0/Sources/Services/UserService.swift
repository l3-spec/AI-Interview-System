import Foundation

/// 用户资料与字典服务 - 对齐 Android UserRepository + ApiService.users/region
@MainActor
final class UserService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  /// 更新个人资料
  func updateProfile(_ request: UpdateProfileRequest) async throws -> User {
    try await client.put("users/profile", body: request, authorized: true)
  }

  /// 上传头像（multipart）
  func uploadAvatar(data: Data, filename: String = "avatar.jpg") async throws -> User {
    try await client.upload(
      "users/avatar",
      fields: [:],
      files: [MultipartFile(name: "avatar", filename: filename, data: data, contentType: "image/jpeg")],
      authorized: true
    )
  }

  /// 获取地区字典树
  func getRegionTree() async throws -> [RegionDictionaryItem] {
    try await client.get("region-dictionary/tree")
  }
}
