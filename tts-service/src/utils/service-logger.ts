import Redis from 'ioredis';

// 保存原始 console 方法，防止死循环和用于最底层的标准输出
const originalMethods = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

let isReporting = false;
let logBuffer: Array<{ level: string; message: string; timestamp: string }> = [];
let uploadTimer: NodeJS.Timeout | null = null;

let redisClient: Redis | null = null;
let serviceName = 'unknown-service';
let backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3001';

/**
 * 初始化微服务日志收集与拦截上报机制
 * @param name 微服务名称，如 'asr-service' 等
 */
export function initServiceLogger(name: string) {
  serviceName = name;

  // 1. 尝试连接 Redis，为日志传输建立首选通道
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        lazyConnect: true,
      });
      
      redisClient.connect().catch((err) => {
        originalMethods.error(`[Logger Redis Conn Error] 子服务 ${serviceName} Redis 连接失败: ${err.message}`);
      });

      redisClient.on('error', (err) => {
        originalMethods.error(`[Logger Redis Error] 子服务 ${serviceName} Redis 错误: ${err.message}`);
      });
    } catch (e: any) {
      originalMethods.error(`[Logger Redis Init Error] 子服务 ${serviceName} Redis 初始化异常: ${e.message}`);
    }
  }

  // 2. 拦截控制台方法
  const hijack = (level: 'info' | 'warn' | 'error') => {
    const original = originalMethods[level === 'info' ? 'log' : level] || originalMethods.log;
    return (...args: any[]) => {
      // 仍然输出到控制台/终端，便于原本的日志收集（如 Docker Logs）正常工作
      original(...args);

      // 如果当前正在进行日志上报过程，不予收集，防止死循环
      if (isReporting) return;

      // 序列化日志参数
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      queueLog(level, message);
    };
  };

  console.log = hijack('info');
  console.info = hijack('info');
  console.warn = hijack('warn');
  console.error = hijack('error');
}

/**
 * 将日志存入缓冲区，并设置 200ms 防抖定时上报
 */
function queueLog(level: string, message: string) {
  const timestamp = new Date().toISOString();
  
  logBuffer.push({
    level,
    message,
    timestamp,
  });

  if (logBuffer.length > 1000) {
    logBuffer.shift();
  }

  if (!uploadTimer) {
    uploadTimer = setTimeout(() => {
      uploadTimer = null;
      flushLogs();
    }, 200);
  }
}

/**
 * 冲刷缓冲区，统一向 backend-api 汇总日志
 */
async function flushLogs() {
  if (logBuffer.length === 0 || isReporting) return;

  isReporting = true;
  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    if (redisClient && redisClient.status === 'ready') {
      // 子服务优先通过 Redis 发布
      const channel = 'system:service_logs';
      for (const log of logsToSend) {
        await redisClient.publish(channel, JSON.stringify({
          serviceName,
          ...log,
        }));
      }
    } else {
      // 如果 Redis 不可用，降级使用原生 fetch (Node 18+) 进行 HTTP POST 上报
      const res = await fetch(`${backendUrl}/api/system/logs/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          logs: logsToSend,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    }
  } catch (err: any) {
    // 必须使用最原始的 error 打印，确保不被二次拦截陷入死循环
    originalMethods.error(`[Logger Upload Error] Failed to upload logs for ${serviceName}:`, err.message);
  } finally {
    isReporting = false;
  }
}
