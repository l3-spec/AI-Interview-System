/**
 * Prisma 工具函数
 * 提供自动重试等常用功能
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

/**
 * 带指数退避重试的 Prisma 操作包装器
 * 针对 P1017（连接已断开）、P2024（连接池超时）等瞬态错误自动重试
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const prismaError = error as { code?: string };
      const retryableCodes = ['P1017', 'P2024', 'P1001', 'P1008'];

      if (attempt < maxRetries && retryableCodes.includes(prismaError?.code || '')) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[prismaUtils] Prisma 操作失败 (${prismaError.code})，${delay}ms 后重试 (${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
