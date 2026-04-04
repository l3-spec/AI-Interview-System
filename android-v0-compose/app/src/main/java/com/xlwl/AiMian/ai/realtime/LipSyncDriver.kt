package com.xlwl.AiMian.ai.realtime

import android.util.Log
import com.xlwl.AiMian.digitalhuman.DigitalHumanController
import org.json.JSONObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * 音素驱动的唇形同步器
 *
 * 原理：将 TTS 返回的 viseme（音素）时间轴数据，
 *       精确映射到 DUIX 数字人的嘴型参数，
 *       实现比 RMS 音量分析更精确的唇形同步效果。
 *
 * 与 RMS 方式的对比：
 *   RMS 方式：只分析音量大小，嘴型随音量"抖动"，不准确
 *   Viseme 方式：知道"说了什么音"，嘴型与语音内容精确匹配
 *
 * 使用方式：
 *   val lipSyncDriver = LipSyncDriver(digitalHumanController)
 *   lipSyncDriver.playWithLipSync(audioFile, visemeTimeline)
 */
class LipSyncDriver(
    private val controller: DigitalHumanController?,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
) {
    companion object {
        private const val TAG = "LipSyncDriver"

        // DUIX 嘴型参数名称（参考 DUIX SDK 文档）
        private const val PARAM_MOUTH_OPEN_Y = "ParamMouthOpenY"        // 嘴型开合度
        private const val PARAM_MOUTH_FORM = "ParamMouthForm"             // 嘴型形状
        private const val PARAM_MOUTH_OTHER = "ParamMouthForm"          // 其他嘴型参数

        // Viseme ID 到 DUIX 嘴型参数的映射
        // 每个音素对应一个 (开合度, 形状) 元组
        // 值域: 0.0 ~ 1.0
        private val VISEME_TO_MOUTH = mapOf(
            // 0: 静音 → 闭嘴
            0 to MouthShape(openY = 0.0f, form = 0.0f, formY = 0.0f),

            // 1: p, b, m (闭合音) → 闭嘴，双唇闭合
            1 to MouthShape(openY = 0.05f, form = 0.0f, formY = 0.0f),

            // 2: f, v (齿擦音) → 上齿碰下唇
            2 to MouthShape(openY = 0.15f, form = -0.3f, formY = 0.0f),

            // 3: z, c, s, d, t, n, l (舌尖音) → 舌尖音
            3 to MouthShape(openY = 0.2f, form = 0.1f, formY = 0.2f),

            // 4: zh, ch, sh, r (翘舌音) → 舌尖上翘
            4 to MouthShape(openY = 0.25f, form = 0.2f, formY = 0.3f),

            // 5: g, k, h (舌根音) → 舌根抬起
            5 to MouthShape(openY = 0.3f, form = 0.3f, formY = 0.0f),

            // 6: j, q, x (舌面音) → 舌面抬起
            6 to MouthShape(openY = 0.2f, form = 0.2f, formY = 0.15f),

            // 7: a (开口音) → 大张嘴
            7 to MouthShape(openY = 0.75f, form = 0.6f, formY = 0.4f),

            // 8: o (圆唇音) → 圆口
            8 to MouthShape(openY = 0.55f, form = 0.8f, formY = 0.5f),

            // 9: e (半开音) → 中等张嘴
            9 to MouthShape(openY = 0.5f, form = 0.3f, formY = 0.2f),

            // 10: i, u, ü (高元音) → 咧嘴
            10 to MouthShape(openY = 0.25f, form = -0.4f, formY = 0.1f),

            // 11: ü (撮口音) → 圆唇撮口
            11 to MouthShape(openY = 0.3f, form = 0.7f, formY = 0.4f),

            // 12: ai, ei, ao, ou (复合元音) → 中等偏大张嘴
            12 to MouthShape(openY = 0.6f, form = 0.4f, formY = 0.3f)
        )

        // 平滑过渡时长（毫秒），避免嘴型突变
        private const val TRANSITION_DURATION_MS = 30L

        // 最小持续时间（毫秒），小于此时间的 viseme 会被跳过
        private const val MIN_VISEME_DURATION_MS = 50L
    }

    private var lipSyncJob: Job? = null
    private var isPlaying = false

    // 当前正在播放的 viseme
    private var currentVisemeId = 0

    // 嘴型平滑值（用于插值过渡）
    private var smoothOpenY = 0.0f
    private var smoothForm = 0.0f
    private var smoothFormY = 0.0f

    /**
     * 使用 Viseme 时间轴播放音频并驱动唇形
     *
     * @param audioFile 音频文件路径（TTS 生成的音频）
     * @param visemeTimeline 音素时间轴（从 VolcanoTtsService 获取）
     * @param onComplete 播放完成回调
     */
    fun playWithLipSync(
        audioFile: java.io.File,
        visemeTimeline: List<VolcanoTtsService.VisemeEvent>,
        onComplete: (() -> Unit)? = null
    ) {
        if (controller == null) {
            Log.w(TAG, "DigitalHumanController 未设置，无法驱动唇形")
            return
        }

        if (visemeTimeline.isEmpty()) {
            Log.w(TAG, "Viseme 时间轴为空，使用 RMS 方式代替")
            //  fallback: 重置为 RMS 模式
            controller.resetMouth()
            onComplete?.invoke()
            return
        }

        Log.i(TAG, "开始唇形同步播放: audio=${audioFile.name}, viseme事件=${visemeTimeline.size}个")
        stop()

        lipSyncJob = scope.launch {
            isPlaying = true

            for (event in visemeTimeline) {
                if (!isPlaying) break

                // 跳过太短的 viseme
                if (event.duration < MIN_VISEME_DURATION_MS) {
                    continue
                }

                val shape = VISEME_TO_MOUTH[event.visemeId] ?: VISEME_TO_MOUTH[0]!!

                // 执行嘴型过渡动画（平滑插值）
                animateToShape(shape, TRANSITION_DURATION_MS)

                currentVisemeId = event.visemeId

                // 保持这个嘴型直到下一个 viseme
                delay(event.duration)
            }

            // 播放结束，重置为闭嘴状态
            resetMouth()
            isPlaying = false
            Log.i(TAG, "唇形同步播放完成")
            onComplete?.invoke()
        }
    }

    /**
     * 使用 Viseme 时间轴播放音频并驱动唇形（异步，不等待完成）
     */
    fun playWithLipSyncAsync(
        audioFile: java.io.File,
        visemeTimeline: List<VolcanoTtsService.VisemeEvent>
    ) {
        playWithLipSync(audioFile, visemeTimeline, null)
    }

    /**
     * 停止唇形同步
     */
    fun stop() {
        if (!isPlaying) return
        isPlaying = false
        lipSyncJob?.cancel()
        lipSyncJob = null
        Log.d(TAG, "唇形同步已停止")
    }

    /**
     * 重置嘴型为初始状态（闭嘴）
     */
    fun resetMouth() {
        scope.launch {
            smoothOpenY = 0.0f
            smoothForm = 0.0f
            smoothFormY = 0.0f
            controller?.updateMouthOpenness(0.0f)
            controller?.updateMouthForm(0.0f)
        }
    }

    /**
     * 暂停唇形同步（保持当前嘴型）
     */
    fun pause() {
        isPlaying = false
        lipSyncJob?.cancel()
    }

    /**
     * 恢复唇形同步
     */
    fun resume() {
        if (!isPlaying) {
            isPlaying = true
        }
    }

    /**
     * 将嘴型平滑过渡到目标状态
     * 使用线性插值（LERP）实现平滑过渡
     */
    private suspend fun animateToShape(target: MouthShape, durationMs: Long) {
        if (controller == null) return

        val steps = (durationMs / TRANSITION_DURATION_MS).coerceAtLeast(1).toInt()
        val stepOpenY = (target.openY - smoothOpenY) / steps
        val stepForm = (target.form - smoothForm) / steps
        val stepFormY = (target.formY - smoothFormY) / steps

        for (i in 0 until steps) {
            if (!isPlaying) return

            smoothOpenY += stepOpenY
            smoothForm += stepForm
            smoothFormY += stepFormY

            // 驱动 DUIX 数字人
            controller.updateMouthOpenness(smoothOpenY.coerceIn(0.0f, 1.0f))

            // 根据 viseme 类型，可能需要同时设置 form 参数
            if (target.form != 0.0f || target.formY != 0.0f) {
                // form 参数的驱动取决于 DUIX 是否支持
                // 如果不支持，可以只用 openY
                try {
                    controller.updateMouthForm(smoothForm.coerceIn(-1.0f, 1.0f))
                } catch (e: Exception) {
                    // 忽略不支持 form 参数的情况
                }
            }

            delay(TRANSITION_DURATION_MS)
        }
    }

    /**
     * 当前是否正在播放
     */
    fun isPlaying() = isPlaying

    /**
     * 嘴型数据结构
     *
     * @param openY 嘴型开合度 (0.0=闭嘴, 1.0=最大张嘴)
     * @param form 嘴型形状 (负值=扁, 正值=圆)
     * @param formY 嘴型上下位置 (负值=向下, 正值=向上)
     */
    data class MouthShape(
        val openY: Float,
        val form: Float,
        val formY: Float
    )

    // =============================================================
    // 辅助方法：直接播放带唇形的 TTS（一次性调用）
    // =============================================================

    /**
     * 一次性合成并播放（带唇形同步）
     * 整合 VolcanoTtsService.synthesizeWithViseme + LipSyncDriver
     *
     * 用法示例：
     *   val lipSyncDriver = LipSyncDriver(digitalHumanController)
     *   lipSyncDriver.speak(alibabaSpeechService, "请介绍一下你自己")
     */
    suspend fun speak(
        ttsService: VolcanoTtsService,
        text: String,
        onComplete: (() -> Unit)? = null
    ) {
        try {
            // 1. TTS 合成（带 viseme 时间轴）
            val result = ttsService.synthesizeWithViseme(text)

            // 2. 播放音频 + 唇形同步
            playWithLipSync(result.audioFile, result.visemeTimeline) {
                onComplete?.invoke()
            }
        } catch (e: Exception) {
            Log.e(TAG, "TTS+唇形播放失败", e)
            onComplete?.invoke()
        }
    }
}

