package com.xlwl.AiMian.ui.jobs

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.SubcomposeAsyncImage
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.JobRepository

private val PageBackground = Color(0xFFEBEBEB)
private val AccentOrange = Color(0xFFEC7C38)
private val TextPrimary = Color(0xFF000000)
private val TextSecondary = Color(0xFFB5B7B8)
private val ChipBackground = Color(0xFFF3F8FB)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDetailRoute(
  repository: JobRepository,
  aiInterviewRepository: AiInterviewRepository,
  jobId: String,
  onBack: () -> Unit,
  onJobClick: (String) -> Unit = {},
  onCompanyClick: (String) -> Unit = {},
  onStartInterview: (position: String, category: String) -> Unit = { _, _ -> }
) {
  val viewModel: JobDetailViewModel = viewModel(
    factory = JobDetailViewModel.provideFactory(repository, aiInterviewRepository, jobId)
  )
  val uiState by viewModel.uiState.collectAsState()
  val jobDetail = uiState.job

  LaunchedEffect(viewModel) {
    viewModel.events.collect { event ->
      when (event) {
        is JobDetailViewModel.JobDetailEvent.RequireInterview -> {
          val currentJob = viewModel.uiState.value.job
          val position = event.position.ifBlank { currentJob?.title ?: "" }
          val category = event.category.ifBlank { currentJob?.category ?: "" }
          onStartInterview(position, category)
        }
      }
    }
  }

  when {
    uiState.isLoading && jobDetail == null -> JobDetailLoadingState()
    uiState.error != null && jobDetail == null -> JobDetailErrorState(
      message = uiState.error ?: "加载失败",
      onRetry = { viewModel.retry() },
      onBack = onBack
    )
    jobDetail != null -> JobDetailScreen(
      detail = jobDetail,
      recommended = uiState.recommended,
      isLoadingRecommendations = uiState.isLoadingRecommendations,
      recommendationError = uiState.recommendationError,
      onRefreshRecommendations = { viewModel.refreshRecommendations() },
      isApplying = uiState.isApplying,
      isCheckingResume = uiState.isCheckingResume,
      applySuccess = uiState.applySuccess,
      applyError = uiState.applyError,
      onApply = { viewModel.onApplyClicked() },
      onBack = onBack,
      onCompanyClick = onCompanyClick,
      onJobClick = onJobClick
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobDetailScreen(
  detail: JobDetail,
  recommended: List<JobListing>,
  isLoadingRecommendations: Boolean,
  recommendationError: String?,
  onRefreshRecommendations: () -> Unit,
  isApplying: Boolean,
  isCheckingResume: Boolean,
  applySuccess: Boolean,
  applyError: String?,
  onApply: () -> Unit,
  onBack: () -> Unit,
  onCompanyClick: (String) -> Unit,
  onJobClick: (String) -> Unit
) {
  Scaffold(
    modifier = Modifier.fillMaxSize(),
    containerColor = PageBackground,
    topBar = {
      CenterAlignedTopAppBar(
        title = {
          Text(
            text = "职位详情",
            style = MaterialTheme.typography.titleMedium.copy(
              fontWeight = FontWeight.SemiBold,
              color = TextPrimary
            )
          )
        },
        navigationIcon = {
          IconButton(onClick = onBack) {
            Icon(
              imageVector = Icons.Outlined.ArrowBack,
              contentDescription = "返回",
              tint = TextPrimary
            )
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
          containerColor = Color.White,
          navigationIconContentColor = TextPrimary,
          titleContentColor = TextPrimary
        )
      )
    },
    bottomBar = {
      JobDetailBottomBar(
        company = detail.company,
        isCheckingResume = isCheckingResume,
        isApplying = isApplying,
        applySuccess = applySuccess,
        applyError = applyError,
        onApply = onApply
      )
    }
  ) { innerPadding ->
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(PageBackground)
    ) {
      LazyColumn(
        modifier = Modifier
          .fillMaxSize()
          .padding(innerPadding)
          .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(top = 5.dp, bottom = 16.dp)
      ) {
        item { JobSummaryCard(detail) }
        item { JobCompanyCard(detail, onCompanyClick) }
        item { JobDescriptionCard(detail) }
        item {
          JobRecommendationSection(
            recommended = recommended,
            isLoading = isLoadingRecommendations,
            error = recommendationError,
            onRefresh = onRefreshRecommendations,
            onJobClick = onJobClick
          )
        }
      }
    }
  }
}

@Composable
private fun JobSummaryCard(detail: JobDetail) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    color = Color.White,
    shape = RoundedCornerShape(8.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text(
        text = detail.title,
        style = MaterialTheme.typography.titleLarge.copy(
          fontWeight = FontWeight.SemiBold,
          fontSize = 20.sp,
          color = TextPrimary
        )
      )
      if (detail.salary.isNotBlank()) {
        Text(
          text = detail.salary,
          style = MaterialTheme.typography.titleMedium.copy(
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            color = AccentOrange
          )
        )
      }
      val tags = buildList {
        if (detail.education.isNotBlank()) add(detail.education)
        if (detail.experience.isNotBlank()) add(detail.experience)
        detail.tags.filter { it.isNotBlank() }.forEach { add(it) }
      }.take(3)
      if (tags.isNotEmpty()) {
        Row(
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          tags.forEach { TagChip(text = it) }
        }
      }
    }
  }
}

@Composable
private fun JobCompanyCard(
  detail: JobDetail,
  onCompanyClick: (String) -> Unit
) {
  Surface(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(enabled = detail.companyId.isNotBlank()) {
        if (detail.companyId.isNotBlank()) {
          onCompanyClick(detail.companyId)
        }
      },
    color = Color.White,
    shape = RoundedCornerShape(8.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(12.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.SpaceBetween
    ) {
      Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        CompanyLogo(detail)
        Column {
          Text(
            text = detail.company,
            style = MaterialTheme.typography.bodyMedium.copy(
              fontWeight = FontWeight.Medium,
              color = TextPrimary
            ),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
          if (detail.companyTagline.isNotBlank()) {
            Text(
              text = detail.companyTagline,
              style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
          }
        }
      }
      Icon(
        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
        contentDescription = "查看公司",
        tint = TextSecondary
      )
    }
  }
}

@Composable
private fun CompanyLogo(detail: JobDetail) {
  val placeholder = detail.company.take(1).ifBlank { "企" }
  Box(
    modifier = Modifier
      .size(24.dp)
      .clip(CircleShape)
      .background(Color(0xFFEAEAEA)),
    contentAlignment = Alignment.Center
  ) {
    if (detail.companyLogo.isNullOrBlank()) {
      Text(
        text = placeholder,
        style = MaterialTheme.typography.bodySmall.copy(
          fontWeight = FontWeight.Medium,
          color = TextPrimary
        )
      )
    } else {
      SubcomposeAsyncImage(
        model = detail.companyLogo,
        contentDescription = detail.company,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop,
        error = {
          Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = placeholder,
              style = MaterialTheme.typography.bodySmall.copy(
                fontWeight = FontWeight.Medium,
                color = TextPrimary
              )
            )
          }
        }
      )
    }
  }
}

@Composable
private fun JobDescriptionCard(detail: JobDetail) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    color = Color.White,
    shape = RoundedCornerShape(8.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text(
        text = "职位描述",
        style = MaterialTheme.typography.titleMedium.copy(
          fontWeight = FontWeight.SemiBold,
          color = TextPrimary
        )
      )
      if (detail.description.isNotBlank()) {
        Text(
          text = detail.description,
          style = MaterialTheme.typography.bodySmall.copy(
            color = TextPrimary,
            lineHeight = 21.sp
          )
        )
      }
      if (detail.responsibilities.isNotEmpty()) {
        NumberedSection(title = "职责", items = detail.responsibilities)
      }
      if (detail.requirements.isNotEmpty()) {
        NumberedSection(title = "任职资格", items = detail.requirements)
      }
    }
  }
}

