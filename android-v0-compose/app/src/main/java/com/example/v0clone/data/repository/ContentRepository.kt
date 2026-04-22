package com.xlwl.AiMian.data.repository

import com.google.gson.Gson
import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.api.PagedData
import com.xlwl.AiMian.data.model.*
import java.io.File
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.xlwl.AiMian.data.api.ApiResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 内容数据仓库
 * 
 * 负责管理测评、帖子、大咖分享、职岗推广等内容数据
 */
class ContentRepository(private val apiService: ApiService) {

    private val gson = Gson()
    
    // ==================== 测评相关 ====================
    
    /**
     * 获取测评分类列表
     */
    suspend fun getAssessmentCategories(): Result<List<AssessmentCategory>> = 
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getAssessmentCategories()
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取测评分类失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    /**
     * 获取指定分类下的测评列表
     */
    suspend fun getAssessmentsByCategory(
        categoryId: String,
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<Assessment>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAssessmentsByCategory(categoryId, page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取测评列表失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * 获取测评详情
     */
    suspend fun getAssessmentDetail(assessmentId: String): Result<AssessmentDetail> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getAssessmentDetail(assessmentId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取测评详情失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    /**
     * 提交测评答案
     */
    suspend fun submitAssessment(
        assessmentId: String,
        request: SubmitAssessmentRequest
    ): Result<AssessmentResult> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.submitAssessment(assessmentId, request)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "提交测评失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * 获取用户的测评记录
     */
    suspend fun getUserAssessmentRecords(
        userId: String,
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<UserAssessmentRecord>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getUserAssessmentRecords(userId, page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取测评记录失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // ==================== 内容社区相关 ====================

    /**
     * 获取用户帖子列表
     */
    suspend fun getUserPosts(
        page: Int = 1,
        pageSize: Int = 20,
        isHot: Boolean? = null
    ): Result<PagedData<UserPost>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getUserPosts(page, pageSize, isHot)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取帖子列表失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取我的发布
     */
    suspend fun getMyPosts(
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<UserPost>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMyPosts(page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取我的发布失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * 获取用户帖子详情
     */
    suspend fun getUserPostDetail(postId: String): Result<UserPost> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getUserPostDetail(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取帖子详情失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getUserPostEngagement(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getUserPostEngagement(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取帖子互动数据失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getUserPostComments(postId: String): Result<List<PostCommentDto>> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getUserPostComments(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取帖子评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun createUserPostComment(
        postId: String,
        content: String,
        parentId: String? = null,
        replyToUserId: String? = null
    ): Result<CreatePostCommentResult> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.createUserPostComment(
                    postId,
                    CreatePostCommentRequest(content, parentId, replyToUserId)
                )
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "发表评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun likeComment(commentId: String): Result<PostCommentDto> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.likeComment(commentId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "点赞评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun unlikeComment(commentId: String): Result<PostCommentDto> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.unlikeComment(commentId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "取消点赞评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun addCommentReaction(commentId: String, emoji: String): Result<CommentReactionResult> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.addCommentReaction(commentId, CommentReactionRequest(emoji))
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "添加表情失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun removeCommentReaction(commentId: String, emoji: String): Result<CommentReactionResult> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.removeCommentReaction(commentId, CommentReactionRequest(emoji))
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "移除表情失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getCommentReplies(
        commentId: String,
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<PostCommentDto>> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getCommentReplies(commentId, page, pageSize)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取评论回复失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun likeUserPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.likeUserPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "点赞失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun unlikeUserPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.unlikeUserPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "取消点赞失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun favoriteUserPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.favoriteUserPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "收藏失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun unfavoriteUserPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.unfavoriteUserPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "取消收藏失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    /**
     * 获取大咖分享列表
     */
    suspend fun getExpertPosts(
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<ExpertPost>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getExpertPosts(page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取大咖分享列表失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * 获取大咖分享详情
     */
    suspend fun getExpertPostDetail(postId: String): Result<ExpertPost> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getExpertPostDetail(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取大咖分享详情失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getExpertPostEngagement(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getExpertPostEngagement(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取帖子互动数据失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getExpertPostComments(postId: String): Result<List<PostCommentDto>> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.getExpertPostComments(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取帖子评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun createExpertPostComment(
        postId: String,
        content: String,
        parentId: String? = null,
        replyToUserId: String? = null
    ): Result<CreatePostCommentResult> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.createExpertPostComment(
                    postId,
                    CreatePostCommentRequest(content, parentId, replyToUserId)
                )
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "发表评论失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun likeExpertPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.likeExpertPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "点赞失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun unlikeExpertPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.unlikeExpertPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "取消点赞失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun favoriteExpertPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.favoriteExpertPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "收藏失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun unfavoriteExpertPost(postId: String): Result<PostEngagement> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.unfavoriteExpertPost(postId)
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "取消收藏失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    /**
     * 记录推广职位点击
     */
    suspend fun recordPromotedJobClick(promotionId: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService.recordPromotedJobClick(promotionId)
                if (response.success) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception(response.message ?: "记录点击失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    /**
     * 创建用户帖子
     */
    suspend fun createUserPost(
        title: String,
        content: String,
        tags: List<String>,
        images: List<File>
    ): Result<UserPost> = withContext(Dispatchers.IO) {
        try {
            val textMediaType = "text/plain".toMediaType()
            val titleBody = title.toRequestBody(textMediaType)
            val contentBody = content.toRequestBody(textMediaType)
            val tagsBody = if (tags.isNotEmpty()) {
                gson.toJson(tags).toRequestBody(textMediaType)
            } else {
                null
            }
            val imageParts = images.map { file ->
                val mediaType = when (file.extension.lowercase()) {
                    "png" -> "image/png"
                    "jpg", "jpeg" -> "image/jpeg"
                    "webp" -> "image/webp"
                    "gif" -> "image/gif"
                    else -> "application/octet-stream"
                }.toMediaTypeOrNull() ?: "application/octet-stream".toMediaType()
                val body = file.asRequestBody(mediaType)
                MultipartBody.Part.createFormData("postImages", file.name, body)
            }

            val response = apiService.createUserPost(
                title = titleBody,
                content = contentBody,
                tags = tagsBody,
                postImages = imageParts
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "发布帖子失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除当前用户帖子
     */
    suspend fun deleteMyPost(postId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.deleteMyPost(postId)
            if (response.success) {
                Result.success(Unit)
            } else {
                // 兼容部分网关对 DELETE path 的代理问题，降级为 query 方式
                val fallback = apiService.deleteMyPostByQuery(postId)
                if (fallback.success) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception(fallback.message ?: "删除帖子失败"))
                }
            }
        } catch (e: Exception) {
            // 若路径被网关吞掉导致 404，再尝试 query 形式
            return@withContext runCatching {
                val fallback = apiService.deleteMyPostByQuery(postId)
                if (fallback.success) Result.success(Unit)
                else Result.failure(Exception(fallback.message ?: "删除帖子失败"))
            }.getOrElse { inner -> Result.failure(inner) }
        }
    }
    
    // ==================== 首页相关 ====================
    
    /**
     * 获取首页内容聚合（混排）
     */
    suspend fun getHomeFeed(
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<HomeFeedItem>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getHomeFeed(page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取首页内容失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * 获取首页Banner
     */
    suspend fun getHomeBanners(): Result<List<Banner>> = getBanners { apiService.getHomeBanners() }

    /**
     * 获取职圈Banner
     */
    suspend fun getCircleBanners(): Result<List<Banner>> = getBanners { apiService.getCircleBanners() }

    /**
     * 获取岗位Banner
     */
    suspend fun getJobsBanners(): Result<List<Banner>> = getBanners { apiService.getJobsBanners() }

    /**
     * 获取我的Banner
     */
    suspend fun getProfileBanners(): Result<List<Banner>> = getBanners { apiService.getProfileBanners() }

    private suspend fun getBanners(call: suspend () -> ApiResponse<List<Banner>>): Result<List<Banner>> = 
        withContext(Dispatchers.IO) {
            try {
                val response = call()
                if (response.success && response.data != null) {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "获取Banner失败"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    /**
     * 获取首页精选内容
     */
    suspend fun getHomeFeaturedArticles(
        page: Int = 1,
        pageSize: Int = 20
    ): Result<PagedData<HomeFeaturedArticle>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getHomeFeaturedArticles(page, pageSize)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.message ?: "获取首页内容失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
