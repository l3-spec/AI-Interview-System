package com.xlwl.AiMian.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import java.io.Serializable

/**
 * Banner数据模型
 */
data class BannerData(
    val id: String,
    val imageUrl: String,
    val label: String,
    val title: String,
    val subtitle: String,
    val linkType: String? = null,
    val linkId: String? = null
) : Serializable

/**
 * Banner轮播组件
 */
@Composable
fun BannerCarousel(
    banners: List<BannerData>,
    currentIndex: Int,
    onBannerClick: (BannerData) -> Unit,
    modifier: Modifier = Modifier
) {
    if (banners.isEmpty()) return

    Column(
        modifier = modifier.fillMaxWidth()
    ) {
        // Banner卡片
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(161.dp)
                .clip(RoundedCornerShape(24.dp))
                .clickable {
                    if (banners.isNotEmpty()) {
                        onBannerClick(banners[currentIndex % banners.size])
                    }
                }
        ) {
            val banner = banners[currentIndex % banners.size]
            val painter = rememberAsyncImagePainter(banner.imageUrl)
            
            // 背景图片
            Image(
                painter = painter,
                contentDescription = banner.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // 图片加载状态处理
            when (painter.state) {
                is AsyncImagePainter.State.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(32.dp),
                            color = Color(0xFFEC7C38).copy(alpha = 0.5f),
                            strokeWidth = 2.dp
                        )
                    }
                }
                is AsyncImagePainter.State.Error -> {
                    // 如果图片加载失败，显示渐变占位
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(Color(0xFF00ACC3), Color(0xFFE9F7F9))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "图片加载失败",
                            color = Color.Black.copy(alpha = 0.3f),
                            fontSize = 12.sp
                        )
                    }
                }
                else -> {}
            }
            
            // 渐变遮罩
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.7f)
                            ),
                            startY = 100f
                        )
                    )
            )
            
            // 文字内容
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(14.dp)
            ) {
                if (banner.label.isNotBlank()) {
                    Text(
                        text = banner.label,
                        fontSize = 12.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                Text(
                    text = banner.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    lineHeight = 26.sp
                )
                
                if (banner.subtitle.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = banner.subtitle,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }
        
        // 轮播指示器
        if (banners.size > 1) {
            Spacer(modifier = Modifier.height(6.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                banners.forEachIndexed { index, _ ->
                    val isActive = index == currentIndex % banners.size
                    val activeColor = Color(0xFFEC7C38)
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .width(if (isActive) 12.dp else 4.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (isActive) activeColor
                                else Color(0xFFB5B7B8).copy(alpha = 0.4f)
                            )
                    )
                }
            }
        }
    }
}
