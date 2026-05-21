import RPCClient from '@alicloud/pop-core';

/**
 * 阿里云 NLS Token 请求工具
 * 通过 pop-core SDK 获取临时鉴权 Token
 */

interface AliyunTokenOptions {
  accessKeyId: string;
  accessKeySecret: string;
  region?: string;
  timeout?: number;
}

interface AliyunTokenResult {
  token: string;
  expireTime: number;
}

export async function requestAliyunToken(options: AliyunTokenOptions): Promise<AliyunTokenResult> {
  const { accessKeyId, accessKeySecret, region = 'cn-shanghai', timeout = 10000 } = options;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('阿里云 AccessKeyId 或 AccessKeySecret 未配置');
  }

  const client = new RPCClient({
    accessKeyId,
    accessKeySecret,
    endpoint: `https://nls-meta.${region}.aliyuncs.com`,
    apiVersion: '2019-02-28',
  });

  const result = await client.request<{
    Token?: { Id?: string; ExpireTime?: number };
    ErrMsg?: string;
  }>('CreateToken', {}, { method: 'POST' });

  if (!result?.Token?.Id) {
    throw new Error(`获取阿里云 NLS Token 失败: ${result?.ErrMsg || '未知错误'}`);
  }

  return {
    token: result.Token.Id,
    expireTime: (result.Token.ExpireTime || 0) * 1000, // 转毫秒
  };
}
