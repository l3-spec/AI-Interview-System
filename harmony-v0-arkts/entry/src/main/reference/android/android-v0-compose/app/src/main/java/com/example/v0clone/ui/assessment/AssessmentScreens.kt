@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.assessment

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavBackStackEntry
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.xlwl.AiMian.data.model.Assessment
import com.xlwl.AiMian.data.model.AssessmentCategory
import com.xlwl.AiMian.data.model.AssessmentDetail
import com.xlwl.AiMian.data.model.AssessmentQuestion
import com.xlwl.AiMian.data.model.AssessmentResult
import com.xlwl.AiMian.data.model.SubmitAssessmentRequest
import com.xlwl.AiMian.data.model.UserAnswer
import com.xlwl.AiMian.data.model.QuestionOption
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.ui.components.CompactTopBar
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private val AccentColor = Color(0xFFEC7C38)
private val SurfaceBackground = Color(0xFFF5F6FB)
private val MutedText = Color(0xFF8A8D95)

// ==================== 首页：分类概览 ====================

@Composable
fun AssessmentHomeRoute(
    repository: ContentRepository,
    backStackEntry: NavBackStackEntry,
    onBack: () -> Unit,
    onCategorySelected: (AssessmentCategory) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var categories by remember { mutableStateOf<List<AssessmentCategory>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val refreshSignal by backStackEntry.savedStateHandle
        .getStateFlow("should_refresh_assessments", false)
        .collectAsState()

    val loadCategories = remember(repository) {
        {
            scope.launch {
                isLoading = true
                val result = repository.getAssessmentCategories()
                result.onSuccess {
                    categories = it
                    error = null
                }.onFailure {
                    error = it.message ?: "测评分类加载失败，请稍后再试"
                }
                isLoading = false
            }
            Unit
        }
    }

    LaunchedEffect(Unit) {
        loadCategories()
    }

    LaunchedEffect(refreshSignal) {
        if (refreshSignal) {
            backStackEntry.savedStateHandle["should_refresh_assessments"] = false
            loadCategories()
        }
    }

    AssessmentHomeScreen(
        isLoading = isLoading,
        error = error,
        categories = categories,
        onBack = onBack,
        onRetry = loadCategories,
        onCategorySelected = onCategorySelected
    )
}

@Composable
private fun AssessmentHomeScreen(
    isLoading: Boolean,
    error: String?,
    categories: List<AssessmentCategory>,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onCategorySelected: (AssessmentCategory) -> Unit
) {
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "职业测评",
                onBack = onBack,
                containerColor = SurfaceBackground,
                contentColor = MaterialTheme.colorScheme.onSurface,
                shadowElevation = 0.dp
            )
        },
        containerColor = SurfaceBackground
    ) { padding ->
        when {
            isLoading && categories.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AccentColor)
                }
            }
            error != null && categories.isEmpty() -> {
                AssessmentEmptyState(
                    title = "测评分类获取失败",
                    description = error,
                    actionText = "重新加载",
                    onAction = onRetry,
                    modifier = Modifier.padding(padding)
                )
            }
            categories.isEmpty() -> {
                AssessmentEmptyState(
                    title = "暂未开放测评",
                    description = "我们正在准备更多精彩的测评内容，敬请期待。",
                    actionText = "返回",
                    onAction = onBack,
                    modifier = Modifier.padding(padding)
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        AssessmentHeroCard()
                    }
                    items(categories, key = { it.id }) { category ->
                        AssessmentCategoryCard(
                            category = category,
                            onClick = { onCategorySelected(category) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AssessmentHeroCard() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        listOf(Color(0xFFFFF2E6), Color.White)
                    )
                )
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "AI助力职业测评",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E2127)
                )
            )
            Text(
                text = "结合行业专家题库与AI评分，帮你洞察职业优势，快速定位核心竞争力。",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color(0xFF575C66),
                    lineHeight = 21.sp
                )
            )
        }
    }
}

