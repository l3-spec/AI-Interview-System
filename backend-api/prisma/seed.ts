import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type CompanySeed = {
  email: string;
  password: string;
  name: string;
  description?: string;
  industry?: string;
  scale?: string;
  address?: string;
  website?: string;
  logo?: string;
  contact?: string;
  tagline?: string;
  focusArea?: string;
  themeColors?: string[];
  stats?: { label: string; value: string; accent?: string }[];
  highlights?: string[];
  culture?: string[];
  locations?: string[];
};

type JobSeed = {
  id: string;
  companyEmail: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: 'CNY' | 'USD';
  location: string;
  experience?: string;
  education?: string;
  skills?: string[];
  benefits?: string[];
  type?: 'FULL_TIME' | 'PART_TIME' | 'INTERN';
  status?: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  isPublished?: boolean;
  category?: string;
  level?: string;
  highlights?: string[];
  badgeColor?: string;
  dictionaryPositionCode?: string;
};

type JobDictionarySeed = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  positions: Array<{
    code: string;
    name: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    tags?: string[];
  }>;
};

const companies: CompanySeed[] = [
  // 与 admin-dashboard 登录页「测试账号」一致，便于本地演示
  {
    email: 'admin@test.com',
    password: '123456',
    name: 'U-Talent 演示企业',
    description: '用于企业管理后台本地演示与联调的测试企业。',
    industry: '互联网/企业服务',
    scale: '50-150人',
    address: '上海市徐汇区',
    website: 'https://u-talent.example.com',
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop&q=80',
    contact: '400-000-0000',
    tagline: '智能招聘 · 精准匹配',
    focusArea: 'AI 面试与人才评估',
    themeColors: ['#667eea', '#764ba2'],
    stats: [
      { label: '在招职位', value: '12', accent: '#667eea' },
      { label: '本月面试', value: '186', accent: '#764ba2' },
      { label: '候选人库', value: '2.4k', accent: '#F97316' },
    ],
    highlights: ['AI 数字人面试', '全流程招聘管理', '数据驱动决策'],
    culture: ['扁平协作', '结果导向', '持续学习'],
    locations: ['上海'],
  },
  {
    email: 'company@aiinterview.com',
    password: 'company123456',
    name: '柚汀教育科技',
    description: '专注于智能面试与招聘解决方案的高成长科技公司，致力于帮助企业更高效地发现人才。',
    industry: '互联网/AI',
    scale: '200-500人',
    address: '北京市海淀区中关村科技园',
    website: 'https://www.futurelink.ai',
    logo: '/static/images/company/futurelink-logo.svg',
    contact: '010-88886666',
    tagline: 'AI驱动的智能招聘引擎',
    focusArea: '企业级招聘智能化解决方案',
    themeColors: ['#4F46E5', '#6366F1'],
    stats: [
      { label: '企业客户', value: '180+' },
      { label: '面试场次', value: '12,000+' },
      { label: '平均缩短招聘周期', value: '45%', accent: '#F97316' }
    ],
    highlights: ['自研AI数字人面试官', '全链路招聘管理平台', '行业领先的语音情绪分析'],
    culture: ['以客户价值为中心', '数据驱动持续优化', '鼓励创新与协作'],
    locations: ['北京总部', '上海交付中心']
  },
  {
    email: 'talent@brightai.com',
    password: 'brightai123456',
    name: '灵眸智能科技',
    description: '国内领先的AI企业服务提供商，在智能客服、智能面试和人才培养领域深耕多年。',
    industry: '人工智能',
    scale: '500-1000人',
    address: '上海市浦东新区张江高科园区',
    website: 'https://www.brightai.com',
    logo: '/static/images/company/brightai-logo.svg',
    contact: '021-66889900',
    tagline: '智能连接企业与候选人',
    focusArea: '智能面试与企业人才运营平台',
    themeColors: ['#0EA5E9', '#38BDF8'],
    stats: [
      { label: '服务行业', value: '30+' },
      { label: 'SaaS客户续约率', value: '96%' },
      { label: '面试准确率', value: '93%', accent: '#0EA5E9' }
    ],
    highlights: ['全渠道人才触达', 'AI驱动招聘流程自动化', '丰富的评测模型库'],
    culture: ['开放透明', '快速执行', '拥抱变化'],
    locations: ['上海总部', '深圳研发中心']
  },
  {
    email: 'hr@nova-robotics.com',
    password: 'novarobotics123',
    name: '星航机器人',
    description: '聚焦先进制造与智能机器人研发的独角兽企业，正在构建下一代人机协作平台。',
    industry: '智能制造',
    scale: '1000人以上',
    address: '深圳市南山区科技南十二路',
    website: 'https://www.novarobotics.cn',
    logo: '/static/images/company/novarobotics-logo.svg',
    contact: '0755-88992233',
    tagline: '打造未来工厂的数字底座',
    focusArea: '工业机器人与智能制造解决方案',
    themeColors: ['#10B981', '#34D399'],
    stats: [
      { label: '智能产线部署', value: '80+' },
      { label: '专利数量', value: '320+' },
      { label: '年度营收增长', value: '120%', accent: '#059669' }
    ],
    highlights: ['端到端工业数字化方案', '领先的机器人控制系统', '多行业落地案例'],
    culture: ['工程师文化', '持续创新', '长期主义'],
    locations: ['深圳总部', '苏州制造中心', '成都算法研究院']
  }
];

