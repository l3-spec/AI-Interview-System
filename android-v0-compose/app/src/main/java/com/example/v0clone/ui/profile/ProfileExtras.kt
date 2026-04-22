@file:OptIn(ExperimentalMaterial3Api::class)

package com.xlwl.AiMian.ui.profile

import android.app.Activity
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.BookmarkRemove
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Face
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import coil.compose.AsyncImage
import com.xlwl.AiMian.ui.components.CompactTopBar
import com.xlwl.AiMian.ui.profile.ProfileViewModel
import androidx.compose.runtime.collectAsState
import kotlinx.coroutines.delay

private val PageGradient = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF00ACC3),
        Color(0xFFE9F7F9),
        Color(0xFFE9F7F9)
    )
)
private val AccentOrange = Color(0xFFEC7C38)
private val AccentSoft = Color(0xFFFFC48A)
private val TitleColor = Color(0xFF1D1F24)
private val SubtleText = Color(0xFF7C818A)
private val CardShape = RoundedCornerShape(12.dp)

@Composable
fun PersonalInfoRoute(
    viewModel: ProfileViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    val statusBarColor = Color(0xFF00ACC3)

    // 控制状态栏颜色
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = statusBarColor.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    val scrollState = rememberScrollState()
    
    val uiState by viewModel.uiState.collectAsState()
    val user = uiState.user
    val regions = uiState.regions
    
    var localAvatarUri by remember { mutableStateOf<Uri?>(null) }

    // BottomSheet 状态控制
    var showNameDialog by remember { mutableStateOf(false) }
    var showGenderSheet by remember { mutableStateOf(false) }
    var showRegionSheet by remember { mutableStateOf(false) }
    var showPhoneSheet by remember { mutableStateOf(false) }
    var showSignatureDialog by remember { mutableStateOf(false) }

    // 图片选取
    val pickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri -> 
            if (uri != null) {
                localAvatarUri = uri
                viewModel.uploadAvatar(context, uri)
            }
        }
    )

    Scaffold(
        topBar = {
            CompactTopBar(
                title = "个人资料",
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 列表内容卡片
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    InfoRow(
                        label = "头像",
                        onClick = {
                            pickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        }
                    ) {
                        Surface(
                            shape = CircleShape,
                            modifier = Modifier.size(48.dp),
                            color = Color(0xFFF0F2F5)
                        ) {
                            val displayAvatar = localAvatarUri ?: user?.avatar
                            if (displayAvatar != null) {
                                AsyncImage(
                                    model = displayAvatar,
                                    contentDescription = null,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Outlined.Face,
                                    contentDescription = null,
                                    modifier = Modifier.padding(8.dp),
                                    tint = Color(0xFFB6BAC1)
                                )
                            }
                        }
                    }

                    HorizontalDivider(thickness = 0.5.dp, color = Color(0xFFEEEEEE), modifier = Modifier.padding(horizontal = 16.dp))

                    InfoRow(
                        label = "姓名",
                        value = user?.name ?: "未设置",
                        onClick = { showNameDialog = true }
                    )

                    HorizontalDivider(thickness = 0.5.dp, color = Color(0xFFEEEEEE), modifier = Modifier.padding(horizontal = 16.dp))

                    InfoRow(
                        label = "性别",
                        value = user?.gender ?: "未设置",
                        onClick = { showGenderSheet = true }
                    )

                    HorizontalDivider(thickness = 0.5.dp, color = Color(0xFFEEEEEE), modifier = Modifier.padding(horizontal = 16.dp))

                    InfoRow(
                        label = "地区",
                        value = user?.region ?: "未设置",
                        onClick = { showRegionSheet = true }
                    )

                    HorizontalDivider(thickness = 0.5.dp, color = Color(0xFFEEEEEE), modifier = Modifier.padding(horizontal = 16.dp))

                    InfoRow(
                        label = "手机号",
                        value = user?.phone ?: "未设置",
                        onClick = { showPhoneSheet = true }
                    )
                    
                    HorizontalDivider(thickness = 0.5.dp, color = Color(0xFFEEEEEE), modifier = Modifier.padding(horizontal = 16.dp))

                    InfoRow(
                        label = "个人签名",
                        value = user?.signature ?: "写点什么介绍自己吧",
                        onClick = { showSignatureDialog = true }
                    )
                }
            }

            // 公开设置卡片
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    VisibilityRow(
                        icon = Icons.Outlined.Notifications,
                        title = "是否对企业开放",
                        subtitle = "开启后，企业可以在人才库中搜索到你",
                        checked = user?.openToCompanies ?: true,
                        onCheckedChange = { viewModel.updateProfile(openToCompanies = it) }
                    )
                    VisibilityRow(
                        icon = Icons.Outlined.Schedule,
                        title = "投递后自动公开",
                        subtitle = "向企业投递简历后，自动向该企业公开个人资料",
                        checked = user?.autoPublish ?: true,
                        onCheckedChange = { viewModel.updateProfile(autoPublish = it) }
                    )
                }
            }
        }
    }

    if (showNameDialog) {
        EditFieldDialog(
            title = "修改姓名",
            initialValue = user?.name ?: "",
            onDismiss = { showNameDialog = false },
            onConfirm = { 
                viewModel.updateProfile(name = it)
                showNameDialog = false 
            }
        )
    }

    if (showGenderSheet) {
        ModernGenderBottomSheet(
            onDismiss = { showGenderSheet = false },
            onSelect = { 
                viewModel.updateProfile(gender = it)
                showGenderSheet = false 
            }
        )
    }

    if (showRegionSheet) {
        ModernRegionBottomSheet(
            regions = regions,
            onDismiss = { showRegionSheet = false },
            onSelect = { 
                viewModel.updateProfile(region = it)
                showRegionSheet = false 
            }
        )
    }

    if (showPhoneSheet) {
        ModernPhoneUpdateBottomSheet(
            viewModel = viewModel,
            onDismiss = { showPhoneSheet = false },
            onUpdate = { 
                viewModel.updateProfile(phone = it)
                showPhoneSheet = false 
            }
        )
    }

    if (showSignatureDialog) {
        EditFieldDialog(
            title = "修改签名",
            initialValue = user?.signature ?: "",
            onDismiss = { showSignatureDialog = false },
            onConfirm = { 
                viewModel.updateProfile(signature = it)
                showSignatureDialog = false 
            },
            singleLine = false
        )
    }
}

