package com.xlwl.AiMian.ui.circle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.v0clone.data.api.PagedData
import com.xlwl.AiMian.data.model.ExpertPost
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.ui.home.ContentCard
import java.text.DecimalFormat
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.LinkedHashMap
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.xlwl.AiMian.data.model.Banner
import com.xlwl.AiMian.ui.components.BannerData

private const val PAGE_SIZE = 20

/** 职圈列表兜底封面（CDN 外网图不可用时仍有图可点） — 与后端 seed/导入错开，按 postId 散列选用 */
private val DEFAULT_CIRCLE_COVERS = listOf(
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=800&q=82",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=82",
)

private fun pickDefaultCircleCover(postId: String): String {
    val h = postId.hashCode().and(0x7fff_ffff)
    return DEFAULT_CIRCLE_COVERS[h % DEFAULT_CIRCLE_COVERS.size]
}

data class CircleCard(
    val id: String,
    val title: String,
    val coverImage: String?,
    val tags: List<String>,
    val authorName: String,
    val authorAvatar: String?,
    val viewCount: Int,
    val isExpert: Boolean,
    internal val orderKey: Long,
    internal val fallbackCard: ContentCard
)

data class CircleUiState(
    val banners: List<BannerData> = emptyList(),
    val currentBannerIndex: Int = 0,
    val cards: List<CircleCard> = emptyList(),
    val isLoading: Boolean = false,
    val isAppending: Boolean = false,
    val error: String? = null
)

