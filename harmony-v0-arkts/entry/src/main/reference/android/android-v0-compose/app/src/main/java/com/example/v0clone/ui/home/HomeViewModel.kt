package com.xlwl.AiMian.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.api.PagedData
import com.xlwl.AiMian.data.model.Banner
import com.xlwl.AiMian.data.model.HomeFeaturedArticle
import com.xlwl.AiMian.data.repository.ContentRepository
import java.io.Serializable
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Banner数据模型
 */
data class BannerData(
    val id: String,
    val imageUrl: String,
    val label: String,
    val title: String,
    val subtitle: String
)

/**
 * 内容卡片数据模型
 */
data class ContentCard(
    val id: String,
    val imageUrl: String,
    val title: String,
    val tags: List<String>,
    val author: String,
    val views: String,
    val avatarUrl: String?,
    val summary: String?
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
    private val pageSize = 6
    private val mockAvatarUrls = listOf(
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&h=160&q=80"
    )
    private val avatarAssignments = mutableMapOf<String, String>()
    private var avatarCursor = 0

    init {
        refresh()
        startBannerAutoScroll()
    }

    private suspend fun loadInitialData() {
        val bannersDeferred = viewModelScope.async { repository.getHomeBanners() }
        val articlesDeferred = viewModelScope.async {
            repository.getHomeFeaturedArticles(page = currentPage, pageSize = pageSize)
        }

        val bannersResult = bannersDeferred.await()
        val articlesResult = articlesDeferred.await()

        val banners = bannersResult.getOrElse { error ->
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoadingMore = false,
                error = error.message ?: "加载Banner失败"
            )
            return
        }

        val articles = articlesResult.getOrElse { error ->
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoadingMore = false,
                error = error.message ?: "加载首页内容失败"
            )
            return
        }

        updateStateWithData(banners, articles, reset = true)
    }

    private fun updateStateWithData(
        banners: List<Banner>?,
        articles: PagedData<HomeFeaturedArticle>,
        reset: Boolean
    ) {
        val bannerItems = banners?.map { it.toBannerData() } ?: _uiState.value.banners
        val cards = articles.list.map { it.toContentCard() }

        _uiState.value = _uiState.value.copy(
            banners = bannerItems,
            contentCards = if (reset) cards else _uiState.value.contentCards + cards,
            currentBannerIndex = if (reset) 0 else _uiState.value.currentBannerIndex,
            isLoading = false,
            isLoadingMore = false,
            hasMore = articles.hasMore,
            error = null
        )
        currentPage = articles.page
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

            val result = repository.getHomeFeaturedArticles(nextPage, pageSize)
            result.onSuccess { paged ->
                updateStateWithData(
                    banners = null,
                    articles = paged,
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

    private fun Banner.toBannerData() = BannerData(
        id = id,
        imageUrl = imageUrl,
        label = subtitle,
        title = title,
        subtitle = description
    )

    private fun HomeFeaturedArticle.toContentCard(): ContentCard {
        val displayAuthor = when {
            !author.isNullOrBlank() -> author
            !category.isNullOrBlank() -> category
            else -> "AI面试官"
        }
        val avatarKey = author?.takeIf { it.isNotBlank() } ?: id

        return ContentCard(
            id = id,
            imageUrl = imageUrl,
            title = title,
            tags = tags,
            author = displayAuthor,
            views = formatViewCount(viewCount),
            avatarUrl = getMockAvatarFor(avatarKey),
            summary = summary
        )
    }

    private fun formatViewCount(count: Int): String = when {
        count >= 1_000_000 -> String.format("%.1fM", count / 1_000_000f)
        count >= 1_000 -> String.format("%.1fk", count / 1_000f)
        else -> count.toString()
    }

    private fun getMockAvatarFor(key: String): String {
        val safeKey = key.ifBlank { "default" }
        return avatarAssignments.getOrPut(safeKey) {
            val avatar = mockAvatarUrls[avatarCursor % mockAvatarUrls.size]
            avatarCursor = (avatarCursor + 1) % mockAvatarUrls.size
            avatar
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
