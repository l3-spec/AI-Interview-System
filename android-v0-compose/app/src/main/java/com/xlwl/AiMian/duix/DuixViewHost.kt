package com.xlwl.AiMian.duix

import android.content.Context
import android.util.Log
import android.view.ViewGroup.LayoutParams
import androidx.compose.foundation.background
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import ai.guiji.duix.sdk.client.Callback
import ai.guiji.duix.sdk.client.Constant
import ai.guiji.duix.sdk.client.DUIX
import ai.guiji.duix.sdk.client.VirtualModelUtil
import ai.guiji.duix.sdk.client.render.DUIXRenderer
import ai.guiji.duix.sdk.client.render.DUIXTextureView
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val TAG = "DuixViewHost"

data class DuixReadyState(
    val ready: Boolean,
    val message: String? = null
)

@Composable
fun DuixViewHost(
    modelUrl: String,
    baseConfigUrl: String,
    modifier: Modifier = Modifier,
    onReadyChanged: (Boolean) -> Unit,
    onStatusChanged: (String) -> Unit,
    installAudioSink: (sink: (String) -> Unit) -> Unit
) {
    val context = LocalContext.current
    val duixHolder = remember { mutableStateOf<DuixHolder?>(null) }
    val isReady = remember { mutableStateOf(false) }

    LaunchedEffect(modelUrl, baseConfigUrl) {
        try {
            onStatusChanged("正在检查数字人资源…")
            // 修复已存在的标记文件问题（如果之前创建的是目录，需要改为文件）
            fixMarkFiles(context, baseConfigUrl, modelUrl)
            ensureBaseConfig(context, baseConfigUrl) { progress ->
                onStatusChanged("基础资源下载中…$progress%")
            }
            onStatusChanged("正在同步模型资源…")
            ensureModel(context, modelUrl) { progress ->
                onStatusChanged("模型下载中…$progress%")
            }
        onStatusChanged("正在初始化数字人…")
        isReady.value = true
        } catch (e: Exception) {
            onStatusChanged("数字人资源准备失败：${e.message}")
            Log.e(TAG, "数字人资源准备失败", e)
            isReady.value = false
        }
    }

    if (isReady.value) {
        AndroidView(
            modifier = modifier.background(Color.Black),
            factory = { ctx ->
                val textureView = DUIXTextureView(ctx).apply {
                    setEGLContextClientVersion(2)
                    setEGLConfigChooser(8, 8, 8, 8, 16, 0)
                    isOpaque = false
                    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
                }
                val renderer = DUIXRenderer(ctx, textureView)
                textureView.setRenderer(renderer)
                textureView.renderMode = DUIXTextureView.RENDERMODE_WHEN_DIRTY

                val duix = DUIX(ctx, modelUrl, renderer, object : Callback {
                    override fun onEvent(event: String, msg: String, info: Any?) {
                        when (event) {
                            Constant.CALLBACK_EVENT_INIT_READY -> {
                                onStatusChanged("数字人已就绪")
                                onReadyChanged(true)
                            }
                            Constant.CALLBACK_EVENT_INIT_ERROR -> {
                                onStatusChanged("数字人初始化失败：$msg")
                                onReadyChanged(false)
                            }
                            Constant.CALLBACK_EVENT_AUDIO_PLAY_ERROR -> {
                                onStatusChanged("数字人语音播放异常：$msg")
                            }
                        }
                    }
                })

                duixHolder.value = DuixHolder(duix)
                duix.init()
                installAudioSink { path ->
                    if (path.endsWith(".wav", ignoreCase = true) || path.endsWith(".pcm", ignoreCase = true)) {
                        duix.playAudio(path)
                    }
                }
                textureView
            }
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            duixHolder.value?.duix?.release()
            onReadyChanged(false)
        }
    }
}

private data class DuixHolder(val duix: DUIX)

/**
 * 修复标记文件问题：如果标记路径是目录，删除并创建为文件
 */
