package com.xlwl.AiMian.data.model

/**
 * 内容类型
 */
enum class ContentType {
    ASSESSMENT,    // 热门测试
    USER_POST,     // 热门分享
    EXPERT_POST,   // 大咖分享
    PROMOTED_JOB   // 热门职岗
}

/**
 * 首页内容卡片（混排）
 */
data class HomeFeedItem(
    val type: ContentType,
    val id: String,
    val data: Any // 可以是 Assessment、UserPost、ExpertPost 或 PromotedJob
)

/**
 * 用户帖子（热门分享）
 */
data class UserPost(
    val id: String,
    val title: String,
    val content: String,
    val coverImage: String?,
    val images: List<String>,
    val tags: List<String>,
    val viewCount: Int,
    val likeCount: Int,
    val commentCount: Int,
    val shareCount: Int = 0,
    val createdAt: String,
    val author: UserPostAuthor? = null
)

data class UserPostAuthor(
    val id: String?,
    val name: String?,
    val avatar: String?,
    val headline: String?
)

/**
 * 大咖分享
 */
data class ExpertPost(
    val id: String,
    val expertName: String,
    val expertTitle: String,
    val expertCompany: String,
    val expertAvatar: String?,
    val title: String,
    val content: String,
    val coverImage: String?,
    val tags: List<String>,
    val viewCount: Int,
    val likeCount: Int,
    val commentCount: Int = 0,
    val publishedAt: String? = null
)

/**
 * 推广职位
 */
data class PromotedJob(
    val promotionId: String,
    val promotionType: String, // NORMAL | PREMIUM | FEATURED
    val job: JobInfo
)

data class JobInfo(
    val id: String,
    val title: String,
    val salary: String?,
    val location: String?,
    val skills: List<String>,
    val company: CompanyInfo
)

data class CompanyInfo(
    val id: String,
    val name: String,
    val logo: String?,
    val industry: String?
)

/**
 * Banner 数据
 */
data class Banner(
    val id: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val imageUrl: String,
    val linkType: String?, // post | assessment | company
    val linkId: String?
)

/**
 * 首页精选内容
 */
data class HomeFeaturedArticle(
    val id: String,
    val title: String,
    val summary: String?,
    val imageUrl: String,
    val author: String?,
    val tags: List<String> = emptyList(),
    val viewCount: Int = 0,
    val category: String?,
    val createdAt: String?
)