@Composable
private fun NumberedSection(title: String, items: List<String>) {
  Column(
    verticalArrangement = Arrangement.spacedBy(4.dp)
  ) {
    Text(
      text = title,
      style = MaterialTheme.typography.bodyMedium.copy(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        color = TextPrimary
      )
    )
    items.filter { it.isNotBlank() }.forEachIndexed { index, text ->
      Text(
        text = "${index + 1}、$text",
        style = MaterialTheme.typography.bodySmall.copy(
          color = TextPrimary,
          lineHeight = 21.sp
        )
      )
    }
  }
}

@Composable
private fun JobRecommendationSection(
  recommended: List<JobListing>,
  isLoading: Boolean,
  error: String?,
  onRefresh: () -> Unit,
  onJobClick: (String) -> Unit
) {
  Column(
    modifier = Modifier.fillMaxWidth(),
    verticalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = "猜你喜欢",
        style = MaterialTheme.typography.bodyMedium.copy(
          fontWeight = FontWeight.Medium,
          color = TextPrimary,
          fontSize = 14.sp
        )
      )
      if (isLoading) {
        CircularProgressIndicator(
          modifier = Modifier.size(16.dp),
          color = AccentOrange,
          strokeWidth = 2.dp
        )
      } else {
        Row(
          modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .clickable(onClick = onRefresh)
            .padding(horizontal = 4.dp, vertical = 2.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
          Icon(
            imageVector = Icons.Filled.Refresh,
            contentDescription = "换一批",
            tint = TextSecondary,
            modifier = Modifier.size(12.dp)
          )
          Text(
            text = "换一批",
            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
          )
        }
      }
    }
    if (recommended.isEmpty()) {
      val message = when {
        isLoading -> "正在加载推荐岗位..."
        !error.isNullOrBlank() -> error
        else -> "暂无推荐岗位"
      }
      Text(
        text = message,
        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
      )
    } else {
      Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        recommended.forEach { job ->
          RecommendedJobCard(
            job = job,
            onClick = { onJobClick(job.id) }
          )
        }
      }
    }
  }
}

