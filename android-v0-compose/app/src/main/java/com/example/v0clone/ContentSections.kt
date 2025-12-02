package com.xlwl.AiMian

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.RemoveRedEye
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import coil.compose.AsyncImage

data class Assessment(
    val title: String,
    val participants: String,
    val rating: Double,
    val duration: String,
    val tags: List<String>,
    val difficulty: String
)

data class Post(
    val title: String,
    val author: String,
    val views: String,
    val likes: String,
    val comments: String,
    val time: String,
    val tags: List<String>,
    val imageUrl: String,
    val aspect: Float
)

data class Expert(
    val name: String,
    val title: String,
    val topic: String,
    val followers: String,
    val company: String
)

private val initialAssessments = listOf(
    Assessment("前端开发工程师能力评测", "12.5k", 4.8, "45分钟", listOf("JavaScript", "React", "Vue"), "中级"),
    Assessment("数据分析师综合评估", "8.3k", 4.9, "60分钟", listOf("Python", "SQL", "数据可视化"), "高级"),
    Assessment("UI/UX设计师作品集评测", "6.7k", 4.7, "30分钟", listOf("Figma", "用户体验", "视觉设计"), "中级"),
)

private val initialPosts = listOf(
    Post(
        title = "2024年互联网大厂面试真题汇总",
        author = "职场导师小王",
        views = "25.6k",
        likes = "1.2k",
        comments = "456",
        time = "2小时前",
        tags = listOf("面试技巧", "大厂"),
        imageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
        aspect = 1.2f
    ),
    Post(
        title = "从0到1：产品经理成长路径详解",
        author = "产品老司机",
        views = "18.9k",
        likes = "890",
        comments = "234",
        time = "5小时前",
        tags = listOf("产品经理", "职业规划"),
        imageUrl = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
        aspect = 0.85f
    ),
    Post(
        title = "AI时代下的职业转型指南",
        author = "未来职场",
        views = "32.1k",
        likes = "2.1k",
        comments = "678",
        time = "1天前",
        tags = listOf("AI", "职业转型"),
        imageUrl = "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800",
        aspect = 1.4f
    ),
)

private val initialExperts = listOf(
    Expert("张三丰", "前阿里巴巴技术总监", "如何在技术面试中脱颖而出", "15.6k", "阿里巴巴"),
    Expert("李小龙", "腾讯产品VP", "产品思维的培养与实践", "23.4k", "腾讯"),
    Expert("王大锤", "字节跳动设计总监", "设计师的职业发展路径", "18.9k", "字节跳动"),
)

@Composable
fun ContentSections() {
    val assessments = remember { mutableStateListOf<Assessment>().apply { addAll(initialAssessments) } }
    val posts = remember { mutableStateListOf<Post>().apply { addAll(initialPosts) } }
    val experts = remember { mutableStateListOf<Expert>().apply { addAll(initialExperts) } }

    // Simulate infinite load
    LaunchedEffect(Unit) {
        repeat(3) {
            delay(1200)
            assessments.addAll(initialAssessments)
            posts.addAll(initialPosts)
            experts.addAll(initialExperts)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 12.dp)
    ) {
        StaggeredTwoColumns(assessments, posts, experts)
    }
}

@Composable
private fun StaggeredTwoColumns(
    assessments: List<Assessment>,
    posts: List<Post>,
    experts: List<Expert>
) {
    // Combine into list with simple type tagging to achieve a masonry-like feel
    val cards: List<ContentCard> = buildList<ContentCard> {
        assessments.forEach { add(ContentCard.AssessmentCardItem(it)) }
        posts.forEach { add(ContentCard.PostCardItem(it)) }
        experts.forEach { add(ContentCard.ExpertCardItem(it)) }
    }

    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Fixed(2),
        verticalItemSpacing = 8.dp,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(cards) { card ->
            when (card) {
                is ContentCard.AssessmentCardItem -> AssessmentCard(card.assessment)
                is ContentCard.PostCardItem -> PostCard(card.post)
                is ContentCard.ExpertCardItem -> ExpertCard(card.expert)
            }
        }
    }
}

private sealed interface ContentCard {
    data class AssessmentCardItem(val assessment: Assessment) : ContentCard
    data class PostCardItem(val post: Post) : ContentCard
    data class ExpertCardItem(val expert: Expert) : ContentCard
}

@Composable
private fun AssessmentCard(a: Assessment) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors()
    ) {
        // Image/gradient header
        Box(
            modifier = Modifier
                .aspectRatio(4f / 3f)
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFFFFEDD5), Color(0xFFFECACA))
                    )
                )
        ) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(Color.Black.copy(0.15f))
            )
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(0.9f)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFEA580C), modifier = Modifier.size(14.dp)) }
                Spacer(Modifier.width(6.dp))
                Text(
                    text = "热门评测",
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall
                )
            }

            Box(modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp)) {
                val bg = if (a.difficulty == "高级") Color(0xFFDC2626) else Color(0xFF6B7280)
                Text(
                    text = a.difficulty,
                    color = Color.White,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(bg)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }

        Column(modifier = Modifier.padding(12.dp)) {
            Text(a.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                a.tags.take(2).forEach { tag ->
                    Text(
                        tag,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF374151),
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color(0xFFF3F4F6))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Group, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(a.participants, style = MaterialTheme.typography.labelSmall)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(a.rating.toString(), style = MaterialTheme.typography.labelSmall)
                }
            }
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = { /* TODO: navigate to assessment */ },
                modifier = Modifier
                    .fillMaxWidth(0.66f)
                    .align(Alignment.CenterHorizontally)
                    .height(30.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
            ) { Text("开始评测", color = Color.White, style = MaterialTheme.typography.labelMedium) }
        }
    }
}

@Composable
private fun PostCard(p: Post) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .aspectRatio(p.aspect)
        ) {
            AsyncImage(
                model = p.imageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize()
            )
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(Color.Black.copy(0.15f))
            )
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(0.9f)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Default.TrendingUp, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp)) }
                Spacer(Modifier.width(6.dp))
                Text("热门帖子", color = Color(0xFF0F172A), style = MaterialTheme.typography.labelSmall)
            }
        }
        Column(Modifier.padding(12.dp)) {
            Text(p.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                p.tags.forEach { tag ->
                    Text(
                        tag,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color.Transparent)
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(p.author, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.RemoveRedEye, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(p.views, style = MaterialTheme.typography.labelSmall)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(p.likes, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun ExpertCard(e: Expert) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .aspectRatio(4f / 3f)
                .background(Brush.linearGradient(listOf(Color(0xFFD1FAE5), Color(0xFF99F6E4))))
        ) {
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(0.9f)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Default.Book, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(14.dp)) }
                Spacer(Modifier.width(6.dp))
                Text("大咖分享", color = Color(0xFF166534), style = MaterialTheme.typography.labelSmall)
            }

            Row(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                ) { /* TODO: load avatar image */ }
                Spacer(Modifier.width(8.dp))
                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(0.9f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(e.name, color = Color(0xFF111827), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text(e.company, color = Color(0xFF374151), style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        Column(Modifier.padding(12.dp)) {
            Text(e.title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            Text(e.topic, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Group, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(e.followers, style = MaterialTheme.typography.labelSmall)
                }
                Button(onClick = { /* TODO: follow expert */ }, colors = ButtonDefaults.outlinedButtonColors(), modifier = Modifier) {
                    Text("关注", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}


