import axios from 'axios';
import crypto from 'crypto';

interface VolcApiKey {
  ID?: number;
  Name?: string;
  APIKey?: string;
  Disable?: boolean;
  CreateTime?: string;
  UpdateTime?: string;
}

interface VolcTokenResult {
  token: string;
  rawToken: string;
  authorization: string;
  source: 'env' | 'api' | 'sts';
  fetchedAt: number;
  expiresAt?: number;
  apiKey?: VolcApiKey;
}

interface SignedRequestOptions {
  action: string;
  body: Record<string, any>;
}

interface OpenApiResponse<T = any> {
  ResponseMetadata: {
    RequestId: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  Result: T;
}

const SERVICE = 'speech_saas_prod';
const HOST = 'open.volcengineapi.com';
const ENDPOINT = `https://${HOST}/`;
const API_VERSION = '2025-05-20';
const DEFAULT_REGION = process.env.VOLC_REGION?.trim() || 'cn-beijing';
const DEFAULT_PROJECT = process.env.VOLC_PROJECT_NAME?.trim() || 'default';
const API_KEY_NAME = process.env.VOLC_API_KEY_NAME?.trim();
const CACHE_TTL_MS = Number(process.env.VOLC_TOKEN_CACHE_SECONDS || 600) * 1000;
const STS_ENDPOINT = 'https://openspeech.bytedance.com/api/v1/sts/token';
const STS_DEFAULT_DURATION_SECONDS = Number(process.env.VOLC_STS_DURATION_SECONDS || 900);
const STS_EXPIRATION_GUARD_MS = Number(process.env.VOLC_STS_EXPIRATION_GUARD_MS || 30000);

const BEARER_PREFIX = 'bearer;';

const ensureAuthorization = (token: string): string => {
  const trimmed = token.trim();
  if (!trimmed.length) {
    return '';
  }
  return trimmed.toLowerCase().startsWith(BEARER_PREFIX)
    ? trimmed
    : `Bearer;${trimmed}`;
};

const stripAuthorizationPrefix = (token: string): string => {
  const trimmed = token.trim();
  if (!trimmed.length) {
    return '';
  }
  if (trimmed.toLowerCase().startsWith(BEARER_PREFIX)) {
    return trimmed.slice(BEARER_PREFIX.length).trim();
  }
  return trimmed;
};

const formatDate = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return {
    long: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
    short: `${year}${month}${day}`,
  };
};

const hashSHA256 = (message: string) =>
  crypto.createHash('sha256').update(message, 'utf8').digest('hex');

const hmacSHA256 = (key: Buffer, message: string) =>
  crypto.createHmac('sha256', key).update(message, 'utf8').digest();

const BASE64ISH = /^[A-Za-z0-9._-]+$/;
const isTruthy = (value?: string | null): boolean => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const looksLikeVolcToken = (token: string): boolean => {
  if (!token) {
    return false;
  }
  if (token.length >= 48 && token.includes('.') && token.split('.').length >= 3) {
    return true;
  }
  if (token.length >= 80 && BASE64ISH.test(token)) {
    return true;
  }
  return false;
};

class VolcOpenApiService {
  private cache: VolcTokenResult | null = null;
  private pending?: Promise<VolcTokenResult>;

  private get accessKey(): string {
    return (
      process.env.VOLC_ACCESS_KEY?.trim() ||
      process.env.VOLC_APP_KEY?.trim() ||
      ''
    );
  }

  private get secretKey(): string {
    return process.env.VOLC_SECRET_KEY?.trim() || '';
  }

  private get manualToken(): string {
    return process.env.VOLC_TOKEN?.trim() || '';
  }

  private get manualTokenSource(): VolcTokenResult['source'] {
    const raw = process.env.VOLC_TOKEN_SOURCE?.trim().toLowerCase();
    if (raw === 'api' || raw === 'sts') {
      return raw;
    }
    return 'env';
  }

  private get forceManualToken(): boolean {
    return isTruthy(process.env.VOLC_TOKEN_FORCE);
  }

