package com.xlwl.AiMian.navigation

import android.app.Application
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xlwl.AiMian.ai.DigitalInterviewScreen
import com.xlwl.AiMian.ai.DigitalInterviewViewModel
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.google.gson.Gson
import com.xlwl.AiMian.ai.guide.InterviewGuideRoute
import com.xlwl.AiMian.data.api.AiInterviewApi
import com.xlwl.AiMian.data.api.ApiService
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
import com.xlwl.AiMian.data.repository.JobDictionaryRepository
import com.xlwl.AiMian.data.repository.MessageRepository
import com.xlwl.AiMian.data.model.AiInterviewFlowState
import com.xlwl.AiMian.data.model.AiInterviewCreateSessionData
import com.xlwl.AiMian.data.model.CreateAiInterviewSessionRequest
import com.xlwl.AiMian.data.model.User
import com.xlwl.AiMian.data.model.AssessmentDetail
import com.xlwl.AiMian.data.model.AssessmentResult
import com.xlwl.AiMian.navigation.Routes.LOGIN
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
import com.xlwl.AiMian.ui.jobs.JobsScreen
import com.xlwl.AiMian.ui.assessment.AssessmentCategoryRoute
import com.xlwl.AiMian.ui.assessment.AssessmentDetailRoute
import com.xlwl.AiMian.ui.assessment.AssessmentHomeRoute
import com.xlwl.AiMian.ui.assessment.AssessmentResultRoute
import com.xlwl.AiMian.ui.assessment.AssessmentTakeRoute
import com.xlwl.AiMian.ui.messages.MessageCenterRoute
import com.xlwl.AiMian.ui.messages.MessageComposeRoute
import com.xlwl.AiMian.ui.messages.MessageDetailRoute
import com.xlwl.AiMian.ui.profile.MyPostsRoute
import com.xlwl.AiMian.ui.profile.ProfileScreen
import com.xlwl.AiMian.ui.profile.ProfileSettingsRoute
import com.xlwl.AiMian.ui.profile.ResumeReportRoute
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
    val client = remember(token) { RetrofitClient.createOkHttpClient { token } }
    val authApi = remember(client) { RetrofitClient.createService(AuthApi::class.java, client) }
    val apiService = remember(client) { RetrofitClient.createService(ApiService::class.java, client) }
    val jobDictionaryApi = remember(client) { RetrofitClient.createService(JobDictionaryApi::class.java, client) }
    val aiInterviewApi = remember(client) { RetrofitClient.createService(AiInterviewApi::class.java, client) }
    val aiInterviewRepository = remember(aiInterviewApi) { AiInterviewRepository(aiInterviewApi) }
    val authRepo = remember(authApi) { AuthRepository(authApi) }
    val contentRepo = remember(apiService) { ContentRepository(apiService) }
    val messageRepo = remember(apiService) { MessageRepository(apiService) }
    val jobRepo = remember(apiService) { JobRepository(apiService) }
    val jobPreferenceRepo = remember(apiService) { JobPreferenceRepository(apiService) }
    val jobDictionaryRepo = remember(jobDictionaryApi) { JobDictionaryRepository(jobDictionaryApi) }
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

    NavHost(navController = navController, startDestination = Routes.HOME) {
        // 首页 - 使用优化版HomeScreen（瀑布流+固定顶栏+加载更多）
        composable(Routes.HOME) {
            HomeScreen(
                repository = contentRepo,
                onCardClick = { card ->
                    requireLogin {
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_card", card)
                        navController.navigate("content/${URLEncoder.encode(card.id, "UTF-8")}")
                    }
                },
                onSearchClick = {
                    requireLogin {
                        navController.navigate(Routes.JOBS)
                    }
                }
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
                        if (hasSeenGuide) {
                            navController.currentBackStackEntry?.savedStateHandle?.set("selected_position", safePosition)
                            navController.currentBackStackEntry?.savedStateHandle?.set("selected_category", safeCategory)
                            if (jobId.isNullOrBlank()) {
                                navController.currentBackStackEntry?.savedStateHandle?.remove<String>("selected_job_id")
                            } else {
                                navController.currentBackStackEntry?.savedStateHandle?.set("selected_job_id", jobId)
                            }
                            navController.navigate(Routes.DIGITAL_INTERVIEW) {
                                launchSingleTop = true
                            }
                        } else {
                            if (jobId.isNullOrBlank()) {
                                navController.currentBackStackEntry?.savedStateHandle?.remove<String>("selected_job_id")
                            } else {
                                navController.currentBackStackEntry?.savedStateHandle?.set("selected_job_id", jobId)
                            }
                            navController.navigate(
                                "${Routes.GUIDE}/${URLEncoder.encode(safePosition, "UTF-8")}/${URLEncoder.encode(safeCategory, "UTF-8")}"
                            ) {
                                launchSingleTop = true
                            }
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
                        navController.navigate(Routes.DIGITAL_INTERVIEW) {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }

        composable("${Routes.GUIDE}/{position}/{category}") { backStackEntry ->
            val encodedPosition = backStackEntry.path("position")
            val encodedCategory = backStackEntry.path("category")
            val position = encodedPosition?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val category = encodedCategory?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            val aiEntry = navController.previousBackStackEntry
            val selectedJobId = aiEntry?.savedStateHandle?.get<String>("selected_job_id")
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) {
                        launchSingleTop = true
                    }
                }
            } else {
                InterviewGuideRoute(
                    position = position,
                    category = category,
                    jobId = selectedJobId,
                    repository = aiInterviewRepository,
                    onBack = { navController.popBackStack() },
                    onContinue = { flowState ->
                        coroutineScope.launch { authManager.setInterviewGuideSeen(true) }
                        aiEntry?.savedStateHandle?.set("ai_interview_flow", flowState)
                        val encoded = URLEncoder.encode(flowState.jobTarget, "UTF-8")
                        navController.navigate("${Routes.PREP}/$encoded") {
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
                }
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
            ProfileScreen(navController = navController) 
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
                    }
                )
            }
        }

        composable(Routes.PROFILE_RESUME_REPORT) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                ResumeReportRoute(
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

        composable(Routes.PROFILE_MESSAGES) { backStackEntry ->
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                MessageCenterRoute(
                    repository = messageRepo,
                    backStackEntry = backStackEntry,
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
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_DETAIL}/${URLEncoder.encode(assessment.id, "UTF-8")}")
                    }
                )
            }
        }

        composable("${Routes.PROFILE_ASSESSMENT_DETAIL}/{assessmentId}") { backStackEntry ->
            val assessmentId = backStackEntry.path("assessmentId")?.let { URLDecoder.decode(it, "UTF-8") } ?: ""
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                AssessmentDetailRoute(
                    repository = contentRepo,
                    assessmentId = assessmentId,
                    onBack = { navController.popBackStack() },
                    onStartAssessment = { detail ->
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("assessment_detail_json", gson.toJson(detail))
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("assessment_title", detail.title)
                        navController.navigate("${Routes.PROFILE_ASSESSMENT_TAKE}/${URLEncoder.encode(detail.id, "UTF-8")}") {
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
                val previousEntry = navController.previousBackStackEntry
                val detailJson = previousEntry?.savedStateHandle?.remove<String>("assessment_detail_json")
                val assessmentTitle = previousEntry?.savedStateHandle?.remove<String>("assessment_title")
                val initialDetail = detailJson?.let { gson.fromJson(it, AssessmentDetail::class.java) }
                AssessmentTakeRoute(
                    repository = contentRepo,
                    assessmentId = assessmentId,
                    initialDetail = initialDetail,
                    userId = currentUserId,
                    assessmentTitle = assessmentTitle,
                    onBack = { navController.popBackStack() },
                    onSubmitSuccess = { result ->
                        navController.currentBackStackEntry
                            ?.savedStateHandle
                            ?.set("assessment_result_json", gson.toJson(result))
                        assessmentTitle?.let {
                            navController.currentBackStackEntry
                                ?.savedStateHandle
                                ?.set("assessment_result_title", it)
                        }
                        navController.navigate(Routes.PROFILE_ASSESSMENT_RESULT) { launchSingleTop = true }
                    }
                )
            }
        }

        composable(Routes.PROFILE_ASSESSMENT_RESULT) {
            if (token.isNullOrEmpty()) {
                LaunchedEffect(Unit) {
                    navController.navigate(LOGIN) { launchSingleTop = true }
                }
            } else {
                val resultJson = navController.previousBackStackEntry
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
                onGoRegister = { navController.navigate(Routes.REGISTER) }
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
                onGoLogin = { navController.popBackStack(); navController.navigate(Routes.LOGIN) }
            )
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
                        errorMessage = throwable.message ?: "生成数字人面试会话失败，请稍后重试"
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
                            val firstQuestion = data.questions.minByOrNull { it.questionIndex }
                            val countdownSeconds = data.plannedDuration?.takeIf { it > 0 }?.let { it * 60 } ?: 180
                            val application = context.applicationContext as Application
                            val viewModelKey = "digitalInterview-${data.sessionId}-$reloadKey"
                            val viewModel: DigitalInterviewViewModel = viewModel(
                                key = viewModelKey,
                                factory = DigitalInterviewViewModel.Factory(
                                    application = application,
                                    position = selectedPosition,
                                    questionText = firstQuestion?.questionText ?: "请做一下自我介绍",
                                    currentQuestion = (firstQuestion?.questionIndex ?: 0) + 1,
                                    totalQuestions = data.totalQuestions,
                                    countdownSeconds = countdownSeconds,
                                    sessionId = data.sessionId
                                )
                            )
                            val uiState by viewModel.uiState.collectAsStateWithLifecycle()

                            DisposableEffect(viewModelKey) {
                                onDispose { viewModel.endSession() }
                            }

                            DigitalInterviewScreen(
                                uiState = uiState,
                                onStartAnswer = { viewModel.onStartAnswer() },
                                onRetry = { viewModel.retryConnection() }
                            )
                        }
                        else -> {
                            CircularProgressIndicator(color = Color.White)
                        }
                    }
                }
            }
        }
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
