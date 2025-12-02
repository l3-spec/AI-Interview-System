import { randomUUID } from 'crypto';

interface StartAvatarParams {
  userId: string;
  avatarCode?: string;
  voiceCode?: string;
  sessionId?: string;
  backgroundImage?: string;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

interface AvatarMessage {
  taskId: string;
  text: string;
  createdAt: Date;
}

type AvatarSessionStatus = 'idle' | 'active' | 'ended';

interface AvatarSession {
  sessionId: string;
  userId: string;
  avatarCode: string;
  voiceCode: string;
  status: AvatarSessionStatus;
  startedAt: Date;
  updatedAt: Date;
  history: AvatarMessage[];
  webUrl: string;
  metadata: Record<string, unknown>;
}

interface ChannelInfo {
  provider: 'airi-web';
  channelId: string;
  token: string | null;
  appId: string;
  userId: string;
  nonce: string;
  timestamp: number;
  gslb: string[];
  webUrl: string;
  expiresAt: number;
}

const DEFAULT_AVATAR_CODE = 'airi_default';
const DEFAULT_VOICE_CODE = 'zh-CN-lisa';
const DEFAULT_BASE_URL = 'http://localhost:3000/avatar';

/**
 * 开源数字人（AIRI Web）会话管理服务
 * 提供与旧接口兼容的轻量实现，用于统一管理 Web 嵌入式数字人会话。
 */
class AvatarService {
  private readonly sessions = new Map<string, AvatarSession>();
  private readonly baseWebUrl: string;

  constructor() {
    const envUrl = (process.env.AIRI_WEB_URL || '').trim();
    this.baseWebUrl = envUrl || DEFAULT_BASE_URL;
  }

  /**
   * 启动数字人实例，返回会话ID与Web端访问信息
   */
  async startAvatarInstance(params: StartAvatarParams): Promise<{
    sessionId: string;
    channelInfo: ChannelInfo;
  }> {
    const {
      userId,
      avatarCode = DEFAULT_AVATAR_CODE,
      voiceCode = DEFAULT_VOICE_CODE,
      sessionId = this.generateSessionId(userId),
      metadata = {}
    } = params;

    if (!userId) {
      throw new Error('userId 是必填参数');
    }

    const webUrl = this.buildWebUrl({
      sessionId,
      userId,
      avatarCode,
      voiceCode,
      metadata
    });

    const session: AvatarSession = {
      sessionId,
      userId,
      avatarCode,
      voiceCode,
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date(),
      history: [],
      webUrl,
      metadata
    };

    this.sessions.set(sessionId, session);

    const channelInfo: ChannelInfo = {
      provider: 'airi-web',
      channelId: sessionId,
      token: null,
      appId: 'airi-web',
      userId,
      nonce: randomUUID().replace(/-/g, ''),
      timestamp: Date.now(),
      gslb: [],
      webUrl,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
    };

    return {
      sessionId,
      channelInfo
    };
  }

  /**
   * 停止数字人实例
   */
  async stopAvatarInstance(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('会话不存在或用户不匹配');
    }

    session.status = 'ended';
    session.updatedAt = new Date();
  }

  /**
   * 发送文本到数字人（记录历史，供调试或回放使用）
   */
  async sendTextToAvatar(sessionId: string, userId: string, text: string): Promise<{
    taskId: string;
  }> {
    if (!text) {
      throw new Error('文本内容不能为空');
    }

    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('会话不存在或用户不匹配');
    }

    if (session.status !== 'active') {
      throw new Error('数字人实例未运行');
    }

    const taskId = randomUUID();
    session.history.push({
      taskId,
      text,
      createdAt: new Date()
    });
    session.updatedAt = new Date();

    return { taskId };
  }

  /**
   * 快速测试连接是否可用
   */
  async testConnection(userId: string): Promise<{
    success: boolean;
    provider: string;
    webUrl: string;
    userId: string;
  }> {
    if (!userId) {
      throw new Error('userId 是必填参数');
    }

    return {
      success: true,
      provider: 'airi-web',
      webUrl: this.baseWebUrl,
      userId
    };
  }

  /**
   * 获取当前会话状态
   */
  async getAvatarStatus(sessionId: string, userId: string): Promise<{
    sessionId: string;
    status: AvatarSessionStatus;
    startedAt: Date;
    updatedAt: Date;
    historyCount: number;
    webUrl: string;
    metadata: Record<string, unknown>;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('会话不存在或用户不匹配');
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      historyCount: session.history.length,
      webUrl: session.webUrl,
      metadata: session.metadata
    };
  }

  /**
   * 返回可用数字人列表（开源方案）
   */
  async getAvailableAvatars(): Promise<Array<{
    code: string;
    name: string;
    provider: string;
    description: string;
    previewUrl: string | null;
  }>> {
    return [
      {
        code: 'airi_default',
        name: 'AIRI 默认形象',
        provider: 'airi-web',
        description: '基于 AIRI Web 的免费数字人形象，可直接在浏览器中渲染。',
        previewUrl: null
      },
      {
        code: 'airi_modern_cn',
        name: '现代职场风（中文）',
        provider: 'airi-web',
        description: '适用于中文面试场景，支持字幕与提问字幕同步。',
        previewUrl: null
      }
    ];
  }

  /**
   * 返回可用声音列表（静态示例）
   */
  async getAvailableVoices(): Promise<Array<{
    code: string;
    name: string;
    language: string;
    gender: 'male' | 'female' | 'neutral';
    provider: string;
  }>> {
    return [
      {
        code: 'zh-CN-lisa',
        name: 'Lisa（中文女声）',
        language: 'zh-CN',
        gender: 'female',
        provider: 'airi-web'
      },
      {
        code: 'zh-CN-andy',
        name: 'Andy（中文男声）',
        language: 'zh-CN',
        gender: 'male',
        provider: 'airi-web'
      }
    ];
  }

  /**
   * 更新会话配置（仅存储在内存中）
   */
  async updateConfig(sessionId: string, config: Record<string, unknown>): Promise<{
    sessionId: string;
    config: Record<string, unknown>;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    session.metadata = {
      ...session.metadata,
      ...config
    };
    session.updatedAt = new Date();

    return {
      sessionId: session.sessionId,
      config: session.metadata
    };
  }

  private generateSessionId(userId: string): string {
    return `avatar_${userId}_${Date.now()}`;
  }

  private buildWebUrl(options: {
    sessionId: string;
    userId: string;
    avatarCode: string;
    voiceCode: string;
    metadata: Record<string, unknown>;
  }): string {
    const { sessionId, userId, avatarCode, voiceCode, metadata } = options;
    const sanitized = this.ensureHttpScheme(this.baseWebUrl);

    try {
      const url = new URL(sanitized);
      url.searchParams.set('sessionId', sessionId);
      url.searchParams.set('userId', userId);
      url.searchParams.set('avatarCode', avatarCode);
      url.searchParams.set('voiceCode', voiceCode);
      if (metadata && Object.keys(metadata).length > 0) {
        url.searchParams.set('meta', encodeURIComponent(JSON.stringify(metadata)));
      }
      return url.toString();
    } catch (error) {
      console.warn('[AvatarService] 无法解析 AIRI_WEB_URL，退回原始值:', error);
      return sanitized;
    }
  }

  private ensureHttpScheme(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `http://${url}`;
    }
    return url;
  }
}

export const avatarService = new AvatarService();
