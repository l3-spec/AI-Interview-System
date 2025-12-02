import { Interview, Candidate, Job, AbilityAssessment, InterviewQA, InterviewListResponse, InterviewDetailResponse } from '../types/interview';

// 模拟职位数据
const mockJobs: Job[] = [
  {
    id: 'job-1',
    companyId: 'company-1',
    title: '前端开发工程师',
    department: '技术部',
    description: '负责企业前端项目的开发与维护，持续优化用户体验。',
    requirements: ['熟悉React技术栈', '掌握TypeScript', '具备组件化开发经验'],
    responsibilities: ['负责核心功能开发', '参与系统架构设计', '持续优化性能与体验'],
    salary: {
      min: 15000,
      max: 25000,
      currency: 'CNY'
    },
    location: '上海',
    workType: 'fulltime',
    experience: '3-5年',
    education: '本科',
    skills: ['React', 'TypeScript', 'HTML', 'CSS'],
    benefits: ['五险一金', '年度奖金', '带薪年假'],
    status: 'published',
    applicantCount: 25,
    interviewCount: 12,
    hireCount: 2,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T09:30:00Z'
  },
  {
    id: 'job-2',
    companyId: 'company-1',
    title: '后端开发工程师',
    department: '技术部',
    description: '负责后端服务设计与开发，保障系统稳定性。',
    requirements: ['精通Java或Node.js', '熟悉微服务架构', '掌握数据库优化'],
    responsibilities: ['设计后端服务接口', '维护数据库模型', '提升系统性能'],
    salary: {
      min: 16000,
      max: 26000,
      currency: 'CNY'
    },
    location: '上海',
    workType: 'fulltime',
    experience: '3-5年',
    education: '本科',
    skills: ['Node.js', 'Java', 'MySQL', 'Redis'],
    benefits: ['弹性工作', '年度体检', '团队旅游'],
    status: 'published',
    applicantCount: 22,
    interviewCount: 10,
    hireCount: 1,
    createdAt: '2024-01-11T09:20:00Z',
    updatedAt: '2024-01-19T10:40:00Z'
  },
  {
    id: 'job-3',
    companyId: 'company-2',
    title: '全栈开发工程师',
    department: '技术部',
    description: '参与全栈应用开发，负责前后端协同与交付。',
    requirements: ['熟悉前后端技术栈', '具备系统设计能力', '良好的沟通协作能力'],
    responsibilities: ['独立完成功能模块开发', '撰写技术文档', '支持部署上线'],
    salary: {
      min: 17000,
      max: 28000,
      currency: 'CNY'
    },
    location: '北京',
    workType: 'fulltime',
    experience: '4-6年',
    education: '本科',
    skills: ['React', 'Node.js', 'GraphQL', 'Docker'],
    benefits: ['餐补', '住房补贴', '定期培训'],
    status: 'published',
    applicantCount: 30,
    interviewCount: 15,
    hireCount: 3,
    createdAt: '2024-01-12T07:30:00Z',
    updatedAt: '2024-01-21T12:15:00Z'
  },
  {
    id: 'job-4',
    companyId: 'company-3',
    title: '数据分析师',
    department: '产品部',
    description: '负责业务数据分析与可视化，支持业务决策。',
    requirements: ['熟悉数据分析工具', '掌握SQL', '具备业务洞察能力'],
    responsibilities: ['建立数据分析模型', '搭建分析报表', '输出策略建议'],
    salary: {
      min: 14000,
      max: 22000,
      currency: 'CNY'
    },
    location: '深圳',
    workType: 'fulltime',
    experience: '2-4年',
    education: '本科',
    skills: ['Python', 'SQL', 'Tableau', 'Excel'],
    benefits: ['岗位培训', '年度体检', '弹性工作'],
    status: 'published',
    applicantCount: 18,
    interviewCount: 8,
    hireCount: 1,
    createdAt: '2024-01-13T10:15:00Z',
    updatedAt: '2024-01-20T16:05:00Z'
  },
  {
    id: 'job-5',
    companyId: 'company-1',
    title: 'DevOps工程师',
    department: '技术部',
    description: '搭建与维护CI/CD流程，提升研发效能。',
    requirements: ['熟悉Kubernetes', '具备云原生经验', '掌握脚本开发'],
    responsibilities: ['维护基础设施', '保障发布稳定', '优化监控告警'],
    salary: {
      min: 18000,
      max: 28000,
      currency: 'CNY'
    },
    location: '上海',
    workType: 'fulltime',
    experience: '4-6年',
    education: '本科',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform'],
    benefits: ['技术培训', '团队旅游', '股票期权'],
    status: 'published',
    applicantCount: 16,
    interviewCount: 6,
    hireCount: 1,
    createdAt: '2024-01-14T11:00:00Z',
    updatedAt: '2024-01-22T13:45:00Z'
  },
  {
    id: 'job-6',
    companyId: 'company-4',
    title: 'UI/UX设计师',
    department: '设计部',
    description: '负责产品的界面设计与用户体验优化。',
    requirements: ['熟练使用设计工具', '具备用户研究经验', '关注细节'],
    responsibilities: ['设计产品界面', '参与用户研究', '输出设计文档'],
    salary: {
      min: 13000,
      max: 21000,
      currency: 'CNY'
    },
    location: '广州',
    workType: 'fulltime',
    experience: '2-4年',
    education: '本科',
    skills: ['Figma', 'Sketch', 'Illustrator', '用户研究'],
    benefits: ['项目奖金', '弹性工作', '年度体检'],
    status: 'published',
    applicantCount: 20,
    interviewCount: 9,
    hireCount: 2,
    createdAt: '2024-01-15T09:45:00Z',
    updatedAt: '2024-01-23T12:25:00Z'
  },
  {
    id: 'job-7',
    companyId: 'company-5',
    title: '数字营销专员',
    department: '市场部',
    description: '规划并执行数字营销方案，提升品牌影响力。',
    requirements: ['熟悉数字营销渠道', '具备数据分析能力', '良好的内容策划能力'],
    responsibilities: ['制定营销计划', '跟进投放数据', '优化营销策略'],
    salary: {
      min: 10000,
      max: 16000,
      currency: 'CNY'
    },
    location: '上海',
    workType: 'fulltime',
    experience: '2-4年',
    education: '本科',
    skills: ['SEM', 'SEO', '数据分析', '内容营销'],
    benefits: ['团队建设', '绩效奖金', '节日礼品'],
    status: 'published',
    applicantCount: 28,
    interviewCount: 11,
    hireCount: 2,
    createdAt: '2024-01-16T08:50:00Z',
    updatedAt: '2024-01-24T10:10:00Z'
  },
  {
    id: 'job-8',
    companyId: 'company-2',
    title: '产品经理',
    department: '产品部',
    description: '负责产品规划与生命周期管理，协调跨团队合作。',
    requirements: ['具备产品规划经验', '良好的沟通能力', '数据驱动意识'],
    responsibilities: ['制定产品路线图', '撰写PRD', '推动项目落地'],
    salary: {
      min: 16000,
      max: 26000,
      currency: 'CNY'
    },
    location: '北京',
    workType: 'fulltime',
    experience: '3-5年',
    education: '本科',
    skills: ['需求分析', '项目管理', '数据分析', '沟通协调'],
    benefits: ['年度调薪', '股票期权', '健康福利'],
    status: 'published',
    applicantCount: 24,
    interviewCount: 10,
    hireCount: 1,
    createdAt: '2024-01-17T13:40:00Z',
    updatedAt: '2024-01-25T15:35:00Z'
  }
];

