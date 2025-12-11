@file:OptIn(ExperimentalLayoutApi::class)

package com.xlwl.AiMian.ui.circle

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavBackStackEntry
import coil.compose.AsyncImage
import com.xlwl.AiMian.data.model.UserPost
import com.xlwl.AiMian.data.repository.ContentRepository
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.xlwl.AiMian.ui.components.CompactTopBar

private const val TITLE_MAX_LENGTH = 30
private const val MAX_IMAGES = 6
private val PlaceholderColor = Color(0xFFB5B7B8)
private val AccentOrange = Color(0xFFEC7C38)
private val ImagePlaceholder = Color(0xFFEBEBEB)

data class SelectedImage(
    val uri: Uri,
    val file: File
)

/**
 * 富文本内容块 - 支持文本和图片混合
 */
sealed class ContentBlock {
    data class TextBlock(val text: String) : ContentBlock()
    data class ImageBlock(
        val images: List<SelectedImage>, // 1个或2个图片
        val layout: ImageLayout = ImageLayout.Single // 布局类型
    ) : ContentBlock()
}

/**
 * 图片布局类型
 */
enum class ImageLayout {
    Single,  // 单个图片
    Double   // 并排2个图片
}

@Composable
fun CreatePostRoute(
    repository: ContentRepository,
    backStackEntry: NavBackStackEntry,
    onBack: () -> Unit,
    onPublished: (UserPost) -> Unit
) {
    val viewModel: CreatePostViewModel = viewModel(
        factory = CreatePostViewModel.provideFactory(repository)
    )
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(uiState.error) {
        uiState.error?.let { message ->
            coroutineScope.launch {
                snackbarHostState.showSnackbar(message)
            }
            viewModel.clearError()
        }
    }

    LaunchedEffect(uiState.success) {
        uiState.success?.let { post ->
            backStackEntry.savedStateHandle["should_refresh_circle"] = true
            onPublished(post)
            viewModel.consumeSuccess()
        }
    }

    CreatePostScreen(
        uiState = uiState,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onPublish = { title, content, tags, files ->
            viewModel.publish(title, content, tags, files)
        }
    )
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
private fun CreatePostScreen(
    uiState: CreatePostUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onPublish: (String, String, List<String>, List<File>) -> Unit
) {
    val context = LocalContext.current
    val resolver = rememberUpdatedState(newValue = context.contentResolver)
    var title by rememberSaveable { mutableStateOf("") }
    // 使用富文本内容块列表替代纯文本
    val contentBlocks = remember { mutableStateListOf<ContentBlock>(ContentBlock.TextBlock("")) }
    val selectedTags = remember { mutableStateListOf<String>() }
    var showTagDialog by remember { mutableStateOf(false) }
    var tagInput by rememberSaveable { mutableStateOf("") }
    var showImageLayoutDialog by remember { mutableStateOf(false) }
    var pendingImages by remember { mutableStateOf<List<SelectedImage>>(emptyList()) }
    var currentBlockIndex by remember { mutableStateOf(0) } // 当前编辑的文本块索引
    val tagSuggestions = remember {
        listOf("#AI", "#职业转型", "#Offer分享")
    }
    val scrollState = rememberScrollState()

    // 计算当前已使用的图片数量
    val currentImageCount = remember(contentBlocks) {
        contentBlocks.sumOf { block ->
            when (block) {
                is ContentBlock.TextBlock -> 0
                is ContentBlock.ImageBlock -> block.images.size
            }
        }
    }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia()
    ) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        val capacity = MAX_IMAGES - currentImageCount
        if (capacity <= 0) {
            showTransientMessage(snackbarHostState, "最多只能添加${MAX_IMAGES}张图片")
            return@rememberLauncherForActivityResult
        }
        val toProcess = uris.take(capacity)
        val resolverValue = resolver.value
        val processedImages = mutableListOf<SelectedImage>()
        toProcess.forEach { uri ->
            val file = copyUriToCache(resolverValue, uri, context.cacheDir)
            if (file != null) {
                processedImages.add(SelectedImage(uri = uri, file = file))
            } else {
                showTransientMessage(snackbarHostState, "选择图片失败，请重试")
            }
        }
        if (processedImages.isNotEmpty()) {
            // 如果选择了多张图片，显示布局选择对话框
            if (processedImages.size == 2) {
                pendingImages = processedImages
                showImageLayoutDialog = true
            } else {
                // 单张图片，直接插入
                insertImageBlock(processedImages.first(), ImageLayout.Single)
            }
        }
    }

    // 插入图片块到当前光标位置
    fun insertImageBlock(image: SelectedImage, layout: ImageLayout) {
        val currentBlock = contentBlocks.getOrNull(currentBlockIndex)
        val insertIndex = if (currentBlock is ContentBlock.TextBlock) {
            // 如果当前是文本块，在它后面插入
            currentBlockIndex + 1
        } else {
            // 如果当前不是文本块，在当前位置插入
            currentBlockIndex
        }
        
        val newImageBlock = ContentBlock.ImageBlock(
            images = listOf(image),
            layout = layout
        )
        contentBlocks.add(insertIndex, newImageBlock)
        
        // 在图片块后添加新的文本块（如果不存在或下一个不是文本块）
        if (insertIndex + 1 >= contentBlocks.size || 
            contentBlocks[insertIndex + 1] !is ContentBlock.TextBlock) {
            contentBlocks.add(insertIndex + 1, ContentBlock.TextBlock(""))
        }
        // 更新当前块索引到新创建的文本块
        currentBlockIndex = insertIndex + 1
    }

    // 插入双图块
    fun insertDoubleImageBlock(image1: SelectedImage, image2: SelectedImage) {
        val currentBlock = contentBlocks.getOrNull(currentBlockIndex)
        val insertIndex = if (currentBlock is ContentBlock.TextBlock) {
            currentBlockIndex + 1
        } else {
            currentBlockIndex
        }
        
        val newImageBlock = ContentBlock.ImageBlock(
            images = listOf(image1, image2),
            layout = ImageLayout.Double
        )
        contentBlocks.add(insertIndex, newImageBlock)
        
        if (insertIndex + 1 >= contentBlocks.size || 
            contentBlocks[insertIndex + 1] !is ContentBlock.TextBlock) {
            contentBlocks.add(insertIndex + 1, ContentBlock.TextBlock(""))
        }
        currentBlockIndex = insertIndex + 1
    }

    // 删除图片块
    fun removeImageBlock(blockIndex: Int) {
        val block = contentBlocks.getOrNull(blockIndex)
        if (block is ContentBlock.ImageBlock) {
            // 删除图片文件
            block.images.forEach { it.file.delete() }
            contentBlocks.removeAt(blockIndex)
            // 如果删除后列表为空，添加一个空文本块
            if (contentBlocks.isEmpty()) {
                contentBlocks.add(ContentBlock.TextBlock(""))
                currentBlockIndex = 0
            } else {
                // 调整当前块索引
                if (currentBlockIndex >= contentBlocks.size) {
                    currentBlockIndex = contentBlocks.size - 1
                }
                // 如果删除后前后都是文本块，合并它们
                if (blockIndex > 0 && blockIndex < contentBlocks.size) {
                    val prev = contentBlocks[blockIndex - 1] as? ContentBlock.TextBlock
                    val next = contentBlocks[blockIndex] as? ContentBlock.TextBlock
                    if (prev != null && next != null) {
                        contentBlocks[blockIndex - 1] = ContentBlock.TextBlock(prev.text + "\n\n" + next.text)
                        contentBlocks.removeAt(blockIndex)
                        if (currentBlockIndex >= blockIndex) {
                            currentBlockIndex = blockIndex - 1
                        }
                    }
                }
            }
        }
    }

    // 获取所有图片文件（用于发布）
    fun getAllImageFiles(): List<File> {
        return contentBlocks.flatMap { block ->
            when (block) {
                is ContentBlock.TextBlock -> emptyList()
                is ContentBlock.ImageBlock -> block.images.map { it.file }
            }
        }
    }

    // 将内容块转换为纯文本（用于发布）
    fun blocksToText(): String {
        return contentBlocks.joinToString("\n\n") { block ->
            when (block) {
                is ContentBlock.TextBlock -> block.text
                is ContentBlock.ImageBlock -> "[图片]"
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            // 清理所有图片文件
            contentBlocks.forEach { block ->
                if (block is ContentBlock.ImageBlock) {
                    block.images.forEach { it.file.delete() }
                }
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = Color.White,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            CompactTopBar(
                title = "发帖",
                onBack = onBack,
                containerColor = Color.White,
                contentColor = Color.Black,
                shadowElevation = 0.dp
            )
        },
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Button(
                        onClick = {
                            if (title.isBlank()) {
                                showTransientMessage(snackbarHostState, "请输入帖子标题")
                                return@Button
                            }
                            val contentText = blocksToText().trim()
                            if (contentText.isBlank() || contentText == "[图片]") {
                                showTransientMessage(snackbarHostState, "请输入帖子内容")
                                return@Button
                            }
                            onPublish(
                                title.trim(),
                                contentText,
                                selectedTags.map(String::trim),
                                getAllImageFiles()
                            )
                        },
                        enabled = !uiState.isPublishing,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AccentOrange,
                            disabledContainerColor = AccentOrange.copy(alpha = 0.4f)
                        )
                    ) {
                        if (uiState.isPublishing) {
                            androidx.compose.material3.CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
                            Text(
                                text = "发布",
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Medium
                                )
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
                .padding(innerPadding)
                .verticalScroll(scrollState)
        ) {
            TitleSection(
                title = title,
                onTitleChange = { if (it.length <= TITLE_MAX_LENGTH) title = it },
                counter = "${title.length}/$TITLE_MAX_LENGTH"
            )
            // 所见即所得编辑器 - 支持文本和图片混合
            WysiwygEditor(
                contentBlocks = contentBlocks,
                currentBlockIndex = currentBlockIndex,
                onBlockIndexChange = { currentBlockIndex = it },
                onTextChange = { index, text ->
                    if (index < contentBlocks.size) {
                        val block = contentBlocks[index]
                        if (block is ContentBlock.TextBlock) {
                            contentBlocks[index] = ContentBlock.TextBlock(text)
                        }
                    }
                },
                onAddImage = {
                    val remainingCapacity = MAX_IMAGES - currentImageCount
                    if (remainingCapacity <= 0) {
                        showTransientMessage(snackbarHostState, "最多只能添加${MAX_IMAGES}张图片")
                    } else {
                        imagePickerLauncher.launch(
                            PickVisualMediaRequest(
                                ActivityResultContracts.PickVisualMedia.ImageOnly
                            )
                        )
                    }
                },
                onRemoveImage = { index ->
                    removeImageBlock(index)
                }
            )
            TagSection(
                selectedTags = selectedTags,
                suggestions = tagSuggestions,
                onAddTag = { showTagDialog = true },
                onToggleTag = { tag ->
                    if (selectedTags.contains(tag)) {
                        selectedTags.remove(tag)
                    } else {
                        selectedTags.add(tag)
                    }
                }
            )
        }
    }

    // 图片布局选择对话框 - 当选择2张图片时显示
    if (showImageLayoutDialog && pendingImages.size == 2) {
        AlertDialog(
            onDismissRequest = { 
                showImageLayoutDialog = false
                pendingImages.forEach { it.file.delete() }
                pendingImages = emptyList()
            },
            title = {
                Text(
                    text = "选择图片布局",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "请选择图片的排列方式",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PlaceholderColor
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 单图选项 - 两张图片分别显示
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    insertImageBlock(pendingImages[0], ImageLayout.Single)
                                    insertImageBlock(pendingImages[1], ImageLayout.Single)
                                    showImageLayoutDialog = false
                                    pendingImages = emptyList()
                                },
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, PlaceholderColor),
                            color = Color.White
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    "单图",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp
                                )
                                Text(
                                    "两张图片分别显示",
                                    fontSize = 12.sp,
                                    color = PlaceholderColor
                                )
                            }
                        }
                        // 双图选项 - 两张图片并排显示
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    insertDoubleImageBlock(pendingImages[0], pendingImages[1])
                                    showImageLayoutDialog = false
                                    pendingImages = emptyList()
                                },
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, AccentOrange),
                            color = AccentOrange.copy(alpha = 0.1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    "并排",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp,
                                    color = AccentOrange
                                )
                                Text(
                                    "两张图片并排显示",
                                    fontSize = 12.sp,
                                    color = PlaceholderColor
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        insertDoubleImageBlock(pendingImages[0], pendingImages[1])
                        showImageLayoutDialog = false
                        pendingImages = emptyList()
                    }
                ) {
                    Text("并排", color = AccentOrange, fontWeight = FontWeight.Medium)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        insertImageBlock(pendingImages[0], ImageLayout.Single)
                        insertImageBlock(pendingImages[1], ImageLayout.Single)
                        showImageLayoutDialog = false
                        pendingImages = emptyList()
                    }
                ) {
                    Text("单图")
                }
            }
        )
    }

    if (showTagDialog) {
        AlertDialog(
            onDismissRequest = { showTagDialog = false },
            title = {
                Text(
                    text = "添加话题",
                    style = MaterialTheme.typography.titleMedium
                )
            },
            text = {
                TextField(
                    value = tagInput,
                    onValueChange = { tagInput = it },
                    singleLine = true,
                    placeholder = { Text(text = "例如：AI求职") },
                    colors = TextFieldDefaults.colors(
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val formatted = formatTag(tagInput)
                        if (formatted.isNotEmpty()) {
                            if (!selectedTags.contains(formatted)) {
                                selectedTags.add(formatted)
                            }
                            tagInput = ""
                            showTagDialog = false
                        }
                    }
                ) {
                    Text("添加")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTagDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 标题输入区域 - 根据Figma设计实现
 * Figma设计规范：
 * - 字体：14sp，Regular，黑色
 * - 行高：22sp
 * - 占位文字：14sp，灰色 #B5B7B8
 * - 分隔线：0.25px，灰色
 * - 内边距：左右16px，上下10px
 */
@Composable
private fun TitleSection(
    title: String,
    onTitleChange: (String) -> Unit,
    counter: String
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp), // 根据Figma设计：内边距
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            BasicTextField(
                value = title,
                onValueChange = onTitleChange,
                singleLine = true,
                textStyle = TextStyle(
                    fontSize = 14.sp, // 根据Figma设计：14sp
                    color = Color.Black,
                    lineHeight = 22.sp, // 根据Figma设计：行高22sp
                    fontWeight = FontWeight.Normal // PingFang SC Regular
                ),
                decorationBox = { inner ->
                    if (title.isEmpty()) {
                        Text(
                            text = "好的标题会让更多人看到哦~",
                            color = PlaceholderColor, // 根据Figma设计：灰色 #B5B7B8
                            fontSize = 14.sp,
                            lineHeight = 22.sp
                        )
                    }
                    inner()
                },
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = counter,
                style = TextStyle(
                    color = PlaceholderColor,
                    fontSize = 14.sp,
                    lineHeight = 22.sp
                )
            )
        }
        Divider(
            color = PlaceholderColor.copy(alpha = 0.6f),
            thickness = 0.25.dp // 根据Figma设计：0.25px
        )
    }
}

/**
 * 所见即所得编辑器 - 支持文本和图片混合编辑
 * 根据Figma设计实现
 * 支持在任何位置插入图片，可以选择单图或双图布局
 */
@Composable
private fun WysiwygEditor(
    contentBlocks: List<ContentBlock>,
    currentBlockIndex: Int,
    onBlockIndexChange: (Int) -> Unit,
    onTextChange: (Int, String) -> Unit,
    onAddImage: () -> Unit,
    onRemoveImage: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        if (contentBlocks.isEmpty()) {
            // 空状态 - 显示占位符和添加图片按钮
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 220.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "此刻你想和大家分享什么......",
                        color = PlaceholderColor,
                        fontSize = 14.sp,
                        lineHeight = 22.sp
                    )
                    AddImageCard(
                        onClick = onAddImage,
                        modifier = Modifier.size(110.dp)
                    )
                }
            }
        } else {
            // 显示内容块 - 所见即所得
            contentBlocks.forEachIndexed { index, block ->
                when (block) {
                    is ContentBlock.TextBlock -> {
                        ContentTextBlock(
                            text = block.text,
                            isFocused = index == currentBlockIndex,
                            placeholder = if (index == 0 && contentBlocks.size == 1 && block.text.isEmpty()) {
                                "此刻你想和大家分享什么......"
                            } else null,
                            onTextChange = { onTextChange(index, it) },
                            onFocusChange = { if (it) onBlockIndexChange(index) },
                            onAddImageClick = {
                                // 在当前位置插入图片
                                onAddImage()
                            },
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                    is ContentBlock.ImageBlock -> {
                        ContentImageBlock(
                            images = block.images,
                            layout = block.layout,
                            onRemove = { onRemoveImage(index) },
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 文本内容块 - 根据Figma设计实现
 * Figma设计规范：
 * - 字体：14sp，Regular，黑色
 * - 行高：22sp
 * - 占位文字：14sp，灰色 #B5B7B8
 */
@Composable
private fun ContentTextBlock(
    text: String,
    isFocused: Boolean,
    placeholder: String?,
    onTextChange: (String) -> Unit,
    onFocusChange: (Boolean) -> Unit,
    onAddImageClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }
    
    LaunchedEffect(isFocused) {
        if (isFocused) {
            focusRequester.requestFocus()
        }
    }
    
    Column(modifier = modifier) {
        BasicTextField(
            value = text,
            onValueChange = onTextChange,
            textStyle = TextStyle(
                fontSize = 14.sp, // 根据Figma设计：14sp
                color = Color.Black,
                lineHeight = 22.sp, // 根据Figma设计：行高22sp
                fontWeight = FontWeight.Normal // PingFang SC Regular
            ),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 40.dp)
                .focusRequester(focusRequester)
                .onFocusChanged { onFocusChange(it.isFocused) },
            decorationBox = { inner ->
                if (text.isEmpty() && placeholder != null) {
                    Text(
                        text = placeholder,
                        color = PlaceholderColor, // 根据Figma设计：灰色 #B5B7B8
                        fontSize = 14.sp,
                        lineHeight = 22.sp
                    )
                }
                inner()
            }
        )
        // 添加图片按钮（在文本块下方，始终显示）
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.Start
        ) {
            AddImageCard(
                onClick = onAddImageClick,
                modifier = Modifier.size(110.dp) // 根据Figma设计：110x110px
            )
        }
    }
}

/**
 * 图片内容块 - 支持单图和双图布局
 * 根据Figma设计实现
 */
@Composable
private fun ContentImageBlock(
    images: List<SelectedImage>,
    layout: ImageLayout,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (layout) {
        ImageLayout.Single -> {
            // 单图布局 - 每张图片单独显示
            Column(
                modifier = modifier,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                images.forEach { image ->
                    ImageThumbnail(
                        image = image,
                        onRemove = onRemove,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
        ImageLayout.Double -> {
            // 双图并排布局 - 根据Figma设计：两张图片并排显示，间距12px
            Row(
                modifier = modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp) // 根据Figma设计：间距12px
            ) {
                images.take(2).forEach { image ->
                    ImageThumbnail(
                        image = image,
                        onRemove = onRemove,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}


@Composable
private fun TagSection(
    selectedTags: List<String>,
    suggestions: List<String>,
    onAddTag: () -> Unit,
    onToggleTag: (String) -> Unit
) {
    val additionalTags = selectedTags.filterNot { suggestions.contains(it) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TagChip(
                label = "#话题",
                isActive = false,
                onClick = onAddTag,
                emphasize = true
            )
            TagDivider()
            suggestions.forEach { suggestion ->
                TagChip(
                    label = suggestion,
                    isActive = selectedTags.contains(suggestion),
                    onClick = { onToggleTag(suggestion) }
                )
            }
            additionalTags.forEach { customTag ->
                TagChip(
                    label = customTag,
                    isActive = true,
                    onClick = { onToggleTag(customTag) }
                )
            }
        }
    }
}

/**
 * 标签芯片 - 根据Figma设计实现
 * Figma设计规范：
 * - 字体：12sp，Light，黑色（选中时为橙色 #EC7C38）
 * - 圆角：25px
 * - 边框：0.5px，灰色 #B5B7B8（选中时为橙色）
 * - 内边距：左右12px，上下2px
 */
@Composable
private fun TagChip(
    label: String,
    isActive: Boolean,
    onClick: () -> Unit,
    emphasize: Boolean = false
) {
    val textColor = when {
        isActive -> AccentOrange // 根据Figma设计：选中时橙色 #EC7C38
        emphasize -> Color.Black // 根据Figma设计：强调时黑色
        else -> PlaceholderColor // 根据Figma设计：灰色 #B5B7B8
    }
    val borderColor = if (isActive) AccentOrange else PlaceholderColor
    val backgroundColor = if (isActive) AccentOrange.copy(alpha = 0.12f) else Color.White

    Surface(
        shape = RoundedCornerShape(25.dp), // 根据Figma设计：25px圆角
        border = BorderStroke(width = 0.5.dp, color = borderColor), // 根据Figma设计：0.5px边框
        color = backgroundColor,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(
                color = textColor,
                fontSize = 12.sp, // 根据Figma设计：12sp
                fontWeight = if (emphasize) FontWeight.Medium else FontWeight.Light, // PingFang SC Light
                letterSpacing = (-0.32).sp
            ),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp), // 根据Figma设计：内边距
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun TagDivider() {
    Box(
        modifier = Modifier
            .width(0.5.dp)
            .height(17.dp)
            .background(PlaceholderColor.copy(alpha = 0.6f))
    )
}

/**
 * 添加图片卡片 - 根据Figma设计实现
 */
@Composable
private fun AddImageCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = ImagePlaceholder
        )
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.Add,
                contentDescription = "添加图片",
                tint = PlaceholderColor,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

/**
 * 图片缩略图 - 支持单图和双图布局
 */
@Composable
private fun ImageThumbnail(
    image: SelectedImage,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(110.dp)
            .clip(RoundedCornerShape(8.dp)) // 根据Figma设计：8px圆角
    ) {
        AsyncImage(
            model = image.uri,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = androidx.compose.ui.layout.ContentScale.Crop
        )
        IconButton(
            onClick = onRemove,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(4.dp)
                .size(24.dp)
                .background(Color.Black.copy(alpha = 0.45f), shape = CircleShape)
        ) {
            Icon(
                imageVector = Icons.Outlined.Close,
                contentDescription = "移除图片",
                tint = Color.White,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

private fun showTransientMessage(snackbarHostState: SnackbarHostState, message: String) {
    CoroutineScope(Dispatchers.Main).launch {
        snackbarHostState.showSnackbar(message)
    }
}

private fun formatTag(raw: String): String {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return ""
    return if (trimmed.startsWith("#")) trimmed else "#$trimmed"
}

private fun copyUriToCache(resolver: ContentResolver, uri: Uri, cacheDir: File): File? {
    return try {
        val fileName = resolver.queryDisplayName(uri) ?: "post-${UUID.randomUUID()}"
        val extension = mimeTypeToExtension(resolver.getType(uri)) ?: fileName.substringAfterLast('.', "")
        val finalName = if (extension.isNotEmpty()) "$fileName.$extension" else fileName
        val tempFile = File(cacheDir, "post-${UUID.randomUUID()}-$finalName")
        resolver.openInputStream(uri)?.use { input ->
            FileOutputStream(tempFile).use { output ->
                input.copyTo(output)
            }
        } ?: return null
        tempFile
    } catch (e: Exception) {
        null
    }
}

private fun ContentResolver.queryDisplayName(uri: Uri): String? {
    return runCatching {
        query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index != -1 && cursor.moveToFirst()) {
                cursor.getString(index)
            } else {
                null
            }
        }
    }.getOrNull()
}

private fun mimeTypeToExtension(mimeType: String?): String? = when (mimeType) {
    "image/png" -> "png"
    "image/jpeg" -> "jpg"
    "image/jpg" -> "jpg"
    "image/webp" -> "webp"
    "image/gif" -> "gif"
    else -> null
}
