import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { Prisma } from '@prisma/client';
import { aiService } from '../services/aiService';
import { interviewService } from '../services/interviewService';
import { prisma } from '../lib/prisma';

/**
 * 面试控制器
 * 处理所有面试相关的API请求
 */
class InterviewController {
  
  /**
   * 开始面试
   */
  async startInterview(req: Request, res: Response) {
    try {
      const { 
        action, 
        user_job_target, 
        user_company_target, 
        user_background 
      } = req.body;

      // 生成会话ID
      const sessionId = uuidv4();
      
      // 创建面试会话
      const interviewSession = await interviewService.createSession({
        sessionId,
        jobTarget: user_job_target,
        companyTarget: user_company_target,
        background: user_background,
        status: 'active',
        createdAt: new Date()
      });

      // 生成第一个问题
      const firstQuestion = await aiService.generateFirstQuestion({
        jobTarget: user_job_target,
        companyTarget: user_company_target,
        background: user_background
      });

      // 保存问题到会话
      await interviewService.addQuestionToSession(sessionId, {
        questionIndex: 0,
        question: firstQuestion,
        createdAt: new Date()
      });

      res.json({
        action: 'start',
        question: firstQuestion,
        question_index: 0,
        total_questions: 5, // 默认5题
        session_id: sessionId,
        success: true
      });

    } catch (error) {
      console.error('开始面试失败:', error);
      res.status(500).json({
        success: false,
        error_message: '开始面试失败，请稍后重试'
      });
    }
  }

  /**
   * 获取下一题
   */
  async getNextQuestion(req: Request, res: Response) {
    try {
      const {
        action,
        session_id,
        last_answer,
        current_question_index
      } = req.body;

      // 获取面试会话
      const session = await interviewService.getSession(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error_message: '面试会话不存在'
        });
      }

      // 保存上一题的答案
      if (last_answer && current_question_index !== undefined) {
        await interviewService.saveAnswer(session_id, {
          questionIndex: current_question_index,
          answer: last_answer,
          createdAt: new Date()
        });
      }

      const nextQuestionIndex = (current_question_index || 0) + 1;
      const totalQuestions = 5;

      // 检查是否已完成所有题目
      if (nextQuestionIndex >= totalQuestions) {
        return res.json({
          action: 'complete',
          is_final: true,
          next_action: 'submit',
          session_id: session_id,
          success: true
        });
      }

      // 生成下一个问题
      const questionHistory = await interviewService.getQuestionHistory(session_id);
      const answerHistory = await interviewService.getAnswerHistory(session_id);

      const nextQuestion = await aiService.generateNextQuestion({
        jobTarget: session.jobTarget,
        companyTarget: session.companyTarget,
        background: session.background,
        questionHistory,
        answerHistory,
        currentIndex: nextQuestionIndex
      });

      // 保存问题到会话
      await interviewService.addQuestionToSession(session_id, {
        questionIndex: nextQuestionIndex,
        question: nextQuestion,
        createdAt: new Date()
      });

