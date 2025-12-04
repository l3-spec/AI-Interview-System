import axios from 'axios';
import { config } from '../config/config';

// API响应类型定义
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

interface AdminLoginResponse {
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions?: string[];
  };
  token: string;
}

export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle: string;
  description?: string | null;
  imageUrl: string;
  linkType?: string | null;
  linkId?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotedJobRecord {
  id: string;
  jobId: string;
  promotionType: 'NORMAL' | 'PREMIUM' | 'FEATURED';
  displayFrequency: number;
  priority: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    salary?: string | null;
    location?: string | null;
    company?: {
      id: string;
      name: string;
      logo?: string | null;
    } | null;
  } | null;
}

export interface CompanyStat {
  label: string;
  value: string;
  accent?: string;
}

export interface CompanyShowcaseEntry {
  id: string;
  companyId: string;
  role?: string | null;
  hiringCount: number;
  sortOrder: number;
  company?: {
    id: string;
    name: string;
    logo?: string | null;
    tagline?: string | null;
    focusArea?: string | null;
    themeColors: string[];
    highlights?: string[];
    industry?: string | null;
    scale?: string | null;
  } | null;
}

export interface AdminCompanySummary {
  id: string;
  email: string;
  name: string;
  logo?: string | null;
  industry?: string | null;
  scale?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  focusArea?: string | null;
  tagline?: string | null;
  themeColors: string[];
  showcase?: {
    id: string;
    role?: string | null;
    hiringCount: number;
    sortOrder: number;
  } | null;
  stats?: CompanyStat[];
  jobCount: number;
  interviewCount: number;
}

export interface AdminCompanyDetail extends AdminCompanySummary {
  description?: string | null;
  address?: string | null;
  website?: string | null;
  contact?: string | null;
  highlights: string[];
  culture: string[];
  locations: string[];
  stats: CompanyStat[];
  themeColors: string[];
}

export interface CompanyListResult {
  companies: AdminCompanySummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface JobDictionaryPosition {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category?: JobDictionaryCategory;
}

export interface JobDictionaryCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  positions?: JobDictionaryPosition[];
}

export type AppPlatform = 'ANDROID' | 'IOS';

export interface AppVersion {
  id: string;
  platform: AppPlatform;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes?: string | null;
  isMandatory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT || 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const parseJsonArray = <T = string>(value: any): T[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const parseCompanyStats = (value: any): CompanyStat[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: String(item?.label ?? ''),
        value: String(item?.value ?? ''),
        accent: item?.accent ? String(item.accent) : undefined
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

const mapCompanySummary = (company: any): AdminCompanySummary => ({
  id: company.id,
  email: company.email,
  name: company.name,
  logo: company.logo,
  industry: company.industry,
  scale: company.scale,
  isActive: Boolean(company.isActive),
  isVerified: Boolean(company.isVerified),
  createdAt: company.createdAt,
  focusArea: company.focusArea,
  tagline: company.tagline,
  themeColors: parseJsonArray<string>(company.themeColors),
  showcase: company.showcase
    ? {
        id: company.showcase.id,
        role: company.showcase.role,
        hiringCount: Number(company.showcase.hiringCount ?? 0),
        sortOrder: Number(company.showcase.sortOrder ?? 0)
      }
    : null,
  stats: parseCompanyStats(company.stats),
  jobCount: Number(company._count?.jobs ?? 0),
  interviewCount: Number(company._count?.interviews ?? 0)
});

const ensureStringArray = (value: any): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (typeof item === 'number') {
          return String(item);
        }
        return '';
      })
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

function mapDictionaryCategory(category: any, includePositions = true): JobDictionaryCategory {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? null,
    sortOrder: Number(category.sortOrder ?? 0),
    isActive: Boolean(category.isActive),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    positions:
      includePositions && Array.isArray(category.positions)
        ? category.positions.map((position: any) => mapDictionaryPosition({ ...position, category }))
        : undefined,
  };
}

