package com.xlwl.AiMian.digitalhuman

/**
 * Abstraction for driving the digital human mouth parameters and reacting to TTS/audio playback.
 */
interface DigitalHumanController {
    /**
     * Called when the system estimates how open the mouth should be.
     */
    fun updateMouthOpenness(value: Float)

    /**
     * Called when a pitch-driven mouth form update is available.
     */
    fun updateMouthForm(value: Float)

    /**
     * Resets the mouth state (typically to a closed mouth).
     */
    fun resetMouth()

    /**
     * Notifies the controller that the client is about to play TTS audio.
     *
     * @param audioPath optional local path (e.g., MP3) or null when not available
     * @param text optional textual transcript for servers that trust text input
     */
    fun onTtsPlayback(audioPath: String?, text: String?)
}
