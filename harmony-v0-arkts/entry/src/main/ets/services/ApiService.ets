/**
 * HTTP 服务层 - 基于 HarmonyOS http 模块封装
 * 提供统一的 GET/POST 请求、Token 自动注入、错误处理
 */

import http from '@ohos.net.http';
import { AppConfig } from '../config/AppConfig';

// ==================== 通用 HTTP 响应 ====================

/**
 * API 响应封装
 */
export class ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  error: string | null;
  statusCode: number;

  constructor(success: boolean, data: T | null, statusCode: number, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.statusCode = statusCode;
    this.message = message ?? null;
    this.error = error ?? null;
  }
}

/**
 * API 错误类型
 */
export class ApiError extends Error {
  statusCode: number;
  errorCode: string | null;

  constructor(message: string, statusCode: number = -1, errorCode: string | null = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'ApiError';
  }
}

// ==================== Token 管理 ====================

let _authToken: string | null = null;

/**
 * 设置认证 Token
 */
export function setGlobalToken(token: string | null): void {
  _authToken = token;
}

/**
 * 获取认证 Token
 */
export function getGlobalToken(): string | null {
  return _authToken;
}

/**
 * 清除认证 Token
 */
export function clearGlobalToken(): void {
  _authToken = null;
}

// ==================== HTTP 客户端 ====================

/**
 * 创建 HTTP 请求头
 */
function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // 自动注入 Token
  if (_authToken) {
    headers['Authorization'] = 'Bearer ' + _authToken;
  }

  // 合并额外请求头
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach((key) => {
      headers[key] = extraHeaders[key];
    });
  }

  return headers;
}

/**
 * 处理 HTTP 响应
 */
async function handleResponse<T>(response: http.HttpResponse, parseJson: boolean = true): Promise<ApiResponse<T>> {
  const statusCode = response.responseCode;

  if (statusCode < 200 || statusCode >= 300) {
    let errorMessage = 'Request failed';
    let errorCode: string | null = null;

    if (parseJson && response.result) {
      try {
        const result = typeof response.result === 'string'
          ? JSON.parse(response.result)
          : response.result;
        errorMessage = result.message ?? result.error ?? errorMessage;
        errorCode = result.code ?? result.errorCode ?? null;
      } catch (_) {
        // ignore parse error
      }
    }

    return new ApiResponse<T>(false, null, statusCode, undefined, errorMessage);
  }

  if (!parseJson || !response.result) {
    return new ApiResponse<T>(true, null, statusCode);
  }

  try {
    const result = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result;

    // 统一错误处理（业务层错误）
    if (result.success === false || result.error) {
      return new ApiResponse<T>(
        false,
        null,
        statusCode,
        result.message ?? undefined,
        result.error ?? result.message ?? undefined
      );
    }

    return new ApiResponse<T>(true, result.data ?? result, statusCode);
  } catch (e) {
    return new ApiResponse<T>(false, null, statusCode, undefined, 'Failed to parse response');
  }
}

// ==================== 公开 API ====================

/**
 * GET 请求
 */
export async function apiGet<T>(
  url: string,
  params?: Record<string, string | number | boolean>,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  let finalUrl = url;

  // URL 参数处理
  if (params) {
    const queryString = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
      .join('&');

    if (queryString) {
      finalUrl = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
    }
  }

  const httpClient = http.createHttp();
  try {
    const response = await httpClient.request(finalUrl, {
      method: http.RequestMethod.GET,
      header: buildHeaders(headers),
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT,
    });
    return await handleResponse<T>(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return new ApiResponse<T>(false, null, -1, undefined, message);
  } finally {
    httpClient.destroy();
  }
}

/**
 * POST 请求
 */
export async function apiPost<T>(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const httpClient = http.createHttp();
  try {
    const response = await httpClient.request(url, {
      method: http.RequestMethod.POST,
      header: buildHeaders(headers),
      extraData: body ? JSON.stringify(body) : undefined,
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT,
    });
    return await handleResponse<T>(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return new ApiResponse<T>(false, null, -1, undefined, message);
  } finally {
    httpClient.destroy();
  }
}

/**
 * PUT 请求
 */
export async function apiPut<T>(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const httpClient = http.createHttp();
  try {
    const response = await httpClient.request(url, {
      method: http.RequestMethod.PUT,
      header: buildHeaders(headers),
      extraData: body ? JSON.stringify(body) : undefined,
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT,
    });
    return await handleResponse<T>(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return new ApiResponse<T>(false, null, -1, undefined, message);
  } finally {
    httpClient.destroy();
  }
}

/**
 * DELETE 请求
 */
export async function apiDelete<T>(
  url: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const httpClient = http.createHttp();
  try {
    const response = await httpClient.request(url, {
      method: http.RequestMethod.DELETE,
      header: buildHeaders(headers),
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT,
    });
    return await handleResponse<T>(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return new ApiResponse<T>(false, null, -1, undefined, message);
  } finally {
    httpClient.destroy();
  }
}

/**
 * 文件上传（ multipart/form-data ）
 * @param url 上传地址
 * @param filePath 本地文件路径
 * @param fileName 文件名
 * @param fieldName 表单字段名
 * @param extraData 额外表单数据
 */
export async function apiUpload<T>(
  url: string,
  filePath: string,
  fileName: string,
  fieldName: string = 'file',
  extraData?: Record<string, string>
): Promise<ApiResponse<T>> {
  // ArkTS 当前优先使用 application/json 格式上传文件路径
  // 实际文件上传请使用 @ohos.request.agent 或元数据接口
  const httpClient = http.createHttp();
  try {
    const formData: Record<string, string> = {
      [fieldName]: filePath,
      'fileName': fileName,
    };

    if (extraData) {
      Object.keys(extraData).forEach((key) => {
        formData[key] = extraData[key];
      });
    }

    const response = await httpClient.request(url, {
      method: http.RequestMethod.POST,
      header: {
        ...buildHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      extraData: formData,
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT * 3, // 上传需要更长超时
    });
    return await handleResponse<T>(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return new ApiResponse<T>(false, null, -1, undefined, message);
  } finally {
    httpClient.destroy();
  }
}

/**
 * 下载文件
 */
export async function apiDownload(
  url: string,
  savePath: string
): Promise<{ success: boolean; filePath: string | null; error: string | null }> {
  const httpClient = http.createHttp();
  try {
    const response = await httpClient.request(url, {
      method: http.GET,
      header: buildHeaders(),
      connectTimeout: AppConfig.REQUEST_TIMEOUT,
      readTimeout: AppConfig.REQUEST_TIMEOUT * 5,
    });

    if (response.responseCode >= 200 && response.responseCode < 300 && response.result) {
      // 保存文件逻辑（请根据实际文件系统 API 实现）
      return { success: true, filePath: savePath, error: null };
    }

    return { success: false, filePath: null, error: 'Download failed' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Download failed';
    return { success: false, filePath: null, error: message };
  } finally {
    httpClient.destroy();
  }
}