const jobs: JobSeed[] = [
  {
    id: 'job-senior-fe',
    companyEmail: 'company@aiinterview.com',
    title: '资深前端开发工程师',
    description: '负责U-Talent前端应用的规划、开发与性能优化，打造极致的候选人面试体验。',
    responsibilities: [
      '主导前端架构设计与关键功能开发，提升系统稳定性与扩展性',
      '与产品、设计协同，迭代核心业务流程与互动体验',
      '建设组件库与工程化体系，推动团队开发效率提升',
      '关注性能优化及前端监控体系建设'
    ],
    requirements: [
      '5年以上前端开发经验，熟悉React/TypeScript技术栈',
      '具备大型复杂前端项目架构经验，对微前端、可观测性有实践',
      '熟悉Web性能优化方法，对前端工程化工具链有深入理解',
      '具备良好的沟通协作能力和跨团队推动能力'
    ],
    salaryMin: 35,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '北京 · 海淀',
    experience: '5-8年',
    education: '本科及以上',
    skills: ['React', 'TypeScript', 'Node.js', '微前端', '性能优化'],
    benefits: ['六险二金', '年度体检', '弹性工作制', '无限零食与下午茶'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '产品技术中心',
    level: 'SENIOR',
    highlights: ['技术氛围浓厚', 'AI产品快速迭代', '发展空间大'],
    badgeColor: '#6366F1',
    dictionaryPositionCode: 'FRONTEND_ENGINEER'
  },
  {
    id: 'job-backend-lead',
    companyEmail: 'company@aiinterview.com',
    title: '后端技术负责人',
    description: '负责U-Talent平台的后端架构与服务治理，支撑业务持续快速增长。',
    responsibilities: [
      '负责核心服务的架构设计与演进，保障系统高可用与高性能',
      '建设服务治理体系，搭建监控告警、自动化测试与部署流程',
      '带领团队完成关键项目落地，培养后端工程师成长',
      '与AI算法团队协同，设计高并发音视频处理方案'
    ],
    requirements: [
      '7年以上后端研发经验，熟悉Node.js或Java微服务架构',
      '具备海量数据或高并发系统设计经验',
      '熟悉云原生技术栈，了解容器编排、服务网格等技术',
      '有团队管理或技术带队经验，具备Owner意识'
    ],
    salaryMin: 40,
    salaryMax: 55,
    salaryCurrency: 'CNY',
    location: '北京 · 远程灵活',
    experience: '7年以上',
    education: '本科及以上',
    skills: ['Node.js', '微服务架构', 'MySQL', 'Redis', 'Kubernetes'],
    benefits: ['股票期权', '年度旅游', '技术培训基金', '健康保险'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '产品技术中心',
    level: 'LEAD',
    highlights: ['技术决策权', '核心业务线', '弹性办公'],
    badgeColor: '#F97316',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  {
    id: 'job-ai-product',
    companyEmail: 'talent@brightai.com',
    title: 'AI产品经理',
    description: '主导AI招聘产品的规划与落地，构建面向企业客户的智能人才管理解决方案。',
    responsibilities: [
      '洞察客户需求与行业趋势，制定产品路线图与迭代计划',
      '与算法、研发、运营协同，推动AI功能落地与体验优化',
      '设计核心流程与交互原型，输出高质量PRD与原型',
      '追踪数据指标与用户反馈，指导产品策略持续优化'
    ],
    requirements: [
      '5年以上ToB产品经验，对招聘或人力资源领域有深入理解',
      '具备AI或数据类产品规划与落地经验',
      '逻辑清晰、善于沟通协调，能推动跨团队协作',
      '具备数据驱动思维，能独立完成业务分析与策略制定'
    ],
    salaryMin: 30,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '上海 · 张江',
    experience: '5-8年',
    education: '本科及以上',
    skills: ['产品规划', '数据分析', 'AI应用', '项目管理'],
    benefits: ['年度奖金', '下午茶补贴', '人才公寓', '成长导师制'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '智慧招聘事业部',
    level: 'SENIOR',
    highlights: ['面向头部企业客户', '高成长业务', '跨部门协作紧密'],
    badgeColor: '#0EA5E9',
    dictionaryPositionCode: 'PRODUCT_MANAGER'
  },
  {
    id: 'job-data-analyst',
    companyEmail: 'talent@brightai.com',
    title: '高级数据分析师',
    description: '深入挖掘海量招聘与面试数据，输出数据洞察与策略建议，驱动产品与业务增长。',
    responsibilities: [
      '构建招聘漏斗与用户行为分析模型，监控核心业务指标',
      '设计并实现AB实验，评估功能与策略效果',
      '与产品、运营、销售密切协作，提供数据支持',
      '沉淀数据体系与分析方法论，建设数据资产'
    ],
    requirements: [
      '精通SQL/Python及常用数据分析工具',
      '具备扎实的统计学基础与商业敏感度',
      '3年以上互联网或SaaS数据分析经验',
      '善于将复杂数据洞察转化为清晰的业务建议'
    ],
    salaryMin: 28,
    salaryMax: 38,
    salaryCurrency: 'CNY',
    location: '上海 · 浦东',
    experience: '3-5年',
    education: '本科及以上',
    skills: ['SQL', 'Python', 'Tableau', '统计分析'],
    benefits: ['年度体检', '专业培训基金', '弹性工作', '团建活动'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '数据与智能中心',
    level: 'MIDDLE',
    highlights: ['数据驱动文化', '紧贴业务决策', '成长体系完善'],
    badgeColor: '#38BDF8',
    dictionaryPositionCode: 'DATA_ANALYST'
  },
  {
    id: 'job-robotics-architect',
    companyEmail: 'hr@nova-robotics.com',
    title: '机器人系统架构师',
    description: '负责机器人操作系统与控制平台的总体架构设计，打造高可靠的智能制造底座。',
    responsibilities: [
      '负责机器人控制系统架构设计与核心模块实现',
      '主导系统性能优化与稳定性建设，支撑大规模部署',
      '指导团队完成关键技术课题攻关，沉淀技术方案',
      '与产品、实施团队协作，确保项目按期高质量交付'
    ],
    requirements: [
      '8年以上机器人或工业控制系统研发经验',
      '精通C++/Python，熟悉ROS、实时操作系统与运动控制',
      '有复杂系统架构设计经验，能平衡性能与可维护性',
      '具备跨团队沟通协调与项目推动能力'
    ],
    salaryMin: 45,
    salaryMax: 60,
    salaryCurrency: 'CNY',
    location: '深圳 · 南山',
    experience: '8年以上',
    education: '硕士及以上',
    skills: ['C++', 'ROS', '运动控制', '系统架构'],
    benefits: ['人才安居计划', '科研激励奖金', '补充医疗保险', '企业年金'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '智能制造事业群',
    level: 'LEAD',
    highlights: ['重量级技术项目', '多学科协作', '行业标杆客户'],
    badgeColor: '#10B981',
    dictionaryPositionCode: 'HARDWARE_ENGINEER'
  },
  {
    id: 'job-ops-manager',
    companyEmail: 'hr@nova-robotics.com',
    title: '智能制造项目运营经理',
    description: '统筹智能制造项目交付运营，确保项目闭环与客户成功，打造标杆项目经验。',
    responsibilities: [
      '负责项目运营策略制定，确保交付进度与质量达成',
      '建设客户成功体系，沉淀实施经验与最佳实践',
      '分析项目数据与成本结构，持续优化运营效率',
      '协调研发、供应链、售后等团队，推动问题闭环'
    ],
    requirements: [
      '5年以上项目运营或交付管理经验，了解智能制造行业',
      '具备跨团队沟通协调与风险控制能力',
      '数据驱动思维，能通过指标体系指导运营优化',
      '具备客户导向意识和强执行力'
    ],
    salaryMin: 32,
    salaryMax: 42,
    salaryCurrency: 'CNY',
    location: '深圳 · 南山',
    experience: '5-8年',
    education: '本科及以上',
    skills: ['项目管理', '数据分析', '客户成功', '跨部门协作'],
    benefits: ['专项奖金', '交通补贴', '年度旅游', '带薪病假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '智能制造事业群',
    level: 'SENIOR',
    highlights: ['核心交付团队', '客户面对面', '晋升空间大'],
    badgeColor: '#14B8A6',
    dictionaryPositionCode: 'OPERATIONS_MANAGER'
  }
];

const jobDictionarySeed: JobDictionarySeed[] = [
  {
    code: 'INTERNET_AI',
    name: '互联网/AI',
    sortOrder: 10,
    positions: [
      { code: 'FRONTEND_ENGINEER', name: '前端工程师', tags: ['前端开发', 'web前端', 'web开发'] },
      { code: 'BACKEND_ENGINEER', name: '后端工程师', tags: ['服务端开发', '后端开发', 'Java工程师', 'Go工程师'] },
      { code: 'FULLSTACK_ENGINEER', name: '全栈工程师', tags: ['Full Stack', '全栈开发'] },
      { code: 'AI_ENGINEER', name: 'AI工程师', tags: ['人工智能工程师', '人工智能', '机器学习工程师'] },
      { code: 'DATA_ENGINEER', name: '数据工程师', tags: ['大数据工程师', '数据平台'] },
      { code: 'DATA_ANALYST', name: '数据分析师', tags: ['商业分析', '数据分析', 'BI'] },
      { code: 'ALGORITHM_ENGINEER', name: '算法工程师', tags: ['CV算法', 'NLP算法', '推荐算法'] },
      { code: 'TEST_ENGINEER', name: '测试工程师', tags: ['QA', '测试开发', '软件测试'] },
    ],
  },
  {
    code: 'PRODUCT',
    name: '产品',
    sortOrder: 20,
    positions: [
      { code: 'PRODUCT_MANAGER', name: '产品经理', tags: ['PM', '产品策划', '产品负责人'] },
      { code: 'SENIOR_PRODUCT_MANAGER', name: '高级产品经理', tags: ['资深产品经理', '产品专家'] },
      { code: 'PRODUCT_OPERATION', name: '产品运营', tags: ['运营产品', '产品策略'] },
      { code: 'USER_RESEARCHER', name: '用户研究员', tags: ['用户体验研究', 'UXR'] },
      { code: 'PRODUCT_DESIGNER', name: '产品设计师', tags: ['PRD', '产品设计'] },
    ],
  },
  {
    code: 'OPERATIONS_CUSTOMER_SERVICE',
    name: '运营/客服',
    sortOrder: 30,
    positions: [
      { code: 'OPERATIONS_MANAGER', name: '运营经理', tags: ['业务运营', '运营负责人'] },
      { code: 'CONTENT_OPERATION', name: '内容运营', tags: ['内容编辑', '内容策划'] },
      { code: 'USER_OPERATION', name: '用户运营', tags: ['社区运营', '用户增长'] },
      { code: 'EVENT_OPERATION', name: '活动运营', tags: ['活动策划', '线上活动'] },
      { code: 'CUSTOMER_SERVICE_REP', name: '客服专员', tags: ['在线客服', '客服代表'] },
    ],
  },
  {
    code: 'DESIGN',
    name: '设计',
    sortOrder: 40,
    positions: [
      { code: 'UI_DESIGNER', name: 'UI设计师', tags: ['界面设计', '视觉设计'] },
      { code: 'UX_DESIGNER', name: 'UX设计师', tags: ['用户体验设计', '交互设计'] },
      { code: 'VISUAL_DESIGNER', name: '视觉设计师', tags: ['平面设计', '视觉创意'] },
      { code: 'MOTION_DESIGNER', name: '动效设计师', tags: ['动画设计', '交互动效'] },
      { code: 'GRAPHIC_DESIGNER', name: '平面设计师', tags: ['品牌设计', '海报设计'] },
    ],
  },
  {
    code: 'HR_ADMIN_LEGAL',
    name: '人力/行政/法务',
    sortOrder: 50,
    positions: [
      { code: 'HR_GENERALIST', name: '人力资源专员', tags: ['HR', '人力专员'] },
      { code: 'RECRUITER', name: '招聘专员', tags: ['招聘', '校园招聘'] },
      { code: 'HRBP', name: 'HRBP', tags: ['人力业务伙伴', '业务人力'] },
      { code: 'COMPENSATION_BENEFITS', name: '薪酬福利', tags: ['薪酬专员', '福利专员'] },
      { code: 'ADMIN_MANAGER', name: '行政主管', tags: ['行政管理', '行政经理'] },
      { code: 'LEGAL_SPECIALIST', name: '法务专员', tags: ['法律顾问', '法务'] },
    ],
  },
  {
    code: 'FINANCE_AUDIT_TAX',
    name: '财务/审计/税务',
    sortOrder: 60,
    positions: [
      { code: 'ACCOUNTANT', name: '会计', tags: ['财务会计', '总账会计'] },
      { code: 'FINANCIAL_ANALYST', name: '财务分析', tags: ['财务分析师', '经营分析'] },
      { code: 'AUDITOR', name: '审计专员', tags: ['内部审计', '审计师'] },
      { code: 'TAX_SPECIALIST', name: '税务专员', tags: ['税务管理', '纳税筹划'] },
      { code: 'CASHIER', name: '出纳', tags: ['财务出纳'] },
    ],
  },
  {
    code: 'SALES',
    name: '销售',
    sortOrder: 70,
    positions: [
      { code: 'SALES_REP', name: '销售专员', tags: ['销售代表', '销售顾问'] },
      { code: 'KEY_ACCOUNT_MANAGER', name: '大客户经理', tags: ['KA销售', '大客户'] },
      { code: 'CHANNEL_SALES', name: '渠道销售', tags: ['渠道经理', '渠道拓展'] },
      { code: 'SALES_DIRECTOR', name: '销售总监', tags: ['销售负责人', '销售管理'] },
      { code: 'BD_MANAGER', name: '商务拓展经理', tags: ['BD', '业务拓展'] },
      { code: 'SALES_OPERATIONS', name: '销售运营', tags: ['销售支持', '销售分析'] },
    ],
  },
  {
    code: 'HARDWARE_COMMUNICATION',
    name: '电子/电气/通信',
    sortOrder: 80,
    positions: [
      { code: 'HARDWARE_ENGINEER', name: '硬件工程师', tags: ['硬件开发', '电子工程师'] },
      { code: 'EMBEDDED_ENGINEER', name: '嵌入式工程师', tags: ['嵌入式开发', '单片机'] },
      { code: 'COMMUNICATION_ENGINEER', name: '通信工程师', tags: ['通信设备', '通信技术'] },
      { code: 'TEST_ENGINEER_HW', name: '测试工程师（硬件）', tags: ['硬件测试', '可靠性测试'] },
      { code: 'ELECTRICAL_ENGINEER', name: '电气工程师', tags: ['自动化控制', '电控'] },
    ],
  },
  {
    code: 'MANUFACTURING',
    name: '生产制造',
    sortOrder: 90,
    positions: [
      { code: 'PRODUCTION_MANAGER', name: '生产管理', tags: ['生产主管', '生产计划'] },
      { code: 'QUALITY_MANAGER', name: '质量管理', tags: ['质检经理', 'QA'] },
      { code: 'PROCESS_ENGINEER', name: '工艺工程师', tags: ['工艺设计', '制程工程师'] },
      { code: 'EQUIPMENT_ENGINEER', name: '设备工程师', tags: ['设备维护', '设备管理'] },
      { code: 'SAFETY_ENGINEER', name: '安全工程师', tags: ['安全管理', 'EHS'] },
    ],
  },
  {
    code: 'EDUCATION_TRAINING',
    name: '教育培训',
    sortOrder: 100,
    positions: [
      { code: 'EDU_CONSULTANT', name: '教育顾问', tags: ['课程顾问', '学习顾问'] },
      { code: 'TRAINER', name: '培训讲师', tags: ['培训师', '授课老师'] },
      { code: 'CURRICULUM_DESIGNER', name: '课程研发', tags: ['课程设计', '教学设计'] },
      { code: 'ONLINE_TUTOR', name: '在线辅导老师', tags: ['网课老师', '线上教学'] },
      { code: 'TEACHING_ASSISTANT', name: '教务老师', tags: ['教学管理', '教务管理'] },
    ],
  },
  {
    code: 'CONSULTING_TRANSLATION',
    name: '咨询/翻译/法律',
    sortOrder: 110,
    positions: [
      { code: 'MANAGEMENT_CONSULTANT', name: '管理咨询顾问', tags: ['咨询顾问', '战略咨询'] },
      { code: 'HR_CONSULTANT', name: '人力咨询顾问', tags: ['招聘顾问', 'HR咨询'] },
      { code: 'LEGAL_COUNSEL', name: '律师/法律顾问', tags: ['律师', '企业法务'] },
      { code: 'TRANSLATOR', name: '翻译', tags: ['口译', '笔译'] },
      { code: 'PATENT_AGENT', name: '专利代理人', tags: ['知识产权', '专利工程师'] },
    ],
  },
];

const sanitizeTags = (tags?: string[]) => {
  if (!tags || tags.length === 0) {
    return [] as string[];
  }
  const unique: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.length > 0 && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }
  return unique;
};

async function seedJobDictionary() {
  for (const category of jobDictionarySeed) {
    const categoryRecord = await prisma.jobDictionaryCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description ?? null,
        sortOrder: category.sortOrder ?? 0,
        isActive: category.isActive ?? true,
      },
      create: {
        code: category.code,
        name: category.name,
        description: category.description ?? null,
        sortOrder: category.sortOrder ?? 0,
        isActive: category.isActive ?? true,
      },
    });

    for (const position of category.positions) {
      const tags = sanitizeTags(position.tags);
      await prisma.jobDictionaryPosition.upsert({
        where: { code: position.code },
        update: {
          name: position.name,
          description: position.description ?? null,
          sortOrder: position.sortOrder ?? 0,
          isActive: position.isActive ?? true,
          categoryId: categoryRecord.id,
          tags,
        },
        create: {
          categoryId: categoryRecord.id,
          code: position.code,
          name: position.name,
          description: position.description ?? null,
          sortOrder: position.sortOrder ?? 0,
          isActive: position.isActive ?? true,
          tags,
        },
      });
    }
  }
}

function formatSalary(min: number, max: number, currency: 'CNY' | 'USD') {
  const format = (value: number) => (value > 0 ? `${value}K` : '');
  const minStr = format(min);
  const maxStr = format(max);
  const range = [minStr, maxStr].filter(Boolean).join('-');
  return [range, currency].filter(Boolean).join(' ');
}

function joinArray(arr?: string[]) {
  return arr && arr.length > 0 ? arr.join('\n') : null;
}

function stringifyArray(arr?: string[]) {
  return arr && arr.length > 0 ? JSON.stringify(arr) : null;
}

async function seedCompanies() {
  const companyMap: Record<string, string> = {};

  for (const company of companies) {
    const passwordHash = await bcrypt.hash(company.password, 12);

    const result = await prisma.company.upsert({
      where: { email: company.email },
      update: {
        name: company.name,
        description: company.description,
        industry: company.industry,
        scale: company.scale,
        address: company.address,
        website: company.website,
        logo: company.logo,
        contact: company.contact,
        tagline: company.tagline,
        focusArea: company.focusArea,
        themeColors: stringifyArray(company.themeColors),
        stats: company.stats ? JSON.stringify(company.stats) : null,
        highlights: stringifyArray(company.highlights),
        culture: stringifyArray(company.culture),
        locations: stringifyArray(company.locations),
        isActive: true,
        isVerified: true,
      },
      create: {
        email: company.email,
        password: passwordHash,
        name: company.name,
        description: company.description,
        industry: company.industry,
        scale: company.scale,
        address: company.address,
        website: company.website,
        logo: company.logo,
        contact: company.contact,
        tagline: company.tagline,
        focusArea: company.focusArea,
        themeColors: stringifyArray(company.themeColors),
        stats: company.stats ? JSON.stringify(company.stats) : null,
        highlights: stringifyArray(company.highlights),
        culture: stringifyArray(company.culture),
        locations: stringifyArray(company.locations),
        isActive: true,
        isVerified: true,
      },
    });

    companyMap[company.email] = result.id;
  }

  return companyMap;
}

async function seedJobs(companyMap: Record<string, string>) {
  const positionRecords = await prisma.jobDictionaryPosition.findMany({
    select: { id: true, code: true },
  });
  const positionMap = new Map(positionRecords.map((position) => [position.code, position.id]));

  for (const job of jobs) {
    const companyId = companyMap[job.companyEmail];

    if (!companyId) {
      console.warn(`跳过职位 ${job.id}，未找到对应企业 ${job.companyEmail}`);
      continue;
    }

    let dictionaryPositionId: string | null | undefined = undefined;
    if (typeof job.dictionaryPositionCode === 'string') {
      const match = positionMap.get(job.dictionaryPositionCode);
      if (match) {
        dictionaryPositionId = match;
      } else {
        console.warn(
          `职位 ${job.id} 指定的字典岗位 ${job.dictionaryPositionCode} 不存在，将清空其字典映射`
        );
        dictionaryPositionId = null;
      }
    }

    await prisma.job.upsert({
      where: { id: job.id },
      update: {
        title: job.title,
        description: job.description,
        responsibilities: joinArray(job.responsibilities),
        requirements: joinArray(job.requirements) || '',
        salary: formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency),
        location: job.location,
        experience: job.experience,
        education: job.education,
        category: job.category,
        level: job.level,
        skills: stringifyArray(job.skills),
        benefits: joinArray(job.benefits),
        type: job.type || 'FULL_TIME',
        status: job.status || 'ACTIVE',
        isPublished: job.isPublished ?? true,
        isRemote: job.location.includes('远程'),
        badgeColor: job.badgeColor,
        highlights: stringifyArray(job.highlights),
        ...(dictionaryPositionId !== undefined ? { dictionaryPositionId } : {}),
      },
      create: {
        id: job.id,
        title: job.title,
        description: job.description,
        responsibilities: joinArray(job.responsibilities),
        requirements: joinArray(job.requirements) || '',
        salary: formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency),
        location: job.location,
        experience: job.experience,
        education: job.education,
        category: job.category,
        level: job.level,
        skills: stringifyArray(job.skills),
        benefits: joinArray(job.benefits),
        type: job.type || 'FULL_TIME',
        status: job.status || 'ACTIVE',
        isPublished: job.isPublished ?? true,
        isRemote: job.location.includes('远程'),
        badgeColor: job.badgeColor,
        highlights: stringifyArray(job.highlights),
        companyId,
        ...(dictionaryPositionId !== undefined ? { dictionaryPositionId } : {}),
      },
    });
  }
}

async function seedJobSections() {
  const sections = [
    {
      id: 'section-tech-experts',
      title: '核心技术岗位',
      subtitle: '技术驱动未来招聘，面向资深技术人才的开放岗位',
      sortOrder: 1,
      jobIds: ['job-senior-fe', 'job-backend-lead', 'job-robotics-architect'],
    },
    {
      id: 'section-product-data',
      title: '产品与数据精选',
      subtitle: '连接业务与用户，释放数据价值的关键岗位',
      sortOrder: 2,
      jobIds: ['job-ai-product', 'job-data-analyst', 'job-ops-manager'],
    },
  ];

  for (const section of sections) {
    await prisma.jobSection.upsert({
      where: { id: section.id },
      update: {
        title: section.title,
        subtitle: section.subtitle,
        sortOrder: section.sortOrder,
        isActive: true,
      },
      create: {
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        sortOrder: section.sortOrder,
        isActive: true,
      },
    });

    for (const [index, jobId] of section.jobIds.entries()) {
      await prisma.jobSectionItem.upsert({
        where: {
          sectionId_jobId: {
            sectionId: section.id,
            jobId,
          },
        },
        update: {
          sortOrder: index + 1,
        },
        create: {
          sectionId: section.id,
          jobId,
          sortOrder: index + 1,
        },
      });
    }
  }
}

async function seedCompanyShowcases(companyMap: Record<string, string>) {
  const showcases = [
    {
      companyEmail: 'company@aiinterview.com',
      role: 'AI招聘平台',
      hiringCount: 6,
      sortOrder: 1,
    },
    {
      companyEmail: 'talent@brightai.com',
      role: '智能人力运营',
      hiringCount: 4,
      sortOrder: 2,
    },
    {
      companyEmail: 'hr@nova-robotics.com',
      role: '智能制造先锋',
      hiringCount: 5,
      sortOrder: 3,
    },
  ];

  for (const showcase of showcases) {
    const companyId = companyMap[showcase.companyEmail];
    if (!companyId) {
      continue;
    }

    await prisma.companyShowcase.upsert({
      where: { companyId },
      update: {
        role: showcase.role,
        hiringCount: showcase.hiringCount,
        sortOrder: showcase.sortOrder,
      },
      create: {
        companyId,
        role: showcase.role,
        hiringCount: showcase.hiringCount,
        sortOrder: showcase.sortOrder,
      },
    });
  }
}

async function seedHomeBanners() {
  const bannerSeeds = [
    {
      id: 'banner-ai-interview-suite',
      title: 'AI 智能面试管家',
      subtitle: '7 天构建企业专属 AI 面试官',
      description: '多语言、多岗位、多维度测评，一站式提升人才甄选效率。',
      imageUrl: 'https://dummyimage.com/1200x480/1f2937/ffffff&text=AI+Interview+Suite',
      linkType: 'job',
      linkId: 'job-senior-fe',
      sortOrder: 1,
    },
    {
      id: 'banner-digital-human',
      title: '数字人面试体验升级',
      subtitle: '沉浸式互动 + 实时评分 + 多模态分析',
      description: '让候选人面对真实的AI面试官，高效评估沟通与临场反应力。',
      imageUrl: 'https://dummyimage.com/1200x480/0f172a/ffffff&text=Digital+Human+Interview',
      linkType: 'job',
      linkId: 'job-ai-product',
      sortOrder: 2,
    },
    {
      id: 'banner-recruitment-ops',
      title: '智能招聘运营平台',
      subtitle: '从触达、评估到录用的全链路闭环',
      description: '统一候选人画像、沉淀人才库资产，以数据驱动招聘决策。',
      imageUrl: 'https://dummyimage.com/1200x480/111827/ffffff&text=Recruitment+Ops+Platform',
      linkType: 'external',
      linkId: 'https://www.futurelink.ai/solutions',
      sortOrder: 3,
    },
  ];

  for (const banner of bannerSeeds) {
    await prisma.homeBanner.upsert({
      where: { id: banner.id },
      update: {
        title: banner.title,
        subtitle: banner.subtitle,
        description: banner.description,
        imageUrl: banner.imageUrl,
        linkType: banner.linkType,
        linkId: banner.linkId,
        sortOrder: banner.sortOrder,
        isActive: true,
      },
      create: {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        description: banner.description,
        imageUrl: banner.imageUrl,
        linkType: banner.linkType,
        linkId: banner.linkId,
        sortOrder: banner.sortOrder,
        isActive: true,
      },
    });
  }
}

async function seedPromotedJobs() {
  const now = new Date();
  const plusTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const plusTwentyDays = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

  const promotionSeeds = [
    {
      id: 'promotion-job-senior-fe',
      jobId: 'job-senior-fe',
      promotionType: 'FEATURED' as const,
      displayFrequency: 6,
      priority: 90,
      startDate: now,
      endDate: plusTwentyDays,
    },
    {
      id: 'promotion-job-ai-product',
      jobId: 'job-ai-product',
      promotionType: 'PREMIUM' as const,
      displayFrequency: 8,
      priority: 80,
      startDate: now,
      endDate: plusTwentyDays,
    },
    {
      id: 'promotion-job-robotics-architect',
      jobId: 'job-robotics-architect',
      promotionType: 'NORMAL' as const,
      displayFrequency: 10,
      priority: 70,
      startDate: now,
      endDate: plusTenDays,
    },
  ];

  for (const promotion of promotionSeeds) {
    const job = await prisma.job.findUnique({ where: { id: promotion.jobId } });
    if (!job) {
      console.warn(`跳过推广位 ${promotion.id}，未找到关联职位 ${promotion.jobId}`);
      continue;
    }

    await prisma.promotedJob.upsert({
      where: { id: promotion.id },
      update: {
        promotionType: promotion.promotionType,
        displayFrequency: promotion.displayFrequency,
        priority: promotion.priority,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        isActive: true,
      },
      create: {
        id: promotion.id,
        jobId: promotion.jobId,
        promotionType: promotion.promotionType,
        displayFrequency: promotion.displayFrequency,
        priority: promotion.priority,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        isActive: true,
      },
    });
  }
}

async function seedAdminsAndUser() {
  const admins = [
    {
      email: 'superadmin@aiinterview.com',
      password: 'superadmin123',
      name: '超级管理员',
      role: 'SUPER_ADMIN',
      permissions: [
        'user:*',
        'company:*',
        'job:*',
        'interview:*',
        'admin:*',
        'system:*',
      ],
    },
    {
      email: 'admin@aiinterview.com',
      password: 'admin123456',
      name: '管理员',
      role: 'ADMIN',
      permissions: ['user:read', 'company:read', 'job:read', 'interview:read'],
    },
  ];

  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 12);

    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {
        name: admin.name,
        role: admin.role,
        permissions: JSON.stringify(admin.permissions),
        isActive: true,
      },
      create: {
        email: admin.email,
        password: passwordHash,
        name: admin.name,
        role: admin.role,
        permissions: JSON.stringify(admin.permissions),
        isActive: true,
      },
    });
  }

  const testUserEmail = 'user@aiinterview.com';
  const userPassword = await bcrypt.hash('user123456', 12);

  await prisma.user.upsert({
    where: { email: testUserEmail },
    update: {
      name: '测试候选人',
      gender: 'MALE',
      age: 26,
      education: '本科',
      experience: '互联网产品3年经验',
      skills: JSON.stringify(['产品设计', '原型设计', '项目管理']),
      isActive: true,
      isVerified: true,
    },
    create: {
      email: testUserEmail,
      password: userPassword,
      name: '测试候选人',
      phone: '13800138000',
      gender: 'MALE',
      age: 26,
      education: '本科',
      experience: '互联网产品3年经验',
      skills: JSON.stringify(['产品设计', '原型设计', '项目管理']),
      isActive: true,
      isVerified: true,
    },
  });
}

