package com.xlwl.AiMian.navigation

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.digitalhuman.DuixAvatarInterviewScreen
import com.xlwl.AiMian.ai.guide.InterviewPrecautionsScreen
import com.xlwl.AiMian.ai.guide.InterviewCameraTestScreen
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.google.gson.Gson
import java.io.IOException
import java.net.SocketTimeoutException

import com.xlwl.AiMian.data.api.AiInterviewApi
import com.xlwl.AiMian.data.api.ApiService
import com.xlwl.AiMian.data.api.OssApi
import com.xlwl.AiMian.BuildConfig
import com.xlwl.AiMian.ai.prep.PrepRoute
import com.xlwl.AiMian.ai.session.InterviewSessionRoute
import com.xlwl.AiMian.data.api.AuthApi
import com.xlwl.AiMian.data.api.JobDictionaryApi
import com.xlwl.AiMian.data.api.RetrofitClient
import com.xlwl.AiMian.data.auth.AuthManager
import com.xlwl.AiMian.data.repository.AuthRepository
import com.xlwl.AiMian.data.repository.AiInterviewRepository
import com.xlwl.AiMian.data.repository.ContentRepository
import com.xlwl.AiMian.data.repository.JobPreferenceRepository
import com.xlwl.AiMian.data.repository.JobRepository
import com.xlwl.AiMian.data.model.JobPreferenceDto
import com.xlwl.AiMian.data.model.AppVersionInfo
import com.xlwl.AiMian.data.repository.JobDictionaryRepository
import com.xlwl.AiMian.data.repository.MessageRepository
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.model.AiInterviewCreateSessionData
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.model.AssessmentDetail
import com.xlwl.AiMian.data.model.AssessmentResult
import com.xlwl.AiMian.data.model.HomeFeedTargetType
import com.xlwl.AiMian.navigation.Routes.LOGIN
import com.xlwl.AiMian.data.repository.OssRepository
import com.xlwl.AiMian.data.repository.AppUpdateRepository
import com.xlwl.AiMian.data.repository.UserRepository
import com.xlwl.AiMian.ui.profile.ProfileViewModel
import com.xlwl.AiMian.data.repository.VerificationRepository
import com.xlwl.AiMian.ui.auth.LoginScreen
import com.xlwl.AiMian.ui.auth.LoginFlowScreen
import com.xlwl.AiMian.ui.auth.RegisterScreen
import com.xlwl.AiMian.ui.circle.CircleRoute
import com.xlwl.AiMian.ui.circle.CreatePostRoute
import com.xlwl.AiMian.ui.circle.PostDetailRoute
import com.xlwl.AiMian.ui.circle.TopicAggregationRoute
import com.xlwl.AiMian.ui.home.ContentCard
import com.xlwl.AiMian.ui.home.HomeScreen
import com.xlwl.AiMian.ui.ai.AiJobSelectionScreen
import com.xlwl.AiMian.ui.jobs.CompanyDetailRoute
import com.xlwl.AiMian.ui.jobs.EditIntentionJobScreen
import com.xlwl.AiMian.ui.jobs.JobDetailRoute
import com.xlwl.AiMian.ui.jobs.JobSelectionScreen
import com.xlwl.AiMian.ui.assessment.InterviewEndScreen
import com.xlwl.AiMian.ui.jobs.JobsScreen
import com.xlwl.AiMian.ui.assessment.AssessmentCategoryRoute
import com.xlwl.AiMian.ui.assessment.AssessmentHomeRoute
import com.xlwl.AiMian.ui.assessment.AssessmentResultRoute
import com.xlwl.AiMian.ui.assessment.AssessmentTakeRoute
import com.xlwl.AiMian.ui.messages.MessageCenterRoute
import com.xlwl.AiMian.ui.messages.MessageComposeRoute
import com.xlwl.AiMian.ui.messages.MessageDetailRoute
import com.xlwl.AiMian.ui.profile.MyPostsRoute
import com.xlwl.AiMian.ui.profile.ProfileScreen
import com.xlwl.AiMian.ui.profile.ProfileSettingsRoute
import com.xlwl.AiMian.ui.profile.ContactUsRoute
import com.xlwl.AiMian.ui.profile.ResumeReportRoute
import com.xlwl.AiMian.ui.profile.VerificationRoute
import com.xlwl.AiMian.ui.profile.JobFavoritesRoute
import com.xlwl.AiMian.ui.profile.PostFavoritesRoute
import com.xlwl.AiMian.ui.profile.DeliveryListRoute
import com.xlwl.AiMian.ui.profile.PersonalInfoRoute
import com.xlwl.AiMian.ui.profile.PrivacyPermissionsRoute
import com.xlwl.AiMian.ui.profile.PrivacyPolicyScreen
import com.xlwl.AiMian.ui.profile.UserInstructionsScreen
import kotlinx.coroutines.launch
import java.net.URLDecoder
import java.net.URLEncoder

private const val JOB_PREFERENCES_UPDATED_KEY = "job_preferences_updated"
private const val JOB_PREFERENCES_PAYLOAD_KEY = "job_preferences_payload"

