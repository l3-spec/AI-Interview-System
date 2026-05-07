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
  },
  {
    email: 'hr@cofco.com',
    password: 'cofco123456',
    name: '中粮集团',
    description: '中国领先的农产品与食品领域多元化产品和服务供应商，世界500强企业，业务涵盖粮油、糖酒、茶叶、乳品等多个板块。',
    industry: '食品/粮油',
    scale: '10000人以上',
    address: '北京市朝阳区朝阳门南大街8号',
    website: 'https://www.cofco.com',
    logo: 'https://images.unsplash.com/photo-1574182245530-967d9b3831af?w=200&h=200&fit=crop&q=80',
    contact: '010-85016688',
    tagline: '产业链好产品',
    focusArea: '全产业链食品与农产品',
    themeColors: ['#D97706', '#FCD34D'],
    stats: [
      { label: '世界500强排名', value: '第91位' },
      { label: '全球布局国家', value: '140+' },
      { label: '年营收', value: '超6000亿', accent: '#D97706' }
    ],
    highlights: ['全产业链布局', '世界500强', '国际化运营'],
    culture: ['诚信', '专业', '创新', '共赢'],
    locations: ['北京总部', '全国各区域']
  },
  {
    email: 'hr@anhua-ins.com',
    password: 'anhua123456',
    name: '安华保险',
    description: '全国性股份制财产保险公司，专注于农业保险与财产保险，服务网络覆盖全国主要省市。',
    industry: '保险',
    scale: '1000-5000人',
    address: '北京市西城区金融街',
    website: 'https://www.ahic.com.cn',
    logo: 'https://images.unsplash.com/photo-1559526324-593bc07701c7?w=200&h=200&fit=crop&q=80',
    contact: '010-66008888',
    tagline: '安行天下，华泽万家',
    focusArea: '农业保险与财产保险',
    themeColors: ['#2563EB', '#93C5FD'],
    stats: [
      { label: '服务省份', value: '25+' },
      { label: '承保农户', value: '千万级' },
      { label: '保费规模', value: '百亿级', accent: '#2563EB' }
    ],
    highlights: ['农业保险先行者', '全国服务网络', '科技赋能理赔'],
    culture: ['服务三农', '稳健经营', '科技驱动'],
    locations: ['北京总部', '长春', '全国各省']
  },
  {
    email: 'hr@cic-pni.com',
    password: 'zhonghua123456',
    name: '中华联合财险',
    description: '全国性财产保险公司，始创于1986年，业务涵盖车险、农险、企财险等全险种，连续多年保费收入超500亿。',
    industry: '保险',
    scale: '5000-10000人',
    address: '北京市丰台区金泽东路2号',
    website: 'https://www.cic-pn.com',
    logo: 'https://images.unsplash.com/photo-1559526324-593bc07701c7?w=200&h=200&fit=crop&q=80',
    contact: '010-83998888',
    tagline: '中华保险，中华情',
    focusArea: '财产保险全险种经营',
    themeColors: ['#DC2626', '#FCA5A5'],
    stats: [
      { label: '成立年份', value: '1986年' },
      { label: '年保费收入', value: '500亿+' },
      { label: '分支机构', value: '2500+', accent: '#DC2626' }
    ],
    highlights: ['老牌险企', '全险种覆盖', '三农服务深度'],
    culture: ['稳健', '专业', '责任', '创新'],
    locations: ['北京总部', '乌鲁木齐', '全国各省市']
  },
  {
    email: 'hr@cweme.com',
    password: 'shuihuanjing123',
    name: '中国水环境',
    description: '专注水环境综合治理与水生态修复的国家级平台企业，业务涵盖流域治理、城镇水务、海绵城市建设等。',
    industry: '环保/水处理',
    scale: '1000-5000人',
    address: '北京市海淀区复兴路',
    website: 'https://www.cweme.com',
    logo: 'https://images.unsplash.com/photo-1497440001374-1aeb52da9b28?w=200&h=200&fit=crop&q=80',
    contact: '010-51890088',
    tagline: '治水兴邦，利泽民生',
    focusArea: '水环境综合治理与生态修复',
    themeColors: ['#0EA5E9', '#7DD3FC'],
    stats: [
      { label: '治理流域面积', value: '5万+km²' },
      { label: '城镇水务项目', value: '200+' },
      { label: '出水达标率', value: '99.5%', accent: '#0EA5E9' }
    ],
    highlights: ['国家级水环境平台', '全流域治理能力', '海绵城市先行者'],
    culture: ['绿水青山', '科技治水', '责任担当'],
    locations: ['北京总部', '贵阳', '武汉']
  },
  {
    email: 'hr@tuyou.com',
    password: 'tuyou123456',
    name: '在线途游',
    description: '国内领先的休闲游戏与社交娱乐平台，自研多款亿级用户手游，覆盖棋牌、休闲、中重度等多个品类。',
    industry: '游戏/互联网',
    scale: '500-1000人',
    address: '北京市朝阳区望京SOHO',
    website: 'https://www.tuyou.com',
    logo: 'https://images.unsplash.com/photo-1617804697620-81a0bf7ebaf2?w=200&h=200&fit=crop&q=80',
    contact: '010-56781234',
    tagline: '游戏创造快乐',
    focusArea: '休闲游戏研发与运营',
    themeColors: ['#A855F7', '#E9D5FF'],
    stats: [
      { label: '累计注册用户', value: '5亿+' },
      { label: '月活用户', value: '8000万+' },
      { label: '畅销游戏', value: '20+', accent: '#A855F7' }
    ],
    highlights: ['亿级用户产品', '自研游戏引擎', '全球化发行'],
    culture: ['快乐创造', '敏捷迭代', '用户至上'],
    locations: ['北京总部', '上海']
  },
  {
    email: 'hr@bnrs.com',
    password: 'bainian123456',
    name: '百年人寿',
    description: '全国性人寿保险公司，提供寿险、健康险、意外险等全方位保障产品，致力于为亿万家庭提供全生命周期风险保障。',
    industry: '人寿保险',
    scale: '5000-10000人',
    address: '大连市中山区人民路23号',
    website: 'https://www.aeonlife.com.cn',
    logo: 'https://images.unsplash.com/photo-1559526324-593bc07701c7?w=200&h=200&fit=crop&q=80',
    contact: '0411-39869999',
    tagline: '百年人寿，百爱人生',
    focusArea: '人寿保险与健康保障',
    themeColors: ['#059669', '#6EE7B7'],
    stats: [
      { label: '省级分公司', value: '35+' },
      { label: '服务客户', value: '2000万+' },
      { label: '总资产', value: '超3000亿', accent: '#059669' }
    ],
    highlights: ['全生命周期保障', '科技赋能理赔', '全国服务网络'],
    culture: ['百年匠心', '客户至上', '科技赋能'],
    locations: ['大连总部', '北京', '全国各省市']
  },
  {
    email: 'hr@boe-property.com',
    password: 'boeprop123456',
    name: '京东方物业',
    description: '京东方科技集团旗下专业物业管理与园区运营服务商，负责京东方全国产业园及写字楼的物业管理与智慧运营。',
    industry: '物业管理',
    scale: '1000-3000人',
    address: '北京市经济技术开发区京东方科技园',
    website: 'https://www.boe.com',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop&q=80',
    contact: '010-67856666',
    tagline: '智慧物业，品质运营',
    focusArea: '产业园区物业管理与智慧运营',
    themeColors: ['#475569', '#94A3B8'],
    stats: [
      { label: '管理园区', value: '15+' },
      { label: '服务面积', value: '500万+m²' },
      { label: '客户满意度', value: '96%', accent: '#475569' }
    ],
    highlights: ['京东方集团背景', '智慧园区解决方案', '全国化布局'],
    culture: ['品质为本', '智慧运营', '服务创造价值'],
    locations: ['北京总部', '成都', '合肥', '武汉']
  },
  {
    email: 'hr@sinopec-bj.com',
    password: 'sinopec123456',
    name: '中石化北分',
    description: '中国石化集团在北京地区的核心经营单位，承担首都地区成品油供应、化工产品销售及新能源业务拓展。',
    industry: '石油化工',
    scale: '5000-10000人',
    address: '北京市朝阳区安立路66号',
    website: 'https://www.sinopec.com',
    logo: 'https://images.unsplash.com/photo-1518770660419-4da79acd7a8d?w=200&h=200&fit=crop&q=80',
    contact: '010-84889999',
    tagline: '为美好生活加油',
    focusArea: '成品油销售与新能源拓展',
    themeColors: ['#1D4ED8', '#93C5FD'],
    stats: [
      { label: '加油站网络', value: '500+座' },
      { label: '年供油量', value: '千万吨级' },
      { label: '充换电站', value: '100+座', accent: '#1D4ED8' }
    ],
    highlights: ['首都能源保障主力', '新能源转型加速', '央企平台'],
    culture: ['责任担当', '安全第一', '绿色转型'],
    locations: ['北京']
  },
  {
    email: 'hr@citic-health.com',
    password: 'citichealth123',
    name: '中信医疗健康产业',
    description: '中信集团旗下医疗健康产业投资运营平台，涵盖医院投资管理、健康管理、医药流通等全产业链业务。',
    industry: '医疗健康',
    scale: '3000-5000人',
    address: '北京市朝阳区建国外大街1号',
    website: 'https://www.citic.com',
    logo: 'https://images.unsplash.com/photo-1576091160399-46ba6fe7a9d2?w=200&h=200&fit=crop&q=80',
    contact: '010-65886666',
    tagline: '中信健康，健康中国',
    focusArea: '医疗投资管理与健康产业运营',
    themeColors: ['#DC2626', '#FCA5A5'],
    stats: [
      { label: '投资管理医院', value: '30+' },
      { label: '健康管理会员', value: '100万+' },
      { label: '医药流通网络', value: '全国覆盖', accent: '#DC2626' }
    ],
    highlights: ['中信集团背景', '医疗全产业链', '全国化布局'],
    culture: ['专业', '创新', '责任', '协同'],
    locations: ['北京总部', '广州', '杭州']
  },
  {
    email: 'hr@cmbc.com',
    password: 'cmbc123456',
    name: '民生银行',
    description: '全国性股份制商业银行，中国首家全国性民营银行，致力于为民企、小微企业和高端个人客户提供优质金融服务。',
    industry: '银行',
    scale: '10000人以上',
    address: '北京市西城区复兴门内大街2号',
    website: 'https://www.cmbc.com.cn',
    logo: 'https://images.unsplash.com/photo-1559526324-593bc07701c7?w=200&h=200&fit=crop&q=80',
    contact: '010-57096666',
    tagline: '服务大众，情系民生',
    focusArea: '公司银行与零售金融服务',
    themeColors: ['#1E293B', '#64748B'],
    stats: [
      { label: '世界500强', value: '连续入选' },
      { label: '网点数量', value: '2500+' },
      { label: '总资产', value: '超7万亿', accent: '#1E293B' }
    ],
    highlights: ['全国性股份制银行', '民企服务标杆', '数字化转型领先'],
    culture: ['合规经营', '科技驱动', '客户至上'],
    locations: ['北京总部', '全国各省市']
  },
  {
    email: 'hr@chinaunicom-bj.com',
    password: 'unicom123456',
    name: '联通北分',
    description: '中国联通在北京地区的核心运营分公司，提供5G通信、宽带接入、云计算及企业数字化解决方案。',
    industry: '通信',
    scale: '5000-10000人',
    address: '北京市西城区西单北大街甲133号',
    website: 'https://www.chinaunicom.com',
    logo: 'https://images.unsplash.com/photo-1563986768609-322da1354592?w=200&h=200&fit=crop&q=80',
    contact: '010-66501111',
    tagline: '创新与智慧同行',
    focusArea: '5G通信与企业数字化解决方案',
    themeColors: ['#EA580C', '#FDBA74'],
    stats: [
      { label: '5G基站', value: '3万+座' },
      { label: '宽带用户', value: '500万+' },
      { label: '企业客户', value: '10万+', accent: '#EA580C' }
    ],
    highlights: ['首都5G主力运营商', '企业数字化专家', '央企平台'],
    culture: ['创新驱动', '客户为本', '合作共赢'],
    locations: ['北京']
  }
];

