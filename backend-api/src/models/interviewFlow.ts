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
}

export interface UserInfo {
  name: string;
  targetJob: string;
  background: string;
  experience?: string;
  skills?: string[];
  education?: string;
  yearsOfExperience?: number;
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