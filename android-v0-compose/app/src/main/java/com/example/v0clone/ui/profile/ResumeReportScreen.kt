package com.xlwl.AiMian.ui.profile

import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
private val GradientTop = Brush.verticalGradient(listOf(Color(0xFF00ACC3), PageBackground))

data class ResumeJobMatch(
  val title: String,
  val description: String,
  val matchRatio: Float
)

data class ResumeCompetency(
  val name: String,
  val score: Float,
  val ratingLabel: String,
  val description: String
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
  onBack: () -> Unit
) {
  val viewModel: ResumeReportViewModel = viewModel(factory = ResumeReportViewModel.provideFactory(repository))
  val state by viewModel.uiState.collectAsStateWithLifecycle()

  ResumeReportHome(
    state = state,
    onBack = onBack,
    onRefresh = { viewModel.loadReports() },
    onSelectReport = { viewModel.selectReport(it) },
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
    ResumeReportDetailScreen(
      report = selected,
      showBackToList = state.reports.size > 1,
      onBack = {
        if (state.reports.size > 1) {
          onExitDetail()
        } else {
          onBack()
        }
      },
      onRefresh = onRefresh
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
  val headerHeight = 116.dp
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
    ) {
      ResumeReportTopBar(
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
            .padding(top = headerHeight - 16.dp),
          verticalArrangement = Arrangement.spacedBy(12.dp),
          contentPadding = PaddingValues(bottom = 32.dp)
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

@Composable
private fun ResumeReportDetailScreen(
  report: ResumeReportListItem,
  showBackToList: Boolean,
  onBack: () -> Unit,
  onRefresh: () -> Unit
) {
  val headerHeight = 116.dp
  val reportUrl = report.reportUrl?.takeIf { it.isNotBlank() }
  var reloadToken by remember { mutableStateOf(0) }
  val subtitle = remember(report) {
    listOfNotNull(report.jobCategory, report.jobSubCategory)
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .distinct()
      .joinToString(" / ")
  }
  val displaySubtitle = subtitle.ifBlank { report.resumeType ?: "AI 视频简历" }
  val statusLabel = remember(report) {
    when {
      report.isReady -> "报告已生成"
      report.analysisStatus?.equals("PROCESSING", true) == true -> "生成中"
      report.status.equals("IN_PROGRESS", true) -> "面试进行中"
      else -> "等待生成"
    }
  }
  val testedAt = remember(report.testedAt) { report.testedAt?.takeIf { it.isNotBlank() } }

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
    ) {
      ResumeReportTopBar(
        onBack = onBack,
        onRefresh = {
          if (reportUrl != null) {
            reloadToken++
          }
          onRefresh()
        }
      )
    }

    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 12.dp)
        .padding(top = headerHeight - 12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
      ) {
        Column(
          modifier = Modifier.padding(14.dp),
          verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Text(
            text = report.jobTitle,
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
              textColor = if (report.isReady) Color(0xFF00C853) else AccentOrange,
              background = (if (report.isReady) Color(0xFF00C853) else AccentOrange).copy(alpha = 0.12f)
            )
            report.resumeType?.takeIf { it.isNotBlank() }?.let { resumeType ->
              ResumeReportStatusChip(
                text = resumeType,
                textColor = Color(0xFF005B99),
                background = Color(0x1A005B99)
              )
            }
          }
          if (showBackToList) {
            Text(
              text = "如需查看其他岗位的报告，可返回列表选择。",
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = MutedGray
              )
            )
          }
        }
      }

      if (reportUrl != null) {
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .weight(1f)
            .clip(RoundedCornerShape(12.dp))
        ) {
          ReportWebView(
            url = reportUrl,
            reloadKey = reloadToken
          )
        }
      } else {
        Surface(
          modifier = Modifier
            .fillMaxWidth()
            .weight(1f),
          shape = RoundedCornerShape(12.dp),
          color = Color.White,
          tonalElevation = 0.dp
        ) {
          Column(
            modifier = Modifier
              .fillMaxSize()
              .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
          ) {
            Text(
              text = "报告生成中",
              style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
              )
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
              text = "分析完成后会自动出现在这里，请稍后再试。",
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 13.sp,
                color = MutedGray
              )
            )
          }
        }
      }
    }
  }
}

