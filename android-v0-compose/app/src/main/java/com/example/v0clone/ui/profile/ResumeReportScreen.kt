package com.xlwl.AiMian.ui.profile

import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import java.util.Locale

private val PageBackground = Color(0xFFEBEBEB)
private val AccentOrange = Color(0xFFEC7C38)
private val MutedGray = Color(0xFFB5B7B8)
private val TrackGray = Color(0xFFD9D9D9)
private val ChipBackground = Color(0xFFF3F8FB)
// 青色背景用于报告卡片
private val TealCardBackground = Color(0xFFE0F7FA)
private val TealDivider = Color(0xFF00ACC3)
private val GradientTop = Brush.verticalGradient(listOf(Color(0xFF00ACC3), PageBackground))

data class ResumeJobMatch(
  val title: String,
  val description: String,
  val matchRatio: Float
)

data class ResumeCompetency(
  val name: String,
  val score: Float, // 0-10 or 0-1
  val ratingLabel: String,
  val description: String,
  val icon: String = "💡", // Added icon
  val statusTag: String = "待提升" // Added status tag
)

data class JobRecommendation(
  val title: String,
  val salaryRange: String,
  val tags: List<String>,
  val companyName: String,
  val companyDescription: String,
  val location: String
)

data class ResumeReport(
  val title: String,
  val testedAt: String,
  val bestMatch: ResumeJobMatch,
  val competencies: List<ResumeCompetency>,
  val tips: String,
  val generatedNote: String,
  val recommendedJobs: List<JobRecommendation>
)

@Composable
fun ResumeReportRoute(
  repository: AiInterviewRepository,
  initialSessionId: String? = null,
  onBack: () -> Unit
) {
  val viewModel: ResumeReportViewModel = viewModel(factory = ResumeReportViewModel.provideFactory(repository, initialSessionId))
  val state by viewModel.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current

  ResumeReportHome(
    state = state,
    onBack = onBack,
    onRefresh = { viewModel.loadReports() },
    onSelectReport = { report ->
      if (report.isReady) {
        viewModel.selectReport(report)
      } else {
        Toast.makeText(context, "报告还在生成中，请稍后再试", Toast.LENGTH_SHORT).show()
      }
    },
    onExitDetail = { viewModel.clearSelection() }
  )
}

@Composable
private fun ResumeReportHome(
  state: ResumeReportUiState,
  onBack: () -> Unit,
  onRefresh: () -> Unit,
  onSelectReport: (ResumeReportListItem) -> Unit,
  onExitDetail: () -> Unit
) {
  val selected = state.selectedReport
  if (selected != null) {
    val mockReport = remember(selected) { generateValidMockResumeReport(selected) }
    ResumeReportScreen(
      report = mockReport,
      onBack = {
        if (state.reports.size > 1) {
          onExitDetail()
        } else {
          onBack()
        }
      },
      onRetest = onRefresh
    )
  } else {
    ResumeReportListScreen(
      state = state,
      onBack = onBack,
      onRefresh = onRefresh,
      onSelectReport = onSelectReport
    )
  }
}

@Composable
private fun ResumeReportListScreen(
  state: ResumeReportUiState,
  onBack: () -> Unit,
  onRefresh: () -> Unit,
  onSelectReport: (ResumeReportListItem) -> Unit
) {
  val headerHeight = 100.dp
  val listTopPadding = headerHeight
  val navPadding = WindowInsets.navigationBars.asPaddingValues()
  val listBottomPadding = navPadding.calculateBottomPadding() + 72.dp
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PageBackground)
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(headerHeight)
        .background(GradientTop)
        .zIndex(1f)
    ) {
      ResumeReportTopBar(
        modifier = Modifier.align(Alignment.BottomCenter),
        onBack = onBack,
        onRefresh = onRefresh
      )
    }

    when {
      state.isLoading -> {
        ReportLoadingPlaceholder(
          modifier = Modifier
            .fillMaxSize()
            .padding(top = headerHeight)
        )
      }

      state.error != null -> {
        ReportErrorPlaceholder(
          message = state.error,
          onRetry = onRefresh,
          modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp)
            .padding(top = headerHeight)
        )
      }

      state.reports.isEmpty() -> {
        ReportEmptyPlaceholder(
          modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp)
            .padding(top = headerHeight)
        )
      }

      else -> {
        LazyColumn(
          modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp)
            .padding(top = listTopPadding),
          verticalArrangement = Arrangement.spacedBy(12.dp),
          contentPadding = PaddingValues(bottom = listBottomPadding)
        ) {
          items(state.reports) { report ->
            ResumeReportListItemCard(
              item = report,
              onClick = { onSelectReport(report) }
            )
          }
        }
      }
    }
  }
}

