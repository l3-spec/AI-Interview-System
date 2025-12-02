const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
export const AIRI_WEB_URL = import.meta.env.VITE_AIRI_WEB_URL || 'http://localhost:3000/avatar';

export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'admin_token',
  USER_KEY: 'admin_user',
  API_BASE_URL: apiBaseUrl,
  REFRESH_TOKEN_KEY: 'admin_refresh_token',
  TOKEN_EXPIRY_KEY: 'admin_token_expiry'
};

export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login/company',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh'
  },
  // 面试管理
  INTERVIEWS: {
    LIST: '/interviews',
    CREATE: '/interviews',
    DETAIL: (id: string) => `/interviews/${id}`,
    START: (id: string) => `/interviews/${id}/start`,
    QUESTIONS: (id: string) => `/interviews/${id}/questions`
  },
  // 用户管理
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    DETAIL: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`
  },
  // 管理员管理
  ADMINS: {
    LIST: '/admin/admins',
    CREATE: '/admin/admins',
    UPDATE: (id: string) => `/admin/admins/${id}`,
    DELETE: (id: string) => `/admin/admins/${id}`,
    DASHBOARD_STATS: '/admin/dashboard/stats'
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

export default AUTH_CONSTANTS; 
