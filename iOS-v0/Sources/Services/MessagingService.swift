import Foundation

@MainActor
final class MessagingService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func getMessages(page: Int = 1, pageSize: Int = 20, type: String? = nil, status: String? = nil) async throws -> PagedData<MessageSummary> {
    var query: [URLQueryItem] = [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ]
    if let type { query.append(.init(name: "type", value: type)) }
    if let status { query.append(.init(name: "status", value: status)) }
    return try await client.get("messages", query: query, authorized: true)
  }

  func getMessageDetail(id: String) async throws -> MessageDetail {
    try await client.get("messages/\(id)", authorized: true)
  }

  func createMessage(request: CreateMessageRequest) async throws -> MessageDetail {
    try await client.post("messages", body: request, authorized: true)
  }

  func reply(messageId: String, request: ReplyMessageRequest) async throws -> MessageEntry {
    try await client.post("messages/\(messageId)/reply", body: request, authorized: true)
  }

  func markRead(id: String) async throws -> MessageReadResponse {
    try await client.patch("messages/\(id)/read", body: EmptyResponse(), authorized: true)
  }
}
