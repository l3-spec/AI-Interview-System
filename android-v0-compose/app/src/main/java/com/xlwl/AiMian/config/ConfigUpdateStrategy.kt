package com.xlwl.AiMian.config

import android.content.Context
import android.util.Log
import com.xlwl.AiMian.di.AppModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * 配置更新策略
 * 
 * 管理配置在不同场景下的更新行为：
 * - 冷启动：使用本地缓存 + 后台检查更新
 * - 热启动（前台/后台切换）：检查是否过期
 * - 手动刷新：强制从服务器更新
 * - 推送通知：立即刷新配置
 */
object ConfigUpdateStrategy {
    
    private const val TAG = "ConfigUpdateStrategy"
    private const val RESUME_CHECK_HOURS = 6 // 回到前台时检查更新的阈值
    
    /**
     * 冷启动：使用本地缓存 + 后台检查更新
     * 在 Application.onCreate() 中调用
     */
    suspend fun onColdStart() {
        Log.i(TAG, "📱 冷启动：加载配置...")
        
        try {
            // getConfig() 内部会：
            // 1. 立即返回本地缓存
            // 2. 后台检查更新
            val config = AppModule.configRepository.getConfig()
            Log.i(TAG, "✅ 冷启动配置加载完成: version=${config.version}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ 冷启动配置加载失败", e)
            // 不抛出异常，允许 App 继续启动
        }
    }
    
    /**
     * 热启动（从后台切回前台）：检查是否过期
     * 在 Activity 的 onResume() 中调用
     */
    fun onResume(context: Context) {
        val configStore = com.xlwl.AiMian.data.local.EncryptedConfigStore(context)
        
        // 如果缓存超过 6 小时，后台刷新
        if (configStore.isExpired(hours = RESUME_CHECK_HOURS)) {
            Log.i(TAG, "🔄 热启动：缓存已过期，后台刷新配置...")
            
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    AppModule.configRepository.getConfig()
                } catch (e: Exception) {
                    Log.e(TAG, "❌ 热启动配置刷新失败", e)
                }
            }
        } else {
            Log.d(TAG, "✅ 热启动：缓存未过期，无需更新")
        }
    }
    
    /**
     * 用户手动触发刷新（设置页）
     */
    suspend fun onManualRefresh(): Result<Unit> {
        return try {
            Log.i(TAG, "🔄 手动刷新配置...")
            AppModule.configRepository.forceRefresh()
            Log.i(TAG, "✅ 手动刷新配置成功")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "❌ 手动刷新配置失败", e)
            Result.failure(e)
        }
    }
    
    /**
     * 收到推送通知：配置已更新
     * 后端可以通过推送通知客户端立即刷新配置
     */
    fun onPushNotification() {
        Log.i(TAG, "📩 收到配置更新推送，立即刷新...")
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                AppModule.configRepository.forceRefresh()
                Log.i(TAG, "✅ 推送触发配置刷新成功")
            } catch (e: Exception) {
                Log.e(TAG, "❌ 推送触发配置刷新失败", e)
            }
        }
    }
    
    /**
     * 获取当前缓存的配置信息（用于调试）
     */
    fun getConfigInfo(context: Context): String {
        val configStore = com.xlwl.AiMian.data.local.EncryptedConfigStore(context)
        val version = configStore.getCachedVersion() ?: "无缓存"
        val timestamp = configStore.getCacheTimestamp()
        val age = if (timestamp > 0) {
            val minutes = (System.currentTimeMillis() - timestamp) / 1000 / 60
            "${minutes}分钟"
        } else {
            "未知"
        }
        val isExpired = configStore.isExpired(hours = 24)
        
        return "版本: $version\n缓存时长: $age\n是否过期: $isExpired"
    }
}