@Composable
private fun InfoRow(
    label: String,
    value: String? = null,
    onClick: () -> Unit,
    content: @Composable (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge.copy(
                fontWeight = FontWeight.Medium,
                color = TitleColor
            )
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (content != null) {
                content()
            } else if (value != null) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = SubtleText,
                        textAlign = TextAlign.End
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 200.dp)
                )
            }
            Icon(
                imageVector = Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = Color(0xFFB6BAC1),
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun EditFieldDialog(
    title: String,
    initialValue: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    singleLine: Boolean = true
) {
    var text by remember { mutableStateOf(initialValue) }
    
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(AccentOrange.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (singleLine) Icons.Outlined.Badge else Icons.Outlined.Email,
                        contentDescription = null,
                        tint = AccentOrange
                    )
                }

                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = TitleColor
                    )
                )

                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = singleLine,
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentOrange,
                        unfocusedBorderColor = Color(0xFFEEEEEE),
                        cursorColor = AccentOrange
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("取消", color = SubtleText)
                    }
                    Button(
                        onClick = { onConfirm(text) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
                    ) {
                        Text("确定", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModernGenderBottomSheet(
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFDDDDDD)) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                "选择性别",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.padding(vertical = 12.dp)
            )
            
            SelectionItem(
                label = "男",
                icon = Icons.Outlined.Face,
                onClick = { onSelect("男") }
            )
            SelectionItem(
                label = "女",
                icon = Icons.Outlined.Face,
                onClick = { onSelect("女") }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModernRegionBottomSheet(
    regions: List<com.xlwl.AiMian.data.model.RegionDictionaryItem>,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit
) {
    var selectedProvince by remember { mutableStateOf<com.xlwl.AiMian.data.model.RegionDictionaryItem?>(null) }
    var selectedCity by remember { mutableStateOf<com.xlwl.AiMian.data.model.RegionDictionaryItem?>(null) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFDDDDDD)) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = when {
                        selectedProvince == null -> "选择省份"
                        selectedCity == null -> "选择城市"
                        else -> "选择区县"
                    },
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )
                if (selectedProvince != null) {
                    TextButton(onClick = { 
                        if (selectedCity != null) selectedCity = null else selectedProvince = null 
                    }) {
                        Text("返回", color = AccentOrange)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(modifier = Modifier.height(400.dp)) {
                when {
                    selectedProvince == null -> {
                        items(regions) { province ->
                            SelectionItem(label = province.name, onClick = { selectedProvince = province })
                        }
                    }
                    selectedCity == null -> {
                        items(selectedProvince?.children ?: emptyList()) { city ->
                            SelectionItem(label = city.name, onClick = { selectedCity = city })
                        }
                    }
                    else -> {
                        items(selectedCity?.children ?: emptyList()) { district ->
                            SelectionItem(
                                label = district.name,
                                onClick = { onSelect("${selectedProvince?.name} ${selectedCity?.name} ${district.name}") }
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModernPhoneUpdateBottomSheet(
    viewModel: ProfileViewModel,
    onDismiss: () -> Unit,
    onUpdate: (String) -> Unit
) {
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var countdown by remember { mutableIntStateOf(0) }
    
    LaunchedEffect(countdown) {
        if (countdown > 0) {
            delay(1000)
            countdown--
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFDDDDDD)) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .padding(bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                "修改手机号",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
            )

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = phone,
                    onValueChange = { if (it.length <= 11) phone = it },
                    label = { Text("新手机号") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentOrange,
                        unfocusedBorderColor = Color(0xFFEEEEEE)
                    )
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = code,
                        onValueChange = { if (it.length <= 6) code = it },
                        label = { Text("验证码") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AccentOrange,
                            unfocusedBorderColor = Color(0xFFEEEEEE)
                        )
                    )
                    Button(
                        onClick = { 
                            countdown = 60
                            viewModel.sendVerificationCode(phone)
                        },
                        enabled = phone.length == 11 && countdown == 0,
                        colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                        modifier = Modifier.height(56.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(if (countdown > 0) "${countdown}s" else "获取")
                    }
                }
            }

            Button(
                onClick = { if (phone.length == 11 && code.length == 6) onUpdate(phone) },
                enabled = phone.length == 11 && code.length == 6,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00ADC1))
            ) {
                Text("验证并更新", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun SelectionItem(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .padding(vertical = 14.dp, horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = AccentOrange, modifier = Modifier.size(20.dp))
            }
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = TitleColor,
                    fontSize = 16.sp
                )
            )
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Color(0xFFDDDDDD), modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun VisibilityRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .background(
                    brush = Brush.linearGradient(listOf(AccentSoft, AccentOrange)),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = title, tint = Color.White)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                    color = TitleColor
                )
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
            )
        }
        Checkbox(checked = checked, onCheckedChange = { onCheckedChange(it) })
    }
}

