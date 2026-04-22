package com.xlwl.AiMian.data.repository

import android.util.Log
import com.xlwl.AiMian.BuildConfig
import com.xlwl.AiMian.config.AppConfig
import com.xlwl.AiMian.data.api.ApiResponse
import com.xlwl.AiMian.data.model.ClientRuntimeConfigDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import java.util.concurrent.TimeUnit

/**
 * 启动时仅使用 [BuildConfig.API_BASE_URL] 请求一次公开接口，拉取 ASR/TTS 地址与参数，写入 [AppConfig]。
 */
object ClientRuntimeConfigRepository {
    private const val TAG = "ClientRuntimeConfig"

    private interface BootstrapApi {
        @GET("public/client-runtime-config")
        suspend fun getClientRuntimeConfig(): ApiResponse<ClientRuntimeConfigDto>
    }

    private fun ensureTrailingApiSlash(url: String): String {
        val t = url.trim()
        if (t.isEmpty()) return "http://127.0.0.1:3001/api/"
        return if (t.endsWith("/")) t else "$t/"
    }

    /**
     * @return 是否成功应用服务端配置（失败时仍可使用 BuildConfig 回退）
     */
    suspend fun fetchAndApply(): Boolean = withContext(Dispatchers.IO) {
        val base = ensureTrailingApiSlash(BuildConfig.API_BASE_URL)
        val logging = HttpLoggingInterceptor { Log.d(TAG, it) }.apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(12, TimeUnit.SECONDS)
            .build()
        val retrofit = Retrofit.Builder()
            .baseUrl(base)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        val api = retrofit.create(BootstrapApi::class.java)
        return@withContext try {
            val resp = api.getClientRuntimeConfig()
            if (resp.success && resp.data != null) {
                AppConfig.applyClientRuntime(resp.data!!)
                Log.i(TAG, "已应用服务端运行时配置: apiBaseUrl=${AppConfig.apiBaseUrl.take(50)}…")
                true
            } else {
                Log.w(TAG, "client-runtime-config 无数据: message=${resp.message} error=${resp.error}")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "拉取 client-runtime-config 失败，使用 BuildConfig: ${e.message}")
            false
        }
    }
}
