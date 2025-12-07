import Foundation

struct JobSummary: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let title: String
  let companyId: String
  let companyName: String
  let companyLogo: String?
  let companyTagline: String?
  let badgeColor: String?
  let location: String?
  let salary: String?
  let experience: String?
  let education: String?
  let isRemote: Bool?
  let tags: [String]
  let category: String?
  let type: String?
  let level: String?
  let applicationCount: Int?
  let interviewCount: Int?
  let postedAt: String
  let createdAt: String
  let updatedAt: String
  let dictionaryPositionId: String?
  let dictionaryPositionCode: String?
  let dictionaryPositionName: String?
  let dictionaryCategoryId: String?
  let dictionaryCategoryName: String?
}

struct JobSection: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let subtitle: String?
  let jobs: [JobSummary]
}

struct CompanyStat: Codable, Identifiable, Hashable, Sendable {
  var id: String { label + value }
  let label: String
  let value: String
  let accent: String?
}

struct CompanyShowcase: Codable, Identifiable, Sendable {
  var id: String { companyId }
  let companyId: String
  let name: String
  let role: String
  let hiringCount: Int
  let gradient: [String]
  let tagline: String?
  let logo: String?
  let focusArea: String?
  let stats: [CompanyStat]
  let highlights: [String]
  let culture: [String]
  let locations: [String]
}

struct JobDetailCompany: Codable, Identifiable, Sendable {
  let id: String
  let name: String
  let logo: String?
  let tagline: String?
  let themeColors: [String]
  let locations: [String]
  let website: String?
  let industry: String?
  let scale: String?
}

struct JobDetail: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let companyId: String
  let companyName: String
  let companyLogo: String?
  let companyTagline: String?
  let badgeColor: String?
  let location: String?
  let salary: String?
  let experience: String?
  let education: String?
  let isRemote: Bool?
  let tags: [String]
  let category: String?
  let postedAt: String
  let createdAt: String
  let updatedAt: String
  let description: String
  let responsibilities: [String]
  let requirements: [String]
  let highlights: [String]
  let perks: [String]
  let type: String?
  let level: String?
  let applicationCount: Int?
  let interviewCount: Int?
  let company: JobDetailCompany?
  let dictionaryPositionId: String?
  let dictionaryPositionCode: String?
  let dictionaryPositionName: String?
  let dictionaryCategoryId: String?
  let dictionaryCategoryName: String?
}

struct CompanyShowcaseMeta: Codable, Sendable {
  let role: String?
  let hiringCount: Int?
}

struct CompanyProfile: Codable, Identifiable, Sendable {
  let id: String
  let name: String
  let logo: String?
  let tagline: String?
  let description: String?
  let industry: String?
  let scale: String?
  let focusArea: String?
  let website: String?
  let contact: String?
  let gradient: [String]
  let stats: [CompanyStat]
  let highlights: [String]
  let culture: [String]
  let locations: [String]
  let isVerified: Bool
  let showcase: CompanyShowcaseMeta?
  let openRoles: [JobSummary]
}

struct JobApplication: Codable, Identifiable, Sendable {
  let id: String
  let status: String
  let message: String?
  let createdAt: String
  let updatedAt: String
  let jobId: String
  let userId: String
}

struct JobApplicationRequest: Encodable, Sendable {
  let message: String?
}

struct JobListResponse: Decodable, Sendable {
  let success: Bool?
  let data: [JobSummary]?
  let total: Int?
  let page: Int?
  let pageSize: Int?
  let hasMore: Bool?
  let message: String?
  let error: String?
}

struct JobSectionResponse: Decodable, Sendable {
  let success: Bool?
  let data: [JobSection]?
  let message: String?
}
