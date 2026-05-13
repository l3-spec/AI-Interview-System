import Foundation

enum HTTPMethod: String {
  case get = "GET"
  case post = "POST"
  case put = "PUT"
  case patch = "PATCH"
  case delete = "DELETE"
}

struct ApiEnvelope<T: Decodable & Sendable>: Decodable, Sendable {
  let success: Bool?
  let data: T?
  let total: Int?
  let message: String?
  let error: String?
}

struct ApiResponseMessage: Decodable, Sendable {
  let success: Bool?
  let message: String?
  let error: String?
}

struct EmptyResponse: Codable, Sendable {}

struct MultipartFile: Sendable {
  let name: String
  let filename: String
  let data: Data
  let contentType: String
}

enum APIError: LocalizedError {
  case invalidURL
  case server(code: Int, message: String)
  case decodingFailed(String)
  case unknown

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "无法构建请求地址"
    case .server(_, let message):
      return message
    case .decodingFailed(let message):
      return "解析失败: \(message)"
    case .unknown:
      return "未知错误"
    }
  }
}

@MainActor
final class APIClient {
  private let config: APIConfig
  private let tokenProvider: () -> String?
  private let session: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder

  init(
    config: APIConfig,
    session: URLSession = .shared,
    tokenProvider: @escaping () -> String?
  ) {
    self.config = config
    self.session = session
    self.tokenProvider = tokenProvider

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    self.decoder = decoder

    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .useDefaultKeys
    self.encoder = encoder
  }

  func get<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = [], authorized: Bool = false) async throws -> T {
    try await request(path, method: .get, query: query, body: nil, authorized: authorized)
  }

  func post<T: Decodable & Sendable, Body: Encodable & Sendable>(_ path: String, body: Body, authorized: Bool = false) async throws -> T {
    let data = try encoder.encode(body)
    return try await request(path, method: .post, query: [], body: data, authorized: authorized)
  }

  func put<T: Decodable & Sendable, Body: Encodable & Sendable>(_ path: String, body: Body, authorized: Bool = false) async throws -> T {
    let data = try encoder.encode(body)
    return try await request(path, method: .put, query: [], body: data, authorized: authorized)
  }

  func patch<T: Decodable & Sendable, Body: Encodable & Sendable>(_ path: String, body: Body, authorized: Bool = false) async throws -> T {
    let data = try encoder.encode(body)
    return try await request(path, method: .patch, query: [], body: data, authorized: authorized)
  }

  /// DELETE 无请求体
  func delete<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = [], authorized: Bool = false) async throws -> T {
    try await request(path, method: .delete, query: query, body: nil, authorized: authorized)
  }

  /// DELETE 带请求体
  func delete<T: Decodable & Sendable, Body: Encodable & Sendable>(_ path: String, body: Body, authorized: Bool = false) async throws -> T {
    let data = try encoder.encode(body)
    return try await request(path, method: .delete, query: [], body: data, authorized: authorized)
  }

  /// PATCH 无请求体
  func patchEmpty<T: Decodable & Sendable>(_ path: String, authorized: Bool = false) async throws -> T {
    try await request(path, method: .patch, query: [], body: nil, authorized: authorized)
  }

  func request<T: Decodable & Sendable>(
    _ path: String,
    method: HTTPMethod,
    query: [URLQueryItem] = [],
    body: Data?,
    authorized: Bool = false
  ) async throws -> T {
    guard let url = buildURL(path: path, query: query) else { throw APIError.invalidURL }

    var request = URLRequest(url: url)
    request.httpMethod = method.rawValue
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if authorized, let token = tokenProvider() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    if let body {
      request.httpBody = body
    }

    return try await perform(request: request)
  }

  func upload<T: Decodable & Sendable>(
    _ path: String,
    method: HTTPMethod = .post,
    fields: [String: String],
    files: [MultipartFile],
    authorized: Bool = false
  ) async throws -> T {
    guard let url = buildURL(path: path, query: []) else { throw APIError.invalidURL }

    let boundary = "Boundary-\(UUID().uuidString)"
    var request = URLRequest(url: url)
    request.httpMethod = method.rawValue
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if authorized, let token = tokenProvider() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    request.httpBody = buildMultipartBody(boundary: boundary, fields: fields, files: files)

    return try await perform(request: request)
  }

  private func buildURL(path: String, query: [URLQueryItem]) -> URL? {
    let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
    var components = URLComponents(url: config.baseURL.appendingPathComponent(trimmed), resolvingAgainstBaseURL: false)
    if !query.isEmpty {
      components?.queryItems = query
    }
    return components?.url
  }

  private func perform<T: Decodable & Sendable>(request: URLRequest) async throws -> T {
    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse else { throw APIError.unknown }
    
    // 处理 401 未授权错误
    if http.statusCode == 401 {
      // 通知上层清理本地凭据，触发重新登录
      NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
      if let apiMessage = try? decoder.decode(ApiResponseMessage.self, from: data),
         let message = apiMessage.message ?? apiMessage.error {
        throw APIError.server(code: http.statusCode, message: message)
      }
      throw APIError.server(code: http.statusCode, message: "身份验证失败，请重新登录")
    }
    
    guard 200..<300 ~= http.statusCode else {
      if let apiMessage = try? decoder.decode(ApiResponseMessage.self, from: data),
         let message = apiMessage.message ?? apiMessage.error {
        throw APIError.server(code: http.statusCode, message: message)
      }
      throw APIError.server(code: http.statusCode, message: "请求失败(\(http.statusCode))")
    }

    if let decoded = try? decoder.decode(T.self, from: data) {
      return decoded
    }

    if let envelope = try? decoder.decode(ApiEnvelope<T>.self, from: data) {
      if let value = envelope.data {
        return value
      }
      if T.self == EmptyResponse.self {
        return EmptyResponse() as! T
      }
      let message = envelope.message ?? envelope.error ?? "未知错误"
      throw APIError.server(code: http.statusCode, message: message)
    }

    let raw = String(data: data, encoding: .utf8) ?? ""
    throw APIError.decodingFailed(raw)
  }

  private func buildMultipartBody(boundary: String, fields: [String: String], files: [MultipartFile]) -> Data {
    var body = Data()
    let lineBreak = "\r\n"

    for (name, value) in fields {
      body.append("--\(boundary)\(lineBreak)")
      body.append("Content-Disposition: form-data; name=\"\(name)\"\(lineBreak)\(lineBreak)")
      body.append("\(value)\(lineBreak)")
    }

    for file in files {
      body.append("--\(boundary)\(lineBreak)")
      body.append("Content-Disposition: form-data; name=\"\(file.name)\"; filename=\"\(file.filename)\"\(lineBreak)")
      body.append("Content-Type: \(file.contentType)\(lineBreak)\(lineBreak)")
      body.append(file.data)
      body.append(lineBreak)
    }

    body.append("--\(boundary)--\(lineBreak)")
    return body
  }
}

private extension Data {
  mutating func append(_ string: String) {
    if let data = string.data(using: .utf8) {
      append(data)
    }
  }
}

extension Notification.Name {
  static let apiUnauthorized = Notification.Name("apiUnauthorized")
}