      res.json({
        action: 'next',
        question: nextQuestion,
        question_index: nextQuestionIndex,
        total_questions: totalQuestions,
        session_id: session_id,
        is_final: nextQuestionIndex === totalQuestions - 1,
        success: true
      });

    } catch (error) {
      console.error('获取下一题失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取下一题失败，请稍后重试'
      });
    }
  }

  /**
   * 提交面试结果
   */
  async submitInterview(req: Request, res: Response) {
    try {
      const {
        action,
        session_id,
        video_url,
        interview_duration
      } = req.body;

      // 获取面试会话
      const session = await interviewService.getSession(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error_message: '面试会话不存在'
        });
      }

      // 获取所有问题和答案
      const questions = await interviewService.getQuestionHistory(session_id);
      const answers = await interviewService.getAnswerHistory(session_id);

      // 使用AI分析面试结果
      const analysisResult = await aiService.analyzeInterview({
        jobTarget: session.jobTarget,
        companyTarget: session.companyTarget,
        background: session.background,
        questions,
        answers,
        duration: interview_duration
      });

      // 更新面试会话状态
      await interviewService.updateSession(session_id, {
        status: 'completed',
        videoUrl: video_url,
        duration: interview_duration,
        analysisResult,
        completedAt: new Date()
      });

      res.json({
        action: 'submit',
        analysis_result: analysisResult,
        session_id: session_id,
        success: true
      });

    } catch (error) {
      console.error('提交面试失败:', error);
      res.status(500).json({
        success: false,
        error_message: '提交面试失败，请稍后重试'
      });
    }
  }

  /**
   * 上传面试视频
   */
  async uploadVideo(req: Request, res: Response) {
    try {
      const { session_id, question_index } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error_message: '未找到上传的视频文件'
        });
      }

      // 生成视频URL
      const videoUrl = `/uploads/videos/${file.filename}`;

      // 保存视频信息到数据库
      await interviewService.saveVideoSegment(session_id, {
        questionIndex: parseInt(question_index),
        videoUrl,
        fileName: file.filename,
        fileSize: file.size,
        uploadedAt: new Date()
      });

      res.json({
        success: true,
        video_url: videoUrl,
        message: '视频上传成功'
      });

    } catch (error) {
      console.error('上传视频失败:', error);
      res.status(500).json({
        success: false,
        error_message: '上传视频失败，请稍后重试'
      });
    }
  }

  /**
   * 获取面试会话列表
   */
  async getInterviewSessions(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      const sessions = await interviewService.getSessions({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string
      });

      res.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      console.error('获取面试会话列表失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取面试会话列表失败'
      });
    }
  }

  /**
   * 获取面试会话详情
   */
  async getInterviewSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await interviewService.getSessionDetail(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error_message: '面试会话不存在'
        });
      }

      res.json({
        success: true,
        data: session
      });

    } catch (error) {
      console.error('获取面试会话详情失败:', error);
      res.status(500).json({
        success: false,
        error_message: '获取面试会话详情失败'
      });
    }
  }
}

export const interviewController = new InterviewController();

// 为了兼容新的路由系统，添加独立的导出函数

interface CandidateView {
  id: string;
  name: string;
  avatar?: string | null;
  email: string;
  phone?: string | null;
  age: number;
  gender?: string | null;
  education?: string | null;
  major?: string | null;
  experience: number;
  skills: string[];
  createdAt: string;
}

interface InterviewView {
  id: string;
  candidateId: string;
  candidate: CandidateView;
  jobId: string;
  jobTitle: string;
  department: string;
  status: string;
  interviewDate: string;
  duration: number;
  videoUrl?: string;
  score: number;
  result: string;
  createdAt: string;
  updatedAt: string;
}

interface AssessmentView {
  id: string;
  interviewId: string;
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  teamwork: number;
  leadership: number;
  creativity: number;
  adaptability: number;
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface QuestionView {
  id: string;
  interviewId: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  duration: number;
  category: string;
}

interface InterviewFilters {
  status?: string[];
  result?: string[];
  department?: string[];
  keyword?: string;
  scoreRange?: [number, number];
  dateRange?: [string, string];
  jobId?: string;
}

interface MockInterviewRow {
  id: string;
  candidate_id: string;
  job_id: string;
  job_title: string;
  department: string | null;
  status: string;
  result: string;
  interview_date: Date | null;
  duration: number | bigint | null;
  video_url: string | null;
  score: any;
  created_at: Date;
  updated_at: Date;
  candidate_name: string;
  candidate_avatar: string | null;
  candidate_email: string;
  candidate_phone: string | null;
  candidate_age: number | bigint | null;
  candidate_gender: string | null;
  candidate_education: string | null;
  candidate_major: string | null;
  candidate_experience: number | bigint | null;
  candidate_skills: string | null;
  candidate_created_at: Date;
}

interface MockAssessmentRow {
  id: string;
  interview_id: string;
  technical_skills: any;
  communication: any;
  problem_solving: any;
  teamwork: any;
  leadership: any;
  creativity: any;
  adaptability: any;
  overall_score: any;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
}

interface MockQuestionRow {
  id: string;
  interview_id: string;
  order_index: number | bigint | null;
  question: string;
  answer: string | null;
  score: any;
  feedback: string | null;
  duration: number | bigint | null;
  category: string | null;
}

const toNumber = (value: any, defaultValue = 0): number => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
  if (typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      try {
        return value.toNumber();
      } catch (error) {
        console.warn('Failed to convert decimal value:', error);
        return defaultValue;
      }
    }
  }
  return defaultValue;
};

