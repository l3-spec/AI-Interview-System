import Foundation

/// 面试 6 维度报告模型 - 对齐 Android com.example.v0clone.model.InterviewModels

// MARK: - 单维度评分
struct DimensionScore: Codable, Hashable, Sendable {
  let dimension: String      // 维度名称
  let fieldName: String      // 字段名（professionalAbility 等）
  let icon: String           // 图标
  let description: String    // 维度说明
  let score: Float           // 0-10 综合得分
  let maxScore: Float
  let contentScore: Float    // 内容评分 0-10
  let multimodalScore: Float // 多模态评分 0-10
  let feedback: String       // 评语
}

// MARK: - 多模态汇总
struct MultimodalSummary: Codable, Hashable, Sendable {
  let expressionStability: Float // 表情稳定性 0-10
  let eyeContact: Float          // 眼神接触 0-10
  let toneStability: Float       // 语气稳定性 0-10
  let speechFluency: Float       // 语速流畅度 0-10
  let hesitationCount: Int       // 卡顿次数
}

// MARK: - 题目详情
struct QuestionDetail: Codable, Hashable, Sendable {
  let questionText: String
  let answerText: String
  let dimensionScores: [String: Float]
  let feedback: String
}

// MARK: - 完整面试报告
struct InterviewReport: Codable, Sendable {
  let overallScore: Float
  let dimensions: [DimensionScore]
  let multimodalSummary: MultimodalSummary
  let questionDetails: [QuestionDetail]
  let strengths: [String]
  let improvements: [String]
}

// MARK: - 维度配置（预定义 6 维度）
struct DimensionConfig: Hashable, Sendable {
  let name: String
  let fieldName: String
  let icon: String
  let description: String
}

/// 预定义 6 维度 - 对齐 Android dimensionConfigs
let dimensionConfigs: [DimensionConfig] = [
  DimensionConfig(name: "专业能力", fieldName: "professionalAbility", icon: "💡",
                  description: "岗位硬技能、知识储备、实操水平"),
  DimensionConfig(name: "学习成长", fieldName: "learningGrowth", icon: "📈",
                  description: "学习速度、知识迁移、自我驱动"),
  DimensionConfig(name: "沟通协作", fieldName: "communicationCollaboration", icon: "🤝",
                  description: "表达清晰、倾听理解、团队配合"),
  DimensionConfig(name: "问题解决", fieldName: "problemSolving", icon: "🧩",
                  description: "分析能力、创新思维、方案落地"),
  DimensionConfig(name: "成就执行", fieldName: "achievementExecution", icon: "🎯",
                  description: "目标导向、结果驱动、责任担当"),
  DimensionConfig(name: "抗压韧性", fieldName: "stressResilience", icon: "🛡️",
                  description: "情绪稳定、逆商、快速恢复")
]
