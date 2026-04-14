/**
 * 面试相关数据模型
 */

/**
 * 面试问题
 */
export class AiInterviewQuestion {
  questionIndex: number;
  questionText: string;
  audioUrl: string | null;
  audioPath: string | null;
  videoUrl: string | null;
  status: string | null;
  audioDuration: number | null;

  constructor(json: any) {
    this.questionIndex = json.questionIndex ?? 0;
    this.questionText = json.questionText ?? '';
    this.audioUrl = json.audioUrl ?? null;
    this.audioPath = json.audioPath ?? null;
    this.videoUrl = json.videoUrl ?? null;
    this.status = json.status ?? null;
    this.audioDuration = json.audioDuration ?? null;
  }
}

/**
 * 创建面试会话请求
 */
export class CreateAiInterviewSessionRequest {
  jobId: string | null;
  jobTarget: string;
  jobCategory: string | null;
  jobSubCategory: string | null;
  companyTarget: string | null;
  background: string | null;
  questionCount: number | null;

  constructor(params: {
    jobId?: string;
    jobTarget: string;
    jobCategory?: string;
    jobSubCategory?: string;
    companyTarget?: string;
    background?: string;
    questionCount?: number;
  }) {
    this.jobId = params.jobId ?? null;
    this.jobTarget = params.jobTarget;
    this.jobCategory = params.jobCategory ?? null;
    this.jobSubCategory = params.jobSubCategory ?? null;
    this.companyTarget = params.companyTarget ?? null;
    this.background = params.background ?? null;
    this.questionCount = params.questionCount ?? null;
  }
}

/**
 * 创建面试会话响应
 */
export class AiInterviewCreateSessionData {
  jobId: string | null;
  sessionId: string;
  questions: AiInterviewQuestion[];
  totalQuestions: number;
  jobCategory: string | null;
  jobSubCategory: string | null;
  plannedDuration: number | null;
  prompt: string | null;

  constructor(json: any) {
    this.jobId = json.jobId ?? null;
    this.sessionId = json.sessionId ?? '';
    this.questions = (json.questions ?? []).map((q: any) => AiInterviewQuestion.fromJson(q));
    this.totalQuestions = json.totalQuestions ?? 0;
    this.jobCategory = json.jobCategory ?? null;
    this.jobSubCategory = json.jobSubCategory ?? null;
    this.plannedDuration = json.plannedDuration ?? null;
    this.prompt = json.prompt ?? null;
  }

  static fromJson(json: any): AiInterviewCreateSessionData {
    return new AiInterviewCreateSessionData(json);
  }
}

/**
 * 面试会话详情
 */
export class AiInterviewSessionDetail {
  sessionId: string;
  userId: string;
  jobTarget: string;
  companyTarget: string | null;
  background: string | null;
  status: string;
  currentQuestion: number;
  totalQuestions: number;
  questions: AiInterviewQuestion[];
  createdAt: string | null;
  startedAt: string | null;
  jobId: string | null;

  constructor(json: any) {
    this.sessionId = json.sessionId ?? '';
    this.userId = json.userId ?? '';
    this.jobTarget = json.jobTarget ?? '';
    this.companyTarget = json.companyTarget ?? null;
    this.background = json.background ?? null;
    this.status = json.status ?? '';
    this.currentQuestion = json.currentQuestion ?? 0;
    this.totalQuestions = json.totalQuestions ?? 0;
    this.questions = (json.questions ?? []).map((q: any) => AiInterviewQuestion.fromJson(q));
    this.createdAt = json.createdAt ?? null;
    this.startedAt = json.startedAt ?? null;
    this.jobId = json.jobId ?? null;
  }

  static fromJson(json: any): AiInterviewSessionDetail {
    return new AiInterviewSessionDetail(json);
  }
}

/**
 * 下一个问题响应
 */
export class NextAiInterviewQuestionResponse {
  success: boolean;
  question: AiInterviewQuestion | null;
  isCompleted: boolean | null;
  message: string | null;
  error: string | null;

  constructor(json: any) {
    this.success = json.success ?? false;
    this.question = json.question ? AiInterviewQuestion.fromJson(json.question) : null;
    this.isCompleted = json.isCompleted ?? null;
    this.message = json.message ?? null;
    this.error = json.error ?? null;
  }
}

/**
 * 提交答案请求
 */
export class AiInterviewSubmitAnswerRequest {
  sessionId: string;
  questionIndex: number;
  answerText: string | null;
  answerVideoUrl: string | null;
  answerVideoPath: string | null;
  answerDuration: number | null;

  constructor(params: {
    sessionId: string;
    questionIndex: number;
    answerText?: string;
    answerVideoUrl?: string;
    answerVideoPath?: string;
    answerDuration?: number;
  }) {
    this.sessionId = params.sessionId;
    this.questionIndex = params.questionIndex;
    this.answerText = params.answerText ?? null;
    this.answerVideoUrl = params.answerVideoUrl ?? null;
    this.answerVideoPath = params.answerVideoPath ?? null;
    this.answerDuration = params.answerDuration ?? null;
  }
}

/**
 * 提交答案响应
 */
export class SubmitAiInterviewAnswerResponse {
  success: boolean;
  message: string | null;
  nextQuestion: number | null;
  isCompleted: boolean | null;
  error: string | null;

  constructor(json: any) {
    this.success = json.success ?? false;
    this.message = json.message ?? null;
    this.nextQuestion = json.nextQuestion ?? null;
    this.isCompleted = json.isCompleted ?? null;
    this.error = json.error ?? null;
  }
}

/**
 * 面试会话摘要
 */
export class AiInterviewSessionSummary {
  id: string | null;
  sessionId: string | null;
  jobTarget: string | null;
  jobCategory: string | null;
  jobSubCategory: string | null;
  status: string | null;
  analysisStatus: string | null;
  resumeType: string | null;
  reportUrl: string | null;
  reportReady: boolean | null;
  createdAt: string | null;
  startedAt: string | null;

  constructor(json: any) {
    this.id = json.id ?? null;
    this.sessionId = json.sessionId ?? null;
    this.jobTarget = json.jobTarget ?? null;
    this.jobCategory = json.jobCategory ?? null;
    this.jobSubCategory = json.jobSubCategory ?? null;
    this.status = json.status ?? null;
    this.analysisStatus = json.analysisStatus ?? null;
    this.resumeType = json.resumeType ?? null;
    this.reportUrl = json.reportUrl ?? null;
    this.reportReady = json.reportReady ?? null;
    this.createdAt = json.createdAt ?? null;
    this.startedAt = json.startedAt ?? null;
  }

  get displayId(): string {
    return this.sessionId ?? this.id ?? '';
  }

  get isReportReady(): boolean {
    return this.reportReady ?? false;
  }
}

/**
 * 面试会话列表响应
 */
export class AiInterviewSessionsResponse {
  success: boolean;
  sessions: AiInterviewSessionSummary[];
  message: string | null;
  error: string | null;

  constructor(json: any) {
    this.success = json.success ?? false;
    this.sessions = (json.sessions ?? []).map((s: any) => new AiInterviewSessionSummary(s));
    this.message = json.message ?? null;
    this.error = json.error ?? null;
  }
}

// 扩展静态方法
AiInterviewQuestion.fromJson = (json: any): AiInterviewQuestion => new AiInterviewQuestion(json);
