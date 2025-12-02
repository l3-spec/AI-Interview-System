package com.xlwl.AiMian.ai

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.data.model.JobDictionaryCategory
import com.xlwl.AiMian.data.model.JobDictionaryPosition
import com.xlwl.AiMian.data.repository.JobDictionaryRepository
import kotlin.runCatching

private val PageBackground = Color(0xFF111217)
private val CardBackground = Color(0xFF171821)
private val ColumnBackground = Color(0xFF1D1E28)
private val TextPrimary = Color(0xFFECEFF5)
private val TextSecondary = Color(0xFFA8A9B6)
private val TextMuted = Color(0xFF7E7F8C)
private val AccentColor = Color(0xFF17D9C0)
private val SearchFieldBackground = Color(0xFF2A2B34)
private val CategoryItemBackground = Color(0xFF20222D)
private val CategorySelectedBackground = Color(0xFF1A1B25)
private val ButtonBackground = Color(0xFF252632)
private val ButtonSelectedBackground = Color(0xFF2F303D)
private val ButtonSelectedContent = TextPrimary

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AiInterviewPage(
  jobDictionaryRepository: JobDictionaryRepository,
  onSessionRequested: (position: String, category: String) -> Unit,
  onDigitalInterviewClick: () -> Unit = {},
  onBack: (() -> Unit)? = null
) {
  val context = LocalContext.current
  var searchQuery by remember { mutableStateOf("") }
  var categories by remember { mutableStateOf<List<JobDictionaryCategory>>(emptyList()) }
  var selectedCategoryId by remember { mutableStateOf<String?>(null) }
  var loading by remember { mutableStateOf(true) }
  var errorMessage by remember { mutableStateOf<String?>(null) }
  var selectedPositionKey by remember { mutableStateOf<String?>(null) }

  LaunchedEffect(jobDictionaryRepository) {
    loading = true
    errorMessage = null
    runCatching { jobDictionaryRepository.fetchDictionary() }
      .onSuccess { data ->
        categories = data
        if (selectedCategoryId == null) {
          val first = data.firstOrNull()
          selectedCategoryId = first?.id ?: first?.name
        }
      }
      .onFailure { error ->
        errorMessage = error.message ?: "加载职岗数据失败，请稍后再试"
      }
    loading = false
  }

  val selectedCategory = categories.firstOrNull {
    it.id == selectedCategoryId || (it.id == null && it.name == selectedCategoryId)
  }
  val positions = selectedCategory?.positions.orEmpty()
  val filteredPositions = remember(searchQuery, positions) {
    if (searchQuery.isBlank()) {
      positions
    } else {
      val keyword = searchQuery.trim().lowercase()
      positions.filter { position ->
        position.name.lowercase().contains(keyword) ||
          position.code.lowercase().contains(keyword) ||
          position.tags.any { it.lowercase().contains(keyword) }
      }
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(PageBackground)
      .statusBarsPadding()
      .padding(horizontal = 16.dp, vertical = 12.dp)
  ) {
    TopBar(onBack)
    Text(
      text = "想找哪些工作?",
      color = TextPrimary,
      fontSize = 26.sp,
      fontWeight = FontWeight.Bold
    )
    Spacer(modifier = Modifier.height(12.dp))
    SearchField(
      value = searchQuery,
      onValueChange = { searchQuery = it }
    )
    Spacer(modifier = Modifier.height(16.dp))
    Row(
      modifier = Modifier
        .fillMaxSize()
        .padding(bottom = 24.dp),
      horizontalArrangement = Arrangement.spacedBy(18.dp)
    ) {
      CategoryList(
        modifier = Modifier
          .width(150.dp)
          .fillMaxHeight(),
        categories = categories,
        selectedCategoryId = selectedCategoryId,
        loading = loading,
        onSelect = { categoryKey ->
          selectedCategoryId = categoryKey
          selectedPositionKey = null
        }
      )
      PositionsArea(
        modifier = Modifier.weight(1f),
        loading = loading,
        errorMessage = errorMessage,
        positions = filteredPositions,
        selectedCategoryName = selectedCategory?.name,
        selectedPositionKey = selectedPositionKey,
        onPositionSelected = { position ->
          val category = selectedCategory
          if (category == null) {
            Toast.makeText(context, "暂无可选岗位，请稍后再试", Toast.LENGTH_SHORT).show()
          } else {
            selectedPositionKey = position.id ?: position.code
            onSessionRequested(position.name, category.name)
          }
        }
      )
    }
  }
}

@Composable
private fun TopBar(onBack: (() -> Unit)?) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(bottom = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    IconButton(
      onClick = { onBack?.invoke() },
      enabled = onBack != null,
      modifier = Modifier
        .size(36.dp)
        .clip(CircleShape)
    ) {
      Icon(
        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
        contentDescription = "返回",
        tint = TextSecondary
      )
    }
  }
}

