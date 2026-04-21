import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { TTSSessionManager } from './tts-session-manager';
import { RedisEventBus } from './redis-event-bus';
import { logger } from './logger';

const app = express();
const PORT = parseInt(process.env.TTS_SERVICE_PORT || '3003', 10);

const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins }));
app.use(express.json());

// 健康检查
app.get('/health', (_req, res) => {
  const manager = TTSSessionManager.getInstance();
  res.json({
    status: 'ok',
    service: 'tts-service',
    model: process.env.QW_TTS_MODEL || 'qwen3-tts-flash-realtime',
    voice: process.env.TTS_VOICE || 'cherry',
    mode: process.env.TTS_MODE || 'server_commit',
    activeSessions: manager.getActiveSessionCount(),
    uptime: process.uptime(),
  });
});

// 查询活跃会话
app.get('/sessions', (_req, res) => {
  const manager = TTSSessionManager.getInstance();
  res.json({ sessions: manager.getSessionList() });
});

/**
 * HTTP 触发 TTS 合成（非流式，用于预生成场景如面试题 TTS）
 * 实际音频通过 WebSocket 返回给持有该 sessionId 的客户端
 * 或通过 Redis tts:events 频道广播
 */
app.post('/synthesize', async (req, res) => {
  try {
    const { sessionId, text, commit } = req.body;
    if (!sessionId || !text) {
      return res.status(400).json({ error: '缺少 sessionId 或 text' });
    }

    const manager = TTSSessionManager.getInstance();
    await manager.appendText(sessionId, text);
    if (commit) {
      await manager.commitText(sessionId);
    }

    res.json({ success: true, sessionId, charCount: text.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

// WebSocket 服务器 — 客户端通过此接口建立 TTS 长连接
const wss = new WebSocketServer({
  server,
  path: '/ws/tts',
  maxPayload: 1024 * 1024,
});

const sessionManager = TTSSessionManager.getInstance();

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.info(`[TTS] 新客户端连接: ${clientIp}`);

  let sessionId: string | null = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'session.create': {
          const config = message.config || {};
          try {
            sessionId = await sessionManager.createSession(ws, {
              sessionId: message.sessionId,
              voice: config.voice,
              sampleRate: config.sampleRate,
              responseFormat: config.responseFormat,
              mode: config.mode,
              language: config.language,
              instructions: config.instructions,
            });

            ws.send(JSON.stringify({
              type: 'session.created',
              sessionId,
              message: 'TTS 会话已创建，可以开始发送文本',
            }));
          } catch (createErr: any) {
            sessionId = null;
            logger.error(`[TTS] 创建会话失败: ${createErr.message}`);
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_CREATE_FAILED',
              message: `创建 TTS 会话失败: ${createErr.message}`,
            }));
          }
          break;
        }

        case 'text.append': {
          if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', code: 'NO_SESSION', message: '请先创建会话' }));
            return;
          }
          const appendOk = await sessionManager.appendText(sessionId, message.text);
          if (!appendOk) {
            ws.send(JSON.stringify({ type: 'error', code: 'SESSION_CLOSED', message: 'TTS 会话已关闭，请重新创建' }));
          }
          break;
        }

        case 'text.commit': {
          if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', code: 'NO_SESSION', message: '请先创建会话' }));
            return;
          }
          const commitOk = await sessionManager.commitText(sessionId);
          if (!commitOk) {
            ws.send(JSON.stringify({ type: 'error', code: 'SESSION_CLOSED', message: 'TTS 会话已关闭，请重新创建' }));
          }
          break;
        }

        // 清空文本缓冲区（中断当前合成）
        case 'text.clear': {
          if (sessionId) {
            await sessionManager.clearText(sessionId);
          }
          break;
        }

        // 结束会话
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
      logger.error(`[TTS] 消息处理错误: ${err.message}`);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    logger.info(`[TTS] 客户端断开: ${clientIp}`);
    if (sessionId) {
      sessionManager.destroySession(sessionId).catch(err => {
        logger.error(`[TTS] 清理会话失败: ${err.message}`);
      });
    }
  });

  ws.on('error', (err) => {
    logger.error(`[TTS] WebSocket 错误: ${err.message}`);
  });
});

// Redis 事件总线
const redisEventBus = new RedisEventBus();
sessionManager.setRedisBus(redisEventBus);

// 处理来自 backend-api 的 Redis 指令
redisEventBus.onCommand(async (cmd) => {
  try {
    switch (cmd.command) {
      case 'synthesize': {
        const ok = await sessionManager.handleRedisTextCommand(cmd.sessionId, cmd.text, cmd.commit);
        if (!ok) {
          // 会话不存在，通过 Redis 通知 backend-api 让客户端降级到 client TTS
          redisEventBus.publish('tts:events', {
            sessionId: cmd.sessionId,
            event: 'session_not_found',
            payload: { text: cmd.text },
            timestamp: Date.now(),
            source: 'tts-service',
          });
        }
        break;
      }
      case 'commit':
        await sessionManager.commitText(cmd.sessionId);
        break;
      case 'clear':
        await sessionManager.clearText(cmd.sessionId);
        break;
      case 'close':
        await sessionManager.destroySession(cmd.sessionId);
        break;
      default:
        logger.debug(`[TTS] 未知 Redis 指令: ${cmd.command}`);
    }
  } catch (err: any) {
    logger.error(`[TTS] 处理 Redis 指令失败: ${err.message}`);
  }
});

server.listen(PORT, () => {
  logger.info(`🔊 TTS 微服务已启动 - 端口: ${PORT}`);
  logger.info(`   WebSocket 路径: ws://localhost:${PORT}/ws/tts`);
  logger.info(`   健康检查: http://localhost:${PORT}/health`);
  logger.info(`   TTS 模型: ${process.env.QWEN_TTS_MODEL || 'qwen3-tts-flash-realtime'}`);
  logger.info(`   默认音色: ${process.env.TTS_VOICE || 'cherry'}`);
  logger.info(`   合成模式: ${process.env.TTS_MODE || 'server_commit'} (双轨混合流式)`);
  logger.info(`   DashScope 地址: ${process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime'}`);
});

// 优雅退出
process.on('SIGTERM', async () => {
  logger.info('[TTS] 收到 SIGTERM，正在优雅关闭...');
  await sessionManager.destroyAll();
  redisEventBus.disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  logger.info('[TTS] 收到 SIGINT，正在优雅关闭...');
  await sessionManager.destroyAll();
  redisEventBus.disconnect();
  server.close(() => process.exit(0));
});
