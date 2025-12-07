import Foundation

@MainActor
final class AiInterviewService {
  private let client: APIClient

  init(client: APIClient) {
    self.client = client
  }

  func createSession(request: CreateAiInterviewSessionRequest) async throws -> AiInterviewCreateSessionData {
    try await client.post("ai-interview/create-session", body: request, authorized: true)
  }

  func getSession(sessionId: String) async throws -> AiInterviewSessionDetail {
    try await client.get("ai-interview/session/\(sessionId)", authorized: true)
  }

  func nextQuestion(sessionId: String) async throws -> NextAiInterviewQuestionResponse {
    try await client.get("ai-interview/next-question/\(sessionId)", authorized: true)
  }

  func submitAnswer(_ request: AiInterviewSubmitAnswerRequest) async throws -> SubmitAiInterviewAnswerResponse {
    try await client.post("ai-interview/submit-answer", body: request, authorized: true)
  }

  func complete(sessionId: String) async throws -> SubmitAiInterviewAnswerResponse {
    try await client.post("ai-interview/complete/\(sessionId)", body: EmptyResponse(), authorized: true)
  }

  func history() async throws -> AiInterviewSessionsResponse {
    try await client.get("ai-interview/history", authorized: true)
  }
}