const jobs: JobSeed[] = [
  {
    id: 'job-utalent-fe-sr',
    companyEmail: 'admin@test.com',
    title: '资深前端开发工程师',
    description: '负责 U-Talent 平台的架构设计与核心功能开发，打造极致的招聘管理体验。',
    responsibilities: [
      '主导前端架构设计与核心功能开发',
      '优化系统性能与用户交互体验',
      '制定前端开发规范并指导初级工程师'
    ],
    requirements: [
      '5年以上前端开发经验，精通 React/TypeScript',
      '深入理解 Web 性能优化与浏览器工作原理',
      '具备大型 SaaS 产品开发经验者优先'
    ],
    salaryMin: 30,
    salaryMax: 50,
    salaryCurrency: 'CNY',
    location: '上海 · 徐汇',
    experience: '5-10年',
    education: '本科',
    skills: ['React', 'TypeScript', 'Next.js', '性能优化'],
    benefits: ['五险一金', '年度奖金', '带薪年假', '弹性办公'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '技术部',
    level: 'SENIOR',
    highlights: ['核心团队', '技术驱动', '扁平管理'],
    badgeColor: '#6366F1',
    dictionaryPositionCode: 'FRONTEND_ENGINEER'
  },
  {
    id: 'job-utalent-be-sr',
    companyEmail: 'admin@test.com',
    title: '后端技术专家',
    description: '负责高性能微服务架构的设计与维护，支撑 AI 面试业务的高并发需求。',
    responsibilities: [
      '设计并实现高可用的微服务架构',
      '优化数据库性能与分布式系统稳定性',
      '攻克 AI 数字人交互过程中的高并发技术难题'
    ],
    requirements: [
      '7年以上后端研发经验，精通 Go 或 Java',
      '熟悉分布式系统原理，掌握 Redis、Kafka 等中间件',
      '具备云原生或 Kubernetes 实践经验'
    ],
    salaryMin: 40,
    salaryMax: 70,
    salaryCurrency: 'CNY',
    location: '上海 · 张江',
    experience: '7年以上',
    education: '本科',
    skills: ['Go', 'Microservices', 'MySQL', 'K8s'],
    benefits: ['股票期权', '年度调薪', '五险一金', '健康体检'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '技术部',
    level: 'LEAD',
    highlights: ['千万级并发', '前沿技术', '大牛云集'],
    badgeColor: '#F97316',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  {
    id: 'job-utalent-pm-ai',
    companyEmail: 'admin@test.com',
    title: 'AI 产品经理',
    description: '主导 AI 数字人面试系统的功能定义与用户体验优化，将 AI 能力转化为商业价值。',
    responsibilities: [
      '深入挖掘企业招聘场景下的 AI 需求',
      '撰写高质量 PRD，推动算法与研发团队落地',
      '持续跟进用户反馈，迭代 AI 数字人交互逻辑'
    ],
    requirements: [
      '3年以上 ToB 产品经理经验，熟悉 AI/NLP 领域',
      '优秀的逻辑分析能力与数据驱动思维',
      '出色的沟通协调与跨部门协作能力'
    ],
    salaryMin: 25,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '北京 · 海淀',
    experience: '3-5年',
    education: '本科',
    skills: ['产品规划', 'AI 逻辑', '用户调研'],
    benefits: ['绩效奖金', '餐补', '通讯补贴', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '产品部',
    level: 'MIDDLE',
    highlights: ['核心产品线', '行业先锋', '快速成长期'],
    badgeColor: '#0EA5E9',
    dictionaryPositionCode: 'PRODUCT_MANAGER'
  },
  {
    id: 'job-utalent-ui-sr',
    companyEmail: 'admin@test.com',
    title: '资深 UI/UX 设计师',
    description: '负责系统全平台的视觉规范定义与交互设计，打造专业且富有美感的企业级产品。',
    responsibilities: [
      '定义并维护系统的全链路设计规范',
      '交付高保真原型与交互文档，确保还原度',
      '主导用户体验评估，持续优化产品易用性'
    ],
    requirements: [
      '4年以上 UI/UX 设计经验，有成功 SaaS 产品案例',
      '精通 Figma、Sketch、C4D 等设计工具',
      '对 B 端产品交互设计有深刻理解'
    ],
    salaryMin: 20,
    salaryMax: 35,
    salaryCurrency: 'CNY',
    location: '杭州 · 西湖',
    experience: '3-5年',
    education: '本科',
    skills: ['UI设计', '交互设计', '设计系统'],
    benefits: ['下午茶', '年度旅游', '弹性工时', '五险一金'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '设计部',
    level: 'SENIOR',
    highlights: ['设计驱动', '美学追求', '开放氛围'],
    badgeColor: '#8B5CF6',
    dictionaryPositionCode: 'UI_DESIGNER'
  },
  {
    id: 'job-utalent-hr-mgr',
    companyEmail: 'admin@test.com',
    title: '人力资源经理',
    description: '负责公司人才招聘体系搭建与组织文化建设，助力团队高速扩张。',
    responsibilities: [
      '制定年度招聘计划，管理招聘全流程',
      '优化员工激励机制与绩效评估体系',
      '打造并推广公司雇主品牌与组织文化'
    ],
    requirements: [
      '5年以上 HR 工作经验，具备科技行业招聘背景',
      '熟悉国家劳动法律法规，具备优秀的应变能力',
      '卓越的人际沟通与团队管理能力'
    ],
    salaryMin: 18,
    salaryMax: 30,
    salaryCurrency: 'CNY',
    location: '上海 · 徐汇',
    experience: '5-8年',
    education: '本科',
    skills: ['人才招聘', '绩效管理', '雇主品牌'],
    benefits: ['全额社保', '节日礼品', '职业培训', '生日会'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '人事部',
    level: 'MANAGER',
    highlights: ['核心管理岗位', '直接汇报CEO', '发展空间大'],
    badgeColor: '#EC4899',
    dictionaryPositionCode: 'HR_GENERALIST'
  },
  {
    id: 'job-utalent-sales-dir',
    companyEmail: 'admin@test.com',
    title: '销售总监',
    description: '负责 U-Talent 产品的市场拓展与大客户维护，带领团队达成业绩目标。',
    responsibilities: [
      '制定并执行公司销售战略与年度业绩指标',
      '管理并培养销售团队，优化销售漏斗转化',
      '建立并维护与头部标杆客户的长期战略合作关系'
    ],
    requirements: [
      '8年以上 B2B 软件或 SaaS 销售经验',
      '卓越的商务谈判技巧与大客户管理能力',
      '有成功的销售团队管理经验者优先'
    ],
    salaryMin: 45,
    salaryMax: 80,
    salaryCurrency: 'CNY',
    location: '上海 · 静安',
    experience: '8年以上',
    education: '本科',
    skills: ['销售管理', '市场拓展', '商务谈判'],
    benefits: ['高额提成', '交通补助', '期权激励', '高端体检'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '销售部',
    level: 'DIRECTOR',
    highlights: ['业务增长引擎', '行业影响力', '高额回报'],
    badgeColor: '#10B981',
    dictionaryPositionCode: 'SALES_REP'
  },
  {
    id: 'job-utalent-data-sr',
    companyEmail: 'admin@test.com',
    title: '高级数据科学家',
    description: '利用机器学习算法深入挖掘面试数据，持续提升 AI 评估的准确度与公正性。',
    responsibilities: [
      '研发并优化能力素质评估算法模型',
      '主导音视频多模态特征挖掘与融合',
      '通过数据实验验证并优化 AI 面试策略'
    ],
    requirements: [
      '硕士及以上学历，数学、统计学或计算机相关专业',
      '4年以上机器学习或数据科学经验',
      '精通 Python、PyTorch/TensorFlow 等框架'
    ],
    salaryMin: 35,
    salaryMax: 60,
    salaryCurrency: 'CNY',
    location: '深圳 · 南山',
    experience: '4-6年',
    education: '硕士',
    skills: ['机器学习', '深度学习', '多模态分析'],
    benefits: ['落户指标', '科研津贴', '安居补助', '五险一金'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '技术部',
    level: 'SENIOR',
    highlights: ['前沿AI实验室', '核心算法岗', '技术挑战高'],
    badgeColor: '#3B82F6',
    dictionaryPositionCode: 'DATA_ANALYST'
  },
  {
    id: 'job-utalent-ops-mgr',
    companyEmail: 'admin@test.com',
    title: '运营经理',
    description: '负责平台用户增长策略执行与内容社区运营，提升用户活跃度。',
    responsibilities: [
      '策划并执行线上线下营销活动，驱动用户增长',
      '管理内容社区，建立创作者生态',
      '通过用户数据分析持续优化运营路径'
    ],
    requirements: [
      '3年以上互联网运营经验，有成功增长项目经历',
      '优秀的内容策划能力与敏锐的数据分析意识',
      '具备强烈的目标感与执行力'
    ],
    salaryMin: 15,
    salaryMax: 28,
    salaryCurrency: 'CNY',
    location: '广州 · 天河',
    experience: '3-5年',
    education: '本科',
    skills: ['用户增长', '内容运营', '社区建设'],
    benefits: ['绩效奖金', '下午茶', '年度体检', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '运营部',
    level: 'MANAGER',
    highlights: ['创意空间大', '用户规模增长', '团队氛围好'],
    badgeColor: '#F59E0B',
    dictionaryPositionCode: 'OPERATIONS_MANAGER'
  },
  // ---- 中粮集团 ----
  {
    id: 'job-cofco-supply-chain',
    companyEmail: 'hr@cofco.com',
    title: '供应链管理专家',
    description: '统筹粮油全产业链的供应链规划与优化，保障从田间到餐桌的高效运转。',
    responsibilities: ['制定全产业链供应链战略与计划', '优化仓储物流网络布局与运输路径', '推动供应链数字化升级与数据驱动决策'],
    requirements: ['5年以上供应链管理经验，食品/快消行业优先', '精通SAP/ERP系统，具备数据分析能力', '优秀的跨部门协调与供应商管理能力'],
    salaryMin: 25,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '北京 · 朝阳',
    experience: '5-8年',
    education: '本科',
    skills: ['供应链管理', 'ERP', '数据分析', '项目管理'],
    benefits: ['央企待遇', '五险二金', '年度体检', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '供应链部',
    level: 'SENIOR',
    highlights: ['世界500强平台', '全产业链视野', '国际化发展'],
    badgeColor: '#D97706',
    dictionaryPositionCode: 'OPERATIONS_MANAGER'
  },
  // ---- 安华保险 ----
  {
    id: 'job-anhua-ins-tech',
    companyEmail: 'hr@anhua-ins.com',
    title: '保险科技开发工程师',
    description: '开发农业保险科技平台，实现遥感定损、智能理赔等数字化保险服务。',
    responsibilities: ['开发农险科技平台核心功能模块', '对接遥感与气象数据实现智能定损', '优化理赔流程提升服务效率'],
    requirements: ['3年以上Java/Python开发经验', '熟悉保险业务流程或有金融科技经验', '了解遥感/GIS数据处理优先'],
    salaryMin: 20,
    salaryMax: 38,
    salaryCurrency: 'CNY',
    location: '北京 · 西城',
    experience: '3-5年',
    education: '本科',
    skills: ['Java', 'Python', '保险科技', 'GIS'],
    benefits: ['五险一金', '补充医疗', '年度奖金', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '科技部',
    level: 'MIDDLE',
    highlights: ['农险科技前沿', '全国服务网络', '行业深耕'],
    badgeColor: '#2563EB',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  // ---- 中华联合财险 ----
  {
    id: 'job-zhonghua-actuary',
    companyEmail: 'hr@cic-pni.com',
    title: '精算师',
    description: '负责车险与农险产品定价与准备金评估，为业务决策提供精算支持。',
    responsibilities: ['开发与维护定价模型', '进行准备金评估与偿付能力分析', '为新产品开发提供精算建议'],
    requirements: ['精算或统计学相关专业硕士', '通过SOA/CAA部分科目', '3年以上财产险精算经验'],
    salaryMin: 30,
    salaryMax: 55,
    salaryCurrency: 'CNY',
    location: '北京 · 丰台',
    experience: '3-5年',
    education: '硕士',
    skills: ['精算建模', '定价分析', 'Python/R', '偿付能力'],
    benefits: ['五险一金', '补充医疗', '年度奖金', '精算考试补贴'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '精算部',
    level: 'SENIOR',
    highlights: ['老牌险企平台', '全险种经验', '专业成长'],
    badgeColor: '#DC2626',
    dictionaryPositionCode: 'FINANCIAL_ANALYST'
  },
  // ---- 中国水环境 ----
  {
    id: 'job-cweme-water-eng',
    companyEmail: 'hr@cweme.com',
    title: '水环境治理工程师',
    description: '负责流域综合治理与城镇水务项目的技术方案设计与实施，守护碧水清流。',
    responsibilities: ['编制流域治理与水生态修复技术方案', '跟踪项目实施进度并解决技术难题', '开展水处理工艺优化与新技术研发'],
    requirements: ['环境工程/给排水相关专业硕士', '3年以上水处理或流域治理经验', '熟练使用CAD/MIKE等工程软件'],
    salaryMin: 18,
    salaryMax: 35,
    salaryCurrency: 'CNY',
    location: '北京 · 海淀',
    experience: '3-5年',
    education: '硕士',
    skills: ['水处理工程', '流域治理', 'CAD', '生态修复'],
    benefits: ['五险一金', '项目奖金', '年度体检', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '技术部',
    level: 'MIDDLE',
    highlights: ['国家级平台', '绿水青山使命', '技术前沿'],
    badgeColor: '#0EA5E9',
    dictionaryPositionCode: 'PROCESS_ENGINEER'
  },
  // ---- 在线途游 ----
  {
    id: 'job-tuyou-game-server',
    companyEmail: 'hr@tuyou.com',
    title: '游戏服务端开发工程师',
    description: '开发高并发休闲游戏服务端，支撑亿级用户流畅体验。',
    responsibilities: ['设计并实现高并发游戏服务端架构', '优化网络协议与数据同步机制', '保障服务端稳定性与低延迟'],
    requirements: ['3年以上游戏服务端开发经验', '精通C++/Go，熟悉Redis/MQ', '有棋牌或休闲游戏项目经验优先'],
    salaryMin: 25,
    salaryMax: 50,
    salaryCurrency: 'CNY',
    location: '北京 · 望京',
    experience: '3-5年',
    education: '本科',
    skills: ['C++', 'Go', 'Redis', '高并发'],
    benefits: ['游戏行业氛围', '五险一金', '年度奖金', '下午茶'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '技术部',
    level: 'SENIOR',
    highlights: ['亿级用户产品', '高并发挑战', '快乐工作'],
    badgeColor: '#A855F7',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  // ---- 百年人寿 ----
  {
    id: 'job-bnrs-digital-mgr',
    companyEmail: 'hr@bnrs.com',
    title: '数字化转型项目经理',
    description: '推动公司核心业务系统的数字化转型，提升运营效率与客户体验。',
    responsibilities: ['制定数字化转型路线图并推动落地', '协调业务部门与技术团队需求对齐', '管理项目进度、质量与风险'],
    requirements: ['5年以上IT项目管理经验', '有金融/保险行业数字化转型经验', 'PMP/PRINCE2认证优先'],
    salaryMin: 25,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '大连 · 中山',
    experience: '5-8年',
    education: '本科',
    skills: ['项目管理', '数字化转型', '保险业务', '敏捷'],
    benefits: ['五险一金', '补充医疗', '年度奖金', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '科技部',
    level: 'MANAGER',
    highlights: ['保险科技前沿', '全国性平台', '成长空间大'],
    badgeColor: '#059669',
    dictionaryPositionCode: 'PRODUCT_MANAGER'
  },
  // ---- 京东方物业 ----
  {
    id: 'job-boe-smart-pm',
    companyEmail: 'hr@boe-property.com',
    title: '智慧园区产品经理',
    description: '规划京东方智慧园区管理平台，整合IoT、能耗、安防等子系统，实现园区一体化智慧运营。',
    responsibilities: ['定义智慧园区产品功能与演进路线', '整合IoT、能耗管理、安防监控等子系统', '推动平台上线与园区复制推广'],
    requirements: ['3年以上ToB产品经理经验', '有智慧园区/IoT/物业管理产品经验', '具备技术理解力与跨团队协调能力'],
    salaryMin: 20,
    salaryMax: 38,
    salaryCurrency: 'CNY',
    location: '北京 · 亦庄',
    experience: '3-5年',
    education: '本科',
    skills: ['产品规划', '智慧园区', 'IoT', 'B端产品'],
    benefits: ['京东方集团福利', '五险一金', '年度奖金', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '产品部',
    level: 'MIDDLE',
    highlights: ['京东方集团背景', '智慧园区赛道', '多城市布局'],
    badgeColor: '#475569',
    dictionaryPositionCode: 'PRODUCT_MANAGER'
  },
  // ---- 中石化北分 ----
  {
    id: 'job-sinopec-new-energy',
    companyEmail: 'hr@sinopec-bj.com',
    title: '新能源业务开发经理',
    description: '负责中石化北分新能源业务（充换电、氢能）的市场拓展与项目落地。',
    responsibilities: ['制定新能源业务发展规划与市场策略', '拓展充换电站及氢能站点选址与建设', '建立并维护政府与合作伙伴关系'],
    requirements: ['5年以上能源行业或新能源开发经验', '熟悉充换电/氢能产业政策与市场', '卓越的商务谈判与项目推进能力'],
    salaryMin: 25,
    salaryMax: 45,
    salaryCurrency: 'CNY',
    location: '北京 · 朝阳',
    experience: '5-8年',
    education: '本科',
    skills: ['新能源', '商务拓展', '项目管理', '政策研究'],
    benefits: ['央企待遇', '五险二金', '年度奖金', '补充医疗'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '新能源部',
    level: 'MANAGER',
    highlights: ['央企新能源转型', '充换电/氢能赛道', '稳定发展'],
    badgeColor: '#1D4ED8',
    dictionaryPositionCode: 'BD_MANAGER'
  },
  // ---- 中信医疗健康产业 ----
  {
    id: 'job-citic-health-informatics',
    companyEmail: 'hr@citic-health.com',
    title: '医疗信息化架构师',
    description: '设计中信医疗集团级医院信息系统架构，推动旗下医院互联互通与智慧医疗建设。',
    responsibilities: ['规划集团级HIS/EMR系统架构', '推动多院区数据互联互通与标准化', '引入AI辅助诊疗与智慧病房方案'],
    requirements: ['5年以上医疗信息化经验', '精通HIS/EMR/LIS/PACS系统架构', '有集团型医院信息化建设经验'],
    salaryMin: 30,
    salaryMax: 55,
    salaryCurrency: 'CNY',
    location: '北京 · 朝阳',
    experience: '5-10年',
    education: '本科',
    skills: ['医疗信息化', 'HIS/EMR', '系统架构', '数据标准'],
    benefits: ['中信集团福利', '五险一金', '年度奖金', '补充医疗'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '信息技术部',
    level: 'LEAD',
    highlights: ['中信集团背景', '30+医院场景', '智慧医疗前沿'],
    badgeColor: '#DC2626',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  // ---- 民生银行 ----
  {
    id: 'job-cmbc-fintech-dev',
    companyEmail: 'hr@cmbc.com',
    title: '金融科技开发工程师',
    description: '参与民生银行核心金融科技平台开发，涵盖智能风控、开放银行与数字人民币等前沿领域。',
    responsibilities: ['开发智能风控与反欺诈系统', '建设开放银行API平台', '参与数字人民币应用场景研发'],
    requirements: ['3年以上Java开发经验，有金融科技背景', '精通Spring Cloud微服务架构', '了解分布式数据库与消息中间件'],
    salaryMin: 28,
    salaryMax: 50,
    salaryCurrency: 'CNY',
    location: '北京 · 西城',
    experience: '3-5年',
    education: '本科',
    skills: ['Java', 'Spring Cloud', '金融科技', '微服务'],
    benefits: ['银行体系薪资', '六险二金', '年度奖金', '带薪年假'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '科技部',
    level: 'SENIOR',
    highlights: ['股份制银行平台', '金融科技前沿', '数字化转型'],
    badgeColor: '#1E293B',
    dictionaryPositionCode: 'BACKEND_ENGINEER'
  },
  // ---- 联通北分 ----
  {
    id: 'job-unicom-5g-solution',
    companyEmail: 'hr@chinaunicom-bj.com',
    title: '5G行业解决方案架构师',
    description: '为政企客户设计5G+行业数字化解决方案，推动5G在制造、医疗、教育等领域的创新应用。',
    responsibilities: ['设计5G+行业应用解决方案', '支撑售前技术交流与方案编写', '推动5G行业专网与边缘计算项目落地'],
    requirements: ['5年以上通信/IT解决方案经验', '熟悉5G网络架构与边缘计算', '有政企客户项目经验优先'],
    salaryMin: 25,
    salaryMax: 50,
    salaryCurrency: 'CNY',
    location: '北京 · 西城',
    experience: '5-8年',
    education: '本科',
    skills: ['5G', '边缘计算', '解决方案', '政企市场'],
    benefits: ['央企待遇', '五险二金', '年度奖金', '通信补贴'],
    type: 'FULL_TIME',
    status: 'ACTIVE',
    isPublished: true,
    category: '政企事业部',
    level: 'SENIOR',
    highlights: ['5G+行业创新', '央企平台', '政企市场深耕'],
    badgeColor: '#EA580C',
    dictionaryPositionCode: 'ARCHITECT'
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
    {
      companyEmail: 'hr@cofco.com',
      role: '世界500强粮油',
      hiringCount: 1,
      sortOrder: 4,
    },
    {
      companyEmail: 'hr@anhua-ins.com',
      role: '农业保险领先',
      hiringCount: 1,
      sortOrder: 5,
    },
    {
      companyEmail: 'hr@cic-pni.com',
      role: '老牌财产险企',
      hiringCount: 1,
      sortOrder: 6,
    },
    {
      companyEmail: 'hr@cweme.com',
      role: '水环境治理',
      hiringCount: 1,
      sortOrder: 7,
    },
    {
      companyEmail: 'hr@tuyou.com',
      role: '休闲游戏平台',
      hiringCount: 1,
      sortOrder: 8,
    },
    {
      companyEmail: 'hr@bnrs.com',
      role: '人寿保险标杆',
      hiringCount: 1,
      sortOrder: 9,
    },
    {
      companyEmail: 'hr@boe-property.com',
      role: '智慧园区运营',
      hiringCount: 1,
      sortOrder: 10,
    },
    {
      companyEmail: 'hr@sinopec-bj.com',
      role: '央企新能源转型',
      hiringCount: 1,
      sortOrder: 11,
    },
    {
      companyEmail: 'hr@citic-health.com',
      role: '医疗健康产业',
      hiringCount: 1,
      sortOrder: 12,
    },
    {
      companyEmail: 'hr@cmbc.com',
      role: '股份制银行',
      hiringCount: 1,
      sortOrder: 13,
    },
    {
      companyEmail: 'hr@chinaunicom-bj.com',
      role: '5G通信运营商',
      hiringCount: 1,
      sortOrder: 14,
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

async function seedInterviewsForUTalent(companyMap: Record<string, string>) {
  const companyId = companyMap['admin@test.com'];
  if (!companyId) return;

  const uTalentJobs = await prisma.job.findMany({
    where: { companyId }
  });

  if (uTalentJobs.length === 0) return;

  console.log('🌱 开始生成 U-Talent 演示数据...');

  // 0. 清理旧数据，确保结果可预测且不重复累加
  await prisma.interview.deleteMany({ where: { companyId } });
  console.log('🧹 已清理 U-Talent 旧面试数据');

  // 1. 创建候选人 (30)
  const candidates = [];
  const candidateNames = [
    '张伟', '王芳', '李娜', '刘强', '陈思', '杨幂', '黄渤', '周迅', '胡歌', '赵薇',
    '徐峥', '唐嫣', '范冰冰', '吴亦凡', '鹿晗', '张艺兴', '迪丽热巴', '易烊千玺', '王源', '王俊凯',
    '孙俪', '邓超', '杨洋', '佟丽娅', '沈腾', '马丽', '黄晓明', 'Angelababy', '郑爽', '古力娜扎'
  ];

  for (let i = 0; i < candidateNames.length; i++) {
    const email = `candidate${i}@example.com`;
    const password = await bcrypt.hash('123456', 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: candidateNames[i],
        phone: `138000000${i.toString().padStart(2, '0')}`,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        age: 22 + (i % 10),
        education: i % 3 === 0 ? '硕士' : '本科',
        experience: `${(i % 5) + 1}年经验`,
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Problem Solving'].slice(0, (i % 4) + 1)),
        isActive: true,
        isVerified: true
      },
      create: {
        email,
        password,
        name: candidateNames[i],
        phone: `138000000${i.toString().padStart(2, '0')}`,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        age: 22 + (i % 10),
        education: i % 3 === 0 ? '硕士' : '本科',
        experience: `${(i % 5) + 1}年经验`,
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Problem Solving'].slice(0, (i % 4) + 1)),
        isActive: true,
        isVerified: true
      }
    });
    candidates.push(user);
  }

  // 2. 创建面试 (80)
  let interviewCount = 0;
  const totalInterviewsToCreate = 80;
  
  for (let i = 0; i < totalInterviewsToCreate; i++) {
    const job = uTalentJobs[i % uTalentJobs.length];
    const candidate = candidates[i % candidates.length];
    
    // 状态分布：25 Pending, 45 Completed, 5 Ongoing, 5 Cancelled
    let status = 'PENDING';
    if (i >= 25 && i < 70) status = 'COMPLETED';
    else if (i >= 70 && i < 75) status = 'ONGOING';
    else if (i >= 75) status = 'CANCELLED';

    // 评分逻辑：10分制，大部分及格(6.5-9.5)，一部分不及格(4.0-5.8)
    const isFailed = (i + (i % 3)) % 4 === 0; // 约25%的不及格率
    const score = status === 'COMPLETED' ? (isFailed ? 4.0 + (i % 1.9) : 6.5 + (i % 3.0)) : null;
    
    // 结果逻辑：根据分数自动决定，或者手动设置 reviewing
    let result = 'pending';
    if (status === 'COMPLETED') {
        if (i % 7 === 0) result = 'reviewing';
        else result = (score && score >= 6.0) ? 'passed' : 'failed';
    }

    const interview = await prisma.interview.create({
      data: {
        userId: candidate.id,
        jobId: job.id,
        companyId,
        status,
        startTime: status === 'COMPLETED' ? new Date(Date.now() - (i % 30) * 24 * 3600 * 1000) : new Date(Date.now() + (i % 7) * 24 * 3600 * 1000),
        duration: status === 'COMPLETED' ? 30 + (i % 20) : null,
        score,
        feedback: status === 'COMPLETED' ? (isFailed ? `候选人 ${candidate.name} 在专业技能测试中表现欠佳，需进一步提升。` : `候选人 ${candidate.name} 在面试中表现稳定，展现了较好的专业素养。`) : null,
        recording: status === 'COMPLETED' ? `https://example.com/recordings/${i}.mp4` : null,
      }
    });

    if (status === 'COMPLETED') {
      await prisma.interviewReport.create({
        data: {
          interviewId: interview.id,
          overallScore: score || 0,
          summary: `该候选人在 ${job.title} 岗位的面试中，对核心技术点的理解非常深刻，沟通顺畅。`
        }
      });

      await prisma.question.createMany({
        data: [
          { interviewId: interview.id, content: '请描述你在项目中遇到的最大技术挑战。', type: 'TECHNICAL', score: 8.5, duration: 180, answer: '我在处理...' },
          { interviewId: interview.id, content: '你如何处理团队协作中的冲突？', type: 'BEHAVIOR', score: 7.5, duration: 120, answer: '我认为...' }
        ]
      });
    }

    // 创建申请记录
    await prisma.jobApplication.create({
      data: {
        jobId: job.id,
        userId: candidate.id,
        status: status === 'COMPLETED' ? (i % 2 === 0 ? 'ACCEPTED' : 'REJECTED') : 'PENDING',
        message: '期待加入贵公司'
      }
    });

    interviewCount++;
  }

  console.log(`✅ 已为 U-Talent 生成 ${uTalentJobs.length} 个职位，${candidates.length} 个候选人，${interviewCount} 条面试记录。`);
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

    await seedInterviewsForUTalent(companyMap);

    console.log('🎉 数据库假数据初始化完成！');
  } catch (error) {
    console.error('❌ 种子数据写入失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
