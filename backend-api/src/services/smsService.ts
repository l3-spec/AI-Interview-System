type SmsProviderName = 'mock' | 'aliyun' | 'tencent';

interface SmsProvider {
  sendVerificationCode(phone: string, code: string): Promise<void>;
}

const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || '+86';

const sanitizePhoneNumber = (phone: string): string => phone.replace(/\s+/g, '').trim();

const formatPhoneNumber = (phone: string): string => {
  const cleaned = sanitizePhoneNumber(phone);
  if (!cleaned) {
    throw new Error('手机号不能为空');
  }

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }

  const number = cleaned.replace(/^0+/, '');
  return `${DEFAULT_COUNTRY_CODE}${number}`;
};

const formatAliyunPhoneNumber = (phone: string): string => {
  const cleaned = sanitizePhoneNumber(phone);
  if (!cleaned) {
    throw new Error('手机号不能为空');
  }

  const normalized = cleaned
    .replace(/^\+?86/, '')
    .replace(/^0086/, '')
    .replace(/^[+]+/, '')
    .replace(/[^0-9]/g, '');

  if (normalized.length !== 11) {
    throw new Error('阿里云短信目前仅支持11位国内手机号');
  }

  return normalized;
};

const normalizeEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return 'https://dysmsapi.aliyuncs.com';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const hasValue = (value: string | undefined): boolean => typeof value === 'string' && value.trim().length > 0;

const hasAliyunSmsConfig = (): boolean => {
  const required = [
    process.env.ALIYUN_SMS_ACCESS_KEY_ID,
    process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    process.env.ALIYUN_SMS_SIGN_NAME,
    process.env.ALIYUN_SMS_TEMPLATE_CODE
  ];
  return required.every(hasValue);
};

const hasTencentSmsConfig = (): boolean => {
  const required = [
    process.env.TENCENT_SMS_SECRET_ID,
    process.env.TENCENT_SMS_SECRET_KEY,
    process.env.TENCENT_SMS_SIGN_NAME,
    process.env.TENCENT_SMS_TEMPLATE_ID,
    process.env.TENCENT_SMS_SDK_APP_ID
  ];
  return required.every(hasValue);
};

const isModuleNotFoundError = (error: unknown, moduleName: string): boolean =>
  error instanceof Error &&
  'code' in (error as { code?: string }) &&
  (error as { code?: string }).code === 'MODULE_NOT_FOUND' &&
  error.message.includes(moduleName);

const loadOptionalDependency = (moduleName: string): any => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(moduleName);
  } catch (error) {
    if (isModuleNotFoundError(error, moduleName)) {
      throw new Error(`依赖 ${moduleName} 未安装，请安装后再启用对应短信服务`);
    }
    throw error;
  }
};

class MockSmsProvider implements SmsProvider {
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const formattedPhone = formatPhoneNumber(phone);
    console.info(`[SMS][mock] 向 ${formattedPhone} 发送验证码: ${code}`);
  }
}

const buildAliyunError = (error: unknown): Error => {
  if (error && typeof error === 'object') {
    const data = (error as { data?: Record<string, unknown> }).data as
      | Record<string, unknown>
      | undefined;
    const code = (data?.Code || data?.code || (error as { code?: string }).code) as string | undefined;
    const message =
      (data?.Message || data?.message || (error as { message?: string }).message || '短信发送失败') as string;
    const requestId = (data?.RequestId || data?.requestId) as string | undefined;
    const suffixParts: string[] = [];
    if (code) {
      suffixParts.push(`[${code}]`);
    }
    if (requestId) {
      suffixParts.push(`RequestId: ${requestId}`);
    }
    const suffix = suffixParts.length > 0 ? ` ${suffixParts.join(' ')}` : '';
    return new Error(`阿里云短信发送失败: ${message}${suffix}`);
  }
  return new Error('阿里云短信发送失败');
};

type AliyunSmsTeaClient = {
  sendSmsWithOptions(
    request: unknown,
    runtime: unknown
  ): Promise<{
    body?: Record<string, unknown>;
    Body?: Record<string, unknown>;
  }>;
};

class AliyunSmsProvider implements SmsProvider {
  private client: AliyunSmsTeaClient;
  private signName: string;
  private templateCode: string;
  private codeParam: string;
  private region: string;
  private SendSmsRequestCtor: new (args: Record<string, unknown>) => unknown;
  private RuntimeOptionsCtor: new (args?: Record<string, unknown>) => unknown;
  private runtimeOptions: unknown;
  private retryRuntimeOptions: unknown;

