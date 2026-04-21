import { Router } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { volcOpenApiService } from '../services/volc-openapi.service';
import { aliyunTokenService } from '../services/aliyun-token.service';
import { ttsService } from '../services/ttsService';

const router = Router();

/**
 * 获取 Qwen3 ASR/TTS 微服务连接配置
 * 客户端通过此接口获取 ASR/TTS 微服务的 WebSocket 地址，直接建立长连接
 */
router.get('/qwen3-config', async (_req, res) => {
  const asrServiceUrl = process.env.ASR_SERVICE_URL || 'http://localhost:3002';
  const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://localhost:3003';
  const asrWsUrl = asrServiceUrl.replace(/^http/, 'ws') + '/ws/asr';
  const ttsWsUrl = ttsServiceUrl.replace(/^http/, 'ws') + '/ws/tts';

  // 检查微服务健康状态
  let asrHealth: any = null;
  let ttsHealth: any = null;
  try {
    const asrRes = await fetch(`${asrServiceUrl}/health`);
    asrHealth = await asrRes.json();
  } catch { /* ASR 服务不可用 */ }

  try {
    const ttsRes = await fetch(`${ttsServiceUrl}/health`);
    ttsHealth = await ttsRes.json();
  } catch { /* TTS 服务不可用 */ }

  res.json({
    success: true,
    data: {
      provider: 'qwen3',
      architecture: 'dual-track-hybrid-streaming',
      asr: {
        wsUrl: asrWsUrl,
        model: process.env.QWEN_ASR_MODEL || 'qwen3-asr-flash-realtime',
        available: asrHealth?.status === 'ok',
        activeSessions: asrHealth?.activeSessions || 0,
        defaultConfig: {
          language: 'zh',
          sampleRate: 16000,
          inputFormat: 'pcm',
          vadMode: 'server_vad',
        },
      },
      tts: {
        wsUrl: ttsWsUrl,
        model: process.env.QWEN_TTS_MODEL || 'qwen3-tts-instruct-flash-realtime',
        available: ttsHealth?.status === 'ok',
        activeSessions: ttsHealth?.activeSessions || 0,
        defaultConfig: {
          voice: process.env.TTS_VOICE || 'Cherry',
          sampleRate: 24000,
          responseFormat: 'pcm',
          mode: 'server_commit',
          language: 'Auto',
        },
      },
    },
  });
});

// 确保无论从哪个工作目录启动，都加载 backend-api/.env
const envPath = path.resolve(__dirname, '../../.env');
const loaded = dotenv.config({ path: envPath });
if (!loaded.error) {
  process.env.__VOICE_ROUTE_ENV = envPath;
}

const trim = (value?: string | null) => value?.trim() ?? '';