function mapDictionaryPosition(position: any): JobDictionaryPosition {
  return {
    id: position.id,
    categoryId: position.categoryId,
    code: position.code,
    name: position.name,
    description: position.description ?? null,
    sortOrder: Number(position.sortOrder ?? 0),
    isActive: Boolean(position.isActive),
    tags: ensureStringArray(position.tags),
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
    category: position.category ? mapDictionaryCategory(position.category, false) : undefined,
  };
}

const mapCompanyDetail = (company: any): AdminCompanyDetail => ({
  ...mapCompanySummary(company),
  description: company.description,
  address: company.address,
  website: company.website,
  contact: company.contact,
  highlights: parseJsonArray<string>(company.highlights),
  culture: parseJsonArray<string>(company.culture),
  locations: parseJsonArray<string>(company.locations),
  stats: parseCompanyStats(company.stats),
  themeColors: parseJsonArray<string>(company.themeColors)
});

const mapCompanyShowcase = (entry: any): CompanyShowcaseEntry => ({
  id: entry.id,
  companyId: entry.companyId,
  role: entry.role,
  hiringCount: Number(entry.hiringCount ?? 0),
  sortOrder: Number(entry.sortOrder ?? 0),
  company: entry.company
    ? {
        id: entry.company.id,
        name: entry.company.name,
        logo: entry.company.logo,
        tagline: entry.company.tagline,
        focusArea: entry.company.focusArea,
        themeColors: parseJsonArray<string>(entry.company.themeColors),
        highlights: parseJsonArray<string>(entry.company.highlights),
        industry: entry.company.industry,
        scale: entry.company.scale
      }
    : null
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (axiosConfig) => {
    const token = localStorage.getItem(config.TOKEN_KEY);
    if (token && axiosConfig.headers) {
      axiosConfig.headers.Authorization = `${config.AUTH_HEADER_PREFIX} ${token}`;
    }
    return axiosConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 清除认证信息并重定向到登录页
      localStorage.removeItem(config.TOKEN_KEY);
      localStorage.removeItem(config.USER_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  // 管理员登录 - 修复路径
  login: async (email: string, password: string): Promise<ApiResponse<AdminLoginResponse>> => {
    return await apiClient.post('/auth/login/admin', { email, password });
  },
  
  // 验证token
  verifyToken: async (): Promise<ApiResponse> => {
    return await apiClient.get('/auth/verify');
  },
  
  // 退出登录
  logout: async (): Promise<ApiResponse> => {
    return await apiClient.post('/auth/logout');
  }
};

// 管理员相关API
export const adminApi = {
  // 获取管理员列表
  getAdmins: async (params?: any): Promise<ApiResponse> => {
    return await apiClient.get('/admin/admins', { params });
  },

  // 创建管理员
  createAdmin: async (data: any): Promise<ApiResponse> => {
    return await apiClient.post('/admin/admins', data);
  },

  // 更新管理员
  updateAdmin: async (id: string, data: any): Promise<ApiResponse> => {
    return await apiClient.patch(`/admin/admins/${id}`, data);
  },

  // 删除管理员
  deleteAdmin: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/admins/${id}`);
  },

  // 获取仪表板统计
  getDashboardStats: async (timeRange: string = '30d'): Promise<ApiResponse> => {
    return await apiClient.get('/admin/dashboard/stats', { params: { timeRange } });
  }
};

export const companyApi = {
  getList: async (params?: Record<string, any>): Promise<ApiResponse<CompanyListResult>> => {
    const response = await apiClient.get('/admin/companies', { params }) as ApiResponse<any>;
    if (response?.success && response.data?.companies) {
      response.data = {
        companies: (response.data.companies as any[]).map(mapCompanySummary),
        pagination: response.data.pagination
      };
    }
    return response as ApiResponse<CompanyListResult>;
  },

  getDetail: async (companyId: string): Promise<ApiResponse<AdminCompanyDetail>> => {
    const response = await apiClient.get(`/admin/companies/${companyId}`) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapCompanyDetail(response.data);
    }
    return response as ApiResponse<AdminCompanyDetail>;
  },

  updateStatus: async (
    companyId: string,
    payload: { isActive?: boolean; isVerified?: boolean }
  ): Promise<ApiResponse> => {
    return await apiClient.patch(`/admin/companies/${companyId}/status`, payload);
  },

  extendSubscription: async (
    companyId: string,
    payload: { days: number; reason: string }
  ): Promise<ApiResponse> => {
    return await apiClient.post(`/admin/companies/${companyId}/extend-subscription`, payload);
  }
};

export const homeContentApi = {
  getBanners: async (params?: Record<string, any>): Promise<ApiResponse<PaginationResult<HomeBanner>>> => {
    return await apiClient.get('/admin/home/banners', { params });
  },
  createBanner: async (payload: Partial<HomeBanner>): Promise<ApiResponse<HomeBanner>> => {
    return await apiClient.post('/admin/home/banners', payload);
  },
  updateBanner: async (id: string, payload: Partial<HomeBanner>): Promise<ApiResponse<HomeBanner>> => {
    return await apiClient.put(`/admin/home/banners/${id}`, payload);
  },
  updateBannerStatus: async (id: string, isActive: boolean): Promise<ApiResponse<HomeBanner>> => {
    return await apiClient.patch(`/admin/home/banners/${id}/status`, { isActive });
  },
  deleteBanner: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/home/banners/${id}`);
  },
  reorderBanners: async (orders: Array<{ id: string; sortOrder: number }>): Promise<ApiResponse> => {
    return await apiClient.post('/admin/home/banners/reorder', { orders });
  },
  // 批量更新 Banner 状态
  batchUpdateBannerStatus: async (ids: string[], isActive: boolean): Promise<ApiResponse> => {
    return await apiClient.patch('/admin/home/banners/batch-status', { ids, isActive });
  },
  // 批量删除 Banner
  batchDeleteBanners: async (ids: string[]): Promise<ApiResponse> => {
    return await apiClient.post('/admin/home/banners/batch-delete', { ids });
  },
  getPromotedJobs: async (params?: Record<string, any>): Promise<ApiResponse<PaginationResult<PromotedJobRecord>>> => {
    return await apiClient.get('/admin/home/promoted-jobs', { params });
  },
  createPromotedJob: async (payload: Partial<PromotedJobRecord> & { jobId: string }): Promise<ApiResponse<PromotedJobRecord>> => {
    return await apiClient.post('/admin/home/promoted-jobs', payload);
  },
  updatePromotedJob: async (id: string, payload: Partial<PromotedJobRecord>): Promise<ApiResponse<PromotedJobRecord>> => {
    return await apiClient.put(`/admin/home/promoted-jobs/${id}`, payload);
  },
  deletePromotedJob: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/home/promoted-jobs/${id}`);
  },
  getCompanyShowcases: async (params?: Record<string, any>): Promise<ApiResponse<{ list: CompanyShowcaseEntry[]; total: number; page: number; pageSize: number }>> => {
    const response = await apiClient.get('/admin/home/company-showcases', { params }) as ApiResponse<any>;
    if (response?.success && response.data?.list) {
      response.data = {
        ...response.data,
        list: (response.data.list as any[]).map(mapCompanyShowcase)
      };
    }
    return response as ApiResponse<{ list: CompanyShowcaseEntry[]; total: number; page: number; pageSize: number }>;
  },
  upsertCompanyShowcase: async (
    payload: { companyId: string; role?: string; hiringCount?: number; sortOrder?: number }
  ): Promise<ApiResponse<CompanyShowcaseEntry>> => {
    const response = await apiClient.post('/admin/home/company-showcases', payload) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapCompanyShowcase(response.data);
    }
    return response as ApiResponse<CompanyShowcaseEntry>;
  },
  deleteCompanyShowcase: async (companyId: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/home/company-showcases/${companyId}`);
  }
};

