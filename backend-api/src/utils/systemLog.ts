import { prisma } from '../lib/prisma';

interface LogInput {
  adminId?: string | null;
  action: string;
  module: string;
  description: string;
  targetId?: string | null;
  targetType?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  result?: string;
  errorMsg?: string | null;
}

export const logSystemAction = async (input: LogInput) => {
  try {
    await prisma.systemLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        module: input.module,
        description: input.description,
        targetId: input.targetId ?? null,
        targetType: input.targetType ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        result: input.result ?? 'SUCCESS',
        errorMsg: input.errorMsg ?? null,
      },
    });
  } catch (err) {
    console.warn('写入系统日志失败', err);
  }
};