@Composable
private fun SearchField(
  value: String,
  onValueChange: (String) -> Unit
) {
  OutlinedTextField(
    value = value,
    onValueChange = onValueChange,
    modifier = Modifier
      .fillMaxWidth()
      .height(56.dp),
    singleLine = true,
    leadingIcon = {
      Icon(
        imageVector = Icons.Filled.Search,
        contentDescription = null,
        tint = TextMuted
      )
    },
    placeholder = {
      Text(text = "搜索职位名称", color = TextMuted)
    },
    shape = RoundedCornerShape(16.dp),
    textStyle = androidx.compose.ui.text.TextStyle(
      color = TextPrimary,
      fontSize = 16.sp,
      fontWeight = FontWeight.Medium
    ),
    colors = OutlinedTextFieldDefaults.colors(
      unfocusedContainerColor = SearchFieldBackground,
      focusedContainerColor = SearchFieldBackground,
      disabledContainerColor = SearchFieldBackground,
      focusedBorderColor = SearchFieldBackground,
      unfocusedBorderColor = SearchFieldBackground,
      focusedTextColor = TextPrimary,
      unfocusedTextColor = TextPrimary,
      cursorColor = AccentColor
    )
  )
}

@Composable
private fun CategoryList(
  modifier: Modifier,
  categories: List<JobDictionaryCategory>,
  selectedCategoryId: String?,
  loading: Boolean,
  onSelect: (String) -> Unit
) {
  Surface(
    modifier = modifier,
    color = ColumnBackground,
    shape = RoundedCornerShape(24.dp)
  ) {
    when {
      loading -> LoadingState(message = "加载中...")
      categories.isEmpty() -> EmptyState(message = "暂无分类")
      else -> LazyColumn(
        contentPadding = PaddingValues(vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        items(items = categories, key = { it.id ?: it.name }) { category ->
          val key = category.id ?: category.name
          val selected = key == selectedCategoryId
          CategoryItem(
            category = category,
            selected = selected,
            onSelect = { onSelect(key) }
          )
        }
      }
    }
  }
}

@Composable
private fun CategoryItem(
  category: JobDictionaryCategory,
  selected: Boolean,
  onSelect: () -> Unit
) {
  Surface(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(18.dp))
      .clickable { onSelect() },
    color = if (selected) CategorySelectedBackground else CategoryItemBackground
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 14.dp, vertical = 16.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier
          .width(4.dp)
          .height(24.dp)
          .clip(RoundedCornerShape(2.dp))
          .background(if (selected) AccentColor else Color.Transparent)
      )
      Spacer(modifier = Modifier.width(12.dp))
      Text(
        text = category.name,
        color = if (selected) TextPrimary else TextSecondary,
        fontSize = 16.sp,
        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
      )
    }
  }
}

@Composable
private fun PositionsArea(
  modifier: Modifier,
  loading: Boolean,
  errorMessage: String?,
  positions: List<JobDictionaryPosition>,
  selectedCategoryName: String?,
  selectedPositionKey: String?,
  onPositionSelected: (JobDictionaryPosition) -> Unit
) {
  Surface(
    modifier = modifier,
    color = CardBackground,
    shape = RoundedCornerShape(24.dp)
  ) {
    when {
      loading -> LoadingState(message = "加载中...")
      errorMessage != null -> EmptyState(message = errorMessage)
      positions.isEmpty() -> EmptyState(
        message = if (selectedCategoryName.isNullOrBlank()) {
          "请选择岗位分类"
        } else {
          "未找到匹配职位"
        }
      )
      else -> Column(
        modifier = Modifier
          .fillMaxSize()
          .padding(horizontal = 20.dp, vertical = 18.dp)
      ) {
        if (!selectedCategoryName.isNullOrBlank()) {
          Text(
            text = selectedCategoryName,
            color = TextPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold
          )
          Spacer(modifier = Modifier.height(16.dp))
        }
        LazyVerticalGrid(
          modifier = Modifier.weight(1f, fill = false),
          columns = GridCells.Fixed(2),
          verticalArrangement = Arrangement.spacedBy(18.dp),
          horizontalArrangement = Arrangement.spacedBy(18.dp),
          contentPadding = PaddingValues(bottom = 24.dp)
        ) {
          items(positions, key = { it.id ?: it.code }) { position ->
            val key = position.id ?: position.code
            PositionButton(
              text = position.name,
              selected = selectedPositionKey == key,
              onClick = { onPositionSelected(position) }
            )
          }
        }
      }
    }
  }
}

@Composable
private fun LoadingState(message: String) {
  Box(
    modifier = Modifier.fillMaxSize(),
    contentAlignment = Alignment.Center
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
      CircularProgressIndicator(color = AccentColor)
      Spacer(modifier = Modifier.height(12.dp))
      Text(text = message, color = TextSecondary, fontSize = 12.sp)
    }
  }
}

@Composable
private fun EmptyState(message: String) {
  Box(
    modifier = Modifier.fillMaxSize(),
    contentAlignment = Alignment.Center
  ) {
    Text(
      text = message,
      color = TextSecondary,
      fontSize = 13.sp,
      textAlign = TextAlign.Center
    )
  }
}

@Composable
private fun PositionButton(
  text: String,
  selected: Boolean,
  onClick: () -> Unit
) {
  Button(
    onClick = onClick,
    modifier = Modifier
      .fillMaxWidth()
      .height(54.dp),
    shape = RoundedCornerShape(18.dp),
    colors = ButtonDefaults.buttonColors(
      containerColor = if (selected) ButtonSelectedBackground else ButtonBackground,
      contentColor = if (selected) ButtonSelectedContent else TextPrimary
    )
  ) {
    Text(
      text = text,
      fontSize = 16.sp,
      fontWeight = FontWeight.Medium,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis
    )
  }
}
