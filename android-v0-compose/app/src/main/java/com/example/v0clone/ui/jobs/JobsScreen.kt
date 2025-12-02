package com.xlwl.AiMian.ui.jobs

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.model.JobPreferenceDto
import com.xlwl.AiMian.data.repository.JobPreferenceRepository
import com.xlwl.AiMian.data.repository.JobRepository
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.distinctUntilChanged
import java.util.Locale

private val GradientTop = Color(0xFF00ACC3)
private val GradientBottom = Color(0xFFE9F7F9)
private val PageBackground = Color(0xFFF4F5F6)
private val TextPrimary = Color(0xFF2D3036)
private val TextSecondary = Color(0xFF8C929A)
private val AccentOrange = Color(0xFFF28B3F)
private val CardTagBackground = Color(0xFFF5F7FA)
private val CardTagText = Color(0xFF5F6773)
private val CardBorder = Color(0xFFE6E8EB)
private val SearchPlaceholder = Color(0xFFA6ABB1)
private val FilterGradientTop = Color(0xFF51ABB9)
private val FilterFieldBorder = Color(0xFFD9D9D9)
private val FilterChipDefaultBackground = Color(0xFFF4F5F8)
private val FilterChipDefaultBorder = Color(0xFFE6E8EB)
private val FilterChipSelectedBackground = Color(0xFFDFFBFF)
private val FilterChipSelectedText = Color(0xFF00ACC3)
private val DividerGray = Color(0xFFE5E7EB)
private val JobsTopBarExpandedHeight = 76.dp
private val JobsTopBarCollapsedHeight = 54.dp
private val JobsTopBarMaxOffset = 120.dp
private val JobsHeaderApproxHeight = JobsTopBarExpandedHeight + 126.dp
private val PreferenceChipBackground = Color(0xFFDFFBFF)
private val PreferenceChipOutline = Color(0xFF00ACC3)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun JobsScreen(
    repository: JobRepository,
    preferenceRepository: JobPreferenceRepository,
    preferenceRefreshSignal: Long? = null,
    preferencePayload: JobPreferenceDto? = null,
    onPreferenceRefreshConsumed: () -> Unit = {},
    onPreferencePayloadConsumed: () -> Unit = {},
    onJobClick: (jobId: String) -> Unit = {},
    onCompanyClick: (companyId: String) -> Unit = {},
    onEditIntentionClick: () -> Unit = {},
    onJobSelectionClick: () -> Unit = {}
) {
    val viewModel: JobsViewModel =
        viewModel(factory = JobsViewModel.provideFactory(repository, preferenceRepository))
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val maxOffsetPx = with(density) { JobsTopBarMaxOffset.toPx() }
    val topBarProgress by remember(maxOffsetPx) {
        derivedStateOf {
            if (maxOffsetPx <= 0f) return@derivedStateOf 1f
            val index = listState.firstVisibleItemIndex
            val offset = listState.firstVisibleItemScrollOffset
            val rawOffset = if (index > 0) {
                maxOffsetPx
            } else {
                offset.toFloat().coerceAtMost(maxOffsetPx)
            }
            (rawOffset / maxOffsetPx).coerceIn(0f, 1f)
        }
    }
    val focusManager = LocalFocusManager.current
    var showFilterSheet by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(preferencePayload) {
        val payload = preferencePayload
        if (payload != null) {
            viewModel.applyPreferencePayload(payload)
            onPreferencePayloadConsumed()
        }
    }

    LaunchedEffect(listState) {
        snapshotFlow {
            val info = listState.layoutInfo
            val lastVisible = info.visibleItemsInfo.lastOrNull()
            val reachedBottom = lastVisible != null &&
                lastVisible.index >= info.totalItemsCount - 2 &&
                lastVisible.offset + lastVisible.size >= info.viewportEndOffset - 96
            reachedBottom to listState.isScrollInProgress
        }
            .distinctUntilChanged()
            .collect { (reachedBottom, isScrolling) ->
                if (reachedBottom && !isScrolling && uiState.hasMore && !uiState.isPaginating && !uiState.isLoading) {
                    viewModel.loadMore()
                }
            }
    }

    LaunchedEffect(preferenceRefreshSignal) {
        if (preferenceRefreshSignal != null) {
            val needsReload = viewModel.refreshPreferences().await()
            if (!needsReload) {
                viewModel.refresh()
            }
            onPreferenceRefreshConsumed()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBackground)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(GradientTop, GradientBottom),
                        startY = 0f,
                        endY = 520f
                    )
                )
        )

        var headerHeightPx by remember { mutableStateOf(0) }
        val headerPlaceholderHeight = if (headerHeightPx > 0) {
            with(density) { headerHeightPx.toDp() }
        } else {
            JobsHeaderApproxHeight
        }

        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(
                bottom = 120.dp,
                start = 12.dp,
                end = 12.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item(key = "header-spacer") {
                Spacer(modifier = Modifier.height(headerPlaceholderHeight))
            }

            if (uiState.isLoading && uiState.jobs.isEmpty()) {
                item { JobsLoadingState() }
            } else if (uiState.error != null && uiState.jobs.isEmpty()) {
                item {
                    JobsErrorState(
                        message = uiState.error ?: "加载岗位数据失败",
                        onRetry = viewModel::retry
                    )
                }
            } else if (uiState.jobs.isEmpty()) {
                item { JobsEmptyState(onRetry = viewModel::refresh) }
            } else {
                if (uiState.error != null) {
                    item {
                        JobsInlineError(
                            message = uiState.error ?: "加载失败",
                            onRetry = viewModel::retry
                        )
                    }
                }

                items(
                    items = uiState.jobs,
                    key = { it.id }
                ) { job ->
                    JobCard(
                        job = job,
                        onCardClick = {
                            focusManager.clearFocus()
                            onJobClick(job.id)
                        },
                    )
                }

                if (uiState.isPaginating) {
                    item { JobsPaginationLoading() }
                } else if (!uiState.hasMore && uiState.jobs.isNotEmpty()) {
                    item { JobsNoMoreIndicator() }
                }
            }
        }

        JobsHeader(
            progress = topBarProgress,
            searchText = uiState.searchInput,
            onSearchChange = viewModel::onSearchInputChange,
            onSearchSubmit = {
                focusManager.clearFocus()
                viewModel.submitSearch()
            },
            onClearSearch = viewModel::clearSearch,
            keyword = uiState.filters.keyword,
            preferredPositions = uiState.preferredPositions,
            isPreferenceLoading = uiState.isPreferenceLoading,
            onPreferenceRemove = viewModel::removePreferredPosition,
            onEditClick = onEditIntentionClick,
            onJobSelectionClick = onJobSelectionClick,
            sort = uiState.filters.sort,
            onSortChange = viewModel::changeSort,
            cityLabel = uiState.filters.location ?: "城市",
            onFilterClick = { showFilterSheet = true },
            onHeightChanged = { headerHeightPx = it },
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }

    if (showFilterSheet) {
        JobFiltersSheet(
            filters = uiState.filters,
            onDismiss = { showFilterSheet = false },
            onApply = { values ->
                showFilterSheet = false
                viewModel.applyAdvancedFilters(values)
            },
            onReset = {
                viewModel.resetFilters()
            }
        )
    }
}

