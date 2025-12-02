package com.xlwl.AiMian.ui.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.xlwl.AiMian.data.model.JobPreferenceDto
import com.xlwl.AiMian.data.repository.JobPreferenceRepository
import com.xlwl.AiMian.data.repository.JobQueryParams
import com.xlwl.AiMian.data.repository.JobRepository
import java.time.Instant
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val PAGE_SIZE = 10

data class JobsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isPaginating: Boolean = false,
    val jobs: List<JobListing> = emptyList(),
    val featuredCompanies: List<CompanyShowcase> = emptyList(),
    val sections: List<JobSection> = emptyList(),
    val hasMore: Boolean = true,
    val page: Int = 1,
    val filters: ActiveJobFilters = ActiveJobFilters(),
    val searchInput: String = "",
    val preferredPositions: List<JobPreferenceItem> = emptyList(),
    val isPreferenceLoading: Boolean = false,
    val error: String? = null
)

enum class JobSort(val query: String) {
    RECOMMENDED("recommended"),
    LATEST("latest")
}

data class ActiveJobFilters(
    val keyword: String = "",
    val category: String? = null,
    val location: String? = null,
    val sort: JobSort = JobSort.RECOMMENDED,
    val remoteOnly: Boolean = false,
    val type: String? = null,
    val level: String? = null,
    val experience: String? = null,
    val education: String? = null,
    val dictionaryPositionIds: List<String> = emptyList()
)

data class AdvancedFilterValues(
    val location: String? = null,
    val experience: String? = null,
    val education: String? = null,
    val type: String? = null,
    val level: String? = null,
    val remoteOnly: Boolean = false
)

