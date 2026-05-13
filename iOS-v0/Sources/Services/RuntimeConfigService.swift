import Foundation

/// 客户端运行时配置服务 - 对齐 Android ClientRuntimeConfigRepository
@MainActor
final class RuntimeConfigService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  /// 获取服务端下发的运行时配置（失败时上层回退到本地默认值）
  func getConfig() async throws -> ClientRuntimeConfigDto {
    try await client.get("public/client-runtime-config")
  }
}
