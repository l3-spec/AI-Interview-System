import Foundation

// MARK: - 首页信息流枚举（对齐 Android HomeFeedType / HomeFeedTargetType）
enum HomeFeedType: String, Codable, Sendable {
  case hotPost = "hot_post"
  case hotCompany = "hot_company"
  case hotJob = "hot_job"
}

enum HomeFeedTargetType: String, Codable, Sendable {
  case post
  case company
  case job
}

// MARK: - 首页混排卡片（严格对齐 Android HomeFeedItem）
struct HomeFeedItem: Codable, Identifiable, Sendable {
  let id: String
  let type: HomeFeedType
  let targetType: HomeFeedTargetType
  let targetId: String
  let title: String
  let summary: String?
  let imageUrl: String?
  let tags: [String]
  let authorName: String
  let authorAvatar: String?
  let badge: String
  let metricLabel: String?
  let metricValue: String?
  let createdAt: String?
}

// MARK: - 用户帖子
struct UserPost: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let content: String
  let coverImage: String?
  /// 服务端偶尔返回 null，统一走 optional
  let images: [String]?
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

// MARK: - 大咖分享
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

// MARK: - 推广职位
struct PromotedJob: Codable, Identifiable, Sendable {
  var id: String { promotionId }
  let promotionId: String
  let promotionType: String // NORMAL | PREMIUM | FEATURED
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

// MARK: - Banner
struct Banner: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let subtitle: String
  let description: String
  let imageUrl: String
  let linkType: String? // post | assessment | company
  let linkId: String?
}

// MARK: - 首页精选文章
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

// MARK: - 互动状态
struct PostEngagement: Codable, Sendable {
  let postId: String
  let postType: String
  let likeCount: Int
  let commentCount: Int
  let favoriteCount: Int
  let isLiked: Bool
  let isFavorited: Bool
}

// MARK: - 评论
struct PostCommentAuthor: Codable, Identifiable, Hashable, Sendable {
  let id: String?
  let name: String?
  let avatar: String?
}

struct PostComment: Codable, Identifiable, Sendable {
  let id: String
  let content: String
  let createdAt: String
  let author: PostCommentAuthor
  let parentId: String?
  let replyToUserId: String?
  let replyToUserName: String?
  let likeCount: Int?
  let replyCount: Int?
  let isLiked: Bool?
  let reactions: [String: Int]?
  let replies: [PostComment]?
}

struct CreatePostCommentRequest: Encodable, Sendable {
  let content: String
  let parentId: String?
  let replyToUserId: String?
}

struct CreatePostCommentResult: Decodable, Sendable {
  let comment: PostComment?
  let engagement: PostEngagement?
}

struct CommentReactionRequest: Encodable, Sendable {
  let emoji: String
}

struct CommentReactionResult: Decodable, Sendable {
  let comment: PostComment?
  let added: Bool?
}
