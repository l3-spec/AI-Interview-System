package com.xlwl.AiMian.di

import android.app.Application
import com.example.v0clone.data.api.ApiService
import com.example.v0clone.data.api.GatewayApi
import com.example.v0clone.data.api.RetrofitClient
import com.xlwl.AiMian.data.local.EncryptedConfigStore
import com.xlwl.AiMian.data.repository.ClientRuntimeConfigRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * 依赖注入模块
 * 提供全局单例对象
 */
object AppModule {
    
    // Application Scope（用于后台任务）
    val applicationScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // API Service（ Retrofit 实例）
    lateinit var apiService: ApiService
        private set

    // 面试网关 REST API（与 backend-api 通信，替代 Socket.IO）
    lateinit var gatewayApi: GatewayApi
        private set
    
    // 加密配置存储
    lateinit var configStore: EncryptedConfigStore
        private set
    
    // 配置仓库
    lateinit var configRepository: ClientRuntimeConfigRepository
        private set
    
    /**
     * 初始化依赖（在 Application.onCreate() 中调用）
     */
    fun initialize(application: Application) {
        // 初始化 API Service
        val client = RetrofitClient.createOkHttpClient(
            tokenProvider = { null },  // 初始化时不需要 token
            onUnauthorized = null
        )
        apiService = RetrofitClient.createService(ApiService::class.java, client)
        gatewayApi = RetrofitClient.createService(GatewayApi::class.java, client)
        
        // 初始化加密存储
        configStore = EncryptedConfigStore(application)
        
        // 初始化配置仓库
        configRepository = ClientRuntimeConfigRepository(
            apiService = apiService,
            configStore = configStore,
            applicationScope = applicationScope
        )
    }
}