const toScore = (value: any): number => {
  const score = toNumber(value, 0);
  return Math.round(score * 10) / 10;
};

const toIsoString = (value: Date | string | null | undefined): string => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};

const parseJsonArray = (value: any): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item));
      }
    } catch (error) {
      return trimmed
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const ensureArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item)).filter(Boolean);
        }
      } catch (error) {
        return [];
      }
    }
    return trimmed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ensureScoreRange = (value: unknown): [number, number] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  let source: any = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.startsWith('[')) {
      try {
        source = JSON.parse(trimmed);
      } catch (error) {
        return undefined;
      }
    } else if (trimmed.includes(',')) {
      source = trimmed.split(',');
    } else {
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        return [parsed, parsed];
      }
    }
  }

  if (!Array.isArray(source)) {
    return undefined;
  }

  const numbers = source
    .map(item => Number(item))
    .filter(item => !Number.isNaN(item));

  if (numbers.length >= 2) {
    return [numbers[0], numbers[1]];
  }

  return undefined;
};

const ensureDateRange = (value: unknown): [string, string] | undefined => {
  if (!value) {
    return undefined;
  }
  let source: any = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.startsWith('[')) {
      try {
        source = JSON.parse(trimmed);
      } catch (error) {
        return undefined;
      }
    } else if (trimmed.includes(',')) {
      source = trimmed.split(',');
    }
  }

  if (!Array.isArray(source)) {
    return undefined;
  }

  const dates = source
    .map(item => (item instanceof Date ? item.toISOString() : String(item)))
    .filter(Boolean);

  if (dates.length >= 2) {
    return [dates[0], dates[1]];
  }

  return undefined;
};

const parseFilters = (raw: unknown): InterviewFilters => {
  if (!raw) {
    return {};
  }

  let source: any = raw;
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid filters JSON string:', raw);
      return {};
    }
  }

  if (typeof source !== 'object' || source === null) {
    return {};
  }

  const filters: InterviewFilters = {};

  if ('status' in source) {
    const statuses = ensureArray((source as any).status);
    if (statuses.length) {
      filters.status = statuses;
    }
  }

  if ('result' in source) {
    const results = ensureArray((source as any).result);
    if (results.length) {
      filters.result = results;
    }
  }

  if ('department' in source) {
    const departments = ensureArray((source as any).department);
    if (departments.length) {
      filters.department = departments;
    }
  }

  if (typeof (source as any).keyword === 'string') {
    filters.keyword = (source as any).keyword.trim();
  }

  const scoreRange = ensureScoreRange((source as any).scoreRange);
  if (scoreRange) {
    filters.scoreRange = scoreRange;
  }

  const dateRange = ensureDateRange((source as any).dateRange);
  if (dateRange) {
    filters.dateRange = dateRange;
  }

  if (typeof (source as any).jobId === 'string') {
    filters.jobId = (source as any).jobId;
  }

  return filters;
};

const mapRowToInterview = (row: MockInterviewRow): InterviewView => {
  const candidate: CandidateView = {
    id: row.candidate_id,
    name: row.candidate_name,
    avatar: row.candidate_avatar,
    email: row.candidate_email,
    phone: row.candidate_phone || '',
    age: toNumber(row.candidate_age, 0),
    gender: row.candidate_gender,
    education: row.candidate_education || '',
    major: row.candidate_major || '',
    experience: toNumber(row.candidate_experience, 0),
    skills: parseJsonArray(row.candidate_skills),
    createdAt: toIsoString(row.candidate_created_at)
  };

  const interviewDate = toIsoString(row.interview_date);

  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidate,
    jobId: row.job_id,
    jobTitle: row.job_title,
    department: row.department || '',
    status: row.status,
    interviewDate,
    duration: toNumber(row.duration, 0),
    videoUrl: row.video_url || undefined,
    score: toScore(row.score),
    result: row.result,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
};