@Composable
private fun RecommendedJobCard(
  job: JobListing,
  onClick: () -> Unit
) {
  Surface(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick),
    color = Color.White,
    shape = RoundedCornerShape(8.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          text = job.title,
          style = MaterialTheme.typography.bodyMedium.copy(
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            color = TextPrimary
          ),
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        if (job.salary.isNotBlank()) {
          Text(
            text = job.salary,
            style = MaterialTheme.typography.bodyMedium.copy(
              fontWeight = FontWeight.SemiBold,
              color = AccentOrange
            )
          )
        }
      }
      val tags = buildList {
        if (job.education.isNotBlank()) add(job.education)
        if (job.experience.isNotBlank()) add(job.experience)
        job.tags.filter { it.isNotBlank() }.forEach { add(it) }
      }.take(3)
      if (tags.isNotEmpty()) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          tags.forEach { TagChip(text = it) }
        }
      }
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          horizontalArrangement = Arrangement.spacedBy(12.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier
              .size(24.dp)
              .clip(CircleShape)
              .background(Color(0xFFEAEAEA)),
            contentAlignment = Alignment.Center
          ) {
            if (job.companyLogo.isNullOrBlank()) {
              Text(
                text = job.company.take(1).ifBlank { "企" },
                style = MaterialTheme.typography.bodySmall.copy(
                  fontWeight = FontWeight.Medium,
                  color = TextPrimary
                )
              )
            } else {
              SubcomposeAsyncImage(
                model = job.companyLogo,
                contentDescription = job.company,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                error = {
                  Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                  ) {
                    Text(
                      text = job.company.take(1).ifBlank { "企" },
                      style = MaterialTheme.typography.bodySmall.copy(
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary
                      )
                    )
                  }
                }
              )
            }
          }
          Column {
            Text(
              text = job.company,
              style = MaterialTheme.typography.bodySmall.copy(
                fontWeight = FontWeight.Medium,
                color = TextPrimary
              ),
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
            if (job.companyTagline.isNotBlank()) {
              Text(
                text = job.companyTagline,
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
              )
            }
          }
        }
        if (job.location.isNotBlank()) {
          Text(
            text = job.location,
            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
        }
      }
    }
  }
}

