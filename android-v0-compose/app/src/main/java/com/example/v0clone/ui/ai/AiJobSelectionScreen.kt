package com.xlwl.AiMian.ui.ai

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.data.model.JobDictionaryCategory
import com.xlwl.AiMian.data.model.JobDictionaryPosition
import com.xlwl.AiMian.data.repository.JobDictionaryRepository
import com.xlwl.AiMian.data.repository.JobPreferenceRepository
import kotlinx.coroutines.launch

private val GradientTop = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF00ACC3),
        Color(0xFF00ACC3),
        Color(0xFF51ABB9),
        Color.White
    )
)
private val AccentCyan = Color(0xFF00ADC1)
private val AccentOrange = Color(0xFFEC7C38)
private val PlaceholderGrey = Color(0xFFB5B7B8)
private val ChipBackground = Color(0xFFDFFBFF)
private val ChipOutline = Color(0xFF00ADC1)
private val SidebarBackground = Color(0xFFF5F5F5)
private val SidebarInactive = Color(0xFFB5B7B8)
private val CardBackground = Color(0xFFFAFAFA)
private val CardSelectedBackground = Color(0xFFDFFBFF)
private val CardTextDefault = Color(0xFFA5A5A5)

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun AiJobSelectionScreen(
    repository: JobDictionaryRepository,
    preferenceRepository: JobPreferenceRepository,
    lastSelectedPositionId: String?,
    lastSelectedCategoryId: String?,
    onBack: () -> Unit,
    onStartInterview: (JobDictionaryPosition, JobDictionaryCategory) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var categories by remember { mutableStateOf<List<JobDictionaryCategory>>(emptyList()) }
    var activeCategoryId by remember { mutableStateOf<String?>(null) }
    val selectedPositions = remember { mutableStateListOf<JobDictionaryPosition>() }

    val loadData = remember(repository, preferenceRepository, lastSelectedPositionId, lastSelectedCategoryId) {
        suspend {
            isLoading = true
            errorMessage = null
            val dictionaryResult = runCatching { repository.fetchDictionary() }
            dictionaryResult.onSuccess { fetched ->
                categories = fetched
                if (activeCategoryId == null) {
                    activeCategoryId = lastSelectedCategoryId ?: fetched.firstOrNull()?.id
                }

                selectedPositions.clear()
                if (fetched.isNotEmpty()) {
                    var targetId = lastSelectedPositionId
                    if (targetId.isNullOrBlank()) {
                        val preferenceResult = preferenceRepository.fetchPreferences()
                        preferenceResult.onSuccess { dto ->
                            targetId = dto.positions
                                .sortedBy { it.sortOrder }
                                .firstOrNull()
                                ?.id
                        }.onFailure { throwable ->
                            if (errorMessage == null) {
                                errorMessage = throwable.message ?: "加载已选职岗失败"
                            }
                        }
                    }

                    if (!targetId.isNullOrBlank()) {
                        val match = fetched.firstNotNullOfOrNull { category ->
                            category.positions.firstOrNull { it.id == targetId }
                                ?.let { category to it }
                        }
                        if (match != null) {
                            val (category, position) = match
                            activeCategoryId = category.id
                            selectedPositions.add(position)
                        }
                    } else if (!lastSelectedCategoryId.isNullOrBlank()) {
                        val categoryExists = fetched.any { it.id == lastSelectedCategoryId }
                        if (categoryExists) {
                            activeCategoryId = lastSelectedCategoryId
                        }
                    }
                }
            }.onFailure { throwable ->
                categories = emptyList()
                selectedPositions.clear()
                errorMessage = throwable.message ?: "加载职岗分类失败"
            }

            isLoading = false
        }
    }

    LaunchedEffect(loadData) {
        loadData()
    }

    val activeCategory = remember(categories, activeCategoryId) {
        categories.firstOrNull { it.id == activeCategoryId }
    }

    val filteredPositions by remember(searchQuery, activeCategory) {
        derivedStateOf {
            val positions = activeCategory?.positions.orEmpty()
            if (searchQuery.isBlank()) {
                positions
            } else {
                val keyword = searchQuery.trim().lowercase()
                positions.filter { position ->
                    position.name.lowercase().contains(keyword) ||
                        position.code.lowercase().contains(keyword) ||
                        position.tags.any { it.lowercase().contains(keyword) }
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            TopSection(
                searchQuery = searchQuery,
                onSearchChange = { searchQuery = it },
                selectedPositions = selectedPositions,
                onRemovePosition = { position ->
                    selectedPositions.removeAll { it.id == position.id }
                },
                onBack = onBack
            )
            Row(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
            ) {
                CategorySidebar(
                    categories = categories,
                    activeCategoryId = activeCategoryId,
                    onSelectCategory = { categoryId ->
                        activeCategoryId = categoryId
                    }
                )

                Spacer(modifier = Modifier.width(16.dp))

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                ) {
                    when {
                        isLoading -> CenterMessage(
                            message = "正在加载职岗数据…",
                            modifier = Modifier.align(Alignment.Center)
                        )

                        errorMessage != null && categories.isEmpty() -> ErrorMessage(
                            message = errorMessage ?: "加载失败，请重试",
                            onRetry = { scope.launch { loadData() } },
                            modifier = Modifier.align(Alignment.Center)
                        )

                        activeCategory == null -> CenterMessage(
                            message = "请选择左侧行业分类",
                            modifier = Modifier.align(Alignment.Center)
                        )

                        filteredPositions.isEmpty() -> CenterMessage(
                            message = if (searchQuery.isBlank()) {
                                "当前分类暂无可选职岗"
                            } else {
                                "未找到匹配的职岗"
                            },
                            modifier = Modifier.align(Alignment.Center)
                        )

                        else -> {
                            LazyVerticalGrid(
                                modifier = Modifier.fillMaxSize(),
                                columns = GridCells.Fixed(3),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(bottom = 16.dp, end = 12.dp)
                            ) {
                                items(filteredPositions, key = { it.id }) { position ->
                                    val isSelected = selectedPositions.any { it.id == position.id }
                                    PositionCard(
                                        position = position,
                                        selected = isSelected,
                                        onClick = {
                                            if (isSelected) {
                                                selectedPositions.clear()
                                            } else {
                                                selectedPositions.clear()
                                                selectedPositions.add(position)
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        StartInterviewBar(
            modifier = Modifier.align(Alignment.BottomCenter),
            selectionCount = selectedPositions.size,
            onReset = {
                searchQuery = ""
                selectedPositions.clear()
            },
            onStart = {
                val position = selectedPositions.firstOrNull()
                if (position == null) {
                    Toast.makeText(context, "请先选择一个职岗", Toast.LENGTH_SHORT).show()
                    return@StartInterviewBar
                }
                val category = categories.firstOrNull { it.id == position.categoryId }
                if (category == null) {
                    Toast.makeText(context, "未找到该职岗所属分类", Toast.LENGTH_SHORT).show()
                    return@StartInterviewBar
                }
                onStartInterview(position, category)
            }
        )
    }
}

@Composable
private fun TopSection(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    selectedPositions: List<JobDictionaryPosition>,
    onRemovePosition: (JobDictionaryPosition) -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(GradientTop)
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "返回",
                    tint = Color.Black
                )
            }

            Text(
                text = "选择面试职岗",
                color = Color.Black,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        SearchField(
            value = searchQuery,
            onValueChange = onSearchChange
        )

        if (selectedPositions.isNotEmpty()) {
            Spacer(modifier = Modifier.height(10.dp))
            SelectedPositionChips(
                positions = selectedPositions,
                onRemove = onRemovePosition
            )
        }
    }
}

@Composable
private fun SearchField(
    value: String,
    onValueChange: (String) -> Unit
) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = TextStyle(
            color = Color.Black,
            fontSize = 12.sp,
            fontWeight = FontWeight.Light,
            lineHeight = 21.sp
        ),
        cursorBrush = SolidColor(AccentCyan),
        decorationBox = { innerTextField ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White)
                    .padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    tint = PlaceholderGrey,
                    modifier = Modifier.size(12.dp)
                )
                Box(modifier = Modifier.weight(1f)) {
                    if (value.isBlank()) {
                        Text(
                            text = "搜索",
                            color = PlaceholderGrey,
                            fontSize = 12.sp,
                            lineHeight = 21.sp,
                            fontWeight = FontWeight.Light
                        )
                    }
                    innerTextField()
                }
            }
        }
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SelectedPositionChips(
    positions: List<JobDictionaryPosition>,
    onRemove: (JobDictionaryPosition) -> Unit
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        positions.forEach { position ->
            Box(
                modifier = Modifier.padding(top = 6.dp)
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(ChipBackground)
                        .border(1.dp, ChipOutline, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = position.name,
                        color = AccentCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Normal
                    )
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(y = (-6).dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(AccentCyan)
                        .size(12.dp)
                        .clickable { onRemove(position) },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "移除",
                        tint = Color.White,
                        modifier = Modifier.size(8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun CategorySidebar(
    categories: List<JobDictionaryCategory>,
    activeCategoryId: String?,
    onSelectCategory: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .width(120.dp)
            .fillMaxHeight(),
        color = SidebarBackground,
        shadowElevation = 0.dp,
        shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(0.dp)
            ) {
                items(categories, key = { it.id }) { category ->
                    CategoryItem(
                        category = category,
                        selected = category.id == activeCategoryId,
                        onClick = { onSelectCategory(category.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryItem(
    category: JobDictionaryCategory,
    selected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (selected) Color.White else SidebarBackground
    val textColor = if (selected) AccentCyan else SidebarInactive
    val fontWeight = if (selected) FontWeight.Medium else FontWeight.Normal
    val indicatorWidth = if (selected) 2.dp else 1.5.dp
    val indicatorColor = if (selected) AccentCyan else SidebarBackground

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .background(backgroundColor)
            .clickable(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(indicatorWidth)
                .fillMaxHeight()
                .background(indicatorColor)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = category.name,
            color = textColor,
            fontSize = 14.sp,
            fontWeight = fontWeight,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(10.dp))
    }
}

@Composable
private fun PositionCard(
    position: JobDictionaryPosition,
    selected: Boolean,
    onClick: () -> Unit
) {
    val background = if (selected) CardSelectedBackground else CardBackground
    val textColor = if (selected) AccentCyan else CardTextDefault

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(background)
            .border(
                width = if (selected) 1.dp else 0.dp,
                color = if (selected) AccentCyan else Color.Transparent,
                shape = RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
            .height(44.dp)
            .fillMaxWidth()
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = position.name,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.Medium else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun CenterMessage(
    message: String,
    modifier: Modifier = Modifier,
    color: Color = SidebarInactive
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            color = color,
            fontSize = 14.sp
        )
    }
}

@Composable
private fun ErrorMessage(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = message,
            color = AccentOrange,
            fontSize = 14.sp
        )
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = AccentCyan,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(24.dp)
        ) {
            Text(text = "重试", fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun StartInterviewBar(
    modifier: Modifier = Modifier,
    selectionCount: Int,
    onReset: () -> Unit,
    onStart: () -> Unit
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        color = Color.White,
        shadowElevation = 0.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "最多可选择 1 个职岗",
                color = SidebarInactive,
                fontSize = 12.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    color = Color(0xFFF5F5F5),
                    shape = RoundedCornerShape(40.dp),
                    shadowElevation = 0.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onReset() }
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "重置",
                            color = SidebarInactive,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                val enableStart = selectionCount == 1
                Button(
                    onClick = onStart,
                    enabled = enableStart,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (enableStart) AccentOrange else AccentOrange.copy(alpha = 0.4f),
                        contentColor = Color.White,
                        disabledContainerColor = AccentOrange.copy(alpha = 0.4f),
                        disabledContentColor = Color.White.copy(alpha = 0.7f)
                    ),
                    shape = RoundedCornerShape(40.dp),
                    modifier = Modifier
                        .weight(2.06f)
                        .height(44.dp),
                    contentPadding = PaddingValues(vertical = 10.dp)
                ) {
                    Text(
                        text = "开始面试",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
