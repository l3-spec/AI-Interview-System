import Foundation

struct PagedData<T: Decodable & Sendable>: Decodable, Sendable {
  let list: [T]
  let total: Int
  let page: Int
  let pageSize: Int
  let hasMore: Bool
}
