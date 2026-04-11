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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.foundation.layout.statusBars
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FormatSize
import androidx.compose.material.icons.outlined.FormatListBulleted
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.EmojiEmotions
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.runtime.derivedStateOf
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
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
import android.graphics.Color as AndroidColor
import androidx.core.view.WindowCompat

// ── 设计色彩 ──
private const val TITLE_MAX_LENGTH = 30
private const val MAX_IMAGES = 6
private val PlaceholderColor = Color(0xFFB5B7B8)
private val AccentOrange = Color(0xFFEC7C38)
private val AccentPink = Color(0xFFFF6B81)
private val ImagePlaceholder = Color(0xFFEBEBEB)
private val TitlePlaceholderColor = Color(0xFFA8D8D8) // 截图中标题占位色（青绿色）
private val BodyPlaceholderColor = Color(0xFFB5B7B8)
private val ToolbarDividerColor = Color(0xFFF0F0F0)
private val ToolbarIconColor = Color(0xFF333333)
private val ToolbarActiveBackground = Color(0xFFF6F6F6)
private val EmojiPanelBackground = Color(0xFF101014)

private enum class EditorPanel {
    None,
    Format,
    Emoji
}

private enum class TextPreset(val label: String) {
    Title("标题"),
    Subtitle("二级标题"),
    Body("正文"),
    Quote("“引用”")
}

