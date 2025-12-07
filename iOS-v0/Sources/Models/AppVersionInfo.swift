import Foundation

struct AppVersionInfo: Decodable, Sendable {
  let id: String
  let platform: String
  let versionName: String
  let versionCode: Int
  let downloadUrl: String
  let releaseNotes: String?
  let isMandatory: Bool
  let isActive: Bool
  let shouldUpdate: Bool
  let forceUpdate: Bool
}
