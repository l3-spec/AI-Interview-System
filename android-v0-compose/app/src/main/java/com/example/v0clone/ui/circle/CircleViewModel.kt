package com.xlwl.AiMian.ui.circle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.api.PagedData
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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val PAGE_SIZE = 20

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
    }

    fun refresh() {
        currentUserPage = 0
        currentExpertPage = 0
        userHasMore = true
        expertHasMore = true
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, isAppending = false, error = null) }
            val result = loadPages(userPage = 1, expertPage = 1, replace = true)
            if (result.cards.isNotEmpty()) {
                _uiState.value = CircleUiState(
                    cards = result.cards,
                    isLoading = false,
                    error = result.errorMessage
                )
            } else {
                _uiState.value = CircleUiState(
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
        val cover = coverImage ?: images.firstOrNull() ?: ""
        val authorDisplay = author?.name?.takeIf { it.isNotBlank() } ?: "STAR-LINK 职圈"
        val timestamp = parseTimestamp(createdAt)
        val fallback = ContentCard(
            id = id,
            imageUrl = cover,
            title = title,
            tags = tags,
            author = authorDisplay,
            views = formatViewCount(viewCount),
            avatarUrl = author?.avatar,
            summary = null
        )
        return CircleCard(
            id = id,
            title = title,
            coverImage = cover,
            tags = tags,
            authorName = authorDisplay,
            authorAvatar = author?.avatar,
            viewCount = viewCount,
            isExpert = false,
            orderKey = timestamp,
            fallbackCard = fallback
        )
    }

    private fun ExpertPost.toCircleCard(): CircleCard {
        val cover = coverImage ?: ""
        val authorDisplay = expertName.ifBlank { "STAR-LINK 职圈大咖" }
        val timestamp = parseTimestamp(publishedAt)
        val fallback = ContentCard(
            id = id,
            imageUrl = cover,
            title = title,
            tags = tags,
            author = authorDisplay,
            views = formatViewCount(viewCount),
            avatarUrl = expertAvatar,
            summary = expertTitle.takeIf { !it.isNullOrBlank() }
        )
        return CircleCard(
            id = id,
            title = title,
            coverImage = cover,
            tags = tags,
            authorName = authorDisplay,
            authorAvatar = expertAvatar,
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
