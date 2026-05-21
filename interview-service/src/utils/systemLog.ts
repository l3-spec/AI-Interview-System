import { prisma } from '../lib/prisma';

/**
 * 系统日志记录工具
 * 将操作日志写入 system_logs 表
 */
export async function logSystemAction(params: {
  action: string;
  module: string;
  description: string;
  targetId?: string;
  targetType?: string;
  result?: 'SUCCESS' | 'FAILED' | 'WARNING';
  errorMsg?: string | null;
  adminId?: string;
}): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        action: params.action,
        module: params.module,
        description: params.description,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        result: params.result || 'SUCCESS',
        errorMsg: params.errorMsg || null,
        adminId: params.adminId || null,
      },
    });
  } catch (error) {
    // 日志写入失败不应阻塞业务流程
    console.error('[systemLog] 写入系统日志失败:', error);
  }
}