const mockJobMap = mockJobs.reduce<Record<string, Job>>((acc, job) => {
  acc[job.id] = job;
  return acc;
}, {});

// 模拟候选人数据
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Henry Zhang',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry',
    email: 'henry.zhang@email.com',
    phone: '138-0000-1234',
    age: 28,
    gender: 'male',
    education: '本科',
    major: '计算机科学与技术',
    experience: 5,
    skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python'],
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Sarah Li',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    email: 'sarah.li@email.com',
    phone: '138-0000-5678',
    age: 26,
    gender: 'female',
    education: '硕士',
    major: '软件工程',
    experience: 3,
    skills: ['Vue.js', 'Java', 'Spring Boot', 'MySQL', 'Redis'],
    createdAt: '2024-01-16T14:30:00Z'
  },
  {
    id: '3',
    name: 'Mike Wang',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    email: 'mike.wang@email.com',
    phone: '138-0000-9012',
    age: 30,
    gender: 'male',
    education: '本科',
    major: '信息管理与信息系统',
    experience: 7,
    skills: ['Angular', 'C#', '.NET Core', 'SQL Server', 'Azure'],
    createdAt: '2024-01-17T09:15:00Z'
  },
  {
    id: '4',
    name: 'Lisa Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    email: 'lisa.chen@email.com',
    phone: '138-0000-3456',
    age: 24,
    gender: 'female',
    education: '本科',
    major: '数据科学',
    experience: 1,
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'Pandas', 'SQL'],
    createdAt: '2024-01-18T16:45:00Z'
  },
  {
    id: '5',
    name: 'David Zhou',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    email: 'david.zhou@email.com',
    phone: '138-0000-7890',
    age: 32,
    gender: 'male',
    education: '硕士',
    major: '计算机应用技术',
    experience: 8,
    skills: ['Go', 'Kubernetes', 'Docker', 'AWS', 'DevOps'],
    createdAt: '2024-01-19T11:20:00Z'
  },
  {
    id: '6',
    name: 'Amy Wu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
    email: 'amy.wu@email.com',
    phone: '138-0000-2468',
    age: 27,
    gender: 'female',
    education: '硕士',
    major: '人机交互设计',
    experience: 4,
    skills: ['UI设计', 'Figma', 'Sketch', '用户研究', 'Prototyping'],
    createdAt: '2024-01-20T13:30:00Z'
  },
  {
    id: '7',
    name: 'Tom Liu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom',
    email: 'tom.liu@email.com',
    phone: '138-0000-1357',
    age: 29,
    gender: 'male',
    education: '本科',
    major: '市场营销',
    experience: 6,
    skills: ['数字营销', 'SEM', 'SEO', '数据分析', '内容策划'],
    createdAt: '2024-01-21T08:45:00Z'
  },
  {
    id: '8',
    name: 'Jenny Yang',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jenny',
    email: 'jenny.yang@email.com',
    phone: '138-0000-9753',
    age: 25,
    gender: 'female',
    education: '本科',
    major: '产品设计',
    experience: 2,
    skills: ['产品设计', 'Axure', '需求分析', '用户体验', 'Agile'],
    createdAt: '2024-01-22T15:20:00Z'
  }
];

