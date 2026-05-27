import { Request, Response } from 'express';
import { redisStreamService } from '../services/redis-stream.service';
import { serviceDiscoveryService } from '../services/service-discovery.service';
import { getMergedPlatformAiConfig } from '../services/platformAiSettings.service';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';
import { prisma } from '../lib/prisma';

/**
 * HTTPS REST Gateway —— App 与 backend-api 的统一入口
 *
 * 全部端点通过 Redis Stream `interview:inbound_stream` 转发给 interview-service，
 * 与 ASR/TTS 直连 WebSocket 协同工作。
 */
export class GatewayController {
  /**
   * 加入或初始化面试会话 (HTTPS)
   * POST /api/gateway/join
   */
  static async joinSession(req: Request, res: Response) {
    try {
      const { sessionId, userId, jobPosition, background, resumeText } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      // 转发到 interview-service
      await redisStreamService.add('interview:inbound_stream', {
        type: 'JOIN_SESSION',
        sessionId,
        userId: userId || 'anonymous',
        jobPosition,
        background,
        resumeText,
        timestamp: Date.now(),
      });

      // 查询最佳可用的 ASR/TTS 数据通道
      const [bestAsr, bestTts, ai] = await Promise.all([
        serviceDiscoveryService.getBestService('asr'),
        serviceDiscoveryService.getBestService('tts'),
        getMergedPlatformAiConfig(),
      ]);

      res.json({
        success: true,
        sessionId,
        services: {
          asr: {
            wsUrl: bestAsr?.url || qwen3ASRClient.getWebSocketUrl(),
            available: !!bestAsr,
            model: ai.qwenAsrModel,
          },
          tts: {
            wsUrl: bestTts?.url || qwen3TTSClient.getWebSocketUrl(),
            available: !!bestTts,
            model: ai.qwenTtsModel,
            voice: ai.ttsVoice,
          },
        },
      });
    } catch (err: any) {
      console.error('[Gateway] joinSession 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * 发送文本消息 (HTTPS)
   * POST /api/gateway/message
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId, text } = req.body;
      if (!sessionId || !text) return res.status(400).json({ error: 'Missing params' });

      await redisStreamService.add('interview:inbound_stream', {
        type: 'TEXT_MESSAGE',
        sessionId,
        text,
        source: 'text',
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('[Gateway] sendMessage 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * 客户端音频播放完成回调 (HTTPS)
   * POST /api/gateway/playback-done
   *
   * 用于通知 interview-service 当前 AI 回答的 TTS 已播放完成，
   * interview-service 可据此切换到下一题或开启下一轮 ASR 监听。
   */
  static async playbackDone(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      await redisStreamService.add('interview:inbound_stream', {
        type: 'PLAYBACK_DONE',
        sessionId,
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('[Gateway] playbackDone 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * 打断 AI 说话 (HTTPS)
   * POST /api/gateway/interrupt
   */
  static async interrupt(req: Request, res: Response) {
    try {
      const { sessionId, reason } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      await redisStreamService.add('interview:inbound_stream', {
        type: 'INTERRUPT',
        sessionId,
        reason: reason || 'user_interrupt',
        timestamp: Date.now(),
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Gateway] interrupt 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * 查询面试会话状态 (HTTPS)
   * GET /api/gateway/session/:sessionId
   *
   * 直接查询 Prisma 数据库返回当前面试状态，便于 App 端断线重连后恢复 UI。
   */
  static async getSessionState(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          status: true,
          currentQuestion: true,
          totalQuestions: true,
          startedAt: true,
          completedAt: true,
        },
      });

      if (!session) {
        return res.status(404).json({ success: false, error: '面试会话不存在' });
      }

      res.json({
        success: true,
        sessionId: session.id,
        state: session.status,
        currentQuestionIndex: session.currentQuestion,
        totalQuestions: session.totalQuestions,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      });
    } catch (err: any) {
      console.error('[Gateway] getSessionState 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * 服务发现 API (重连时使用)
   * GET /api/gateway/discover
   */
  static async discoverServices(req: Request, res: Response) {
    try {
      const [bestAsr, bestTts] = await Promise.all([
        serviceDiscoveryService.getBestService('asr'),
        serviceDiscoveryService.getBestService('tts'),
      ]);
      res.json({
        asr: bestAsr,
        tts: bestTts,
      });
    } catch (err: any) {
      console.error('[Gateway] discoverServices 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }
}
