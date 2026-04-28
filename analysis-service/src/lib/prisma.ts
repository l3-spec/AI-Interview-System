import { PrismaClient } from '@prisma/client';

/**
 * 全进程共用一个 PrismaClient，避免多实例各自占满连接池导致 P2024。
 * 开发环境下挂到 global，配合 ts-node-dev 热重载不重复建连。
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