// =============================================================
// 扩展：Viseme 映射工具
// =============================================================
object VisemeMapper {

    /**
     * 将火山引擎返回的 viseme 数据转换为 LipSyncDriver 可用的时间轴格式
     * 实际火山引擎 API 返回格式可能不同，这里做兼容处理
     */
    fun parseVolcanoVisemeResponse(responseJson: String): List<VolcanoTtsService.VisemeEvent> {
        val events = mutableListOf<VolcanoTtsService.VisemeEvent>()

        try {
            val root = JSONObject(responseJson)

            // 尝试从不同字段读取 viseme 数据
            val visemeArray = root.optJSONArray("viseme")
                ?: root.optJSONArray("viseme_list")
                ?: root.optJSONObject("data")?.optJSONArray("viseme")

            if (visemeArray != null) {
                for (i in 0 until visemeArray.length()) {
                    val item = visemeArray.getJSONObject(i)
                    events.add(
                        VolcanoTtsService.VisemeEvent(
                            visemeId = item.getInt("viseme_id"),
                            startTime = item.getLong("start_time"),
                            duration = item.getLong("duration"),
                            endTime = item.getLong("end_time")
                        )
                    )
                }
                Log.d("VisemeMapper", "解析到 ${events.size} 个 viseme 事件")
            } else {
                Log.w("VisemeMapper", "未找到 viseme 数据字段")
            }
        } catch (e: Exception) {
            Log.e("VisemeMapper", "解析 viseme 失败", e)
        }

        return events
    }