@Composable
private fun ResumeReportListItemCard(
  item: ResumeReportListItem,
  onClick: () -> Unit
) {
  val subtitle = remember(item) {
    listOfNotNull(item.jobCategory, item.jobSubCategory)
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .distinct()
      .joinToString(" / ")
  }
  val displaySubtitle = subtitle.ifBlank { item.resumeType ?: "AI 视频简历" }
  val statusLabel = remember(item) {
    when {
      item.isReady -> "报告已生成"
      item.analysisStatus?.equals("PROCESSING", true) == true -> "生成中"
      item.status.equals("IN_PROGRESS", true) -> "面试进行中"
      else -> "等待生成"
    }
  }
  val testedAt = remember(item.testedAt) { item.testedAt?.takeIf { it.isNotBlank() } }
  val statusColor = if (item.isReady) Color(0xFF00C853) else AccentOrange

  Card(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(14.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Text(
        text = item.jobTitle,
        style = MaterialTheme.typography.titleMedium.copy(
          fontSize = 16.sp,
          fontWeight = FontWeight.SemiBold,
          color = Color.Black
        )
      )
      Text(
        text = displaySubtitle,
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 13.sp,
          color = MutedGray
        )
      )
      testedAt?.let { tested ->
        Text(
          text = tested,
          style = MaterialTheme.typography.bodySmall.copy(
            fontSize = 12.sp,
            color = MutedGray.copy(alpha = 0.8f)
          )
        )
      }
      Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        ResumeReportStatusChip(
          text = statusLabel,
          textColor = statusColor,
          background = statusColor.copy(alpha = 0.12f)
        )
        item.resumeType?.takeIf { it.isNotBlank() }?.let { resumeType ->
          ResumeReportStatusChip(
            text = resumeType,
            textColor = Color(0xFF005B99),
            background = Color(0x1A005B99)
          )
        }
      }
    }
  }
}

@Composable
private fun ResumeReportStatusChip(
  text: String,
  textColor: Color,
  background: Color
) {
  Box(
    modifier = Modifier
      .clip(RoundedCornerShape(12.dp))
      .background(background)
      .padding(horizontal = 10.dp, vertical = 6.dp)
  ) {
    Text(
      text = text,
      style = MaterialTheme.typography.bodySmall.copy(
        fontSize = 12.sp,
        color = textColor,
        fontWeight = FontWeight.Medium
      )
    )
  }
}

@Composable
private fun ReportLoadingPlaceholder(modifier: Modifier = Modifier) {
  Box(
    modifier = modifier,
    contentAlignment = Alignment.Center
  ) {
    CircularProgressIndicator(
      color = AccentOrange
    )
  }
}

@Composable
private fun ReportEmptyPlaceholder(modifier: Modifier = Modifier) {
  Column(
    modifier = modifier,
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text(
      text = "暂无简历报告",
      style = MaterialTheme.typography.titleMedium.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color.Black
      )
    )
    Spacer(modifier = Modifier.height(8.dp))
    Text(
      text = "完成一次 AI 面试后，报告会出现在这里",
      style = MaterialTheme.typography.bodySmall.copy(
        fontSize = 13.sp,
        color = MutedGray
      )
    )
  }
}