const isMissingTableError = (error: unknown, tableName: string) => {
  const prismaError = error as Prisma.PrismaClientKnownRequestError | undefined;
  if (!prismaError || prismaError.code !== 'P2010') {
    return false;
  }
  const metaMessage = String((prismaError.meta as any)?.message || '').toLowerCase();
  const metaCode = String((prismaError.meta as any)?.code || '');
  return metaCode === '1146' || metaMessage.includes(tableName.toLowerCase());
};

const mapGender = (value?: string | null): 'male' | 'female' | 'other' => {
  if (!value) {
    return 'other';
  }
  const normalized = value.toLowerCase();
  if (normalized.includes('male') || normalized === 'm') {
    return 'male';
  }
  if (normalized.includes('female') || normalized === 'f') {
    return 'female';
  }
  return 'other';
};

const parseExperienceValue = (value: any): number => {
  const numeric = toNumber(value, NaN);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  if (typeof value === 'string') {
    const matches = value.match(/\d+(?:\.\d+)?/g);
    if (matches?.length) {
      const numbers = matches
        .map(item => Number(item))
        .filter(item => Number.isFinite(item));
      if (numbers.length) {
        const average = numbers.reduce((sum, item) => sum + item, 0) / numbers.length;
        return Math.round(average);
      }
    }
  }
  return 0;
};

const mapUserToCandidateView = (user: any): CandidateView => ({
  id: user?.id || '',
  name: user?.name || '',
  avatar: user?.avatar ?? undefined,
  email: user?.email || '',
  phone: user?.phone || '',
  age: toNumber(user?.age, 0),
  gender: mapGender(user?.gender),
  education: user?.education || '',
  major: user?.major || '',
  experience: parseExperienceValue(user?.experience),
  skills: parseJsonArray(user?.skills),
  createdAt: toIsoString(user?.createdAt)
});

const normalizeStatus = (status?: string | null): string => {
  if (!status) {
    return 'PENDING';
  }
  return status.toUpperCase();
};

const deriveResultFromStatus = (status: string, score?: number): string => {
  const normalizedStatus = status.toUpperCase();
  const hasScore = typeof score === 'number' && !Number.isNaN(score);
  if (normalizedStatus === 'COMPLETED') {
    if (hasScore) {
      return score >= 60 ? 'PASSED' : 'FAILED';
    }
    return 'REVIEWING';
  }
  if (normalizedStatus === 'CANCELLED') {
    return 'WITHDRAWN';
  }
  if (normalizedStatus === 'ONGOING') {
    return 'REVIEWING';
  }
  return 'PENDING';
};

const mapPrismaInterviewToView = (interview: any): InterviewView => {
  const status = normalizeStatus(interview?.status);
  const score = toScore(interview?.score);
  return {
    id: interview?.id || '',
    candidateId: interview?.userId || '',
    candidate: mapUserToCandidateView(interview?.user),
    jobId: interview?.jobId || '',
    jobTitle: interview?.job?.title || '',
    department: interview?.job?.department || interview?.job?.category || '',
    status,
    interviewDate: toIsoString(interview?.startTime || interview?.createdAt),
    duration: toNumber(interview?.duration, 0),
    videoUrl: interview?.recording || undefined,
    score,
    result: deriveResultFromStatus(status, score),
    createdAt: toIsoString(interview?.createdAt),
    updatedAt: toIsoString(interview?.updatedAt)
  };
};

const createEmptyAssessment = (interviewId: string): AssessmentView => ({
  id: `assessment-${interviewId}`,
  interviewId,
  technicalSkills: 0,
  communication: 0,
  problemSolving: 0,
  teamwork: 0,
  leadership: 0,
  creativity: 0,
  adaptability: 0,
  overallScore: 0,
  feedback: '',
  strengths: [],
  improvements: []
});