export const appVersionApi = {
  getList: async (
    params?: Record<string, any>
  ): Promise<ApiResponse<PaginationResult<AppVersion>>> => {
    const response = await apiClient.get('/admin/app-versions', { params }) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = {
        list: Array.isArray(response.data.list)
          ? response.data.list.map((item: any) => ({
            ...item,
            versionCode: Number(item.versionCode ?? 0),
            isMandatory: Boolean(item.isMandatory),
            isActive: Boolean(item.isActive)
          }))
          : [],
        total: Number(response.data.total ?? 0),
        page: Number(response.data.page ?? 1),
        pageSize: Number(response.data.pageSize ?? (params?.pageSize || config.DEFAULT_PAGE_SIZE)),
      };
    }
    return response as ApiResponse<PaginationResult<AppVersion>>;
  },
  create: async (payload: Partial<AppVersion>): Promise<ApiResponse<AppVersion>> => {
    return await apiClient.post('/admin/app-versions', payload);
  },
  update: async (id: string, payload: Partial<AppVersion>): Promise<ApiResponse<AppVersion>> => {
    return await apiClient.put(`/admin/app-versions/${id}`, payload);
  },
  activate: async (id: string): Promise<ApiResponse<AppVersion>> => {
    return await apiClient.post(`/admin/app-versions/${id}/activate`);
  }
};