@Composable
private fun AssessmentCategoryCard(
    category: AssessmentCategory,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .padding(1.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .padding(0.dp)
            .clickableWithRipple(onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CategoryIcon(iconUrl = category.icon, fallbackText = category.name)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = category.name,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = category.description ?: "从多个维度洞察自我优势与潜能。",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MutedText
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun CategoryIcon(iconUrl: String?, fallbackText: String) {
    if (!iconUrl.isNullOrBlank()) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(iconUrl)
                .crossfade(true)
                .build(),
            contentDescription = fallbackText,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFF0F2F8)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = fallbackText.firstOrNull()?.uppercaseChar()?.toString() ?: "测",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF535968)
                )
            )
        }
    }
}

// ==================== 分类列表 ====================

@Composable
fun AssessmentCategoryRoute(
    repository: ContentRepository,
    categoryId: String,
    categoryName: String,
    onBack: () -> Unit,
    onAssessmentSelected: (Assessment) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var assessments by remember { mutableStateOf<List<Assessment>>(emptyList()) }
    val scope = rememberCoroutineScope()

    val loadAssessments = remember(repository, categoryId) {
        {
            scope.launch {
                isLoading = true
                val result = repository.getAssessmentsByCategory(categoryId)
                result.onSuccess {
                    assessments = it.list
                    error = null
                }.onFailure {
                    error = it.message ?: "测评列表加载失败，请稍后再试"
                }
                isLoading = false
            }
            Unit
        }
    }

    LaunchedEffect(categoryId) {
        loadAssessments()
    }

    AssessmentCategoryScreen(
        title = categoryName,
        isLoading = isLoading,
        error = error,
        assessments = assessments,
        onBack = onBack,
        onRetry = loadAssessments,
        onAssessmentSelected = onAssessmentSelected
    )
}