const parseReportSummary = (summary: any): Record<string, any> | null => {
  if (!summary) {
    return null;
  }

  if (typeof summary === 'object') {
    return summary;
  }

  if (typeof summary === 'string') {
    const trimmed = summary.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      try {
        const normalized = trimmed
          .replace(/([\{,]\s*)([A-Za-z0-9_]+)(\s*:)/g, '$1"$2"$3')
          .replace(/'([^']*)'/g, '"$1"');
        return JSON.parse(normalized);
      } catch (nestedError) {
        return null;
      }
    }
  }

  return null;
};

const pickAbilityScore = (source: Record<string, any> | null, key: keyof AssessmentView, fallback: number): number => {
  if (!source) {
    return fallback;
  }

  const abilityPools = [
    source?.abilities,
    source?.abilityScores,
    source?.scores,
    source?.dimensions
  ];

  for (const pool of abilityPools) {
    if (pool && typeof pool === 'object') {
      const value = pool[key as string];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
  }

  const directValue = source[key as string];
  if (typeof directValue === 'number' && Number.isFinite(directValue)) {
    return directValue;
  }

  return fallback;
};

const parseStringArray = (value: any): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item)).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const mapReportToAssessment = (report: any, interviewId: string): AssessmentView => {
  if (!report) {
    return createEmptyAssessment(interviewId);
  }

  const overallScore = toScore(report.overallScore);
  const baseScore = overallScore || 0;
  const summaryData = parseReportSummary(report.summary);
  const feedback = summaryData?.feedback
    || summaryData?.summary
    || (typeof report.summary === 'string' ? report.summary : '');

  return {
    id: report.id || `report-${interviewId}`,
    interviewId,
    technicalSkills: pickAbilityScore(summaryData, 'technicalSkills', baseScore),
    communication: pickAbilityScore(summaryData, 'communication', baseScore),
    problemSolving: pickAbilityScore(summaryData, 'problemSolving', baseScore),
    teamwork: pickAbilityScore(summaryData, 'teamwork', baseScore),
    leadership: pickAbilityScore(summaryData, 'leadership', baseScore),
    creativity: pickAbilityScore(summaryData, 'creativity', baseScore),
    adaptability: pickAbilityScore(summaryData, 'adaptability', baseScore),
    overallScore,
    feedback,
    strengths: parseStringArray(summaryData?.strengths),
    improvements: parseStringArray(summaryData?.improvements)
  };
};

const mapQuestionToView = (question: any): QuestionView => ({
  id: question?.id || '',
  interviewId: question?.interviewId || '',
  question: question?.content || '',
  answer: question?.answer || '',
  score: toScore(question?.score),
  feedback: question?.feedback || '',
  duration: toNumber(question?.duration, 0),
  category: (question?.type || 'general').toLowerCase()
});

const fetchInterviewsFromDatabase = async (
  filters: InterviewFilters,
  pageNumber: number,
  pageSizeNumber: number
) => {
  const where: Prisma.InterviewWhereInput = {};

  if (filters.status?.length) {
    where.status = {
      in: filters.status.map(status => status.toUpperCase())
    };
  }

  if (filters.jobId) {
    where.jobId = filters.jobId;
  }

  if (filters.dateRange) {
    const [start, end] = filters.dateRange;
    where.createdAt = {
      gte: new Date(start),
      lte: new Date(end)
    };
  }

  if (filters.keyword) {
    const keyword = filters.keyword;
    where.OR = [
      { job: { title: { contains: keyword } } },
      { user: { name: { contains: keyword } } },
      { user: { email: { contains: keyword } } }
    ];
  }

  const skip = (pageNumber - 1) * pageSizeNumber;

  const [records, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      include: {
        user: true,
        job: true,
        report: true
      },
      orderBy: [
        { startTime: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: pageSizeNumber
    }),
    prisma.interview.count({ where })
  ]);

  return {
    items: records.map(mapPrismaInterviewToView),
    total
  };
};

