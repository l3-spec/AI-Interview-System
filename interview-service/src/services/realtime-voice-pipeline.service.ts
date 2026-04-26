/**
 * 实时语音处理管道服务
 * 整合ASR -> LLM -> TTS流程
 */

import { ASRResult, VolcEngineASRService, AgoraASRService } from './rtc-asr.service';
import { AliyunASRService } from './aliyun-asr.service';
import { TTSService } from './tts.service';
import { DeepseekService } from './deepseek.service';

export interface VoiceProcessingResult {
  audioUrl?: string;
  audioBuffer?: Buffer;
  text: string;
  sessionId: string;
  duration?: number;
  ttsMode?: 'server' | 'client';
  userText?: string;
}

export interface InterruptionHandler {
  isDigitalHumanSpeaking: boolean;
  interrupt(): void;
}

interface SessionState {
  partialText: string;
  buffers: Buffer[];
}

/**
 * 实时语音处理管道
 */
export class RealtimeVoicePipelineService {
  private asrService: VolcEngineASRService | AgoraASRService | AliyunASRService;
  private ttsService: TTSService;
  private deepSeekService: DeepseekService;
  private interruptionHandler: InterruptionHandler;
  private isProcessing: boolean = false;
  private currentSessionId: string | null = null;
  private sessionStates: Map<string, SessionState> = new Map();

  constructor(
    asrService: VolcEngineASRService | AgoraASRService | AliyunASRService,
    ttsService: TTSService,
    deepSeekService: DeepseekService
  ) {
    this.asrService = asrService;
    this.ttsService = ttsService;
    this.deepSeekService = deepSeekService;
    
    // 初始化打断处理器
    this.interruptionHandler = {
      isDigitalHumanSpeaking: false,
      interrupt: () => {
        this.interruptionHandler.isDigitalHumanSpeaking = false;
        console.log('🛑 数字人说话被打断');
      },
    };
  }

  private async buildDigitalHumanReply(params: {
    recognizedText: string;
    sessionId: string;
    userId?: string;
    jobPosition?: string;
    background?: string;
    source?: 'voice' | 'text';
  }): Promise<VoiceProcessingResult> {
    const { recognizedText, sessionId, userId, jobPosition, background, source = 'text' } = params;

    if (!recognizedText || recognizedText.trim().length === 0) {
      throw new Error('未识别到有效语音内容');
    }

    if (this.isProcessing) {
      throw new Error('正在处理中，请稍候');
    }

    this.isProcessing = true;
    this.currentSessionId = sessionId;

    try {
      console.log(`✅ ASR识别结果: ${recognizedText}`);

      if (this.interruptionHandler.isDigitalHumanSpeaking) {
        console.log('🛑 检测到用户打断');
        this.interruptionHandler.interrupt();
      }

      console.log('🤖 调用LLM生成回复...');
      const llmResponse = await this.deepSeekService.generateResponse({
        userMessage: recognizedText,
        sessionId,
        context: {
          userId,
          jobPosition,
          background,
        },
      });

      console.log(`✅ LLM回复: ${llmResponse}`);

      const ttsMode: 'server' | 'client' =
        typeof this.ttsService.getMode === 'function'
          ? this.ttsService.getMode()
          : 'server';

      if (ttsMode === 'client') {
        console.log('🔊 当前配置为客户端TTS，由前端负责语音播放');
        return {
          text: llmResponse,
          sessionId,
          duration: 0,
          ttsMode,
          userText: source === 'voice' ? recognizedText : undefined,
        };
      }

      console.log('🔊 进行TTS合成...');
      this.interruptionHandler.isDigitalHumanSpeaking = true;

      const ttsResult = await this.ttsService.textToSpeech({
        text: llmResponse,
        sessionId,
      });

      if (!ttsResult.success || !ttsResult.audioUrl) {
        throw new Error('TTS合成失败');
      }

      console.log(`✅ TTS合成完成: ${ttsResult.audioUrl}`);

      const voiceResult: VoiceProcessingResult = {
        audioUrl: ttsResult.audioUrl,
        text: llmResponse,
        sessionId,
        duration: ttsResult.duration || 0,
        ttsMode,
        userText: source === 'voice' ? recognizedText : undefined,
      };

      setTimeout(() => {
        this.interruptionHandler.isDigitalHumanSpeaking = false;
      }, (voiceResult.duration || 0) * 1000);

      return voiceResult;
    } finally {
      this.isProcessing = false;
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    }
  }