@Composable
private fun ReportErrorPlaceholder(
  message: String,
  onRetry: () -> Unit,
  modifier: Modifier = Modifier
) {
  Column(
    modifier = modifier,
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text(
      text = "加载失败",
      style = MaterialTheme.typography.titleMedium.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color.Black
      )
    )
    Spacer(modifier = Modifier.height(8.dp))
    Text(
      text = message,
      style = MaterialTheme.typography.bodySmall.copy(
        fontSize = 13.sp,
        color = MutedGray
      )
    )
    Spacer(modifier = Modifier.height(12.dp))
    Button(
      onClick = onRetry,
      shape = RoundedCornerShape(20.dp),
      colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
    ) {
      Text(
        text = "重试",
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 13.sp,
          color = Color.White
        )
      )
    }
  }
}

// Native detailed screen implementation starts below

fun generateValidMockResumeReport(item: ResumeReportListItem): ResumeReport {
    val testedDate = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.CHINA).format(java.util.Date())
    
    return ResumeReport(
        title = "U-Talent视频简历报告",
        testedAt = "测试日期 $testedDate",
        bestMatch = ResumeJobMatch(
            title = item.jobCategory?.takeIf { it.isNotBlank() } ?: "研发类",
            description = "具有极强的创新能力、并且对于开放环境感到放松，很适合在初创公司里担任研发工作，能够产生很多的创新产品。",
            matchRatio = 0.95f
        ),
        competencies = listOf(
            ResumeCompetency("专业能力", 0.0f, "0.0/10", "岗位硬技能目前处于起步阶段，建议加强基础理论和实操练习。", "💡", "待提升"),
            ResumeCompetency("学习成长", 0.0f, "0.0/10", "学习成长的潜质尚待挖掘，保持好奇心是快速提升的关键。", "📈", "待提升"),
            ResumeCompetency("沟通协作", 0.0f, "0.0/10", "沟通协作能力有待提升，建议多参与团队活动，锻炼表达与倾听。", "🤝", "待提升"),
            ResumeCompetency("问题解决", 0.0f, "0.0/10", "分析与解决问题的逻辑思维需进一步强化，通过实战积累经验。", "🧩", "待提升"),
            ResumeCompetency("成就执行", 0.0f, "0.0/10", "执行力是达成目标的基石，建议从微小目标开始，培养结果导向习惯。", "🎯", "待提升"),
            ResumeCompetency("抗压韧性", 0.0f, "0.0/10", "抗压能力仍有较大提升空间，保持心态平和，积极面对各种挑战。", "🛡️", "待提升")
        ),
        tips = "你的协作能力、团队责任能力很好，继续保持～对于一些高压的情况下也可以尝试深呼吸，你可以做的更好～也可以多关注一下身边人的情绪，这样你在团队协同中会表现得更好。",
        generatedNote = "报告有效期为您测试日为准后之一年内有效",
        recommendedJobs = listOf(
            JobRecommendation(
                title = "前端开发",
                salaryRange = "10-20K",
                tags = listOf("本科", "经验不限", "弹性工作"),
                companyName = "星链科技",
                companyDescription = "A轮 | 100-499人",
                location = "上海 徐汇区"
            ),
            JobRecommendation(
                title = "后端开发",
                salaryRange = "15-30K",
                tags = listOf("本科", "3-5年", "双休"),
                companyName = "未来之力",
                companyDescription = "B轮 | 500-999人",
                location = "北京 海淀区"
            )
        )
    )
}

@Composable
fun ResumeReportScreen(
  report: ResumeReport,
  onBack: () -> Unit,
  onRetest: () -> Unit = {}
) {
  val headerHeightMax = 100.dp
  val headerHeightMin = 72.dp
  val density = LocalDensity.current
  val listState = androidx.compose.foundation.lazy.rememberLazyListState()
  
  val currentHeaderHeight by remember {
    derivedStateOf {
      val maxOffset = with(density) { (headerHeightMax - headerHeightMin).toPx() }
      val scrollOffset = listState.firstVisibleItemScrollOffset.toFloat()
      val fraction = (scrollOffset / maxOffset).coerceIn(0f, 1f)
      headerHeightMax - (headerHeightMax - headerHeightMin) * fraction
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PageBackground)
  ) {
    LazyColumn(
      state = listState,
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
      contentPadding = PaddingValues(top = headerHeightMax + 12.dp, bottom = 32.dp)
    ) {
      item {
        CompetencyRadarCard(report.competencies)
      }
      item {
        CompetencyDetailsHeader()
      }
      item {
        CompetencyDetailsCard(report.competencies)
      }
      item {
        TipsCard(
          tips = report.tips,
          generatedNote = report.generatedNote,
          onRetest = onRetest
        )
      }
      item {
        RecommendationsHeader()
      }
      items(report.recommendedJobs) { job ->
        RecommendationCard(job)
      }
    }
    
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(currentHeaderHeight)
        .background(GradientTop)
        .zIndex(1f)
    ) {
      ResumeReportTopBar(
        modifier = Modifier.align(Alignment.BottomCenter),
        onBack = onBack,
        onRefresh = onRetest
      )
    }
  }
}

