package com.xlwl.AiMian

import android.app.Application
import android.util.Log
import com.example.v0clone.config.AppConfig
import com.xlwl.AiMian.di.AppModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * AI 面试系统 Application 类
 * 
 * 职责：
 * 1. 初始化全局依赖（DI 模块）
 * 2. 预加载客户端配置（不阻塞启动）
 * 3. 提供全局 CoroutineScope
 */
class AiMianApplication : Application() {
    
    companion object {
        private const val TAG = "AiMianApplication"
        
        // 全局 Application Scope
        lateinit var applicationScope: CoroutineScope
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        
        Log.i(TAG, "🚀 AI 面试系统启动...")
        
        // 初始化全局 Scope
        applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        
        // 1. 初始化依赖注入模块
        AppModule.initialize(this)
        Log.i(TAG, "✅ 依赖注入模块初始化完成")
        
        // 2. 启动配置监听器（当配置更新时自动同步）
        AppConfig.startConfigListener(applicationScope)
        Log.i(TAG, "✅ 配置监听器已启动")
        
        // 3. 预加载配置（后台异步，不阻塞启动）
        preloadConfig()
    }
    
    /**
     * 预加载配置
     * 
     * 策略：
     * - 后台异步加载，不阻塞 App 启动
     * - 优先使用本地缓存（毫秒级）
     * - 后台检查服务器更新
     * - 首次启动时同步等待配置
     */
    private fun preloadConfig() {
        applicationScope.launch {
            try {
                Log.i(TAG, "📦 开始预加载配置...")
                
                val config = AppModule.configRepository.getConfig()
                
                Log.i(TAG, "✅ 配置预加载完成: version=${config.version}")
                Log.d(TAG, "📋 API Base URL: ${config.apiBaseUrl}")
                Log.d(TAG, "🔑 AccessKey ID: ${if (config.aliyunAccessKeyId.isNullOrEmpty()) "未配置" else "已配置"}")
                Log.d(TAG, "🎤 ASR WS URL: ${config.asrServiceWsUrl ?: "未配置"}")
                Log.d(TAG, "🔊 TTS WS URL: ${config.ttsServiceWsUrl ?: "未配置"}")
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ 配置预加载失败", e)
                
                // 注意：这里不抛出异常，允许 App 继续启动
                // 但在使用配置时会检查是否为空
            }
        }
    }
    
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        
        // 可以在这里处理内存紧张时的逻辑
        when (level) {
            TRIM_MEMORY_RUNNING_CRITICAL,
            TRIM_MEMORY_BACKGROUND -> {
                Log.w(TAG, "⚠️ 内存紧张: level=$level")
            }
        }
    }
}
