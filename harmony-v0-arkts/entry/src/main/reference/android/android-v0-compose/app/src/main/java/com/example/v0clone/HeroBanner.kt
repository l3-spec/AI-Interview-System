package com.xlwl.AiMian

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale

private data class BannerItem(
    val title: String,
    val subtitle: String,
    val description: String,
    val gradient: List<Color>,
    val icon: @Composable () -> Unit
)

private val bannerItems = listOf(
    BannerItem(
        title = "如何在AI时代提升职场竞争力",
        subtitle = "最受欢迎的帖子",
        description = "探索人工智能时代下的职业发展新趋势",
        gradient = listOf(Color(0xFF3B82F6), Color(0xFF9333EA)),
        icon = { Icon(Icons.Default.TrendingUp, contentDescription = null, tint = Color.White) }
    ),
    BannerItem(
        title = "产品经理能力评测",
        subtitle = "热门测试",
        description = "全面评估您的产品思维和管理能力",
        gradient = listOf(Color(0xFF22C55E), Color(0xFF0D9488)),
        icon = { Icon(Icons.Default.Assessment, contentDescription = null, tint = Color.White) }
    ),
    BannerItem(
        title = "字节跳动",
        subtitle = "最受关注企业",
        description = "了解字节跳动的招聘要求和企业文化",
        gradient = listOf(Color(0xFFF59E0B), Color(0xFFDC2626)),
        icon = { Icon(Icons.Default.Business, contentDescription = null, tint = Color.White) }
    )
)

@Composable
fun HeroBanner() {
    var currentIndex by remember { mutableStateOf(0) }
    val item = bannerItems[currentIndex]

    // Auto-advance logic
    LaunchedEffect(currentIndex) {
        delay(5000)
        currentIndex = (currentIndex + 1) % bannerItems.size
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            shape = RoundedCornerShape(0.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.linearGradient(colors = item.gradient)
                    )
                    .pointerInput(currentIndex) {
                        detectHorizontalDragGestures(onDragEnd = {}) { _, dragAmount ->
                            if (dragAmount > 20) {
                                currentIndex = (currentIndex - 1 + bannerItems.size) % bannerItems.size
                            } else if (dragAmount < -20) {
                                currentIndex = (currentIndex + 1) % bannerItems.size
                            }
                        }
                    }
            ) {
                AsyncImage(
                    model = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600",
                    contentDescription = null,
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop
                )
                // Dark overlay
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(Color.Black.copy(alpha = 0.35f))
                )

                Column(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(horizontal = 16.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(20.dp), contentAlignment = Alignment.Center) {
                            item.icon()
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = item.subtitle,
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = item.title,
                        color = Color.White,
                        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = item.description,
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        // Dots indicator below banner (like your screenshot)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            bannerItems.forEachIndexed { index, _ ->
                Box(
                    modifier = Modifier
                        .size(if (index == currentIndex) 10.dp else 8.dp)
                        .background(
                            if (index == currentIndex) Color(0xFF9CA3AF) else Color(0xFFCBD5E1),
                            shape = RoundedCornerShape(50)
                        )
                )
                if (index != bannerItems.lastIndex) Spacer(Modifier.width(12.dp))
            }
        }
    }
}


