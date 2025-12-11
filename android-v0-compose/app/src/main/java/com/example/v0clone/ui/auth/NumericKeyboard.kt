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
    // 根据Figma设计：按键圆角 4.6px ≈ 4.6dp
    val keyShape = RoundedCornerShape(4.6.dp)

    // 根据Figma设计：键盘背景色 #D1D3D9，高度 290px
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 16.dp, shape = backgroundShape, clip = false)
            .clip(backgroundShape)
            .background(
                color = Color(0xFFD1D3D9) // 根据Figma设计：背景色 #D1D3D9
            )
            .height(290.dp) // 根据Figma设计：高度 290px
    ) {
        // 根据Figma设计：键盘内边距和间距
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 6.dp), // 根据Figma设计：左右6px，上下6px
            verticalArrangement = Arrangement.spacedBy(5.dp) // 根据Figma设计：行间距5px
        ) {
            // 第一行：1, 2, 3 - 根据Figma设计：按键间距5px
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp) // 根据Figma设计：列间距5px
            ) {
                KeyboardKey("1", "", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("2", "ABC", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("3", "DEF", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第二行：4, 5, 6
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                KeyboardKey("4", "GHI", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("5", "JKL", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("6", "MNO", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第三行：7, 8, 9
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                KeyboardKey("7", "PQRS", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("8", "TUV", keyShape, onKeyPress, modifier = Modifier.weight(1f))
                KeyboardKey("9", "WXYZ", keyShape, onKeyPress, modifier = Modifier.weight(1f))
            }
            
            // 第四行：空, 0, 删除
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp)
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
    // 根据Figma设计：按键高度46px，白色背景，阴影效果
    // Figma设计：shadow 0px 1px 0px 0px rgba(0,0,0,0.3)
    Box(
        modifier = modifier
            .height(46.dp) // 根据Figma设计：按键高度46px
            .shadow(
                elevation = 1.dp, // 根据Figma设计：1px阴影
                shape = keyShape,
                clip = false
            )
            .clip(keyShape)
            .background(
                color = Color.White,
                shape = keyShape
            )
            .clickable { onKeyPress(number) },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxSize()
        ) {
            // 根据Figma设计：数字字体25px，Regular，黑色
            Text(
                text = number,
                fontSize = 25.sp, // 根据Figma设计：25px
                fontWeight = FontWeight.Normal, // 根据Figma设计：Regular
                color = Color.Black,
                textAlign = TextAlign.Center,
                letterSpacing = 0.2912.sp // 根据Figma设计：letterSpacing 0.2912px
            )
            // 根据Figma设计：字母提示10px，Bold，黑色，letterSpacing 2px
            if (letters.isNotEmpty()) {
                Text(
                    text = letters,
                    fontSize = 10.sp, // 根据Figma设计：10px
                    fontWeight = FontWeight.Bold, // 根据Figma设计：Bold
                    color = Color.Black, // 根据Figma设计：黑色
                    textAlign = TextAlign.Center,
                    letterSpacing = 2.sp // 根据Figma设计：letterSpacing 2px
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
    // 根据Figma设计：删除键高度46px，白色背景
    Box(
        modifier = modifier
            .height(46.dp) // 根据Figma设计：按键高度46px
            .shadow(
                elevation = 1.dp, // 根据Figma设计：1px阴影
                shape = keyShape,
                clip = false
            )
            .clip(keyShape)
            .background(
                color = Color.White,
                shape = keyShape
            )
            .clickable { onKeyPress("backspace") },
        contentAlignment = Alignment.Center
    ) {
        // 删除图标 - 根据Figma设计：黑色，17x23px
        Icon(
            imageVector = Icons.Filled.Backspace,
            contentDescription = "删除",
            tint = Color.Black,
            modifier = Modifier.size(20.dp) // 根据Figma设计：约17x23px，使用20dp近似
        )
    }
}