class JobsViewModel(
    private val repository: JobRepository,
    private val preferenceRepository: JobPreferenceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(JobsUiState())
    val uiState: StateFlow<JobsUiState> = _uiState.asStateFlow()

    private var jobsJob: Job? = null

    init {
        loadSupplementaryData(force = true)
        viewModelScope.launch {
            loadPreferencesInternal(initial = true)
        }
    }

    fun refresh() {
        loadSupplementaryData(force = true)
        loadJobs(reset = true, showLoading = _uiState.value.jobs.isEmpty())
    }

    fun retry() {
        val showLoading = _uiState.value.jobs.isEmpty()
        loadJobs(reset = true, showLoading = showLoading)
    }

    fun loadMore() {
        loadJobs(reset = false, showLoading = false)
    }

    fun refreshPreferences() = viewModelScope.async {
        loadPreferencesInternal(initial = false)
    }

    fun removePreferredPosition(positionId: String) {
        val currentState = _uiState.value
        if (currentState.isPreferenceLoading) return

        val existingPreferences = currentState.preferredPositions
        if (existingPreferences.isEmpty()) return
        if (existingPreferences.none { it.id == positionId }) return

        val updatedPreferences = existingPreferences.filterNot { it.id == positionId }
        val updatedIds = updatedPreferences.map { it.id }
        val previousFilters = currentState.filters
        val updatedFilters = previousFilters
            .copy(dictionaryPositionIds = updatedIds)
            .normalized()

        _uiState.update {
            it.copy(
                preferredPositions = updatedPreferences,
                filters = updatedFilters,
                isPreferenceLoading = true
            )
        }

        viewModelScope.launch {
            val result = preferenceRepository.savePreferences(updatedIds)
            result.fold(
                onSuccess = { payload ->
                    val items = payload.toPreferenceItems()
                    val ids = items.map { it.id }
                    val showLoading = _uiState.value.jobs.isEmpty()
                    _uiState.update { state ->
                        state.copy(
                            preferredPositions = items,
                            filters = state.filters
                                .copy(dictionaryPositionIds = ids)
                                .normalized(),
                            isPreferenceLoading = false
                        )
                    }
                    loadJobs(reset = true, showLoading = showLoading)
                },
                onFailure = {
                    _uiState.update { state ->
                        state.copy(
                            preferredPositions = existingPreferences,
                            filters = previousFilters,
                            isPreferenceLoading = false
                        )
                    }
                }
            )
        }
    }

    fun applyPreferencePayload(payload: JobPreferenceDto) {
        val items = payload.toPreferenceItems()
        val ids = items.map { it.id }
        val showLoading = _uiState.value.jobs.isEmpty()
        _uiState.update { state ->
            val updatedFilters = state.filters
                .copy(dictionaryPositionIds = ids)
                .normalized()
            state.copy(
                preferredPositions = items,
                filters = updatedFilters,
                isPreferenceLoading = false
            )
        }
        loadJobs(reset = true, showLoading = showLoading)
    }

    fun onSearchInputChange(value: String) {
        _uiState.update { it.copy(searchInput = value) }
    }

    fun submitSearch() {
        val keyword = _uiState.value.searchInput
        updateFilters { copy(keyword = keyword) }
    }

    fun clearSearch() {
        _uiState.update { it.copy(searchInput = "") }
        updateFilters { copy(keyword = "") }
    }

    fun changeSort(sort: JobSort) {
        if (sort == _uiState.value.filters.sort) return
        updateFilters { copy(sort = sort) }
    }

    fun toggleRemoteOnly() {
        updateFilters { copy(remoteOnly = !remoteOnly) }
    }

    fun selectQuickCategory(category: String?) {
        updateFilters {
            val target = if (category != null && category == this.category) null else category
            copy(category = target)
        }
    }

    fun applyAdvancedFilters(values: AdvancedFilterValues) {
        updateFilters {
            copy(
                location = values.location,
                experience = values.experience,
                education = values.education,
                type = values.type,
                level = values.level,
                remoteOnly = values.remoteOnly
            )
        }
    }

    fun resetFilters(keepSort: Boolean = true) {
        val current = _uiState.value
        val sort = if (keepSort) current.filters.sort else JobSort.RECOMMENDED
        val reset = ActiveJobFilters(
            sort = sort,
            dictionaryPositionIds = current.filters.dictionaryPositionIds
        )
        val showLoading = current.jobs.isEmpty()
        _uiState.update { it.copy(filters = reset, searchInput = reset.keyword) }
        loadJobs(reset = true, showLoading = showLoading)
    }

    private fun updateFilters(transform: ActiveJobFilters.() -> ActiveJobFilters) {
        val updated = transform(_uiState.value.filters).normalized()
        if (updated == _uiState.value.filters) return
        val showLoading = _uiState.value.jobs.isEmpty()
        _uiState.update { it.copy(filters = updated, searchInput = updated.keyword) }
        loadJobs(reset = true, showLoading = showLoading)
    }

    private suspend fun loadPreferencesInternal(initial: Boolean): Boolean {
        _uiState.update { it.copy(isPreferenceLoading = true) }
        val previousState = _uiState.value
        val result = preferenceRepository.fetchPreferences()
        val fetchedItems = result.getOrNull()?.toPreferenceItems()
        val success = fetchedItems != null
        val items = fetchedItems ?: previousState.preferredPositions
        val newIds = fetchedItems?.map { it.id } ?: previousState.filters.dictionaryPositionIds
        val filtersChanged = success && previousState.filters.dictionaryPositionIds != newIds

        _uiState.update { state ->
            val updatedFilters = if (filtersChanged) {
                state.filters.copy(dictionaryPositionIds = newIds)
            } else {
                state.filters
            }
            state.copy(
                isPreferenceLoading = false,
                preferredPositions = items,
                filters = updatedFilters
            )
        }

        val shouldReload = success && (initial || filtersChanged)
        if (shouldReload) {
            val showLoading = initial || _uiState.value.jobs.isEmpty()
            loadJobs(reset = true, showLoading = showLoading)
        }

        if (!success) {
            result.exceptionOrNull()?.let { throwable ->
                if (initial) {
                    _uiState.update { state ->
                        state.copy(error = state.error ?: throwable.message)
                    }
                }
            }
        }

        return shouldReload
    }
    private fun loadJobs(reset: Boolean, showLoading: Boolean) {
        val snapshot = _uiState.value
        if (!reset && (snapshot.isPaginating || !snapshot.hasMore || snapshot.isLoading)) {
            return
        }

        jobsJob?.cancel()
        jobsJob = viewModelScope.launch {
            if (reset) {
                _uiState.update {
                    it.copy(
                        isLoading = showLoading,
                        isRefreshing = !showLoading && it.jobs.isNotEmpty(),
                        isPaginating = false,
                        page = 1,
                        hasMore = true,
                        error = null
                    )
                }
            } else {
                _uiState.update { it.copy(isPaginating = true, error = null) }
            }

            val targetPage = if (reset) 1 else snapshot.page + 1
            val params = _uiState.value.filters.toQueryParams()
            val now = Instant.now()
            val result = repository.getJobs(targetPage, PAGE_SIZE, params)

            result.fold(
                onSuccess = { data ->
                    val listings = data.list.map { it.toJobListing(now) }
                    _uiState.update { state ->
                        if (reset) {
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                jobs = listings,
                                hasMore = data.hasMore,
                                page = targetPage,
                                error = null
                            )
                        } else {
                            state.copy(
                                isPaginating = false,
                                jobs = state.jobs + listings,
                                hasMore = data.hasMore,
                                page = targetPage,
                                error = null
                            )
                        }
                    }
                },
                onFailure = { throwable ->
                    val message = throwable.message ?: "加载岗位数据失败"
                    _uiState.update { state ->
                        if (reset) {
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                jobs = if (showLoading) emptyList() else state.jobs,
                                hasMore = false,
                                page = if (showLoading) 1 else state.page,
                                error = message
                            )
                        } else {
                            state.copy(
                                isPaginating = false,
                                error = message
                            )
                        }
                    }
                }
            )
        }
    }

    private fun loadSupplementaryData(force: Boolean) {
        val state = _uiState.value
        val needCompanies = force || state.featuredCompanies.isEmpty()
        val needSections = force || state.sections.isEmpty()
        if (!needCompanies && !needSections) return

        viewModelScope.launch {
            val now = Instant.now()

            if (needCompanies) {
                val companiesResult = repository.getCompanyShowcases()
                if (companiesResult.isSuccess) {
                    val showcases = companiesResult.getOrNull().orEmpty().map { it.toCompanyShowcase() }
                    _uiState.update { it.copy(featuredCompanies = showcases) }
                }
            }

            if (needSections) {
                val sectionsResult = repository.getJobSections()
                if (sectionsResult.isSuccess) {
                    val sections = sectionsResult.getOrNull().orEmpty().map { it.toJobSection(now) }
                    _uiState.update { it.copy(sections = sections) }
                }
            }
        }
    }

    companion object {
        fun provideFactory(
            repository: JobRepository,
            preferenceRepository: JobPreferenceRepository
        ): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    if (modelClass.isAssignableFrom(JobsViewModel::class.java)) {
                        return JobsViewModel(repository, preferenceRepository) as T
                    }
                    throw IllegalArgumentException("Unknown ViewModel class")
                }
            }
    }
}