router.get('/aliyun-token', async (req, res) => {
  console.log('[Voice Route] 📨 /aliyun-token 请求已接收', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    },
  });
  
  const appKey = trim(process.env.ALIYUN_NLS_APP_KEY || process.env.ALIYUN_TTS_APP_KEY);
  if (!appKey) {
    console.warn('[Voice Route] ⚠️ 未配置 ALIYUN_NLS_APP_KEY');
    return res.status(400).json({ success: false, message: '未配置 ALIYUN_NLS_APP_KEY' });
  }

  console.log('[Voice Route] 🔑 AppKey已配置:', appKey.substring(0, 8) + '...');

  try {
    console.log('[Voice Route] 🔄 开始获取阿里云Token...');
    const tokenInfo = await aliyunTokenService.getToken();
    console.log('[Voice Route] ✅ Token获取成功, expireTime:', new Date(tokenInfo.expireTime).toISOString());
    
    const region = tokenInfo.region;
    const asrSampleRate = parseInt(process.env.ALIYUN_NLS_SAMPLE_RATE || '16000', 10);
    const asrFormat = trim(process.env.ALIYUN_NLS_FORMAT) || 'pcm';
    const enablePunc = trim(process.env.ALIYUN_NLS_ENABLE_PUNCTUATION || 'true');
    const enableItn = trim(process.env.ALIYUN_NLS_ENABLE_ITN || 'true');
    const enableVad = trim(process.env.ALIYUN_NLS_ENABLE_VAD || 'false');

    const defaultEndpoint = `https://nls-gateway.${region}.aliyuncs.com/stream/v1/asr`;
    const asrEndpoint = trim(process.env.ALIYUN_NLS_ENDPOINT) || defaultEndpoint;
    const defaultTtsEndpoint = `https://nls-gateway.${region}.aliyuncs.com/stream/v1/tts`;
    const ttsEndpoint = trim(process.env.ALIYUN_NLS_TTS_ENDPOINT) || defaultTtsEndpoint;
    const ttsVoice = trim(process.env.ALIYUN_TTS_VOICE) || 'siqi';
    const ttsFormat = trim(process.env.ALIYUN_TTS_FORMAT) || 'mp3';
    const ttsSampleRate = parseInt(process.env.ALIYUN_TTS_SAMPLE_RATE || '16000', 10);

    const responseData = {
      success: true,
      data: {
        token: tokenInfo.token,
        expireTime: tokenInfo.expireTime,
        appKey,
        region,
        asr: {
          endpoint: asrEndpoint,
          format: asrFormat,
          sampleRate: asrSampleRate,
          enablePunctuation: enablePunc,
          enableITN: enableItn,
          enableVAD: enableVad,
        },
        tts: {
          endpoint: ttsEndpoint,
          voice: ttsVoice,
          format: ttsFormat,
          sampleRate: ttsSampleRate,
        },
      },
    };

    console.log('[Voice Route] 📤 返回配置:', {
      region,
      asrEndpoint,
      asrFormat,
      asrSampleRate,
      ttsEndpoint,
      ttsVoice,
      ttsFormat,
      ttsSampleRate,
    });

    return res.json(responseData);
  } catch (error: any) {
    console.error('[Voice Route] ❌ 获取阿里云Token失败:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '获取阿里云 Token 失败',
    });
  }
});