  async processUserVoice(params: {
    audioBuffer: Buffer;
    sessionId: string;
    sampleRate?: number;
    userId?: string;
    jobPosition?: string;
    background?: string;
  }): Promise<VoiceProcessingResult> {
    const { audioBuffer, sessionId, sampleRate = 16000, userId, jobPosition, background } = params;
    console.log(`🎤 开始处理用户语音 (Session: ${sessionId})`);
    const asrResult = await this.asrService.recognize(audioBuffer, sampleRate);
    return this.buildDigitalHumanReply({
      recognizedText: asrResult.text,
      sessionId,
      userId,
      jobPosition,
      background,
      source: 'voice',
    });
  }

  async processUserText(params: {
    text: string;
    sessionId: string;
    userId?: string;
    jobPosition?: string;
    background?: string;
  }): Promise<VoiceProcessingResult> {
    const { text, sessionId, userId, jobPosition, background } = params;
    console.log(`💬 开始处理用户文本 (Session: ${sessionId})`);
    return this.buildDigitalHumanReply({
      recognizedText: text,
      sessionId,
      userId,
      jobPosition,
      background,
    });
  }

  async processUserVoiceStream(params: {
    audioChunk: Buffer;
    sessionId: string;
    sampleRate?: number;
    isFinal?: boolean;
    userId?: string;
    jobPosition?: string;
    background?: string;
  }): Promise<Partial<VoiceProcessingResult> | null> {
    const {
      audioChunk,
      sessionId,
      sampleRate = 16000,
      isFinal = false,
      userId,
      jobPosition,
      background,
    } = params;

    const state = this.sessionStates.get(sessionId) ?? {
      partialText: '',
      buffers: [],
    };
    state.buffers.push(audioChunk);
    this.sessionStates.set(sessionId, state);

    const isVolc = this.asrService instanceof VolcEngineASRService && typeof (this.asrService as VolcEngineASRService).streamRecognize === 'function';

    try {
      if (isVolc) {
        const volcService = this.asrService as VolcEngineASRService;
        const asrResult = await volcService.streamRecognize(sessionId, audioChunk, {
          sampleRate,
          isFinal,
        });

        if (!asrResult || !asrResult.text) {
          return null;
        }

        if (!asrResult.isFinal) {
          state.partialText = asrResult.text;
          return {
            text: asrResult.text,
            sessionId,
          };
        }

        this.sessionStates.delete(sessionId);
        await volcService.closeSession(sessionId).catch(() => {});

        const reply = await this.buildDigitalHumanReply({
          recognizedText: asrResult.text,
          sessionId,
          userId,
          jobPosition,
          background,
          source: 'voice',
        });

        return reply;
      }

      if (!isFinal) {
        return state.partialText
          ? {
              text: state.partialText,
              sessionId,
            }
          : null;
      }

      const combinedAudio = Buffer.concat(state.buffers);
      this.sessionStates.delete(sessionId);
      const result = await this.processUserVoice({
        audioBuffer: combinedAudio,
        sessionId,
        sampleRate,
        userId,
        jobPosition,
        background,
      });
      return result;
    } catch (error: any) {
      console.error('流式语音处理失败:', error);
      return null;
    }
  }

  /**
   * 检查是否可以打断
   */
  canInterrupt(): boolean {
    return this.interruptionHandler.isDigitalHumanSpeaking;
  }

  /**
   * 手动打断
   */
  interrupt(): void {
    this.interruptionHandler.interrupt();
  }

  /**
   * 获取当前处理状态
   */
  getStatus(): {
    isProcessing: boolean;
    isDigitalHumanSpeaking: boolean;
    currentSessionId: string | null;
  } {
    return {
      isProcessing: this.isProcessing,
      isDigitalHumanSpeaking: this.interruptionHandler.isDigitalHumanSpeaking,
      currentSessionId: this.currentSessionId,
    };
  }

  getTTSMode(): 'server' | 'client' {
    return typeof this.ttsService.getMode === 'function'
      ? this.ttsService.getMode()
      : 'server';
  }
}
