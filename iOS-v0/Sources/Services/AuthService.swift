import Foundation

@MainActor
final class AuthService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func requestLoginCode(phone: String) async throws -> LoginCodeData {
    try await client.post("auth/login/user/code", body: SendCodeRequest(phone: phone))
  }

  func login(phone: String, code: String) async throws -> LoginData {
    try await client.post("auth/login/user", body: LoginRequest(phone: phone, code: code))
  }

  func register(request: RegisterRequest) async throws -> RegisterData {
    try await client.post("auth/register/user", body: request)
  }

  func me() async throws -> User {
    try await client.get("auth/me", authorized: true)
  }

  func logout() async throws {
    _ = try await client.post("auth/logout", body: EmptyResponse(), authorized: true) as EmptyResponse
  }
}
