const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const currentLevelIndex = LOG_LEVELS.indexOf(currentLevel);

const LOG_TZ = 'Asia/Shanghai';

/** 日志用 ISO-8601，东八区（与原先相同的毫秒精度）。 */
function timestamp(): string {
  const d = new Date();
  const ymdHms = d
    .toLocaleString('sv-SE', { timeZone: LOG_TZ, hour12: false })
    .replace(' ', 'T');
  const ms = d.getUTCMilliseconds().toString().padStart(3, '0');
  return `${ymdHms}.${ms}+08:00`;
}

export const logger = {
  debug(...args: any[]) {
    if (currentLevelIndex <= 0) console.debug(`[${timestamp()}] [DEBUG]`, ...args);
  },
  info(...args: any[]) {
    if (currentLevelIndex <= 1) console.log(`[${timestamp()}] [INFO]`, ...args);
  },
  warn(...args: any[]) {
    if (currentLevelIndex <= 2) console.warn(`[${timestamp()}] [WARN]`, ...args);
  },
  error(...args: any[]) {
    if (currentLevelIndex <= 3) console.error(`[${timestamp()}] [ERROR]`, ...args);
  },
};