// 模拟面试数据
const mockInterviews: Interview[] = [
  {
    id: '1',
    candidateId: '1',
    candidate: mockCandidates[0],
    jobId: 'job-1',
    job: mockJobMap['job-1'],
    jobTitle: '前端开发工程师',
    department: '技术部',
    status: 'completed',
    interviewDate: '2024-01-20T10:00:00Z',
    duration: 45,
    videoUrl: 'https://example.com/video1.mp4',
    score: 8.5,
    result: 'passed',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z'
  },
  {
    id: '2',
    candidateId: '2',
    candidate: mockCandidates[1],
    jobId: 'job-2',
    job: mockJobMap['job-2'],
    jobTitle: '后端开发工程师',
    department: '技术部',
    status: 'completed',
    interviewDate: '2024-01-21T14:00:00Z',
    duration: 50,
    videoUrl: 'https://example.com/video2.mp4',
    score: 7.8,
    result: 'passed',
    createdAt: '2024-01-16T14:30:00Z',
    updatedAt: '2024-01-21T15:00:00Z'
  },
  {
    id: '3',
    candidateId: '3',
    candidate: mockCandidates[2],
    jobId: 'job-3',
    job: mockJobMap['job-3'],
    jobTitle: '全栈开发工程师',
    department: '技术部',
    status: 'completed',
    interviewDate: '2024-01-22T09:00:00Z',
    duration: 60,
    score: 6.5,
    result: 'reviewing',
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-22T10:30:00Z'
  },
  {
    id: '4',
    candidateId: '4',
    candidate: mockCandidates[3],
    jobId: 'job-4',
    job: mockJobMap['job-4'],
    jobTitle: '数据分析师',
    department: '产品部',
    status: 'scheduled',
    interviewDate: '2024-01-25T15:00:00Z',
    duration: 0,
    score: 0,
    result: 'pending',
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-18T16:45:00Z'
  },
  {
    id: '5',
    candidateId: '5',
    candidate: mockCandidates[4],
    jobId: 'job-5',
    job: mockJobMap['job-5'],
    jobTitle: 'DevOps工程师',
    department: '技术部',
    status: 'pending',
    interviewDate: '2024-01-26T11:00:00Z',
    duration: 0,
    score: 0,
    result: 'pending',
    createdAt: '2024-01-19T11:20:00Z',
    updatedAt: '2024-01-19T11:20:00Z'
  },
  {
    id: '6',
    candidateId: '6',
    candidate: mockCandidates[5],
    jobId: 'job-6',
    job: mockJobMap['job-6'],
    jobTitle: 'UI/UX设计师',
    department: '设计部',
    status: 'completed',
    interviewDate: '2024-01-23T16:00:00Z',
    duration: 40,
    videoUrl: 'https://example.com/video6.mp4',
    score: 9.2,
    result: 'passed',
    createdAt: '2024-01-20T13:30:00Z',
    updatedAt: '2024-01-23T17:00:00Z'
  },
  {
    id: '7',
    candidateId: '7',
    candidate: mockCandidates[6],
    jobId: 'job-7',
    job: mockJobMap['job-7'],
    jobTitle: '数字营销专员',
    department: '市场部',
    status: 'completed',
    interviewDate: '2024-01-24T10:30:00Z',
    duration: 35,
    score: 7.2,
    result: 'failed',
    createdAt: '2024-01-21T08:45:00Z',
    updatedAt: '2024-01-24T11:30:00Z'
  },
  {
    id: '8',
    candidateId: '8',
    candidate: mockCandidates[7],
    jobId: 'job-8',
    job: mockJobMap['job-8'],
    jobTitle: '产品经理',
    department: '产品部',
    status: 'scheduled',
    interviewDate: '2024-01-27T14:00:00Z',
    duration: 0,
    score: 0,
    result: 'pending',
    createdAt: '2024-01-22T15:20:00Z',
    updatedAt: '2024-01-22T15:20:00Z'
  }
];

