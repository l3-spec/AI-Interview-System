package com.xlwl.AiMian.data.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    // 模拟器访问本机后台请使用 10.0.2.2；真机联调请替换为实际局域网IP
    private const val BASE_URL = "http://192.168.3.124:3001/api/"
//    private const val BASE_URL = "http://10.10.1.58:3001/api/"
//    private const val BASE_URL = "https://api.s.xlwl-ai.com/api/"
//    private const val BASE_URL = "http://192.168.101.10:3001/api/"
    private val logging: HttpLoggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    fun createOkHttpClient(tokenProvider: () -> String?): OkHttpClient {
        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val token = tokenProvider()
            val req = if (!token.isNullOrEmpty()) {
                original.newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else original
            chain.proceed(req)
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor(authInterceptor)
            .build()
    }

    fun <T> createService(service: Class<T>, client: OkHttpClient): T =
        buildRetrofit(BASE_URL, client).create(service)

    private fun buildRetrofit(baseUrl: String, client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
}
