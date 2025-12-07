import Foundation

struct CreateAiInterviewSessionRequest: Encodable, Sendable {
  let jobId: String?
  let jobTarget: String
  let jobCategory: String?
  let jobSubCategory: String?
  let companyTarget: String?
  let background: String?
  let questionCount: Int?
}

struct AiInterviewCreateSessionData: Decodable, Sendable {
  let jobId: String?
  let sessionId: String
  let jobTarget: String?
  let questions: [AiInterviewQuestion]
  let totalQuestions: Int
  let jobCategory: String?
  let jobSubCategory: String?
  let plannedDuration: Int?
  let prompt: String?
}

struct AiInterviewQuestion: Codable, Identifiable, Hashable, Sendable {
  var id: Int { questionIndex }
  let questionIndex: Int
  let questionText: String
  let audioUrl: String?
  let audioPath: String?
  let videoUrl: String?
  let status: String?
  let audioDuration: Int?
}

struct AiInterviewSessionDetail: Codable, Identifiable, Sendable {
  var id: String { sessionId }
  let sessionId: String
  let userId: String
  let jobTarget: String
  let companyTarget: String?
  let background: String?
  let status: String
  let currentQuestion: Int
  let totalQuestions: Int
  let questions: [AiInterviewQuestion]
  let createdAt: String?
  let startedAt: String?
  let jobId: String?
}

struct NextAiInterviewQuestionResponse: Decodable, Sendable {
  let success: Bool
  let question: AiInterviewQuestion?
  let isCompleted: Bool?
  let message: String?
  let error: String?
}

struct AiInterviewSubmitAnswerRequest: Encodable, Sendable {
  let sessionId: String
  let questionIndex: Int
  let answerText: String?
  let answerVideoUrl: String?
  let answerVideoPath: String?
  let answerDuration: Int?
}

struct SubmitAiInterviewAnswerResponse: Decodable, Sendable {
  let success: Bool
  let message: String?
  let nextQuestion: Int?
  let isCompleted: Bool?
  let error: String?
}

struct AiInterviewFlowState: Codable, Identifiable, Sendable {
  var id: String { sessionId }
  let sessionId: String
  let jobTarget: String
  let totalQuestions: Int
  let questions: [AiInterviewQuestion]
  let jobCategory: String?
  let jobSubCategory: String?
  let plannedDurationMinutes: Int?
  let prompt: String?
  let jobId: String?
}

struct AiInterviewSessionsResponse: Decodable, Sendable {
  let success: Bool
  let sessions: [AiInterviewSessionSummary]?
  let message: String?
  let error: String?
}

struct AiInterviewSessionSummary: Decodable, Identifiable, Sendable {
  var id: String { sessionId ?? UUID().uuidString }
  let sessionId: String?
  let jobTarget: String?
  let jobCategory: String?
  let jobSubCategory: String?
  let status: String?
  let analysisStatus: String?
  let resumeType: String?
  let reportUrl: String?
  let reportReady: Bool?
  let createdAt: String?
  let startedAt: String?
  let questions: [AiInterviewSessionQuestionSummary]
  let jobId: String?
}

struct AiInterviewSessionQuestionSummary: Decodable, Identifiable, Hashable, Sendable {
  var id: Int { questionIndex }
  let questionIndex: Int
  let questionText: String?
  let status: String?
}
