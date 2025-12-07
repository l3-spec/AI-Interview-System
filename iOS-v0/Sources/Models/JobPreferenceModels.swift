import Foundation

struct JobPreference: Codable, Sendable {
  let positions: [JobPreferencePosition]
}

struct JobPreferencePosition: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let code: String
  let name: String
  let categoryId: String?
  let categoryName: String?
  let sortOrder: Int
}

struct UpdateJobPreferencesRequest: Encodable, Sendable {
  let positionIds: [String]
}
