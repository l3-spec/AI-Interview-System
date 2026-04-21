import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { ASRSessionManager } from './asr-session-manager';
import { RedisEventBus } from './redis-event-bus';
import { logger } from './logger';

const app = express();
const PORT = parseInt(process.env.ASR_SERVICE_PORT || '3002', 10);

// CORS 配置
const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins }));
app.use(express.json());

// 健康检查
app.get('/health', (_req, res) => {
  const manager = ASRSessionManager.getInstance();
  res.json({
    status: 'ok',
    service: 'asr-service',
    model: process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime',
    activeSessions: manager.getActiveSessionCount(),
    uptime: process.uptime(),
  });
});

// 查询活跃会话
app.get('/sessions', (_req, res) => {
  const manager = ASRSessionManager.getInstance();
  res.json({ sessions: manager.getSessionList() });
});

const server = http.createServer(app);

// WebSocket 服务器 —— 客户端通过此接口建立长连接
const wss = new WebSocketServer({
  server,
  path: '/ws/asr',
  maxPayload: 1024 * 1024, // 1MB
});

const sessionManager = ASRSessionManager.getInstance();

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.info(`[ASR] 新客户端连接: ${clientIp}`);

  let sessionId: string | null = null;
  /** 限流：会话不可用时的错误通知，最多每 5 秒发一次给客户端 */
  let lastSessionErrorAt = 0;
  let droppedAudioCount = 0;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'session.create': {
          const config = message.config || {};
          try {
            sessionId = await sessionManager.createSession(ws, {
              sessionId: message.sessionId,
              language: config.language || process.env.ASR_LANGUAGE || 'zh',
              sampleRate: config.sampleRate || parseInt(process.env.ASR_SAMPLE_RATE || '16000', 10),
              inputFormat: config.inputFormat || process.env.ASR_INPUT_FORMAT || 'pcm',
              vadMode: config.vadMode || process.env.ASR_VAD_MODE || 'server_vad',
              vadSilenceDurationMs: config.vadSilenceDurationMs ||
                parseInt(process.env.ASR_VAD_SILENCE_DURATION_MS || '500', 10),
            });

            droppedAudioCount = 0;
            ws.send(JSON.stringify({
              type: 'session.created',
              sessionId,
              message: 'ASR 会话已创建，可以开始发送音频数据',
            }));
          } catch (createErr: any) {
            sessionId = null;
            logger.error(`[ASR] 创建会话失败: ${createErr.message}`);
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_CREATE_FAILED',
              message: `创建 ASR 会话失败: ${createErr.message}`,
            }));
          }
          break;
        }

        case 'audio.append': {
          if (!sessionId) {
            // 限流通知：不要每帧都发 error
            droppedAudioCount++;
            const now = Date.now();
            if (now - lastSessionErrorAt > 5000) {
              ws.send(JSON.stringify({ type: 'error', code: 'NO_SESSION', message: `请先创建会话（已丢弃 ${droppedAudioCount} 个音频块）` }));
              logger.warn(`[ASR] 客户端未创建会话就发送音频，已丢弃 ${droppedAudioCount} 块`);
              lastSessionErrorAt = now;
              droppedAudioCount = 0;
            }
            return;
          }
          const ok = await sessionManager.appendAudio(sessionId, message.audio);
          if (!ok) {
            // 会话已关闭（DashScope 断连等），限流通知客户端
            droppedAudioCount++;
            const now = Date.now();
            if (now - lastSessionErrorAt > 5000) {
              ws.send(JSON.stringify({
                type: 'error',
                code: 'SESSION_CLOSED',
                message: `ASR 会话已关闭（已丢弃 ${droppedAudioCount} 个音频块），请重新创建会话`,
              }));
              logger.warn(`[ASR] 会话 ${sessionId} 已关闭，丢弃 ${droppedAudioCount} 个音频块`);
              lastSessionErrorAt = now;
              droppedAudioCount = 0;
            }
          }
          break;
        }

        case 'audio.commit': {
          if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', message: '请先创建会话' }));
            return;
          }
          await sessionManager.commitAudio(sessionId);
          break;
        }

        case 'session.finish': {
          if (sessionId) {
            await sessionManager.finishSession(sessionId);
            sessionId = null;
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${message.type}` }));
      }
    } catch (err: any) {
      logger.error(`[ASR] 消息处理错误: ${err.message}`);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    logger.info(`[ASR] 客户端断开: ${clientIp}`);
    if (sessionId) {
      sessionManager.destroySession(sessionId).catch(err => {
        logger.error(`[ASR] 清理会话失败: ${err.message}`);
      });
    }
  });

  ws.on('error', (err) => {
    logger.error(`[ASR] WebSocket 错误: ${err.message}`);
  });
});

// 初始化 Redis 事件总线（用于接收来自 backend-api 的指令）
const redisEventBus = new RedisEventBus();

server.listen(PORT, () => {
  logger.info(`🎙️ ASR 微服务已启动 - 端口: ${PORT}`);
  logger.info(`   WebSocket 路径: ws://localhost:${PORT}/ws/asr`);
  logger.info(`   健康检查: http://localhost:${PORT}/health`);
  logger.info(`   ASR 模型: ${process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime'}`);
  logger.info(`   DashScope 地址: ${process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime'}`);
});

// 优雅退出
process.on('SIGTERM', async () => {
  logger.info('[ASR] 收到 SIGTERM，正在优雅关闭...');
  await sessionManager.destroyAll();
  redisEventBus.disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  logger.info('[ASR] 收到 SIGINT，正在优雅关闭...');
  await sessionManager.destroyAll();
  redisEventBus.disconnect();
  server.close(() => process.exit(0));
});
