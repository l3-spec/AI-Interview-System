import Foundation

final class AuthStore {
  private let tokenKey = "aiinterview.token"
  private let userKey = "aiinterview.user"
  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  func loadToken() -> String? {
    defaults.string(forKey: tokenKey)
  }

  func save(token: String?) {
    if let token {
      defaults.set(token, forKey: tokenKey)
    } else {
      defaults.removeObject(forKey: tokenKey)
    }
  }

  func loadUser() -> User? {
    guard
      let data = defaults.data(forKey: userKey),
      let user = try? JSONDecoder().decode(User.self, from: data)
    else { return nil }
    return user
  }

  func save(user: User?) {
    guard let user else {
      defaults.removeObject(forKey: userKey)
      return
    }
    if let data = try? JSONEncoder().encode(user) {
      defaults.set(data, forKey: userKey)
    }
  }
}