@Composable
private fun ResumeReportTopBar(
  modifier: Modifier = Modifier,
  onBack: () -> Unit,
  onRefresh: () -> Unit
) {
  Row(
    modifier = modifier
      .fillMaxWidth()
      .statusBarsPadding()
      .padding(horizontal = 12.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.SpaceBetween
  ) {
    IconButton(onClick = onBack) {
      Icon(
        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
        contentDescription = "返回",
        tint = Color.Black
      )
    }

    Text(
      text = "简历报告",
      style = MaterialTheme.typography.titleMedium.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color.Black
      )
    )

    IconButton(onClick = onRefresh) {
      Icon(
        imageVector = Icons.Outlined.Refresh,
        contentDescription = "刷新",
        tint = Color.Black
      )
    }
  }
}

@Composable
private fun ReportSummaryCard(
  title: String,
  testedAt: String
) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Text(
        text = title,
        style = MaterialTheme.typography.titleMedium.copy(
          fontSize = 16.sp,
          fontWeight = FontWeight.SemiBold,
          color = AccentOrange
        )
      )
      Text(
        text = testedAt,
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 12.sp,
          color = Color.Black,
          lineHeight = 21.sp
        )
      )
    }
  }
}

@Composable
private fun BestMatchCard(match: ResumeJobMatch) {
  // 青色背景卡片
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = TealCardBackground),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "最佳匹配岗位",
        style = MaterialTheme.typography.titleSmall.copy(
          fontSize = 14.sp,
          color = Color.Black,
          fontWeight = FontWeight.Medium
        )
      )
      Text(
        text = match.description,
        style = MaterialTheme.typography.bodyMedium.copy(
          fontSize = 14.sp,
          lineHeight = 22.sp,
          color = Color.Black
        )
      )
      // 匹配度进度条：进度条 + 百分比标签
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        MetricProgressBar(
          progress = match.matchRatio,
          modifier = Modifier.weight(1f),
          color = Color(0xFF2196F3) // Updated to blue to match evaluation theme
        )
        // 橙色标签显示百分比 (Keeping orange for the match percentage badge as a highlight)
        Surface(
          color = AccentOrange,
          shape = RoundedCornerShape(4.dp)
        ) {
          Text(
            text = "匹配度 ${toPercentage(match.matchRatio)}",
            style = MaterialTheme.typography.bodySmall.copy(
              fontSize = 12.sp,
              color = Color.White,
              fontWeight = FontWeight.Medium
            ),
            modifier = Modifier
              .padding(horizontal = 8.dp, vertical = 4.dp)
          )
        }
      }
    }
  }
}