@Composable
private fun TagChip(text: String) {
  Surface(
    color = ChipBackground,
    shape = RoundedCornerShape(4.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Text(
      text = text,
      modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
      style = MaterialTheme.typography.bodySmall.copy(
        color = TextPrimary,
        fontSize = 12.sp
      )
    )
  }
}

@Composable
private fun JobDetailBottomBar(
  company: String,
  isCheckingResume: Boolean,
  isApplying: Boolean,
  applySuccess: Boolean,
  applyError: String?,
  onApply: () -> Unit
) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    color = Color.White,
    tonalElevation = 0.dp,
    shadowElevation = 8.dp
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 48.dp, vertical = 10.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
      Button(
        onClick = onApply,
        enabled = !isCheckingResume && !isApplying && !applySuccess,
        colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier
          .fillMaxWidth()
          .height(48.dp)
      ) {
        when {
          isCheckingResume -> {
            CircularProgressIndicator(
              color = Color.White,
              strokeWidth = 2.dp,
              modifier = Modifier.size(18.dp)
            )
          }
          isApplying -> {
            CircularProgressIndicator(
              color = Color.White,
              strokeWidth = 2.dp,
              modifier = Modifier.size(18.dp)
            )
          }
          applySuccess -> {
            Text(
              text = "申请已提交",
              style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
            )
          }
          else -> {
            Text(
              text = "立即投递",
              style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
            )
          }
        }
      }
      when {
        applyError != null -> {
          Text(
            text = applyError,
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFFEF4444)),
            textAlign = TextAlign.Center
          )
        }
        applySuccess -> {
          Text(
            text = "我们已收到你投递 ${company} 的申请，请保持联系方式畅通。",
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF059669)),
            textAlign = TextAlign.Center
          )
        }
        isCheckingResume -> {
          Text(
            text = "正在检测 AI 简历报告…",
            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
            textAlign = TextAlign.Center
          )
        }
        else -> {
          Text(
            text = "提示：投递前请完善资料，保持手机畅通以便 HR 联系。",
            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
            textAlign = TextAlign.Center
          )
        }
      }
    }
  }
}

@Composable
private fun JobDetailLoadingState() {
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PageBackground),
    contentAlignment = Alignment.Center
  ) {
    CircularProgressIndicator(color = AccentOrange)
  }
}

@Composable
private fun JobDetailErrorState(
  message: String,
  onRetry: () -> Unit,
  onBack: () -> Unit
) {
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PageBackground)
      .padding(horizontal = 24.dp),
    contentAlignment = Alignment.Center
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "加载岗位详情失败",
        style = MaterialTheme.typography.titleMedium.copy(
          fontWeight = FontWeight.SemiBold,
          color = TextPrimary
        ),
        textAlign = TextAlign.Center
      )
      Text(
        text = message,
        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
        textAlign = TextAlign.Center
      )
      Button(
        onClick = onRetry,
        colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
        shape = RoundedCornerShape(20.dp)
      ) {
        Text(
          text = "重新加载",
          style = MaterialTheme.typography.bodyMedium.copy(color = Color.White)
        )
      }
      Button(
        onClick = onBack,
        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
        shape = RoundedCornerShape(20.dp)
      ) {
        Text(
          text = "返回列表",
          style = MaterialTheme.typography.bodyMedium.copy(color = AccentOrange)
        )
      }
    }
  }
}
