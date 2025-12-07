import Foundation

struct APIConfig: Sendable {
  let baseURL: URL
  let websocketBaseURL: URL

  static func load(environment: [String: String] = ProcessInfo.processInfo.environment) -> APIConfig {
    let fallbackBase = "http://192.168.1.7:3001/api/"
    let rawBase = environment["API_BASE_URL"] ?? environment["AI_API_BASE_URL"] ?? fallbackBase
    let normalizedBase = APIConfig.ensureTrailingSlash(rawBase)
    let wsRaw = environment["API_WS_URL"] ?? normalizedBase
    let normalizedWs = APIConfig.trimTrailingSlashes(wsRaw.replacingOccurrences(of: "/api", with: ""))

    return APIConfig(
      baseURL: URL(string: normalizedBase)!,
      websocketBaseURL: URL(string: normalizedWs)!
    )
  }

  private static func ensureTrailingSlash(_ url: String) -> String {
    url.hasSuffix("/") ? url : "\(url)/"
  }

  private static func trimTrailingSlashes(_ url: String) -> String {
    var result = url
    while result.hasSuffix("/") { result.removeLast() }
    return result
  }
}
