package com.xlwl.AiMian.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 数字键盘组件 - 严格按照Figma设计实现
 * 包含数字0-9、字母、删除键，毛玻璃效果
 */
@Composable
fun NumericKeyboard(
    onKeyPress: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    BackHandler(onBack = onDismiss)

    val backgroundShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    val keyShape = RoundedCornerShape(14.dp)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 16.dp, shape = backgroundShape, clip = false)
            .clip(backgroundShape)
            .background(
                color = Color(0xFFE7EAEE)
            )
            .height(296.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // 第一行：1, 2, 3
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                KeyboardKey("1", "", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("2", "ABC", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("3", "DEF", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第二行：4, 5, 6
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                KeyboardKey("4", "GHI", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("5", "JKL", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("6", "MNO", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第三行：7, 8, 9
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                KeyboardKey("7", "PQRS", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("8", "TUV", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("9", "WXYZ", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第四行：空, 0, 删除
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Spacer(modifier = Modifier.weight(1f)) // 空位
                KeyboardKey("0", "", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                DeleteKey(onKeyPress, keyShape, modifier = Modifier.weight(1f))
            }
        }
        
        // 底部Home指示器 - 严格按照Figma设计
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(134.dp)
                    .height(5.dp)
                    .background(
                        color = Color(0xFF101318).copy(alpha = 0.7f),
                        shape = RoundedCornerShape(100.dp)
                    )
            )
        }
    }
}

@Composable
private fun KeyboardKey(
    number: String,
    letters: String,
    keyShape: RoundedCornerShape,
    onKeyPress: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(56.dp)
            .shadow(elevation = 3.dp, shape = keyShape, clip = false)
            .clip(keyShape)
            .background(
                color = Color.White,
                shape = keyShape
            )
            .border(
                width = 1.dp,
                color = Color(0xFFD4D8DF),
                shape = keyShape
            )
            .clickable { onKeyPress(number) },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 6.dp, bottom = if (letters.isEmpty()) 0.dp else 4.dp)
        ) {
            Text(
                text = number,
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF1F2126),
                textAlign = TextAlign.Center
            )
            if (letters.isNotEmpty()) {
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = letters,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF8C929C),
                    textAlign = TextAlign.Center,
                    letterSpacing = 1.2.sp
                )
            }
        }
    }
}

@Composable
private fun DeleteKey(
    onKeyPress: (String) -> Unit,
    keyShape: RoundedCornerShape,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(56.dp)
            .shadow(elevation = 3.dp, shape = keyShape, clip = false)
            .clip(keyShape)
            .background(
                color = Color.White,
                shape = keyShape
            )
            .border(
                width = 1.dp,
                color = Color(0xFFD4D8DF),
                shape = keyShape
            )
            .clickable { onKeyPress("backspace") },
        contentAlignment = Alignment.Center
    ) {
        // 删除图标 - 严格按照Figma设计
        Icon(
            imageVector = Icons.Filled.Backspace,
            contentDescription = "删除",
            tint = Color(0xFF1F2126),
            modifier = Modifier.size(24.dp)
        )
    }
}