  constructor() {
    const dysmsApiModule = loadOptionalDependency('@alicloud/dysmsapi20170525');
    const openApiModule = loadOptionalDependency('@alicloud/openapi-client');
    const teaUtilModule = loadOptionalDependency('@alicloud/tea-util');

    const ClientCtor =
      (dysmsApiModule?.default as { new (config: unknown): unknown }) ||
      (dysmsApiModule?.Client as { new (config: unknown): unknown }) ||
      (dysmsApiModule?.Dysmsapi20170525Client as { new (config: unknown): unknown });

    const SendSmsRequestCtor =
      (dysmsApiModule?.SendSmsRequest as { new (args: Record<string, unknown>): unknown }) ||
      (dysmsApiModule?.default?.SendSmsRequest as { new (args: Record<string, unknown>): unknown });

    const ConfigCtor =
      (openApiModule?.Config as { new (args: Record<string, unknown>): { endpoint?: string } }) ||
      (openApiModule?.default?.Config as { new (args: Record<string, unknown>): { endpoint?: string } });

    const RuntimeOptionsCtor =
      (teaUtilModule?.RuntimeOptions as { new (args?: Record<string, unknown>): unknown }) ||
      (teaUtilModule?.default?.RuntimeOptions as { new (args?: Record<string, unknown>): unknown });

    if (typeof ClientCtor !== 'function') {
      throw new Error('阿里云短信 SDK 加载失败，缺少 Client 构造函数');
    }
    if (typeof ConfigCtor !== 'function') {
      throw new Error('阿里云短信 SDK 加载失败，缺少 Config 构造函数');
    }
    if (typeof SendSmsRequestCtor !== 'function') {
      throw new Error('阿里云短信 SDK 加载失败，缺少 SendSmsRequest 构造函数');
    }
    if (typeof RuntimeOptionsCtor !== 'function') {
      throw new Error('阿里云短信 SDK 加载失败，缺少 RuntimeOptions 构造函数');
    }

    const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET;
    this.signName = process.env.ALIYUN_SMS_SIGN_NAME || '';
    this.templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || '';
    this.region = process.env.ALIYUN_SMS_REGION || 'cn-hangzhou';
    this.codeParam = process.env.ALIYUN_SMS_CODE_PARAM || 'code';
    const endpoint = process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com';

    if (!accessKeyId || !accessKeySecret || !this.signName || !this.templateCode) {
      throw new Error('阿里云短信配置缺失，请设置 ALIYUN_SMS_ACCESS_KEY_ID、ALIYUN_SMS_ACCESS_KEY_SECRET、ALIYUN_SMS_SIGN_NAME、ALIYUN_SMS_TEMPLATE_CODE');
    }
    const endpointHost = normalizeEndpoint(endpoint).replace(/^https?:\/\//, '');

    const config = new ConfigCtor({
      accessKeyId,
      accessKeySecret,
      endpoint: endpointHost
    });
    if ('endpoint' in config) {
      (config as { endpoint?: string }).endpoint = endpointHost;
    }

    this.client = new (ClientCtor as new (config: unknown) => AliyunSmsTeaClient)(config);
    this.SendSmsRequestCtor = SendSmsRequestCtor as new (args: Record<string, unknown>) => unknown;
    this.RuntimeOptionsCtor = RuntimeOptionsCtor as new (args?: Record<string, unknown>) => unknown;

    const timeout = this.parseTimeout(process.env.ALIYUN_SMS_TIMEOUT_MS, 8000);
    const retryTimeout = this.parseTimeout(
      process.env.ALIYUN_SMS_RETRY_TIMEOUT_MS,
      Math.max(timeout * 2, 12000)
    );

    this.runtimeOptions = this.createRuntimeOptions(timeout);
    this.retryRuntimeOptions = this.createRuntimeOptions(retryTimeout);
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const requestPayload: Record<string, unknown> = {
      signName: this.signName,
      templateCode: this.templateCode,
      phoneNumbers: formatAliyunPhoneNumber(phone),
      regionId: this.region
    };

    if (this.codeParam) {
      requestPayload.templateParam = JSON.stringify({ [this.codeParam]: code });
    }

    const request = new this.SendSmsRequestCtor(requestPayload);
    try {
      const response = await this.client.sendSmsWithOptions(request, this.runtimeOptions);
      this.ensureSuccessfulResponse(response);
    } catch (error) {
      if (this.isTimeoutError(error)) {
        console.warn('[SMS][aliyun] 请求超时，正在执行重试...');
        try {
          const retryResponse = await this.client.sendSmsWithOptions(request, this.retryRuntimeOptions);
          this.ensureSuccessfulResponse(retryResponse);
          console.info('[SMS][aliyun] 重试发送成功');
          return;
        } catch (retryError) {
          throw buildAliyunError(retryError);
        }
      }
      throw buildAliyunError(error);
    }
  }

  private parseTimeout(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  private createRuntimeOptions(timeoutMs: number): unknown {
    const value = Math.max(timeoutMs, 3000);
    return new this.RuntimeOptionsCtor({
      readTimeout: value,
      connectTimeout: value
    });
  }

  private ensureSuccessfulResponse(response: unknown): void {
    const typedResponse = response as {
      body?: Record<string, unknown>;
      Body?: Record<string, unknown>;
    };

    const body = typedResponse?.body || typedResponse?.Body || (response as Record<string, unknown> | undefined);

    const responseCode = (body?.Code || body?.code) as string | undefined;

    if (responseCode !== 'OK') {
      const responseMessage = (body?.Message || body?.message || '短信发送失败') as string;
      const requestId = (body?.RequestId || body?.requestId) as string | undefined;
      throw new Error(`阿里云短信发送失败: ${responseMessage}${requestId ? ` (RequestId: ${requestId})` : ''}`);
    }
  }

  private isTimeoutError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const message = (error as { message?: string }).message || '';
      const code = (error as { code?: string }).code || '';
      if (message.includes('ReadTimeout') || message.includes('ETIMEDOUT')) {
        return true;
      }
      if (code && code.toUpperCase().includes('TIMEOUT')) {
        return true;
      }
    }
    return false;
  }
}

