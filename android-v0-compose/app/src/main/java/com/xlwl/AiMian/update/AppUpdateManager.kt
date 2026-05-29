package com.xlwl.AiMian.update

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import com.example.v0clone.data.model.ClientRuntimeConfigDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * 应用更新管理器
 *
 * 职责：
 * 1. 比对本地版本与服务端最新版本
 * 2. 使用 OkHttp 下载 APK（带进度回调）
 * 3. 通过 FileProvider 调起系统安装器
 *
 * 使用方式：
 * ```
 * val manager = AppUpdateManager(context)
 *
 * // 检查是否需要强制更新
 * val info = manager.checkUpdate(config)
 * if (info?.forceUpdate == true) {
 *     // 显示强制更新弹窗
 * }
 *
 * // 开始下载
 * manager.downloadApk(info.downloadUrl) { progress ->
 *     // 更新进度条
 * }
 * ```
 */
class AppUpdateManager(private val context: Context) {

    companion object {
        private const val TAG = "AppUpdateManager"
        private const val APK_FILE_NAME = "app_update.apk"

        /** 下载超时（分钟） */
        private const val DOWNLOAD_TIMEOUT_MINUTES = 10L
    }

    /** 下载进度 (0~100) */
    private val _downloadProgress = MutableStateFlow(0)
    val downloadProgress: StateFlow<Int> = _downloadProgress

    /** 下载状态 */
    private val _downloadState = MutableStateFlow(DownloadState.IDLE)
    val downloadState: StateFlow<DownloadState> = _downloadState

    /** 错误信息 */
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(DOWNLOAD_TIMEOUT_MINUTES, TimeUnit.MINUTES)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    /**
     * 版本更新信息（供 UI 使用）
     */
    data class UpdateInfo(
        /** 是否需要更新 */
        val needUpdate: Boolean,
        /** 是否强制更新 */
        val forceUpdate: Boolean,
        /** 最新版本号（如 "1.2.0"） */
        val latestVersionName: String?,
        /** 最新版本Code */
        val latestVersionCode: Int,
        /** 下载地址 */
        val downloadUrl: String?,
        /** 更新说明 */
        val releaseNotes: String?,
    )

    /**
     * 下载状态
     */
    enum class DownloadState {
        /** 空闲 */
        IDLE,
        /** 下载中 */
        DOWNLOADING,
        /** 下载完成 */
        COMPLETED,
        /** 下载失败 */
        FAILED,
    }

    /**
     * 获取当前应用的 versionCode
     */
    fun getCurrentVersionCode(): Int {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(
                    context.packageName,
                    0
                )
            }
            packageInfo.versionCode
        } catch (e: Exception) {
            Log.e(TAG, "获取当前版本Code失败", e)
            0
        }
    }

    /**
     * 获取当前应用的 versionName
     */
    fun getCurrentVersionName(): String {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(
                    context.packageName,
                    0
                )
            }
            packageInfo.versionName ?: "0.0"
        } catch (e: Exception) {
            Log.e(TAG, "获取当前版本名失败", e)
            "0.0"
        }
    }

    /**
     * 检查是否需要更新
     *
     * @param config 服务端下发的运行时配置
     * @return UpdateInfo，如果没有可用更新或服务端未配置则返回 null
     */
    fun checkUpdate(config: ClientRuntimeConfigDto?): UpdateInfo? {
        if (config == null) return null

        val serverVersionCode = config.latestVersionCode
        if (serverVersionCode <= 0) {
            // 服务端未配置版本信息
            return null
        }

        val currentCode = getCurrentVersionCode()
        val needUpdate = currentCode > 0 && currentCode < serverVersionCode

        val forceUpdate = needUpdate && config.forceUpdate

        Log.i(TAG, "版本比对: 本地=$currentCode, 服务端=$serverVersionCode, " +
                "需要更新=$needUpdate, 强制更新=$forceUpdate")

        return UpdateInfo(
            needUpdate = needUpdate,
            forceUpdate = forceUpdate,
            latestVersionName = config.latestVersionName,
            latestVersionCode = serverVersionCode,
            downloadUrl = config.downloadUrl,
            releaseNotes = config.releaseNotes,
        )
    }

    /**
     * 下载 APK 文件
     *
     * @param url APK 下载地址
     * @param onProgress 进度回调 (0~100)
     * @return 下载完成的 APK 文件，失败返回 null
     */
    suspend fun downloadApk(
        url: String,
        onProgress: ((Int) -> Unit)? = null
    ): File? = withContext(Dispatchers.IO) {
        _downloadState.value = DownloadState.DOWNLOADING
        _downloadProgress.value = 0
        _errorMessage.value = null

        try {
            Log.i(TAG, "开始下载 APK: $url")

            val request = Request.Builder()
                .url(url)
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                val msg = "下载失败: HTTP ${response.code}"
                Log.e(TAG, msg)
                _downloadState.value = DownloadState.FAILED
                _errorMessage.value = msg
                return@withContext null
            }

            val body = response.body ?: run {
                val msg = "下载失败: 响应体为空"
                Log.e(TAG, msg)
                _downloadState.value = DownloadState.FAILED
                _errorMessage.value = msg
                return@withContext null
            }

            val contentLength = body.contentLength()
            Log.i(TAG, "APK 文件大小: ${contentLength / 1024 / 1024}MB")

            // 保存到外部缓存目录（用户可见的下载目录）
            val downloadDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            )
            if (!downloadDir.exists()) {
                downloadDir.mkdirs()
            }

            val apkFile = File(downloadDir, APK_FILE_NAME)
            if (apkFile.exists()) {
                apkFile.delete()
            }

            body.byteStream().use { input ->
                FileOutputStream(apkFile).use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Long = 0
                    var len: Int

                    while (input.read(buffer).also { len = it } != -1) {
                        output.write(buffer, 0, len)
                        bytesRead += len

                        if (contentLength > 0) {
                            val progress = ((bytesRead * 100) / contentLength).toInt()
                            _downloadProgress.value = progress
                            onProgress?.invoke(progress)
                        }
                    }
                }
            }

            Log.i(TAG, "APK 下载完成: ${apkFile.absolutePath}")
            _downloadState.value = DownloadState.COMPLETED
            _downloadProgress.value = 100
            onProgress?.invoke(100)

            apkFile
        } catch (e: IOException) {
            val msg = "下载失败: ${e.message}"
            Log.e(TAG, msg, e)
            _downloadState.value = DownloadState.FAILED
            _errorMessage.value = msg
            null
        } catch (e: Exception) {
            val msg = "下载失败: ${e.message}"
            Log.e(TAG, msg, e)
            _downloadState.value = DownloadState.FAILED
            _errorMessage.value = msg
            null
        }
    }

    /**
     * 安装 APK（通过 FileProvider）
     *
     * @param apkFile 已下载的 APK 文件
     */
    fun installApk(apkFile: File) {
        if (!apkFile.exists()) {
            Log.e(TAG, "APK 文件不存在: ${apkFile.absolutePath}")
            return
        }

        try {
            Log.i(TAG, "准备安装 APK: ${apkFile.absolutePath}")

            val apkUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                // Android 7.0+ 需要允许安装未知来源
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }

            context.startActivity(intent)
            Log.i(TAG, "已调起系统安装器")
        } catch (e: Exception) {
            Log.e(TAG, "调起安装器失败", e)
            _errorMessage.value = "安装失败: ${e.message}"
        }
    }

    /**
     * 重置下载状态
     */
    fun reset() {
        _downloadState.value = DownloadState.IDLE
        _downloadProgress.value = 0
        _errorMessage.value = null
    }
}
