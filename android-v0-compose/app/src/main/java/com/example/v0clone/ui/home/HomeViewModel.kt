package com.xlwl.AiMian.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.api.PagedData
import com.xlwl.AiMian.data.model.Banner
import com.xlwl.AiMian.data.model.HomeFeedItem
import com.xlwl.AiMian.data.model.HomeFeedTargetType
import com.xlwl.AiMian.data.repository.ContentRepository
import java.io.Serializable
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.xlwl.AiMian.ui.components.BannerData

/**
 * 内容卡片数据模型
 */
data class ContentCard(
    val id: String,
    val imageUrl: String?,
    val title: String,
    val tags: List<String>,
    val author: String,
    val views: String,
    val avatarUrl: String?,
    val summary: String?,
    val badge: String? = null,
    val targetType: HomeFeedTargetType = HomeFeedTargetType.POST,
    val targetId: String = id,
    val salary: String? = null,
    val location: String? = null
) : Serializable

/**
 * 首页UI状态
 */
data class HomeUiState(
    val banners: List<BannerData> = emptyList(),
    val currentBannerIndex: Int = 0,
    val contentCards: List<ContentCard> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = true,
    val error: String? = null
)

/**
 * 首页ViewModel
 */
class HomeViewModel(private val repository: ContentRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var currentPage = 1
    private val pageSize = 12

    init {
        refresh()
        startBannerAutoScroll()
    }

    private suspend fun loadInitialData() {
        val bannersDeferred = viewModelScope.async { repository.getHomeBanners() }
        val feedDeferred = viewModelScope.async {
            repository.getHomeFeed(page = currentPage, pageSize = pageSize)
        }

        val bannersResult = bannersDeferred.await()
        val feedResult = feedDeferred.await()

        val banners = bannersResult.getOrElse { error ->
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoadingMore = false,
                error = error.message ?: "加载Banner失败"
            )
            return
        }

        val feed = feedResult.getOrElse { error ->
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoadingMore = false,
                error = error.message ?: "加载首页内容失败"
            )
            return
        }

        updateStateWithData(banners, feed, reset = true)
    }

    private fun updateStateWithData(
        banners: List<Banner>?,
        feed: PagedData<HomeFeedItem>,
        reset: Boolean
    ) {
        val bannerItems = banners?.map { it.toBannerData() } ?: _uiState.value.banners
        val cards = feed.list.map { it.toContentCard() }

        _uiState.value = _uiState.value.copy(
            banners = bannerItems,
            contentCards = if (reset) cards else _uiState.value.contentCards + cards,
            currentBannerIndex = if (reset) 0 else _uiState.value.currentBannerIndex,
            isLoading = false,
            isLoadingMore = false,
            hasMore = feed.hasMore,
            error = null
        )
        currentPage = feed.page
    }

    /**
     * 启动Banner自动轮播
     */
    private fun startBannerAutoScroll() {
        viewModelScope.launch {
            while (true) {
                delay(3000)
                val bannerCount = _uiState.value.banners.size
                if (bannerCount > 0) {
                    _uiState.value = _uiState.value.copy(
                        currentBannerIndex = (_uiState.value.currentBannerIndex + 1) % bannerCount
                    )
                }
            }
        }
    }

    /**
     * 刷新数据
     */
    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            currentPage = 1
            loadInitialData()
        }
    }

    /**
     * 加载更多数据
     */
    fun loadMore() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMore) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingMore = true, error = null)
            val nextPage = currentPage + 1

            val result = repository.getHomeFeed(nextPage, pageSize)
            result.onSuccess { paged ->
                updateStateWithData(
                    banners = null,
                    feed = paged,
                    reset = false
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    isLoadingMore = false,
                    error = error.message ?: "加载更多失败"
                )
            }
        }
    }

    private fun resolveMediaUrl(url: String?): String? {
        if (url.isNullOrBlank()) return null
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        
        val baseUrl = com.xlwl.AiMian.config.AppConfig.apiBaseUrl
        // 去掉开头的 /api/ 以便与 apiBaseUrl (通常以 api/ 结尾) 接合
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

    private fun HomeFeedItem.toContentCard(): ContentCard {
        // 从 metricValue 中解析薪资信息（适用于职岗类型）
        val salaryValue = if (targetType == HomeFeedTargetType.JOB) metricValue else null
        // 从 tags 中提取城市信息（通常是最后一个 tag）
        val locationValue = if (targetType == HomeFeedTargetType.JOB || targetType == HomeFeedTargetType.COMPANY) {
            tags.lastOrNull()?.takeIf { it.isNotBlank() }
        } else null

        val viewsValue = when {
            targetType == HomeFeedTargetType.POST -> parseMetricViewCount(metricValue).toString()
            targetType == HomeFeedTargetType.JOB -> "" // 职岗卡片底部不显示浏览量（因为已有薪资）
            else -> metricValue ?: ""
        }

        return ContentCard(
            id = id,
            imageUrl = resolveMediaUrl(imageUrl),
            title = title,
            tags = tags,
            author = authorName,
            views = viewsValue,
            avatarUrl = resolveMediaUrl(authorAvatar),
            summary = summary
                ?.takeIf { it.isNotBlank() },
            badge = badge,
            targetType = targetType,
            targetId = targetId,
            salary = salaryValue,
            location = locationValue
        )
    }

    private fun parseMetricViewCount(metricValue: String?): Int {
        val raw = metricValue
            ?.replace("浏览", "", ignoreCase = true)
            ?.trim()
            .orEmpty()

        if (raw.isEmpty()) return 0

        return when {
            raw.endsWith("M", ignoreCase = true) -> {
                (raw.dropLast(1).toDoubleOrNull()?.times(1_000_000))?.toInt() ?: 0
            }
            raw.endsWith("K", ignoreCase = true) -> {
                (raw.dropLast(1).toDoubleOrNull()?.times(1_000))?.toInt() ?: 0
            }
            else -> raw.toIntOrNull() ?: 0
        }
    }

    companion object {
        fun provideFactory(repository: ContentRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(HomeViewModel::class.java)) {
                        return HomeViewModel(repository) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class")
                }
            }
    }
}
