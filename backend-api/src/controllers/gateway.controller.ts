import { Request, Response } from 'express';
import { redisStreamService } from '../services/redis-stream.service';
import { serviceDiscoveryService } from '../services/service-discovery.service';
import { getMergedPlatformAiConfig } from '../services/platformAiSettings.service';
import { qwen3ASRClient } from '../services/qwen3-asr-service-client';
import { qwen3TTSClient } from '../services/qwen3-tts-service-client';

export class GatewayController {
  /**
   * Join or Initialize Session (HTTPS)
   */
  static async joinSession(req: Request, res: Response) {
    try {
      const { sessionId, userId, jobPosition, background } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

      // Forward to interview-service via Stream
      await redisStreamService.add('interview:inbound_stream', {
        type: 'JOIN_SESSION',
        sessionId,
        userId: userId || 'anonymous',
        jobPosition,
        background,
        timestamp: Date.now()
      });

      // Get best available data services
      const [bestAsr, bestTts, ai] = await Promise.all([
        serviceDiscoveryService.getBestService('asr'),
        serviceDiscoveryService.getBestService('tts'),
        getMergedPlatformAiConfig()
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
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Send Text Message (HTTPS)
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
        timestamp: Date.now()
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Interrupt AI Speaking (HTTPS)
   */
  static async interrupt(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      await redisStreamService.add('interview:inbound_stream', {
        type: 'INTERRUPT',
        sessionId,
        timestamp: Date.now()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Discovery API (for reconnection)
   */
  static async discoverServices(req: Request, res: Response) {
    try {
      const [bestAsr, bestTts] = await Promise.all([
        serviceDiscoveryService.getBestService('asr'),
        serviceDiscoveryService.getBestService('tts')
      ]);
      res.json({
        asr: bestAsr,
        tts: bestTts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
