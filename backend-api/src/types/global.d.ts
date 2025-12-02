declare module '@alicloud/dysmsapi20170525' {
  import * as $Util from '@alicloud/tea-util';
  import * as $OpenApi from '@alicloud/openapi-client';

  export interface SendSmsRequestOptions {
    signName?: string;
    templateCode?: string;
    phoneNumbers?: string;
    templateParam?: string;
  }

  export class SendSmsRequest {
    constructor(options?: SendSmsRequestOptions);
    signName?: string;
    templateCode?: string;
    phoneNumbers?: string;
    templateParam?: string;
  }

  export interface SendSmsResponse {
    body?: Record<string, unknown>;
  }

  export default class Dysmsapi20170525 {
    constructor(config: $OpenApi.Config);
    sendSmsWithOptions(
      request: SendSmsRequest,
      runtime: $Util.RuntimeOptions
    ): Promise<SendSmsResponse>;
  }
}

declare module 'tencentcloud-sdk-nodejs' {
  export const sms: {
    v20210111: {
      Client: new (config: {
        credential: {
          secretId: string;
          secretKey: string;
        };
        region: string;
        profile?: {
          httpProfile?: {
            endpoint?: string;
          };
        };
      }) => {
        SendSms(payload: Record<string, unknown>): Promise<unknown>;
      };
    };
  };
}

declare module '@alicloud/pop-core' {
  interface RpcClientConfig {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
    apiVersion: string;
    securityToken?: string;
  }

  interface RpcClientRequestOptions {
    method?: string;
    formatAction?: boolean;
    formatParams?: boolean;
    headers?: Record<string, string>;
  }

  export default class RPCClient {
    constructor(config: RpcClientConfig, verbose?: boolean);
    request<T = Record<string, unknown>>(
      action: string,
      params?: Record<string, unknown>,
      options?: RpcClientRequestOptions
    ): Promise<T>;
  }

  export { RPCClient };
}