@Composable
private fun ReportWebView(
  url: String,
  reloadKey: Int,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  val webView = remember {
    WebView(context).apply {
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      webViewClient = WebViewClient()
    }
  }

  DisposableEffect(webView) {
    onDispose { webView.destroy() }
  }

  LaunchedEffect(url, reloadKey) {
    webView.loadUrl(url)
  }

  AndroidView(
    factory = { webView },
    modifier = modifier
  )
}

@Composable
fun ResumeReportScreen(
  report: ResumeReport,
  onBack: () -> Unit,
  onRetest: () -> Unit = {}
) {
  val headerHeight = 116.dp
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
    ) {
      ResumeReportTopBar(
        onBack = onBack,
        onRefresh = onRetest
      )
    }

    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 12.dp)
        .padding(top = headerHeight - 16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
      contentPadding = PaddingValues(bottom = 32.dp)
    ) {
      item {
        ReportSummaryCard(
          title = report.title,
          testedAt = report.testedAt
        )
      }
      item {
        BestMatchCard(report.bestMatch)
      }
      item {
        CompetencyCard(report.competencies)
      }
      item {
        TipsCard(report.tips)
      }
      item {
      Text(
        text = report.generatedNote,
        style = MaterialTheme.typography.bodySmall.copy(
          color = MutedGray,
          lineHeight = 21.sp,
          fontSize = 12.sp
        ),
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 12.dp)
      )
      }
      item {
        Button(
          onClick = onRetest,
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp),
          shape = RoundedCornerShape(40.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = AccentOrange,
            contentColor = Color.White
          ),
          contentPadding = PaddingValues(vertical = 8.dp)
        ) {
          Text(
            text = "重新测评",
            style = MaterialTheme.typography.bodySmall.copy(
              fontSize = 12.sp,
              color = Color.White
            )
          )
        }
      }
      item {
        RecommendationsHeader()
      }
      items(report.recommendedJobs) { job ->
        RecommendationCard(job)
      }
    }
  }
}

@Composable
private fun ResumeReportTopBar(
  onBack: () -> Unit,
  onRefresh: () -> Unit
) {
  Box(
    modifier = Modifier
      .fillMaxWidth()
      .statusBarsPadding()
      .height(56.dp)
      .padding(horizontal = 12.dp),
    contentAlignment = Alignment.Center
  ) {
    IconButton(
      onClick = onBack,
      modifier = Modifier.align(Alignment.CenterStart)
    ) {
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

    IconButton(
      onClick = onRefresh,
      modifier = Modifier.align(Alignment.CenterEnd)
    ) {
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
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "最佳匹配岗位",
        style = MaterialTheme.typography.titleSmall.copy(
          fontSize = 14.sp,
          color = AccentOrange,
          fontWeight = FontWeight.Medium
        )
      )
      Text(
        text = buildAnnotatedString {
          withStyle(
            SpanStyle(
              fontWeight = FontWeight.Medium,
              color = Color.Black
            )
          ) {
            append(match.title)
            append(" ")
          }
          append(match.description)
        },
        style = MaterialTheme.typography.bodyMedium.copy(
          fontSize = 14.sp,
          lineHeight = 22.sp,
          color = Color.Black
        )
      )
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        MetricProgressBar(
          progress = match.matchRatio,
          modifier = Modifier.weight(1f)
        )
        Text(
          text = "匹配度",
          style = MaterialTheme.typography.bodyMedium.copy(
            fontSize = 14.sp,
            color = Color.Black,
            fontWeight = FontWeight.Medium
          )
        )
        Surface(
          color = AccentOrange,
          shape = RoundedCornerShape(4.dp)
        ) {
          Text(
            text = toPercentage(match.matchRatio),
            style = MaterialTheme.typography.bodySmall.copy(
              fontSize = 12.sp,
              color = Color.White
            ),
            modifier = Modifier
              .padding(horizontal = 6.dp, vertical = 2.dp)
          )
        }
      }
    }
  }
}

@Composable
private fun CompetencyCard(competencies: List<ResumeCompetency>) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(8.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "职场六大核心竞争力",
        style = MaterialTheme.typography.titleSmall.copy(
          fontSize = 14.sp,
          color = AccentOrange,
          fontWeight = FontWeight.Medium
        )
      )
      CompetencyRadarChart(
        competencies = competencies,
        modifier = Modifier
          .fillMaxWidth()
          .height(220.dp)
      )
      Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        competencies.forEach { competency ->
          CompetencyItem(competency)
        }
      }
    }
  }
}