export const jobDictionaryApi = {
  getCategories: async (
    params?: Record<string, any>
  ): Promise<ApiResponse<PaginationResult<JobDictionaryCategory>>> => {
    const response = (await apiClient.get('/admin/job-dictionary/categories', {
      params,
    })) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = {
        list: Array.isArray(response.data.list)
          ? response.data.list.map((item: any) => mapDictionaryCategory(item, true))
          : [],
        total: Number(response.data.total ?? 0),
        page: Number(response.data.page ?? 1),
        pageSize: Number(response.data.pageSize ?? (params?.pageSize || config.DEFAULT_PAGE_SIZE)),
      };
    }
    return response as ApiResponse<PaginationResult<JobDictionaryCategory>>;
  },

  getCategoryDetail: async (id: string): Promise<ApiResponse<JobDictionaryCategory>> => {
    const response = (await apiClient.get(`/admin/job-dictionary/categories/${id}`, {
      params: { includePositions: true },
    })) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryCategory(response.data, true);
    }
    return response as ApiResponse<JobDictionaryCategory>;
  },

  createCategory: async (payload: Partial<JobDictionaryCategory>): Promise<ApiResponse<JobDictionaryCategory>> => {
    const response = (await apiClient.post('/admin/job-dictionary/categories', payload)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryCategory(response.data, false);
    }
    return response as ApiResponse<JobDictionaryCategory>;
  },

  updateCategory: async (
    id: string,
    payload: Partial<JobDictionaryCategory>
  ): Promise<ApiResponse<JobDictionaryCategory>> => {
    const response = (await apiClient.put(`/admin/job-dictionary/categories/${id}`, payload)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryCategory(response.data, false);
    }
    return response as ApiResponse<JobDictionaryCategory>;
  },

  deleteCategory: async (id: string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/admin/job-dictionary/categories/${id}`)) as ApiResponse;
  },

  getPositions: async (
    params?: Record<string, any>
  ): Promise<ApiResponse<PaginationResult<JobDictionaryPosition>>> => {
    const response = (await apiClient.get('/admin/job-dictionary/positions', {
      params,
    })) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = {
        list: Array.isArray(response.data.list)
          ? response.data.list.map((item: any) => mapDictionaryPosition(item))
          : [],
        total: Number(response.data.total ?? 0),
        page: Number(response.data.page ?? 1),
        pageSize: Number(response.data.pageSize ?? (params?.pageSize || config.DEFAULT_PAGE_SIZE)),
      };
    }
    return response as ApiResponse<PaginationResult<JobDictionaryPosition>>;
  },

  getPositionDetail: async (id: string): Promise<ApiResponse<JobDictionaryPosition>> => {
    const response = (await apiClient.get(`/admin/job-dictionary/positions/${id}`)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryPosition(response.data);
    }
    return response as ApiResponse<JobDictionaryPosition>;
  },

  createPosition: async (
    payload: Partial<JobDictionaryPosition>
  ): Promise<ApiResponse<JobDictionaryPosition>> => {
    const response = (await apiClient.post('/admin/job-dictionary/positions', payload)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryPosition(response.data);
    }
    return response as ApiResponse<JobDictionaryPosition>;
  },

  updatePosition: async (
    id: string,
    payload: Partial<JobDictionaryPosition>
  ): Promise<ApiResponse<JobDictionaryPosition>> => {
    const response = (await apiClient.put(`/admin/job-dictionary/positions/${id}`, payload)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapDictionaryPosition(response.data);
    }
    return response as ApiResponse<JobDictionaryPosition>;
  },

  deletePosition: async (id: string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/admin/job-dictionary/positions/${id}`)) as ApiResponse;
  },

  getPublicDictionary: async (): Promise<ApiResponse<JobDictionaryCategory[]>> => {
    const response = (await apiClient.get('/job-dictionary')) as ApiResponse<any>;
    if (response?.success && Array.isArray(response.data)) {
      response.data = response.data.map((item: any) => mapDictionaryCategory(item, true));
    }
    return response as ApiResponse<JobDictionaryCategory[]>;
  },
};

