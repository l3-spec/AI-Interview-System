import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  InterviewListParams,
  InterviewDetailResponse,
  InterviewListResponse,
  Candidate,
  CandidateInterviewSummary,
  CandidateListParams,
  CandidateListResponse,
  JobListParams,
  JobListResponse,
  Job,
  Company,
  CompanyStat,
  VerificationListParams,
  VerificationListResponse,
  VerificationApplication,
  DashboardStats
} from '../types/interview';
import { AUTH_CONSTANTS } from '../config/constants';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: any;
}

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: AUTH_CONSTANTS.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
  // 移除 withCredentials: true，避免CORS问题
});

const parseJsonArray = <T>(value: any, fallback: T[] = []): T[] => {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value as T[];
  }

  try {
    return JSON.parse(value) as T[];
  } catch (error) {
    console.warn('Failed to parse JSON array:', value, error);
    return fallback;
  }
};

const parseCompanyStats = (value: any): CompanyStat[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item: any) => ({
        label: String(item.label ?? ''),
        value: String(item.value ?? ''),
        accent: item.accent ? String(item.accent) : undefined,
      }))
      .filter((item) => item.label.length > 0 && item.value.length > 0);
  }
  if (typeof value === 'string') {
    try {
      return parseCompanyStats(JSON.parse(value));
    } catch (error) {
      return [];
    }
  }
  return [];
};

const parseMultiline = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeStringArray = (value?: string[] | null): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
};

const parseSalary = (value?: any): Job['salary'] => {
  if (!value) {
    return { min: 0, max: 0, currency: 'CNY' };
  }

  if (typeof value === 'object') {
    return {
      min: Number(value.min) || 0,
      max: Number(value.max) || 0,
      currency: (value.currency as Job['salary']['currency']) || 'CNY'
    };
  }

  const match = (value as string).match(/(\d+(?:\.\d+)?)K?\s*-\s*(\d+(?:\.\d+)?)K?/i);
  const currencyMatch = (value as string).match(/\b(CNY|USD)\b/);

  return {
    min: match ? Number(match[1]) : 0,
    max: match ? Number(match[2]) : 0,
    currency: (currencyMatch?.[1] as Job['salary']['currency']) || 'CNY'
  };
};

const stringifySalary = (salary?: Job['salary']) => {
  if (!salary) {
    return null;
  }

  const min = salary.min ? `${salary.min}K` : '';
  const max = salary.max ? `${salary.max}K` : '';
  const range = [min, max].filter(Boolean).join('-');
  const currency = salary.currency || 'CNY';

  return [range, currency].filter(Boolean).join(' ').trim();
};

const mapWorkTypeFromApi = (type?: string | null): Job['workType'] => {
  switch (type) {
    case 'PART_TIME':
      return 'parttime';
    case 'INTERN':
    case 'INTERNSHIP':
      return 'internship';
    case 'CONTRACT':
      return 'contract';
    case 'FULL_TIME':
    default:
      return 'fulltime';
  }
};

const mapWorkTypeToApi = (workType?: Job['workType']) => {
  switch (workType) {
    case 'parttime':
      return 'PART_TIME';
    case 'internship':
      return 'INTERN';
    case 'contract':
      return 'CONTRACT';
    case 'fulltime':
    default:
      return 'FULL_TIME';
  }
};

const mapStatusFromApi = (job: any): Job['status'] => {
  if (job.status === 'CLOSED') {
    return 'closed';
  }

  if (job.status === 'DRAFT') {
    return 'draft';
  }

  if (job.isPublished === false) {
    return 'paused';
  }

  return 'published';
};

const mapStatusToApi = (status?: Job['status']) => {
  switch (status) {
    case 'draft':
      return { status: 'DRAFT', isPublished: false };
    case 'paused':
      return { status: 'PAUSED', isPublished: false };
    case 'closed':
      return { status: 'CLOSED', isPublished: false };
    case 'published':
    default:
      return { status: 'ACTIVE', isPublished: true };
  }
};

const mapCandidateGender = (value: unknown): Candidate['gender'] => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['male', 'm'].includes(normalized)) {
      return 'male';
    }
    if (['female', 'f'].includes(normalized)) {
      return 'female';
    }
  }
  return 'other';
};

const parseCandidateExperience = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const matches = value.match(/\d+(?:\.\d+)?/g);
    if (matches?.length) {
      const numbers = matches
        .map((match) => Number(match))
        .filter((num) => Number.isFinite(num));

      if (numbers.length) {
        const average = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        return Math.round(average);
      }
    }
  }

  return 0;
};