@Composable
private fun CompetencyRadarChart(
  competencies: List<ResumeCompetency>,
  modifier: Modifier = Modifier,
  gridLevels: Int = 4
) {
  BoxWithConstraints(modifier = modifier) {
    val density = LocalDensity.current
    val widthPx = constraints.maxWidth.toFloat()
    val heightPx = constraints.maxHeight.toFloat()
    val sizePx = min(widthPx, heightPx)
    val center = Offset(widthPx / 2f, heightPx / 2f)
    val radius = sizePx / 2f * 0.72f
    val angleStep = (2 * PI) / competencies.size
    val startAngle = -PI / 2
    val strokeWidth = with(density) { 1.dp.toPx() }
    val labelPaint = android.graphics.Paint().apply {
      isAntiAlias = true
      textAlign = android.graphics.Paint.Align.CENTER
      color = android.graphics.Color.parseColor("#B5B7B8")
      textSize = with(density) { 14.sp.toPx() }
    }
    Canvas(modifier = Modifier.fillMaxSize()) {
      // Draw grid levels
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
          color = TrackGray,
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
          color = TrackGray,
          start = center,
          end = point,
          strokeWidth = strokeWidth
        )
      }

      // Draw data area
      val dataPath = Path()
      competencies.forEachIndexed { index, competency ->
        val valueRatio = competency.score.coerceIn(0f, 1f)
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
        color = AccentOrange.copy(alpha = 0.2f)
      )
      drawPath(
        path = dataPath,
        color = AccentOrange,
        style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
      )

      // Draw points
      competencies.forEachIndexed { index, competency ->
        val valueRatio = competency.score.coerceIn(0f, 1f)
        val angle = startAngle + index * angleStep
        val point = Offset(
          x = center.x + cos(angle).toFloat() * radius * valueRatio,
          y = center.y + sin(angle).toFloat() * radius * valueRatio
        )
        drawCircle(
          color = AccentOrange,
          radius = with(density) { 4.dp.toPx() },
          center = point
        )
      }

      // Draw labels
      drawIntoCanvas { canvas ->
        competencies.forEachIndexed { index, competency ->
          val angle = startAngle + index * angleStep
          val labelRadius = radius + with(density) { 20.dp.toPx() }
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
    verticalArrangement = Arrangement.spacedBy(4.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Text(
        text = competency.name,
        style = MaterialTheme.typography.bodyMedium.copy(
          fontSize = 14.sp,
          fontWeight = FontWeight.Medium,
          color = Color.Black
        )
      )
      MetricProgressBar(
        progress = competency.score,
        modifier = Modifier.weight(1f)
      )
      Text(
        text = competency.ratingLabel,
        style = MaterialTheme.typography.bodySmall.copy(
          fontSize = 12.sp,
          color = AccentOrange,
          fontWeight = FontWeight.Medium
        )
      )
    }
    Text(
      text = competency.description,
      style = MaterialTheme.typography.bodyMedium.copy(
        fontSize = 14.sp,
        lineHeight = 22.sp,
        color = MutedGray
      )
    )
  }
}

@Composable
private fun TipsCard(tips: String) {
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
      Text(
        text = "职场Tips",
        style = MaterialTheme.typography.titleSmall.copy(
          fontSize = 14.sp,
          color = AccentOrange,
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
      Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
      ) {
        job.tags.forEach { tag ->
          Surface(
            color = ChipBackground,
            shape = RoundedCornerShape(4.dp)
          ) {
            Text(
              text = tag,
              style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = Color.Black
              ),
              modifier = Modifier
                .padding(horizontal = 8.dp, vertical = 2.dp)
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
          Box(
            modifier = Modifier
              .size(24.dp)
              .clip(CircleShape)
              .background(Color(0xFFE0E0E0))
          )
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
  height: Dp = 4.dp
) {
  Box(
    modifier = modifier
      .height(height)
      .clip(RoundedCornerShape(2.dp))
      .background(TrackGray)
  ) {
    Box(
      modifier = Modifier
        .fillMaxHeight()
        .fillMaxWidth(progress.coerceIn(0f, 1f))
        .background(AccentOrange)
    )
  }
}

private fun toPercentage(value: Float): String {
  val percent = (value * 100).coerceIn(0f, 100f)
  return String.format(Locale.CHINA, "%.0f%%", percent)
}
