package com.xlwl.AiMian.data.repository

import android.util.Log
import com.example.v0clone.data.api.ApiService
import com.example.v0clone.data.model.ClientRuntimeConfigDto
import com.xlwl.AiMian.data.local.EncryptedConfigStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 客户端运行时配置仓库
 * 
 * 职责：
 * 1. 管理配置的获取和缓存
 * 2. 实现本地缓存 + 版本号比对机制
 * 3. 后台异步检查配置更新
 * 4. 提供配置变化的通知机制
 * 
 * 架构设计：
 * ```
 * 启动 → 读取本地缓存（毫秒级）→ 立即可用
 *      ↓
 *   后台请求 /api/client-runtime-config
 *      ↓
 *   比较版本号 → 不同则更新缓存 + 通知 UI
 * ```
 */
class ClientRuntimeConfigRepository(
    private val apiService: ApiService,
    private val configStore: EncryptedConfigStore,
    private val applicationScope: CoroutineScope
) {
    
    companion object {
        private const val TAG = "ConfigRepository"
        private const val CACHE_EXPIRE_HOURS = 24 // 缓存过期时间：24小时
    }
    
    // 配置状态流（供 UI 观察）
    private val _config = MutableStateFlow<ClientRuntimeConfigDto?>(null)
    val config: StateFlow<ClientRuntimeConfigDto?> = _config.asStateFlow()
    
    /**
     * 获取配置（优先本地缓存，后台检查更新）
     * 
     * 执行流程：
     * 1. 先读本地缓存（毫秒级，不阻塞）
     * 2. 后台异步请求服务器检查更新
     * 3. 如果无缓存，则同步请求（首次启动）
     * 
     * @return 配置对象（如果有缓存立即返回，否则等待网络请求）
     */
    suspend fun getConfig(): ClientRuntimeConfigDto {
        // 1. 先读本地缓存
        val cached = configStore.read()
        _config.value = cached
        
        // 2. 后台异步检查更新（不阻塞当前流程）
        applicationScope.launch(Dispatchers.IO) {
            try {
                checkForUpdate(cached)
            } catch (e: Exception) {
                Log.e(TAG, "❌ 后台检查配置更新失败", e)
                // 静默失败，使用本地缓存
            }
        }
        
        // 3. 无缓存时同步请求（首次启动必须等待）
        return cached ?: fetchFromServer()
    }
    
    /**
     * 强制从服务器刷新配置
     * 用于用户手动触发刷新
     */
    suspend fun forceRefresh(): ClientRuntimeConfigDto {
        Log.i(TAG, "🔄 强制刷新配置...")
        return fetchFromServer().also { newConfig ->
            configStore.save(newConfig)
            _config.value = newConfig
            Log.i(TAG, "✅ 配置已强制刷新: version=${newConfig.version}")
        }
    }
    
    /**
     * 后台检查配置更新
     * 
     * 更新策略：
     * - 版本号不同 → 立即更新
     * - 缓存过期（>24小时）→ 后台更新
     * - 版本号相同且未过期 → 跳过
     */
    private suspend fun checkForUpdate(cached: ClientRuntimeConfigDto?) {
        Log.d(TAG, "🔍 后台检查配置更新...")
        
        try {
            val response = apiService.getClientRuntimeConfig()
            
            if (!response.success || response.data == null) {
                Log.w(TAG, "⚠️ 服务器返回配置失败: ${response.message}")
                return
            }
            
            val remoteConfig = response.data
            
            // 检查是否需要更新
            val needsUpdate = shouldUpdate(cached, remoteConfig)
            
            if (needsUpdate) {
                Log.i(TAG, "📦 发现新配置: ${cached?.version} → ${remoteConfig.version}")
                configStore.save(remoteConfig)
                _config.value = remoteConfig
                
                Log.i(TAG, "✅ 配置已自动更新")
            } else {
                Log.d(TAG, "✅ 配置已是最新: version=${remoteConfig.version}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ 检查配置更新失败", e)
            throw e
        }
    }
    
    /**
     * 判断是否需要更新配置
     */
    private fun shouldUpdate(
        cached: ClientRuntimeConfigDto?,
        remote: ClientRuntimeConfigDto
    ): Boolean {
        // 情况 1：无缓存，需要更新
        if (cached == null) {
            Log.d(TAG, "需要更新: 无本地缓存")
            return true
        }
        
        // 情况 2：版本号不同，需要更新
        if (cached.version != remote.version) {
            Log.d(TAG, "需要更新: 版本号变化 ${cached.version} → ${remote.version}")
            return true
        }
        
        // 情况 3：缓存过期，需要更新
        if (configStore.isExpired(hours = CACHE_EXPIRE_HOURS)) {
            Log.d(TAG, "需要更新: 缓存已过期")
            return true
        }
        
        // 情况 4：版本号相同且未过期，不需要更新
        Log.d(TAG, "不需要更新: 版本号相同且缓存未过期")
        return false
    }
    
    /**
     * 从服务器同步获取配置
     */
    private suspend fun fetchFromServer(): ClientRuntimeConfigDto {
        Log.i(TAG, "🌐 从服务器获取配置...")
        
        val response = apiService.getClientRuntimeConfig()
        
        if (!response.success || response.data == null) {
            throw IllegalStateException("无法获取配置: ${response.message}")
        }
        
        val config = response.data
        configStore.save(config)
        _config.value = config
        
        Log.i(TAG, "✅ 配置获取成功: version=${config.version}")
        return config
    }
    
    /**
     * 获取当前缓存的版本号
     */
    fun getCachedVersion(): String? {
        return configStore.getCachedVersion()
    }
    
    /**
     * 清除所有配置缓存
     */
    fun clearCache() {
        configStore.clear()
        _config.value = null
        Log.i(TAG, "🗑️ 配置缓存已清除")
    }
}