// 模拟能力评估数据
const mockAssessments: Record<string, AbilityAssessment> = {
  '1': {
    id: 'assessment-1',
    interviewId: '1',
    technicalSkills: 9.0,
    communication: 8.5,
    problemSolving: 8.8,
    teamwork: 8.2,
    leadership: 7.5,
    creativity: 8.0,
    adaptability: 8.3,
    overallScore: 8.5,
    feedback: 'Henry在技术能力方面表现出色，特别是在React和TypeScript的使用上非常熟练。沟通能力强，能够清晰表达技术观点。问题解决能力突出，在面试中的算法题目完成得很好。团队协作意识强，有一定的领导潜力。',
    strengths: [
      '技术功底扎实，React技术栈精通',
      '沟通表达能力强，逻辑清晰',
      '学习能力强，对新技术有敏锐的嗅觉',
      '有良好的编程习惯和代码规范意识'
    ],
    improvements: [
      '可以加强对系统架构设计的理解',
      '项目管理经验有待提升',
      '可以多参与开源项目提升影响力'
    ]
  },
  '2': {
    id: 'assessment-2',
    interviewId: '2',
    technicalSkills: 8.2,
    communication: 7.8,
    problemSolving: 8.0,
    teamwork: 8.5,
    leadership: 7.0,
    creativity: 7.5,
    adaptability: 8.0,
    overallScore: 7.8,
    feedback: 'Sarah的Java技术栈很扎实，Spring Boot框架使用熟练。在数据库设计和优化方面有一定经验。团队协作能力强，有良好的沟通技巧。',
    strengths: [
      'Java后端技术扎实',
      '数据库设计和优化经验丰富',
      '团队协作能力强',
      '工作态度认真负责'
    ],
    improvements: [
      '可以学习更多微服务架构知识',
      '前端技术栈可以补强',
      '英语口语能力有待提升'
    ]
  },
  '3': {
    id: 'assessment-3',
    interviewId: '3',
    technicalSkills: 7.0,
    communication: 6.8,
    problemSolving: 6.5,
    teamwork: 7.2,
    leadership: 6.0,
    creativity: 6.8,
    adaptability: 6.5,
    overallScore: 6.5,
    feedback: 'Mike有丰富的工作经验，对.NET技术栈比较熟悉。但在面试中表现不够突出，一些技术细节回答不够深入。',
    strengths: [
      '工作经验丰富',
      '.NET技术栈熟练',
      '项目经验多样化'
    ],
    improvements: [
      '需要加强对新技术的学习',
      '沟通表达能力有待提升',
      '代码质量意识需要加强'
    ]
  },
  '6': {
    id: 'assessment-6',
    interviewId: '6',
    technicalSkills: 8.8,
    communication: 9.0,
    problemSolving: 9.2,
    teamwork: 9.5,
    leadership: 8.5,
    creativity: 9.8,
    adaptability: 9.0,
    overallScore: 9.2,
    feedback: 'Amy在设计能力方面表现非常优秀，对用户体验有深刻理解。创意思维突出，能够提出创新的设计解决方案。沟通能力强，能够很好地阐述设计理念。',
    strengths: [
      '设计能力出众，作品质量高',
      '用户体验理解深刻',
      '创意思维活跃，解决方案创新',
      '跨团队协作能力强'
    ],
    improvements: [
      '可以加强前端开发技能',
      '数据分析能力有待提升',
      '项目管理经验需要积累'
    ]
  },
  '7': {
    id: 'assessment-7',
    interviewId: '7',
    technicalSkills: 6.5,
    communication: 7.8,
    problemSolving: 6.8,
    teamwork: 7.5,
    leadership: 7.2,
    creativity: 7.8,
    adaptability: 7.0,
    overallScore: 7.2,
    feedback: 'Tom在市场营销方面有一定经验，但在数字化营销和数据分析方面还需要加强。沟通能力不错，有一定的团队管理经验。',
    strengths: [
      '营销推广经验丰富',
      '客户沟通能力强',
      '市场敏感度高'
    ],
    improvements: [
      '数字化营销技能需要提升',
      '数据分析能力有待加强',
      '创新营销策略思考不够'
    ]
  }
};