@Composable
private fun AssessmentCategoryScreen(
    title: String,
    isLoading: Boolean,
    error: String?,
    assessments: List<Assessment>,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onAssessmentSelected: (Assessment) -> Unit
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                }
            )
        },
        containerColor = SurfaceBackground
    ) { padding ->
        when {
            isLoading && assessments.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AccentColor)
                }
            }
            error != null && assessments.isEmpty() -> {
                AssessmentEmptyState(
                    title = "测评加载失败",
                    description = error,
                    actionText = "重试",
                    onAction = onRetry,
                    modifier = Modifier.padding(padding)
                )
            }
            assessments.isEmpty() -> {
                AssessmentEmptyState(
                    title = "暂无测评",
                    description = "该分类暂时没有测评内容，敬请期待。",
                    actionText = "返回",
                    onAction = onBack,
                    modifier = Modifier.padding(padding)
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(assessments, key = { it.id }) { assessment ->
                        AssessmentCard(
                            assessment = assessment,
                            onClick = { onAssessmentSelected(assessment) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AssessmentCard(
    assessment: Assessment,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .clickableWithRipple(onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.Top
            ) {
                if (!assessment.coverImage.isNullOrBlank()) {
                    AsyncImage(
                        model = assessment.coverImage,
                        contentDescription = assessment.title,
                        modifier = Modifier
                            .size(width = 88.dp, height = 88.dp)
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Crop
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = assessment.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = assessment.description ?: "帮助你了解职业能力与发展潜力。",
                        style = MaterialTheme.typography.bodySmall.copy(color = MutedText),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Chip(text = "${assessment.durationMinutes}分钟")
                    Chip(text = difficultyLabel(assessment.difficulty))
                }
                Text(
                    text = "${assessment.participantCount}人已测",
                    style = MaterialTheme.typography.bodySmall.copy(color = MutedText)
                )
            }
        }
    }
}

@Composable
private fun Chip(text: String) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFF0F2F8)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall.copy(
                color = Color(0xFF515667),
                fontWeight = FontWeight.Medium
            ),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

private fun difficultyLabel(raw: String): String = when (raw.uppercase()) {
    "BEGINNER" -> "初级"
    "INTERMEDIATE" -> "中级"
    "ADVANCED" -> "高级"
    else -> raw
}

// ==================== 测评详情 ====================

@Composable
fun AssessmentDetailRoute(
    repository: ContentRepository,
    assessmentId: String,
    onBack: () -> Unit,
    onStartAssessment: (AssessmentDetail) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var detail by remember { mutableStateOf<AssessmentDetail?>(null) }
    val scope = rememberCoroutineScope()

    val loadDetail = remember(repository, assessmentId) {
        {
            scope.launch {
                isLoading = true
                val result = repository.getAssessmentDetail(assessmentId)
                result.onSuccess {
                    detail = it
                    error = null
                }.onFailure {
                    error = it.message ?: "获取测评详情失败"
                }
                isLoading = false
            }
            Unit
        }
    }

    LaunchedEffect(assessmentId) {
        loadDetail()
    }

    AssessmentDetailScreen(
        detail = detail,
        isLoading = isLoading,
        error = error,
        onBack = onBack,
        onRetry = loadDetail,
        onStart = { detail?.let(onStartAssessment) }
    )
}

@Composable
private fun AssessmentDetailScreen(
    detail: AssessmentDetail?,
    isLoading: Boolean,
    error: String?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onStart: () -> Unit
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = detail?.title ?: "测评详情",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                }
            )
        },
        containerColor = SurfaceBackground,
        bottomBar = {
            if (detail != null) {
                Button(
                    onClick = onStart,
                    colors = ButtonDefaults.buttonColors(containerColor = AccentColor),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text(
                        text = "开始测评",
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        ),
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    ) { padding ->
        when {
            isLoading && detail == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AccentColor)
                }
            }
            error != null && detail == null -> {
                AssessmentEmptyState(
                    title = "加载失败",
                    description = error,
                    actionText = "重试",
                    onAction = onRetry,
                    modifier = Modifier.padding(padding)
                )
            }
            detail != null -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    item {
                        DetailHeader(detail)
                    }
                    item {
                        DetailStats(detail)
                    }
                    item {
                        DetailDescription(detail)
                    }
                    item {
                        DetailQuestionPreview(detail)
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailHeader(detail: AssessmentDetail) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = detail.title,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF232733)
                )
            )
            detail.tags.takeIf { it.isNotEmpty() }?.let { tags ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tags.take(3).forEach { tag ->
                        Chip(text = tag)
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailStats(detail: AssessmentDetail) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 18.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            DetailStatItem(label = "预计时长", value = "${detail.durationMinutes}分钟", icon = Icons.Outlined.Schedule)
            DetailStatItem(label = "题目数量", value = "${detail.questions.size}题")
            DetailStatItem(label = "参与人数", value = "${detail.participantCount}")
        }
    }
}

@Composable
private fun DetailStatItem(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector? = null) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            icon?.let {
                Icon(
                    imageVector = it,
                    contentDescription = null,
                    tint = AccentColor,
                    modifier = Modifier.size(18.dp)
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(color = MutedText)
        )
    }
}

@Composable
private fun DetailDescription(detail: AssessmentDetail) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "测评简介",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
            )
            Text(
                text = detail.description ?: "该测评由资深行业顾问与心理学专家联合打造，帮助你评估当前能力与发展潜力。",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color(0xFF2A2E3A),
                    lineHeight = 21.sp
                )
            )
        }
    }
}

@Composable
private fun DetailQuestionPreview(detail: AssessmentDetail) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "涵盖维度",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
            )
            detail.questions.take(3).forEachIndexed { index, question ->
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "${index + 1}. ${question.questionText}",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color(0xFF333745),
                            lineHeight = 20.sp
                        ),
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                    Divider(color = Color(0xFFE7E9F0))
                }
            }
            Text(
                text = "共 ${detail.questions.size} 道题，完成后即可查看测评结果与建议。",
                style = MaterialTheme.typography.bodySmall.copy(color = MutedText)
            )
        }
    }
}