// 文件上传相关 API
export const uploadApi = {
  // 上传文件（支持图片）
  uploadFile: async (file: File, type: 'logo' | 'license' | 'resume' | 'avatar' | 'banner' = 'banner'): Promise<ApiResponse<{ url: string; filename: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type === 'banner' ? 'logo' : type); // 使用 logo 类型作为 banner 的临时方案
    
    // 创建临时 axios 实例用于文件上传（不使用 JSON Content-Type）
    const uploadClient = axios.create({
      baseURL: config.API_BASE_URL,
      timeout: 60000, // 文件上传需要更长的超时时间
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // 添加认证 token
    uploadClient.interceptors.request.use((axiosConfig) => {
      const token = localStorage.getItem(config.TOKEN_KEY);
      if (token && axiosConfig.headers) {
        axiosConfig.headers.Authorization = `${config.AUTH_HEADER_PREFIX} ${token}`;
      }
      return axiosConfig;
    });
    
    try {
      const response = await uploadClient.post('/upload', formData);
      if (response.data?.success && response.data?.data?.url) {
        // 确保返回完整的 URL
        const url = response.data.data.url.startsWith('http') 
          ? response.data.data.url 
          : `${config.API_BASE_URL}${response.data.data.url}`;
        return {
          success: true,
          data: {
            url,
            filename: response.data.data.filename
          }
        };
      }
      throw new Error(response.data?.message || '上传失败');
    } catch (error: any) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || '文件上传失败'
      };
    }
  }
};

export interface AssessmentCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assessments: number;
  };
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
  options: Array<{
    label: string;
    text: string;
    score: number;
  }>;
  correctAnswer?: string | null;
  score: number;
  sortOrder: number;
  createdAt: string;
}

export interface Assessment {
  id: string;
  categoryId: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  durationMinutes: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  participantCount: number;
  rating: number;
  tags: string[];
  guidelines?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isHot: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  questions?: AssessmentQuestion[];
  questionCount?: number;
  recordCount?: number;
}

export interface AssessmentDetail extends Assessment {
  questions: AssessmentQuestion[];
}