// 核心竞争力雷达图卡片（青色背景）
@Composable
private fun CompetencyRadarCard(competencies: List<ResumeCompetency>) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White), // Change to white as in Screenshot 2
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Text(
        text = "综合能力评估", // Updated Title
        style = MaterialTheme.typography.titleMedium.copy(
          fontSize = 16.sp,
          color = Color.Black,
          fontWeight = FontWeight.Bold
        ),
        modifier = Modifier.align(Alignment.Start)
      )
      
      Box(contentAlignment = Alignment.Center) {
        CompetencyRadarChart(
          competencies = competencies,
          modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
        )
        
        // Centered Overall Score as seen in Screenshot 2
        val overallScore = remember(competencies) {
          if (competencies.isEmpty()) 0f 
          else competencies.map { it.score }.average().toFloat()
        }
        val scoreFormatted = String.format(java.util.Locale.CHINA, "%.1f", overallScore)
        
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = "综合评分", fontSize = 12.sp, color = Color.Gray)
          Text(
            text = buildAnnotatedString {
              withStyle(SpanStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFA000))) {
                append(scoreFormatted)
              }
              withStyle(SpanStyle(fontSize = 14.sp, color = Color.Gray)) {
                append(" /10")
              }
            }
          )
        }
      }
      
      // Legend
      Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.Center,
          modifier = Modifier.fillMaxWidth()
      ) {
          Box(modifier = Modifier.size(10.dp).background(Color(0xFF2196F3)))
          Spacer(modifier = Modifier.width(4.dp))
          Text(text = "能力评分", fontSize = 12.sp, color = Color(0xFF2196F3))
      }
    }
  }
}

@Composable
private fun CompetencyDetailsHeader() {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier
      .fillMaxWidth()
      .padding(vertical = 8.dp)
  ) {
    Icon(
      imageVector = Icons.Default.KeyboardArrowDown,
      contentDescription = null,
      tint = Color.Gray,
      modifier = Modifier.size(20.dp)
    )
    Spacer(modifier = Modifier.width(4.dp))
    Text(
      text = "查看各维度详细评分",
      style = MaterialTheme.typography.bodyMedium.copy(
        fontSize = 14.sp,
        color = Color.Gray
      )
    )
  }
}

// 各竞争力详细描述卡片（白色背景，用青色分隔线分隔）
@Composable
private fun CompetencyDetailsCard(competencies: List<ResumeCompetency>) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
      competencies.forEachIndexed { index, competency ->
        CompetencyItem(competency)
          // 添加青色分隔线（最后一个不添加）
        if (index < competencies.size - 1) {
          Spacer(modifier = Modifier.height(16.dp))
          HorizontalDivider(
            color = TealDivider.copy(alpha = 0.3f),
            thickness = 0.5.dp
          )
          Spacer(modifier = Modifier.height(16.dp))
        }
      }
    }
  }
}

