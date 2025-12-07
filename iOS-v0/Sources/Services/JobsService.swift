import Foundation

@MainActor
final class JobsService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func getPublicJobs(
    page: Int = 1,
    pageSize: Int = 20,
    keyword: String? = nil,
    location: String? = nil,
    type: String? = nil,
    level: String? = nil,
    category: String? = nil,
    remoteOnly: Bool? = nil,
    sort: String? = nil,
    experience: String? = nil,
    education: String? = nil,
    dictionaryPositionIds: String? = nil
  ) async throws -> JobListResponse {
    var query: [URLQueryItem] = [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ]
    if let keyword { query.append(.init(name: "keyword", value: keyword)) }
    if let location { query.append(.init(name: "location", value: location)) }
    if let type { query.append(.init(name: "type", value: type)) }
    if let level { query.append(.init(name: "level", value: level)) }
    if let category { query.append(.init(name: "category", value: category)) }
    if let remoteOnly { query.append(.init(name: "remoteOnly", value: remoteOnly ? "true" : "false")) }
    if let sort { query.append(.init(name: "sort", value: sort)) }
    if let experience { query.append(.init(name: "experience", value: experience)) }
    if let education { query.append(.init(name: "education", value: education)) }
    if let dictionaryPositionIds { query.append(.init(name: "dictionaryPositionIds", value: dictionaryPositionIds)) }
    return try await client.get("public/jobs", query: query)
  }

  func getJobSections() async throws -> [JobSection] {
    try await client.get("public/jobs/sections")
  }

  func getJobDetail(id: String) async throws -> JobDetail {
    try await client.get("public/jobs/\(id)")
  }

  func getCompanyShowcases() async throws -> [CompanyShowcase] {
    try await client.get("public/companies/showcases")
  }

  func getCompanyProfile(id: String) async throws -> CompanyProfile {
    try await client.get("public/companies/\(id)")
  }

  func apply(jobId: String, message: String?) async throws -> JobApplication {
    try await client.post("public/jobs/\(jobId)/apply", body: JobApplicationRequest(message: message))
  }

  func getPreferences() async throws -> JobPreference {
    try await client.get("job-preferences", authorized: true)
  }

  func updatePreferences(positionIds: [String]) async throws -> JobPreference {
    try await client.put("job-preferences", body: UpdateJobPreferencesRequest(positionIds: positionIds), authorized: true)
  }

  func getJobDictionary() async throws -> [JobDictionaryCategory] {
    try await client.get("job-dictionary")
  }
}
