import dotenv from 'dotenv';
dotenv.config();

import { initServiceLogger } from './utils/service-logger';
initServiceLogger('tts-service');

import http from 'http';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { TTSSessionManager } from './tts-session-manager';
import { RedisEventBus } from './redis-event-bus';
import { serviceDiscoveryService } from './service-discovery.service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-interview-system-default-secret';

/**
 * 校验客户端直连 ASR/TTS 服务的临时签名 Token
 */
function verifySessionToken(sessionId: string, token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expireTimeStr, signature] = parts;
  const expireTime = parseInt(expireTimeStr, 10);
  if (isNaN(expireTime) || Date.now() > expireTime) {
    return false; // 已过期
  }
  const message = `${sessionId}:${expireTime}`;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('hex');
  return signature === expectedSignature;
}

const serviceId = `tts-${uuidv4().slice(0, 8)}`;
const SERVICE_URL = process.env.TTS_SERVICE_EXTERNAL_URL || `ws://localhost:${process.env.TTS_SERVICE_PORT || '3003'}/ws/tts`;

/**
 * 简化版业务指标收集器
 * - 计数器累加，不引入额外依赖
 * - TTS 额外统计处理字符总量及首包音频延迟
 * - 每小时重置一次，防止计数无限增长
 */
class MetricsCollector {
  private requestCount = 0;
  private errorCount = 0;
  private totalLatencyMs = 0;
  private latencySamples = 0;
  private totalCharsProcessed = 0;
  private totalFirstAudioLatencyMs = 0;
  private firstAudioSamples = 0;

  recordRequest(): void { this.requestCount++; }
  recordError(): void { this.errorCount++; }
  recordLatency(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.totalLatencyMs += ms;
    this.latencySamples++;
  }
  recordChars(count: number): void {
    if (!Number.isFinite(count) || count <= 0) return;
    this.totalCharsProcessed += count;
  }
  recordFirstAudioLatency(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.totalFirstAudioLatencyMs += ms;
    this.firstAudioSamples++;
  }

  getMetrics() {
    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0
        ? (this.errorCount / this.requestCount * 100).toFixed(2) + '%'
        : '0%',
      avgLatencyMs: this.latencySamples > 0
        ? Math.round(this.totalLatencyMs / this.latencySamples)
        : 0,
      latencySamples: this.latencySamples,
    };
  }

  getTotalCharsProcessed(): number { return this.totalCharsProcessed; }
  getAvgFirstAudioLatency(): number {
    return this.firstAudioSamples > 0
      ? Math.round(this.totalFirstAudioLatencyMs / this.firstAudioSamples)
      : 0;
  }

  /** 每小时重置一次，避免无限增长 */
  startPeriodicReset(): void {
    setInterval(() => {
      this.requestCount = 0;
      this.errorCount = 0;
      this.totalLatencyMs = 0;
      this.latencySamples = 0;
      this.totalCharsProcessed = 0;
      this.totalFirstAudioLatencyMs = 0;
      this.firstAudioSamples = 0;
    }, 3600 * 1000);
  }
}

const metrics = new MetricsCollector();
metrics.startPeriodicReset();

function startHeartbeat() {
  setInterval(() => {
    serviceDiscoveryService.heartbeat({
      id: serviceId,
      type: 'tts',
      url: SERVICE_URL,
      load: TTSSessionManager.getInstance().getActiveSessionCount(),
      lastSeen: Date.now()
    });
  }, 5000);
}

const app = express();
const PORT = parseInt(process.env.TTS_SERVICE_PORT || '3003', 10);
logger.info('DEBUG: TTS SERVICE STARTING VERSION 2.0');

const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins }));
app.use(express.json());