export const assessmentApi = {
  // 测评分类管理
  getCategories: async (params?: Record<string, any>): Promise<ApiResponse<PaginationResult<AssessmentCategory>>> => {
    return await apiClient.get('/admin/assessments/categories', { params });
  },
  getActiveCategories: async (): Promise<ApiResponse<Array<{ id: string; name: string; description?: string }>>> => {
    return await apiClient.get('/admin/assessments/categories/active');
  },
  createCategory: async (payload: Partial<AssessmentCategory>): Promise<ApiResponse<AssessmentCategory>> => {
    return await apiClient.post('/admin/assessments/categories', payload);
  },
  updateCategory: async (id: string, payload: Partial<AssessmentCategory>): Promise<ApiResponse<AssessmentCategory>> => {
    return await apiClient.put(`/admin/assessments/categories/${id}`, payload);
  },
  deleteCategory: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/assessments/categories/${id}`);
  },

  // 测评管理
  getAssessments: async (params?: Record<string, any>): Promise<ApiResponse<PaginationResult<Assessment>>> => {
    return await apiClient.get('/admin/assessments', { params });
  },
  getAssessmentDetail: async (id: string): Promise<ApiResponse<AssessmentDetail>> => {
    return await apiClient.get(`/admin/assessments/${id}`);
  },
  createAssessment: async (payload: Partial<Assessment>): Promise<ApiResponse<Assessment>> => {
    return await apiClient.post('/admin/assessments', payload);
  },
  updateAssessment: async (id: string, payload: Partial<Assessment>): Promise<ApiResponse<Assessment>> => {
    return await apiClient.put(`/admin/assessments/${id}`, payload);
  },
  deleteAssessment: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/assessments/${id}`);
  },

  // 题目管理
  createQuestion: async (assessmentId: string, payload: Partial<AssessmentQuestion>): Promise<ApiResponse<AssessmentQuestion>> => {
    return await apiClient.post(`/admin/assessments/${assessmentId}/questions`, payload);
  },
  updateQuestion: async (id: string, payload: Partial<AssessmentQuestion>): Promise<ApiResponse<AssessmentQuestion>> => {
    return await apiClient.put(`/admin/assessments/questions/${id}`, payload);
  },
  deleteQuestion: async (id: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/assessments/questions/${id}`);
  },
  reorderQuestions: async (assessmentId: string, orders: Array<{ id: string; sortOrder: number }>): Promise<ApiResponse> => {
    return await apiClient.post(`/admin/assessments/${assessmentId}/questions/reorder`, { orders });
  },
};

export interface UserPostAdmin {
  id: string;
  title: string;
  content: string;
  coverImage?: string | null;
  images?: string[] | null;
  tags: string[];
  status: string;
  isHot: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    isActive: boolean;
  } | null;
}

const mapUserPostAdmin = (post: any): UserPostAdmin => ({
  id: post.id,
  title: post.title,
  content: post.content,
  coverImage: post.coverImage ?? null,
  images: parseJsonArray<string>(post.images),
  tags: parseJsonArray<string>(post.tags),
  status: post.status,
  isHot: Boolean(post.isHot),
  viewCount: Number(post.viewCount ?? 0),
  likeCount: Number(post.likeCount ?? 0),
  commentCount: Number(post.commentCount ?? 0),
  shareCount: Number(post.shareCount ?? 0),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  user: post.user
    ? {
        id: post.user.id,
        name: post.user.name,
        email: post.user.email,
        isActive: Boolean(post.user.isActive),
      }
    : null,
});

export const postAdminApi = {
  getPosts: async (params?: Record<string, any>): Promise<ApiResponse<PaginationResult<UserPostAdmin>>> => {
    const response = (await apiClient.get('/admin/posts', { params })) as ApiResponse<any>;
    if (response?.success && response.data?.list) {
      response.data = {
        ...response.data,
        list: (response.data.list as any[]).map(mapUserPostAdmin),
      };
    }
    return response as ApiResponse<PaginationResult<UserPostAdmin>>;
  },
  getPostDetail: async (postId: string): Promise<ApiResponse<UserPostAdmin>> => {
    const response = (await apiClient.get(`/admin/posts/${postId}`)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapUserPostAdmin(response.data);
    }
    return response as ApiResponse<UserPostAdmin>;
  },
  updateStatus: async (
    postId: string,
    payload: { status?: string; banUser?: boolean }
  ): Promise<ApiResponse> => {
    return await apiClient.patch(`/admin/posts/${postId}/status`, payload);
  },
  updateHot: async (postId: string, isHot: boolean): Promise<ApiResponse> => {
    return await apiClient.patch(`/admin/posts/${postId}/hot`, { isHot });
  },
  deletePost: async (postId: string): Promise<ApiResponse> => {
    return await apiClient.delete(`/admin/posts/${postId}`);
  },
  updatePost: async (
    postId: string,
    payload: Partial<UserPostAdmin> & { tags?: string[]; images?: string[] }
  ): Promise<ApiResponse<UserPostAdmin>> => {
    const response = (await apiClient.put(`/admin/posts/${postId}`, payload)) as ApiResponse<any>;
    if (response?.success && response.data) {
      response.data = mapUserPostAdmin(response.data);
    }
    return response as ApiResponse<UserPostAdmin>;
  },
};

export default apiClient;
