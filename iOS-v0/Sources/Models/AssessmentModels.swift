import Foundation

struct AssessmentCategory: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let name: String
  let description: String?
  let icon: String?
  let sortOrder: Int
  let assessments: [Assessment]?
}

struct Assessment: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let title: String
  let description: String?
  let coverImage: String?
  let durationMinutes: Int
  let difficulty: String
  let participantCount: Int
  let rating: Float
  let tags: [String]
  let guidelines: [String]
  let category: CategoryInfo
  let questionCount: Int?
}

struct CategoryInfo: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let name: String
}

struct AssessmentDetail: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let description: String?
  let coverImage: String?
  let durationMinutes: Int
  let difficulty: String
  let participantCount: Int
  let rating: Float
  let tags: [String]
  let guidelines: [String]
  let category: CategoryInfo
  let questions: [AssessmentQuestion]
}

struct AssessmentQuestion: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let questionText: String
  let questionType: String
  let options: [QuestionOption]
  let sortOrder: Int
}

struct QuestionOption: Codable, Hashable, Sendable {
  let label: String
  let text: String
  let score: Int
}

struct UserAnswer: Encodable, Sendable {
  let questionId: String
  let answer: [String]
}

struct SubmitAssessmentRequest: Encodable, Sendable {
  let userId: String
  let answers: [UserAnswer]
  let duration: Int
}

struct AssessmentResult: Decodable, Sendable {
  let recordId: String
  let totalScore: Int
  let resultLevel: String
  let maxScore: Int
  let percentage: Int
}

struct UserAssessmentRecord: Decodable, Identifiable, Sendable {
  let id: String
  let userId: String
  let assessmentId: String
  let totalScore: Int
  let resultLevel: String?
  let startedAt: String
  let completedAt: String?
  let duration: Int?
  let assessment: Assessment
}
