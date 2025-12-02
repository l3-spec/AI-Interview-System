package com.xlwl.AiMian.ui.circle

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopicAggregationRoute(
    topicId: String,
    topicTitle: String,
    onBack: () -> Unit,
    onPostClick: (String) -> Unit
) {
    val detail = remember(topicId) { sampleTopicAggregation(topicId, topicTitle) }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior(rememberTopAppBarState())

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = detail.displayTitle,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                        Text(
                            text = "${detail.participants} 人参与 · 热度 ${detail.heat}",
                            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280))
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "返回")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    navigationIconContentColor = Color(0xFF111827),
                    titleContentColor = Color(0xFF111827)
                ),
                scrollBehavior = scrollBehavior
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF5F6FA))
                .padding(innerPadding),
            contentPadding = PaddingValues(bottom = 96.dp)
        ) {
            item { TopicHero(detail) }
            item { Spacer(Modifier.height(16.dp)) }
            item { TopicMetrics(detail) }
            item { Spacer(Modifier.height(16.dp)) }

            item {
                Text(
                    text = "精选帖子",
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF1F2937)
                    )
                )
            }

            items(detail.posts, key = { it.id }) { post ->
                TopicPostCard(post = post, onClick = { onPostClick(post.id) })
            }
        }
    }
}

@Composable
private fun TopicHero(detail: TopicAggregationDetail) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .background(
                    brush = Brush.verticalGradient(detail.theme)
                )
                .padding(24.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = 0.15f)
            ) {
                Text(
                    text = "#${detail.tag}",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold
                    )
                )
            }

            Spacer(Modifier.height(16.dp))

            Text(
                text = detail.displayTitle,
                style = MaterialTheme.typography.titleLarge.copy(
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            )

            Spacer(Modifier.height(12.dp))

            Text(
                text = detail.description,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color.White.copy(alpha = 0.9f)
                )
            )
        }
    }
}

@Composable
private fun TopicMetrics(detail: TopicAggregationDetail) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(modifier = Modifier.weight(1f)) {
            MetricCard(
                modifier = Modifier.fillMaxWidth(),
                title = "近7日新增",
                value = detail.newParticipants,
                subtitle = "+${detail.growth}% 人关注"
            )
        }
        Box(modifier = Modifier.weight(1f)) {
            MetricCard(
                modifier = Modifier.fillMaxWidth(),
                title = "大咖答疑",
                value = detail.expertCount,
                subtitle = "职业教练在线"
            )
        }
    }
}

@Composable
private fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    ElevatedCard(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(title, style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6B7280)))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF111827)
                )
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Outlined.TrendingUp, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                Text(subtitle, style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF10B981)))
            }
        }
    }
}

@Composable
private fun TopicPostCard(post: TopicPost, onClick: () -> Unit) {
    ElevatedCard(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(Color.Transparent),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Color.White)
                .padding(bottom = 4.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(44.dp),
                    shape = CircleShape,
                    color = post.avatarColor.copy(alpha = 0.16f)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = post.author.take(1),
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = post.avatarColor
                            )
                        )
                    }
                }

                Spacer(Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.author,
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF1F2937)
                        )
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "${post.role} · ${post.time}",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF9CA3AF))
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF6366F1).copy(alpha = 0.12f)
                ) {
                    Text(
                        text = post.experience,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6366F1))
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1F2937)
                )
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = post.summary,
                style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF4B5563)),
                maxLines = 4,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(Modifier.height(16.dp))

            Divider(color = Color(0xFFF2F4F7))

            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TagChip(label = post.primaryTag)
                post.otherTags.take(2).forEach { tag ->
                    TagChip(label = tag)
                }
            }
        }
    }
}

@Composable
private fun TagChip(label: String) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF3F4F6)
    ) {
        Text(
            text = "# $label",
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF4F46E5))
        )
    }
}

private data class TopicAggregationDetail(
    val id: String,
    val tag: String,
    val displayTitle: String,
    val description: String,
    val participants: Int,
    val newParticipants: String,
    val growth: Int,
    val expertCount: String,
    val heat: Int,
    val theme: List<Color>,
    val posts: List<TopicPost>
)

private data class TopicPost(
    val id: String,
    val author: String,
    val role: String,
    val experience: String,
    val time: String,
    val title: String,
    val summary: String,
    val primaryTag: String,
    val otherTags: List<String>,
    val avatarColor: Color
)

private fun sampleTopicAggregation(topicId: String, topicTitle: String): TopicAggregationDetail {
    val baseTheme = when (topicId) {
        "topic_resume" -> listOf(Color(0xFFEC4899), Color(0xFFFF6CAB))
        "topic_offer" -> listOf(Color(0xFF0EA5E9), Color(0xFF38BDF8))
        else -> listOf(Color(0xFF4C51BF), Color(0xFF6B5BFF))
    }

    val posts = listOf(
        TopicPost(
            id = "${topicId}_post_1",
            author = "Milla",
            role = "数据科学家",
            experience = "经验分享",
            time = "2 小时前",
            title = "${topicTitle.ifEmpty { "AI 行业" }}岗位如何准备结构化面试",
            summary = "结合 STAR-LINK AI 面试系统的最新追问模块，整理 4 套高频问题应对模板，并附上实时反馈要点，帮助你在追问环节更自信。",
            primaryTag = topicTitle.ifEmpty { "AI求职" },
            otherTags = listOf("面试技巧", "STAR-LINK"),
            avatarColor = Color(0xFF38B2AC)
        ),
        TopicPost(
            id = "${topicId}_post_2",
            author = "Lance",
            role = "职业教练",
            experience = "教练点评",
            time = "昨天",
            title = "30 分钟优化${topicTitle.ifEmpty { "简历" }}的三步法",
            summary = "精选 6 个真实案例，展示如何从成果拆解、数据量化和项目亮点三个维度打磨 STAR-LINK 候选人的简历内容。",
            primaryTag = "案例拆解",
            otherTags = listOf("行业洞察", "效率工具"),
            avatarColor = Color(0xFFFF8C42)
        ),
        TopicPost(
            id = "${topicId}_post_3",
            author = "星链校招组",
            role = "招聘团队",
            experience = "官方公告",
            time = "3 天前",
            title = "本周${topicTitle.ifEmpty { "岗位" }}开放职位与面试日程",
            summary = "集中发布最新的开放岗位、面试安排以及应聘者常见问题解答，助你快速锁定最匹配的机会。",
            primaryTag = "招聘信息",
            otherTags = listOf("岗位推荐", "校招"),
            avatarColor = Color(0xFF6366F1)
        )
    )

    return TopicAggregationDetail(
        id = topicId,
        tag = when (topicId) {
            "topic_resume" -> "简历加成"
            "topic_offer" -> "拿Offer"
            else -> "AI求职"
        },
        displayTitle = topicTitle.ifEmpty { "STAR-LINK 热门话题" },
        description = "聚合 STAR-LINK 社区的高价值经验、实时招聘信息与职业教练答疑，为你提供最新的岗位洞察与行动建议。",
        participants = 2893,
        newParticipants = "+428",
        growth = 32,
        expertCount = "8 位",
        heat = 9876,
        theme = baseTheme,
        posts = posts
    )
}
