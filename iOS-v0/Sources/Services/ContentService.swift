import Foundation

@MainActor
final class ContentService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func getHomeFeed(page: Int = 1, pageSize: Int = 20) async throws -> PagedData<HomeFeedItem> {
    try await client.get("home/feed", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  func getBanners() async throws -> [Banner] {
    try await client.get("home/banners")
  }

  func getFeaturedArticles(page: Int = 1, pageSize: Int = 20) async throws -> PagedData<HomeFeaturedArticle> {
    try await client.get("home/featured-articles", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  func getUserPosts(page: Int = 1, pageSize: Int = 20, isHot: Bool? = nil) async throws -> PagedData<UserPost> {
    var query = [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ]
    if let isHot {
      query.append(URLQueryItem(name: "isHot", value: isHot ? "true" : "false"))
    }
    return try await client.get("content/posts", query: query)
  }

  func getMyPosts(page: Int = 1, pageSize: Int = 20) async throws -> PagedData<UserPost> {
    try await client.get("content/my-posts", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ], authorized: true)
  }

  func getUserPostDetail(id: String) async throws -> UserPost {
    try await client.get("content/posts/\(id)")
  }

  func getExpertPosts(page: Int = 1, pageSize: Int = 20) async throws -> PagedData<ExpertPost> {
    try await client.get("content/expert-posts", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  func getExpertPostDetail(id: String) async throws -> ExpertPost {
    try await client.get("content/expert-posts/\(id)")
  }

  func getPromotedJobs(page: Int = 1, pageSize: Int = 10) async throws -> PagedData<PromotedJob> {
    try await client.get("content/promoted-jobs", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  func recordPromotedJobClick(id: String) async throws {
    let _: ApiResponseMessage = try await client.post("content/promoted-jobs/\(id)/click", body: EmptyResponse())
  }

  func createUserPost(title: String, content: String, tags: [String], images: [Data] = []) async throws -> UserPost {
    let fields: [String: String] = [
      "title": title,
      "content": content,
      "tags": String(data: try JSONEncoder().encode(tags), encoding: .utf8) ?? "[]"
    ]

    let files: [MultipartFile] = images.enumerated().map { index, data in
      MultipartFile(
        name: "postImages",
        filename: "post-\(index + 1).jpg",
        data: data,
        contentType: "image/jpeg"
      )
    }

    return try await client.upload(
      "content/posts",
      fields: fields,
      files: files,
      authorized: true
    )
  }

  // MARK: - 互动（赞 / 收藏 / 评论）- 对齐 Android ApiService 内容社区的 engagement/comments/like/favorite

  /// 获取用户帖子互动状态
  func getUserPostEngagement(id: String) async throws -> PostEngagement {
    try await client.get("content/posts/\(id)/engagement", authorized: true)
  }

  /// 获取用户帖子评论列表
  func getUserPostComments(id: String) async throws -> [PostComment] {
    try await client.get("content/posts/\(id)/comments")
  }

  /// 创建用户帖子评论
  func createUserPostComment(id: String, request: CreatePostCommentRequest) async throws -> CreatePostCommentResult {
    try await client.post("content/posts/\(id)/comments", body: request, authorized: true)
  }

  /// 赞 / 取消赞用户帖子
  func likeUserPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.post("content/posts/\(id)/like", body: EmptyResponse(), authorized: true)
    return try await getUserPostEngagement(id: id)
  }

  func unlikeUserPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.delete("content/posts/\(id)/like", authorized: true)
    return try await getUserPostEngagement(id: id)
  }

  /// 收藏 / 取消收藏用户帖子
  func favoriteUserPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.post("content/posts/\(id)/favorite", body: EmptyResponse(), authorized: true)
    return try await getUserPostEngagement(id: id)
  }

  func unfavoriteUserPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.delete("content/posts/\(id)/favorite", authorized: true)
    return try await getUserPostEngagement(id: id)
  }

  /// 删除我的帖子
  func deleteMyPost(id: String) async throws {
    let _: ApiResponseMessage = try await client.delete("content/posts/\(id)", authorized: true)
  }

  // MARK: - 大咖分享
  func getExpertPostEngagement(id: String) async throws -> PostEngagement {
    try await client.get("content/expert-posts/\(id)/engagement", authorized: true)
  }

  func getExpertPostComments(id: String) async throws -> [PostComment] {
    try await client.get("content/expert-posts/\(id)/comments")
  }

  func createExpertPostComment(id: String, request: CreatePostCommentRequest) async throws -> CreatePostCommentResult {
    try await client.post("content/expert-posts/\(id)/comments", body: request, authorized: true)
  }

  func likeExpertPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.post("content/expert-posts/\(id)/like", body: EmptyResponse(), authorized: true)
    return try await getExpertPostEngagement(id: id)
  }

  func unlikeExpertPost(id: String) async throws -> PostEngagement {
    let _: EmptyResponse = try await client.delete("content/expert-posts/\(id)/like", authorized: true)
    return try await getExpertPostEngagement(id: id)
  }

  // MARK: - 评论互动
  func likeComment(id: String) async throws -> PostComment {
    try await client.post("content/comments/\(id)/like", body: EmptyResponse(), authorized: true)
  }

  func unlikeComment(id: String) async throws -> PostComment {
    try await client.delete("content/comments/\(id)/like", authorized: true)
  }

  func addCommentReaction(id: String, emoji: String) async throws -> CommentReactionResult {
    try await client.post("content/comments/\(id)/reactions", body: CommentReactionRequest(emoji: emoji), authorized: true)
  }

  func removeCommentReaction(id: String, emoji: String) async throws -> CommentReactionResult {
    try await client.post("content/comments/\(id)/reactions/remove", body: CommentReactionRequest(emoji: emoji), authorized: true)
  }

  func getCommentReplies(id: String, page: Int = 1, pageSize: Int = 20) async throws -> PagedData<PostComment> {
    try await client.get("content/comments/\(id)/replies", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  // MARK: - 各模块 Banner
  func getCircleBanners() async throws -> [Banner] {
    try await client.get("circle/banners")
  }

  func getJobsBanners() async throws -> [Banner] {
    try await client.get("jobs/banners")
  }

  func getProfileBanners() async throws -> [Banner] {
    try await client.get("profile/banners")
  }
}
