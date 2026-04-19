import axios from 'axios';

/**
 * 阿里云灵眸（LingMou）Avatar 数字人服务
 * 对接阿里云灵眸 OpenAPI 的 CreateChatSession 等核心 API
 * 
 * API 文档: https://help.aliyun.com/zh/avatar/avatar-application/developer-reference/api-lingmou-2025-05-27-createchatsession
 * 
 * 请求语法: POST /openapi/chat/init/{id}
 * 认证方式: Bearer {api-key}
 */

interface LingMouConfig {
  projectId: string;     // 对话数字人项目 ID
  instanceId: string;    // 订单实例 ID
  apiKey: string;
  baseUrl: string;
}

interface CreateSessionRequest {
  userId: string;
  platform?: 'Web' | 'iOS' | 'Android';
  appId?: string;
  deviceId?: string;
  license?: string;
  avatarUserId?: string;
  serverUserId?: string;
}

interface RTCParams {
  appId: string;
  avatarUserId: string;
  channel: string;
  clientUserId: string;
  serverUserId: string;
  gslb: string[];
  nonce: string;
  timestamp: number;
  token: string;
}

interface AvatarAsset {
  url: string;
  md5: string;
  secret: string;
  type: string;
}

interface CreateSessionResponse {
  sessionId: string;
  rtcParams: RTCParams;
  avatarAssets?: AvatarAsset[];
  expiredAt: number;
}

interface SendMessageRequest {
  sessionId: string;
  text: string;
}

interface StopSessionRequest {
  sessionId: string;
}

class AliyunAvatarService {
  private config: LingMouConfig | null = null;
  private enabled = false;

  constructor() {
    const projectId = process.env.LINGMOU_PROJECT_ID;
    const instanceId = process.env.LINGMOU_INSTANCE_ID;
    const apiKey = process.env.LINGMOU_API_KEY;
    const baseUrl = process.env.LINGMOU_BASE_URL;

    if (!projectId || !instanceId || !apiKey) {
      console.warn('[AliyunAvatarService] 灵眸 Avatar 配置不完整，服务未启用');
      console.warn('[AliyunAvatarService] 需要配置: LINGMOU_PROJECT_ID, LINGMOU_INSTANCE_ID, LINGMOU_API_KEY');
      this.enabled = false;
      return;
    }

    this.config = {
      projectId,
      instanceId,
      apiKey,
      baseUrl: baseUrl || 'https://lingmou.aliyuncs.com'
    };
    this.enabled = true;
    console.log('[AliyunAvatarService] 阿里云灵眸 Avatar 服务已启用');
    console.log(`[AliyunAvatarService] 项目ID: ${projectId.substring(0, 10)}***`);
    console.log(`[AliyunAvatarService] 实例ID: ${instanceId}`);
    console.log(`[AliyunAvatarService] BaseUrl: ${this.config.baseUrl}`);
  }

  /**
   * 创建聊天会话 (CreateChatSession)
   * 
   * POST /openapi/chat/init/{id}
   * 
   * {id} 是数字人项目 ID
   * Body 中 instanceId 是必填的订单实例 ID
   * 
   * 返回:
   * - sessionId: 会话 ID
   * - rtcParams: RTC 连接参数（Android SDK 直接用于连接）
   * - avatarAssets: 端渲染数字人资产（url/md5/secret）
   * - expiredAt: 过期时间
   */
  async createChatSession(params: CreateSessionRequest): Promise<CreateSessionResponse> {
    if (!this.enabled || !this.config) {
      throw new Error('阿里云灵眸 Avatar 服务未启用');
    }

    try {
      console.log(`[AliyunAvatarService] CreateChatSession: projectId=${this.config.projectId}, userId=${params.userId}`);

      const requestBody: Record<string, any> = {
        instanceId: this.config.instanceId,
        platform: params.platform || 'Android'
      };

      // 可选参数
      if (params.appId) {
        requestBody.appId = params.appId;
      }
      if (params.deviceId) {
        requestBody.deviceId = params.deviceId;
      }
      if (params.license) {
        requestBody.license = params.license;
      }
      if (params.avatarUserId) {
        requestBody.avatarUserId = params.avatarUserId;
      }
      if (params.serverUserId) {
        requestBody.serverUserId = params.serverUserId;
      }

      console.log(`[AliyunAvatarService] 请求体:`, JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        `${this.config.baseUrl}/openapi/chat/init/${this.config.projectId}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 30000
        }
      );

      const data = response.data;
      console.log(`[AliyunAvatarService] 完整响应:`, JSON.stringify(data).substring(0, 1000));

      // 检查 API 是否返回成功
      if (data.success === false || data.code) {
        throw new Error(`API 返回错误: code=${data.code}, message=${data.message || '未知错误'}`);
      }

      const sessionData = data.data || {};
      const sessionId = sessionData.sessionId;

      if (!sessionId) {
        throw new Error(`响应中未找到 sessionId: ${JSON.stringify(sessionData).substring(0, 500)}`);
      }

      console.log(`[AliyunAvatarService] ✅ 会话创建成功: sessionId=${sessionId}`);
      console.log(`[AliyunAvatarService] RTC channel=${sessionData.rtcParams?.channel}`);

      return {
        sessionId,
        rtcParams: sessionData.rtcParams || {
          appId: '',
          avatarUserId: '',
          channel: '',
          clientUserId: params.userId,
          serverUserId: '',
          gslb: [],
          nonce: '',
          timestamp: Date.now(),
          token: ''
        },
        avatarAssets: sessionData.avatarAssets || [],
        expiredAt: sessionData.expiredAt || Date.now() + 3600000
      };

    } catch (error: any) {
      const errorDetail = error.response?.data
        ? JSON.stringify(error.response.data).substring(0, 500)
        : error.message;
      console.error('[AliyunAvatarService] ❌ CreateChatSession 失败:', errorDetail);
      throw new Error(`创建聊天会话失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 停止会话
   * 
   * 实际实现需要根据官方文档确认具体的 stop API 端点
   * 暂时记录日志并返回成功
   */
  async stopSession(sessionId: string): Promise<void> {
    if (!this.enabled || !this.config) {
      throw new Error('阿里云灵眸 Avatar 服务未启用');
    }

    try {
      console.log(`[AliyunAvatarService] StopSession: sessionId=${sessionId}`);
      // TODO: 确认 stop API 端点后实现
      // 目前灵眸 SDK 断开 WebSocket 连接后会自动清理会话
      console.log('[AliyunAvatarService] ℹ️  会话将通过客户端断开连接自动清理');
    } catch (error: any) {
      console.error('[AliyunAvatarService] StopSession 失败:', error.message);
    }
  }

  /**
   * 检查服务是否可用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取配置信息（用于调试）
   */
  getConfig(): { enabled: boolean; projectId?: string; instanceId?: string; baseUrl?: string } {
    return {
      enabled: this.enabled,
      projectId: this.config?.projectId,
      instanceId: this.config?.instanceId,
      baseUrl: this.config?.baseUrl
    };
  }
}

export const aliyunAvatarService = new AliyunAvatarService();
export type { CreateSessionRequest, CreateSessionResponse, RTCParams, AvatarAsset };