@Composable
private fun CompetencyRadarChart(
  competencies: List<ResumeCompetency>,
  modifier: Modifier = Modifier,
  gridLevels: Int = 5
) {
  BoxWithConstraints(modifier = modifier) {
    val density = LocalDensity.current
    val widthPx = constraints.maxWidth.toFloat()
    val heightPx = constraints.maxHeight.toFloat()
    val sizePx = min(widthPx, heightPx)
    val center = Offset(widthPx / 2f, heightPx / 2f)
    val radius = sizePx / 2f * 0.75f
    val angleStep = (2 * PI) / competencies.size
    val startAngle = -PI / 2
    val strokeWidth = with(density) { 1.dp.toPx() }
    
    val chartColor = Color(0xFF2196F3) // Blue
    
    val labelPaint = android.graphics.Paint().apply {
      isAntiAlias = true
      textAlign = android.graphics.Paint.Align.CENTER
      color = android.graphics.Color.parseColor("#757575")
      textSize = with(density) { 12.sp.toPx() }
    }
    
    Canvas(modifier = Modifier.fillMaxSize()) {
      // Draw grid levels (Hexagon rings)
      for (level in 1..gridLevels) {
        val ratio = level / gridLevels.toFloat()
        val path = Path()
        competencies.indices.forEach { index ->
          val angle = startAngle + index * angleStep
          val point = Offset(
            x = center.x + cos(angle).toFloat() * radius * ratio,
            y = center.y + sin(angle).toFloat() * radius * ratio
          )
          if (index == 0) {
            path.moveTo(point.x, point.y)
          } else {
            path.lineTo(point.x, point.y)
          }
        }
        path.close()
        drawPath(
          path = path,
          color = Color.LightGray.copy(alpha = 0.3f),
          style = Stroke(width = strokeWidth)
        )
      }

      // Draw axes
      competencies.indices.forEach { index ->
        val angle = startAngle + index * angleStep
        val point = Offset(
          x = center.x + cos(angle).toFloat() * radius,
          y = center.y + sin(angle).toFloat() * radius
        )
        drawLine(
          color = Color.LightGray.copy(alpha = 0.3f),
          start = center,
          end = point,
          strokeWidth = strokeWidth
        )
      }

      // Draw data area (Filled blue)
      val dataPath = Path()
      competencies.forEachIndexed { index, competency ->
        val valueRatio = (competency.score / 10f).coerceIn(0f, 1f)
        val angle = startAngle + index * angleStep
        val point = Offset(
          x = center.x + cos(angle).toFloat() * radius * valueRatio,
          y = center.y + sin(angle).toFloat() * radius * valueRatio
        )
        if (index == 0) {
          dataPath.moveTo(point.x, point.y)
        } else {
          dataPath.lineTo(point.x, point.y)
        }
      }
      dataPath.close()
      drawPath(
        path = dataPath,
        color = chartColor.copy(alpha = 0.15f)
      )
      drawPath(
        path = dataPath,
        color = chartColor,
        style = Stroke(width = strokeWidth * 2, cap = StrokeCap.Round, join = StrokeJoin.Round)
      )

      // Draw points
      competencies.forEachIndexed { index, competency ->
        val valueRatio = (competency.score / 10f).coerceIn(0f, 1f)
        val angle = startAngle + index * angleStep
        val point = Offset(
          x = center.x + cos(angle).toFloat() * radius * valueRatio,
          y = center.y + sin(angle).toFloat() * radius * valueRatio
        )
        drawCircle(
          color = Color.White,
          radius = with(density) { 4.dp.toPx() },
          center = point
        )
        drawCircle(
          color = chartColor,
          radius = with(density) { 3.dp.toPx() },
          center = point
        )
      }

      // Draw labels
      drawIntoCanvas { canvas ->
        competencies.forEachIndexed { index, competency ->
          val angle = startAngle + index * angleStep
          // Offset labels slightly more for readability
          val labelRadius = radius + with(density) { 25.dp.toPx() }
          val x = center.x + cos(angle).toFloat() * labelRadius
          val y = center.y + sin(angle).toFloat() * labelRadius
          
          canvas.nativeCanvas.drawText(
            competency.name,
            x,
            y + labelPaint.textSize / 3f,
            labelPaint
          )
        }
      }
    }
  }
}

@Composable
private fun CompetencyItem(competency: ResumeCompetency) {
  Column(
    verticalArrangement = Arrangement.spacedBy(10.dp),
    modifier = Modifier.fillMaxWidth()
  ) {
    // Top Row: Icon + Name + Status Chip + Score
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = competency.icon,
        fontSize = 18.sp,
        modifier = Modifier.padding(end = 8.dp)
      )
      Text(
        text = competency.name,
        style = MaterialTheme.typography.bodyMedium.copy(
          fontSize = 15.sp,
          fontWeight = FontWeight.SemiBold,
          color = Color.Black
        ),
        modifier = Modifier.weight(1f)
      )
      
      // Status Chip
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(4.dp))
          .background(Color(0xFFFFEBEE)) // Light red for "待提升"
          .padding(horizontal = 6.dp, vertical = 2.dp)
      ) {
        Text(
          text = competency.statusTag,
          style = MaterialTheme.typography.bodySmall.copy(
            fontSize = 11.sp,
            color = Color(0xFFEF5350), // Red
            fontWeight = FontWeight.Bold
          )
        )
      }
    }

    // Middle Row: Progress Bar + Score Text
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      MetricProgressBar(
        progress = competency.score / 10f, // Assuming score is 0-10 now
        modifier = Modifier.weight(1f),
        color = Color(0xFF2196F3) // Blue theme
      )
      Text(
        text = competency.ratingLabel,
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 13.sp,
          color = Color(0xFFEF5350), // Red for low scores as in screenshot
          fontWeight = FontWeight.Bold
        )
      )
    }

    // Bottom Row: AI Feedback Brief
    Text(
      text = competency.description,
      style = MaterialTheme.typography.bodySmall.copy(
        fontSize = 13.sp,
        lineHeight = 18.sp,
        color = Color.Gray
      ),
      modifier = Modifier.fillMaxWidth()
    )
  }
}

