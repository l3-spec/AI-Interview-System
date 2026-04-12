package com.xlwl.AiMian.data.model

import com.google.gson.annotations.SerializedName

/**
 * 内容类型
 */
enum class HomeFeedType {
    @SerializedName("hot_post")
    HOT_POST,

    @SerializedName("hot_company")
    HOT_COMPANY,

    @SerializedName("hot_job")
    HOT_JOB
}

enum class HomeFeedTargetType {
    @SerializedName("post")
    POST,

    @SerializedName("company")
    COMPANY,

    @SerializedName("job")
    JOB
}

/**
 * 首页内容卡片（混排）
 */
data class HomeFeedItem(
    val id: String,
    val type: HomeFeedType,
    val targetType: HomeFeedTargetType,
    val targetId: String,
    val title: String,
    val summary: String? = null,
    val imageUrl: String? = null,
    val tags: List<String> = emptyList(),
    val authorName: String,
    val authorAvatar: String? = null,
    val badge: String,
    val metricLabel: String? = null,
    val metricValue: String? = null,
    val createdAt: String? = null
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

data class PostEngagement(
    val postId: String,
    val postType: String,
    val likeCount: Int,
    val commentCount: Int,
    val favoriteCount: Int,
    val isLiked: Boolean,
    val isFavorited: Boolean
)

data class PostCommentAuthor(
    val id: String?,
    val name: String?,
    val avatar: String?
)

data class PostCommentDto(
    val id: String,
    val content: String,
    val createdAt: String,
    val author: PostCommentAuthor,
    val parentId: String? = null,
    val replyToUserId: String? = null,
    val replyToUserName: String? = null,
    val likeCount: Int = 0,
    val replyCount: Int = 0,
    val isLiked: Boolean = false,
    val reactions: Map<String, Int> = emptyMap(),
    val replies: List<PostCommentDto> = emptyList()
)

data class CreatePostCommentRequest(
    val content: String,
    val parentId: String? = null,
    val replyToUserId: String? = null
)

data class CreatePostCommentResult(
    val comment: PostCommentDto?,
    val engagement: PostEngagement?
)

data class CommentReactionRequest(
    val emoji: String
)

data class CommentReactionResult(
    val comment: PostCommentDto?,
    val added: Boolean? = null
)
