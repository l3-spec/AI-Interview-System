import dotenv from 'dotenv';
dotenv.config();

import { initServiceLogger } from './utils/service-logger';
initServiceLogger('asr-service');

import http from 'http';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { ASRSessionManager } from './asr-session-manager';
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

const serviceId = `asr-${uuidv4().slice(0, 8)}`;
const SERVICE_URL = process.env.ASR_SERVICE_EXTERNAL_URL || `ws://localhost:${process.env.ASR_SERVICE_PORT || '3002'}/ws/asr`;

/**
 * 简化版业务指标收集器
 * - 仅使用计数器累加，避免对热路径性能造成影响
 * - 每小时自动重置一次，防止长时间运行导致计数无限增长
 */
class MetricsCollector {
  private requestCount = 0;
  private errorCount = 0;
  private totalLatencyMs = 0;
  private latencySamples = 0;

  recordRequest(): void { this.requestCount++; }
  recordError(): void { this.errorCount++; }
  recordLatency(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.totalLatencyMs += ms;
    this.latencySamples++;
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

  /** 每小时重置一次累计数据（避免无限增长） */
  startPeriodicReset(): void {
    setInterval(() => {
      this.requestCount = 0;
      this.errorCount = 0;
      this.totalLatencyMs = 0;
      this.latencySamples = 0;
    }, 3600 * 1000);
  }
}

const metrics = new MetricsCollector();
metrics.startPeriodicReset();

function startHeartbeat() {
  setInterval(() => {
    serviceDiscoveryService.heartbeat({
      id: serviceId,
      type: 'asr',
      url: SERVICE_URL,
      load: ASRSessionManager.getInstance().getActiveSessionCount(),
      lastSeen: Date.now()
    });
  }, 5000);
}

const app = express();
const PORT = parseInt(process.env.ASR_SERVICE_PORT || '3002', 10);

// CORS 配置
const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins }));
app.use(express.json());

// 健康检查（含业务指标）
app.get('/health', (_req, res) => {
  const manager = ASRSessionManager.getInstance();
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'asr-service',
    model: process.env.ASR_PROVIDER === 'volcengine' ? 'volcengine-streaming-asr' : (process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime'),
    activeSessions: manager.getActiveSessionCount(),
    uptime: Math.round(process.uptime()),
    metrics: metrics.getMetrics(),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
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
  /** 会话创建起始时间，用于统计端到端识别延迟 */
  let sessionStartTime: number | null = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'session.create': {
          const config = message.config || {};
          const token = message.sessionToken;
          // 记录一次会话创建请求（无论成功失败都计入 totalRequests）
          metrics.recordRequest();
          
          if (!message.sessionId) {
            metrics.recordError();
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_SESSION', message: '缺少 sessionId' }));
            ws.close(4002, 'Invalid Session');
            break;
          }

          const requireAuth = process.env.REQUIRE_SESSION_TOKEN_AUTH === 'true';
          if (!token) {
            logger.warn(`⚠️ [ASR] 客户端连接未携带 sessionToken! (sessionId=${message.sessionId})。当前环境已放行，生产环境请开启 REQUIRE_SESSION_TOKEN_AUTH 强制拦截。`);
            if (requireAuth) {
              metrics.recordError();
              ws.send(JSON.stringify({
                type: 'error',
                code: 'UNAUTHORIZED',
                message: '直连 ASR 鉴权失败：缺少必要的 sessionToken',
              }));
              ws.close(4001, 'Unauthorized');
              break;
            }
          } else if (!verifySessionToken(message.sessionId, token)) {
            metrics.recordError();
            logger.warn(`[ASR] 鉴权 Token 校验不匹配: sessionId=${message.sessionId}, token=${token}`);
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: '直连 ASR 鉴权失败：无效或已过期的 sessionToken',
            }));
            ws.close(4001, 'Unauthorized');
            break;
          }

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
            sessionStartTime = Date.now();
            logger.info(`[ASR] 客户端会话建立成功: 客户端IP=${clientIp}, sessionId=${sessionId}, 语言=${config.language || 'zh'}`);
            // 结构化业务事件日志：会话创建
            console.log(JSON.stringify({
              type: 'event',
              event: 'asr_session_created',
              sessionId,
              language: config.language || process.env.ASR_LANGUAGE || 'zh',
              vadMode: config.vadMode || process.env.ASR_VAD_MODE || 'server_vad',
              timestamp: new Date().toISOString(),
            }));
            ws.send(JSON.stringify({
              type: 'session.created',
              sessionId,
              message: 'ASR 会话已创建，可以开始发送音频数据',
            }));
          } catch (createErr: any) {
            sessionId = null;
            metrics.recordError();
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
            // 记录会话整体耗时作为延迟样本（端到端音频持续时长）
            if (sessionStartTime !== null) {
              metrics.recordLatency(Date.now() - sessionStartTime);
            }
            // 结构化业务事件日志：会话结束
            console.log(JSON.stringify({
              type: 'event',
              event: 'asr_session_finished',
              sessionId,
              durationMs: sessionStartTime ? Date.now() - sessionStartTime : 0,
              timestamp: new Date().toISOString(),
            }));
            await sessionManager.finishSession(sessionId);
            sessionId = null;
            sessionStartTime = null;
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${message.type}` }));
      }
    } catch (err: any) {
      metrics.recordError();
      logger.error(`[ASR] 消息处理错误: ${err.message}`);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    logger.info(`[ASR] 客户端断开: ${clientIp}`);
    if (sessionId) {
      sessionManager.suspendSession(sessionId).catch(err => {
        logger.error(`[ASR] 挂起会话失败: ${err.message}`);
      });
    }
  });

  ws.on('error', (err) => {
    metrics.recordError();
    logger.error(`[ASR] WebSocket 错误: ${err.message}`);
  });
});

// 初始化 Redis 事件总线（ASR 识别结果 → backend-api；并接收 asr:commands）
const redisEventBus = new RedisEventBus();
sessionManager.setRedisBus(redisEventBus);

server.listen(PORT, () => {
  logger.info(`🎙️ ASR 微服务已启动 [${serviceId}] - 端口: ${PORT}`);
  logger.info(`   WebSocket 路径: ${SERVICE_URL}`);
  logger.info(`   健康检查: http://localhost:${PORT}/health`);
  logger.info(`   ASR 模型: ${process.env.ASR_PROVIDER === 'volcengine' ? 'volcengine-streaming-asr' : (process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime')}`);
  
  startHeartbeat();
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
