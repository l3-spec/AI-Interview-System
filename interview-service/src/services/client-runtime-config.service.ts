import { Request } from 'express';
import { getMergedPlatformAiConfig } from './platform-ai-settings.service';

function trim(s: string | undefined): string {
  return (s || '').trim();
}

/**
 * 推断移动端应使用的「API 根地址」（带 /api/ 后缀），用于替换 BuildConfig 中的 API_BASE_URL。
 * 优先读 PUBLIC_API_BASE_URL；否则用当前请求的 Host/Proto（适配反向代理后的公网地址）。
 */
export function inferPublicApiBaseUrl(req: Request): string {
  const fromEnv = trim(process.env.PUBLIC_API_BASE_URL);
  if (fromEnv) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`;
  }
  const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const proto =
    forwardedProto || (req.get('X-Forwarded-SSL') === 'on' ? 'https' : null) || null;
  const finalProto =
    proto || ((req.socket as { encrypted?: boolean }).encrypted ? 'https' : 'http');
  const host = trim(req.headers['x-forwarded-host'] as string) || trim(req.get('host')) || `127.0.0.1:${process.env.PORT || 3001}`;
  return `${finalProto}://${host}/api/`;
}

/** Socket.IO 与 HTTP API 同机部署时，去掉 /api/ 段 */
export function toRealtimeSocketUrl(apiBase: string): string {
  return apiBase
    .replace(/\/?api\/?$/i, '')
    .replace(/\/+$/, '');
}

function httpBaseForMicroservice(wsUrl: string, httpOverride: string): string {
  if (httpOverride) return httpOverride.replace(/\/+$/, '');
  try {
    const u = new URL(wsUrl.replace(/^ws/i, 'http'));
    const protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    const portPart = u.port ? `:${u.port}` : '';
    return `${protocol}//${u.hostname}${portPart}`;
  } catch {
    return 'http://127.0.0.1:3002';
  }
}

/**
 * 由 API 基址推导 ASR/TTS 的 WebSocket 地址：同 host，端口可配，路径固定 /ws/asr、/ws/tts。
 * 生产环境若经网关暴露为独立子域，请设置 CLIENT_ASR_WS_URL / CLIENT_TTS_WS_URL 全量覆盖。
 */
function buildMicroserviceUrls(apiBase: string) {
  const asrOverride = trim(process.env.CLIENT_ASR_WS_URL);
  const ttsOverride = trim(process.env.CLIENT_TTS_WS_URL);
  const asrHttpOverride = trim(process.env.CLIENT_ASR_HTTP_BASE);
  const ttsHttpOverride = trim(process.env.CLIENT_TTS_HTTP_BASE);

  if (asrOverride && ttsOverride) {
    return {
      asrServiceWsUrl: asrOverride,
      ttsServiceWsUrl: ttsOverride,
      asrServiceHttpUrl: httpBaseForMicroservice(asrOverride, asrHttpOverride),
      ttsServiceHttpUrl: httpBaseForMicroservice(ttsOverride, ttsHttpOverride),
    };
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBase);
  } catch {
    apiUrl = new URL('http://127.0.0.1:3001/api/');
  }

  const isHttps = apiUrl.protocol === 'https:';
  const host = apiUrl.hostname;
  const asrPort = trim(process.env.ASR_SERVICE_PUBLIC_PORT) || '3002';
  const ttsPort = trim(process.env.TTS_SERVICE_PUBLIC_PORT) || '3003';
  const wsScheme = isHttps || trim(process.env.CLIENT_WS_FORCE_WSS) === 'true' ? 'wss' : 'ws';
  const asrWs = asrOverride || `${wsScheme}://${host}:${asrPort}/ws/asr`;
  const ttsWs = ttsOverride || `${wsScheme}://${host}:${ttsPort}/ws/tts`;
  const httpScheme = isHttps ? 'https' : 'http';
  const asrHttp = asrHttpOverride || `${httpScheme}://${host}:${asrPort}`;
  const ttsHttp = ttsHttpOverride || `${httpScheme}://${host}:${ttsPort}`;

  return {
    asrServiceWsUrl: asrWs,
    ttsServiceWsUrl: ttsWs,
    asrServiceHttpUrl: asrHttp,
    ttsServiceHttpUrl: ttsHttp,
  };
}

