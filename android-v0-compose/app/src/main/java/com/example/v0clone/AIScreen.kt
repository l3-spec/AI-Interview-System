package com.xlwl.AiMian

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AIScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("AI 面试助手", style = MaterialTheme.typography.headlineSmall)
        Text("这里复刻 v0 的 /ai-interview 入口与说明", style = MaterialTheme.typography.bodyMedium)
        Button(onClick = { /* TODO: 开始 AI 面试流程 */ }, modifier = Modifier.padding(top = 16.dp)) {
            Text("开始 AI 面试")
        }
    }
}