const fetchInterviewDetailFromDatabase = async (id: string) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      user: true,
      job: true,
      report: true,
      questions: {
        orderBy: [{ createdAt: 'asc' }]
      }
    }
  });

  if (!interview) {
    return null;
  }

  const interviewView = mapPrismaInterviewToView(interview);
  const assessment = mapReportToAssessment(interview.report, interview.id);
  const qaList = (interview.questions || []).map(mapQuestionToView);

  return {
    interview: interviewView,
    assessment,
    qaList
  };
};

const applyFilters = (interviews: InterviewView[], filters: InterviewFilters): InterviewView[] => {
  let filtered = [...interviews];

  if (filters.status && filters.status.length) {
    const target = new Set(filters.status);
    filtered = filtered.filter(item => target.has(item.status));
  }

  if (filters.result && filters.result.length) {
    const target = new Set(filters.result);
    filtered = filtered.filter(item => target.has(item.result));
  }

  if (filters.department && filters.department.length) {
    const target = new Set(filters.department);
    filtered = filtered.filter(item => target.has(item.department));
  }

  if (filters.jobId) {
    filtered = filtered.filter(item => item.jobId === filters.jobId);
  }

  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    filtered = filtered.filter(item => {
      const nameMatch = item.candidate.name.toLowerCase().includes(keyword);
      const emailMatch = item.candidate.email.toLowerCase().includes(keyword);
      const jobMatch = item.jobTitle.toLowerCase().includes(keyword);
      const skillMatch = item.candidate.skills.some(skill => skill.toLowerCase().includes(keyword));
      return nameMatch || emailMatch || jobMatch || skillMatch;
    });
  }

  if (filters.scoreRange) {
    const [minScore, maxScore] = filters.scoreRange;
    filtered = filtered.filter(item => item.score >= minScore && item.score <= maxScore);
  }

  if (filters.dateRange) {
    const [start, end] = filters.dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    filtered = filtered.filter(item => {
      if (!item.interviewDate) {
        return false;
      }
      const date = new Date(item.interviewDate);
      return date >= startDate && date <= endDate;
    });
  }

  return filtered;
};

const mapAssessmentRow = (row: MockAssessmentRow | undefined, interviewId: string): AssessmentView => {
  if (!row) {
    return {
      id: `assessment-${interviewId}`,
      interviewId,
      technicalSkills: 7.0,
      communication: 7.0,
      problemSolving: 7.0,
      teamwork: 7.0,
      leadership: 6.5,
      creativity: 6.8,
      adaptability: 7.2,
      overallScore: 7.0,
      feedback: '评估数据正在生成中...',
      strengths: ['待评估'],
      improvements: ['待评估']
    };
  }

  return {
    id: row.id,
    interviewId: row.interview_id,
    technicalSkills: toScore(row.technical_skills),
    communication: toScore(row.communication),
    problemSolving: toScore(row.problem_solving),
    teamwork: toScore(row.teamwork),
    leadership: toScore(row.leadership),
    creativity: toScore(row.creativity),
    adaptability: toScore(row.adaptability),
    overallScore: toScore(row.overall_score),
    feedback: row.feedback || '',
    strengths: parseJsonArray(row.strengths),
    improvements: parseJsonArray(row.improvements)
  };
};

const mapQuestionRow = (row: MockQuestionRow): QuestionView => {
  return {
    id: row.id,
    interviewId: row.interview_id,
    question: row.question,
    answer: row.answer || '',
    score: toScore(row.score),
    feedback: row.feedback || '',
    duration: toNumber(row.duration, 0),
    category: row.category || 'general'
  };
};

