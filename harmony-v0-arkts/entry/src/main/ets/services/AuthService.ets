/**
 * 认证服务 - 登录、注册、验证码、Token 管理
 */

import { AppConfig } from '../config/AppConfig';
import {
  apiPost,
  apiGet,
  setGlobalToken,
  getGlobalToken,
  clearGlobalToken,
  ApiResponse,
} from './ApiService';
import {
  User,
  UserProfile,
  LoginRequest,
  SendCodeRequest,
  RegisterRequest,
  LoginData,
  RegisterData,
  LoginCodeData,
  DeviceLoginRequest,
} from '../models/User';

// ==================== 本地 Token 存储 Key ====================
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * 认证服务类
 */
export class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string = AppConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ==================== Token 管理 ====================

  /**
   * 获取当前 Token
   */
  getToken(): string | null {
    return getGlobalToken();
  }

  /**
   * 设置 Token（内存 + 持久化）
   */
  setToken(token: string): void {
    setGlobalToken(token);
    // 持久化存储
    this.saveToStorage(TOKEN_KEY, token);
  }

  /**
   * 清除 Token
   */
  clearToken(): void {
    clearGlobalToken();
    this.removeFromStorage(TOKEN_KEY);
    this.removeFromStorage(USER_KEY);
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ==================== 用户信息 ====================

  /**
   * 保存用户信息
   */
  saveUser(user: User): void {
    try {
      const jsonStr = JSON.stringify(user.toJson());
      this.saveToStorage(USER_KEY, jsonStr);
    } catch (_) {
      // ignore
    }
  }

  /**
   * 获取本地缓存的用户信息
   */
  getCachedUser(): User | null {
    try {
      const jsonStr = this.getFromStorage(USER_KEY);
      if (!jsonStr) return null;
      return User.fromJson(JSON.parse(jsonStr));
    } catch (_) {
      return null;
    }
  }

  /**
   * 清除用户信息
   */
  clearUser(): void {
    this.removeFromStorage(USER_KEY);
  }

  // ==================== 登录注册 ====================

  /**
   * 手机号 + 验证码登录
   */
  async login(phone: string, code: string): Promise<ApiResponse<LoginData>> {
    const request = new LoginRequest(phone, code);
    const response = await apiPost<any>(`${this.baseUrl}/auth/login`, request);

    if (response.success && response.data) {
      const loginData = new LoginData(response.data);
      this.setToken(loginData.token);
      this.saveUser(loginData.user);
      return new ApiResponse(true, loginData, response.statusCode);
    }

    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 发送验证码
   * @returns 验证码数据（包含有效期、重发间隔）
   */
  async sendCode(phone: string): Promise<ApiResponse<LoginCodeData>> {
    const request = new SendCodeRequest(phone);
    const response = await apiPost<any>(`${this.baseUrl}/auth/send-code`, request);

    if (response.success && response.data) {
      return new ApiResponse(true, new LoginCodeData(response.data), response.statusCode);
    }

    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 注册
   */
  async register(
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<ApiResponse<RegisterData>> {
    const request = new RegisterRequest(email, password, name, phone ?? null);
    const response = await apiPost<any>(`${this.baseUrl}/auth/register`, request);

    if (response.success && response.data) {
      const registerData = new RegisterData(response.data);
      this.setToken(registerData.token);
      this.saveUser(registerData.user);
      return new ApiResponse(true, registerData, response.statusCode);
    }

    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 设备登录（读取本机手机号自动登录）
   */
  async deviceLogin(phone: string): Promise<ApiResponse<LoginData>> {
    const request = new DeviceLoginRequest(phone);
    const response = await apiPost<any>(`${this.baseUrl}/auth/device-login`, request);

    if (response.success && response.data) {
      const loginData = new LoginData(response.data);
      this.setToken(loginData.token);
      this.saveUser(loginData.user);
      return new ApiResponse(true, loginData, response.statusCode);
    }

    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 登出
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiPost<void>(`${this.baseUrl}/auth/logout`);
    } catch (_) {
      // ignore network errors on logout
    } finally {
      this.clearToken();
      this.clearUser();
    }
    return new ApiResponse(true, null, 200);
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<ApiResponse<string>> {
    const response = await apiPost<any>(`${this.baseUrl}/auth/refresh`);
    if (response.success && response.data?.token) {
      const newToken = response.data.token;
      this.setToken(newToken);
      return new ApiResponse(true, newToken, response.statusCode);
    }
    return new ApiResponse(false, null, response.statusCode, response.message, response.error);
  }

  // ==================== 用户资料 ====================

  /**
   * 获取当前用户资料
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await apiGet<any>(`${this.baseUrl}/user/profile`);
    if (response.success && response.data) {
      return new ApiResponse(true, UserProfile.fromJson(response.data), response.statusCode);
    }
    return new ApiResponse(false, null, response.statusCode, response.message, response.error);
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const response = await apiPut<any>(`${this.baseUrl}/user/profile`, profile);
    if (response.success && response.data) {
      const updated = UserProfile.fromJson(response.data);
      // 更新本地缓存的用户名
      const cached = this.getCachedUser();
      if (cached && updated.name) {
        cached.name = updated.name;
        cached.avatar = updated.avatar;
        this.saveUser(cached);
      }
      return new ApiResponse(true, updated, response.statusCode);
    }
    return new ApiResponse(false, null, response.statusCode, response.message, response.error);
  }

  /**
   * 上传头像
   */
  async uploadAvatar(filePath: string): Promise<ApiResponse<string>> {
    const response = await apiPost<any>(`${this.baseUrl}/user/avatar`, {
      filePath: filePath,
    });
    if (response.success && response.data?.avatarUrl) {
      // 更新本地缓存
      const cached = this.getCachedUser();
      if (cached) {
        cached.avatar = response.data.avatarUrl;
        this.saveUser(cached);
      }
      return new ApiResponse(true, response.data.avatarUrl, response.statusCode);
    }
    return new ApiResponse(false, null, response.statusCode, response.message, response.error);
  }

  // ==================== 存储工具（待实现，可替换为 preference） ====================

  private saveToStorage(key: string, value: string): void {
    // TODO: 使用 @ohos.data.preferences 或 @ohos.storage.storageStatistics 实现持久化
    try {
      // 临时使用 globalThis 模拟存储（仅内存）
      (globalThis as any).__storage = (globalThis as any).__storage || {};
      (globalThis as any).__storage[key] = value;
    } catch (_) {
      // ignore
    }
  }

  private getFromStorage(key: string): string | null {
    try {
      return ((globalThis as any).__storage?.[key]) ?? null;
    } catch (_) {
      return null;
    }
  }

  private removeFromStorage(key: string): void {
    try {
      if ((globalThis as any).__storage) {
        delete (globalThis as any).__storage[key];
      }
    } catch (_) {
      // ignore
    }
  }
}

// ==================== 全局单例 ====================
let _authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!_authServiceInstance) {
    _authServiceInstance = new AuthService();
  }
  return _authServiceInstance;
}
