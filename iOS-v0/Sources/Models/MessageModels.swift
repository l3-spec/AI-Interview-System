import Foundation

struct MessageSummary: Decodable, Identifiable, Sendable {
  let id: String
  let title: String
  let summary: String?
  let type: String
  let status: String
  let unreadCount: Int
  let lastActivityAt: String
  let lastReadAt: String?
  let createdAt: String
  let updatedAt: String
  let latestEntry: MessageEntry?
}

struct MessageDetail: Decodable, Identifiable, Sendable {
  let id: String
  let title: String
  let summary: String?
  let type: String
  let status: String
  let unreadCount: Int
  let lastActivityAt: String
  let lastReadAt: String?
  let createdAt: String
  let updatedAt: String
  let entries: [MessageEntry]
}

struct MessageEntry: Decodable, Identifiable, Hashable, Sendable {
  let id: String
  let senderType: String
  let senderId: String?
  let senderName: String?
  let content: String
  let metadata: [String: JSONValue]?
  let createdAt: String
}

struct CreateMessageRequest: Encodable, Sendable {
  let title: String
  let content: String
  let type: String?
}

struct ReplyMessageRequest: Encodable, Sendable {
  let content: String
  let metadata: [String: JSONValue]?
}

struct MessageReadResponse: Decodable, Sendable {
  let id: String
  let status: String
  let unreadCount: Int
  let lastReadAt: String?
}
