package com.xlwl.AiMian.ai.realtime

import android.util.Log
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * 语音活动检测器（VAD）
 * 用于自动检测用户何时开始说话和何时停止说话
 */
class VoiceActivityDetector(
    private val sampleRate: Int = 16000,
    private val silenceThresholdDb: Float = -40f,      // 静音阈值（分贝）
    private val silenceDurationMs: Long = 2000,         // 静音持续时间（毫秒）后认为说话结束
    private val speechMinDurationMs: Long = 500,        // 最小说话时间（避免误触发）
    private val maxSpeechDurationMs: Long = 60000       // 最长说话时间（60秒）
) {
    companion object {
        private const val TAG = "VoiceActivityDetector"
        private const val MIN_RMS = 1e-10f  // 避免log10(0)
    }

    enum class State {
        IDLE,           // 空闲，等待说话
        SPEECH_START,   // 检测到说话开始
        SPEECH,         // 确认说话中
        SPEECH_END      // 检测到说话结束
    }

    data class VadResult(
        val state: State,
        val db: Float,
        val speechDuration: Long,
        val shouldStopRecording: Boolean,   // 是否应该停止录音
        val isValidSpeech: Boolean          // 是否是有效的语音
    )

    private var currentState = State.IDLE
    private var speechStartTime: Long = 0
    private var lastSpeechTime: Long = 0      // 最后检测到说话的时间
    private var silenceStartTime: Long = 0
    
    // 统计信息
    private var totalFrames = 0
    private var speechFrames = 0

    /**
     * 分析音频帧
     * @param audioData PCM音频数据（16-bit）
     * @return VAD分析结果
     */
    fun analyze(audioData: ByteArray): VadResult {
        totalFrames++
        
        // 计算音频能量
        val rms = calculateRMS(audioData)
        val db = if (rms > MIN_RMS) 20 * log10(rms) else silenceThresholdDb - 10
        
        val now = System.currentTimeMillis()
        val isSpeech = db > silenceThresholdDb
        
        if (isSpeech) {
            speechFrames++
        }
        
        // 状态机
        val newState = when (currentState) {
            State.IDLE -> {
                if (isSpeech) {
                    speechStartTime = now
                    lastSpeechTime = now
                    silenceStartTime = 0
                    Log.d(TAG, "检测到说话开始: ${db.toInt()}dB")
                    State.SPEECH_START
                } else {
                    State.IDLE
                }
            }
            
            State.SPEECH_START -> {
                if (isSpeech) {
                    lastSpeechTime = now
                    // 确认说话超过最小时间
                    if (now - speechStartTime >= speechMinDurationMs) {
                        Log.d(TAG, "确认进入说话状态")
                        State.SPEECH
                    } else {
                        State.SPEECH_START
                    }
                } else {
                    // 误触发，返回空闲
                    if (now - speechStartTime < speechMinDurationMs) {
                        Log.d(TAG, "误触发，返回空闲状态")
                        currentState = State.IDLE
                        State.IDLE
                    } else {
                        State.SPEECH_START
                    }
                }
            }
            
            State.SPEECH -> {
                if (isSpeech) {
                    lastSpeechTime = now
                    silenceStartTime = 0
                    
                    // 检查是否超过最大说话时间
                    if (now - speechStartTime >= maxSpeechDurationMs) {
                        Log.d(TAG, "说话时间超过最大限制: ${maxSpeechDurationMs}ms")
                        State.SPEECH_END
                    } else {
                        State.SPEECH
                    }
                } else {
                    // 检测到静音
                    if (silenceStartTime == 0L) {
                        silenceStartTime = now
                        Log.d(TAG, "检测到静音开始")
                    }
                    
                    // 静音持续超过阈值
                    if (now - silenceStartTime >= silenceDurationMs) {
                        val speechDuration = lastSpeechTime - speechStartTime
                        Log.d(TAG, "说话结束，总时长: ${speechDuration}ms, 静音时长: ${now - silenceStartTime}ms")
                        State.SPEECH_END
                    } else {
                        State.SPEECH
                    }
                }
            }
            
            State.SPEECH_END -> {
                // 已经结束，保持状态直到reset
                State.SPEECH_END
            }
        }
        
        currentState = newState
        
        val speechDuration = if (speechStartTime > 0) {
            (if (currentState == State.SPEECH_END) lastSpeechTime else now) - speechStartTime
        } else {
            0L
        }
        
        val shouldStop = currentState == State.SPEECH_END
        val isValid = speechDuration >= speechMinDurationMs && speechFrames > 10
        
        return VadResult(
            state = currentState,
            db = db,
            speechDuration = speechDuration,
            shouldStopRecording = shouldStop,
            isValidSpeech = isValid
        )
    }
    
    /**
     * 计算音频RMS（均方根）
     */
    private fun calculateRMS(audioData: ByteArray): Float {
        if (audioData.isEmpty()) return MIN_RMS
        
        var sum = 0.0
        val samples = audioData.size / 2
        
        for (i in 0 until samples) {
            val index = i * 2
            if (index + 1 >= audioData.size) break
            
            val sample = ((audioData[index + 1].toInt() shl 8) or 
                         (audioData[index].toInt() and 0xFF)).toShort()
            val normalized = sample / 32768.0
            sum += normalized * normalized
        }
        
        return sqrt(sum / samples).toFloat().coerceAtLeast(MIN_RMS)
    }
    
    /**
     * 重置检测器
     */
    fun reset() {
        currentState = State.IDLE
        speechStartTime = 0
        lastSpeechTime = 0
        silenceStartTime = 0
        totalFrames = 0
        speechFrames = 0
        Log.d(TAG, "VAD已重置")
    }
    
    /**
     * 获取统计信息
     */
    fun getStatistics(): String {
        val speechRatio = if (totalFrames > 0) (speechFrames * 100f / totalFrames) else 0f
        return "总帧数: $totalFrames, 语音帧: $speechFrames (${speechRatio.toInt()}%)"
    }
}

