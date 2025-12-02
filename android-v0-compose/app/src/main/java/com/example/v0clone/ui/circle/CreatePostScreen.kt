package com.xlwl.AiMian.ui.circle

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Image
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
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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

data class SelectedImage(
    val uri: Uri,
    val file: File
)

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

@OptIn(ExperimentalFoundationApi::class)
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
    var content by rememberSaveable { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<String>() }
    val selectedImages = remember { mutableStateListOf<SelectedImage>() }
    var showTagDialog by remember { mutableStateOf(false) }
    var tagInput by rememberSaveable { mutableStateOf("") }
    val tagSuggestions = remember {
        listOf("#AI", "#职业转型", "#Offer分享")
    }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia()
    ) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        val capacity = MAX_IMAGES - selectedImages.size
        if (capacity <= 0) return@rememberLauncherForActivityResult
        val toProcess = uris.take(capacity)
        val resolverValue = resolver.value
        toProcess.forEach { uri ->
            if (selectedImages.any { it.uri == uri }) return@forEach
            val file = copyUriToCache(resolverValue, uri, context.cacheDir)
            if (file != null) {
                selectedImages.add(SelectedImage(uri = uri, file = file))
            } else {
                showTransientMessage(snackbarHostState, "选择图片失败，请重试")
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            selectedImages.forEach { it.file.delete() }
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
                            if (content.isBlank()) {
                                showTransientMessage(snackbarHostState, "请输入帖子内容")
                                return@Button
                            }
                            onPublish(
                                title.trim(),
                                content.trim(),
                                selectedTags.map(String::trim),
                                selectedImages.map { it.file }
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
        ) {
            TitleSection(
                title = title,
                onTitleChange = { if (it.length <= TITLE_MAX_LENGTH) title = it },
                counter = "${title.length}/$TITLE_MAX_LENGTH"
            )
            Divider(color = PlaceholderColor.copy(alpha = 0.3f), thickness = 0.5.dp)
            ContentSection(
                content = content,
                onContentChange = { content = it }
            )
            PhotoSection(
                images = selectedImages,
                onAddClick = {
                    imagePickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                },
                onRemove = { image ->
                    selectedImages.remove(image)
                    image.file.delete()
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

@Composable
private fun TitleSection(
    title: String,
    onTitleChange: (String) -> Unit,
    counter: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        BasicTextField(
            value = title,
            onValueChange = onTitleChange,
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                fontSize = 16.sp,
                color = Color.Black
            ),
            decorationBox = { inner ->
                if (title.isEmpty()) {
                    Text(
                        text = "好的标题会让更多人看到哦~",
                        color = PlaceholderColor,
                        style = MaterialTheme.typography.bodyLarge.copy(fontSize = 16.sp)
                    )
                }
                inner()
            },
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = counter,
            style = MaterialTheme.typography.bodySmall.copy(
                color = PlaceholderColor
            )
        )
    }
}

@Composable
private fun ContentSection(
    content: String,
    onContentChange: (String) -> Unit
) {
    BasicTextField(
        value = content,
        onValueChange = onContentChange,
        textStyle = MaterialTheme.typography.bodyLarge.copy(
            fontSize = 15.sp,
            color = Color.Black
        ),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 150.dp)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        decorationBox = { inner ->
            if (content.isEmpty()) {
                Text(
                    text = "此刻你想和大家分享什么......",
                    color = PlaceholderColor,
                    style = MaterialTheme.typography.bodyLarge.copy(fontSize = 14.sp)
                )
            }
            inner()
        }
    )
}

@Composable
private fun PhotoSection(
    images: List<SelectedImage>,
    onAddClick: () -> Unit,
    onRemove: (SelectedImage) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Text(
            text = "图片",
            style = MaterialTheme.typography.titleSmall.copy(
                fontWeight = FontWeight.Medium,
                color = Color.Black
            ),
            modifier = Modifier.padding(bottom = 12.dp)
        )
        LazyRow(
            contentPadding = PaddingValues(end = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(images.size) { index ->
                val image = images[index]
                ImageThumbnail(
                    image = image,
                    onRemove = { onRemove(image) }
                )
            }
            if (images.size < MAX_IMAGES) {
                item {
                    AddImageCard(onClick = onAddClick)
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
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TagChip(
                label = "#话题",
                isActive = false,
                onClick = onAddTag
            )
            suggestions.forEach { suggestion ->
                TagChip(
                    label = suggestion,
                    isActive = selectedTags.contains(suggestion),
                    onClick = { onToggleTag(suggestion) }
                )
            }
        }
        if (selectedTags.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = selectedTags.joinToString(" "),
                style = MaterialTheme.typography.bodySmall.copy(
                    color = AccentOrange
                ),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun TagChip(
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(25.dp),
        border = BorderStroke(
            width = 0.5.dp,
            color = if (isActive) AccentOrange else PlaceholderColor
        ),
        color = if (isActive) AccentOrange.copy(alpha = 0.12f) else Color.White,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(
                color = if (isActive) AccentOrange else Color.Black,
                fontSize = 12.sp
            ),
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun AddImageCard(
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .size(120.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF6F7FB)
        ),
        border = BorderStroke(1.dp, PlaceholderColor.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Outlined.Image,
                contentDescription = null,
                tint = PlaceholderColor,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "添加图片",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = PlaceholderColor
                ),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ImageThumbnail(
    image: SelectedImage,
    onRemove: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(120.dp)
            .clip(RoundedCornerShape(16.dp))
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
