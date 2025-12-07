import Foundation

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

struct User: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let email: String
  let name: String?
  let avatar: String?
  let phone: String?
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
