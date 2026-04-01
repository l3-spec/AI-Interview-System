/**
 * 面试服务 - AI面试会话、答案提交、报告获取
 */

import { AppConfig } from '../config/AppConfig';
import {
  apiGet,
  apiPost,
  apiPut,
  ApiResponse,
} from './ApiService';
import {
  AiInterviewSessionDetail,
  AiInterviewSessionsResponse,
  AiInterviewSessionSummary,
  AiInterviewQuestion,
  CreateAiInterviewSessionRequest,
  AiInterviewCreateSessionData,
  AiInterviewSubmitAnswerRequest,
  SubmitAiInterviewAnswerResponse,
  NextAiInterviewQuestionResponse,
} from '../models/Interview';

/**
 * 面试服务类
 */
export class InterviewService {
  private baseUrl: string;

  constructor(baseUrl: string = AppConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ==================== 面试会话 ====================

  /**
   * 获取面试会话列表
   */
  async getInterviewSessions(): Promise<ApiResponse<AiInterviewSessionsResponse>> {
    const response = await apiGet<any>(`${this.baseUrl}/interview/sessions`);
    if (response.success && response.data) {
      return new ApiResponse(
        true,
        new AiInterviewSessionsResponse(response.data),
        response.statusCode
      );
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
   * 获取单个面试会话详情
   */
  async getSessionDetail(sessionId: string): Promise<ApiResponse<AiInterviewSessionDetail>> {
    const response = await apiGet<any>(`${this.baseUrl}/interview/sessions/${sessionId}`);
    if (response.success && response.data) {
      return new ApiResponse(
        true,
        AiInterviewSessionDetail.fromJson(response.data),
        response.statusCode
      );
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
   * 创建面试会话
   */
  async createInterviewSession(
    params: CreateAiInterviewSessionRequest
  ): Promise<ApiResponse<AiInterviewCreateSessionData>> {
    const response = await apiPost<any>(
      `${this.baseUrl}/interview/sessions`,
      params
    );
    if (response.success && response.data) {
      return new ApiResponse(
        true,
        AiInterviewCreateSessionData.fromJson(response.data),
        response.statusCode
      );
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
   * 获取下一个面试问题
   */
  async getNextQuestion(
    sessionId: string
  ): Promise<ApiResponse<NextAiInterviewQuestionResponse>> {
    const response = await apiGet<any>(
      `${this.baseUrl}/interview/sessions/${sessionId}/next`
    );
    if (response.success && response.data) {
      return new ApiResponse(
        true,
        new NextAiInterviewQuestionResponse(response.data),
        response.statusCode
      );
    }
    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  // ==================== 答案提交 ====================

  /**
   * 提交面试答案
   * @param sessionId 会话ID
   * @param questionIndex 问题索引
   * @param answerText 文字回答（可选）
   * @param videoUrl 视频回答URL（可选）
   * @param answerDuration 回答时长（秒，可选）
   */
  async submitAnswer(
    sessionId: string,
    questionIndex: number,
    answerText?: string,
    videoUrl?: string,
    answerDuration?: number
  ): Promise<ApiResponse<SubmitAiInterviewAnswerResponse>> {
    const request = new AiInterviewSubmitAnswerRequest({
      sessionId,
      questionIndex,
      answerText,
      answerVideoUrl: videoUrl,
      answerDuration,
    });

    const response = await apiPost<any>(
      `${this.baseUrl}/interview/sessions/${sessionId}/submit`,
      request
    );

    if (response.success && response.data) {
      return new ApiResponse(
        true,
        new SubmitAiInterviewAnswerResponse(response.data),
        response.statusCode
      );
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
   * 完成面试会话
   */
  async completeSession(sessionId: string): Promise<ApiResponse<void>> {
    return await apiPost<void>(
      `${this.baseUrl}/interview/sessions/${sessionId}/complete`
    );
  }

  // ==================== 报告 ====================

  /**
   * 获取面试报告URL
   * @param sessionId 会话ID
   * @returns 报告URL
   */
  async getInterviewReport(sessionId: string): Promise<ApiResponse<string>> {
    const response = await apiGet<any>(
      `${this.baseUrl}/interview/sessions/${sessionId}/report`
    );
    if (response.success && response.data) {
      return new ApiResponse(true, response.data.reportUrl ?? '', response.statusCode);
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
   * 获取面试报告列表（简历报告）
   */
  async getResumeReports(): Promise<ApiResponse<AiInterviewSessionSummary[]>> {
    const response = await apiGet<any>(`${this.baseUrl}/interview/reports`);
    if (response.success && response.data) {
      const reports = (response.data.reports ?? response.data ?? []).map(
        (r: any) => new AiInterviewSessionSummary(r)
      );
      return new ApiResponse(true, reports, response.statusCode);
    }
    return new ApiResponse(
      false,
      null,
      response.statusCode,
      response.message,
      response.error
    );
  }

  // ==================== 职位相关 ====================

  /**
   * 获取职位列表
   */
  async getJobs(params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    keyword?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? AppConfig.PAGE_SIZE,
    };
    if (params?.category) {
      queryParams['category'] = params.category;
    }
    if (params?.keyword) {
      queryParams['keyword'] = params.keyword;
    }

    const response = await apiGet<any>(`${this.baseUrl}/jobs`, queryParams);
    return new ApiResponse(
      response.success,
      response.data,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 获取职位详情
   */
  async getJobDetail(jobId: string): Promise<ApiResponse<any>> {
    const response = await apiGet<any>(`${this.baseUrl}/jobs/${jobId}`);
    return new ApiResponse(
      response.success,
      response.data,
      response.statusCode,
      response.message,
      response.error
    );
  }

  /**
   * 投递职位
   */
  async applyJob(jobId: string, message?: string): Promise<ApiResponse<void>> {
    const body = message ? { message } : {};
    return await apiPost<void>(`${this.baseUrl}/jobs/${jobId}/apply`, body);
  }

  /**
   * 收藏职位
   */
  async favoriteJob(jobId: string): Promise<ApiResponse<void>> {
    return await apiPost<void>(`${this.baseUrl}/jobs/${jobId}/favorite`);
  }

  /**
   * 取消收藏职位
   */
  async unfavoriteJob(jobId: string): Promise<ApiResponse<void>> {
    return await apiDelete<void>(`${this.baseUrl}/jobs/${jobId}/favorite`);
  }

  /**
   * 获取我收藏的职位
   */
  async getFavoriteJobs(params?: { page?: number; pageSize?: number }): Promise<ApiResponse<any>> {
    const response = await apiGet<any>(`${this.baseUrl}/jobs/favorites`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? AppConfig.PAGE_SIZE,
    });
    return new ApiResponse(
      response.success,
      response.data,
      response.statusCode,
      response.message,
      response.error
    );
  }

  // ==================== 投递记录 ====================

  /**
   * 获取投递记录
   */
  async getApplications(status?: string): Promise<ApiResponse<any>> {
    const params: Record<string, string | number> = {};
    if (status) {
      params['status'] = status;
    }
    const response = await apiGet<any>(`${this.baseUrl}/jobs/applications`, params);
    return new ApiResponse(
      response.success,
      response.data,
      response.statusCode,
      response.message,
      response.error
    );
  }

  // ==================== 辅助方法 ====================

  private apiDelete<T>(url: string): Promise<ApiResponse<T>> {
    return import('./ApiService').then(({ apiDelete }) => apiDelete<T>(url));
  }
}

// ==================== 全局单例 ====================
let _interviewServiceInstance: InterviewService | null = null;

export function getInterviewService(): InterviewService {
  if (!_interviewServiceInstance) {
    _interviewServiceInstance = new InterviewService();
  }
  return _interviewServiceInstance;
}
