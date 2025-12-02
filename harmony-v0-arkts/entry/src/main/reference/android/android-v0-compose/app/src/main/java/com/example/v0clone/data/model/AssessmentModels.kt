package com.xlwl.AiMian.data.model

/**
 * 测评分类
 */
data class AssessmentCategory(
    val id: String,
    val name: String,
    val description: String?,
    val icon: String?,
    val sortOrder: Int,
    val assessments: List<Assessment>? = null
)

/**
 * 测评
 */
data class Assessment(
    val id: String,
    val title: String,
    val description: String?,
    val coverImage: String?,
    val durationMinutes: Int,
    val difficulty: String, // BEGINNER | INTERMEDIATE | ADVANCED
    val participantCount: Int,
    val rating: Float,
    val tags: List<String>,
    val category: CategoryInfo,
    val questionCount: Int? = null
)

data class CategoryInfo(
    val id: String,
    val name: String
)

/**
 * 测评详情（包含题目）
 */
data class AssessmentDetail(
    val id: String,
    val title: String,
    val description: String?,
    val coverImage: String?,
    val durationMinutes: Int,
    val difficulty: String,
    val participantCount: Int,
    val rating: Float,
    val tags: List<String>,
    val category: CategoryInfo,
    val questions: List<AssessmentQuestion>
)

/**
 * 测评题目
 */
data class AssessmentQuestion(
    val id: String,
    val questionText: String,
    val questionType: String, // SINGLE_CHOICE | MULTIPLE_CHOICE | TEXT
    val options: List<QuestionOption>,
    val sortOrder: Int
)

data class QuestionOption(
    val label: String,
    val text: String,
    val score: Int
)

/**
 * 用户答案
 */
data class UserAnswer(
    val questionId: String,
    val answer: List<String> // 选择的选项标签列表
)

/**
 * 提交测评请求
 */
data class SubmitAssessmentRequest(
    val userId: String,
    val answers: List<UserAnswer>,
    val duration: Int // 用时（秒）
)

/**
 * 测评结果
 */
data class AssessmentResult(
    val recordId: String,
    val totalScore: Int,
    val resultLevel: String, // 优秀、良好、及格、不及格
    val maxScore: Int,
    val percentage: Int
)

/**
 * 用户测评记录
 */
data class UserAssessmentRecord(
    val id: String,
    val userId: String,
    val assessmentId: String,
    val totalScore: Int,
    val resultLevel: String?,
    val startedAt: String,
    val completedAt: String?,
    val duration: Int?,
    val assessment: Assessment
)