  async getToken(force = false): Promise<VolcTokenResult> {
    if (!force && this.cache && this.isCacheValid(this.cache)) {
      return this.cache;
    }

    if (this.pending) {
      return this.pending;
    }

    this.pending = this.fetchToken().then((result) => {
      this.cache = result;
      this.pending = undefined;
      return result;
    }).catch((error) => {
      this.pending = undefined;
      throw error;
    });

    return this.pending;
  }

  private isCacheValid(result: VolcTokenResult): boolean {
    if (!result) {
      return false;
    }
    if (result.expiresAt) {
      return Date.now() + STS_EXPIRATION_GUARD_MS < result.expiresAt;
    }
    return Date.now() - result.fetchedAt < CACHE_TTL_MS;
  }

  private async fetchToken(): Promise<VolcTokenResult> {
    if (this.manualToken) {
      const authorization = ensureAuthorization(this.manualToken);
      const rawToken = stripAuthorizationPrefix(authorization);
      const tokenLooksValid = looksLikeVolcToken(rawToken);
      const accidentallyUsingAccessKey = rawToken && this.accessKey && rawToken === this.accessKey;
      if (this.forceManualToken || (tokenLooksValid && !accidentallyUsingAccessKey)) {
        const manualSource = this.manualTokenSource;
        return {
          token: rawToken,
          rawToken,
          authorization,
          source: manualSource,
          fetchedAt: Date.now(),
        };
      }
      console.warn(
        '[Volc Token] 检测到 VOLC_TOKEN 已配置，但其内容看起来不像火山JWT/STS令牌，自动改为使用 STS 签发的 token（如需强制使用，请设置 VOLC_TOKEN_FORCE=true）。'
      );
    }

    let lastError: any = null;

    if (this.accessKey) {
      try {
        return await this.fetchStsToken();
      } catch (error: any) {
        lastError = error;
        console.warn(
          '获取火山引擎 STS Token 失败，尝试使用 APIKey 方式:',
          error?.message ?? error
        );
        if (this.secretKey) {
          try {
            return await this.fetchApiKeyToken();
          } catch (apiError: any) {
            lastError = apiError;
            console.warn(
              '通过火山引擎 OpenAPI 获取 APIKey 也失败:',
              apiError?.message ?? apiError
            );
          }
        }
      }
    }

    const fallbackToken = process.env.VOLC_APP_KEY?.trim();
    if (fallbackToken) {
      const authorization = ensureAuthorization(fallbackToken);
      const rawToken = stripAuthorizationPrefix(authorization);
      return {
        token: rawToken,
        rawToken,
        authorization,
        source: 'env',
        fetchedAt: Date.now(),
      };
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('未配置有效的火山引擎凭证：请设置 VOLC_TOKEN，或配置 VOLC_ACCESS_KEY / VOLC_APP_KEY');
  }

  private async fetchApiKeyToken(): Promise<VolcTokenResult> {
    const apiKey = await this.obtainApiKey();
    if (!apiKey.APIKey) {
      throw new Error('火山引擎 API 未返回 APIKey');
    }

    const authorization = ensureAuthorization(apiKey.APIKey);
    const rawToken = stripAuthorizationPrefix(authorization);
    return {
      token: rawToken,
      rawToken: apiKey.APIKey,
      authorization,
      source: 'api',
      fetchedAt: Date.now(),
      apiKey,
    };
  }

  private async fetchStsToken(): Promise<VolcTokenResult> {
    const appId = process.env.VOLC_APP_ID?.trim();
    if (!appId) {
      throw new Error('未配置 VOLC_APP_ID，无法申请火山引擎 STS Token');
    }

    const duration = Math.max(60, STS_DEFAULT_DURATION_SECONDS);

    try {
      const response = await axios.post(
        STS_ENDPOINT,
        {
          appid: appId,
          duration,
        },
        {
          headers: {
            Authorization: ensureAuthorization(this.accessKey),
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data ?? {};
      const rawToken: string =
        data.jwt_token ||
        data.token ||
        data.access_token ||
        data.data?.jwt_token ||
        '';

      if (!rawToken) {
        throw new Error('火山引擎 STS 接口未返回有效的 jwt_token');
      }

      const authorization = ensureAuthorization(rawToken);
      const expiresAt = data.expire_at
        ? Number(data.expire_at) * 1000
        : Date.now() + duration * 1000;

      return {
        token: rawToken,
        rawToken,
        authorization,
        source: 'sts',
        fetchedAt: Date.now(),
        expiresAt,
      };
    } catch (error: any) {
      const reason =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.message ||
        '未知错误';
      throw new Error(`获取火山引擎 STS Token 失败: ${reason}`);
    }
  }

  private async obtainApiKey(): Promise<VolcApiKey> {
    const listPayload: Record<string, any> = {
      ProjectName: DEFAULT_PROJECT,
      OnlyAvailable: true,
      PageSize: 100,
    };

    const listResponse = await this.callOpenApi<{ APIKeys?: VolcApiKey[] }>('ListAPIKeys', listPayload);
    const apiKeys = listResponse.Result?.APIKeys || [];

    const matched = API_KEY_NAME
      ? apiKeys.find((item) => item.Name === API_KEY_NAME)
      : apiKeys.find((item) => item.APIKey);

    if (matched && matched.APIKey) {
      return matched;
    }

    const generatedName = API_KEY_NAME || `ai-interview-${Date.now()}`;
    await this.callOpenApi('CreateAPIKey', {
      ProjectName: DEFAULT_PROJECT,
      Name: generatedName,
    });

    const refreshResponse = await this.callOpenApi<{ APIKeys?: VolcApiKey[] }>('ListAPIKeys', listPayload);
    const refreshedKeys = refreshResponse.Result?.APIKeys || [];
    const created = refreshedKeys.find((item) => item.Name === generatedName || item.APIKey);

    if (!created || !created.APIKey) {
      throw new Error('无法创建或获取火山引擎 APIKey');
    }

    return created;
  }

  private async callOpenApi<T = any>(action: string, body: Record<string, any>): Promise<OpenApiResponse<T>> {
    const { long: xDate, short: shortDate } = formatDate(new Date());
    const payload = JSON.stringify(body ?? {});
    const hashedPayload = hashSHA256(payload);
    const region = DEFAULT_REGION;

    const canonicalQueryParams = [
      ['Action', action],
      ['Version', API_VERSION],
    ]
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .sort()
      .join('&');

    const canonicalHeaders = [
      `host:${HOST}`,
      `x-content-sha256:${hashedPayload}`,
      `x-date:${xDate}`,
    ].join('\n');

    const signedHeaders = 'host;x-content-sha256;x-date';

    const canonicalRequest = [
      'POST',
      '/',
      canonicalQueryParams,
      `${canonicalHeaders}\n`,
      signedHeaders,
      hashedPayload,
    ].join('\n');

    const hashedCanonicalRequest = hashSHA256(canonicalRequest);
    const credentialScope = `${shortDate}/${region}/${SERVICE}/request`;

    const stringToSign = [
      'HMAC-SHA256',
      xDate,
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n');

    const kDate = hmacSHA256(Buffer.from(this.secretKey, 'utf8'), shortDate);
    const kRegion = hmacSHA256(kDate, region);
    const kService = hmacSHA256(kRegion, SERVICE);
    const kSigning = hmacSHA256(kService, 'request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    const authorization = `HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${ENDPOINT}?${canonicalQueryParams}`;

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Date': xDate,
      'X-Content-Sha256': hashedPayload,
      Authorization: authorization,
    };

    try {
      const response = await axios.post<OpenApiResponse<T>>(url, body, {
        headers,
        timeout: Number(process.env.VOLC_API_TIMEOUT_MS || 10000),
      });

      const data = response.data;
      if (data.ResponseMetadata?.Error) {
        throw new Error(`火山引擎接口错误: ${data.ResponseMetadata.Error.Code} - ${data.ResponseMetadata.Error.Message}`);
      }
      return data;
    } catch (error: any) {
      const message = error.response?.data?.ResponseMetadata?.Error?.Message || error.message || '未知错误';
      throw new Error(`调用火山引擎API失败: ${message}`);
    }
  }
}

export const volcOpenApiService = new VolcOpenApiService();
