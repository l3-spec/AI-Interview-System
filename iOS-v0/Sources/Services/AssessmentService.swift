import Foundation

@MainActor
final class AssessmentService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func getCategories() async throws -> [AssessmentCategory] {
    try await client.get("assessments/categories")
  }

  func getAssessments(categoryId: String, page: Int = 1, pageSize: Int = 20) async throws -> PagedData<Assessment> {
    try await client.get("assessments/categories/\(categoryId)/assessments", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ])
  }

  func getAssessmentDetail(id: String) async throws -> AssessmentDetail {
    try await client.get("assessments/\(id)")
  }

  func submitAssessment(id: String, request: SubmitAssessmentRequest) async throws -> AssessmentResult {
    try await client.post("assessments/\(id)/submit", body: request)
  }

  func getUserRecords(userId: String, page: Int = 1, pageSize: Int = 20) async throws -> PagedData<UserAssessmentRecord> {
    try await client.get("assessments/records/user/\(userId)", query: [
      URLQueryItem(name: "page", value: "\(page)"),
      URLQueryItem(name: "pageSize", value: "\(pageSize)")
    ], authorized: true)
  }
}
