import Foundation

struct JobDictionaryCategory: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let code: String
  let name: String
  let description: String?
  let sortOrder: Int
  let isActive: Bool
  let positions: [JobDictionaryPosition]
}

struct JobDictionaryPosition: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let categoryId: String
  let code: String
  let name: String
  let description: String?
  let sortOrder: Int
  let isActive: Bool
  let tags: [String]
}
