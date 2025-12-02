package com.xlwl.AiMian.ui.jobs

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Place
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.SubcomposeAsyncImage
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.JobRepository

private val PageBackground = Color(0xFFF5F5F5) // Slightly lighter gray
private val AccentOrange = Color(0xFFFF7D38) // More vibrant orange from design
private val TextPrimary = Color(0xFF222222) // Darker black
private val TextSecondary = Color(0xFF666666) // Standard gray
private val TextTertiary = Color(0xFF999999) // Lighter gray for less important text
private val CardStroke = Color.Transparent // Design seems to have no visible stroke, just shadow or flat
private val CardBackground = Color.White
private val ChipBackground = Color(0xFFF5F7FA)
private val ChipText = Color(0xFF5F6773)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDetailRoute(
  repository: JobRepository,
  aiInterviewRepository: AiInterviewRepository,
  jobId: String,
  onBack: () -> Unit,
  onJobClick: (String) -> Unit = {},
  onCompanyClick: (String) -> Unit = {},
  onStartInterview: (position: String, category: String, jobId: String?) -> Unit = { _, _, _ -> }
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
          onStartInterview(position, category, event.jobId)
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
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(PageBackground)
        .padding(bottom = innerPadding.calculateBottomPadding())
    ) {
      // Custom Header
      Column(modifier = Modifier.fillMaxWidth()) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .background(Color.White)
              .height(44.dp) // Compact fixed height
              .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            IconButton(onClick = onBack) {
              Icon(
                imageVector = Icons.Outlined.ArrowBack,
                contentDescription = "返回",
                tint = TextPrimary
              )
            }
            Text(
              text = "职位详情",
              style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = TextPrimary
              ),
              modifier = Modifier.weight(1f),
              textAlign = TextAlign.Center
            )
            // Placeholder for symmetry
            Spacer(modifier = Modifier.size(48.dp))
          }
      }

      LazyColumn(
        modifier = Modifier
          .fillMaxSize()
          .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 12.dp, bottom = 16.dp)
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
    color = CardBackground,
    shape = RoundedCornerShape(12.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(20.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text(
        text = detail.title,
        style = MaterialTheme.typography.titleLarge.copy(
          fontWeight = FontWeight.Bold,
          fontSize = 22.sp,
          color = TextPrimary
        )
      )
      if (detail.salary.isNotBlank()) {
        Text(
          text = detail.salary,
          style = MaterialTheme.typography.titleMedium.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
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
    color = CardBackground,
    shape = RoundedCornerShape(12.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.SpaceBetween
    ) {
      Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.weight(1f)
      ) {
        CompanyLogo(detail)
        Column {
          Text(
            text = detail.company,
            style = MaterialTheme.typography.bodyMedium.copy(
              fontWeight = FontWeight.Medium,
              fontSize = 16.sp,
              color = TextPrimary
            ),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
          if (detail.companyTagline.isNotBlank()) {
            Text(
              text = detail.companyTagline,
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 13.sp,
                color = TextTertiary
              ),
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
          }
        }
      }
      Icon(
        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
        contentDescription = "查看公司",
        tint = TextTertiary
      )
    }
  }
}

@Composable
private fun CompanyLogo(detail: JobDetail) {
  val placeholder = detail.company.take(1).ifBlank { "企" }
  Box(
    modifier = Modifier
      .size(48.dp)
      .clip(CircleShape)
      .background(Color.White), // White background for logo
    contentAlignment = Alignment.Center
  ) {
    if (detail.companyLogo.isNullOrBlank()) {
       // Fallback if no logo
       Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AccentOrange.copy(alpha = 0.1f)),
        contentAlignment = Alignment.Center
       ) {
           Icon(
             painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_tab_jobs_filled),
             contentDescription = null,
             tint = AccentOrange,
             modifier = Modifier.size(24.dp)
           )
       }
    } else {
      SubcomposeAsyncImage(
        model = detail.companyLogo,
        contentDescription = detail.company,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Fit, // Fit to show full logo
        error = {
           Box(
            modifier = Modifier
                .fillMaxSize()
                .background(AccentOrange.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
           ) {
               Icon(
                 painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_tab_jobs_filled),
                 contentDescription = null,
                 tint = AccentOrange,
                 modifier = Modifier.size(24.dp)
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
    color = CardBackground,
    shape = RoundedCornerShape(12.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(20.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "职位描述",
        style = MaterialTheme.typography.titleMedium.copy(
          fontWeight = FontWeight.Bold,
          fontSize = 18.sp,
          color = TextPrimary
        )
      )
      
      // Combine description, responsibilities, and requirements into a cohesive flow
      Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
          if (detail.description.isNotBlank()) {
            // Remove "职位描述" if it appears at the start of the description
            val cleanDescription = detail.description.replace(Regex("^职位描述\\s*"), "").trim()
            if (cleanDescription.isNotBlank()) {
                Text(
                  text = cleanDescription,
                  style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 15.sp,
                    color = TextSecondary,
                    lineHeight = 24.sp
                  )
                )
            }
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
}

@Composable
private fun NumberedSection(title: String, items: List<String>) {
  Column(
    verticalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    Text(
      text = title,
      style = MaterialTheme.typography.bodyMedium.copy(
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        color = TextPrimary
      )
    )
    items.filter { it.isNotBlank() }.forEachIndexed { index, text ->
      Row(verticalAlignment = Alignment.Top) {
          Text(
            text = "${index + 1}、",
            style = MaterialTheme.typography.bodyMedium.copy(
              fontSize = 15.sp,
              color = TextSecondary,
              lineHeight = 24.sp
            )
          )
          Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(
              fontSize = 15.sp,
              color = TextSecondary,
              lineHeight = 24.sp
            )
          )
      }
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
    verticalArrangement = Arrangement.spacedBy(12.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = "猜你喜欢",
        style = MaterialTheme.typography.titleMedium.copy(
          fontWeight = FontWeight.Bold,
          fontSize = 16.sp,
          color = TextPrimary
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
            .padding(horizontal = 6.dp, vertical = 2.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
          Icon(
            imageVector = Icons.Filled.Refresh,
            contentDescription = "换一批",
            tint = TextTertiary,
            modifier = Modifier.size(14.dp)
          )
          Text(
            text = "换一批",
            style = MaterialTheme.typography.bodySmall.copy(
              fontSize = 13.sp,
              color = TextTertiary
            )
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
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 13.sp,
          color = TextSecondary
        )
      )
    } else {
      Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
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
    color = CardBackground,
    shape = RoundedCornerShape(12.dp),
    tonalElevation = 0.dp,
    shadowElevation = 0.dp
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          text = job.title,
          style = MaterialTheme.typography.bodyLarge.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = TextPrimary
          ),
          modifier = Modifier.weight(1f),
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        if (job.salary.isNotBlank()) {
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = job.salary,
            style = MaterialTheme.typography.bodyLarge.copy(
              fontWeight = FontWeight.Bold,
              fontSize = 16.sp,
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
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.weight(1f)
        ) {
          // Small company logo
           Box(
            modifier = Modifier
              .size(24.dp)
              .clip(CircleShape)
              .background(Color.White),
            contentAlignment = Alignment.Center
          ) {
            if (job.companyLogo.isNullOrBlank()) {
               Icon(
                 painter = painterResource(id = com.xlwl.AiMian.R.drawable.ic_tab_jobs_filled),
                 contentDescription = null,
                 tint = AccentOrange,
                 modifier = Modifier.padding(4.dp)
               )
            } else {
               SubcomposeAsyncImage(
                model = job.companyLogo,
                contentDescription = job.company,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
               )
            }
          }
          
          Text(
            text = job.company,
            style = MaterialTheme.typography.bodySmall.copy(
              fontWeight = FontWeight.Normal,
              fontSize = 13.sp,
              color = TextSecondary
            ),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
          
          if (job.companyTagline.isNotBlank()) {
             Text(
                text = job.companyTagline,
                style = MaterialTheme.typography.bodySmall.copy(
                  fontSize = 12.sp,
                  color = TextTertiary
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
             )
          }
        }
        
        if (job.location.isNotBlank()) {
           Text(
             text = job.location,
             style = MaterialTheme.typography.bodySmall.copy(
               fontSize = 13.sp,
               color = TextSecondary
             ),
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
      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
      style = MaterialTheme.typography.bodySmall.copy(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal,
        color = ChipText
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
        .padding(horizontal = 16.dp, vertical = 12.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Button(
        onClick = onApply,
        enabled = !isCheckingResume && !isApplying && !applySuccess,
        colors = ButtonDefaults.buttonColors(
            containerColor = AccentOrange,
            disabledContainerColor = AccentOrange.copy(alpha = 0.6f)
        ),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier
          .fillMaxWidth()
          .height(48.dp)
      ) {
        when {
          isCheckingResume || isApplying -> {
            CircularProgressIndicator(
              color = Color.White,
              strokeWidth = 2.dp,
              modifier = Modifier.size(20.dp)
            )
          }
          else -> {
            Text(
              text = "立即投递",
              style = MaterialTheme.typography.bodyMedium.copy(
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
              )
            )
          }
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
          fontWeight = FontWeight.Bold,
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
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = TextSecondary
        ),
        elevation = null
      ) {
         Text("返回")
      }
    }
  }
}
