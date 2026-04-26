import { Prisma } from '@prisma/client';

/**
 * 为 Prisma 操作提供重试机制，特别针对 P1001 (连接超时) 和 P2024 (连接池占满)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 500
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // 判断是否是连接相关的错误
      const isConnectionError = 
        (error instanceof Prisma.PrismaClientKnownRequestError && 
         ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'].includes(error.code)) ||
        error.name === 'PrismaClientInitializationError' ||
        error.name === 'PrismaClientConnectorError';

      const isNetworkTimeout = error.message?.includes('Can\'t reach database server') || 
                               error.message?.includes('Timed out') ||
                               error.message?.includes('Server has closed the connection') ||
                               error.message?.includes('connection limit reached');

      if (isConnectionError || isNetworkTimeout) {
        console.warn(`[PrismaRetry] 数据库连接异常 (尝试 ${i + 1}/${retries}), 错误: ${error.code || error.name || 'Unknown'}. 正在重试...`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // 指数退避
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}
