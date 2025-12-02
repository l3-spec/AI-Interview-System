import { requestAliyunToken } from '../utils/aliyunTokenClient';

class AliyunTokenService {
  private cachedToken: string | null = null;
  private cachedExpireTime = 0;

  private get accessKeyId(): string {
    const id = process.env.ALIYUN_NLS_ACCESS_KEY_ID || process.env.ALIYUN_TTS_ACCESS_KEY_ID;
    return (id || '').trim();
  }

  private get accessKeySecret(): string {
    const secret = process.env.ALIYUN_NLS_ACCESS_KEY_SECRET || process.env.ALIYUN_TTS_ACCESS_KEY_SECRET;
    return (secret || '').trim();
  }

  private get region(): string {
    return (process.env.ALIYUN_NLS_REGION || process.env.ALIYUN_TTS_REGION || 'cn-shanghai').trim();
  }

  private hasCredentials(): boolean {
    return Boolean(this.accessKeyId && this.accessKeySecret);
  }

  async getToken(force = false): Promise<{ token: string; expireTime: number; region: string; }> {
    if (!this.hasCredentials()) {
      throw new Error('未配置阿里云 NLS AccessKey，无法获取 Token');
    }

    const now = Date.now();
    if (!force && this.cachedToken && now < this.cachedExpireTime - 60_000) {
      return {
        token: this.cachedToken,
        expireTime: this.cachedExpireTime,
        region: this.region,
      };
    }

    const tokenResult = await requestAliyunToken({
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      region: this.region
    });

    this.cachedToken = tokenResult.token;
    this.cachedExpireTime = tokenResult.expireTime;

    return {
      token: tokenResult.token,
      expireTime: tokenResult.expireTime,
      region: this.region,
    };
  }
}

export const aliyunTokenService = new AliyunTokenService();
