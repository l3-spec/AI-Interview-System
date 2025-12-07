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
}
