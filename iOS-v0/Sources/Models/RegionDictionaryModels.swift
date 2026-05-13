import Foundation

/// 地区字典 - 对齐 Android RegionDictionaryItem
struct RegionDictionaryItem: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let code: String?
  let name: String
  let level: Int
  let parentId: String?
  let sortOrder: Int
  let isActive: Bool
  let children: [RegionDictionaryItem]
}
