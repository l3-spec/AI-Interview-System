import Foundation

@MainActor
final class AppUpdateService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func latest(platform: String = "IOS", currentVersionCode: Int? = nil) async throws -> AppVersionInfo {
    var query: [URLQueryItem] = [
      URLQueryItem(name: "platform", value: platform)
    ]
    if let currentVersionCode {
      query.append(.init(name: "currentVersionCode", value: "\(currentVersionCode)"))
    }
    return try await client.get("public/app-version", query: query)
  }
}
