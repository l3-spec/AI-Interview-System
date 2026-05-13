import Foundation

/// 后端下发的客户端运行时配置 - 对齐 Android ClientRuntimeConfigDto
/// GET /api/public/client-runtime-config 返回的 data 段。
/// 字段均可选：未返回时回退到本地默认值。
struct ClientRuntimeConfigDto: Decodable, Sendable {
  let apiBaseUrl: String?
  let realtimeSocketUrl: String?
  let asrServiceWsUrl: String?
  let ttsServiceWsUrl: String?
  let asrServiceHttpUrl: String?
  let ttsServiceHttpUrl: String?
  let qwenAsrModel: String?
  let qwenTtsModel: String?
  let ttsVoice: String?
  let ttsLanguage: String?
  let ttsInstructions: String?
  let dashScopeApiKey: String?
  let dashScopeBaseUrl: String?
  let volcanoAppId: String?
  let volcanoApiKey: String?
  let duixBaseConfigUrl: String?
  let duixModelUrl: String?
  let airiWebUrl: String?
  let aliyunAvatarProjectId: String?
  let aliyunAvatarApiUrl: String?
  let aliyunAvatarInstanceId: String?
  let aliyunAccessKeyId: String?
  let aliyunAccessKeySecret: String?
  let volcanoTtsHost: String?
  let volcanoTtsPath: String?
  let vadThreshold: Float?
  let bargeInVadThreshold: Float?
  let speechCooldownMs: Int64?
}