private val RecentEmojiList = listOf("😂", "🥹", "😡", "😭")
private val EmojiList = listOf(
    "😊", "😌", "🥲", "😅", "🤩", "🫶",
    "🤔", "😘", "😶", "😮", "😎", "😤",
    "😍", "🔥", "👏", "💪", "✨", "🎉"
)

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

    // ── 状态栏：白底 + 深色图标 ──
    val context = LocalContext.current
    val activity = remember(context) { 
        generateSequence(context) { (it as? android.content.ContextWrapper)?.baseContext }
            .filterIsInstance<android.app.Activity>()
            .firstOrNull()
    }

    DisposableEffect(activity) {
        if (activity != null) {
            val window = activity.window
            val insetsController = androidx.core.view.WindowCompat.getInsetsController(window, window.decorView)
            val originalStatusBarColor = window.statusBarColor
            val originalDarkIcons = insetsController.isAppearanceLightStatusBars

            window.statusBarColor = AndroidColor.WHITE
            insetsController.isAppearanceLightStatusBars = true // 深色图标

            onDispose {
                window.statusBarColor = originalStatusBarColor
                insetsController.isAppearanceLightStatusBars = originalDarkIcons
            }
        } else {
            onDispose {}
        }
    }

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
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
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
    var activePanel by rememberSaveable { mutableStateOf(EditorPanel.None) }

    // 计算当前已使用的图片数量
    val currentImageCount by remember {
        derivedStateOf {
            contentBlocks.sumOf { block ->
                when (block) {
                    is ContentBlock.TextBlock -> 0
                    is ContentBlock.ImageBlock -> block.images.size
                }
            }
        }
    }

    fun closeKeyboardPanels() {
        activePanel = EditorPanel.None
    }

    fun ensureCurrentTextBlock(): Int {
        val currentBlock = contentBlocks.getOrNull(currentBlockIndex)
        if (currentBlock is ContentBlock.TextBlock) {
            return currentBlockIndex
        }

        val insertIndex = (currentBlockIndex + 1).coerceAtMost(contentBlocks.size)
        if (insertIndex < contentBlocks.size && contentBlocks[insertIndex] is ContentBlock.TextBlock) {
            currentBlockIndex = insertIndex
            return insertIndex
        }

        contentBlocks.add(insertIndex, ContentBlock.TextBlock(""))
        currentBlockIndex = insertIndex
        return insertIndex
    }

    fun updateCurrentTextBlock(transform: (String) -> String) {
        val targetIndex = ensureCurrentTextBlock()
        val currentBlock = contentBlocks[targetIndex] as ContentBlock.TextBlock
        contentBlocks[targetIndex] = ContentBlock.TextBlock(transform(currentBlock.text))
    }

    fun togglePanel(panel: EditorPanel) {
        val nextPanel = if (activePanel == panel) EditorPanel.None else panel
        activePanel = nextPanel
        if (nextPanel == EditorPanel.None) return
        keyboardController?.hide()
        focusManager.clearFocus(force = false)
    }

    fun applyTextPreset(preset: TextPreset) {
        updateCurrentTextBlock { current ->
            val stripped = current
                .lineSequence()
                .joinToString("\n") { line ->
                    line.trimStart()
                        .removePrefix("# ")
                        .removePrefix("## ")
                        .removePrefix("> ")
                        .removePrefix("• ")
                        .removePrefix("- ")
                }
                .trimStart()

            when (preset) {
                TextPreset.Title -> if (stripped.isBlank()) "# " else "# $stripped"
                TextPreset.Subtitle -> if (stripped.isBlank()) "## " else "## $stripped"
                TextPreset.Body -> stripped
                TextPreset.Quote -> if (stripped.isBlank()) "> " else "> $stripped"
            }
        }
    }

    fun insertEmoji(emoji: String) {
        updateCurrentTextBlock { current -> current + emoji }
    }

    fun insertBulletListItem() {
        updateCurrentTextBlock { current ->
            when {
                current.isBlank() -> "• "
                current.endsWith("\n") -> current + "• "
                else -> "$current\n• "
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

    // ── 一键排版逻辑 ──
    fun formatContent() {
        // 1. 修整标题
        title = title.trim()
        
        // 2. 遍历并修整文本块
        for (i in contentBlocks.indices) {
            val block = contentBlocks[i]
            if (block is ContentBlock.TextBlock) {
                // 去掉多余的首尾空行，将内部连续多于2个的回车收缩为1个
                val formattedText = block.text.trim()
                    .replace(Regex("\\n{3,}"), "\n\n")
                contentBlocks[i] = ContentBlock.TextBlock(formattedText)
            }
        }
        
        // 3. 删除末尾空文本块（保留至少一个）
        while (contentBlocks.size > 1 && 
               contentBlocks.last() is ContentBlock.TextBlock && 
               (contentBlocks.last() as ContentBlock.TextBlock).text.isEmpty()) {
            contentBlocks.removeAt(contentBlocks.size - 1)
        }
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
                activePanel = EditorPanel.None
            } else {
                // 单张图片，直接插入
                insertImageBlock(processedImages.first(), ImageLayout.Single)
                activePanel = EditorPanel.None
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

    fun submitPost() {
        if (title.isBlank()) {
            showTransientMessage(snackbarHostState, "请输入帖子标题")
            return
        }
        val contentText = blocksToText().trim()
        if (contentText.isBlank() || contentText == "[图片]") {
            showTransientMessage(snackbarHostState, "请输入帖子内容")
            return
        }
        onPublish(
            title.trim(),
            contentText,
            selectedTags.map(String::trim),
            getAllImageFiles()
        )
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
        contentWindowInsets = WindowInsets(0), // 禁用默认插入，完全手动控制，去掉空隙
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            // ── 顶栏：← 写长文  [一键排版] ──
            LongArticleTopBar(
                onBack = onBack,
                isPublishing = uiState.isPublishing,
                onLayoutClick = { formatContent() } // 绑定一键排版
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
                .padding(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(bottom = if (activePanel == EditorPanel.None) 104.dp else 316.dp)
            ) {
                // ── 标题输入 ──
                LongArticleTitleInput(
                    title = title,
                    onTitleChange = { if (it.length <= TITLE_MAX_LENGTH) title = it },
                    onFocusChanged = { isFocused ->
                        if (isFocused) closeKeyboardPanels()
                    }
                )

                // ── 正文编辑区 ──
                LongArticleBodyEditor(
                    contentBlocks = contentBlocks,
                    currentBlockIndex = currentBlockIndex,
                    onBlockIndexChange = {
                        currentBlockIndex = it
                        closeKeyboardPanels()
                    },
                    onTextChange = { index, text ->
                        if (index < contentBlocks.size) {
                            val block = contentBlocks[index]
                            if (block is ContentBlock.TextBlock) {
                                contentBlocks[index] = ContentBlock.TextBlock(text)
                            }
                        }
                    },
                    onRemoveImage = { index ->
                        removeImageBlock(index)
                    }
                )

                // ── 标签区域 ──
                if (selectedTags.isNotEmpty()) {
                    TagSection(
                        selectedTags = selectedTags,
                        suggestions = tagSuggestions,
                        onAddTag = {
                            activePanel = EditorPanel.None
                            showTagDialog = true
                        },
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

            EditorBottomDock(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .imePadding(),
                activePanel = activePanel,
                onFormatClick = { togglePanel(EditorPanel.Format) },
                onListClick = { insertBulletListItem() },
                onBookmarkClick = {
                    activePanel = EditorPanel.None
                    showTagDialog = true
                },
                onEmojiClick = { togglePanel(EditorPanel.Emoji) },
                onImageClick = {
                    activePanel = EditorPanel.None
                    keyboardController?.hide()
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
                onDoneClick = {
                    activePanel = EditorPanel.None
                    focusManager.clearFocus(force = true)
                    keyboardController?.hide()
                    submitPost()
                },
                onPresetSelected = { preset -> applyTextPreset(preset) },
                onEmojiSelected = { emoji -> insertEmoji(emoji) }
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

// ═══════════════════════════════════════════════════════════════
//  写长文 顶栏  ← 写长文  [一键排版]
// ═══════════════════════════════════════════════════════════════
@Composable
private fun LongArticleTopBar(
    onBack: () -> Unit,
    isPublishing: Boolean,
    onLayoutClick: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    top = WindowInsets.statusBars
                        .asPaddingValues()
                        .calculateTopPadding()
                )
                .height(44.dp) // 降低高度，视觉上更靠上
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 返回按钮
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = "返回",
                    tint = Color(0xFF333333),
                    modifier = Modifier.size(22.dp)
                )
            }

            // 居中标题 "写长文"
            Text(
                text = "写长文",
                color = Color(0xFF1A1A1A),
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center
            )

            // 一键排版按钮
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = AccentPink,
                modifier = Modifier
                    .padding(end = 8.dp)
                    .clickable(onClick = onLayoutClick) // 点击执行排版
            ) {
                Text(
                    text = if (isPublishing) "发布中..." else "一键排版",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  标题输入  — 截图：绿色占位文字 "输入标题"
// ═══════════════════════════════════════════════════════════════
@Composable
private fun LongArticleTitleInput(
    title: String,
    onTitleChange: (String) -> Unit,
    onFocusChanged: (Boolean) -> Unit
) {
    BasicTextField(
        value = title,
        onValueChange = onTitleChange,
        singleLine = true,
        textStyle = TextStyle(
            fontSize = 22.sp,
            color = Color(0xFF1A1A1A),
            fontWeight = FontWeight.Bold,
            lineHeight = 30.sp
        ),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp)
            ) {
                if (title.isEmpty()) {
                    Text(
                        text = "输入标题",
                        color = TitlePlaceholderColor,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 30.sp
                    )
                }
                inner()
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .onFocusChanged { onFocusChanged(it.isFocused) }
    )
}

// ═══════════════════════════════════════════════════════════════
//  正文编辑区  — 截图：左侧红色竖线 + 占位文字
// ═══════════════════════════════════════════════════════════════
@Composable
private fun LongArticleBodyEditor(
    contentBlocks: List<ContentBlock>,
    currentBlockIndex: Int,
    onBlockIndexChange: (Int) -> Unit,
    onTextChange: (Int, String) -> Unit,
    onRemoveImage: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .heightIn(min = 280.dp)
    ) {
        if (contentBlocks.isEmpty()) {
            // 空状态
            BodyPlaceholderWithIndicator()
        } else {
            contentBlocks.forEachIndexed { index, block ->
                when (block) {
                    is ContentBlock.TextBlock -> {
                        LongArticleTextBlock(
                            text = block.text,
                            isFocused = index == currentBlockIndex,
                            showIndicator = index == 0 && contentBlocks.size == 1 && block.text.isEmpty(),
                            onTextChange = { onTextChange(index, it) },
                            onFocusChange = { if (it) onBlockIndexChange(index) },
                            modifier = Modifier.padding(vertical = 1.dp)
                        )
                    }
                    is ContentBlock.ImageBlock -> {
                        ContentImageBlock(
                            images = block.images,
                            layout = block.layout,
                            onRemove = { onRemoveImage(index) },
                            modifier = Modifier.padding(vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 占位状态 — 左侧红色竖线 + 提示文字
 */
@Composable
private fun BodyPlaceholderWithIndicator() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        // 红色竖线指示器
        Box(
            modifier = Modifier
                .width(2.dp)
                .height(20.dp)
                .background(AccentPink)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = "粘贴到这里或输入文字，内容将自动保存",
            color = BodyPlaceholderColor,
            fontSize = 15.sp,
            lineHeight = 22.sp
        )
    }
}

/**
 * 长文文本块 — 带可选的红色竖线指示器
 */
@Composable
private fun LongArticleTextBlock(
    text: String,
    isFocused: Boolean,
    showIndicator: Boolean,
    onTextChange: (String) -> Unit,
    onFocusChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(isFocused) {
        if (isFocused) {
            focusRequester.requestFocus()
        }
    }

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        if (showIndicator && text.isEmpty()) {
            // 红色竖线指示器（仅空状态展示）
            Box(
                modifier = Modifier
                    .width(2.dp)
                    .height(20.dp)
                    .background(AccentPink)
            )
            Spacer(Modifier.width(8.dp))
        }

        BasicTextField(
            value = text,
            onValueChange = onTextChange,
            textStyle = TextStyle(
                fontSize = 15.sp,
                color = Color(0xFF1A1A1A),
                lineHeight = 24.sp,
                fontWeight = FontWeight.Normal
            ),
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 40.dp)
                .focusRequester(focusRequester)
                .onFocusChanged { onFocusChange(it.isFocused) },
            decorationBox = { inner ->
                if (text.isEmpty() && showIndicator) {
                    Text(
                        text = "粘贴到这里或输入文字，内容将自动保存",
                        color = BodyPlaceholderColor,
                        fontSize = 15.sp,
                        lineHeight = 22.sp
                    )
                }
                inner()
            }
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  底部编辑工具栏  — 截图：Aa  列表  书签  表情  图片  完成
// ═══════════════════════════════════════════════════════════════
@Composable
private fun EditorBottomDock(
    modifier: Modifier = Modifier,
    activePanel: EditorPanel,
    onFormatClick: () -> Unit,
    onListClick: () -> Unit,
    onBookmarkClick: () -> Unit,
    onEmojiClick: () -> Unit,
    onImageClick: () -> Unit,
    onDoneClick: () -> Unit,
    onPresetSelected: (TextPreset) -> Unit,
    onEmojiSelected: (String) -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color.White,
        shadowElevation = 10.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            when (activePanel) {
                EditorPanel.Format -> FormatPresetPanel(onPresetSelected = onPresetSelected)
                EditorPanel.Emoji -> EmojiPickerPanel(onEmojiSelected = onEmojiSelected)
                EditorPanel.None -> Unit
            }

            HorizontalDivider(color = ToolbarDividerColor, thickness = 0.5.dp)

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    ToolbarIconButton(
                        icon = Icons.Outlined.FormatSize,
                        contentDescription = "字体格式",
                        isActive = activePanel == EditorPanel.Format,
                        onClick = onFormatClick
                    )
                    ToolbarIconButton(
                        icon = Icons.Outlined.FormatListBulleted,
                        contentDescription = "列表",
                        onClick = onListClick
                    )
                    ToolbarIconButton(
                        icon = Icons.Outlined.BookmarkBorder,
                        contentDescription = "话题标签",
                        onClick = onBookmarkClick
                    )
                    ToolbarIconButton(
                        icon = Icons.Outlined.EmojiEmotions,
                        contentDescription = "表情",
                        isActive = activePanel == EditorPanel.Emoji,
                        onClick = onEmojiClick
                    )
                    ToolbarIconButton(
                        icon = Icons.Outlined.Image,
                        contentDescription = "插入图片",
                        onClick = onImageClick
                    )
                }

                // "完成" 按钮
                Text(
                    text = "完成",
                    color = ToolbarIconColor,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .clickable(onClick = onDoneClick)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun ToolbarIconButton(
    icon: ImageVector,
    contentDescription: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.size(40.dp),
        shape = RoundedCornerShape(10.dp),
        color = if (isActive) ToolbarActiveBackground else Color.Transparent,
        onClick = onClick
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = ToolbarIconColor,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

@Composable
private fun FormatPresetPanel(
    onPresetSelected: (TextPreset) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        TextPreset.entries.forEach { preset ->
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFFF5F5F5),
                onClick = { onPresetSelected(preset) }
            ) {
                Text(
                    text = preset.label,
                    color = Color(0xFF1A1A1A),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp)
                )
            }
        }
    }
}

@Composable
private fun EmojiPickerPanel(
    onEmojiSelected: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(EmojiPanelBackground)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "最近使用",
            color = Color.White.copy(alpha = 0.86f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium
        )

        EmojiGridRow(
            emojis = RecentEmojiList,
            onEmojiSelected = onEmojiSelected
        )

        Text(
            text = "常用表情",
            color = Color.White.copy(alpha = 0.86f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            EmojiList.forEach { emoji ->
                EmojiCell(
                    emoji = emoji,
                    onClick = { onEmojiSelected(emoji) }
                )
            }
        }
    }
}

@Composable
private fun EmojiGridRow(
    emojis: List<String>,
    onEmojiSelected: (String) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        emojis.forEach { emoji ->
            EmojiCell(
                emoji = emoji,
                modifier = Modifier.weight(1f),
                onClick = { onEmojiSelected(emoji) }
            )
        }
    }
}

@Composable
private fun EmojiCell(
    emoji: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = Color.White.copy(alpha = 0.06f),
        onClick = onClick
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = emoji,
                fontSize = 28.sp
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  图片内容块 — 支持单图和双图布局
// ═══════════════════════════════════════════════════════════════
@Composable
private fun ContentImageBlock(
    images: List<SelectedImage>,
    layout: ImageLayout,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (layout) {
        ImageLayout.Single -> {
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
            Row(
                modifier = modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
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

// ═══════════════════════════════════════════════════════════════
//  标签区域
// ═══════════════════════════════════════════════════════════════
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
            .padding(horizontal = 20.dp, vertical = 12.dp)
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

@Composable
private fun TagChip(
    label: String,
    isActive: Boolean,
    onClick: () -> Unit,
    emphasize: Boolean = false
) {
    val textColor = when {
        isActive -> AccentOrange
        emphasize -> Color.Black
        else -> PlaceholderColor
    }
    val borderColor = if (isActive) AccentOrange else PlaceholderColor
    val backgroundColor = if (isActive) AccentOrange.copy(alpha = 0.12f) else Color.White

    Surface(
        shape = RoundedCornerShape(25.dp),
        border = BorderStroke(width = 0.5.dp, color = borderColor),
        color = backgroundColor,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(
                color = textColor,
                fontSize = 12.sp,
                fontWeight = if (emphasize) FontWeight.Medium else FontWeight.Light,
                letterSpacing = (-0.32).sp
            ),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
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

// ═══════════════════════════════════════════════════════════════
//  图片缩略图
// ═══════════════════════════════════════════════════════════════
@Composable
private fun ImageThumbnail(
    image: SelectedImage,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(110.dp)
            .clip(RoundedCornerShape(8.dp))
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

// ═══════════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════════
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