@Composable
fun PrivacyPermissionsRoute(
    onBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    var allowNotification by rememberSaveable { mutableStateOf(true) }
    var allowCamera by rememberSaveable { mutableStateOf(true) }
    var allowMicrophone by rememberSaveable { mutableStateOf(true) }
    var allowLocation by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            CompactTopBar(
                title = "隐私与权限",
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            PermissionCard(
                title = "权限控制",
                subtitle = "为面试、消息通知开启必要权限",
                content = {
                    PermissionRow(
                        icon = Icons.Outlined.Notifications,
                        title = "消息通知",
                        subtitle = "获取面试进展、系统提醒",
                        checked = allowNotification,
                        onCheckedChange = { allowNotification = it }
                    )
                    PermissionRow(
                        icon = Icons.Outlined.Lock,
                        title = "摄像头",
                        subtitle = "视频面试、头像拍摄",
                        checked = allowCamera,
                        onCheckedChange = { allowCamera = it }
                    )
                    PermissionRow(
                        icon = Icons.Outlined.PrivacyTip,
                        title = "麦克风",
                        subtitle = "语音回答、语音转文字",
                        checked = allowMicrophone,
                        onCheckedChange = { allowMicrophone = it }
                    )
                    PermissionRow(
                        icon = Icons.Outlined.LocationOn,
                        title = "定位",
                        subtitle = "推荐附近职位与城市偏好",
                        checked = allowLocation,
                        onCheckedChange = { allowLocation = it }
                    )
                }
            )
            PermissionCard(
                title = "数据与安全",
                subtitle = "我们严格遵守数据合规要求",
                content = {
                    SecurityBullet(
                        icon = Icons.Outlined.Security,
                        title = "端到端加密",
                        desc = "账号、面试音视频传输均使用加密通道"
                    )
                    SecurityBullet(
                        icon = Icons.Outlined.AlternateEmail,
                        title = "最小化数据使用",
                        desc = "仅为匹配职位和分析面试表现使用必要信息"
                    )
                }
            )
        }
    }
}

