package com.xlwl.AiMian.ui.profile

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
fun ResumeReportRoute(onBack: () -> Unit) {
  val report = remember {
    val description = "希望在工作中取得新突破或新进展，时常为自己设定有挑战的目标。喜欢尝试新事物，时常迸发新的想法，工作中比较喜欢提出原创性的解决方案。通常会遵循规则和程序，但有时也会打破常规来完成任务"
    ResumeReport(
      title = "星链未来视频简历报告",
      testedAt = "测试日期 10月17日 22:58",
      bestMatch = ResumeJobMatch(
        title = "研发类",
        description = "研究新技术，新方法和新产品的岗位。强调创新意识，对新事物保持开放的态度，愿意深入细致的思考问题",
        matchRatio = 0.95f
      ),
      competencies = listOf(
        ResumeCompetency("开放创新", 0.85f, "良好", description),
        ResumeCompetency("学习研究", 0.92f, "优秀", description),
        ResumeCompetency("成就导向", 0.92f, "优秀", description),
        ResumeCompetency("团队协作", 0.92f, "优秀", description),
        ResumeCompetency("人际沟通", 0.92f, "优秀", description),
        ResumeCompetency("压力承受", 0.92f, "优秀", description)
      ),
      tips = "追逐团队目标的过程中，常表现出一种挑战性和进攻的姿态，容易与团队成员发生争执，伤害到他人的感情，你有时过于急功近利，给自己和别人较大压力。",
      generatedNote = "你的测评结果生成于2025年10月17号22:58，有效期一年。\n如有需要，可选择重新测评。",
      recommendedJobs = listOf(
        JobRecommendation(
          title = "前端开发",
          salaryRange = "10-20K",
          tags = listOf("本科", "经验不限", "弹性工作"),
          companyName = "公司名称",
          companyDescription = "公司的简单介绍",
          location = "上海 徐汇区"
        ),
        JobRecommendation(
          title = "前端开发",
          salaryRange = "10-20K",
          tags = listOf("本科", "经验不限", "弹性工作"),
          companyName = "公司名称",
          companyDescription = "公司的简单介绍",
          location = "上海 徐汇区"
        )
      )
    )
  }

  ResumeReportScreen(
    report = report,
    onBack = onBack
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