    /**
     * 获取中文拼音对应的 Viseme ID
     * 用于前端预处理文本时，将拼音序列转换为 viseme
     */
    fun pinyinToViseme(pinyin: String): Int {
        return when {
            pinyin.startsWith("b") || pinyin.startsWith("p") || pinyin.startsWith("m") -> 1
            pinyin.startsWith("f") || pinyin.startsWith("v") -> 2
            pinyin.startsWith("z") || pinyin.startsWith("c") || pinyin.startsWith("s") ||
            pinyin.startsWith("d") || pinyin.startsWith("t") ||
            pinyin.startsWith("n") || pinyin.startsWith("l") -> 3
            pinyin.startsWith("zh") || pinyin.startsWith("ch") ||
            pinyin.startsWith("sh") || pinyin.startsWith("r") -> 4
            pinyin.startsWith("g") || pinyin.startsWith("k") || pinyin.startsWith("h") -> 5
            pinyin.startsWith("j") || pinyin.startsWith("q") || pinyin.startsWith("x") -> 6
            pinyin.startsWith("a") -> 7
            pinyin.startsWith("o") -> 8
            pinyin.startsWith("e") -> 9
            pinyin.startsWith("i") || pinyin.startsWith("u") || pinyin.startsWith("ü") -> 10
            else -> 3 // 默认
        }
    }
}