// 健康检查（含业务指标）
app.get('/health', (_req, res) => {
  const manager = TTSSessionManager.getInstance();
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'tts-service',
    model: process.env.QWEN_TTS_MODEL || 'qwen3-tts-flash-realtime',
    voice: process.env.TTS_VOICE || 'cherry',
    mode: process.env.TTS_MODE || 'server_commit',
    activeSessions: manager.getActiveSessionCount(),
    uptime: Math.round(process.uptime()),
    metrics: metrics.getMetrics(),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    // TTS 特有指标：合成字符总数、首包音频平均延迟
    ttsSpecific: {
      totalCharsProcessed: metrics.getTotalCharsProcessed(),
      avgFirstAudioLatencyMs: metrics.getAvgFirstAudioLatency(),
    },
    timestamp: new Date().toISOString(),
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
  const startTime = Date.now();
  metrics.recordRequest();
  try {
    const { sessionId, text, commit } = req.body;
    if (!sessionId || !text) {
      metrics.recordError();
      return res.status(400).json({ error: '缺少 sessionId 或 text' });
    }

    const manager = TTSSessionManager.getInstance();
    if (!manager.hasActiveSession(sessionId)) {
      manager.enqueueRedisCommand(sessionId, {
        command: 'synthesize',
        text,
        commit,
      });
      metrics.recordChars(text.length);
      metrics.recordLatency(Date.now() - startTime);
      return res.json({ success: true, sessionId, charCount: text.length, queued: true });
    }
    await manager.appendText(sessionId, text);
    if (commit) {
      await manager.commitText(sessionId);
    }

    metrics.recordChars(text.length);
    metrics.recordLatency(Date.now() - startTime);
    res.json({ success: true, sessionId, charCount: text.length });
  } catch (err: any) {
    metrics.recordError();
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
          const token = message.sessionToken;
          metrics.recordRequest();

          if (!message.sessionId) {
            metrics.recordError();
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_SESSION', message: '缺少 sessionId' }));
            ws.close(4002, 'Invalid Session');
            break;
          }

          const requireAuth = process.env.REQUIRE_SESSION_TOKEN_AUTH === 'true';
          if (!token) {
            logger.warn(`⚠️ [TTS] 客户端连接未携带 sessionToken! (sessionId=${message.sessionId})。当前环境已放行，生产环境请开启 REQUIRE_SESSION_TOKEN_AUTH 强制拦截。`);
            if (requireAuth) {
              metrics.recordError();
              ws.send(JSON.stringify({
                type: 'error',
                code: 'UNAUTHORIZED',
                message: '直连 TTS 鉴权失败：缺少必要的 sessionToken',
              }));
              ws.close(4001, 'Unauthorized');
              break;
            }
          } else if (!verifySessionToken(message.sessionId, token)) {
            metrics.recordError();
            logger.warn(`[TTS] 鉴权 Token 校验不匹配: sessionId=${message.sessionId}, token=${token}`);
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: '直连 TTS 鉴权失败：无效或已过期的 sessionToken',
            }));
            ws.close(4001, 'Unauthorized');
            break;
          }

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

            // 结构化业务事件日志：TTS 会话创建
            logger.info(`[TTS] 客户端会话建立成功: 客户端IP=${clientIp}, sessionId=${sessionId}, 音色=${config.voice || 'cherry'}`);
            console.log(JSON.stringify({
              type: 'event',
              event: 'tts_session_created',
              sessionId,
              voice: config.voice || process.env.TTS_VOICE || 'cherry',
              mode: config.mode || process.env.TTS_MODE || 'server_commit',
              timestamp: new Date().toISOString(),
            }));

            ws.send(JSON.stringify({
              type: 'session.created',
              sessionId,
              message: 'TTS 会话已创建，可以开始发送文本',
            }));
          } catch (createErr: any) {
            sessionId = null;
            metrics.recordError();
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
            metrics.recordError();
            ws.send(JSON.stringify({ type: 'error', code: 'SESSION_CLOSED', message: 'TTS 会话已关闭，请重新创建' }));
          } else if (typeof message.text === 'string') {
            // 累计合成字符总量
            metrics.recordChars(message.text.length);
          }
          break;
        }

        case 'text.commit': {
          if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', code: 'NO_SESSION', message: '请先创建会话' }));
            return;
          }
          // 记录 commit 起始时间作为合成延迟起点
          const commitT0 = Date.now();
          const commitOk = await sessionManager.commitText(sessionId);
          if (!commitOk) {
            metrics.recordError();
            ws.send(JSON.stringify({ type: 'error', code: 'SESSION_CLOSED', message: 'TTS 会话已关闭，请重新创建' }));
          } else {
            // 以 commit 后的合成调度耗时作为平均延迟样本（近似首包调度延迟）
            metrics.recordFirstAudioLatency(Date.now() - commitT0);
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
            // 结构化业务事件日志：TTS 会话结束
            console.log(JSON.stringify({
              type: 'event',
              event: 'tts_session_finished',
              sessionId,
              timestamp: new Date().toISOString(),
            }));
            await sessionManager.finishSession(sessionId);
            sessionId = null;
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${message.type}` }));
      }
    } catch (err: any) {
      metrics.recordError();
      logger.error(`[TTS] 消息处理错误: ${err.message}`);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    logger.info(`[TTS] 客户端断开: ${clientIp}`);
    if (sessionId) {
      sessionManager.suspendSession(sessionId).catch(err => {
        logger.error(`[TTS] 挂起会话失败: ${err.message}`);
      });
    }
  });

  ws.on('error', (err) => {
    metrics.recordError();
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
        // App 的 TTS WebSocket 往往晚于 backend-api 的 Redis 指令：无会话时暂存，session.create 后重放
        if (!sessionManager.hasActiveSession(cmd.sessionId)) {
          sessionManager.enqueueRedisCommand(cmd.sessionId, {
            command: 'synthesize',
            text: cmd.text,
            commit: cmd.commit,
          });
          break;
        }
        await sessionManager.handleRedisTextCommand(cmd.sessionId, cmd.text, cmd.commit);
        break;
      }
      case 'commit': {
        if (!sessionManager.hasActiveSession(cmd.sessionId)) {
          sessionManager.enqueueRedisCommand(cmd.sessionId, { command: 'commit' });
          break;
        }
        await sessionManager.commitText(cmd.sessionId);
        break;
      }
      case 'clear': {
        if (!sessionManager.hasActiveSession(cmd.sessionId)) {
          sessionManager.enqueueRedisCommand(cmd.sessionId, { command: 'clear' });
          break;
        }
        await sessionManager.clearText(cmd.sessionId);
        break;
      }
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
  logger.info(`🔊 TTS 微服务已启动 [${serviceId}] - 端口: ${PORT}`);
  logger.info(`   WebSocket 路径: ${SERVICE_URL}`);
  logger.info(`   健康检查: http://localhost:${PORT}/health`);

  // 启动后全局清理上一轮进程可能遗留的 tts:pending:* 指令，
  // 避免服务崩溃 / 重启后旧暂存被新客户端重放（过期音频）。
  // 采用 fire-and-forget：启动不被 Redis 临时不可用阻塞，如未连上则跳过。
  setTimeout(() => {
    redisEventBus
      .clearAllPendingCommands()
      .then((count) => {
        if (count > 0) {
          logger.info(`[TTS] 启动清理：已删除 ${count} 个残留 tts:pending:* key`);
        } else {
          logger.info('[TTS] 启动清理：无残留 tts:pending:* key');
        }
      })
      .catch((err: any) => {
        logger.warn(`[TTS] 启动清理暂存指令失败（不阻塞服务启动）: ${err?.message || err}`);
      });
  }, 1000); // 延迟 1s 等待 RedisEventBus init() 完成订阅/连接

  startHeartbeat();
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
