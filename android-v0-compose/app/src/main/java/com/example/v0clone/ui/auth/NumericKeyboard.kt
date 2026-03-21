package com.xlwl.AiMian.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val KeyboardBackground = Color(0xFFD1D3D9)
private val KeyboardKeyShape = RoundedCornerShape(4.6.dp)

@Composable
fun NumericKeyboard(
    onKeyPress: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    BackHandler(onBack = onDismiss)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(290.dp)
            .background(KeyboardBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 6.dp, end = 6.dp, top = 6.dp, bottom = 34.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            KeyboardRow("1" to "", "2" to "ABC", "3" to "DEF", onKeyPress = onKeyPress)
            KeyboardRow("4" to "GHI", "5" to "JKL", "6" to "MNO", onKeyPress = onKeyPress)
            KeyboardRow("7" to "PQRS", "8" to "TUV", "9" to "WXYZ", onKeyPress = onKeyPress)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                Spacer(modifier = Modifier.weight(1f))
                KeyboardKey(
                    number = "0",
                    letters = "",
                    onKeyPress = onKeyPress,
                    modifier = Modifier.weight(1f)
                )
                DeleteKey(
                    onKeyPress = onKeyPress,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 8.dp)
                .width(134.dp)
                .height(5.dp)
                .background(Color.Black, RoundedCornerShape(100.dp))
        )
    }
}

@Composable
private fun KeyboardRow(
    first: Pair<String, String>,
    second: Pair<String, String>,
    third: Pair<String, String>,
    onKeyPress: (String) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        KeyboardKey(first.first, first.second, onKeyPress, Modifier.weight(1f))
        KeyboardKey(second.first, second.second, onKeyPress, Modifier.weight(1f))
        KeyboardKey(third.first, third.second, onKeyPress, Modifier.weight(1f))
    }
}

@Composable
private fun KeyboardKey(
    number: String,
    letters: String,
    onKeyPress: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(46.dp)
            .clickable { onKeyPress(number) },
        shape = KeyboardKeyShape,
        color = Color.White,
        shadowElevation = 1.dp,
        tonalElevation = 0.dp
    ) {
        Column(
            modifier = Modifier.height(46.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = number,
                color = Color.Black,
                fontSize = 25.sp,
                fontWeight = FontWeight.Normal,
                textAlign = TextAlign.Center,
                letterSpacing = 0.2912.sp
            )
            if (letters.isNotEmpty()) {
                Text(
                    text = letters,
                    color = Color.Black,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    letterSpacing = 2.sp
                )
            }
        }
    }
}

@Composable
private fun DeleteKey(
    onKeyPress: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(46.dp)
            .clickable { onKeyPress("backspace") },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Filled.Backspace,
            contentDescription = "删除",
            tint = Color.Black,
            modifier = Modifier.size(20.dp)
        )
    }
}
