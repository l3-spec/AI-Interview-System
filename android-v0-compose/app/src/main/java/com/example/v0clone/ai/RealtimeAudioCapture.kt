package com.xlwl.AiMian.ai

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*

/**
 * 实时音频采集器
 * 用于采集用户语音并进行实时处理
 */
class RealtimeAudioCapture(
    private val context: Context,
    private val onAudioData: (ByteArray) -> Unit,
    private val onError: (String) -> Unit = {}
) {
    
    companion object {
        private const val TAG = "RealtimeAudioCapture"
        
        // 音频配置
        private const val SAMPLE_RATE = 16000  // 16kHz（适合语音识别）
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        
        // 缓冲区大小（20ms音频数据）
        private const val BUFFER_SIZE_MS = 20
        private val BUFFER_SIZE = (SAMPLE_RATE * BUFFER_SIZE_MS / 1000) * 2  // 2 bytes per sample
    }
    
    private var audioRecord: AudioRecord? = null
    private var captureJob: Job? = null
    private var isCapturing = false
    
    /**
     * 检查录音权限
     */
    fun hasPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * 开始采集音频
     */
    fun startCapture() {
        if (isCapturing) {
            Log.w(TAG, "Already capturing")
            return
        }
        
        if (!hasPermission()) {
            onError("录音权限未授予")
            return
        }
        
        try {
            // 创建AudioRecord
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT
            )
            
            val bufferSize = maxOf(minBufferSize, BUFFER_SIZE)
            
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            ).apply {
                if (state != AudioRecord.STATE_INITIALIZED) {
                    throw IllegalStateException("AudioRecord initialization failed")
                }
            }
            
            // 开始录音
            audioRecord?.startRecording()
            isCapturing = true
            
            // 启动采集协程
            captureJob = CoroutineScope(Dispatchers.IO).launch {
                captureLoop()
            }
            
            Log.i(TAG, "Audio capture started: ${SAMPLE_RATE}Hz, buffer=${bufferSize}bytes")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start audio capture", e)
            onError("启动录音失败: ${e.message}")
            stopCapture()
        }
    }
    
    /**
     * 停止采集音频
     */
    fun stopCapture() {
        if (!isCapturing) {
            return
        }
        
        isCapturing = false
        
        // 取消采集协程
        captureJob?.cancel()
        captureJob = null
        
        // 停止并释放AudioRecord
        try {
            audioRecord?.apply {
                if (state == AudioRecord.STATE_INITIALIZED) {
                    stop()
                }
                release()
            }
            audioRecord = null
            
            Log.i(TAG, "Audio capture stopped")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping audio capture", e)
        }
    }
    
    /**
     * 采集循环
     */
    private suspend fun captureLoop() {
        val buffer = ByteArray(BUFFER_SIZE)
        
        while (isCapturing && audioRecord != null) {
            try {
                // 读取音频数据
                val bytesRead = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                
                if (bytesRead > 0) {
                    // 回调音频数据
                    withContext(Dispatchers.Main) {
                        onAudioData(buffer.copyOf(bytesRead))
                    }
                } else if (bytesRead < 0) {
                    // 读取错误
                    Log.e(TAG, "Error reading audio: $bytesRead")
                    break
                }
                
            } catch (e: Exception) {
                if (e is CancellationException) {
                    throw e  // 重新抛出取消异常
                }
                Log.e(TAG, "Error in capture loop", e)
                break
            }
        }
        
        // 清理
        stopCapture()
    }
    
    /**
     * 获取采样率
     */
    fun getSampleRate() = SAMPLE_RATE
    
    /**
     * 获取是否正在采集
     */
    fun isCapturing() = isCapturing
}

/**
 * 实时音频播放器
 * 用于播放数字人语音
 */
class RealtimeAudioPlayer(
    private val context: Context
) {
    
    companion object {
        private const val TAG = "RealtimeAudioPlayer"
        
        // 音频配置（与采集器保持一致）
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }
    
    private var audioTrack: android.media.AudioTrack? = null
    private var isPlaying = false
    
    /**
     * 初始化播放器
     */
    fun initialize() {
        if (audioTrack != null) {
            return
        }
        
        try {
            val minBufferSize = android.media.AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT
            )
            
            audioTrack = android.media.AudioTrack(
                android.media.AudioManager.STREAM_MUSIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                minBufferSize,
                android.media.AudioTrack.MODE_STREAM
            ).apply {
                if (state != android.media.AudioTrack.STATE_INITIALIZED) {
                    throw IllegalStateException("AudioTrack initialization failed")
                }
            }
            
            Log.i(TAG, "Audio player initialized: ${SAMPLE_RATE}Hz")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize audio player", e)
        }
    }
    
    /**
     * 播放音频数据
     */
    fun play(audioData: ByteArray) {
        if (audioTrack == null) {
            initialize()
        }
        
        try {
            if (!isPlaying) {
                audioTrack?.play()
                isPlaying = true
            }
            
            // 写入音频数据
            val bytesWritten = audioTrack?.write(audioData, 0, audioData.size) ?: 0
            
            if (bytesWritten < 0) {
                Log.e(TAG, "Error writing audio: $bytesWritten")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error playing audio", e)
        }
    }
    
    /**
     * 停止播放
     */
    fun stop() {
        if (!isPlaying) {
            return
        }
        
        try {
            audioTrack?.apply {
                stop()
                flush()
            }
            isPlaying = false
            
            Log.i(TAG, "Audio playback stopped")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping playback", e)
        }
    }
    
    /**
     * 释放播放器
     */
    fun release() {
        try {
            stop()
            audioTrack?.release()
            audioTrack = null
            
            Log.i(TAG, "Audio player released")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing audio player", e)
        }
    }
    
    /**
     * 获取是否正在播放
     */
    fun isPlaying() = isPlaying
}

