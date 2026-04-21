const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const currentLevelIndex = LOG_LEVELS.indexOf(currentLevel);

function timestamp(): string {
  return new Date().toISOString();
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
