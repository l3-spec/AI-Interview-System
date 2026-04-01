/**
 * 用户数据模型
 */

/**
 * 用户信息
 */
export class User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  phone: string | null;

  constructor(
    id: string,
    email: string,
    name: string,
    avatar: string | null = null,
    phone: string | null = null
  ) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.avatar = avatar;
    this.phone = phone;
  }

  static fromJson(json: any): User {
    return new User(
      json.id ?? '',
      json.email ?? '',
      json.name ?? '',
      json.avatar ?? null,
      json.phone ?? null
    );
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      phone: this.phone,
    };
  }
}

/**
 * 用户资料扩展
 */
export class UserProfile {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  email: string;
  gender: string | null;
  birthday: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  resumeUrl: string | null;
  resumeStatus: string | null;
  isVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.userId = json.userId ?? '';
    this.name = json.name ?? '';
    this.avatar = json.avatar ?? null;
    this.phone = json.phone ?? null;
    this.email = json.email ?? '';
    this.gender = json.gender ?? null;
    this.birthday = json.birthday ?? null;
    this.location = json.location ?? null;
    this.headline = json.headline ?? null;
    this.bio = json.bio ?? null;
    this.resumeUrl = json.resumeUrl ?? null;
    this.resumeStatus = json.resumeStatus ?? null;
    this.isVerified = json.isVerified ?? false;
    this.createdAt = json.createdAt ?? null;
    this.updatedAt = json.updatedAt ?? null;
  }

  static fromJson(json: any): UserProfile {
    return new UserProfile(json);
  }
}

/**
 * 登录请求
 */
export class LoginRequest {
  phone: string;
  code: string;

  constructor(phone: string, code: string) {
    this.phone = phone;
    this.code = code;
  }
}

/**
 * 发送验证码请求
 */
export class SendCodeRequest {
  phone: string;

  constructor(phone: string) {
    this.phone = phone;
  }
}

/**
 * 注册请求
 */
export class RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string | null;

  constructor(email: string, password: string, name: string, phone: string | null = null) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.phone = phone;
  }
}

/**
 * 登录响应数据
 */
export class LoginData {
  user: User;
  token: string;
  isNewUser: boolean;

  constructor(json: any) {
    this.user = User.fromJson(json.user ?? {});
    this.token = json.token ?? '';
    this.isNewUser = json.isNewUser ?? false;
  }
}

/**
 * 注册响应数据
 */
export class RegisterData {
  user: User;
  token: string;

  constructor(json: any) {
    this.user = User.fromJson(json.user ?? {});
    this.token = json.token ?? '';
  }
}

/**
 * 验证码响应数据
 */
export class LoginCodeData {
  expiresIn: number;
  resendIn: number;
  code: string | null;

  constructor(json: any) {
    this.expiresIn = json.expiresIn ?? 60;
    this.resendIn = json.resendIn ?? 60;
    this.code = json.code ?? null;
  }
}

/**
 * 设备登录请求
 */
export class DeviceLoginRequest {
  phone: string;

  constructor(phone: string) {
    this.phone = phone;
  }
}
