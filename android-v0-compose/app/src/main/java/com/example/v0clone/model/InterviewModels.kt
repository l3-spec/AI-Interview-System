package com.example.v0clone.model

data class DimensionScore(
    val dimension: String,        // 维度名称
    val fieldName: String,        // 字段名
    val icon: String,             // 图标
    val description: String,      // 维度说明
    val score: Float,             // 0-10分
    val maxScore: Float = 10f,
    val contentScore: Float,      // 内容评分 0-10
    val multimodalScore: Float,   // 多模态评分 0-10
    val feedback: String          // 评语
)

data class InterviewReport(
    val overallScore: Float,
    val dimensions: List<DimensionScore>,
    val multimodalSummary: MultimodalSummary,
    val questionDetails: List<QuestionDetail>,
    val strengths: List<String>,
    val improvements: List<String>
)

data class MultimodalSummary(
    val expressionStability: Float,  // 表情稳定性 0-10
    val eyeContact: Float,           // 眼神接触 0-10
    val toneStability: Float,        // 语气稳定性 0-10
    val speechFluency: Float,        // 语速流畅度 0-10
    val hesitationCount: Int         // 卡顿次数
)

data class QuestionDetail(
    val questionText: String,
    val answerText: String,
    val dimensionScores: Map<String, Float>,
    val feedback: String
)

// 预定义6维度配置
val dimensionConfigs = listOf(
    DimensionConfig("专业能力", "professionalAbility", "💡", "岗位硬技能、知识储备、实操水平"),
    DimensionConfig("学习成长", "learningGrowth", "📈", "学习速度、知识迁移、自我驱动"),
    DimensionConfig("沟通协作", "communicationCollaboration", "🤝", "表达清晰、倾听理解、团队配合"),
    DimensionConfig("问题解决", "problemSolving", "🧩", "分析能力、创新思维、方案落地"),
    DimensionConfig("成就执行", "achievementExecution", "🎯", "目标导向、结果驱动、责任担当"),
    DimensionConfig("抗压韧性", "stressResilience", "🛡️", "情绪稳定、逆商、快速恢复")
)

data class DimensionConfig(
    val name: String,
    val fieldName: String,
    val icon: String,
    val description: String
)