// 模拟问答数据
const mockQAList: Record<string, InterviewQA[]> = {
  '1': [
    {
      id: 'qa-1-1',
      interviewId: '1',
      question: '请介绍一下React的生命周期方法，以及在函数组件中如何实现类似的功能？',
      answer: 'React类组件有三个主要阶段的生命周期：挂载、更新和卸载。主要方法包括componentDidMount、componentDidUpdate、componentWillUnmount等。在函数组件中，我们使用useEffect Hook来模拟这些生命周期。useEffect可以通过不同的依赖数组来控制执行时机...',
      score: 9,
      feedback: '回答非常完整，对React生命周期理解深刻，并且能够很好地对比类组件和函数组件的区别。',
      duration: 180,
      category: 'technical'
    },
    {
      id: 'qa-1-2',
      interviewId: '1',
      question: '如何处理一个性能瓶颈问题？请描述你的分析和解决过程。',
      answer: '首先我会使用开发者工具进行性能分析，识别瓶颈所在。然后根据具体情况采用不同的优化策略，比如代码分割、懒加载、缓存优化、图片压缩等。对于React应用，还会考虑使用React.memo、useMemo、useCallback等优化手段...',
      score: 8,
      feedback: '分析思路清晰，提到了多种优化方法，实际经验丰富。',
      duration: 240,
      category: 'technical'
    },
    {
      id: 'qa-1-3',
      interviewId: '1',
      question: '描述一次你遇到的最具挑战性的项目经历。',
      answer: '在上一个项目中，我们需要在紧急情况下重构整个前端架构。当时系统性能问题严重，用户体验很差。我主导了技术选型，选择了React+TypeScript的技术栈，并设计了组件库和状态管理方案。通过团队协作，我们在一个月内完成了重构...',
      score: 8,
      feedback: '项目经验丰富，能够在压力下保持冷静并找到解决方案。领导能力有所体现。',
      duration: 300,
      category: 'behavioral'
    }
  ],
  '2': [
    {
      id: 'qa-2-1',
      interviewId: '2',
      question: '请解释一下Spring Boot的自动配置原理。',
      answer: 'Spring Boot的自动配置基于@EnableAutoConfiguration注解和spring.factories文件。当应用启动时，Spring Boot会扫描classpath下的所有spring.factories文件，加载其中定义的自动配置类。这些配置类通过@ConditionalOn*注解来判断是否需要生效...',
      score: 8,
      feedback: '对Spring Boot自动配置原理理解正确，能够说出关键组件和流程。',
      duration: 200,
      category: 'technical'
    },
    {
      id: 'qa-2-2',
      interviewId: '2',
      question: '如何设计一个高并发的数据库架构？',
      answer: '高并发数据库架构需要考虑多个方面：首先是读写分离，通过主从复制来分担读压力；其次是分库分表，水平拆分数据；还要考虑缓存策略，使用Redis等缓存热点数据；连接池优化也很重要...',
      score: 7,
      feedback: '对高并发架构有基本理解，但在具体实现细节上还可以更深入。',
      duration: 220,
      category: 'technical'
    }
  ]
};

