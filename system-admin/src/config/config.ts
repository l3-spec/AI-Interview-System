const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const uploadUrl = import.meta.env.VITE_UPLOAD_URL || `${apiBaseUrl}/upload`;

export const config = {
  // API配置
  API_BASE_URL: apiBaseUrl,
  API_TIMEOUT: 10000,
  UPLOAD_URL: uploadUrl,
  
  // 服务器配置
  SERVER_HOST: import.meta.env.VITE_SERVER_HOST || 'localhost',
  SERVER_PORT: Number(import.meta.env.VITE_SERVER_PORT || 3001),
  
  // OSS配置
  OSS_BUCKET: 'ai-interview',
  OSS_REGION: 'oss-cn-beijing',
  
  // 分页配置
  DEFAULT_PAGE_SIZE: 20,
  
  // 认证配置
  TOKEN_KEY: 'admin_token',
  USER_KEY: 'admin_user',
  AUTH_HEADER_PREFIX: 'Bearer',
  REFRESH_TOKEN_KEY: 'admin_refresh_token',
  TOKEN_EXPIRY_KEY: 'admin_token_expiry',
  
  // 应用配置
  APP_NAME: 'AI面试系统管理后台',
  APP_VERSION: '1.0.0',
  
  // 调试配置
  DEBUG_MODE: import.meta.env.MODE === 'development',
  ENABLE_LOGS: true
};

export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login/admin',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh'
  },
  JOB_DICTIONARY: {
    CATEGORIES: '/admin/job-dictionary/categories',
    CATEGORY_DETAIL: (id: string) => `/admin/job-dictionary/categories/${id}`,
    POSITIONS: '/admin/job-dictionary/positions',
    POSITION_DETAIL: (id: string) => `/admin/job-dictionary/positions/${id}`,
    PUBLIC: '/job-dictionary'
  },
  // 管理员管理
  ADMINS: {
    LIST: '/admin/admins',
    CREATE: '/admin/admins',
    UPDATE: (id: string) => `/admin/admins/${id}`,
    DELETE: (id: string) => `/admin/admins/${id}`,
    DASHBOARD_STATS: '/admin/dashboard/stats'
  },
  // 系统配置
  SYSTEM: {
    CONFIG: '/admin/system/config',
    LOGS: '/admin/system/logs',
    STATUS: '/admin/system/status'
  },
  // 用户管理
  USERS: {
    LIST: '/admin/users',
    CREATE: '/admin/users',
    UPDATE: (id: string) => `/admin/users/${id}`,
    DELETE: (id: string) => `/admin/users/${id}`,
    STATS: '/admin/users/stats'
  }
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export const ERROR_CODES = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
}; 
