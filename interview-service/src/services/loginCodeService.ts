import { randomInt } from 'crypto';
import { smsService } from './smsService';

interface LoginCodeRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCount: number;
}

const CODE_TTL_MS = 5 * 60 * 1000; // 5分钟验证码有效期
const RESEND_INTERVAL_MS = 60 * 1000; // 60秒后允许重新发送
const MAX_ATTEMPTS = 5; // 验证码最大尝试次数
const MAX_SEND_PER_HOUR = 10; // 每小时最大发送次数

const records = new Map<string, LoginCodeRecord>();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [phone, record] of records.entries()) {
    if (record.expiresAt <= now) {
      records.delete(phone);
    }
  }
};

const maskPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) {
    return phone;
  }
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
};

export interface SendCodeResult {
  code?: string;
  expiresIn: number;
  resendIn: number;
}

const FIXED_CODE = process.env.LOGIN_CODE_FIXED_CODE;
const skipSmsSend = process.env.LOGIN_CODE_SKIP_SMS === 'true';

export class LoginCodeService {
  async requestCode(phone: string): Promise<SendCodeResult> {
    cleanupExpired();

    const now = Date.now();
    const existing = records.get(phone);

    if (existing) {
      const cooldown = existing.lastSentAt + RESEND_INTERVAL_MS - now;
      if (cooldown > 0) {
        const seconds = Math.ceil(cooldown / 1000);
        throw new Error(`请等待${seconds}秒后再试`);
      }

      const windowStart = now - 60 * 60 * 1000;
      if (existing.lastSentAt >= windowStart && existing.sendCount >= MAX_SEND_PER_HOUR) {
        throw new Error('验证码请求过于频繁，请稍后再试');
      }
    }
    const code = FIXED_CODE && FIXED_CODE.length > 0 ? FIXED_CODE : randomInt(100000, 1000000).toString();
    const expiresAt = now + CODE_TTL_MS;

    records.set(phone, {
      code,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      sendCount: existing ? existing.sendCount + 1 : 1
    });

    const maskedPhone = maskPhoneNumber(phone);
    console.info(`[LoginCode] 生成验证码 ${code}，目标手机号 ${maskedPhone}，短信服务 ${smsService.activeProvider}`);

    if (!skipSmsSend) {
      try {
        await smsService.sendVerificationCode(phone, code);
        console.info(`[LoginCode] 验证码已提交至 ${smsService.activeProvider} 短信服务`);
      } catch (error) {
        records.delete(phone);
        throw new Error(error instanceof Error ? error.message : '短信发送失败，请稍后再试');
      }
    }

    const exposeCode =
      skipSmsSend ||
      smsService.activeProvider === 'mock' ||
      (process.env.NODE_ENV || 'development') !== 'production';

    return {
      code: exposeCode ? code : undefined,
      expiresIn: Math.floor(CODE_TTL_MS / 1000),
      resendIn: Math.floor(RESEND_INTERVAL_MS / 1000)
    };
  }

  verifyCode(phone: string, code: string): boolean {
    cleanupExpired();

    const record = records.get(phone);
    if (!record) {
      return false;
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      records.delete(phone);
      return false;
    }

    record.attempts += 1;

    if (record.code !== code) {
      if (record.attempts >= MAX_ATTEMPTS) {
        records.delete(phone);
      }
      return false;
    }

    records.delete(phone);
    return true;
  }

  generateLocalCode(phone: string): SendCodeResult {
    const now = Date.now();
    const existing = records.get(phone);
    const code = existing?.code || (FIXED_CODE && FIXED_CODE.length > 0 ? FIXED_CODE : randomInt(100000, 1000000).toString());
    const expiresAt = now + CODE_TTL_MS;

    records.set(phone, {
      code,
      expiresAt,
      attempts: existing?.attempts ?? 0,
      lastSentAt: now,
      sendCount: existing ? existing.sendCount + 1 : 1
    });

    console.warn(`[LoginCode] 使用本地回退验证码 ${code}，手机号 ${maskPhoneNumber(phone)}`);

    return {
      code,
      expiresIn: Math.floor(CODE_TTL_MS / 1000),
      resendIn: Math.floor(RESEND_INTERVAL_MS / 1000)
    };
  }
}

export const loginCodeService = new LoginCodeService();

export const LOGIN_CODE_RESEND_SECONDS = Math.floor(RESEND_INTERVAL_MS / 1000);