class TencentSmsProvider implements SmsProvider {
  private client: any;
  private signName: string;
  private templateId: string;
  private sdkAppId: string;

  constructor() {
    const tencentSdk = loadOptionalDependency('tencentcloud-sdk-nodejs');
    const SmsClient = tencentSdk?.sms?.v20210111?.Client;

    if (typeof SmsClient !== 'function') {
      throw new Error('腾讯云短信 SDK 加载失败，缺少 sms.v20210111.Client 导出');
    }

    const secretId = process.env.TENCENT_SMS_SECRET_ID;
    const secretKey = process.env.TENCENT_SMS_SECRET_KEY;
    this.signName = process.env.TENCENT_SMS_SIGN_NAME || '';
    this.templateId = process.env.TENCENT_SMS_TEMPLATE_ID || '';
    this.sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID || '';
    const region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou';

    if (!secretId || !secretKey || !this.signName || !this.templateId || !this.sdkAppId) {
      throw new Error('腾讯云短信配置缺失，请设置 TENCENT_SMS_SECRET_ID、TENCENT_SMS_SECRET_KEY、TENCENT_SMS_SIGN_NAME、TENCENT_SMS_TEMPLATE_ID、TENCENT_SMS_SDK_APP_ID');
    }

    this.client = new SmsClient({
      credential: {
        secretId,
        secretKey
      },
      region,
      profile: {
        httpProfile: {
          endpoint: 'sms.tencentcloudapi.com'
        }
      }
    });
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await this.client.SendSms({
      PhoneNumberSet: [formatPhoneNumber(phone)],
      SignName: this.signName,
      TemplateId: this.templateId,
      TemplateParamSet: [code],
      SmsSdkAppId: this.sdkAppId
    });
  }
}

class SmsService {
  private provider: SmsProvider;
  private providerName: SmsProviderName;

  constructor() {
    const providerFromEnv = process.env.SMS_PROVIDER;
    const requestedProvider = providerFromEnv ? providerFromEnv.toLowerCase().trim() : '';
    const validProviders: SmsProviderName[] = ['mock', 'aliyun', 'tencent'];

    if (requestedProvider) {
      if (!validProviders.includes(requestedProvider as SmsProviderName)) {
        console.warn(`[SMS] 未知短信服务提供商 ${requestedProvider}，已切换为 mock 模式`);
        this.providerName = 'mock';
      } else {
        this.providerName = requestedProvider as SmsProviderName;
      }
    } else if (hasAliyunSmsConfig()) {
      this.providerName = 'aliyun';
    } else if (hasTencentSmsConfig()) {
      this.providerName = 'tencent';
    } else {
      this.providerName = 'mock';
    }

    try {
      this.provider = this.createProvider(this.providerName);
    } catch (error) {
      console.error(`[SMS] 初始化 ${this.providerName} 短信服务失败，已回退为 mock 模式`, error);
      this.providerName = 'mock';
      this.provider = new MockSmsProvider();
    }

    console.info(`[SMS] 当前短信服务提供商: ${this.providerName}`);
  }

  private createProvider(name: SmsProviderName): SmsProvider {
    switch (name) {
      case 'aliyun':
        return this.instantiateProvider('aliyun', () => new AliyunSmsProvider());
      case 'tencent':
        return this.instantiateProvider('tencent', () => new TencentSmsProvider());
      case 'mock':
      default:
        return new MockSmsProvider();
    }
  }

  private instantiateProvider(
    name: Exclude<SmsProviderName, 'mock'>,
    factory: () => SmsProvider
  ): SmsProvider {
    try {
      return factory();
    } catch (error) {
      console.error(`[SMS] 初始化 ${name} 短信服务失败`, error);
      if (error instanceof Error) {
        throw new Error(`[SMS] 初始化 ${name} 短信服务失败: ${error.message}`);
      }
      throw new Error(`[SMS] 初始化 ${name} 短信服务失败`);
    }
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await this.provider.sendVerificationCode(phone, code);
  }

  get activeProvider(): SmsProviderName {
    return this.providerName;
  }
}

export const smsService = new SmsService();
export type { SmsProviderName };
