package com.xlwl.AiMian.digitalhuman

import android.app.Activity
import android.util.Log
import android.widget.FrameLayout
import android.widget.Toast
import ai.guiji.duix.sdk.client.Callback
import ai.guiji.duix.sdk.client.Constant
import ai.guiji.duix.sdk.client.DUIX
import ai.guiji.duix.sdk.client.loader.ModelInfo
import ai.guiji.duix.sdk.client.render.DUIXRenderer
import ai.guiji.duix.sdk.client.render.DUIXTextureView
import com.xlwl.AiMian.BuildConfig
import com.xlwl.AiMian.ai.realtime.RealtimeVoiceManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * Android 平台 DUiX 数字人控制器
 * 
 * 使用 DUiX 本地渲染方案：
 * 1. 检查和下载 `gj_dh_res.zip` (Base configs) 以及模型 `Oliver.zip`。
 * 2. 挂载 `DUIXTextureView`。
 * 3. 接收并喂入来自 `RealtimeVoiceManager` 的 `duixAudioSink` Pcm/Wav 数据。
 */
class DuixAvatarController(
    private val activity: Activity,
    private val realtimeVoiceManager: RealtimeVoiceManager,
    private val onSessionReady: (() -> Unit)? = null,
    private val onError: ((String) -> Unit)? = null
) : DigitalHumanController {

    private val TAG = "DuixAvatarController"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _statusMessage = MutableStateFlow("初始化数字人系统...")
    val statusMessage: StateFlow<String> = _statusMessage.asStateFlow()

    private val _textureView = MutableStateFlow<DUIXTextureView?>(null)
    val textureView: StateFlow<DUIXTextureView?> = _textureView.asStateFlow()

    // Required properties for UI
    private val _dialogState = MutableStateFlow(0)
    val dialogState: StateFlow<Int> = _dialogState.asStateFlow()

    private val _userVolume = MutableStateFlow(0f)
    val userVolume: StateFlow<Float> = _userVolume.asStateFlow()

    private val _avatarVolume = MutableStateFlow(0f)
    val avatarVolume: StateFlow<Float> = _avatarVolume.asStateFlow()

    private val _latencyMetrics = MutableStateFlow(mapOf<String, String>())
    val latencyMetrics: StateFlow<Map<String, String>> = _latencyMetrics.asStateFlow()

    // URLs from BuildConfig
    private val duixBaseUrl = BuildConfig.DUIX_BASE_CONFIG_URL
    private val duixModelUrl = BuildConfig.DUIX_MODEL_URL
    private val defaultModelId = "Oliver"
    private val defaultModelZip = "Oliver.zip"

    private var duixEngine: DUIX? = null
    private var duixRenderer: DUIXRenderer? = null

    init {
        // 创建 DUiX TextureView
        val view = DUIXTextureView(activity)
        _textureView.value = view
        
        // 初始化渲染器
        duixRenderer = DUIXRenderer(activity, view)
        view.setRenderer(duixRenderer)
        view.renderMode = DUIXTextureView.RENDERMODE_WHEN_DIRTY
        
        startSession()
    }

    private fun startSession() {
        scope.launch {
            try {
                _statusMessage.value = "检查数字人资源..."
                // Ensure base config and models exist in context.getExternalFilesDir("duix")
                prepareAssets()

                // Initialize DUIX Engine
                _statusMessage.value = "启动内置渲染引擎..."
                val view = _textureView.value ?: return@launch
                val renderer = duixRenderer ?: return@launch
                
                duixEngine = DUIX(activity, defaultModelId, renderer, object : Callback {
                    override fun onEvent(event: String, message: String?, extra: Any?) {
                        when (event) {
                            Constant.CALLBACK_EVENT_INIT_READY -> {
                                Log.i(TAG, "DUiX Engine Ready!")
                                _isReady.value = true
                                _statusMessage.value = "准备就绪，可以对话"
                                
                                // 接管语音播放
                                realtimeVoiceManager.setDuixAudioSink { wavPath ->
                                    Log.d(TAG, "Sink received audio: $wavPath")
                                    duixEngine?.playAudio(wavPath)
                                }
                                
                                activity.runOnUiThread {
                                    onSessionReady?.invoke()
                                }
                            }
                            Constant.CALLBACK_EVENT_INIT_ERROR -> {
                                Log.e(TAG, "DUiX Engine Error: $message")
                                _statusMessage.value = "渲染错误: $message"
                                activity.runOnUiThread {
                                    onError?.invoke(message ?: "未知错误")
                                }
                            }
                            Constant.CALLBACK_EVENT_AUDIO_PLAY_START -> {
                                Log.d(TAG, "数字人开始播报口型")
                            }
                            Constant.CALLBACK_EVENT_AUDIO_PLAY_END -> {
                                Log.d(TAG, "数字人结束播报口型")
                            }
                            else -> {
                                Log.d(TAG, "event: $event, msg: $message")
                            }
                        }
                    }
                })

                // Init and Load
                duixEngine?.init()
                
            } catch (e: Exception) {
                Log.e(TAG, "startSession failed", e)
                _statusMessage.value = "初始化失败: ${e.message}"
                onError?.invoke("初始化失败: ${e.message}")
            }
        }
    }

    private suspend fun prepareAssets() = withContext(Dispatchers.IO) {
        val rootDir = activity.getExternalFilesDir("duix") ?: return@withContext
        val modelBaseDir = File(rootDir, "model")
        if (!modelBaseDir.exists()) modelBaseDir.mkdirs()

        // 1. Prepare Base Config (gj_dh_res)
        val baseConfigName = "gj_dh_res"
        val baseConfigDir = File(rootDir, "model/$baseConfigName")
        val baseConfigTag = File(rootDir, "model/tmp/$baseConfigName")
        
        if (!baseConfigDir.exists() || !baseConfigTag.exists()) {
            _statusMessage.value = "加载内置基础资源..."
            val assetPath = "duix/model/$baseConfigName.zip"
            var success = false
            try {
                activity.assets.open(assetPath).use { input ->
                    unzipStream(input, modelBaseDir)
                }
                success = true
                Log.i(TAG, "Successfully extracted $baseConfigName from assets")
            } catch (e: Exception) {
                Log.w(TAG, "Base config not found in assets, checking if download needed...")
                if (!baseConfigDir.exists()) {
                    _statusMessage.value = "下载基础资源..."
                    downloadAndUnzip(duixBaseUrl, "model/$baseConfigName.zip")
                    success = true
                }
            } finally {
                if (success || baseConfigDir.exists()) {
                    File(rootDir, "model/tmp").mkdirs()
                    baseConfigTag.createNewFile()
                }
            }
        }

        // 2. Prepare Model (Oliver)
        val modelDir = File(rootDir, "model/$defaultModelId")
        val modelTag = File(rootDir, "model/tmp/$defaultModelId")

        if (!modelDir.exists() || !modelTag.exists()) {
            _statusMessage.value = "加载数字人形象..."
            val assetPath = "duix/model/$defaultModelZip"
            var success = false
            try {
                activity.assets.open(assetPath).use { input ->
                    unzipStream(input, modelBaseDir)
                }
                success = true
                Log.i(TAG, "Successfully extracted $defaultModelId from assets")
            } catch (e: Exception) {
                Log.w(TAG, "Model $defaultModelZip not found in assets, checking fallback...")
                if (duixModelUrl.startsWith("http") && !duixModelUrl.contains("duix-local")) {
                    _statusMessage.value = "下载数字人形象..."
                    downloadAndUnzip(duixModelUrl, "model/$defaultModelZip")
                    success = true
                } else if (!modelDir.exists()) {
                    // Critical error: No local asset and no remote URL
                    _statusMessage.value = "错误: 缺少数字人模型文件"
                    throw Exception("Missing model asset: $assetPath")
                }
            } finally {
                if (success || modelDir.exists()) {
                    File(rootDir, "model/tmp").mkdirs()
                    modelTag.createNewFile()
                }
            }
        }
    }

    private fun downloadAndUnzip(urlStr: String, destRelativePath: String) {
        val rootDir = activity.getExternalFilesDir("duix") ?: return
        val destZipFile = File(rootDir, destRelativePath)
        destZipFile.parentFile?.mkdirs()

        Log.i(TAG, "Downloading \$urlStr -> \${destZipFile.absolutePath}")
        activity.runOnUiThread {
            Toast.makeText(activity, "正在下载数字人资源中...", Toast.LENGTH_SHORT).show()
        }

        try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 15000
            conn.readTimeout = 30000
            conn.connect()

            if (conn.responseCode == 200) {
                val input = conn.inputStream
                val output = FileOutputStream(destZipFile)
                input.copyTo(output)
                output.close()
                input.close()
                Log.i(TAG, "Download finished! Unzipping...")
                
                unzipFile(destZipFile, File(rootDir, "model"))
                // destZipFile.delete() // clean up
            } else {
                throw Exception("Http Error: \${conn.responseCode}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading \$urlStr", e)
            throw e
        }
    }

    private fun unzipFile(zipFile: File, targetDir: File) {
        try {
            val inputStream = java.io.FileInputStream(zipFile)
            unzipStream(inputStream, targetDir)
        } catch (e: Exception) {
            Log.e(TAG, "Unzip failed", e)
            throw e
        }
    }

    private fun unzipStream(inputStream: InputStream, targetDir: File) {
        targetDir.mkdirs()
        ZipInputStream(inputStream).use { zis ->
            var entry: ZipEntry? = zis.nextEntry
            while (entry != null) {
                val newFile = File(targetDir, entry.name)
                // path traversal check
                val targetDirPath = targetDir.canonicalPath
                val newFilePath = newFile.canonicalPath
                if (!newFilePath.startsWith(targetDirPath + File.separator)) {
                    zis.closeEntry()
                    entry = zis.nextEntry
                    continue
                }

                if (entry!!.isDirectory) {
                    newFile.mkdirs()
                } else {
                    newFile.parentFile?.mkdirs()
                    FileOutputStream(newFile).use { fos ->
                        zis.copyTo(fos)
                    }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
    }


    override fun updateMouthOpenness(value: Float) {}
    override fun updateMouthForm(value: Float) {}
    override fun resetMouth() {}
    override fun onTtsPlayback(audioPath: String?, text: String?) {
        if (audioPath == null) return
        Log.i(TAG, "onTtsPlayback: Driving digital human with audio file -> $audioPath")
        duixEngine?.playAudio(audioPath)
    }

    fun release() {
        Log.i(TAG, "release()")
        _isReady.value = false
        realtimeVoiceManager.setDuixAudioSink(null)
        duixEngine?.release()
        duixEngine = null
    }

    fun interrupt() {
        Log.i(TAG, "interrupt()")
        duixEngine?.stopAudio()
    }

    override fun startPush() {
        Log.d(TAG, "startPush()")
        duixEngine?.startPush()
    }

    override fun pushPcm(buffer: ByteArray) {
        if (buffer.isNotEmpty()) {
            // Log.v(TAG, "pushPcm: ${buffer.size} bytes") // Use Verbose for high frequency data
            duixEngine?.pushPcm(buffer)
        }
    }

    override fun stopPush() {
        Log.d(TAG, "stopPush()")
        duixEngine?.stopPush()
    }
}
