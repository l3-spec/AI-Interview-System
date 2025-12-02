import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// 面试会话接口
interface InterviewSessionAttributes {
  id: number;
  userId: number;
  jobPosition: string;
  jobLevel: string;
  status: 'preparing' | 'in_progress' | 'completed' | 'abandoned';
  totalQuestions: number;
  currentQuestionIndex: number;
  startTime: Date;
  endTime?: Date;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisResult?: string; // JSON格式的分析结果
  createdAt: Date;
  updatedAt: Date;
}

interface InterviewSessionCreationAttributes extends Optional<InterviewSessionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class InterviewSession extends Model<InterviewSessionAttributes, InterviewSessionCreationAttributes>
  implements InterviewSessionAttributes {
  public id!: number;
  public userId!: number;
  public jobPosition!: string;
  public jobLevel!: string;
  public status!: 'preparing' | 'in_progress' | 'completed' | 'abandoned';
  public totalQuestions!: number;
  public currentQuestionIndex!: number;
  public startTime!: Date;
  public endTime?: Date;
  public analysisStatus!: 'pending' | 'processing' | 'completed' | 'failed';
  public analysisResult?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InterviewSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    jobPosition: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '面试职位',
    },
    jobLevel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '职位级别',
    },
    status: {
      type: DataTypes.ENUM('preparing', 'in_progress', 'completed', 'abandoned'),
      allowNull: false,
      defaultValue: 'preparing',
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    currentQuestionIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    analysisStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    analysisResult: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '面试分析结果JSON',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'interview_sessions',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

// 面试问题接口
interface InterviewQuestionAttributes {
  id: number;
  sessionId: number;
  questionIndex: number;
  questionText: string;
  questionAudioUrl?: string;
  questionType: 'general' | 'technical' | 'behavioral' | 'situational';
  timeLimit: number; // 秒
  createdAt: Date;
  updatedAt: Date;
}

interface InterviewQuestionCreationAttributes extends Optional<InterviewQuestionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class InterviewQuestion extends Model<InterviewQuestionAttributes, InterviewQuestionCreationAttributes>
  implements InterviewQuestionAttributes {
  public id!: number;
  public sessionId!: number;
  public questionIndex!: number;
  public questionText!: string;
  public questionAudioUrl?: string;
  public questionType!: 'general' | 'technical' | 'behavioral' | 'situational';
  public timeLimit!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InterviewQuestion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'interview_sessions',
        key: 'id',
      },
    },
    questionIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    questionAudioUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'TTS生成的音频文件URL',
    },
    questionType: {
      type: DataTypes.ENUM('general', 'technical', 'behavioral', 'situational'),
      allowNull: false,
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 120, // 默认2分钟
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'interview_questions',
    indexes: [
      {
        fields: ['sessionId', 'questionIndex'],
        unique: true,
      },
    ],
  }
);

// 面试回答接口
interface InterviewAnswerAttributes {
  id: number;
  sessionId: number;
  questionId: number;
  videoUrl: string;
  duration: number; // 秒
  transcription?: string; // 语音转文字
  analysisScore?: number; // 0-100分
  analysisDetails?: string; // JSON格式详细分析
  createdAt: Date;
  updatedAt: Date;
}

interface InterviewAnswerCreationAttributes extends Optional<InterviewAnswerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class InterviewAnswer extends Model<InterviewAnswerAttributes, InterviewAnswerCreationAttributes>
  implements InterviewAnswerAttributes {
  public id!: number;
  public sessionId!: number;
  public questionId!: number;
  public videoUrl!: string;
  public duration!: number;
  public transcription?: string;
  public analysisScore?: number;
  public analysisDetails?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InterviewAnswer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'interview_sessions',
        key: 'id',
      },
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'interview_questions',
        key: 'id',
      },
    },
    videoUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'OSS存储的视频文件URL',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transcription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '回答的语音转文字内容',
    },
    analysisScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '回答得分0-100',
    },
    analysisDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '详细分析结果JSON',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'interview_answers',
    indexes: [
      {
        fields: ['sessionId'],
      },
      {
        fields: ['questionId'],
      },
    ],
  }
);

