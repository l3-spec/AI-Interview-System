// 面试者基本信息
export interface Candidate {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  education: string;
  major: string;
  experience: number; // 工作年限
  skills: string[];
  resume?: string;
  createdAt: string;
  updatedAt?: string;
  status?: string;
  tags?: string[];
}

// 企业信息
export interface CompanyStat {
  label: string;
  value: string;
  accent?: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  address?: string;
  website?: string;
  description?: string;
  industry?: string;
  scale?: string;
  contact?: string;
  logo?: string;
  tagline?: string;
  focusArea?: string;
  companyStage?: string;
  promotionPage?: string;
  themeColors: string[];
  stats: CompanyStat[];
  highlights: string[];
  culture: string[];
  locations: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 职岗信息
export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary: {
    min: number;
    max: number;
    currency: 'CNY' | 'USD';
  };
  location: string;
  workType: 'fulltime' | 'parttime' | 'contract' | 'internship';
  experience: string; // 经验要求
  education: string; // 学历要求
  skills: string[];
  benefits: string[];
  status: 'draft' | 'published' | 'paused' | 'closed';
  category?: string;
  level?: string;
  isRemote?: boolean;
  highlights?: string[];
  badgeColor?: string | null;
  applicantCount: number;
  interviewCount: number;
  hireCount: number;
  createdAt: string;
  updatedAt: string;
}

// 实名认证申请
export interface VerificationApplication {
  id: string;
  companyId: string;
  company: Company;
  businessLicense: string; // 营业执照文件URL
  legalPerson: string; // 法人姓名
  registrationNumber: string; // 注册号
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // 审核人员ID
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
}

// 面试记录
export interface Interview {
  id: string;
  candidateId: string;
  candidate: Candidate;
  jobId: string;
  job: Job;
  jobTitle: string;
  department: string;
  status: 'pending' | 'completed' | 'cancelled' | 'scheduled';
  interviewDate: string;
  duration: number; // 面试时长（分钟）
  videoUrl?: string;
  score: number; // 总分
  result: 'pending' | 'passed' | 'failed' | 'reviewing';
  createdAt: string;
  updatedAt: string;
}

export interface CandidateInterviewSummary {
  id: string;
  job: {
    id: string;
    title: string;
  };
  status?: string;
  result?: string;
  score?: number;
  overallScore?: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
  reportSummary?: string;
  videoUrl?: string;
}

// 维度评分等级
export type ScoreLevel = '优秀' | '良好' | '一般' | '待提升';

// 多模态评估数据
export interface MultimodalAssessment {
  expressionStability: number; // 表情稳定性 0-10
  eyeContact: number; // 眼神接触 0-10
  toneStability: number; // 语气稳定性 0-10
  speechFluency: number; // 语速流畅度 0-10
  stutterCount: number; // 卡顿次数
  hesitationCount?: number; // 犹豫次数（API hesitionCount 别名）
}

// 能力评估
export interface AbilityAssessment {
  id: string;
  interviewId: string;
  // 旧字段（保留用于向后兼容）
  technicalSkills: number; // 技术能力
  communication: number; // 沟通能力 
  problemSolving: number; // 问题解决能力
  teamwork: number; // 团队协作
  leadership: number; // 领导力
  creativity: number; // 创新能力
  adaptability: number; // 适应能力
  learningResearchScore?: number;
  interpersonalCommunicationScore?: number;
  stressToleranceScore?: number;
  achievementOrientationScore?: number;
  // 新6维度 (0-10分制)
  professionalAbilityScore?: number; // 1. 专业能力 - 岗位硬技能、知识储备、实操水平 💡
  learningGrowthScore?: number; // 2. 学习成长 - 学习速度、知识迁移、自我驱动 📈
  communicationCollaborationScore?: number; // 3. 沟通协作 - 表达清晰、倾听理解、团队配合 🤝
  problemSolvingScore?: number; // 4. 问题解决 - 分析能力、创新思维、方案落地 🧩
  problemSolvingNewScore?: number; // API 返回键名（映射到 problemSolvingScore）
  achievementExecutionScore?: number; // 5. 成就执行 - 目标导向、结果驱动、责任担当 🎯
  stressResilienceScore?: number; // 6. 抗压韧性 - 情绪稳定、逆商、快速恢复 🛡️
  // 兼容已有新字段
  learningAbilityScore?: number;
  opennessInnovationScore?: number;
  stressResistanceScore?: number;
  communicationAbilityScore?: number;
  collaborationResponsibilityScore?: number;
  achievementInnovationScore?: number;
  overallScore: number; // 综合评分
  feedback: string; // 详细反馈
  strengths: string[]; // 优势
  improvements: string[]; // 改进建议
  // 多模态评估
  multimodal?: MultimodalAssessment;
  // 各维度评分说明
  dimensionDetails?: Record<string, {
    score: number;
    level: ScoreLevel;
    description: string;
  }>;
}

// 面试问题和回答
export interface InterviewQA {
  id: string;
  interviewId: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  duration: number; // 回答时长
  category: 'technical' | 'behavioral' | 'situational' | 'general';
  // 本题各维度得分
  dimensionScores?: {
    professionalAbilityScore?: number;
    achievementOrientationScore?: number;
    learningResearchScore?: number;
    opennessInnovationScore?: number;
    stressToleranceScore?: number;
    teamworkScore?: number;
  };
}

// 候选人筛选条件
export interface CandidateFilters {
  skills?: string[];
  experience?: [number, number];
  education?: string[];
  location?: string[];
  keyword?: string;
  availability?: string;
  salary?: [number, number];
}

// 面试筛选条件
export interface InterviewFilters {
  status?: string[];
  result?: string[];
  department?: string[];
  dateRange?: [string, string];
  scoreRange?: [number, number];
  keyword?: string;
  jobId?: string;
}

// 职岗筛选条件
export interface JobFilters {
  status?: string[];
  department?: string[];
  workType?: string[];
  salaryRange?: [number, number];
  keyword?: string;
  createdDateRange?: [string, string];
}

// 列表查询参数
export interface InterviewListParams {
  page?: number;
  pageSize?: number;
  filters?: InterviewFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CandidateListParams {
  page?: number;
  pageSize?: number;
  filters?: CandidateFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  jobId?: string; // 针对特定职岗的候选人
}

export interface JobListParams {
  page?: number;
  pageSize?: number;
  filters?: JobFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VerificationListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API响应
export interface InterviewListResponse {
  data: Interview[];
  total: number;
  page: number;
  pageSize: number;
  stats?: {
    totalInterviews: number;
    completedInterviews: number;
    passedInterviews: number;
    pendingInterviews: number;
    reviewingInterviews: number;
    passRate: number;
    averageScore: number;
    departmentStats: Record<string, { total: number; completed: number; passed: number }>;
  };
}

export interface CandidateListResponse {
  data: Candidate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobListResponse {
  data: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VerificationListResponse {
  data: VerificationApplication[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InterviewDetailResponse {
  interview: Interview;
  assessment: AbilityAssessment;
  qaList: InterviewQA[];
}

// 统计数据
export interface DashboardStats {
  users: number;
  interviews: number;
  completionRate: string;
  totalJobs?: number;
  activeJobs?: number;
  totalCandidates?: number;
  totalInterviews?: number;
  passedInterviews?: number;
  interviewPassRate?: number;
} 
