import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface TokenApiResponse {
  RequestId?: string;
  Token?: {
    Id?: string;
    UserId?: string;
    ExpireTime?: number;
  };
}

export interface AliyunTokenRequestOptions {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  timeout?: number;
}

export interface AliyunTokenResult {
  token: string;
  expireTime: number;
  raw?: TokenApiResponse;
}

const ACTION = 'CreateToken';
const VERSION = '2019-02-28';

const percentEncode = (value: string): string => {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
};

const buildCanonicalQuery = (params: Record<string, string>): string => {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
};

const generateSignature = (params: Record<string, string>, secret: string, method: string): string => {
  const canonicalQuery = buildCanonicalQuery(params);
  const stringToSign = `${method}&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  return crypto.createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64');
};

export const requestAliyunToken = async (
  options: AliyunTokenRequestOptions
): Promise<AliyunTokenResult> => {
  const { accessKeyId, accessKeySecret, region, timeout = 5000 } = options;
  const endpoint = `https://nls-meta.${region}.aliyuncs.com/`;
  const method = 'POST';

  const baseParams: Record<string, string> = {
    Action: ACTION,
    Version: VERSION,
    RegionId: region,
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: uuidv4(),
    Timestamp: new Date().toISOString(),
    Format: 'JSON'
  };

  const signature = generateSignature(baseParams, accessKeySecret, method);
  const requestParams = new URLSearchParams({
    ...baseParams,
    Signature: signature
  });

  try {
    const response = await axios.post<TokenApiResponse>(endpoint, requestParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout
    });

    const tokenData = response.data?.Token;
    if (!tokenData?.Id || typeof tokenData.ExpireTime !== 'number') {
      throw new Error('阿里云 Token 接口返回异常响应');
    }

    return {
      token: tokenData.Id,
      expireTime: tokenData.ExpireTime * 1000,
      raw: response.data
    };
  } catch (error: any) {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.Message ||
      error?.response?.data?.message ||
      error?.message ||
      '阿里云 Token 请求失败';

    throw new Error(
      status
        ? `阿里云 Token 请求失败 (status=${status}): ${message}`
        : `阿里云 Token 请求失败: ${message}`
    );
  }
};