@Composable
private fun PermissionCard(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = TitleColor
                    )
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
                )
                content()
            }
        )
    }
}

@Composable
private fun PermissionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .background(
                    brush = Brush.linearGradient(listOf(AccentSoft, AccentOrange)),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = title, tint = Color.White)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                    color = TitleColor
                )
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun SecurityBullet(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    desc: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = AccentOrange)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    color = TitleColor
                )
            )
            Text(
                text = desc,
                style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
            )
        }
    }
}

@Composable
fun JobFavoritesRoute(onBack: () -> Unit) {
    val favorites = remember {
        mutableStateListOf(
            FavoriteJob("高级后端工程师", "阿里巴巴 · 北京", "25-40k · 15薪", listOf("Java", "Spring", "高并发")),
            FavoriteJob("产品经理", "字节跳动 · 上海", "20-30k · 16薪", listOf("ToB产品", "数据分析")),
            FavoriteJob("UI 设计师", "美团 · 成都", "18-25k · 14薪", listOf("移动端", "品牌设计"))
        )
    }
    val context = LocalContext.current
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "职位收藏",
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            if (favorites.isEmpty()) {
                EmptyPlaceholder(title = "暂无收藏职位", subtitle = "去首页逛逛，看看适合你的岗位")
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(favorites, key = { it.title }) { job ->
                        FavoriteJobCard(
                            job = job,
                            onRemove = {
                                favorites.remove(job)
                                Toast.makeText(context, "已取消收藏 ${job.title}", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FavoriteJobCard(
    job: FavoriteJob,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = job.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = TitleColor
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = job.company,
                        style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
                    )
                }
                Text(
                    text = job.salary,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = AccentOrange
                    )
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                job.tags.forEach { tag ->
                    TagChip(label = tag)
                }
            }
            TextButton(
                onClick = onRemove,
                shape = RoundedCornerShape(18.dp)
            ) {
                Icon(Icons.Outlined.BookmarkRemove, contentDescription = null, tint = AccentOrange)
                Spacer(modifier = Modifier.size(6.dp))
                Text("取消收藏", color = AccentOrange, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun PostFavoritesRoute(onBack: () -> Unit) {
    val favorites = remember {
        mutableStateListOf(
            FavoritePost("秋招避坑指南", "分享一些面试中常见的坑点和HR话术拆解。", "1.2k", "98"),
            FavoritePost("大模型应用案例", "记录最近在做的AI面试题生成小工具。", "875", "66"),
            FavoritePost("远程办公效率", "工具链配置与时间管理心得。", "432", "18")
        )
    }
    val context = LocalContext.current
    Scaffold(
        topBar = {
            CompactTopBar(
                title = "帖子收藏",
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            if (favorites.isEmpty()) {
                EmptyPlaceholder(title = "暂无收藏帖子", subtitle = "逛逛圈子，收藏你喜欢的内容")
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(favorites, key = { it.title }) { post ->
                        FavoritePostCard(
                            post = post,
                            onRemove = {
                                favorites.remove(post)
                                Toast.makeText(context, "已取消收藏 ${post.title}", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FavoritePostCard(
    post: FavoritePost,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = TitleColor
                )
            )
            Text(
                text = post.snippet,
                style = MaterialTheme.typography.bodyMedium.copy(color = TitleColor.copy(alpha = 0.85f)),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TagChip(label = "${post.likes} 赞")
                TagChip(label = "${post.comments} 评论")
            }
            TextButton(onClick = onRemove, shape = RoundedCornerShape(18.dp)) {
                Icon(Icons.Outlined.BookmarkRemove, contentDescription = null, tint = AccentOrange)
                Spacer(modifier = Modifier.size(6.dp))
                Text("取消收藏", color = AccentOrange, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun DeliveryListRoute(
    statusKey: String?,
    onBack: () -> Unit
) {
    val status = DeliveryStatus.fromKey(statusKey)
    val items = remember(status) {
        listOf(
            DeliveryItem("Java 后端工程师", "阿里巴巴 · 北京", "2024-06-12", DeliveryStatus.SUBMITTED),
            DeliveryItem("产品经理", "腾讯 · 深圳", "2024-06-10", DeliveryStatus.VIEWED),
            DeliveryItem("视觉设计师", "小红书 · 上海", "2024-06-02", DeliveryStatus.PASSED),
            DeliveryItem("前端工程师", "美团 · 成都", "2024-05-30", DeliveryStatus.REJECTED)
        ).filter { it.status == status }
    }

    Scaffold(
        topBar = {
            CompactTopBar(
                title = status.title,
                onBack = onBack,
                containerColor = Color.Transparent,
                contentColor = Color.White
            )
        },
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(PageGradient)
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            FilterChip(
                selected = true,
                onClick = { },
                label = { Text(status.title) },
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Color.White,
                    selectedContainerColor = AccentSoft,
                    selectedLabelColor = TitleColor
                )
            )
            Spacer(modifier = Modifier.height(8.dp))
            if (items.isEmpty()) {
                EmptyPlaceholder(title = "暂无${status.title}记录", subtitle = "完成投递后可在这里查看进度")
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(items, key = { it.title }) { item ->
                        DeliveryCard(item = item)
                    }
                }
            }
        }
    }
}

@Composable
private fun DeliveryCard(item: DeliveryItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = TitleColor
                        )
                    )
                    Text(
                        text = item.company,
                        style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
                    )
                }
                TagChip(label = item.status.title)
            }
            Text(
                text = "投递时间：${item.date}",
                style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
            )
        }
    }
}

@Composable
private fun TagChip(label: String) {
    Card(
        shape = RoundedCornerShape(50),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF3F6F9)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                color = TitleColor
            )
        )
    }
}

@Composable
private fun EmptyPlaceholder(
    title: String,
    subtitle: String
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                color = TitleColor
            )
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodySmall.copy(color = SubtleText, fontSize = 12.sp)
        )
    }
}

private data class FavoriteJob(
    val title: String,
    val company: String,
    val salary: String,
    val tags: List<String>
)

private data class FavoritePost(
    val title: String,
    val snippet: String,
    val likes: String,
    val comments: String
)

private data class DeliveryItem(
    val title: String,
    val company: String,
    val date: String,
    val status: DeliveryStatus
)

private enum class DeliveryStatus(val key: String, val title: String) {
    SUBMITTED("submitted", "已投递"),
    VIEWED("viewed", "被查看"),
    PASSED("passed", "通过初筛"),
    REJECTED("rejected", "不合适");

    companion object {
        fun fromKey(key: String?): DeliveryStatus {
            return values().firstOrNull { it.key.equals(key, ignoreCase = true) } ?: SUBMITTED
        }
    }
}