class CircleViewModel(private val repository: ContentRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(CircleUiState(isLoading = true))
    val uiState: StateFlow<CircleUiState> = _uiState.asStateFlow()

    private var currentUserPage = 0
    private var currentExpertPage = 0
    private var userHasMore = true
    private var expertHasMore = true
    private var isLoadingMore = false

    init {
        refresh()
        startBannerAutoScroll()
    }

    private fun startBannerAutoScroll() {
        viewModelScope.launch {
            while (true) {
                delay(5000)
                val bannerCount = _uiState.value.banners.size
                if (bannerCount > 1) {
                    _uiState.update { it.copy(
                        currentBannerIndex = (it.currentBannerIndex + 1) % (bannerCount * 100)
                    )}
                }
            }
        }
    }

    fun refresh() {
        currentUserPage = 0
        currentExpertPage = 0
        userHasMore = true
        expertHasMore = true
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, isAppending = false, error = null) }
            
            val bannersDeferred = async { repository.getCircleBanners() }
            val feedJob = async { loadPages(userPage = 1, expertPage = 1, replace = true) }
            
            val bannersResult = bannersDeferred.await()
            val result = feedJob.await()

            val banners = bannersResult.getOrNull()?.map { it.toBannerData() }.orEmpty()

            if (result.cards.isNotEmpty()) {
                _uiState.value = _uiState.value.copy(
                    banners = banners,
                    cards = result.cards,
                    isLoading = false,
                    error = result.errorMessage
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    banners = banners,
                    cards = emptyList(),
                    isLoading = false,
                    error = result.errorMessage ?: "加载帖子失败"
                )
            }
        }
    }

    fun loadMore() {
        if (isLoadingMore || (!userHasMore && !expertHasMore)) return
        val targetUserPage = if (userHasMore) currentUserPage + 1 else null
        val targetExpertPage = if (expertHasMore) currentExpertPage + 1 else null
        if (targetUserPage == null && targetExpertPage == null) return

        isLoadingMore = true
        viewModelScope.launch {
            _uiState.update { it.copy(isAppending = true, error = null) }
            val result = loadPages(
                userPage = targetUserPage,
                expertPage = targetExpertPage,
                replace = false
            )
            _uiState.update {
                it.copy(
                    cards = result.cards,
                    isAppending = false,
                    error = result.errorMessage
                )
            }
            isLoadingMore = false
        }
    }

    fun insertPost(post: UserPost) {
        val card = post.toCircleCard()
        _uiState.update { state ->
            val merged = mergeCards(state.cards, listOf(card), replace = false)
            state.copy(cards = merged, isAppending = false, error = null)
        }
    }

    private suspend fun loadPages(
        userPage: Int?,
        expertPage: Int?,
        replace: Boolean
    ): LoadResult {
        val errorMessages = mutableListOf<String>()
        val userPosts = mutableListOf<UserPost>()
        val expertPosts = mutableListOf<ExpertPost>()

        coroutineScope {
            val userJob = userPage?.let { page ->
                async {
                    repository.getUserPosts(page = page, pageSize = PAGE_SIZE).fold(
                        onSuccess = { data ->
                            currentUserPage = data.page
                            userHasMore = data.hasMore
                            userPosts.addAll(data.list)
                        },
                        onFailure = { throwable ->
                            errorMessages += throwable.message ?: "加载用户帖子失败"
                        }
                    )
                }
            }

            val expertJob = expertPage?.let { page ->
                async {
                    repository.getExpertPosts(page = page, pageSize = PAGE_SIZE).fold(
                        onSuccess = { data ->
                            currentExpertPage = data.page
                            expertHasMore = data.hasMore
                            expertPosts.addAll(data.list)
                        },
                        onFailure = { throwable ->
                            errorMessages += throwable.message ?: "加载大咖分享失败"
                        }
                    )
                }
            }

            userJob?.await()
            expertJob?.await()
        }

        if (userPage != null && userPosts.isEmpty()) {
            // Reset pagination so that a retry does not skip the failed page.
            currentUserPage = if (replace) 0 else currentUserPage.coerceAtLeast(userPage - 1)
        }
        if (expertPage != null && expertPosts.isEmpty()) {
            currentExpertPage = if (replace) 0 else currentExpertPage.coerceAtLeast(expertPage - 1)
        }

        val existing = if (replace) emptyList() else _uiState.value.cards
        val merged = mergeCards(existing, userPosts.map { it.toCircleCard() } + expertPosts.map { it.toCircleCard() }, replace)

        val message = when {
            errorMessages.isEmpty() -> null
            errorMessages.size == 1 -> errorMessages.first()
            else -> errorMessages.joinToString("；")
        }

        return LoadResult(merged, message)
    }

    private fun resolveMediaUrl(url: String?): String? {
        if (url.isNullOrBlank()) return null
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        
        val baseUrl = com.example.v0clone.config.AppConfig.apiBaseUrl
        val cleanUrl = if (url.startsWith("/api/")) {
            url.substring(5)
        } else if (url.startsWith("api/")) {
            url.substring(4)
        } else {
            url.trimStart('/')
        }
        
        return if (baseUrl.endsWith("/")) "$baseUrl$cleanUrl" else "$baseUrl/$cleanUrl"
    }

    private fun Banner.toBannerData() = BannerData(
        id = id,
        imageUrl = resolveMediaUrl(imageUrl) ?: imageUrl,
        label = subtitle,
        title = title,
        subtitle = description,
        linkType = linkType,
        linkId = linkId
    )

    private fun mergeCards(
        existing: List<CircleCard>,
        newItems: List<CircleCard>,
        replace: Boolean
    ): List<CircleCard> {
        if (replace) {
            return newItems.sortedByDescending { it.orderKey }
        }
        if (newItems.isEmpty()) return existing
        val cache = LinkedHashMap<String, CircleCard>(existing.size + newItems.size)
        existing.forEach { cache[it.id] = it }
        newItems.forEach { cache[it.id] = it }
        return cache.values.sortedByDescending { it.orderKey }
    }

    private fun UserPost.toCircleCard(): CircleCard {
        val safeImages = images.orEmpty()
        val raw = coverImage?.takeIf { it.isNotBlank() } ?: safeImages.firstOrNull { it.isNotBlank() }
        val cover = raw?.takeIf { it.isNotBlank() } ?: pickDefaultCircleCover(id)
        val authorDisplay = author?.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 职圈"
        val timestamp = parseTimestamp(createdAt)
        
        val resolvedCover = resolveMediaUrl(cover) ?: cover
        val resolvedAvatar = resolveMediaUrl(author?.avatar)
        
        val fallback = ContentCard(
            id = id,
            imageUrl = resolvedCover,
            title = title,
            tags = tags,
            author = authorDisplay,
            views = formatViewCount(viewCount),
            avatarUrl = resolvedAvatar,
            summary = null
        )
        return CircleCard(
            id = id,
            title = title,
            coverImage = resolvedCover,
            tags = tags,
            authorName = authorDisplay,
            authorAvatar = resolvedAvatar,
            viewCount = viewCount,
            isExpert = false,
            orderKey = timestamp,
            fallbackCard = fallback
        )
    }

    private fun ExpertPost.toCircleCard(): CircleCard {
        // 列表封面：主图为主；若主图未配置或拉取失败，由 UI 层用 Subcompose 再降级到专家头像
        val cover = coverImage?.takeIf { it.isNotBlank() } ?: expertAvatar?.takeIf { it.isNotBlank() } ?: ""
        val authorDisplay = expertName.ifBlank { "STAR-LINK 职圈大咖" }
        val timestamp = parseTimestamp(publishedAt)
        
        val resolvedCover = resolveMediaUrl(cover) ?: cover
        val resolvedAvatar = resolveMediaUrl(expertAvatar)
        
        val fallback = ContentCard(
            id = id,
            imageUrl = resolvedCover,
            title = title,
            tags = tags,
            author = authorDisplay,
            views = formatViewCount(viewCount),
            avatarUrl = resolvedAvatar,
            summary = expertTitle.takeIf { !it.isNullOrBlank() }
        )
        return CircleCard(
            id = id,
            title = title,
            coverImage = resolvedCover,
            tags = tags,
            authorName = authorDisplay,
            authorAvatar = resolvedAvatar,
            viewCount = viewCount,
            isExpert = true,
            orderKey = timestamp,
            fallbackCard = fallback
        )
    }

    private fun parseTimestamp(raw: String?): Long {
        if (raw.isNullOrBlank()) return 0L
        return try {
            Instant.parse(raw).toEpochMilli()
        } catch (_: DateTimeParseException) {
            0L
        }
    }

    private fun formatViewCount(value: Int): String {
        return when {
            value >= 10000 -> {
                val df = DecimalFormat("0.#")
                "${df.format(value / 10000.0)}万"
            }
            value >= 1000 -> {
                val df = DecimalFormat("0.#")
                "${df.format(value / 1000.0)}k"
            }
            else -> value.coerceAtLeast(0).toString()
        }
    }

    private data class LoadResult(
        val cards: List<CircleCard>,
        val errorMessage: String?
    )

    companion object {
        fun provideFactory(repository: ContentRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(CircleViewModel::class.java)) {
                        return CircleViewModel(repository) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class: $modelClass")
                }
            }
    }
}
