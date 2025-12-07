import Foundation

enum ContentType: String, Decodable, Sendable {
  case assessment = "ASSESSMENT"
  case userPost = "USER_POST"
  case expertPost = "EXPERT_POST"
  case promotedJob = "PROMOTED_JOB"
}

struct HomeFeedItem: Decodable, Identifiable, Sendable {
  let type: ContentType
  let id: String
  let payload: JSONValue

  enum CodingKeys: String, CodingKey {
    case type, id, data
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    type = try container.decode(ContentType.self, forKey: .type)
    id = try container.decode(String.self, forKey: .id)
    payload = try container.decode(JSONValue.self, forKey: .data)
  }
}

struct UserPost: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let content: String
  let coverImage: String?
  let images: [String]
  let tags: [String]
  let viewCount: Int
  let likeCount: Int
  let commentCount: Int
  let shareCount: Int?
  let createdAt: String
  let author: UserPostAuthor?
}

struct UserPostAuthor: Codable, Identifiable, Hashable, Sendable {
  let id: String?
  let name: String?
  let avatar: String?
  let headline: String?
}

struct ExpertPost: Codable, Identifiable, Sendable {
  let id: String
  let expertName: String
  let expertTitle: String
  let expertCompany: String
  let expertAvatar: String?
  let title: String
  let content: String
  let coverImage: String?
  let tags: [String]
  let viewCount: Int
  let likeCount: Int
  let commentCount: Int?
  let publishedAt: String?
}

struct PromotedJob: Codable, Identifiable, Sendable {
  var id: String { promotionId }
  let promotionId: String
  let promotionType: String
  let job: JobInfo
}

struct JobInfo: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let salary: String?
  let location: String?
  let skills: [String]
  let company: CompanyInfo
}

struct CompanyInfo: Codable, Identifiable, Sendable {
  let id: String
  let name: String
  let logo: String?
  let industry: String?
}

struct Banner: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let subtitle: String
  let description: String
  let imageUrl: String
  let linkType: String?
  let linkId: String?
}

struct HomeFeaturedArticle: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let summary: String?
  let imageUrl: String
  let author: String?
  let tags: [String]
  let viewCount: Int
  let category: String?
  let createdAt: String?
}