private fun fixMarkFiles(context: Context, baseConfigUrl: String, modelUrl: String) {
    try {
        val duixRoot = context.getExternalFilesDir("duix") ?: return
        val modelRoot = File(duixRoot, "model")
        
        // 修复基础配置标记文件
        val baseTmp = File(File(modelRoot, "tmp"), "gj_dh_res")
        if (baseTmp.exists() && baseTmp.isDirectory) {
            Log.w(TAG, "发现标记文件是目录，正在修复...")
            baseTmp.deleteRecursively()
            baseTmp.parentFile?.mkdirs()
            baseTmp.createNewFile()
        }
        
        // 修复模型标记文件
        val dirName = modelUrl.substringAfterLast('/').removeSuffix(".zip")
        val modelTmp = File(File(modelRoot, "tmp"), dirName)
        if (modelTmp.exists() && modelTmp.isDirectory) {
            Log.w(TAG, "发现模型标记文件是目录，正在修复...")
            modelTmp.deleteRecursively()
            modelTmp.parentFile?.mkdirs()
            modelTmp.createNewFile()
        }
    } catch (e: Exception) {
        Log.e(TAG, "修复标记文件失败", e)
    }
}

private suspend fun ensureBaseConfig(
    context: Context,
    url: String,
    onProgress: (Int) -> Unit
) {
    val duixRoot = context.getExternalFilesDir("duix") ?: throw IllegalStateException("外部存储不可用")
    val modelRoot = File(duixRoot, "model")
    val baseDir = File(modelRoot, "gj_dh_res")
    val baseTmp = File(File(modelRoot, "tmp"), "gj_dh_res")
    // 处理老版本解压导致的重复子目录
    flattenNestedDir(baseDir, "gj_dh_res")

    val hasBaseAssets = baseDir.resolve("alpha_model.b").exists() || baseDir.resolve("wenet.o").exists()
    if (hasBaseAssets) {
        // 标记文件缺失时补齐，避免重复下载
        if (!baseTmp.exists()) {
            baseTmp.parentFile?.mkdirs()
            baseTmp.createNewFile()
        }
        return
    }

    if (VirtualModelUtil.checkBaseConfig(context) && hasBaseAssets) return

    // 先尝试从assets复制 zip 并解压
    val assetName = url.substringAfterLast('/')
    if (assetExists(context, "duix/model/$assetName")) {
        val tempZip = File(context.cacheDir, assetName)
        copyAsset(context, "duix/model/$assetName", tempZip, onProgress)
        unzip(tempZip, modelRoot) { progress -> onProgress(progress) }
        flattenNestedDir(baseDir, "gj_dh_res")
        // 创建标记文件（不是目录），DUIX.init() 需要检查这个文件
        baseTmp.parentFile?.mkdirs()
        baseTmp.createNewFile()
        tempZip.delete()
        return
    }

    // fallback 网络下载
    suspendCancellableCoroutine { cont ->
        VirtualModelUtil.baseConfigDownload(context, url, object : VirtualModelUtil.ModelDownloadCallback {
            override fun onDownloadProgress(url: String?, current: Long, total: Long) {
                if (total > 0) onProgress((current * 100 / total).toInt())
            }

            override fun onUnzipProgress(url: String?, current: Long, total: Long) {
                if (total > 0) onProgress((current * 100 / total).toInt())
            }

            override fun onDownloadComplete(url: String?, dir: File?) {
                cont.resume(Unit)
            }

            override fun onDownloadFail(url: String?, code: Int, msg: String?) {
                cont.resumeWithException(IllegalStateException("基础资源下载失败($code): $msg"))
            }
        })
    }
}

