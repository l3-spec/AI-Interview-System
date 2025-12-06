package com.xlwl.AiMian.ai.video

import android.content.Context
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class VideoRecordingResult(
  val file: File,
  val durationMillis: Long
)

class InterviewVideoRecorder(private val context: Context) {
  private val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
  private var videoCapture: VideoCapture<Recorder>? = null
  private var recording: Recording? = null
  private var recordingDeferred: CompletableDeferred<VideoRecordingResult?>? = null

  suspend fun bindPreview(
    lifecycleOwner: LifecycleOwner,
    previewView: PreviewView
  ) = withContext(Dispatchers.Main) {
    try {
      val provider = cameraProviderFuture.get()
      val qualitySelector = QualitySelector.fromOrderedList(
        listOf(Quality.SD, Quality.HD, Quality.FHD),
        FallbackStrategy.higherQualityOrLowerThan(Quality.SD)
      )
      val recorder = Recorder.Builder()
        .setQualitySelector(qualitySelector)
        .build()
      val videoCapture = VideoCapture.withOutput(recorder)
      val preview = androidx.camera.core.Preview.Builder().build().apply {
        setSurfaceProvider(previewView.surfaceProvider)
      }

      provider.unbindAll()
      provider.bindToLifecycle(
        lifecycleOwner,
        CameraSelector.DEFAULT_FRONT_CAMERA,
        preview,
        videoCapture
      )

      this@InterviewVideoRecorder.videoCapture = videoCapture
    } catch (e: Exception) {
      Log.e(TAG, "Failed to bind preview for recording", e)
    }
  }

  fun startRecording(sessionId: String, questionIndex: Int): Boolean {
    val capture = videoCapture ?: return false
    if (recording != null) return false

    val outputFile = File(
      context.cacheDir,
      "ai_interview_${sessionId}_${questionIndex}_${System.currentTimeMillis()}.mp4"
    )
    val outputOptions = FileOutputOptions.Builder(outputFile).build()
    val deferred = CompletableDeferred<VideoRecordingResult?>()
    recordingDeferred = deferred

    recording = capture.output
      .prepareRecording(context, outputOptions)
      .withAudioEnabled()
      .start(ContextCompat.getMainExecutor(context)) { event ->
        if (event is VideoRecordEvent.Finalize) {
          handleFinalize(event, outputFile)
        }
      }

    return true
  }

  suspend fun stopRecording(): VideoRecordingResult? {
    val deferred = recordingDeferred ?: return null
    try {
      recording?.stop()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to stop recording", e)
      deferred.complete(null)
    }
    val result = deferred.await()
    recordingDeferred = null
    return result
  }

  fun release() {
    try {
      cameraProviderFuture.get().unbindAll()
    } catch (e: Exception) {
      Log.w(TAG, "Failed to release camera provider", e)
    }
    try {
      recording?.close()
    } catch (e: Exception) {
      Log.w(TAG, "Failed to close recording", e)
    }
  }

  private fun handleFinalize(event: VideoRecordEvent.Finalize, outputFile: File) {
    val durationMs = event.recordingStats.recordedDurationNanos / 1_000_000
    if (event.hasError()) {
      Log.e(TAG, "Recording error: ${event.error}")
      outputFile.delete()
      recordingDeferred?.complete(null)
    } else {
      recordingDeferred?.complete(VideoRecordingResult(outputFile, durationMs))
    }
    recording = null
  }

  companion object {
    private const val TAG = "InterviewVideoRecorder"
  }
}