export type ClientRuntimeConfigJson = {
  apiBaseUrl: string;
  realtimeSocketUrl: string;
  asrServiceWsUrl: string;
  ttsServiceWsUrl: string;
  asrServiceHttpUrl: string;
  ttsServiceHttpUrl: string;
  qwenAsrModel: string;
  qwenTtsModel: string;
  ttsVoice: string;
  ttsLanguage: string;
  ttsInstructions: string;
  dashScopeApiKey: string;
  dashScopeBaseUrl: string;
  volcanoAppId: string;
  volcanoApiKey: string;
  duixBaseConfigUrl: string;
  duixModelUrl: string;
  airiWebUrl: string;
  aliyunAvatarProjectId: string;
  aliyunAvatarApiUrl: string;
  aliyunAvatarInstanceId: string;
  aliyunAccessKeyId: string;
  aliyunAccessKeySecret: string;
};

/**
 * 聚合环境变量、平台 AI 设置与当前请求，供 Android 在启动时拉取，避免在 APK 中硬编码微服务与密钥。
 * 安全：生产环境若不希望明文下发密钥，请设置 HIDE_CLIENT_RUNTIME_SECRETS=true。
 */
export async function getClientRuntimeConfig(req: Request): Promise<ClientRuntimeConfigJson> {
  const merged = await getMergedPlatformAiConfig();
  const apiBase = inferPublicApiBaseUrl(req);
  const { asrServiceWsUrl, ttsServiceWsUrl, asrServiceHttpUrl, ttsServiceHttpUrl } = buildMicroserviceUrls(apiBase);

  const ttsInstructions =
    trim(process.env.TTS_INSTRUCTIONS) ||
    trim(process.env.CLIENT_TTS_INSTRUCTIONS) ||
    '语气专业沉稳，节奏适中，像一位经验丰富的面试官。';

  const hideSecrets = trim(process.env.HIDE_CLIENT_RUNTIME_SECRETS).toLowerCase() === 'true';
  const mask = (s: string) => (hideSecrets ? '' : s);

  return {
    apiBaseUrl: apiBase,
    realtimeSocketUrl: toRealtimeSocketUrl(apiBase),
    asrServiceWsUrl,
    ttsServiceWsUrl,
    asrServiceHttpUrl,
    ttsServiceHttpUrl,
    qwenAsrModel: merged.qwenAsrModel,
    qwenTtsModel: merged.qwenTtsModel,
    ttsVoice: merged.ttsVoice,
    ttsLanguage: merged.ttsLanguage,
    ttsInstructions,
    dashScopeApiKey: mask(merged.dashscopeApiKey),
    dashScopeBaseUrl:
      trim(process.env.DASHSCOPE_LINGMOU_BASE_URL) || 'https://lingmou.cn-beijing.aliyuncs.com',
    volcanoAppId: mask(trim(process.env.VOLCANO_APP_ID)),
    volcanoApiKey: mask(trim(process.env.VOLCANO_API_KEY)),
    duixBaseConfigUrl: trim(process.env.DUIX_BASE_CONFIG_URL) || '',
    duixModelUrl: trim(process.env.DUIX_MODEL_URL) || '',
    airiWebUrl: trim(process.env.AIRI_WEB_URL) || 'http://127.0.0.1:3000/avatar',
    aliyunAvatarProjectId: trim(process.env.ALIYUN_AVATAR_PROJECT_ID) || '',
    aliyunAvatarApiUrl: trim(process.env.ALIYUN_AVATAR_API_URL) || '',
    aliyunAvatarInstanceId: trim(process.env.ALIYUN_AVATAR_INSTANCE_ID) || '',
    aliyunAccessKeyId: mask(trim(process.env.ALIYUN_ACCESS_KEY_ID)),
    aliyunAccessKeySecret: mask(trim(process.env.ALIYUN_ACCESS_KEY_SECRET)),
  };
}
