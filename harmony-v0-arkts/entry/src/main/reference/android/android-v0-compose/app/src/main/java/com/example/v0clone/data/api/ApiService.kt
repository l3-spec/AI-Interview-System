package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.*

/**
 * API 服务接口
 */
interface ApiService {
    
    // ==================== 测评相关 ====================
    
    /**
     * 获取测评分类列表
     */
    @GET("assessments/categories")
    suspend fun getAssessmentCategories(): ApiResponse<List<AssessmentCategory>>
    
    /**
     * 获取指定分类下的测评列表
     */
    @GET("assessments/categories/{categoryId}/assessments")
    suspend fun getAssessmentsByCategory(
        @Path("categoryId") categoryId: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<Assessment>>
    
    /**
     * 获取测评详情
     */
    @GET("assessments/{id}")
    suspend fun getAssessmentDetail(
        @Path("id") assessmentId: String
    ): ApiResponse<AssessmentDetail>
    
    /**
     * 提交测评答案
     */
    @POST("assessments/{id}/submit")
    suspend fun submitAssessment(
        @Path("id") assessmentId: String,
        @Body request: SubmitAssessmentRequest
    ): ApiResponse<AssessmentResult>
    
    /**
     * 获取用户的测评记录
     */
    @GET("assessments/records/user/{userId}")
    suspend fun getUserAssessmentRecords(
        @Path("userId") userId: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<UserAssessmentRecord>>
    
    // ==================== 内容社区相关 ====================
    
    /**
     * 获取用户帖子列表
     */
    @GET("content/posts")
    suspend fun getUserPosts(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("isHot") isHot: Boolean? = null
    ): ApiResponse<PagedData<UserPost>>

    /**
     * 获取当前用户的帖子列表
     */
    @GET("content/my-posts")
    suspend fun getMyPosts(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<UserPost>>

    /**
     * 获取用户帖子详情
     */
    @GET("content/posts/{id}")
    suspend fun getUserPostDetail(
        @Path("id") postId: String
    ): ApiResponse<UserPost>
    
    /**
     * 获取大咖分享列表
     */
    @GET("content/expert-posts")
    suspend fun getExpertPosts(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<ExpertPost>>
    
    /**
     * 获取大咖分享详情
     */
    @GET("content/expert-posts/{id}")
    suspend fun getExpertPostDetail(
        @Path("id") postId: String
    ): ApiResponse<ExpertPost>
    
    /**
     * 获取推广职位列表
     */
    @GET("content/promoted-jobs")
    suspend fun getPromotedJobs(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 10
    ): ApiResponse<PagedData<PromotedJob>>
    
    /**
     * 记录推广职位点击
     */
    @POST("content/promoted-jobs/{id}/click")
    suspend fun recordPromotedJobClick(
        @Path("id") promotionId: String
    ): ApiResponse<Unit>

    /**
     * 创建用户帖子
     */
    @Multipart
    @POST("content/posts")
    suspend fun createUserPost(
        @Part("title") title: RequestBody,
        @Part("content") content: RequestBody,
        @Part("tags") tags: RequestBody?,
        @Part postImages: List<MultipartBody.Part>
    ): ApiResponse<UserPost>

    // ==================== 消息中心相关 ====================

    /**
     * 获取消息中心列表
     */
    @GET("messages")
    suspend fun getMessages(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("type") type: String? = null,
        @Query("status") status: String? = null
    ): ApiResponse<PagedData<MessageSummary>>

    /**
     * 获取消息详情
     */
    @GET("messages/{id}")
    suspend fun getMessageDetail(
        @Path("id") messageId: String
    ): ApiResponse<MessageDetail>

    /**
     * 创建留言
     */
    @POST("messages")
    suspend fun createMessage(
        @Body request: CreateMessageRequest
    ): ApiResponse<MessageDetail>

    /**
     * 回复留言
     */
    @POST("messages/{id}/reply")
    suspend fun replyMessage(
        @Path("id") messageId: String,
        @Body request: ReplyMessageRequest
    ): ApiResponse<MessageEntry>

    /**
     * 标记消息为已读
     */
    @PATCH("messages/{id}/read")
    suspend fun markMessageRead(
        @Path("id") messageId: String
    ): ApiResponse<MessageReadResponse>
    
    // ==================== 首页相关 ====================
    
    /**
     * 获取首页内容聚合（混排）
     */
    @GET("home/feed")
    suspend fun getHomeFeed(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<HomeFeedItem>>
    
    /**
     * 获取首页Banner
     */
    @GET("home/banners")
    suspend fun getHomeBanners(): ApiResponse<List<Banner>>

    /**
     * 获取首页精选内容
     */
    @GET("home/featured-articles")
    suspend fun getHomeFeaturedArticles(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PagedData<HomeFeaturedArticle>>

    // ==================== 职岗与企业相关 ====================

    /**
     * 获取公开岗位列表
     */
    @GET("public/jobs")
    suspend fun getPublicJobs(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("keyword") keyword: String? = null,
        @Query("location") location: String? = null,
        @Query("type") type: String? = null,
        @Query("level") level: String? = null,
        @Query("category") category: String? = null,
        @Query("remoteOnly") remoteOnly: Boolean? = null,
        @Query("sort") sort: String? = null,
        @Query("experience") experience: String? = null,
        @Query("education") education: String? = null,
        @Query("dictionaryPositionIds") dictionaryPositionIds: String? = null
    ): JobListResponse

    /**
     * 获取公开岗位分区
     */
    @GET("public/jobs/sections")
    suspend fun getJobSections(): ApiResponse<List<JobSectionDto>>

    /**
     * 获取岗位详情
     */
    @GET("public/jobs/{id}")
    suspend fun getJobDetail(
        @Path("id") jobId: String
    ): ApiResponse<JobDetailDto>

    /**
     * 获取精选企业展示
     */
    @GET("public/companies/showcases")
    suspend fun getCompanyShowcases(): ApiResponse<List<CompanyShowcaseDto>>

    /**
     * 获取企业详情
     */
    @GET("public/companies/{id}")
    suspend fun getCompanyProfile(
        @Path("id") companyId: String
    ): ApiResponse<CompanyProfileDto>

    /**
     * 申请岗位
     */
    @POST("public/jobs/{id}/apply")
    suspend fun applyForJob(
        @Path("id") jobId: String,
        @Body request: JobApplicationRequest
    ): ApiResponse<JobApplicationDto>

    @GET("job-preferences")
    suspend fun getJobPreferences(): ApiResponse<JobPreferenceDto>

    @PUT("job-preferences")
    suspend fun updateJobPreferences(
        @Body request: UpdateJobPreferencesRequest
    ): ApiResponse<JobPreferenceDto>
}