const parseCandidateSkills = (value: unknown): string[] => {
  const parsed = parseJsonArray<string>(value, []);
  if (parsed.length) {
    return parsed;
  }

  if (typeof value === 'string') {
    return value
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const mapApiCandidateToCandidate = (candidate: any): Candidate => {
  const education = candidate?.education ? String(candidate.education) : '未填写';
  const major = candidate?.major
    ? String(candidate.major)
    : candidate?.specialization
      ? String(candidate.specialization)
      : '未填写';

  return {
    id: String(candidate?.id ?? ''),
    name: String(candidate?.name ?? ''),
    avatar: candidate?.avatar ?? undefined,
    email: String(candidate?.email ?? ''),
    phone: candidate?.phone ? String(candidate.phone) : '',
    age: typeof candidate?.age === 'number' ? candidate.age : Number(candidate?.age) || 0,
    gender: mapCandidateGender(candidate?.gender),
    education,
    major,
    experience: parseCandidateExperience(candidate?.experience),
    skills: parseCandidateSkills(candidate?.skills),
    resume: candidate?.resume ?? undefined,
    createdAt: candidate?.createdAt ? String(candidate.createdAt) : new Date().toISOString(),
    updatedAt: candidate?.updatedAt
      ? String(candidate.updatedAt)
      : candidate?.updated_at
        ? String(candidate.updated_at)
        : undefined,
    status: candidate?.status
      ? String(candidate.status)
      : candidate?.currentStatus
        ? String(candidate.currentStatus)
        : undefined,
    tags: parseCandidateSkills(candidate?.tags)
  };
};

const toIsoString = (value: any): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const parseOptionalNumber = (value: any): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const mapApiCandidateInterview = (interview: any): CandidateInterviewSummary => {
  const job = interview?.job || {};
  const overallScore = parseOptionalNumber(
    interview?.report?.overallScore ?? interview?.overallScore
  );
  const score = parseOptionalNumber(interview?.score) ?? overallScore;

  return {
    id: String(interview?.id ?? ''),
    job: {
      id: job?.id ? String(job.id) : interview?.jobId ? String(interview.jobId) : '',
      title: job?.title ?? interview?.jobTitle ?? '未命名职位'
    },
    status: interview?.status ? String(interview.status) : undefined,
    result: interview?.result ? String(interview.result) : undefined,
    score,
    overallScore,
    startTime: toIsoString(interview?.startTime ?? interview?.interviewDate),
    endTime: toIsoString(interview?.endTime),
    duration: parseOptionalNumber(interview?.duration),
    createdAt: toIsoString(interview?.createdAt),
    updatedAt: toIsoString(interview?.updatedAt),
    reportSummary: interview?.report?.summary ?? '',
    videoUrl: typeof interview?.videoUrl === 'string' ? interview.videoUrl : undefined
  };
};

const mapApiJobToJob = (job: any): Job => {
  const salary = parseSalary(job.salary);
  const status = mapStatusFromApi(job);
  const counts = job._count || {};

  return {
    id: job.id,
    companyId: job.companyId,
    title: job.title,
    department: job.category || '未分配',
    description: job.description || '',
    requirements: parseMultiline(job.requirements),
    responsibilities: parseMultiline(job.responsibilities),
    salary,
    location: job.location || '未填写',
    workType: mapWorkTypeFromApi(job.type),
    experience: job.experience || '不限',
    education: job.education || '不限',
    skills: parseJsonArray<string>(job.skills),
    benefits: parseMultiline(job.benefits),
    status,
    category: job.category || '',
    level: job.level || '',
    isRemote: Boolean(job.isRemote),
    highlights: parseJsonArray<string>(job.highlights),
    badgeColor: job.badgeColor || null,
    applicantCount: job.applicantCount ?? counts.applications ?? 0,
    interviewCount: job.interviewCount ?? counts.interviews ?? 0,
    hireCount: job.hireCount ?? 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
};

const mapApiCompanyToCompany = (company: any): Company => {
  return {
    id: company.id,
    name: company.name || '',
    email: company.email || '',
    address: company.address || '',
    website: company.website || '',
    description: company.description || '',
    industry: company.industry || '',
    scale: company.scale || '',
    contact: company.contact || '',
    logo: company.logo || '',
    tagline: company.tagline || '',
    focusArea: company.focusArea || '',
    promotionPage: company.promotionPage || '',
    themeColors: parseJsonArray<string>(company.themeColors),
    stats: parseCompanyStats(company.stats),
    highlights: parseJsonArray<string>(company.highlights),
    culture: parseJsonArray<string>(company.culture),
    locations: parseJsonArray<string>(company.locations),
    isVerified: Boolean(company.isVerified),
    isActive: Boolean(company.isActive ?? true),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
};

const serializeCompanyPayload = (company: Partial<Company>) => {
  if (!company) {
    return {};
  }

  const payload: Record<string, any> = {
    name: company.name,
    description: company.description,
    industry: company.industry,
    scale: company.scale,
    address: company.address,
    website: company.website,
    contact: company.contact,
    tagline: company.tagline,
    focusArea: company.focusArea,
    promotionPage: company.promotionPage,
    themeColors: Array.isArray(company.themeColors) ? company.themeColors : undefined,
    highlights: Array.isArray(company.highlights) ? company.highlights : undefined,
    culture: Array.isArray(company.culture) ? company.culture : undefined,
    locations: Array.isArray(company.locations) ? company.locations : undefined,
    stats: Array.isArray(company.stats) ? company.stats : undefined,
    logo: company.logo,
  };

  return payload;
};

const buildJobListQuery = (params?: JobListParams) => {
  if (!params) {
    return {};
  }

  const query: Record<string, any> = {};

  if (params.page) {
    query.page = params.page;
  }

  if (params.pageSize) {
    query.pageSize = params.pageSize;
  }

  if (params.filters?.status && params.filters.status.length > 0) {
    query.status = params.filters.status.map((item) => {
      switch (item) {
        case 'published':
          return 'ACTIVE';
        case 'paused':
          return 'PAUSED';
        case 'closed':
          return 'CLOSED';
        case 'draft':
          return 'DRAFT';
        default:
          return item.toUpperCase();
      }
    });
  }

  if (params.filters?.keyword) {
    query.keyword = params.filters.keyword;
  }

  if (params.sortBy) {
    query.sortBy = params.sortBy;
  }

  if (params.sortOrder) {
    query.sortOrder = params.sortOrder;
  }

  return query;
};

const serializeJobPayload = (job: Partial<Job>) => {
  if (!job) {
    return {};
  }

  const payload: Record<string, any> = {
    title: job.title,
    description: job.description,
    requirements: normalizeStringArray(job.requirements),
    responsibilities: normalizeStringArray(job.responsibilities),
    location: job.location,
    type: mapWorkTypeToApi(job.workType),
    skills: normalizeStringArray(job.skills),
    benefits: normalizeStringArray(job.benefits),
    category: job.category ?? job.department,
    experience: job.experience,
    education: job.education,
    level: job.level,
    isRemote: job.isRemote,
    highlights: normalizeStringArray(job.highlights),
    badgeColor: job.badgeColor,
  };

  const salaryString = stringifySalary(job.salary);
  if (salaryString) {
    payload.salary = salaryString;
  }

  const statusPayload = mapStatusToApi(job.status);
  payload.status = statusPayload.status;
  payload.isPublished = statusPayload.isPublished;

  return payload;
};

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    console.log('Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    
    const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  ((response: AxiosResponse<ApiResponse>) => {
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response.data as ApiResponse;
  }) as unknown as ((value: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>),
  (error) => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // 临时完全禁用401重定向，用于调试
      console.log('API拦截器: 401错误，但不触发重定向', {
        requestUrl: error.config?.url,
        currentPath: window.location.pathname
      });
      
      // 完全禁用重定向逻辑
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authApi = {
  // 企业登录
  login: async (email: string, password: string) => {
    return await apiClient.post('/auth/login/company', { email, password });
  },
  
  // 验证token
  verifyToken: async () => {
    return await apiClient.get('/auth/verify');
  },
  
  // 退出登录
  logout: async () => {
    return await apiClient.post('/auth/logout');
  },
};

// 企业管理API
export const companyApi = {
  // 获取当前企业信息
  getProfile: async (): Promise<Company> => {
    const response = await apiClient.get<ApiResponse<Company>>('/company/profile') as unknown as ApiResponse<Company>;
    if (!response?.success || !response.data) {
      throw new Error(response?.message || '获取企业信息失败');
    }
    return mapApiCompanyToCompany(response.data);
  },
  
  // 更新企业信息
  updateProfile: async (data: Partial<Company>) => {
    const payload = serializeCompanyPayload(data);
    const response = await apiClient.put<ApiResponse<Company>>('/company/profile', payload) as unknown as ApiResponse<Company>;
    if (!response?.success || !response.data) {
      throw new Error(response?.message || '更新企业信息失败');
    }
    return mapApiCompanyToCompany(response.data);
  },
  
  // 上传企业logo
  uploadLogo: async (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<ApiResponse>('/company/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) as unknown as ApiResponse;
    return response;
  },

  // 上传营业执照
  uploadLicense: async (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('license', file);
    const response = await apiClient.post<ApiResponse>('/company/upload-license', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) as unknown as ApiResponse;
    if (!response?.success) {
      throw new Error(response?.message || '上传营业执照失败');
    }
    return response;
  },

  // 获取企业认证信息
  getVerification: async (): Promise<VerificationApplication | null> => {
    const response = await apiClient.get<ApiResponse<VerificationApplication | null>>('/company/verification') as unknown as ApiResponse<VerificationApplication | null>;
    if (!response?.success) {
      return response?.data ?? null;
    }
    return response.data ?? null;
  },

  // 提交企业认证
  submitVerification: async (data: {
    legalPerson: string;
    registrationNumber: string;
    businessLicense: string;
  }) => {
    const response = await apiClient.post<ApiResponse<VerificationApplication>>('/company/verification', data) as unknown as ApiResponse<VerificationApplication>;
    if (!response?.success) {
      throw new Error(response?.message || '提交认证失败');
    }
    return response.data;
  },

  // 获取企业统计数据
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/company/stats') as unknown as ApiResponse<DashboardStats>;
    if (!response?.success || !response.data) {
      throw new Error(response?.message || '获取企业统计失败');
    }
    return response.data;
  },
};

// 职岗管理API
export const jobApi = {
  // 获取职岗列表
  getList: async (params?: JobListParams): Promise<JobListResponse> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/jobs', { params: buildJobListQuery(params) }) as unknown as ApiResponse<any[]>;
    if (!response?.success) {
      throw new Error(response?.message || '获取职位列表失败');
    }

    const list = Array.isArray(response.data) ? response.data : [];
    const total = typeof response.total === 'number' ? response.total : list.length;
    const page = typeof response.page === 'number' ? response.page : params?.page ?? 1;
    const pageSize = typeof response.pageSize === 'number' ? response.pageSize : params?.pageSize ?? list.length;

    return {
      data: (list as any[]).map((job) => mapApiJobToJob(job)),
      total,
      page,
      pageSize
    };
  },
  
  // 创建职岗
  create: async (data: Partial<Job>) => {
    const payload = serializeJobPayload(data);
    const response = await apiClient.post<ApiResponse<any>>('/jobs', payload) as unknown as ApiResponse<any>;
    if (!response?.success || !response.data) {
      throw new Error(response?.message || '创建职位失败');
    }

    return mapApiJobToJob(response.data);
  },
  
  // 更新职岗
  update: async (id: string, data: Partial<Job>) => {
    const payload = serializeJobPayload(data);
    const response = await apiClient.put<ApiResponse<any>>(`/jobs/${id}`, payload) as unknown as ApiResponse<any>;
    if (!response?.success) {
      throw new Error(response?.message || '更新职位失败');
    }
    return response;
  },
  
  // 删除职岗
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse>(`/jobs/${id}`) as unknown as ApiResponse;
    if (!response?.success) {
      throw new Error(response?.message || '删除职位失败');
    }
    return response;
  },
  
  // 获取职岗详情
  getById: async (id: string): Promise<Job> => {
    const response = await apiClient.get<ApiResponse<any>>(`/jobs/${id}`) as unknown as ApiResponse<any>;
    if (!response?.success || !response.data) {
      throw new Error(response?.message || '获取职位详情失败');
    }
    return mapApiJobToJob(response.data);
  },
  
  // 发布职岗
  publish: async (id: string) => {
    return await apiClient.patch(`/jobs/${id}/publish`);
  },
  
  // 暂停职岗
  pause: async (id: string) => {
    return await apiClient.patch(`/jobs/${id}/pause`);
  },
  
  // 关闭职岗
  close: async (id: string) => {
    return await apiClient.patch(`/jobs/${id}/close`);
  },
  
  // 获取职岗的候选人列表
  getCandidates: async (jobId: string, params?: CandidateListParams): Promise<CandidateListResponse> => {
    return await apiClient.get(`/jobs/${jobId}/candidates`, { params });
  },
  
  // 获取职岗的面试记录
  getInterviews: async (jobId: string, params?: any) => {
    return await apiClient.get(`/jobs/${jobId}/interviews`, { params });
  },
  
  // 职岗统计数据
  getStats: async (jobId: string) => {
    return await apiClient.get(`/jobs/${jobId}/stats`);
  },
};

// 候选人管理API
export const candidateApi = {
  // 获取候选人列表
  getList: async (params?: CandidateListParams): Promise<CandidateListResponse> => {
    const response = await apiClient.get<ApiResponse<any>>('/candidates', { params }) as unknown as ApiResponse<any>;

    const rawCandidates = (() => {
      if (!response) {
        return [];
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data?.candidates)) {
        return response.data.candidates;
      }
      if (Array.isArray(response.candidates)) {
        return response.candidates;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    })();

    const normalizedCandidates = rawCandidates.map(mapApiCandidateToCandidate);

    const total =
      typeof response?.total === 'number'
        ? response.total
        : typeof response?.data?.total === 'number'
          ? response.data.total
          : normalizedCandidates.length;

    const page =
      typeof response?.page === 'number'
        ? response.page
        : typeof response?.data?.page === 'number'
          ? response.data.page
          : params?.page ?? 1;

    const pageSize =
      typeof response?.pageSize === 'number'
        ? response.pageSize
        : typeof response?.data?.pageSize === 'number'
          ? response.data.pageSize
          : params?.pageSize ?? (normalizedCandidates.length || 10);

    return {
      data: normalizedCandidates,
      total,
      page,
      pageSize
    };
  },
  
  // 获取候选人详情
  getById: async (id: string): Promise<Candidate> => {
    const response = await apiClient.get<ApiResponse<any>>(`/candidates/${id}`) as unknown as ApiResponse<any>;

    if (!response?.success || !response.data) {
      throw new Error(response?.message || '获取候选人详情失败');
    }

    return mapApiCandidateToCandidate(response.data);
  },
  
  // 获取候选人的所有面试记录
  getInterviews: async (candidateId: string): Promise<CandidateInterviewSummary[]> => {
    const response = await apiClient.get<ApiResponse<any>>(`/candidates/${candidateId}/interviews`) as unknown as ApiResponse<any>;

    if (!response?.success) {
      throw new Error(response?.message || '获取候选人面试记录失败');
    }

    const payload = response?.data ?? response;

    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any)?.interviews)
        ? (payload as any).interviews
        : Array.isArray((payload as any)?.data)
          ? (payload as any).data
          : [];

    return rawList.map(mapApiCandidateInterview);
  },
  
  // 邀请候选人面试
  inviteInterview: async (candidateId: string, jobId: string, data: any) => {
    return await apiClient.post(`/candidates/${candidateId}/invite`, { jobId, ...data });
  },
  
  // 更新候选人信息
  update: async (id: string, data: any) => {
    return await apiClient.put(`/candidates/${id}`, data);
  },
  
  // 添加候选人备注
  addNote: async (candidateId: string, note: string) => {
    return await apiClient.post(`/candidates/${candidateId}/notes`, { note });
  },
  
  // 收藏候选人
  favorite: async (candidateId: string) => {
    return await apiClient.post(`/candidates/${candidateId}/favorite`);
  },
  
  // 取消收藏
  unfavorite: async (candidateId: string) => {
    return await apiClient.delete(`/candidates/${candidateId}/favorite`);
  },
};

// 面试API
export const interviewApi = {
  // 获取面试列表（支持筛选和分页）
  getList: async (params?: InterviewListParams): Promise<InterviewListResponse> => {
    return await apiClient.get('/interviews', { params });
  },
  
  // 获取面试详情（包含能力评估和问答记录）
  getDetail: async (id: string): Promise<InterviewDetailResponse> => {
    return await apiClient.get(`/interviews/${id}/detail`);
  },
  
  // 获取面试基本信息
  getById: async (id: string) => {
    return await apiClient.get(`/interviews/${id}`);
  },
  
  // 创建面试
  create: async (data: any) => {
    return await apiClient.post('/interviews', data);
  },
  
  // 更新面试状态
  updateStatus: async (id: string, status: string) => {
    return await apiClient.patch(`/interviews/${id}/status`, { status });
  },
  
  // 更新面试结果
  updateResult: async (id: string, result: string, feedback?: string) => {
    return await apiClient.patch(`/interviews/${id}/result`, { result, feedback });
  },
  
  // 获取能力评估详情
  getAssessment: async (interviewId: string) => {
    return await apiClient.get(`/interviews/${interviewId}/assessment`);
  },
  
  // 获取面试问答记录
  getQAList: async (interviewId: string) => {
    return await apiClient.get(`/interviews/${interviewId}/qa`);
  },
  
  // 导出面试数据
  exportData: async (params?: any) => {
    return await apiClient.get('/interviews/export', { params, responseType: 'blob' });
  },
};

const normalizeVerificationApplication = (
  payload: any
): VerificationApplication | null => {
  if (!payload) return null;
  const rawStatus = (payload.status || '').toString().toLowerCase();
  const normalizedStatus: VerificationApplication['status'] =
    rawStatus === 'approved'
      ? 'approved'
      : rawStatus === 'rejected'
        ? 'rejected'
        : 'pending';

  return {
    ...payload,
    status: normalizedStatus,
    submittedAt: payload.submittedAt || payload.createdAt || payload.updatedAt,
    reviewedAt: payload.reviewedAt || payload.updatedAt
  } as VerificationApplication;
};

// 实名认证API
export const verificationApi = {
  // 提交实名认证申请
  submit: async (data: {
    businessLicense: File;
    legalPerson: string;
    registrationNumber: string;
  }): Promise<VerificationApplication | null> => {
    const formData = new FormData();
    formData.append('businessLicense', data.businessLicense);
    formData.append('legalPerson', data.legalPerson);
    formData.append('registrationNumber', data.registrationNumber);
    const response = await apiClient.post<ApiResponse<VerificationApplication>>('/verification/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) as unknown as ApiResponse<VerificationApplication>;

    if (!response?.success) {
      throw new Error(response?.message || '提交认证失败');
    }

    return normalizeVerificationApplication(response.data);
  },
  
  // 获取认证状态
  getStatus: async (): Promise<VerificationApplication | null> => {
    const response = await apiClient.get<ApiResponse<VerificationApplication | null>>('/verification/status') as unknown as ApiResponse<VerificationApplication | null>;
    if (!response?.success) {
      throw new Error(response?.message || '获取认证状态失败');
    }
    return normalizeVerificationApplication(response.data);
  },
  
  // 获取认证申请列表（管理员使用）
  getList: async (params?: VerificationListParams): Promise<VerificationListResponse> => {
    return await apiClient.get('/admin/verification/list', { params });
  },
  
  // 审核认证申请（管理员使用）
  review: async (id: string, status: 'approved' | 'rejected', comments?: string) => {
    return await apiClient.post(`/admin/verification/${id}/review`, { status, comments });
  },
  
  // 获取认证申请详情（管理员使用）
  getById: async (id: string): Promise<VerificationApplication> => {
    return await apiClient.get(`/admin/verification/${id}`);
  },
};

// 用户API
export const userApi = {
  getList: async (params?: any) => {
    return await apiClient.get('/users', { params });
  },
  
  getById: async (id: string) => {
    return await apiClient.get(`/users/${id}`);
  },
  
  updateStatus: async (id: string, status: string) => {
    return await apiClient.patch(`/users/${id}/status`, { status });
  },
};

// 统计API
export const statsApi = {
  // 获取企业仪表板统计
  getDashboard: async (): Promise<DashboardStats> => {
    return await apiClient.get('/stats/dashboard');
  },
  
  // 获取面试统计
  getInterviewStats: async (params?: any) => {
    return await apiClient.get('/stats/interviews', { params });
  },
  
  // 获取职岗统计
  getJobStats: async (params?: any) => {
    return await apiClient.get('/stats/jobs', { params });
  },
  
  // 获取候选人统计
  getCandidateStats: async (params?: any) => {
    return await apiClient.get('/stats/candidates', { params });
  },
  
  // 获取面试官统计  
  getInterviewerStats: async (params?: any) => {
    return await apiClient.get('/stats/interviewers', { params });
  },
};

// 文件上传API
export const uploadApi = {
  // 上传文件
  uploadFile: async (file: File, type: 'logo' | 'license' | 'resume' | 'avatar') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 获取文件预览URL
  getPreviewUrl: (filename: string) =>
    `${apiClient.defaults.baseURL}/files/preview/${filename}`,
  
  // 获取文件下载URL
  getDownloadUrl: (filename: string) =>
    `${apiClient.defaults.baseURL}/files/download/${filename}`,
};

export default apiClient; 
