package com.xlwl.AiMian.ui.jobs

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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
import com.xlwl.AiMian.data.model.JobPreferenceDto
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

private const val MAX_SELECTION = 3

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun EditIntentionJobScreen(
    repository: JobDictionaryRepository,
    preferenceRepository: JobPreferenceRepository,
    onBack: () -> Unit,
    onSaved: (JobPreferenceDto) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf("") }
    var categories by remember { mutableStateOf<List<JobDictionaryCategory>>(emptyList()) }
    var activeCategoryId by remember { mutableStateOf<String?>(null) }
    val selectedPositions = remember { mutableStateListOf<JobDictionaryPosition>() }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    LaunchedEffect(repository, preferenceRepository) {
        isLoading = true
        errorMessage = null
        selectedPositions.clear()
        runCatching { repository.fetchDictionary() }
            .onSuccess { data ->
                categories = data
                if (activeCategoryId == null) {
                    activeCategoryId = data.firstOrNull()?.id
                }
                val allPositions = data.flatMap { it.positions }.associateBy { it.id }
                preferenceRepository.fetchPreferences()
                    .onSuccess { dto ->
                        dto.positions.forEach { pref ->
                            allPositions[pref.id]?.let { selectedPositions.add(it) }
                        }
                    }
                    .onFailure { throwable ->
                        Toast
                            .makeText(
                                context,
                                throwable.message ?: "加载已选职岗失败",
                                Toast.LENGTH_SHORT
                            )
                            .show()
                    }
            }
            .onFailure { throwable ->
                errorMessage = throwable.message ?: "加载职岗字典失败，请稍后再试"
            }
        isLoading = false
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

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 104.dp) // leave space for bottom bar
            ) {
                CategorySidebar(
                    categories = categories,
                    activeCategoryId = activeCategoryId,
                    isLoading = isLoading,
                    onSelectCategory = { categoryId -> activeCategoryId = categoryId }
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

                        errorMessage != null -> CenterMessage(
                            message = errorMessage ?: "加载失败",
                            modifier = Modifier.align(Alignment.Center),
                            color = AccentOrange
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
                                columns = GridCells.Fixed(2),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(bottom = 16.dp, end = 4.dp)
                            ) {
                                items(filteredPositions, key = { it.id }) { position ->
                                    val isSelected = selectedPositions.any { it.id == position.id }
                                    PositionCard(
                                        position = position,
                                        selected = isSelected,
                                        onClick = {
                                            if (isSelected) {
                                                selectedPositions.removeAll { it.id == position.id }
                                            } else if (selectedPositions.size >= MAX_SELECTION) {
                                                Toast
                                                    .makeText(
                                                        context,
                                                        "最多选择 $MAX_SELECTION 个意向职岗",
                                                        Toast.LENGTH_SHORT
                                                    )
                                                    .show()
                                            } else {
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

        BottomBar(
            modifier = Modifier.align(Alignment.BottomCenter),
            selectionCount = selectedPositions.size,
            isSaving = isSaving,
            onReset = {
                searchQuery = ""
                selectedPositions.clear()
            },
            onSave = {
                if (selectedPositions.isEmpty()) {
                    Toast.makeText(context, "请至少选择一个职岗", Toast.LENGTH_SHORT).show()
                } else {
                    scope.launch {
                        isSaving = true
                        val result = preferenceRepository.savePreferences(selectedPositions.map { it.id })
                        isSaving = false
                        result.onSuccess { dto ->
                            Toast.makeText(context, "意向职岗已保存", Toast.LENGTH_SHORT).show()
                            onSaved(dto)
                        }.onFailure { throwable ->
                            Toast.makeText(
                                context,
                                throwable.message ?: "保存失败，请稍后重试",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                }
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
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(18.dp))
            ) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "返回",
                    tint = Color.Black
                )
            }

            Text(
                text = "意向职位",
                color = Color.Black,
                fontSize = 20.sp,
                lineHeight = 21.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

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

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun SelectedPositionChips(
    positions: List<JobDictionaryPosition>,
    onRemove: (JobDictionaryPosition) -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
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
    isLoading: Boolean,
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
        if (isLoading && categories.isEmpty()) {
            CenterMessage(
                message = "加载中…",
                modifier = Modifier.fillMaxSize(),
                color = SidebarInactive
            )
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                CategoryHeader()
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    items(categories, key = { it.id }) { category ->
                        val isSelected = category.id == activeCategoryId
                        CategoryItem(
                            category = category,
                            selected = isSelected,
                            onClick = { onSelectCategory(category.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .background(Color.White),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(2.dp)
                .fillMaxHeight()
                .background(AccentCyan)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "行业分类",
            color = AccentCyan,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
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
            .clickable { onClick() },
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

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
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
            fontSize = 14.sp,
            lineHeight = 22.sp,
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
private fun BottomBar(
    modifier: Modifier = Modifier,
    selectionCount: Int,
    isSaving: Boolean,
    onReset: () -> Unit,
    onSave: () -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color.White,
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
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

            val saveEnabled = selectionCount > 0 && !isSaving
            Button(
                onClick = onSave,
                enabled = saveEnabled,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (saveEnabled) AccentOrange else AccentOrange.copy(alpha = 0.4f),
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
                    text = if (isSaving) "保存中…" else "保存",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