/** 社区帖子假数据：封面 + 多图 + 互动数，供 App 圈子 / system-admin 帖子管理展示 */
async function seedUserCommunityPosts() {
  const mainUser = await prisma.user.findUnique({ where: { email: 'user@aiinterview.com' } });
  const extraPwd = await bcrypt.hash('user123456', 12);
  const circleAuthor = await prisma.user.upsert({
    where: { email: 'circle.demo@aiinterview.com' },
    update: {
      name: '职场观察员',
      isActive: true,
      isVerified: true,
    },
    create: {
      email: 'circle.demo@aiinterview.com',
      password: extraPwd,
      name: '职场观察员',
      phone: '13900001002',
      gender: 'FEMALE',
      age: 28,
      education: '硕士',
      experience: 'HR 科技 / 内容运营',
      skills: JSON.stringify(['招聘', '职场成长', '面试技巧']),
      isActive: true,
      isVerified: true,
    },
  });

  type PostSeed = {
    id: string;
    userId: string | null;
    title: string;
    content: string;
    coverImage: string;
    images: string[];
    tags: string[];
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    isHot: boolean;
  };

  const img = (path: string) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=1200&q=82`;

  const postSeeds: PostSeed[] = [
    {
      id: 'seed-userpost-001',
      userId: mainUser?.id ?? null,
      title: '秋招复盘：AI 面试里我最意外的 3 个得分点',
      content:
        '今年投了 40+ 岗位，AI 面做了十几场。总结下来：表达结构、STAR 举例、以及「追问时的临场反应」比背模板更重要。下面是我整理的 checklist，欢迎补充～',
      coverImage: img('photo-1522071820081-009f0129c71c'),
      images: [
        img('photo-1522071820081-009f0129c71c'),
        img('photo-1552664730-d307ca884978'),
        img('photo-1517245386807-bb43f82c33c4'),
      ],
      tags: ['秋招', 'AI面试', '求职干货'],
      viewCount: 4280,
      likeCount: 312,
      commentCount: 56,
      shareCount: 41,
      isHot: true,
    },
    {
      id: 'seed-userpost-002',
      userId: circleAuthor.id,
      title: '从简历到 Offer：我用一张表管理所有投递进度',
      content:
        '用飞书/Notion 做了一张「岗位-状态-下一轮时间-联系人」表，配合提醒，基本没漏过笔试。附字段模板，直接抄作业。',
      coverImage: img('photo-1454165804606-c3d57bc86b40'),
      images: [img('photo-1454165804606-c3d57bc86b40'), img('photo-1504384308090-c54be3855833')],
      tags: ['简历', '效率工具', '校招'],
      viewCount: 3156,
      likeCount: 198,
      commentCount: 34,
      shareCount: 22,
      isHot: true,
    },
    {
      id: 'seed-userpost-003',
      userId: mainUser?.id ?? null,
      title: '技术面挂掉不一定是题难，可能是沟通节奏',
      content:
        '面试官后来反馈：思路对，但中间停顿太久、没有同步「我在尝试哪种解法」。后来刻意练了 30 秒的「口头白板」，效果明显。',
      coverImage: img('photo-1517694712202-14dd9538aa97'),
      images: [img('photo-1517694712202-14dd9538aa97'), img('photo-1498050108023-c5249f4df085')],
      tags: ['技术面', '沟通', '程序员'],
      viewCount: 8920,
      likeCount: 640,
      commentCount: 120,
      shareCount: 88,
      isHot: true,
    },
    {
      id: 'seed-userpost-004',
      userId: null,
      title: '匿名｜转行产品第一年，我如何补「业务感」',
      content:
        '多跑用户访谈录音、每周写一页「决策假设→验证结果」，半年后和业务方开会终于能跟上节奏了。（匿名求轻喷）',
      coverImage: img('photo-1553877522-43269d4ea984'),
      images: [img('photo-1553877522-43269d4ea984')],
      tags: ['转行', '产品经理', '成长'],
      viewCount: 2760,
      likeCount: 189,
      commentCount: 45,
      shareCount: 17,
      isHot: false,
    },
    {
      id: 'seed-userpost-005',
      userId: circleAuthor.id,
      title: '会议室灯光 + 摄像头角度 = 视频面印象分？',
      content:
        '实测：面部受光均匀、摄像头略俯视、背景简洁，观感会好很多。附一张我家书桌改造前后对比。',
      coverImage: img('photo-1600880292203-757bb62b4baf'),
      images: [img('photo-1600880292203-757bb62b4baf'), img('photo-1524758631624-e2822e304c36')],
      tags: ['视频面试', '形象管理'],
      viewCount: 1540,
      likeCount: 96,
      commentCount: 28,
      shareCount: 9,
      isHot: false,
    },
    {
      id: 'seed-userpost-006',
      userId: mainUser?.id ?? null,
      title: '分享我整理的「行为面」30 问（含追问逻辑）',
      content:
        '按「冲突协作 / 目标拆解 / 失败复盘 / 影响力」四类整理，每题写了面试官想听的信号词。需要的话评论区喊 1。',
      coverImage: img('photo-1542744173-8e7e53415bb0'),
      images: [
        img('photo-1542744173-8e7e53415bb0'),
        img('photo-1556761175-5973dc0f32e7'),
        img('photo-1556761175-b413da4baf72'),
      ],
      tags: ['行为面', '面经', '干货'],
      viewCount: 12020,
      likeCount: 905,
      commentCount: 210,
      shareCount: 166,
      isHot: true,
    },
    {
      id: 'seed-userpost-007',
      userId: circleAuthor.id,
      title: '周末去了场线下招聘会，这 5 个展位最吸睛',
      content:
        '互动屏 + 即时测评 + 小礼品只是标配了，真正有记忆点的是「岗位故事」和现场 1v1 职业规划。拍了些现场图。',
      coverImage: img('photo-1540575467063-178a50c2df87'),
      images: [img('photo-1540575467063-178a50c2df87'), img('photo-1475721027785-f74eccf877e2')],
      tags: ['招聘会', '线下', '观察'],
      viewCount: 980,
      likeCount: 72,
      commentCount: 15,
      shareCount: 6,
      isHot: false,
    },
    {
      id: 'seed-userpost-008',
      userId: mainUser?.id ?? null,
      title: '英语口语面：我用的 10 分钟热身稿（非背题）',
      content:
        '开场 30 秒自我介绍 + 2 个近期项目关键词 + 1 个反问。保持自然语速比高级词汇重要。',
      coverImage: img('photo-1434030216411-0b793f4b4173'),
      images: [img('photo-1434030216411-0b793f4b4173'), img('photo-1523240795612-9a054b0db644')],
      tags: ['英语面试', '口语', '外企'],
      viewCount: 5620,
      likeCount: 410,
      commentCount: 88,
      shareCount: 52,
      isHot: true,
    },
  ];

  for (const p of postSeeds) {
    await prisma.userPost.upsert({
      where: { id: p.id },
      update: {
        userId: p.userId,
        title: p.title,
        content: p.content,
        coverImage: p.coverImage,
        images: JSON.stringify(p.images),
        tags: JSON.stringify(p.tags),
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        isHot: p.isHot,
        status: 'PUBLISHED',
      },
      create: {
        id: p.id,
        userId: p.userId,
        title: p.title,
        content: p.content,
        coverImage: p.coverImage,
        images: JSON.stringify(p.images),
        tags: JSON.stringify(p.tags),
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        isHot: p.isHot,
        status: 'PUBLISHED',
      },
    });
  }
}

async function main() {
  console.log('🌱 开始初始化 Prisma 种子数据...');

  try {
    await seedAdminsAndUser();
    console.log('✅ 管理员与测试账号已准备');

    await seedUserCommunityPosts();
    console.log('✅ 社区帖子演示数据已准备');

    await seedJobDictionary();
    console.log('✅ 职岗字典数据已准备');

    const companyMap = await seedCompanies();
    console.log('✅ 企业基础数据已准备');

    await seedJobs(companyMap);
    console.log('✅ 职岗数据已写入');

    await seedJobSections();
    console.log('✅ 职岗分区已更新');

    await seedCompanyShowcases(companyMap);
    console.log('✅ 精选企业展示已更新');

    await seedHomeBanners();
    console.log('✅ 首页 Banner 数据已准备');

    await seedPromotedJobs();
    console.log('✅ 首页推广职位已准备');

    console.log('🎉 数据库假数据初始化完成！');
  } catch (error) {
    console.error('❌ 种子数据写入失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