@Composable
private fun JobsHeader(
    progress: Float,
    searchText: String,
    onSearchChange: (String) -> Unit,
    onSearchSubmit: () -> Unit,
    onClearSearch: () -> Unit,
    keyword: String,
    preferredPositions: List<JobPreferenceItem>,
    isPreferenceLoading: Boolean,
    onPreferenceRemove: (String) -> Unit,
    onEditClick: () -> Unit,
    onJobSelectionClick: () -> Unit,
    sort: JobSort,
    onSortChange: (JobSort) -> Unit,
    cityLabel: String,
    onFilterClick: () -> Unit,
    onHeightChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val density = LocalDensity.current
    val barHeight = lerp(JobsTopBarExpandedHeight, JobsTopBarCollapsedHeight, progress)
    val horizontalPadding = lerp(16.dp, 14.dp, progress)
    val verticalPadding = lerp(12.dp, 10.dp, progress)
    val titleSize = lerp(26.sp, 22.sp, progress)
    val fieldHeight = lerp(42.dp, 38.dp, progress)
    val searchIconSize = lerp(18.dp, 16.dp, progress)
    val closeIconSize = lerp(18.dp, 16.dp, progress)
    val rowSpacing = lerp(14.dp, 10.dp, progress)
    val translateYPx = 0f
    val spacingBelowSearch = lerp(14.dp, 10.dp, progress)
    val bottomPadding = lerp(14.dp, 10.dp, progress)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer { translationY = translateYPx }
            .onGloballyPositioned { onHeightChanged(it.size.height) }
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(GradientTop, GradientBottom)
                )
            )
            .padding(bottom = bottomPadding)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
                .padding(horizontal = horizontalPadding, vertical = verticalPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(rowSpacing)
        ) {
            Text(
                text = "职岗",
                fontSize = titleSize,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                shadowElevation = 6.dp,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .height(fieldHeight)
                    .weight(1f)
            ) {
                BasicTextField(
                    value = searchText,
                    onValueChange = onSearchChange,
                    singleLine = true,
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Normal
                    ),
                    cursorBrush = SolidColor(AccentOrange),
                    keyboardOptions = KeyboardOptions.Default.copy(
                        imeAction = ImeAction.Search
                    ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                        onSearch = { onSearchSubmit() }
                    ),
                    decorationBox = { innerTextField ->
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                painter = androidx.compose.ui.res.painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_search),
                                contentDescription = null,
                                tint = SearchPlaceholder,
                                modifier = Modifier.size(searchIconSize)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(modifier = Modifier.weight(1f)) {
                                if (searchText.isBlank()) {
                                    Text(
                                        text = "搜索",
                                        color = SearchPlaceholder,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Normal
                                    )
                                }
                                innerTextField()
                            }
                            if (searchText.isNotBlank()) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    imageVector = Icons.Filled.Close,
                                    contentDescription = "清除搜索",
                                    tint = SearchPlaceholder,
                                    modifier = Modifier
                                        .size(closeIconSize)
                                        .clickable { onClearSearch() }
                                )
                            }
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }

        Spacer(modifier = Modifier.height(spacingBelowSearch))

        JobsIntentionCard(
            keyword = keyword,
            preferredPositions = preferredPositions,
            isPreferenceLoading = isPreferenceLoading,
            onPreferenceRemove = onPreferenceRemove,
            onEditClick = onEditClick,
            onJobSelectionClick = onJobSelectionClick,
            sort = sort,
            onSortChange = onSortChange,
            cityLabel = cityLabel,
            onFilterClick = onFilterClick,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobsIntentionCard(
    keyword: String,
    preferredPositions: List<JobPreferenceItem>,
    isPreferenceLoading: Boolean,
    onPreferenceRemove: (String) -> Unit,
    onEditClick: () -> Unit,
    onJobSelectionClick: () -> Unit,
    sort: JobSort,
    onSortChange: (JobSort) -> Unit,
    cityLabel: String,
    onFilterClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hasPreferences = preferredPositions.isNotEmpty()
    val titleText = when {
        hasPreferences -> "${preferredPositions.first().name} (意向岗位)"
        keyword.isNotBlank() -> keyword
        else -> "前端开发（意向岗位）"
    }

    Column(
        modifier = modifier
            .fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onJobSelectionClick),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = titleText,
                color = TextPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    painter = androidx.compose.ui.res.painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_edit),
                    contentDescription = "编辑意向",
                    tint = AccentOrange,
                    modifier = Modifier
                        .size(20.dp)
                        .clickable { onEditClick() }
                )
                if (isPreferenceLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = AccentOrange
                    )
                }
            }
        }

        if (hasPreferences && preferredPositions.size > 1) {
            PreferenceChipRow(
                preferences = preferredPositions,
                onRemove = onPreferenceRemove,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(22.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SortTab(
                    label = "推荐",
                    active = sort == JobSort.RECOMMENDED,
                    onClick = { onSortChange(JobSort.RECOMMENDED) }
                )
                SortTab(
                    label = "最新",
                    active = sort == JobSort.LATEST,
                    onClick = { onSortChange(JobSort.LATEST) }
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(18.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterPill(
                    label = cityLabel,
                    onClick = onFilterClick
                )
                FilterPill(
                    label = "筛选",
                    onClick = onFilterClick
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PreferenceChipRow(
    preferences: List<JobPreferenceItem>,
    onRemove: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
    ) {
        preferences.forEach { item ->
            val displayText = item.name
            Surface(
                color = PreferenceChipBackground,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, PreferenceChipOutline)
            ) {
                Box(modifier = Modifier.padding(start = 10.dp, end = 6.dp, top = 5.dp, bottom = 5.dp)) {
                    Text(
                        text = displayText,
                        color = PreferenceChipOutline,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .padding(end = 18.dp)
                    )
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "删除意向职岗",
                        tint = PreferenceChipOutline,
                        modifier = Modifier
                            .size(14.dp)
                            .align(Alignment.TopEnd)
                            .clickable { onRemove(item.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SortTab(label: String, active: Boolean, onClick: () -> Unit) {
    Text(
        text = label,
        color = if (active) TextPrimary else CardTagText,
        fontSize = 15.sp,
        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
        modifier = Modifier.clickable(onClick = onClick)
    )
}

@Composable
private fun FilterPill(
    label: String,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(text = label, color = TextSecondary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        Icon(
            painter = androidx.compose.ui.res.painterResource(id = com.xlwl.AiMian.R.drawable.ic_jobs_chevron_down),
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(width = 11.dp, height = 6.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobCard(
    job: JobListing,
    onCardClick: () -> Unit
) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 4.dp,
        tonalElevation = 0.dp,
        border = BorderStroke(1.dp, CardBorder),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onCardClick)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = job.title.ifBlank { "前端开发" },
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = job.salary.ifBlank { "薪资面议" },
                    color = AccentOrange,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }

            val tagCandidates = buildList {
                if (job.education.isNotBlank()) add(job.education)
                if (job.experience.isNotBlank()) add(job.experience)
                job.tags.forEach { if (it.isNotBlank()) add(it) }
                job.type?.let { add(formatJobType(it)) }
                job.level?.let { add(formatJobLevel(it)) }
            }.distinct()

            if (tagCandidates.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    tagCandidates.take(3).forEach { tag ->
                        Surface(
                            color = CardTagBackground,
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(1.dp, CardBorder)
                        ) {
                            Text(
                                text = tag,
                                color = CardTagText,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val avatarColor = AccentOrange
                Surface(
                    shape = CircleShape,
                    color = avatarColor.copy(alpha = 0.18f),
                    modifier = Modifier.size(42.dp)
                ) {
                    if (job.companyLogo.isNullOrBlank()) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Icon(
                                painter = androidx.compose.ui.res.painterResource(id = com.xlwl.AiMian.R.drawable.ic_tab_jobs_filled),
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    } else {
                        AsyncImage(
                            model = job.companyLogo,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = job.company.ifBlank { "公司名称" },
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = job.companyTagline.ifBlank { "公司的简单介绍" },
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Normal,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Place,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = job.location.ifBlank { "上海 徐汇区" },
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun JobsLoadingState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = AccentOrange)
    }
}

@Composable
private fun JobsPaginationLoading() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            color = AccentOrange,
            strokeWidth = 2.dp,
            modifier = Modifier.size(28.dp)
        )
    }
}

@Composable
private fun JobsNoMoreIndicator() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text = "已经到底啦", color = TextSecondary, fontSize = 12.sp)
    }
}

@Composable
private fun JobsErrorState(
    message: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(text = message, color = TextPrimary, fontWeight = FontWeight.Medium)
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
            shape = RoundedCornerShape(20.dp)
        ) {
            Text(text = "重新加载", color = Color.White)
        }
    }
}

@Composable
private fun JobsInlineError(
    message: String,
    onRetry: () -> Unit
) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = message, color = TextPrimary, fontSize = 13.sp)
            Text(
                text = "重试",
                color = AccentOrange,
                fontSize = 13.sp,
                modifier = Modifier.clickable { onRetry() }
            )
        }
    }
}

@Composable
private fun JobsEmptyState(onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "暂无匹配的岗位",
            color = TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "试试调整筛选条件或搜索关键词",
            color = TextSecondary,
            fontSize = 13.sp
        )
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
            shape = RoundedCornerShape(20.dp)
        ) {
            Text(text = "重新获取推荐", color = Color.White)
        }
    }
}

@Composable
private fun JobFiltersSheet(
    filters: ActiveJobFilters,
    onDismiss: () -> Unit,
    onApply: (AdvancedFilterValues) -> Unit,
    onReset: () -> Unit
) {
    var location by remember { mutableStateOf(filters.location.orEmpty()) }
    var experience by remember { mutableStateOf(filters.experience) }
    var education by remember { mutableStateOf(filters.education) }
    var typeValue by remember { mutableStateOf(filters.type) }
    var levelValue by remember { mutableStateOf(filters.level) }
    var remoteOnly by remember { mutableStateOf(filters.remoteOnly) }
    val scrollState = rememberScrollState()

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(192.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(FilterGradientTop, Color.White)
                        )
                    )
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
            ) {
                FilterHeader(onBack = onDismiss)

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(scrollState)
                        .padding(horizontal = 12.dp)
                        .padding(top = 16.dp, bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    FilterLocationField(
                        value = location,
                        onValueChange = { location = it }
                    )

                    FilterSection(
                        title = "经验要求",
                        options = experienceOptions,
                        selectedValue = experience
                    ) { experience = it }

                    FilterSection(
                        title = "学历要求",
                        options = educationOptions,
                        selectedValue = education
                    ) { education = it }

                    FilterSection(
                        title = "职位类型",
                        options = typeOptions,
                        selectedValue = typeValue
                    ) { typeValue = it }

                    FilterSection(
                        title = "职位级别",
                        options = levelOptions,
                        selectedValue = levelValue
                    ) { levelValue = it }

                    FilterSection(
                        title = "远程要求",
                        options = remoteOptions,
                        selectedValue = remoteOnly
                    ) { remoteOnly = it }
                }
            }

            FilterBottomActions(
                onReset = {
                    location = ""
                    experience = null
                    education = null
                    typeValue = null
                    levelValue = null
                    remoteOnly = false
                    onReset()
                },
                onApply = {
                    onApply(
                        AdvancedFilterValues(
                            location = location.trim().ifBlank { null },
                            experience = experience,
                            education = education,
                            type = typeValue,
                            level = levelValue,
                            remoteOnly = remoteOnly
                        )
                    )
                },
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}

@Composable
private fun FilterHeader(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .padding(top = 12.dp)
                .size(40.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "返回",
                tint = Color.White
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "筛选",
            color = TextPrimary,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun FilterLocationField(
    value: String,
    onValueChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = "工作地点",
            color = TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
        Surface(
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, FilterFieldBorder),
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .defaultMinSize(minHeight = 48.dp)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 14.sp
                    ),
                    cursorBrush = SolidColor(TextPrimary),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions.Default.copy(
                        imeAction = ImeAction.Done
                    ),
                    decorationBox = { inner ->
                        if (value.isEmpty()) {
                            Text(
                                text = "如：北京 / 远程",
                                color = TextSecondary,
                                fontSize = 14.sp
                            )
                        }
                        inner()
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> FilterSection(
    title: String,
    options: List<FilterChoice<T>>,
    selectedValue: T,
    onSelect: (T) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val spacing = 10.dp
            val itemWidth = (maxWidth - spacing * 2) / 3
            FlowRow(
                maxItemsInEachRow = 3,
                horizontalArrangement = Arrangement.spacedBy(spacing),
                verticalArrangement = Arrangement.spacedBy(spacing)
            ) {
                options.forEach { option ->
                    val isSelected = selectedValue == option.value
                    FilterChoiceChip(
                        label = option.label,
                        selected = isSelected,
                        onClick = { onSelect(option.value) },
                        modifier = Modifier.width(itemWidth)
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (selected) FilterChipSelectedBackground else FilterChipDefaultBackground,
        border = BorderStroke(
            width = 1.dp,
            color = if (selected) FilterChipSelectedText else FilterChipDefaultBorder
        ),
        modifier = modifier
            .defaultMinSize(minHeight = 38.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 4.dp)
        ) {
            Text(
                text = label,
                color = if (selected) FilterChipSelectedText else Color(0xFFA5A5A5),
                fontSize = 14.sp,
                fontWeight = if (selected) FontWeight.Medium else FontWeight.Normal,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun FilterBottomActions(
    onReset: () -> Unit,
    onApply: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        color = Color.White,
        shadowElevation = 12.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .padding(top = 8.dp, bottom = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                onClick = onReset,
                shape = RoundedCornerShape(40.dp),
                color = FilterChipDefaultBackground,
                modifier = Modifier
                    .height(44.dp)
                    .weight(1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "重置",
                        color = TextSecondary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            Button(
                onClick = onApply,
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                shape = RoundedCornerShape(40.dp),
                modifier = Modifier
                    .height(44.dp)
                    .weight(1.8f)
            ) {
                Text(
                    text = "保存",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

private data class FilterChoice<T>(val label: String, val value: T)

private val experienceOptions = listOf(
    FilterChoice<String?>("不限", null),
    FilterChoice<String?>("1-3年", "1-3年"),
    FilterChoice<String?>("3-5年", "3-5年"),
    FilterChoice<String?>("5年以上", "5年以上")
)

private val educationOptions = listOf(
    FilterChoice<String?>("不限", null),
    FilterChoice<String?>("大专", "大专"),
    FilterChoice<String?>("本科", "本科"),
    FilterChoice<String?>("硕士", "硕士"),
    FilterChoice<String?>("博士", "博士")
)

private val typeOptions = listOf(
    FilterChoice<String?>("不限", null),
    FilterChoice<String?>("全职", "FULL_TIME"),
    FilterChoice<String?>("兼职", "PART_TIME"),
    FilterChoice<String?>("合同制", "CONTRACT"),
    FilterChoice<String?>("实习", "INTERN")
)

private val levelOptions = listOf(
    FilterChoice<String?>("不限", null),
    FilterChoice<String?>("实习生", "INTERN"),
    FilterChoice<String?>("初级", "JUNIOR"),
    FilterChoice<String?>("中级", "MIDDLE"),
    FilterChoice<String?>("高级", "SENIOR"),
    FilterChoice<String?>("专家", "LEAD"),
    FilterChoice<String?>("主管", "MANAGER")
)

private val remoteOptions = listOf(
    FilterChoice("不限", false),
    FilterChoice("仅远程", true)
)

private fun formatJobType(type: String): String = when (type.uppercase(Locale.getDefault())) {
    "FULL_TIME" -> "全职"
    "PART_TIME" -> "兼职"
    "INTERN" -> "实习"
    "CONTRACT" -> "合同制"
    else -> type
}

private fun formatJobLevel(level: String): String = when (level.uppercase(Locale.getDefault())) {
    "INTERN" -> "实习生"
    "JUNIOR" -> "初级"
    "MIDDLE" -> "中级"
    "SENIOR" -> "高级"
    "LEAD" -> "专家"
    "MANAGER" -> "主管"
    else -> level
}