// 模拟API
export const mockInterviewApi = {
  getList: async (params?: any): Promise<InterviewListResponse> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let filteredData = [...mockInterviews];
    
    // 应用筛选条件
    if (params?.filters) {
      const { status, result, department, keyword, scoreRange } = params.filters;
      
      if (status?.length) {
        filteredData = filteredData.filter(item => status.includes(item.status));
      }
      
      if (result?.length) {
        filteredData = filteredData.filter(item => result.includes(item.result));
      }
      
      if (department?.length) {
        filteredData = filteredData.filter(item => department.includes(item.department));
      }
      
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.candidate.name.toLowerCase().includes(lowerKeyword) ||
          item.candidate.email.toLowerCase().includes(lowerKeyword) ||
          item.candidate.skills.some(skill => skill.toLowerCase().includes(lowerKeyword)) ||
          item.jobTitle.toLowerCase().includes(lowerKeyword)
        );
      }
      
      if (scoreRange && (scoreRange[0] > 0 || scoreRange[1] < 10)) {
        filteredData = filteredData.filter(item => 
          item.score >= scoreRange[0] && item.score <= scoreRange[1]
        );
      }
    }
    
    // 分页
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 12;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total: filteredData.length,
      page,
      pageSize
    };
  },

  getDetail: async (id: string): Promise<InterviewDetailResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const interview = mockInterviews.find(item => item.id === id);
    if (!interview) {
      throw new Error('Interview not found');
    }
    
    const assessment = mockAssessments[id] || {
      id: `assessment-${id}`,
      interviewId: id,
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
    
    const qaList = mockQAList[id] || [];
    
    return {
      interview,
      assessment,
      qaList
    };
  }
};

// 导出模拟数据
export { mockCandidates, mockJobs, mockInterviews, mockAssessments, mockQAList };