// ==================== 测评答题 ====================

@Composable
fun AssessmentTakeRoute(
    repository: ContentRepository,
    assessmentId: String,
    initialDetail: AssessmentDetail?,
    userId: String?,
    assessmentTitle: String?,
    onBack: () -> Unit,
    onSubmitSuccess: (AssessmentResult) -> Unit
) {
    var detail by remember { mutableStateOf(initialDetail) }
    var isLoading by remember { mutableStateOf(initialDetail == null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val loadDetail = remember(repository, assessmentId) {
        {
            scope.launch {
                isLoading = true
                val result = repository.getAssessmentDetail(assessmentId)
                result.onSuccess {
                    detail = it
                    error = null
                }.onFailure {
                    error = it.message ?: "加载测评题目失败"
                }
                isLoading = false
            }
            Unit
        }
    }

    LaunchedEffect(assessmentId) {
        if (detail == null) {
            loadDetail()
        }
    }

    AssessmentTakeScreen(
        detail = detail,
        isLoading = isLoading,
        error = error,
        userId = userId,
        assessmentTitle = assessmentTitle,
        onBack = onBack,
        onRetry = loadDetail,
        onSubmit = { answers, durationSeconds ->
            if (userId.isNullOrBlank()) {
                Toast.makeText(context, "请先登录后再进行测评", Toast.LENGTH_SHORT).show()
                return@AssessmentTakeScreen
            }
            scope.launch {
                val request = SubmitAssessmentRequest(
                    userId = userId,
                    answers = answers,
                    duration = durationSeconds
                )
                val result = repository.submitAssessment(assessmentId, request)
                result.onSuccess {
                    onSubmitSuccess(it)
                }.onFailure {
                    Toast.makeText(context, it.message ?: "提交失败，请稍后再试", Toast.LENGTH_SHORT).show()
                }
            }
        }
    )
}

@Composable
private fun AssessmentTakeScreen(
    detail: AssessmentDetail?,
    isLoading: Boolean,
    error: String?,
    userId: String?,
    assessmentTitle: String?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onSubmit: (List<UserAnswer>, Int) -> Unit
) {
    val context = LocalContext.current
    val startTimestamp by remember { mutableStateOf(System.currentTimeMillis()) }
    var currentIndex by remember(detail) { mutableStateOf(0) }
    val answers = remember(detail) { mutableStateMapOf<String, AnswerState>() }
    var showConfirmDialog by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(detail) {
        detail?.questions?.forEach { question ->
            answers.putIfAbsent(question.id, AnswerState())
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = detail?.title ?: assessmentTitle ?: "测评答题",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                }
            )
        },
        bottomBar = {
            if (detail != null && detail.questions.isNotEmpty()) {
                AnswerBottomBar(
                    currentIndex = currentIndex,
                    total = detail.questions.size,
                    canGoPrevious = currentIndex > 0,
                    onPrevious = { currentIndex-- },
                    onNext = {
                        val state = answers.getValue(detail.questions[currentIndex].id)
                        if (!state.isAnswered(detail.questions[currentIndex].questionType)) {
                            Toast.makeText(context, "请先完成当前题目", Toast.LENGTH_SHORT).show()
                        } else if (currentIndex < detail.questions.size - 1) {
                            currentIndex++
                        } else {
                            showConfirmDialog = true
                        }
                    },
                    onSubmit = {
                        val state = answers.getValue(detail.questions[currentIndex].id)
                        if (!state.isAnswered(detail.questions[currentIndex].questionType)) {
                            Toast.makeText(context, "请先完成当前题目", Toast.LENGTH_SHORT).show()
                        } else {
                            showConfirmDialog = true
                        }
                    }
                )
            }
        },
        containerColor = SurfaceBackground
    ) { padding ->
        when {
            isLoading && detail == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AccentColor)
                }
            }
            error != null && detail == null -> {
                AssessmentEmptyState(
                    title = "加载失败",
                    description = error,
                    actionText = "重试",
                    onAction = onRetry,
                    modifier = Modifier.padding(padding)
                )
            }
            detail != null && detail.questions.isNotEmpty() -> {
                val question = detail.questions[currentIndex]
                val answerState = answers.getValue(question.id)
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    item {
                        QuestionHeader(
                            current = currentIndex + 1,
                            total = detail.questions.size,
                            remainingMinutes = detail.durationMinutes
                        )
                    }
                    item {
                        QuestionCard(
                            question = question,
                            answerState = answerState
                        )
                    }
                }
            }
        }
    }

    if (showConfirmDialog && detail != null) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text(text = "确认提交测评？") },
            text = {
                Text(
                    text = "提交后将立即生成测评结果，无法修改答案。",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirmDialog = false
                        val duration = ((System.currentTimeMillis() - startTimestamp) / 1000.0).roundToInt()
                        val userAnswers = detail.questions.map { question ->
                            val state = answers.getValue(question.id)
                            UserAnswer(
                                questionId = question.id,
                                answer = state.toAnswerPayload(question.questionType)
                            )
                        }
                        onSubmit(userAnswers, duration)
                    }
                ) {
                    Text("提交", color = AccentColor)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

@Composable
private fun QuestionHeader(current: Int, total: Int, remainingMinutes: Int) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "题目 $current / $total",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    text = "请根据自身情况选择最贴近的选项",
                    style = MaterialTheme.typography.bodySmall.copy(color = MutedText)
                )
            }
            Chip(text = "约${remainingMinutes}分钟")
        }
    }
}