@Composable
fun AppNavHost(navController: NavHostController) {
    val context = LocalContext.current
    val authManager = remember { AuthManager(context) }
    val token by authManager.tokenFlow.collectAsState(initial = null)
    val userJson by authManager.userJsonFlow.collectAsState(initial = null)
    val hasSeenGuide by authManager.interviewGuideSeenFlow.collectAsState(initial = false)
    val lastAiJobId by authManager.lastAiJobIdFlow.collectAsState(initial = null)
    val lastAiJobCategoryId by authManager.lastAiJobCategoryIdFlow.collectAsState(initial = null)
    val coroutineScope = rememberCoroutineScope()
    val isHandlingUnauthorized = remember { mutableStateOf(false) }
    val handleUnauthorized = remember(authManager, navController) {
        {
            if (!isHandlingUnauthorized.value) {
                isHandlingUnauthorized.value = true
                coroutineScope.launch {
                    authManager.clear()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.HOME) { inclusive = true }
                        launchSingleTop = true
                    }
                    isHandlingUnauthorized.value = false
                }
            }
        }
    }
    val client = remember(token) {
        RetrofitClient.createOkHttpClient(
            tokenProvider = { token },
            onUnauthorized = handleUnauthorized
        )
    }
    val authApi = remember(client) { RetrofitClient.createService(AuthApi::class.java, client) }
    val apiService = remember(client) { RetrofitClient.createService(ApiService::class.java, client) }
    val jobDictionaryApi = remember(client) { RetrofitClient.createService(JobDictionaryApi::class.java, client) }
    val aiInterviewApi = remember(client) { RetrofitClient.createService(AiInterviewApi::class.java, client) }
    val ossApi = remember(client) { RetrofitClient.createService(OssApi::class.java, client) }
    val aiInterviewRepository = remember(aiInterviewApi) { AiInterviewRepository(aiInterviewApi) }
    val ossRepository = remember(ossApi) { OssRepository(ossApi) }
    val authRepo = remember(authApi) { AuthRepository(authApi) }
    val contentRepo = remember(apiService) { ContentRepository(apiService) }
    val messageRepo = remember(apiService) { MessageRepository(apiService) }
    val verificationRepo = remember(apiService) { VerificationRepository(apiService) }
    val jobRepo = remember(apiService) { JobRepository(apiService) }
    val jobPreferenceRepo = remember(apiService) { JobPreferenceRepository(apiService) }
    val jobDictionaryRepo = remember(jobDictionaryApi) { JobDictionaryRepository(jobDictionaryApi) }
    val appUpdateRepo = remember(apiService) { AppUpdateRepository(apiService) }
    val userRepo = remember(apiService) { UserRepository(apiService) }
    var latestAppVersion by remember { mutableStateOf<AppVersionInfo?>(null) }
    var agreementsAgreed by remember { mutableStateOf(false) }
    val openDownload = remember(context) {
        { url: String ->
            if (url.isBlank()) {
                Toast.makeText(context, "下载链接不可用", Toast.LENGTH_LONG).show()
                return@remember
            }
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { context.startActivity(intent) }
                .onFailure { Toast.makeText(context, "无法打开下载链接", Toast.LENGTH_LONG).show() }
        }
    }
    val gson = remember { Gson() }
    val currentUserId = remember(userJson) {
        userJson?.let { json ->
            runCatching { gson.fromJson(json, User::class.java) }.getOrNull()?.id
        }
    }
    val requireLogin: ((() -> Unit)?) -> Unit = remember(token) {
        { onGranted ->
            if (token.isNullOrEmpty()) {
                navController.navigate(LOGIN) {
                    launchSingleTop = true
                }
            } else {
                onGranted?.invoke()
            }
        }
    }
    LaunchedEffect(appUpdateRepo) {
        val result = appUpdateRepo.checkUpdate(BuildConfig.VERSION_CODE)
        result.onSuccess { info -> latestAppVersion = info }
            .onFailure { throwable ->
                Log.w("AppUpdate", "检测更新失败: ${throwable.message}")
            }
    }
    val forceUpdateInfo = remember(latestAppVersion) {
        latestAppVersion?.takeIf { info ->
            val hasNewer = info.versionCode > BuildConfig.VERSION_CODE
            val shouldUpdate = info.shouldUpdate || hasNewer
            shouldUpdate && (info.forceUpdate || info.isMandatory)
        }
    }

    val handleBannerClick: (com.xlwl.AiMian.ui.components.BannerData) -> Unit = { banner ->
        requireLogin {
            when (banner.linkType) {
                "post" -> {
                    banner.linkId?.let { id ->
                        navController.navigate("content/${URLEncoder.encode(id, "UTF-8")}")
                    }
                }
                "company" -> {
                    banner.linkId?.let { id ->
                        navController.navigate("${Routes.COMPANY}/${URLEncoder.encode(id, "UTF-8")}")
                    }
                }
                "assessment" -> {
                    banner.linkId?.let { id ->
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_TAKE}/${URLEncoder.encode(id, "UTF-8")}") {
                            launchSingleTop = true
                        }
                    }
                }
                "webview", "third_party" -> {
                    banner.linkId?.let { url ->
                        if (url.isNotBlank()) {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            runCatching { context.startActivity(intent) }
                                .onFailure { Toast.makeText(context, "无法打开链接", Toast.LENGTH_SHORT).show() }
                        }
                    }
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = navController, 
            startDestination = Routes.HOME,
            enterTransition = {
                androidx.compose.animation.slideInHorizontally(
                    initialOffsetX = { 300 },
                    animationSpec = androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)
                ) + androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300))
            },
            exitTransition = {
                androidx.compose.animation.slideOutHorizontally(
                    targetOffsetX = { -300 },
                    animationSpec = androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)
                ) + androidx.compose.animation.fadeOut(animationSpec = androidx.compose.animation.core.tween(300))
            },
            popEnterTransition = {
                androidx.compose.animation.slideInHorizontally(
                    initialOffsetX = { -300 },
                    animationSpec = androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)
                ) + androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300))
            },
            popExitTransition = {
                androidx.compose.animation.slideOutHorizontally(
                    targetOffsetX = { 300 },
                    animationSpec = androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)
                ) + androidx.compose.animation.fadeOut(animationSpec = androidx.compose.animation.core.tween(300))
            }
        ) {
            // 首页
            composable(Routes.HOME) {
                HomeScreen(
                    repository = contentRepo,
                    onCardClick = { card ->
                        when (card.targetType) {
                            HomeFeedTargetType.JOB -> {
                                navController.navigate("${Routes.JOB_DETAIL}/${URLEncoder.encode(card.targetId, "UTF-8")}")
                            }
                            HomeFeedTargetType.COMPANY -> {
                                navController.navigate("${Routes.COMPANY}/${URLEncoder.encode(card.targetId, "UTF-8")}")
                            }
                            HomeFeedTargetType.POST -> {
                                navController.navigate("circle/${URLEncoder.encode(card.targetId, "UTF-8")}")
                            }
                            else -> {
                                // 处理其他可能的内容类型，回退到帖子详情
                                navController.navigate("circle/${URLEncoder.encode(card.targetId, "UTF-8")}")
                            }
                        }
                    },
                    onSearchClick = {
                        navController.navigate(Routes.JOBS)
                    },
                    onBannerClick = handleBannerClick
                )
            }

        // 职岗页面
        composable(Routes.JOBS) { backStackEntry ->
            val savedStateHandle = backStackEntry.savedStateHandle
            val preferenceRefreshSignal by savedStateHandle
                .getStateFlow<Long?>(JOB_PREFERENCES_UPDATED_KEY, null)
                .collectAsState()
            val preferencePayload by savedStateHandle
                .getStateFlow<JobPreferenceDto?>(JOB_PREFERENCES_PAYLOAD_KEY, null)
                .collectAsState()

            JobsScreen(
                repository = jobRepo,
                preferenceRepository = jobPreferenceRepo,
                // ... other props ...
                preferenceRefreshSignal = preferenceRefreshSignal,
                preferencePayload = preferencePayload,
                onPreferenceRefreshConsumed = {
                    savedStateHandle.remove<Long>(JOB_PREFERENCES_UPDATED_KEY)
                },
                onPreferencePayloadConsumed = {
                    savedStateHandle.remove<JobPreferenceDto>(JOB_PREFERENCES_PAYLOAD_KEY)
                },
                onJobClick = { jobId ->
                    requireLogin {
                        navController.navigate(
                            "${Routes.JOB_DETAIL}/${URLEncoder.encode(jobId, "UTF-8")}",
                        ) {
                            launchSingleTop = true
                        }
                    }
                },
                onCompanyClick = { companyId ->
                    requireLogin {
                        navController.navigate(
                            "${Routes.COMPANY}/${URLEncoder.encode(companyId, "UTF-8")}",
                        ) {
                            launchSingleTop = true
                        }
                    }
                },
                onEditIntentionClick = {
                    navController.navigate(Routes.EDIT_INTENTION) { launchSingleTop = true }
                },
                onJobSelectionClick = {
                    navController.navigate(Routes.JOB_SELECTION) { launchSingleTop = true }
                }
            )
        }

        // 意向职岗编辑
        composable(Routes.EDIT_INTENTION) {
            EditIntentionJobScreen(
                repository = jobDictionaryRepo,
                preferenceRepository = jobPreferenceRepo,
                onBack = { navController.popBackStack() },
                onSaved = { dto ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.let { handle ->
                            handle.set(JOB_PREFERENCES_UPDATED_KEY, System.currentTimeMillis())
                            handle.set(JOB_PREFERENCES_PAYLOAD_KEY, dto)
                        }
                    navController.popBackStack()
                }
            )
        }

        // 职岗选择页面
        composable(Routes.JOB_SELECTION) {
            JobSelectionScreen(
                repository = jobDictionaryRepo,
                preferenceRepository = jobPreferenceRepo,
                onBack = { navController.popBackStack() },
                onSave = { dto ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.let { handle ->
                            handle.set(JOB_PREFERENCES_UPDATED_KEY, System.currentTimeMillis())
                            handle.set(JOB_PREFERENCES_PAYLOAD_KEY, dto)
                        }
                    navController.popBackStack()
                }
            )
        }

        // 企业详情页
        composable("${Routes.COMPANY}/{id}") { backStackEntry ->
            val encoded = backStackEntry.path("id")
            val companyId = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) {
                        launchSingleTop = true
                    }
                }
            } else {
                CompanyDetailRoute(
                    repository = jobRepo,
                    companyId = companyId,
                    onBack = { navController.popBackStack() },
                    onRoleClick = { roleId ->
                        navController.navigate(
                            "${Routes.JOB_DETAIL}/${URLEncoder.encode(roleId, "UTF-8")}",
                        ) {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        // 岗位详情页
        composable("${Routes.JOB_DETAIL}/{id}") { backStackEntry ->
            val encoded = backStackEntry.path("id")
            val jobId = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) {
                        launchSingleTop = true
                    }
                }
            } else {
                JobDetailRoute(
                    repository = jobRepo,
                    aiInterviewRepository = aiInterviewRepository,
                    jobId = jobId,
                    onBack = { navController.popBackStack() },
                    onJobClick = { relatedJobId ->
                        navController.navigate(
                            "${Routes.JOB_DETAIL}/${URLEncoder.encode(relatedJobId, "UTF-8")}",
                        ) {
                            launchSingleTop = true
                        }
                    },
                    onCompanyClick = { companyId ->
                        navController.navigate(
                            "${Routes.COMPANY}/${URLEncoder.encode(companyId, "UTF-8")}",
                        ) {
                            launchSingleTop = true
                        }
                    },
                    onStartInterview = { position, category, jobId ->
                        val safePosition = position.ifBlank { "AI 面试岗位" }
                        val safeCategory = category.ifBlank { "通用岗位" }
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_position", safePosition)
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_category", safeCategory)
                        if (jobId.isNullOrBlank()) {
                            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("selected_job_id")
                        } else {
                            navController.currentBackStackEntry?.savedStateHandle?.set("selected_job_id", jobId)
                        }
                        
                        // 如果已经上传过自拍，则直接进入数字人面试
                        val destination = if (hasSeenGuide) Routes.DIGITAL_INTERVIEW else Routes.DIGITAL_INTERVIEW_PRECAUTIONS
                        navController.navigate(destination) {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        // AI面试页面
        composable(Routes.AI) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) {
                        launchSingleTop = true
                    }
                }
            } else {
                AiJobSelectionScreen(
                    repository = jobDictionaryRepo,
                    preferenceRepository = jobPreferenceRepo,
                    lastSelectedPositionId = lastAiJobId,
                    lastSelectedCategoryId = lastAiJobCategoryId,
                    onBack = { navController.popBackStack() },
                    onStartInterview = { position, category ->
                        coroutineScope.launch {
                            authManager.setLastAiJobSelection(position.id, category.id)
                        }
                        val categoryName = category.name.ifBlank { "互联网/AI" }
                        backStackEntry.savedStateHandle.set("selected_position", position.name)
                        backStackEntry.savedStateHandle.set("selected_category", categoryName)
                        backStackEntry.savedStateHandle.set("selected_job_id", position.id)
                        
                        // 如果已经上传过自拍，则直接进入数字人面试
                        val destination = if (hasSeenGuide) Routes.DIGITAL_INTERVIEW else Routes.DIGITAL_INTERVIEW_PRECAUTIONS
                        navController.navigate(destination) {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }



        // 职圈页面
        composable(Routes.CIRCLE) { backStackEntry ->
            CircleRoute(
                repository = contentRepo,
                backStackEntry = backStackEntry,
                onCardClick = { card ->
                    requireLogin {
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("selected_card", card.fallbackCard)
                        navController.navigate("circle/${URLEncoder.encode(card.id, "UTF-8")}")
                    }
                },
                onSearchClick = {
                    requireLogin {
                        navController.navigate(
                            "${Routes.CIRCLE_TOPIC}/${URLEncoder.encode("search", "UTF-8")}/${URLEncoder.encode("search", "UTF-8")}"
                        )
                    }
                },
                onCreatePost = {
                    requireLogin {
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("create_post_refresh_key", "should_refresh_circle")
                        navController.navigate(Routes.CREATE_POST) {
                            launchSingleTop = true
                        }
                    }
                },
                onBannerClick = handleBannerClick
            )
        }

        composable(Routes.CREATE_POST) { backStackEntry ->
            val sourceEntry = navController.previousBackStackEntry
            val targetEntry = sourceEntry ?: backStackEntry
            val refreshKey = sourceEntry
                ?.savedStateHandle
                ?.get<String>("create_post_refresh_key")
                ?: "should_refresh_circle"
            CreatePostRoute(
                repository = contentRepo,
                backStackEntry = targetEntry,
                onBack = { navController.popBackStack() },
                onPublished = {
                    sourceEntry
                        ?.savedStateHandle
                        ?.set(refreshKey, true)
                    sourceEntry
                        ?.savedStateHandle
                        ?.remove<String>("create_post_refresh_key")
                    navController.popBackStack()
                }
            )
        }

        // 我的页面
        composable(Routes.PROFILE) {
            ProfileScreen(
                navController = navController,
                userRepository = userRepo,
                authRepository = authRepo,
                ossRepository = ossRepository,
                contentRepository = contentRepo,
                authManager = authManager,
                onBannerClick = handleBannerClick
            )
        }

        composable(Routes.PROFILE_VERIFICATION) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                VerificationRoute(
                    repository = verificationRepo,
                    authManager = authManager,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(Routes.PROFILE_SETTINGS) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                ProfileSettingsRoute(
                    authManager = authManager,
                    onBack = { navController.popBackStack() },
                    onLogoutSuccess = {
                        navController.navigate(Routes.PROFILE) {
                            popUpTo(Routes.PROFILE) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    onNavigatePersonalInfo = { navController.navigate(Routes.PROFILE_PERSONAL_INFO) { launchSingleTop = true } },
                    onNavigatePrivacy = { navController.navigate(Routes.PROFILE_PRIVACY) { launchSingleTop = true } }
                )
            }
        }

        composable(Routes.PROFILE_PERSONAL_INFO) {
            val profileViewModel: ProfileViewModel = viewModel(
                factory = ProfileViewModel.provideFactory(userRepo, authRepo, ossRepository, contentRepo, authManager)
            )
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PersonalInfoRoute(
                    viewModel = profileViewModel,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(Routes.PROFILE_PRIVACY) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PrivacyPermissionsRoute(onBack = { navController.popBackStack() })
            }
        }

        composable(Routes.PROFILE_CONTACT) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                ContactUsRoute(
                    onBack = { navController.popBackStack() },
                    onOpenMessages = {
                        navController.navigate(Routes.PROFILE_MESSAGE_COMPOSE) { launchSingleTop = true }
                    }
                )
            }
        }

        composable(Routes.PROFILE_JOB_FAVORITES) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                JobFavoritesRoute(onBack = { navController.popBackStack() })
            }
        }

        composable(Routes.PROFILE_POST_FAVORITES) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PostFavoritesRoute(onBack = { navController.popBackStack() })
            }
        }

        composable("${Routes.PROFILE_DELIVERIES}/{status}") { backStackEntry ->
            val statusKey = backStackEntry.path("status")
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                DeliveryListRoute(
                    statusKey = statusKey,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = "${Routes.PROFILE_RESUME_REPORT}?sessionId={sessionId}",
            arguments = listOf(
                navArgument("sessionId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getString("sessionId")
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                ResumeReportRoute(
                    repository = aiInterviewRepository,
                    initialSessionId = sessionId,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(Routes.PROFILE_MY_POSTS) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                MyPostsRoute(
                    repository = contentRepo,
                    backStackEntry = backStackEntry,
                    onBack = { navController.popBackStack() },
                    onCreatePost = {
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("create_post_refresh_key", "should_refresh_my_posts")
                        navController.navigate(Routes.CREATE_POST) { launchSingleTop = true }
                    },
                    onPostClick = { postId ->
                        navController.navigate("circle/${URLEncoder.encode(postId, "UTF-8")}")
                    }
                )
            }
        }

        composable(
            route = "${Routes.PROFILE_MESSAGES}?filter={filter}",
            arguments = listOf(
                navArgument("filter") {
                    type = NavType.StringType
                    defaultValue = "ALL"
                    nullable = true
                }
            )
        ) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                val filterKey = backStackEntry.arguments?.getString("filter")
                MessageCenterRoute(
                    repository = messageRepo,
                    backStackEntry = backStackEntry,
                    initialType = com.xlwl.AiMian.ui.messages.MessageType.fromKey(filterKey),
                    onBack = { navController.popBackStack() },
                    onMessageSelected = { messageId ->
                        navController.navigate("${Routes.PROFILE_MESSAGE_DETAIL}/${URLEncoder.encode(messageId, "UTF-8")}")
                    },
                    onCompose = {
                        navController.navigate(Routes.PROFILE_MESSAGE_COMPOSE) { launchSingleTop = true }
                    }
                )
            }
        }

        composable("${Routes.PROFILE_MESSAGE_DETAIL}/{messageId}") { backStackEntry ->
            val encoded = backStackEntry.path("messageId")
            val messageId = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                MessageDetailRoute(
                    repository = messageRepo,
                    messageId = messageId,
                    onBack = { navController.popBackStack() },
                    onMessagesShouldRefresh = {
                        navController.previousBackStackEntry
                            ?.savedStateHandle
                            ?.set("should_refresh_messages", true)
                    }
                )
            }
        }

        composable(Routes.PROFILE_MESSAGE_COMPOSE) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                MessageComposeRoute(
                    repository = messageRepo,
                    onBack = { navController.popBackStack() },
                    onMessageCreated = { detail ->
                        navController.previousBackStackEntry
                            ?.savedStateHandle
                            ?.set("should_refresh_messages", true)
                        navController.popBackStack()
                        navController.navigate("${Routes.PROFILE_MESSAGE_DETAIL}/${URLEncoder.encode(detail.id, "UTF-8")}") {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        composable(Routes.PROFILE_ASSESSMENTS) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                AssessmentHomeRoute(
                    repository = contentRepo,
                    backStackEntry = backStackEntry,
                    onBack = { navController.popBackStack() },
                    onCategorySelected = { category ->
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_CATEGORY}/${URLEncoder.encode(category.id, "UTF-8")}/${URLEncoder.encode(category.name, "UTF-8")}")
                    },
                    onAssessmentSelected = { assessment ->
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_TAKE}/${URLEncoder.encode(assessment.id, "UTF-8")}") {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        composable("${Routes.PROFILE_ASSESSMENT_CATEGORY}/{categoryId}/{categoryName}") { backStackEntry ->
            val categoryId = backStackEntry.path("categoryId")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val categoryName = backStackEntry.path("categoryName")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                AssessmentCategoryRoute(
                    repository = contentRepo,
                    categoryId = categoryId,
                    categoryName = categoryName,
                    onBack = { navController.popBackStack() },
                    onAssessmentSelected = { assessment ->
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_TAKE}/${URLEncoder.encode(assessment.id, "UTF-8")}") {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        composable("${Routes.PROFILE_ASSESSMENT_TAKE}/{assessmentId}") { backStackEntry ->
            val assessmentId = backStackEntry.path("assessmentId")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                AssessmentTakeRoute(
                    repository = contentRepo,
                    assessmentId = assessmentId,
                    initialDetail = null,
                    userId = currentUserId,
                    assessmentTitle = null,
                    onBack = { navController.popBackStack() },
                    onSubmitSuccess = { result ->
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("assessment_result_json", gson.toJson(result))
                        val encoded = URLEncoder.encode(gson.toJson(result), "UTF-8")
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_RESULT}?result=$encoded") { launchSingleTop = true }
                    }
                )
            }
        }

        composable(
            route = "${Routes.PROFILE_ASSESSMENT_RESULT}?result={result}",
            arguments = listOf(
                navArgument("result") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                val argResult = entry.arguments?.getString("result")
                val resultJson = argResult ?: navController.previousBackStackEntry
                    ?.savedStateHandle
                    ?.remove<String>("assessment_result_json")
                val resultTitle = navController.previousBackStackEntry
                    ?.savedStateHandle
                    ?.remove<String>("assessment_result_title")
                val result = resultJson?.let { gson.fromJson(it, AssessmentResult::class.java) }
                AssessmentResultRoute(
                    result = result,
                    assessmentTitle = resultTitle,
                    onBack = {
                        navController.popBackStack(Routes.PROFILE_ASSESSMENTS, false)
                    },
                    onViewRecords = null
                )
            }
        }

        // 面试准备页
        composable("${Routes.PREP}/{position}") { backStackEntry ->
            val encoded = backStackEntry.path("position")
            val position = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val flowState = remember {
                navController.previousBackStackEntry?.savedStateHandle?.get<AiInterviewFlowState>("ai_interview_flow")
            }
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PrepRoute(
                    navController = navController,
                    position = position,
                    flowState = flowState
                )
            }
        }

        composable("${Routes.SESSION}/{sessionId}") { backStackEntry ->
            val encoded = backStackEntry.path("sessionId")
            val sessionId = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val initialFlowState = remember(sessionId) {
                navController.previousBackStackEntry?.savedStateHandle?.remove<AiInterviewFlowState>("ai_interview_flow")
            }
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                InterviewSessionRoute(
                    sessionId = sessionId,
                    initialState = initialFlowState,
                    repository = aiInterviewRepository,
                    ossRepository = ossRepository,
                    onClose = {
                        val popped = navController.popBackStack(Routes.HOME, false)
                        if (!popped) {
                            navController.navigate(Routes.HOME) {
                                popUpTo(Routes.HOME) { inclusive = false }
                                launchSingleTop = true
                            }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("content/{id}") { backStackEntry ->
            val encoded = backStackEntry.path("id")
            val id = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val fallbackCard = navController.previousBackStackEntry?.savedStateHandle?.remove<ContentCard>("selected_card")
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PostDetailRoute(
                    postId = id,
                    repository = contentRepo,
                    fallbackCard = fallbackCard,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("${Routes.CIRCLE_TOPIC}/{topicId}/{topicTitle}") { backStackEntry ->
            val encodedId = backStackEntry.path("topicId")
            val topicId = encodedId?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val encodedTitle = backStackEntry.path("topicTitle")
            val topicTitle = encodedTitle?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                TopicAggregationRoute(
                    topicId = topicId,
                    topicTitle = topicTitle,
                    onBack = { navController.popBackStack() },
                    onPostClick = { postId ->
                        navController.navigate("circle/${URLEncoder.encode(postId, "UTF-8")}")
                    }
                )
            }
        }

        composable("circle/{id}") { backStackEntry ->
            val encoded = backStackEntry.path("id")
            val id = encoded?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val fallbackCard = navController.previousBackStackEntry?.savedStateHandle?.remove<ContentCard>("selected_card")
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                PostDetailRoute(
                    postId = id,
                    repository = contentRepo,
                    fallbackCard = fallbackCard,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        // 登录 - 使用新的登录流程
        composable(Routes.LOGIN) {
            LoginFlowScreen(
                repo = authRepo,
                onLoginSuccess = { token, userJson ->
                    coroutineScope.launch {
                        authManager.setToken(token)
                        authManager.setUserJson(userJson)
                    }
                    navController.popBackStack()
                    navController.navigate(Routes.PROFILE)
                },
                onGoRegister = { navController.navigate(Routes.REGISTER) },
                agreed = agreementsAgreed,
                onAgreedChange = { agreementsAgreed = it },
                onNavigatePrivacy = { navController.navigate(Routes.PRIVACY_POLICY) },
                onNavigateUserInstructions = { navController.navigate(Routes.USER_INSTRUCTIONS) }
            )
        }

        // 注册
        composable(Routes.REGISTER) {
            RegisterScreen(
                repo = authRepo,
                onRegisterSuccess = { token, userJson ->
                    coroutineScope.launch {
                        authManager.setToken(token)
                        authManager.setUserJson(userJson)
                    }
                    navController.popBackStack()
                    navController.navigate(Routes.PROFILE)
                },
                onGoLogin = { navController.popBackStack(); navController.navigate(Routes.LOGIN) },
                isAgreed = agreementsAgreed,
                onAgreedChange = { agreementsAgreed = it },
                onNavigatePrivacy = { navController.navigate(Routes.PRIVACY_POLICY) },
                onNavigateUserInstructions = { navController.navigate(Routes.USER_INSTRUCTIONS) }
            )
        }

        // AI面试前置引导 - 面试注意事项
        composable(Routes.DIGITAL_INTERVIEW_PRECAUTIONS) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                InterviewPrecautionsScreen(
                    onBack = { navController.popBackStack() },
                    onNext = {
                        val sourceEntry = navController.previousBackStackEntry
                        val pos = sourceEntry?.savedStateHandle?.get<String>("selected_position") ?: backStackEntry.savedStateHandle.get<String>("selected_position")
                        val cat = sourceEntry?.savedStateHandle?.get<String>("selected_category") ?: backStackEntry.savedStateHandle.get<String>("selected_category")
                        val jId = sourceEntry?.savedStateHandle?.get<String>("selected_job_id") ?: backStackEntry.savedStateHandle.get<String>("selected_job_id")
                        
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_position", pos)
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_category", cat)
                        if (jId != null) {
                            navController.currentBackStackEntry?.savedStateHandle?.set("selected_job_id", jId)
                        } else {
                            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("selected_job_id")
                        }
                        navController.navigate(Routes.DIGITAL_INTERVIEW_CAMERA_TEST) { launchSingleTop = true }
                    }
                )
            }
        }

        // AI面试前置引导 - 相机测试
        composable(Routes.DIGITAL_INTERVIEW_CAMERA_TEST) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                InterviewCameraTestScreen(
                    repository = aiInterviewRepository,
                    onBack = { navController.popBackStack() },
                    onNext = {
                        val sourceEntry = navController.previousBackStackEntry
                        val pos = sourceEntry?.savedStateHandle?.get<String>("selected_position") ?: backStackEntry.savedStateHandle.get<String>("selected_position")
                        val cat = sourceEntry?.savedStateHandle?.get<String>("selected_category") ?: backStackEntry.savedStateHandle.get<String>("selected_category")
                        val jId = sourceEntry?.savedStateHandle?.get<String>("selected_job_id") ?: backStackEntry.savedStateHandle.get<String>("selected_job_id")
                        
                        // 标记已完成引导流程（自拍上传成功）
                        coroutineScope.launch {
                            authManager.setInterviewGuideSeen(true)
                        }

                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_position", pos)
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_category", cat)
                        if (jId != null) {
                            navController.currentBackStackEntry?.savedStateHandle?.set("selected_job_id", jId)
                        } else {
                            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("selected_job_id")
                        }
                        navController.navigate(Routes.DIGITAL_INTERVIEW) { launchSingleTop = true }
                    }
                )
            }
        }


        // 数字人面试页面 - DUIX 数字人全屏体验
        composable(Routes.DIGITAL_INTERVIEW) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) {
                        launchSingleTop = true
                    }
                }
            } else {
                val sourceEntry = navController.previousBackStackEntry
                val selectedPosition = remember(sourceEntry) {
                    sourceEntry?.savedStateHandle?.get<String>("selected_position")
                        ?: backStackEntry.savedStateHandle.get<String>("selected_position")
                        ?: "产品经理"
                }
                val selectedCategory = remember(sourceEntry) {
                    sourceEntry?.savedStateHandle?.get<String>("selected_category")
                        ?: backStackEntry.savedStateHandle.get<String>("selected_category")
                        ?: "互联网/AI"
                }
                val selectedJobId = remember(sourceEntry) {
                    sourceEntry?.savedStateHandle?.get<String>("selected_job_id")
                        ?: backStackEntry.savedStateHandle.get<String>("selected_job_id")
                }
                var isLoading by remember { mutableStateOf(true) }
                var errorMessage by remember { mutableStateOf<String?>(null) }
                var sessionData by remember { mutableStateOf<AiInterviewCreateSessionData?>(null) }
                var reloadKey by remember { mutableIntStateOf(0) }

                LaunchedEffect(selectedPosition, selectedCategory, reloadKey) {
                    isLoading = true
                    errorMessage = null
                    sessionData = null
                    val request = CreateAiInterviewSessionRequest(
                        jobId = selectedJobId,
                        jobTarget = selectedPosition,
                        jobCategory = selectedCategory.takeIf { it.isNotBlank() },
                        jobSubCategory = selectedPosition,
                        questionCount = null
                    )
                    val result = aiInterviewRepository.createSession(request)
                    result.onSuccess { data ->
                        sessionData = data
                    }.onFailure { throwable ->
                        errorMessage = humanizeDigitalInterviewStartError(throwable)
                    }
                    isLoading = false
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0C1220)),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        isLoading -> {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                CircularProgressIndicator(color = Color.White)
                                Text(
                                    text = "正在唤起数字人面试服务…",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                        errorMessage != null -> {
                            Column(
                                modifier = Modifier.padding(horizontal = 24.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = errorMessage ?: "",
                                    color = Color.White,
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Button(
                                    onClick = {
                                        sessionData = null
                                        isLoading = true
                                        errorMessage = null
                                        reloadKey++
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFEC7C38),
                                        contentColor = Color.White
                                    )
                                ) {
                                    Text("重新尝试")
                                }
                                TextButton(onClick = { navController.popBackStack() }) {
                                    Text("返回上一页", color = Color.White.copy(alpha = 0.7f))
                                }
                            }
                        }
                        sessionData != null -> {
                            val data = sessionData!!
                            val isCompleted = data.status.equals("COMPLETED", ignoreCase = true) ||
                                (data.totalQuestions > 0 && data.currentQuestion >= data.totalQuestions)
                            if (isCompleted) {
                                LaunchedEffect(data.sessionId) {
                                    navController.navigate(Routes.INTERVIEW_COMPLETE) {
                                        popUpTo(Routes.DIGITAL_INTERVIEW) { inclusive = true }
                                    }
                                }
                            }
                            val currentQuestion = data.questions.find { it.questionIndex == data.currentQuestion }
                                ?: data.questions.minByOrNull { it.questionIndex }
                            if (!isCompleted) {
                                DuixAvatarInterviewScreen(
                                    projectId = com.xlwl.AiMian.config.AppConfig.aliyunAvatarProjectId,
                                    jobPositionLabel = selectedPosition,
                                    interviewQuestion = currentQuestion?.questionText ?: "请做一下自我介绍",
                                    interviewSessionId = data.sessionId,
                                    candidateUserId = currentUserId,
                                    aiInterviewRepository = aiInterviewRepository,
                                    onInterviewComplete = { sessionId ->
                                        Log.i("DigitalInterview", "收到面试完成回调，准备跳转。sessionId=$sessionId")
                                        coroutineScope.launch {
                                            runCatching {
                                                if (sessionId.isNotBlank()) {
                                                    aiInterviewRepository.complete(sessionId)
                                                }
                                            }.onFailure { error ->
                                                Log.w("DigitalInterview", "标记面试完成失败", error)
                                            }
                                        }
                                        navController.navigate(Routes.INTERVIEW_COMPLETE) {
                                            popUpTo(Routes.DIGITAL_INTERVIEW) { inclusive = true }
                                        }
                                    },
                                    onBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }
                        }
                        else -> {
                            CircularProgressIndicator(color = Color.White)
                        }
                    }
                }
            }
        }

        composable(Routes.INTERVIEW_COMPLETE) {
            InterviewEndScreen(
                onNavigateHome = {
                    val popped = navController.popBackStack(Routes.HOME, false)
                    if (!popped) {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    }
                }
            )
        }

        composable(Routes.PRIVACY_POLICY) {
            PrivacyPolicyScreen(
                onBack = {
                    agreementsAgreed = true
                    navController.popBackStack()
                }
            )
        }

        composable(Routes.USER_INSTRUCTIONS) {
            UserInstructionsScreen(
                onBack = {
                    agreementsAgreed = true
                    navController.popBackStack()
                }
            )
        }
        }

        if (forceUpdateInfo != null) {
            ForceUpdateDialog(
                info = forceUpdateInfo,
                onConfirm = { openDownload(forceUpdateInfo.downloadUrl) }
            )
        }
    }
}

