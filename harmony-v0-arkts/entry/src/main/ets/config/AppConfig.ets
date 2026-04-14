/**
 * 应用配置 - API基础URL、第三方服务配置、通用工具函数
 */

// ==================== API 配置 ====================
export const AppConfig = {
  // API 基础地址
  API_BASE_URL: 'https://api.aimian.ai',

  // WebSocket 地址（实时通信）
  WS_BASE_URL: 'wss://api.aimian.ai',

  // 超时时间（毫秒）
  REQUEST_TIMEOUT: 30000,

  // ==================== VOLCANO TTS 配置 ====================
  VOLCANO: {
    APP_ID: 'your_volcano_app_id',
    CLUSTER: 'volcano_ark',
    TOKEN: 'your_volcano_token',
    TTS_ENDPOINT: 'https://openspeech.bytedance.com/api/v2/tts',
  },

  // ==================== DeepSeek 配置 ====================
  DEEPSEEK: {
    API_KEY: 'your_deepseek_api_key',
    BASE_URL: 'https://api.deepseek.com/v1',
    MODEL: 'deepseek-chat',
  },

  // ==================== 阿里云 ASR 配置 ====================
  ALIYUN_ASR: {
    APP_KEY: 'your_aliyun_app_key',
    ACCESS_KEY: 'your_aliyun_access_key',
    ACCESS_SECRET: 'your_aliyun_access_secret',
    REGION_ID: 'cn-shanghai',
  },

  // ==================== App 版本信息 ====================
  APP_VERSION: '1.0.0',
  BUILD_NUMBER: '100',

  // ==================== 分页配置 ====================
  PAGE_SIZE: 20,
  PAGE_SIZE_LARGE: 50,
}

// ==================== 通用工具函数 ====================

/**
 * 格式化手机号（脱敏）
 * @param phone 原始手机号
 * @returns 脱敏后的手机号 如 138****1234
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length === 11) {
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
  return phone;
}

/**
 * 验证手机号格式
 * @param phone 手机号
 * @returns 是否合法
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证邮箱格式
 * @param email 邮箱
 * @returns 是否合法
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 格式化日期时间
 * @param dateStr ISO日期字符串
 * @returns 格式化后的日期
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化日期
 * @param dateStr ISO日期字符串
 * @returns 格式化后的日期
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取相对时间描述
 * @param dateStr ISO日期字符串
 * @returns 如 "刚刚"、"5分钟前"、"2小时前"、"3天前"
 */
export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDate(dateStr);
  }
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 限制字符串长度
 * @param str 原始字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * 复制文本到剪贴板
 */
export function copyToClipboard(text: string): void {
  // ArkTS 剪贴板 API
  import('@ohos.pasteboard').then((pasteboard) => {
    const data = pasteboard.createData('text/plain', text);
    pasteboard.setData(data);
  }).catch(() => {
    // 降级处理
  });
}

/**
 * 拨打电话
 */
export function makePhoneCall(phoneNumber: string): void {
  import('@ohos.telephony.call').then((call) => {
    call.makeCall(phoneNumber, (err) => {
      if (err) {
        console.error('makeCall failed: ' + JSON.stringify(err));
      }
    });
  }).catch(() => {
    // 降级处理
  });
}