router.get('/config', async (req, res) => {
  const debugFlag = req.query.debug;
  const debugMode = Array.isArray(debugFlag)
    ? debugFlag.includes('1') || debugFlag.includes('true')
    : (typeof debugFlag === 'string' && (debugFlag === '1' || debugFlag.toLowerCase() === 'true'));

  const aliyunAppKey = trim(process.env.ALIYUN_NLS_APP_KEY);
  const aliyunAccessKeyId = trim(process.env.ALIYUN_NLS_ACCESS_KEY_ID || process.env.ALIYUN_TTS_ACCESS_KEY_ID);
  const aliyunAccessKeySecret = trim(process.env.ALIYUN_NLS_ACCESS_KEY_SECRET || process.env.ALIYUN_TTS_ACCESS_KEY_SECRET);

  if (aliyunAppKey && aliyunAccessKeyId && aliyunAccessKeySecret) {
    const sampleRate = parseInt(process.env.ALIYUN_NLS_SAMPLE_RATE || '16000', 10);
    const format = process.env.ALIYUN_NLS_FORMAT?.trim() || 'pcm';
    const provider = 'aliyun';
    const ttsMode = typeof ttsService.getMode === 'function' ? ttsService.getMode() : 'server';

    res.json({
      success: true,
      data: {
        provider,
        serverSide: true,
        sampleRate,
        format,
        ttsMode,
        message: 'ASR/TTS 由服务器端阿里云SDK托管，客户端无需额外鉴权',
      },
    });
    return;
  }

  const volcAppId = trim(process.env.VOLC_APP_ID);
  const rtcAppId = trim(process.env.RTC_APP_ID);
  const legacyAppId = trim(process.env.VOLCENGINE_APP_ID);
  console.log(
    '[Voice Config Route] handling request',
    JSON.stringify({
      debugFlag: req.query.debug,
      volcAppId,
      rtcAppId,
      legacyAppId,
      loadedEnvPath: process.env.__CONFIG_LOADED_ENV,
    })
  );
  const appId = volcAppId;
  const manualAppKey = trim(process.env.VOLC_APP_KEY);
  
  // ASR Cluster 配置
  const asrCluster =
    trim(process.env.VOLC_CLUSTER || process.env.RTC_CLUSTER || process.env.RTC_REGION) ||
    'volcengine_streaming_common';
  
  // TTS Cluster 配置（独立配置，与ASR可以不同）
  const ttsCluster = trim(process.env.VOLC_TTS_CLUSTER) || 'volcano_tts';
  
  const asrAddress = trim(process.env.VOLC_ASR_ADDRESS || process.env.VOLC_WS_ADDRESS) || 'wss://openspeech.bytedance.com';
  const asrUri = trim(process.env.VOLC_ASR_URI) || '/api/v2/asr';
  const ttsUri = trim(process.env.VOLC_TTS_URI) || '/api/v3/tts/bidirection';
  const asrResourceId = trim(process.env.VOLC_ASR_RESOURCE_ID) || undefined;
  const ttsResourceId = trim(process.env.VOLC_TTS_RESOURCE_ID) || undefined;
  const asrReqParamsEnv = process.env.VOLC_ASR_REQ_PARAMS?.trim();
  
  // VAD 配置参数
  const vadStartSilenceMs = process.env.VOLC_VAD_START_SILENCE_MS 
    ? parseInt(process.env.VOLC_VAD_START_SILENCE_MS, 10) 
    : undefined;
  const vadEndSilenceMs = process.env.VOLC_VAD_END_SILENCE_MS 
    ? parseInt(process.env.VOLC_VAD_END_SILENCE_MS, 10) 
    : undefined;

  const parseJsonObject = (value?: string): Record<string, any> | undefined => {
    if (!value) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, any>;
      }
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('解析 VOLC_ASR_REQ_PARAMS 失败:', reason);
    }
    return undefined;
  };

  const asrReqParams = parseJsonObject(asrReqParamsEnv) ?? (asrResourceId ? { res_id: asrResourceId } : undefined);
  if (asrReqParams && asrResourceId && !asrReqParams.res_id) {
    asrReqParams.res_id = asrResourceId;
  }

  if (!appId) {
    res.status(500).json({
      success: false,
      message: '火山引擎配置缺失：请在 backend-api/.env 中设置 VOLC_APP_ID',
    });
    return;
  }

  try {
    const tokenResult = await volcOpenApiService.getToken();

    // 当使用环境变量 token 时不应设置 appKey，否则会导致火山引擎认证冲突（错误码 -104）
    // 只有在使用 API 方式获取的 token 或手动配置的 appKey 时才设置
    const resolvedAppKey = tokenResult.source === 'env' 
      ? undefined 
      : (manualAppKey || (tokenResult.source === 'api' ? tokenResult.rawToken : undefined));
    
    console.log(`[Voice Config] tokenSource=${tokenResult.source}, hasManualAppKey=${!!manualAppKey}, resolvedAppKey=${resolvedAppKey ? 'set' : 'undefined'}`);

    const optionalFields: Record<string, unknown> = {
      appKey: resolvedAppKey,
      address: asrAddress,
      uri: asrUri,
      asrUri,
      wsAddress: trim(process.env.VOLC_WS_ADDRESS) || asrAddress,
      resourceId: asrResourceId,
      asrResourceId,
      asrCluster,
      ttsUri,
      ttsResourceId,
      ttsCluster,
      language: trim(process.env.VOLC_LANGUAGE) || undefined,
      tokenSource: tokenResult.source,
      tokenExpiresAt: tokenResult.expiresAt ? new Date(tokenResult.expiresAt).toISOString() : undefined,
      reqParams: asrReqParams,
      asrReqParams,
      vadStartSilenceMs,
      vadEndSilenceMs,
    };

    const data: Record<string, unknown> = {
      appId,
      token: tokenResult.token,
      authorization: tokenResult.authorization,
      cluster: asrCluster,  // ASR cluster
      address: asrAddress,
      uri: asrUri,
    };
    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }

    if (debugMode) {
      data.__debug = {
        VOLC_APP_ID: process.env.VOLC_APP_ID,
        RTC_APP_ID: process.env.RTC_APP_ID,
        VOLC_ACCESS_KEY: Boolean(process.env.VOLC_ACCESS_KEY),
        RTC_APP_KEY: Boolean(process.env.RTC_APP_KEY),
        loadedEnvPath: process.env.__CONFIG_LOADED_ENV,
        nodeEnv: process.env.NODE_ENV,
      };
    }

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '获取火山引擎配置失败',
    });
  }
});

export default router;