private suspend fun ensureModel(
    context: Context,
    url: String,
    onProgress: (Int) -> Unit
) {
    val duixRoot = context.getExternalFilesDir("duix") ?: throw IllegalStateException("外部存储不可用")
    val modelRoot = File(duixRoot, "model")
    val dirName = url.substringAfterLast('/').removeSuffix(".zip")
    val modelDir = File(modelRoot, dirName)
    val modelTmp = File(File(modelRoot, "tmp"), dirName)
    val assetName = url.substringAfterLast('/')

    // 处理老版本解压导致的重复子目录（如 Oliver/Oliver）
    flattenNestedDir(modelDir, dirName)

    val hasModelAssets = modelDir.resolve("dh_model.b").exists() || modelDir.resolve("config.j").exists()
    if (hasModelAssets) {
        if (!modelTmp.exists()) {
            modelTmp.parentFile?.mkdirs()
            modelTmp.createNewFile()
        }
        return
    }

    if (VirtualModelUtil.checkModel(context, url) && hasModelAssets) return
    
    if (assetExists(context, "duix/model/$assetName")) {
        val tempZip = File(context.cacheDir, assetName)
        copyAsset(context, "duix/model/$assetName", tempZip, onProgress)
        unzip(tempZip, modelRoot) { progress -> onProgress(progress) }
        flattenNestedDir(modelDir, dirName)
        // 创建标记文件（不是目录），DUIX.init() 需要检查这个文件
        modelTmp.parentFile?.mkdirs()
        modelTmp.createNewFile()
        tempZip.delete()
        return
    }

    suspendCancellableCoroutine { cont ->
        VirtualModelUtil.modelDownload(context, url, object : VirtualModelUtil.ModelDownloadCallback {
            override fun onDownloadProgress(url: String?, current: Long, total: Long) {
                if (total > 0) onProgress((current * 100 / total).toInt())
            }

            override fun onUnzipProgress(url: String?, current: Long, total: Long) {
                if (total > 0) onProgress((current * 100 / total).toInt())
            }

            override fun onDownloadComplete(url: String?, dir: File?) {
                cont.resume(Unit)
            }

            override fun onDownloadFail(url: String?, code: Int, msg: String?) {
                cont.resumeWithException(IllegalStateException("模型下载失败($code): $msg"))
            }
        })
    }
}

private fun assetExists(context: Context, path: String): Boolean =
    runCatching { context.assets.open(path).close() }.isSuccess

private fun copyAsset(
    context: Context,
    assetPath: String,
    outFile: File,
    onProgress: (Int) -> Unit
) {
    context.assets.open(assetPath).use { input ->
        FileOutputStream(outFile).use { output ->
            val buffer = ByteArray(8 * 1024)
            var read: Int
            var copied = 0L
            while (input.read(buffer).also { read = it } != -1) {
                output.write(buffer, 0, read)
                copied += read
                // 粗略进度，文件大小未知时不精确
                onProgress( (copied % 100_000 / 1000).toInt() )
            }
        }
    }
}

private fun unzip(zipFile: File, targetDir: File, onProgress: (Int) -> Unit) {
    if (!targetDir.exists()) targetDir.mkdirs()
    var totalEntries = 0
    ZipInputStream(zipFile.inputStream()).use { zis ->
        var entry: ZipEntry? = zis.nextEntry
        while (entry != null) {
            totalEntries++
            val outFile = File(targetDir, entry.name)
            if (entry.isDirectory) {
                outFile.mkdirs()
            } else {
                outFile.parentFile?.mkdirs()
                FileOutputStream(outFile).use { fos ->
                    val buffer = ByteArray(8 * 1024)
                    var len: Int
                    while (zis.read(buffer).also { len = it } > 0) {
                        fos.write(buffer, 0, len)
                    }
                }
            }
            zis.closeEntry()
            entry = zis.nextEntry
            onProgress((totalEntries % 100))
        }
    }
}

/**
 * 部分历史版本会将 zip 中的根目录再次作为子目录解压（例如 gj_dh_res/gj_dh_res 或 Oliver/Oliver）
 * 这里将子目录内容上移一层，保证 DUIX 能正确找到模型文件。
 */
private fun flattenNestedDir(baseDir: File, nestedName: String) {
    val nestedDir = File(baseDir, nestedName)
    if (nestedDir.exists() && nestedDir.isDirectory) {
        baseDir.mkdirs()
        nestedDir.listFiles()?.forEach { child ->
            val target = File(baseDir, child.name)
            child.copyRecursively(target, overwrite = true)
        }
        nestedDir.deleteRecursively()
    }
}