// 获取面试列表（支持筛选和分页）
export const getInterviews = async (req: Request, res: Response) => {
  const { page = 1, pageSize = 10 } = req.query;
  const rawFilters = (req.query as any).filters;
  const filters = parseFilters(rawFilters);
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSizeNumber = Math.max(Number(pageSize) || 10, 1);

  try {
    const rows = await prisma.$queryRaw<MockInterviewRow[]>`
      SELECT
        i.id,
        i.candidate_id,
        i.job_id,
        i.job_title,
        i.department,
        i.status,
        i.result,
        i.interview_date,
        i.duration,
        i.video_url,
        i.score,
        i.created_at,
        i.updated_at,
        c.name AS candidate_name,
        c.avatar AS candidate_avatar,
        c.email AS candidate_email,
        c.phone AS candidate_phone,
        c.age AS candidate_age,
        c.gender AS candidate_gender,
        c.education AS candidate_education,
        c.major AS candidate_major,
        c.experience AS candidate_experience,
        c.skills AS candidate_skills,
        c.created_at AS candidate_created_at
      FROM mock_interviews i
      JOIN mock_candidates c ON c.id = i.candidate_id
      ORDER BY i.interview_date DESC, i.created_at DESC
    `;

    const interviews = rows.map(mapRowToInterview);
    const filtered = applyFilters(interviews, filters);

    const startIndex = (pageNumber - 1) * pageSizeNumber;
    const paginated = filtered.slice(startIndex, startIndex + pageSizeNumber);

    res.json({
      success: true,
      data: paginated,
      total: filtered.length,
      page: pageNumber,
      pageSize: pageSizeNumber
    });
  } catch (error) {
    if (isMissingTableError(error, 'mock_interviews')) {
      try {
        const result = await fetchInterviewsFromDatabase(filters, pageNumber, pageSizeNumber);
        return res.json({
          success: true,
          data: result.items,
          total: result.total,
          page: pageNumber,
          pageSize: pageSizeNumber
        });
      } catch (fallbackError) {
        console.error('Fallback 获取面试列表失败:', fallbackError);
      }
    } else {
      console.error('获取面试列表失败:', error);
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取面试详情（包含能力评估和问答记录）
export const getInterviewDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await prisma.$queryRaw<MockInterviewRow[]>`
      SELECT
        i.id,
        i.candidate_id,
        i.job_id,
        i.job_title,
        i.department,
        i.status,
        i.result,
        i.interview_date,
        i.duration,
        i.video_url,
        i.score,
        i.created_at,
        i.updated_at,
        c.name AS candidate_name,
        c.avatar AS candidate_avatar,
        c.email AS candidate_email,
        c.phone AS candidate_phone,
        c.age AS candidate_age,
        c.gender AS candidate_gender,
        c.education AS candidate_education,
        c.major AS candidate_major,
        c.experience AS candidate_experience,
        c.skills AS candidate_skills,
        c.created_at AS candidate_created_at
      FROM mock_interviews i
      JOIN mock_candidates c ON c.id = i.candidate_id
      WHERE i.id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '面试记录不存在' });
    }

    const interview = mapRowToInterview(rows[0]);

    const [assessmentRow] = await prisma.$queryRaw<MockAssessmentRow[]>`
      SELECT *
      FROM mock_interview_assessments
      WHERE interview_id = ${id}
      LIMIT 1
    `;

    const assessment = mapAssessmentRow(assessmentRow, id);

    const questionRows = await prisma.$queryRaw<MockQuestionRow[]>`
      SELECT *
      FROM mock_interview_questions
      WHERE interview_id = ${id}
      ORDER BY order_index ASC, id ASC
    `;

    const qaList = questionRows.map(mapQuestionRow);

    res.json({
      success: true,
      interview,
      assessment,
      qaList
    });
  } catch (error) {
    if (isMissingTableError(error, 'mock_interviews')) {
      try {
        const detail = await fetchInterviewDetailFromDatabase(req.params.id);
        if (!detail) {
          return res.status(404).json({ success: false, message: '面试记录不存在' });
        }
        return res.json({
          success: true,
          interview: detail.interview,
          assessment: detail.assessment,
          qaList: detail.qaList
        });
      } catch (fallbackError) {
        console.error('Fallback 获取面试详情失败:', fallbackError);
      }
    } else {
      console.error('获取面试详情失败:', error);
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取面试基本信息
export const getInterviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await prisma.$queryRaw<MockInterviewRow[]>`
      SELECT
        i.id,
        i.candidate_id,
        i.job_id,
        i.job_title,
        i.department,
        i.status,
        i.result,
        i.interview_date,
        i.duration,
        i.video_url,
        i.score,
        i.created_at,
        i.updated_at,
        c.name AS candidate_name,
        c.avatar AS candidate_avatar,
        c.email AS candidate_email,
        c.phone AS candidate_phone,
        c.age AS candidate_age,
        c.gender AS candidate_gender,
        c.education AS candidate_education,
        c.major AS candidate_major,
        c.experience AS candidate_experience,
        c.skills AS candidate_skills,
        c.created_at AS candidate_created_at
      FROM mock_interviews i
      JOIN mock_candidates c ON c.id = i.candidate_id
      WHERE i.id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '面试记录不存在' });
    }

    const interview = mapRowToInterview(rows[0]);
    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('获取面试基本信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建面试
export const createInterview = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const {
      candidateId,
      jobId,
      type,
      scheduledAt,
      location,
      meetingUrl,
      notes
    } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    // 验证职岗权限
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: '职岗不存在或无权限操作' });
    }

    // 验证候选人存在
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: '候选人不存在' });
    }

    const interview = await prisma.interview.create({
      data: {
        candidateId,
        companyId,
        jobId,
        type,
        scheduledAt: new Date(scheduledAt),
        location,
        meetingUrl,
        notes,
        status: 'SCHEDULED'
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: '面试创建成功',
      data: interview
    });
  } catch (error) {
    console.error('创建面试失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 更新面试状态
export const updateInterviewStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user?.id;

    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的面试状态' });
    }

    const result = await prisma.interview.updateMany({
      where: { id, companyId },
      data: { status }
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: '面试记录不存在或无权限操作' });
    }

    res.json({ success: true, message: '面试状态更新成功' });
  } catch (error) {
    console.error('更新面试状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 更新面试结果
export const updateInterviewResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { result, feedback } = req.body;
    const companyId = req.user?.id;

    // 验证面试记录存在且有权限
    const interview = await prisma.interview.findFirst({
      where: { id, companyId }
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: '面试记录不存在或无权限操作' });
    }

    // 更新面试备注
    await prisma.interview.update({
      where: { id },
      data: { notes: feedback }
    });

    res.json({ success: true, message: '面试结果更新成功' });
  } catch (error) {
    console.error('更新面试结果失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取能力评估详情
export const getInterviewAssessment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interviewExists = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM mock_interviews
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!interviewExists.length) {
      return res.status(404).json({ success: false, message: '面试记录不存在' });
    }

    const [assessmentRow] = await prisma.$queryRaw<MockAssessmentRow[]>`
      SELECT *
      FROM mock_interview_assessments
      WHERE interview_id = ${id}
      LIMIT 1
    `;

    const assessment = mapAssessmentRow(assessmentRow, id);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('获取能力评估详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取面试问答记录
export const getInterviewQAList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interviewExists = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM mock_interviews
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!interviewExists.length) {
      return res.status(404).json({ success: false, message: '面试记录不存在' });
    }

    const questionRows = await prisma.$queryRaw<MockQuestionRow[]>`
      SELECT *
      FROM mock_interview_questions
      WHERE interview_id = ${id}
      ORDER BY order_index ASC, id ASC
    `;

    const qaList = questionRows.map(mapQuestionRow);
    res.json({ success: true, data: qaList });
  } catch (error) {
    console.error('获取面试问答记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 导出面试数据
export const exportInterviewData = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.id;
    const { format = 'excel', startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const where: any = { companyId };

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        candidate: {
          select: {
            name: true,
            email: true
          }
        },
        job: {
          select: {
            title: true
          }
        },
        report: {
          select: {
            overallScore: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 简化版本：返回JSON数据，实际项目中可以集成Excel导出库
    res.json({
      success: true,
      data: interviews,
      format: format,
      message: '数据导出成功'
    });
  } catch (error) {
    console.error('导出面试数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}; 
