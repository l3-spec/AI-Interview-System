/**
 * 职位相关数据模型
 */

/**
 * 职位摘要
 */
export class JobSummaryDto {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  companyTagline: string | null;
  badgeColor: string;
  location: string | null;
  salary: string | null;
  experience: string | null;
  education: string | null;
  isRemote: boolean;
  tags: string[];
  category: string | null;
  type: string | null;
  level: string | null;
  applicationCount: number;
  interviewCount: number;
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  dictionaryPositionId: string | null;
  dictionaryPositionCode: string | null;
  dictionaryPositionName: string | null;
  dictionaryCategoryId: string | null;
  dictionaryCategoryName: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.companyId = json.companyId ?? '';
    this.companyName = json.companyName ?? '';
    this.companyLogo = json.companyLogo ?? null;
    this.companyTagline = json.companyTagline ?? null;
    this.badgeColor = json.badgeColor ?? '#FF8C42';
    this.location = json.location ?? null;
    this.salary = json.salary ?? null;
    this.experience = json.experience ?? null;
    this.education = json.education ?? null;
    this.isRemote = json.isRemote ?? false;
    this.tags = json.tags ?? [];
    this.category = json.category ?? null;
    this.type = json.type ?? null;
    this.level = json.level ?? null;
    this.applicationCount = json.applicationCount ?? 0;
    this.interviewCount = json.interviewCount ?? 0;
    this.postedAt = json.postedAt ?? '';
    this.createdAt = json.createdAt ?? '';
    this.updatedAt = json.updatedAt ?? '';
    this.dictionaryPositionId = json.dictionaryPositionId ?? null;
    this.dictionaryPositionCode = json.dictionaryPositionCode ?? null;
    this.dictionaryPositionName = json.dictionaryPositionName ?? null;
    this.dictionaryCategoryId = json.dictionaryCategoryId ?? null;
    this.dictionaryCategoryName = json.dictionaryCategoryName ?? null;
  }
}

/**
 * 职位详情
 */
export class JobDetailDto {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  companyTagline: string | null;
  badgeColor: string;
  location: string | null;
  salary: string | null;
  experience: string | null;
  education: string | null;
  isRemote: boolean;
  tags: string[];
  category: string | null;
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  highlights: string[];
  perks: string[];
  type: string | null;
  level: string | null;
  applicationCount: number;
  interviewCount: number;
  company: JobDetailCompanyDto | null;
  dictionaryPositionId: string | null;
  dictionaryPositionCode: string | null;
  dictionaryPositionName: string | null;
  dictionaryCategoryId: string | null;
  dictionaryCategoryName: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.companyId = json.companyId ?? '';
    this.companyName = json.companyName ?? '';
    this.companyLogo = json.companyLogo ?? null;
    this.companyTagline = json.companyTagline ?? null;
    this.badgeColor = json.badgeColor ?? '#FF8C42';
    this.location = json.location ?? null;
    this.salary = json.salary ?? null;
    this.experience = json.experience ?? null;
    this.education = json.education ?? null;
    this.isRemote = json.isRemote ?? false;
    this.tags = json.tags ?? [];
    this.category = json.category ?? null;
    this.postedAt = json.postedAt ?? '';
    this.createdAt = json.createdAt ?? '';
    this.updatedAt = json.updatedAt ?? '';
    this.description = json.description ?? '';
    this.responsibilities = json.responsibilities ?? [];
    this.requirements = json.requirements ?? [];
    this.highlights = json.highlights ?? [];
    this.perks = json.perks ?? [];
    this.type = json.type ?? null;
    this.level = json.level ?? null;
    this.applicationCount = json.applicationCount ?? 0;
    this.interviewCount = json.interviewCount ?? 0;
    this.company = json.company ? new JobDetailCompanyDto(json.company) : null;
    this.dictionaryPositionId = json.dictionaryPositionId ?? null;
    this.dictionaryPositionCode = json.dictionaryPositionCode ?? null;
    this.dictionaryPositionName = json.dictionaryPositionName ?? null;
    this.dictionaryCategoryId = json.dictionaryCategoryId ?? null;
    this.dictionaryCategoryName = json.dictionaryCategoryName ?? null;
  }
}

/**
 * 职位详情-公司信息
 */
export class JobDetailCompanyDto {
  id: string;
  name: string;
  logo: string | null;
  tagline: string | null;
  themeColors: string[];
  locations: string[];
  website: string | null;
  industry: string | null;
  scale: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.name = json.name ?? '';
    this.logo = json.logo ?? null;
    this.tagline = json.tagline ?? null;
    this.themeColors = json.themeColors ?? [];
    this.locations = json.locations ?? [];
    this.website = json.website ?? null;
    this.industry = json.industry ?? null;
    this.scale = json.scale ?? null;
  }
}

/**
 * 公司展示信息
 */
export class CompanyShowcaseDto {
  companyId: string;
  name: string;
  role: string;
  hiringCount: number;
  gradient: string[];
  tagline: string | null;
  logo: string | null;
  focusArea: string | null;
  stats: CompanyStatDto[];
  highlights: string[];
  culture: string[];
  locations: string[];

  constructor(json: any) {
    this.companyId = json.companyId ?? '';
    this.name = json.name ?? '';
    this.role = json.role ?? '';
    this.hiringCount = json.hiringCount ?? 0;
    this.gradient = json.gradient ?? [];
    this.tagline = json.tagline ?? null;
    this.logo = json.logo ?? null;
    this.focusArea = json.focusArea ?? null;
    this.stats = (json.stats ?? []).map((s: any) => new CompanyStatDto(s));
    this.highlights = json.highlights ?? [];
    this.culture = json.culture ?? [];
    this.locations = json.locations ?? [];
  }
}

/**
 * 公司统计数据
 */
export class CompanyStatDto {
  label: string;
  value: string;
  accent: string | null;

  constructor(json: any) {
    this.label = json.label ?? '';
    this.value = json.value ?? '';
    this.accent = json.accent ?? null;
  }
}

/**
 * 职位投递请求
 */
export class JobApplicationRequest {
  message: string | null;

  constructor(message: string | null = null) {
    this.message = message;
  }
}

/**
 * 职位投递记录
 */
export class JobApplicationDto {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  jobId: string;
  userId: string;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.status = json.status ?? '';
    this.message = json.message ?? null;
    this.createdAt = json.createdAt ?? '';
    this.updatedAt = json.updatedAt ?? '';
    this.jobId = json.jobId ?? '';
    this.userId = json.userId ?? '';
  }
}

/**
 * 职位列表响应
 */
export class JobListResponse {
  success: boolean;
  data: JobSummaryDto[];
  total: number | null;
  page: number | null;
  pageSize: number | null;
  hasMore: boolean | null;
  message: string | null;
  error: string | null;

  constructor(json: any) {
    this.success = json.success ?? false;
    this.data = (json.data ?? []).map((j: any) => new JobSummaryDto(j));
    this.total = json.total ?? null;
    this.page = json.page ?? null;
    this.pageSize = json.pageSize ?? null;
    this.hasMore = json.hasMore ?? null;
    this.message = json.message ?? null;
    this.error = json.error ?? null;
  }
}
