import { Request, Response } from 'express';
import crypto from 'crypto';
import { redisStreamService } from '../services/redis-stream.service';
import { serviceDiscoveryService } from '../services/service-discovery.service';
import { getMergedPlatformAiConfig } from '../services/platformAiSettings.service';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-interview-system-default-secret';

function generateSessionToken(sessionId: string, expireTime: number): string {
  const message = `${sessionId}:${expireTime}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('hex');
  return `${expireTime}.${signature}`;
}

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
      const { sessionId, userId, jobPosition, background, resumeText, deviceId } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      // 转发到 interview-service
      await redisStreamService.add('interview:inbound_stream', {
        type: 'JOIN_SESSION',
        sessionId,
        userId: userId || 'anonymous',
        jobPosition,
        background,
        resumeText,
        deviceId: deviceId || '',  // 支持 deviceId 区分同设备重连 vs 多设备并行
        timestamp: Date.now(),
      });

      // 查询最佳可用的 ASR/TTS 数据通道
      const [bestAsr, bestTts, ai] = await Promise.all([
        serviceDiscoveryService.getBestService('asr'),
        serviceDiscoveryService.getBestService('tts'),
        getMergedPlatformAiConfig(),
      ]);

      // 动态获取当前网关主机的被访问 IP（局域网自适应）
      const host = req.headers.host || '';
      const hostIp = host.split(':')[0] || 'localhost';

      let asrUrl = bestAsr?.url || qwen3ASRClient.getWebSocketUrl();
      let ttsUrl = bestTts?.url || qwen3TTSClient.getWebSocketUrl();

      // 如果是通过真实 IP 访问网关且 WS 注册地址为 localhost/127.0.0.1，则进行动态替换
      if (hostIp !== 'localhost' && hostIp !== '127.0.0.1' && hostIp !== '::1') {
        asrUrl = asrUrl.replace(/(localhost|127\.0\.0\.1|::1)/g, hostIp);
        ttsUrl = ttsUrl.replace(/(localhost|127\.0\.0\.1|::1)/g, hostIp);
      }

      // 注入 sessionToken 鉴权令牌，有效期30分钟
      const expireTime = Date.now() + 30 * 60 * 1000;
      const sessionToken = generateSessionToken(sessionId, expireTime);

      res.json({
        success: true,
        sessionId,
        sessionToken,
        services: {
          asr: {
            wsUrl: asrUrl,
            available: !!bestAsr,
            model: ai.qwenAsrModel,
          },
          tts: {
            wsUrl: ttsUrl,
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
      const { sessionId, text, isTimeout } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
      // 超时提交允许空文本；非超时仍要求传 text
      const isTimeoutFlag = isTimeout === true || isTimeout === 'true';
      if (!isTimeoutFlag && !text) return res.status(400).json({ error: 'Missing params' });

      await redisStreamService.add('interview:inbound_stream', {
        type: 'TEXT_MESSAGE',
        sessionId,
        text: text || '',
        source: 'text',
        // 透传 isTimeout 标志，interview-service 据此在下一题前插入过渡语
        isTimeout: isTimeoutFlag,
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

      const host = req.headers.host || '';
      const hostIp = host.split(':')[0] || 'localhost';

      let asrUrl = bestAsr?.url || '';
      let ttsUrl = bestTts?.url || '';

      if (hostIp !== 'localhost' && hostIp !== '127.0.0.1' && hostIp !== '::1') {
        if (asrUrl) asrUrl = asrUrl.replace(/(localhost|127\.0\.0\.1|::1)/g, hostIp);
        if (ttsUrl) ttsUrl = ttsUrl.replace(/(localhost|127\.0\.0\.1|::1)/g, hostIp);
      }

      // 如果请求中带了 sessionId，则为其生成 sessionToken 并返回
      const sessionId = req.query.sessionId as string;
      let sessionToken: string | undefined = undefined;
      if (sessionId) {
        const expireTime = Date.now() + 30 * 60 * 1000;
        sessionToken = generateSessionToken(sessionId, expireTime);
      }

      res.json({
        asr: bestAsr ? { ...bestAsr, url: asrUrl } : null,
        tts: bestTts ? { ...bestTts, url: ttsUrl } : null,
        sessionToken,
      });
    } catch (err: any) {
      console.error('[Gateway] discoverServices 失败:', err);
      res.status(500).json({ error: err.message });
    }
  }
}