// 用户简历数据模型
interface UserResumeAttributes {
  id: number;
  userId: number;
  resumeType: 'structured' | 'video' | 'uploaded';
  resumeData?: string; // JSON格式的结构化简历数据
  videoUrl?: string; // 视频简历URL
  originalFileUrl?: string; // 上传的原始简历文件URL
  analysisResult?: string; // JSON格式的简历分析结果
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserResumeCreationAttributes extends Optional<UserResumeAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserResume extends Model<UserResumeAttributes, UserResumeCreationAttributes>
  implements UserResumeAttributes {
  public id!: number;
  public userId!: number;
  public resumeType!: 'structured' | 'video' | 'uploaded';
  public resumeData?: string;
  public videoUrl?: string;
  public originalFileUrl?: string;
  public analysisResult?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserResume.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    resumeType: {
      type: DataTypes.ENUM('structured', 'video', 'uploaded'),
      allowNull: false,
    },
    resumeData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '结构化简历数据JSON',
    },
    videoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '视频简历URL',
    },
    originalFileUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '上传的原始简历文件URL',
    },
    analysisResult: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '简历分析结果JSON',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'user_resumes',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['userId', 'isActive'],
      },
    ],
  }
);

// 职场素质评估结果
interface CareerAssessmentAttributes {
  id: number;
  userId: number;
  sessionId?: number;
  assessmentType: 'interview_based' | 'resume_based' | 'comprehensive';
  overallScore: number; // 0-100
  communicationScore: number;
  technicalScore: number;
  leadershipScore: number;
  problemSolvingScore: number;
  teamworkScore: number;
  adaptabilityScore: number;
  detailsData: string; // JSON格式详细数据
  recommendations?: string; // 改进建议
  createdAt: Date;
  updatedAt: Date;
}

interface CareerAssessmentCreationAttributes extends Optional<CareerAssessmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CareerAssessment extends Model<CareerAssessmentAttributes, CareerAssessmentCreationAttributes>
  implements CareerAssessmentAttributes {
  public id!: number;
  public userId!: number;
  public sessionId?: number;
  public assessmentType!: 'interview_based' | 'resume_based' | 'comprehensive';
  public overallScore!: number;
  public communicationScore!: number;
  public technicalScore!: number;
  public leadershipScore!: number;
  public problemSolvingScore!: number;
  public teamworkScore!: number;
  public adaptabilityScore!: number;
  public detailsData!: string;
  public recommendations?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CareerAssessment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'interview_sessions',
        key: 'id',
      },
    },
    assessmentType: {
      type: DataTypes.ENUM('interview_based', 'resume_based', 'comprehensive'),
      allowNull: false,
    },
    overallScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    communicationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    technicalScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    leadershipScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    problemSolvingScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    teamworkScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    adaptabilityScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    detailsData: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '详细评估数据JSON',
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '改进建议',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'career_assessments',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['sessionId'],
      },
    ],
  }
);

// 设置关联关系
InterviewSession.hasMany(InterviewQuestion, { foreignKey: 'sessionId', as: 'questions' });
InterviewQuestion.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });

InterviewSession.hasMany(InterviewAnswer, { foreignKey: 'sessionId', as: 'answers' });
InterviewAnswer.belongsTo(InterviewSession, { foreignKey: 'sessionId', as: 'session' });

InterviewQuestion.hasOne(InterviewAnswer, { foreignKey: 'questionId', as: 'answer' });
InterviewAnswer.belongsTo(InterviewQuestion, { foreignKey: 'questionId', as: 'question' });

export { InterviewSessionAttributes, InterviewQuestionAttributes, InterviewAnswerAttributes, UserResumeAttributes, CareerAssessmentAttributes }; 