private fun ActiveJobFilters.toQueryParams(): JobQueryParams = JobQueryParams(
    keyword = keyword.trim().ifBlank { null },
    location = location?.trim().takeUnless { it.isNullOrBlank() },
    type = type?.trim().takeUnless { it.isNullOrBlank() },
    level = level?.trim().takeUnless { it.isNullOrBlank() },
    category = category?.trim().takeUnless { it.isNullOrBlank() },
    remoteOnly = remoteOnly,
    sort = sort.query,
    experience = experience?.trim().takeUnless { it.isNullOrBlank() },
    education = education?.trim().takeUnless { it.isNullOrBlank() },
    dictionaryPositionIds = dictionaryPositionIds
        .mapNotNull { it.trim().takeIf { trimmed -> trimmed.isNotEmpty() } }
)

private fun ActiveJobFilters.normalized(): ActiveJobFilters = copy(
    keyword = keyword.trim(),
    category = category?.trim()?.takeIf { it.isNotEmpty() },
    location = location?.trim()?.takeIf { it.isNotEmpty() },
    type = type?.trim()?.takeIf { it.isNotEmpty() },
    level = level?.trim()?.takeIf { it.isNotEmpty() },
    experience = experience?.trim()?.takeIf { it.isNotEmpty() },
    education = education?.trim()?.takeIf { it.isNotEmpty() },
    dictionaryPositionIds = dictionaryPositionIds
        .mapNotNull { it.trim().takeIf { trimmed -> trimmed.isNotEmpty() } }
        .distinct()
)
