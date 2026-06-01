export interface InterviewSession {
  sessionId: string;
  userId: string;
  userName: string;
  state: InterviewState;
  startTime: Date;
  endTime?: Date;
  userInfo: UserInfo;
  rounds: InterviewRound[];
  currentRound?: number;
  totalScore?: number;
  feedback?: string;
  /** 多轮对话历史：按时间顺序存储所有对话消息（system / assistant / user） */
  conversationHistory: Array<{ role: 'system' | 'assistant' | 'user'; content: string }>;
  /** 来自 Prisma 的镜像字段：用于进程重启后判断是否为「已有进度的重连」 */
  dbMirror?: {
    status: string;
    currentQuestion: number;
  };
  /** 并发控制：当前是否正在处理某个业务逻辑 */
  isProcessing?: boolean;
  /** 上次处理事件的时间戳：用于去重 */
  lastEventTime?: number;
  /** 实时面试运行期相位：用于服务端掌控谁该说话、谁该听 */
  runtimePhase?: 'preparing' | 'speaking' | 'listening' | 'processing' | 'completed';
  /** 最近一次已接收候选人文本，用于 ASR/客户端双入口近重复去重 */
  lastCandidateTextKey?: string;
  lastCandidateTextAt?: number;
}

export interface UserInfo {
  name: string;
  targetJob: string;
  background: string;
  experience?: string;
  skills?: string[];
  education?: string;
  yearsOfExperience?: number;
  companyTarget?: string;
  /** 性别：男/女/其他，用于生成正确的称呼 */
  gender?: string;
  /** 年龄 */
  age?: number;
  /** 地区/城市 */
  region?: string;
  /** 手机号 */
  phone?: string;
  /** 个人签名/简介 */
  signature?: string;
  /** 专业 */
  major?: string;
  /** 简历文本（如果用户上传了简历） */
  resumeText?: string;
  /** 完整候选人画像文本（自动生成，用于注入 LLM prompt） */
  candidateProfile?: string;
}

export interface InterviewRound {
  roundNumber: number;
  question: string;
  audioUrl?: string;
  duration: number;
  expectedPoints: string[];
  suggestedTime: number;
  scoringCriteria: string[];
  userResponse?: string;
  analysis?: ResponseAnalysis;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  score?: number;
  feedback?: string;
  followupCount?: number;
  emotionScene?: string;
  emotionInstruction?: string;
  /** 内部评估信息（预期考察点、建议回答时间、评分标准等），仅供后台分析，禁止下发给候选人 */
  internalMetadata?: string;
}

export interface ResponseAnalysis {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  needsFollowup: boolean;
  followupQuestion?: string;
}

export enum InterviewState {
  INTRODUCTION = 'introduction',
  COLLECTING_INFO = 'collecting_info',
  GENERATING = 'generating',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface InterviewRequest {
  userId: string;
  userName: string;
  isFirstTime: boolean;
  userInfo?: Partial<UserInfo>;
}

export interface InterviewResponse {
  sessionId: string;
  state: InterviewState;
  message: string;
  nextAction?: string;
  currentRound?: InterviewRound;
  totalRounds?: number;
}

export interface UserResponseRequest {
  sessionId: string;
  response: string;
  audioUrl?: string;
  duration?: number;
}

export interface UserResponseResponse {
  success: boolean;
  nextRound?: InterviewRound;
  isCompleted: boolean;
  feedback?: string;
  score?: number;
  summary?: string;
}

export interface InterviewSummary {
  sessionId: string;
  userInfo: UserInfo;
  totalRounds: number;
  completedRounds: number;
  averageScore: number;
  strengths: string[];
  weaknesses: string[];
  overallFeedback: string;
  recommendations: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}