@Composable
private fun ForceUpdateDialog(
    info: AppVersionInfo,
    onConfirm: () -> Unit
) {
    val notes = info.releaseNotes?.takeIf { it.isNotBlank() }
    AlertDialog(
        onDismissRequest = {},
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFEC7C38),
                    contentColor = Color.White
                )
            ) {
                Text("立即更新")
            }
        },
        title = { Text(text = "发现新版本 ${info.versionName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "当前版本需要升级后才能继续使用。",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "最新版本号：${info.versionName} (Code ${info.versionCode})",
                    style = MaterialTheme.typography.bodySmall
                )
                if (notes != null) {
                    Text(
                        text = "更新内容：",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold)
                    )
                    Text(
                        text = notes,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    )
}

/**
 * 创建会话会同步调用 LLM 生成多道题，常需 15–40 秒；中间层/弱网易出现英文 "timeout" raw message。
 */
private fun humanizeDigitalInterviewStartError(t: Throwable): String {
  val raw = t.message?.lowercase().orEmpty()
  return when {
    t is SocketTimeoutException -> "连接超时。生成面试题目需等待数十秒，请换稳定网络或在 Wi‑Fi 下重试。"
    t is IOException && ("timeout" in raw || "timed out" in raw) -> "请求超时。题目生成较慢，请稍后再试或检查是否走了仅允许短时长的代理/网关。"
    "timeout" in raw || "timed out" in raw -> "请求超时。题目生成较慢，请检查网络后重试。"
    else -> t.message?.takeIf { it.isNotBlank() } ?: "生成数字人面试会话失败，请稍后重试"
  }
}

@Composable
private fun androidx.navigation.NavBackStackEntry.path(key: String): String? =
    arguments?.getString(key)

@Composable
private fun DetailPlaceholder(title: String, message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.align(Alignment.Center),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