@Composable
private fun QuestionCard(
    question: AssessmentQuestion,
    answerState: AnswerState
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = question.questionText,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 22.sp
                )
            )
            when (question.questionType.uppercase()) {
                "SINGLE_CHOICE" -> {
                    QuestionOptions(
                        options = question.options,
                        selected = answerState.selectedOptions,
                        multiple = false
                    ) { option ->
                        answerState.selectSingle(option.label)
                    }
                }
                "MULTIPLE_CHOICE" -> {
                    QuestionOptions(
                        options = question.options,
                        selected = answerState.selectedOptions,
                        multiple = true
                    ) { option ->
                        answerState.toggle(option.label)
                    }
                }
                "TEXT" -> {
                    OutlinedTextField(
                        value = answerState.textAnswer,
                        onValueChange = { answerState.textAnswer = it },
                        placeholder = { Text("请简述你的想法或案例...") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                    )
                }
                else -> {
                    Text(
                        text = "暂不支持的题型：${question.questionType}",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Red)
                    )
                }
            }
        }
    }
}

@Composable
private fun QuestionOptions(
    options: List<QuestionOption>,
    selected: Set<String>,
    multiple: Boolean,
    onSelect: (QuestionOption) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        options.forEach { option ->
            val isSelected = selected.contains(option.label)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isSelected) AccentColor.copy(alpha = 0.08f) else Color(0xFFF4F5F9))
                    .clickableWithRipple { onSelect(option) },
                shape = RoundedCornerShape(16.dp),
                color = if (isSelected) AccentColor.copy(alpha = 0.08f) else Color(0xFFF4F5F9)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) AccentColor else Color.White,
                                shape = CircleShape
                            )
                            .border(
                                width = 1.dp,
                                color = if (isSelected) AccentColor else Color(0xFFD5D9E2),
                                shape = CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Outlined.Check,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        } else {
                            Text(
                                text = option.label,
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = MutedText,
                                    fontWeight = FontWeight.Medium
                                )
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = option.text,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Color(0xFF273042),
                            lineHeight = 20.sp
                        )
                    )
                }
            }
        }
    }
    if (multiple) {
        Text(
            text = "可多选",
            style = MaterialTheme.typography.bodySmall.copy(
                color = MutedText,
                textAlign = TextAlign.End
            ),
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun AnswerBottomBar(
    currentIndex: Int,
    total: Int,
    canGoPrevious: Boolean,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onSubmit: () -> Unit
) {
    Surface(color = Color.White, shadowElevation = 4.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (canGoPrevious) {
                OutlinedButton(
                    onClick = onPrevious,
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text("上一题")
                }
            } else {
                Spacer(modifier = Modifier.width(100.dp))
            }
            Button(
                onClick = if (currentIndex == total - 1) onSubmit else onNext,
                colors = ButtonDefaults.buttonColors(containerColor = AccentColor),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    text = if (currentIndex == total - 1) "提交测评" else "下一题",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

private class AnswerState(
    val selectedOptions: MutableSet<String> = mutableSetOf(),
    var textAnswer: String = ""
) {
    fun selectSingle(option: String) {
        selectedOptions.clear()
        selectedOptions.add(option)
    }

    fun toggle(option: String) {
        if (selectedOptions.contains(option)) {
            selectedOptions.remove(option)
        } else {
            selectedOptions.add(option)
        }
    }

    fun isAnswered(questionType: String): Boolean = when (questionType.uppercase()) {
        "TEXT" -> textAnswer.isNotBlank()
        else -> selectedOptions.isNotEmpty()
    }

    fun toAnswerPayload(questionType: String): List<String> = when (questionType.uppercase()) {
        "TEXT" -> listOf(textAnswer)
        else -> selectedOptions.toList()
    }
}

// ==================== 测评结果 ====================

@Composable
fun AssessmentResultRoute(
    result: AssessmentResult?,
    assessmentTitle: String?,
    onBack: () -> Unit,
    onViewRecords: (() -> Unit)?
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "测评结果",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                }
            )
        },
        containerColor = SurfaceBackground
    ) { padding ->
        if (result == null) {
            AssessmentEmptyState(
                title = "暂无测评结果",
                description = "请完成测评后查看结果。",
                actionText = "返回",
                onAction = onBack,
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                item {
                    ResultScoreCard(result = result, title = assessmentTitle)
                }
                item {
                    ResultSummaryCard(result = result)
                }
                onViewRecords?.let { action ->
                    item {
                        Button(
                            onClick = action,
                            colors = ButtonDefaults.buttonColors(containerColor = AccentColor),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(24.dp)
                        ) {
                            Text(
                                text = "查看历史测评",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultScoreCard(result: AssessmentResult, title: String?) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = title ?: "测评完成",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF272B35)
                )
            )
            Text(
                text = "${result.totalScore}/${result.maxScore}",
                style = MaterialTheme.typography.displaySmall.copy(
                    color = AccentColor,
                    fontWeight = FontWeight.Bold
                )
            )
            Text(
                text = "整体表现：${result.resultLevel}",
                style = MaterialTheme.typography.titleMedium.copy(color = Color(0xFF2F3443))
            )
        }
    }
}

@Composable
private fun ResultSummaryCard(result: AssessmentResult) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "建议与解读",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
            )
            Text(
                text = when (result.resultLevel) {
                    "优秀" -> "恭喜你展现出色的岗位竞争力，保持优势的同时可进一步巩固关键能力。"
                    "良好" -> "整体表现良好，建议针对薄弱环节进行针对性提升。"
                    "及格" -> "建议结合测评分项，重点提升核心职业技能与软实力。"
                    else -> "建议结合测评结果制定具体提升计划，我们将提供持续支持。"
                },
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color(0xFF3A3F4F),
                    lineHeight = 21.sp
                )
            )
        }
    }
}

// ==================== 通用组件 ====================

@Composable
private fun AssessmentEmptyState(
    title: String,
    description: String,
    actionText: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp
            )
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = MutedText,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
        )
        Spacer(modifier = Modifier.height(20.dp))
        OutlinedButton(onClick = onAction, shape = RoundedCornerShape(24.dp)) {
            Text(actionText)
        }
    }
}

@Composable
private fun Modifier.clickableWithRipple(onClick: () -> Unit): Modifier =
    this.then(
        Modifier.clickable { onClick() }
    )
