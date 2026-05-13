import Foundation

/// OSS 上传配置与上传结果 - 对齐 Android OssModels
struct OssConfig: Decodable, Sendable {
  let endpoint: String
  let bucketName: String
  let region: String
  let cdnDomain: String?
}

struct OssUploadResult: Decodable, Sendable {
  let objectKey: String?
  let url: String?
}

/// 通知后端 OSS 上传完成
struct OssUploadCompleteRequest: Encodable, Sendable {
  let sessionId: String
  let questionIndex: Int
  let ossUrl: String
  let cdnUrl: String?
  let fileSize: Int64?
  let duration: Int64?
}

/// 绑定实时面试某一沟通轮次对应的答题视频 - 对齐 Android AttachConversationTurnVideoBody
struct AttachConversationTurnVideoBody: Encodable, Sendable {
  let videoUrl: String?
  let videoPath: String?
  let durationMs: Int?
}

struct AttachConversationTurnVideoData: Decodable, Sendable {
  let videoUrl: String?
}
