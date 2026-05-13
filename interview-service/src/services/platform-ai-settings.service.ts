import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma';
import { withRetry } from '../utils/prismaUtils';

/** 存于 DB 的键与合并到环境变量的映射 */
export type PlatformAiSettingsPayload = {
  dashscopeApiKey?: string;
  dashscopeWsUrl?: string;
  qwenAsrModel?: string;
  qwenTtsModel?: string;
  ttsVoice?: string;
  ttsLanguage?: string;
  deepseekApiKey?: string;
  deepseekModel?: string;
  deepseekApiUrl?: string;
};

export type MergedPlatformAiConfig = {
  dashscopeApiKey: string;
  dashscopeWsUrl: string;
  qwenAsrModel: string;
  qwenTtsModel: string;
  ttsVoice: string;
  ttsLanguage: string;
  deepseekApiKey: string;
  deepseekModel: string;
  deepseekApiUrl: string;
};

const GLOBAL_ID = 'global';
const CACHE_TTL_MS = 15_000;
let cache: { cfg: MergedPlatformAiConfig; at: number } | null = null;

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function invalidatePlatformAiConfigCache(): void {
  cache = null;
}

/**
 * 合并顺序：数据库 platform_ai_settings → process.env → 内置默认
 */
export async function getMergedPlatformAiConfig(): Promise<MergedPlatformAiConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.cfg;
  }

  const row = await withRetry(() => prisma.platformAiSettings.findUnique({ where: { id: GLOBAL_ID } }));
  const db = (row?.settings as Record<string, string>) || {};

  const cfg: MergedPlatformAiConfig = {
    dashscopeApiKey: trimStr(db.dashscopeApiKey) || (process.env.DASHSCOPE_API_KEY || '').trim(),
    dashscopeWsUrl:
      trimStr(db.dashscopeWsUrl) ||
      (process.env.DASHSCOPE_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime').trim(),
    qwenAsrModel:
      trimStr(db.qwenAsrModel) ||
      (
        process.env.QWEN_ASR_MODEL ||
        'qwen3-asr-flash-realtime,qwen3-asr-flash-realtime-2025-10-27,qwen3-asr-flash-realtime-2026-02-10,qwen3-asr-flash-2026-02-10,qwen3-asr-flash-2025-09-08'
      ).trim(),
    qwenTtsModel:
      trimStr(db.qwenTtsModel) ||
      (
        process.env.QWEN_TTS_MODEL ||
        'qwen3-tts-flash-realtime,qwen3-tts-flash-realtime-2025-11-27,qwen3-tts-flash-realtime-2025-09-18,qwen3-tts-flash-2025-09-18,qwen3-tts-flash-2025-11-27,qwen3-tts-flash'
      ).trim(),
    ttsVoice: trimStr(db.ttsVoice) || (process.env.TTS_VOICE || 'Cherry').trim(),
    ttsLanguage: trimStr(db.ttsLanguage) || (process.env.TTS_LANGUAGE || 'Chinese').trim(),
    deepseekApiKey:
      trimStr(db.deepseekApiKey) ||
      (process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim(),
    deepseekModel:
      trimStr(db.deepseekModel) ||
      (process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
    deepseekApiUrl:
      trimStr(db.deepseekApiUrl) ||
      (
        process.env.LLM_API_URL ||
        process.env.DEEPSEEK_API_URL ||
        'https://api.deepseek.com/v1/chat/completions'
      ).trim(),
  };

  cache = { cfg, at: Date.now() };
  return cfg;
}

function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/** 管理端展示：不含明文密钥，仅脱敏 */
export async function getPlatformAiSettingsForAdmin(): Promise<{
  dashscopeWsUrl: string;
  qwenAsrModel: string;
  qwenTtsModel: string;
  ttsVoice: string;
  ttsLanguage: string;
  deepseekModel: string;
  deepseekApiUrl: string;
  dashscopeApiKeyMasked: string;
  deepseekApiKeyMasked: string;
}> {
  const c = await getMergedPlatformAiConfig();
  return {
    dashscopeWsUrl: c.dashscopeWsUrl,
    qwenAsrModel: c.qwenAsrModel,
    qwenTtsModel: c.qwenTtsModel,
    ttsVoice: c.ttsVoice,
    ttsLanguage: c.ttsLanguage,
    deepseekModel: c.deepseekModel,
    deepseekApiUrl: c.deepseekApiUrl,
    dashscopeApiKeyMasked: maskSecret(c.dashscopeApiKey),
    deepseekApiKeyMasked: maskSecret(c.deepseekApiKey),
  };
}

/**
 * 更新 DB 中的键；空字符串表示删除该键（回退到环境变量）
 */
export async function updatePlatformAiSettingsInDb(body: PlatformAiSettingsPayload): Promise<void> {
  const row = await withRetry(() => prisma.platformAiSettings.findUnique({ where: { id: GLOBAL_ID } }));
  const cur = { ...((row?.settings as Record<string, string>) || {}) };

  const apply = (key: keyof PlatformAiSettingsPayload, envKey: string) => {
    const v = body[key];
    if (v === undefined) return;
    const s = typeof v === 'string' ? v.trim() : '';
    if (s === '') delete cur[envKey];
    else cur[envKey] = s;
  };

  apply('dashscopeApiKey', 'dashscopeApiKey');
  apply('dashscopeWsUrl', 'dashscopeWsUrl');
  apply('qwenAsrModel', 'qwenAsrModel');
  apply('qwenTtsModel', 'qwenTtsModel');
  apply('ttsVoice', 'ttsVoice');
  apply('ttsLanguage', 'ttsLanguage');
  apply('deepseekApiKey', 'deepseekApiKey');
  apply('deepseekModel', 'deepseekModel');
  apply('deepseekApiUrl', 'deepseekApiUrl');

  await withRetry(() => prisma.platformAiSettings.upsert({
    where: { id: GLOBAL_ID },
    create: { id: GLOBAL_ID, settings: cur },
    update: { settings: cur },
  }));

  invalidatePlatformAiConfigCache();
}

/** 通知 ASR/TTS 微服务刷新进程内环境变量（需 REDIS_URL） */
export async function publishPlatformAiPatch(cfg: MergedPlatformAiConfig): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  const patch: Record<string, string> = {
    DASHSCOPE_API_KEY: cfg.dashscopeApiKey,
    DASHSCOPE_WS_URL: cfg.dashscopeWsUrl,
    QWEN_ASR_MODEL: cfg.qwenAsrModel,
    QWEN_TTS_MODEL: cfg.qwenTtsModel,
    TTS_VOICE: cfg.ttsVoice,
    TTS_LANGUAGE: cfg.ttsLanguage,
  };

  try {
    const r = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
    r.on('error', () => { /* ignore errors for short-lived pub */ });
    await r.connect();
    await r.publish('platform:ai_settings', JSON.stringify(patch));
    r.disconnect();
  } catch {
    /* 微服务可无 Redis */
  }
}

export async function warmPlatformAiConfigRuntime(): Promise<void> {
  const cfg = await getMergedPlatformAiConfig();
  const { dashScopeService } = await import('./dashscope.service');
  const { deepseekService } = await import('./deepseek.service');
  dashScopeService.refreshFromPlatformConfig(cfg);
  deepseekService.refreshFromPlatformConfig(cfg);
}