@Composable
private fun TipsCard(
  tips: String,
  generatedNote: String,
  onRetest: () -> Unit
) {
  // 青色背景卡片，包含Tips、有效期说明和重新测评按钮
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = TealCardBackground),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "职场Tips",
        style = MaterialTheme.typography.titleSmall.copy(
          fontSize = 14.sp,
          color = Color.Black,
          fontWeight = FontWeight.Medium
        )
      )
      Text(
        text = tips,
        style = MaterialTheme.typography.bodyMedium.copy(
          fontSize = 14.sp,
          lineHeight = 22.sp,
          color = Color.Black
        )
      )
      // 有效期说明
      Text(
        text = generatedNote,
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 12.sp,
          color = MutedGray,
          lineHeight = 18.sp
        )
      )
      // 重新测评按钮
      Button(
        onClick = onRetest,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(40.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = AccentOrange,
          contentColor = Color.White
        ),
        contentPadding = PaddingValues(vertical = 12.dp)
      ) {
        Text(
          text = "重新测评",
          style = MaterialTheme.typography.bodyMedium.copy(
            fontSize = 14.sp,
            color = Color.White,
            fontWeight = FontWeight.Medium
          )
        )
      }
    }
  }
}

@Composable
private fun RecommendationsHeader() {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(horizontal = 4.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(
      text = "岗位推荐",
      style = MaterialTheme.typography.titleSmall.copy(
        fontSize = 14.sp,
        color = Color.Black,
        fontWeight = FontWeight.Medium
      )
    )
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(4.dp),
      modifier = Modifier.clickable { }
    ) {
      Icon(
        imageVector = Icons.Outlined.Refresh,
        contentDescription = null,
        tint = MutedGray,
        modifier = Modifier.size(16.dp)
      )
      Text(
        text = "换一批",
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 12.sp,
          color = MutedGray
        )
      )
    }
  }
}

@Composable
private fun RecommendationCard(job: JobRecommendation) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
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
          style = MaterialTheme.typography.titleMedium.copy(
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black
          )
        )
        Text(
          text = job.salaryRange,
          style = MaterialTheme.typography.titleMedium.copy(
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = AccentOrange
          )
        )
      }
      // 标签：灰色背景，白色文字
      Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
      ) {
        job.tags.forEach { tag ->
          Surface(
            color = Color(0xFFE0E0E0), // 灰色背景
            shape = RoundedCornerShape(4.dp)
          ) {
            Text(
              text = tag,
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = Color.White // 白色文字
              ),
              modifier = Modifier
                .padding(horizontal = 8.dp, vertical = 4.dp)
            )
          }
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
          // 公司logo：红色圆形背景
          Box(
            modifier = Modifier
              .size(24.dp)
              .clip(CircleShape)
              .background(Color(0xFFE53935)), // 红色背景
            contentAlignment = Alignment.Center
          ) {
            // 这里可以添加公司logo图标，暂时留空
          }
          Column(
            verticalArrangement = Arrangement.spacedBy(2.dp)
          ) {
            Text(
              text = job.companyName,
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = Color.Black,
                fontWeight = FontWeight.Medium
              )
            )
            Text(
              text = job.companyDescription,
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = MutedGray
              )
            )
          }
        }
        Text(
          text = job.location,
          style = MaterialTheme.typography.bodySmall.copy(
            fontSize = 12.sp,
            color = Color.Black
          )
        )
      }
    }
  }
}

@Composable
private fun MetricProgressBar(
  progress: Float,
  modifier: Modifier = Modifier,
  height: Dp = 4.dp,
  color: Color = AccentOrange
) {
  Box(
    modifier = modifier
      .height(height)
      .clip(RoundedCornerShape(2.dp))
      .background(TrackGray.copy(alpha = 0.5f))
  ) {
    Box(
      modifier = Modifier
        .fillMaxHeight()
        .fillMaxWidth(progress.coerceIn(0f, 1f))
        .background(color)
    )
  }
}

private fun toPercentage(value: Float): String {
  val percent = (value * 100).coerceIn(0f, 100f)
  return String.format(Locale.CHINA, "%.0f%%", percent)
}
