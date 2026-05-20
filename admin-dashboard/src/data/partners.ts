// 合作伙伴 / 成功案例 数据集
// 由于多数客户公司没有提供商标使用授权，这里采用「字母/中文首字 + 品牌色」作为 Logo 兜底方案。
// 后续如有正式 Logo，可在 logoUrl 字段中填入图片路径，组件会自动优先展示。

export interface RecruitmentDirection {
  title: string;
  description: string;
  positions: string[];
}

export interface CooperationMilestone {
  date: string;
  content: string;
}

export interface PartnerMetric {
  label: string;
  value: string;
}

export interface PartnerInfo {
  id: string;
  name: string;
  shortLabel: string;        // Logo 兜底显示的短文字（一般 2 个字）
  brandColor: string;         // 主品牌色
  industry: string;
  scale: string;              // 企业规模
  region: string;             // 总部所在地
  cooperationSince: string;   // 合作起始年份
  cooperationSummary: string; // 合作概述
  cooperationHighlights: string[];
  metrics: PartnerMetric[];
  recruitmentDirections: RecruitmentDirection[];
  milestones: CooperationMilestone[];
  logoUrl?: string;
}

export const partners: PartnerInfo[] = [
  {
    id: 'cofco',
    name: '中粮集团',
    shortLabel: '中粮',
    brandColor: '#c0392b',
    industry: '食品 / 农业 / 大宗商品',
    scale: '世界 500 强 · 员工 10 万+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '中粮集团下属多家事业部接入 U-Talent 智能面试平台，实现校招与社招的全流程数字化筛选，显著提升了招聘官的处理效率与候选人体验。',
    cooperationHighlights: [
      '校招季单日峰值面试 1,500+ 场，AI 数字人 7×24 小时不间断接待',
      '岗位胜任力模型与 AI 题库深度对接，简历到一面通过率提升 35%',
      '面试结果、能力雷达图自动同步至 HRSSC 系统，免人工录入'
    ],
    metrics: [
      { label: '累计面试场次', value: '120,000+' },
      { label: '覆盖事业部', value: '18 个' },
      { label: 'HR 满意度', value: '96%' }
    ],
    recruitmentDirections: [
      {
        title: '供应链与采购管理',
        description: '面向粮油、糖业、肉食等业务线，招募具备国际贸易与供应链优化经验的中高级人才。',
        positions: ['供应链规划经理', '大宗商品采购', '国际物流主管']
      },
      {
        title: '食品研发与品控',
        description: '组建研发与质量管理团队，推动新品快速上市与全链路品控数字化。',
        positions: ['食品研发工程师', '质量体系经理', '工艺改进专员']
      },
      {
        title: '数字化与战略管培',
        description: '聚焦 IT、数据与战略类管培生，培养未来业务一号位。',
        positions: ['战略管培生', '数据分析师', '数字化产品经理']
      }
    ],
    milestones: [
      { date: '2023.04', content: '完成首期试点：粮油事业部上线 AI 一面' },
      { date: '2023.10', content: '校招季全国 18 个事业部全量接入' },
      { date: '2024.06', content: '与中粮 HRSSC 完成深度系统对接' }
    ]
  },
  {
    id: 'bnlife',
    name: '百年人寿',
    shortLabel: '百年',
    brandColor: '#1d3557',
    industry: '人寿保险',
    scale: '员工 2 万+',
    region: '大连',
    cooperationSince: '2024',
    cooperationSummary:
      '百年人寿在分公司代理人招募与内勤社招两条主线全面引入 AI 面试，统一总分公司用人标准。',
    cooperationHighlights: [
      '代理人岗位 AI 初面通过率与留存率双双提升 20%+',
      '内勤岗位结构化面试题目覆盖 200+ 细分岗位',
      '实时反作弊与人岗匹配模型保障批量招聘质量'
    ],
    metrics: [
      { label: '覆盖分公司', value: '32 家' },
      { label: '月均面试量', value: '8,000+' },
      { label: '人均节省 HR 工时', value: '60%' }
    ],
    recruitmentDirections: [
      {
        title: '保险代理人招募',
        description: '面向社会招募具备销售或客户服务经验的代理人，AI 初面快速识别沟通力与抗压性。',
        positions: ['资深保险代理人', '团队主管', '银保渠道经理']
      },
      {
        title: '总部内勤与精算',
        description: '招募精算、风控、IT 等专业人才，强化总部专业能力。',
        positions: ['精算师助理', '产品风控经理', '保险科技工程师']
      }
    ],
    milestones: [
      { date: '2024.03', content: '试点辽宁、山东两家分公司' },
      { date: '2024.09', content: '推广至全国 32 家分公司' }
    ]
  },
  {
    id: 'cmbc',
    name: '民生银行',
    shortLabel: '民生',
    brandColor: '#0a66c2',
    industry: '股份制商业银行',
    scale: '员工 6 万+',
    region: '北京',
    cooperationSince: '2022',
    cooperationSummary:
      '民生银行总行与多家一级分行采用 U-Talent 完成校园招聘的批量初筛与专业面试预演。',
    cooperationHighlights: [
      '校招季支持单日 5,000+ 候选人并发面试',
      '专业岗位题库覆盖公司金融、零售金融、风险、科技四大条线',
      '英语口语题组合自动评分，准确率 92%'
    ],
    metrics: [
      { label: '总分行覆盖', value: '36 家' },
      { label: '校招通过效率', value: '↑ 3 倍' },
      { label: '候选人体验评分', value: '4.7 / 5.0' }
    ],
    recruitmentDirections: [
      {
        title: '管培生 / MT 计划',
        description: '业务条线轮岗管培，重点考察学习力、领导力与价值观匹配度。',
        positions: ['零售管培', '公司金融管培', '风险管培']
      },
      {
        title: '金融科技专项',
        description: '聚焦核心系统、数字人民币、AI 风控等技术方向。',
        positions: ['后端工程师', '算法工程师', 'DBA / SRE']
      }
    ],
    milestones: [
      { date: '2022.10', content: '总行启动 AI 面试试点' },
      { date: '2023.10', content: '36 家一级分行全部接入' }
    ]
  },
  {
    id: 'anhua',
    name: '安华保险',
    shortLabel: '安华',
    brandColor: '#2a9d8f',
    industry: '财产保险',
    scale: '员工 1.5 万+',
    region: '长春',
    cooperationSince: '2024',
    cooperationSummary:
      '安华农业保险将 AI 面试用于乡镇基层网点的代理人海选，解决偏远地区招聘官稀缺问题。',
    cooperationHighlights: [
      '7×24 小时在线面试，覆盖东三省乡镇网点',
      '方言识别与普通话评估并行，避免误筛',
      '与代理人执业证后台打通，入职流程一站式'
    ],
    metrics: [
      { label: '覆盖网点', value: '480+' },
      { label: '初面节省成本', value: '约 65%' }
    ],
    recruitmentDirections: [
      {
        title: '基层代理人',
        description: '面向乡镇市场招募贴近一线的农险代理人。',
        positions: ['农险代理人', '网点主任']
      },
      {
        title: '理赔与查勘',
        description: '招聘车险、农险查勘定损人才，要求一定的实操经验。',
        positions: ['查勘员', '理赔师']
      }
    ],
    milestones: [
      { date: '2024.05', content: '吉林全省试点上线' },
      { date: '2024.11', content: '推广至黑龙江、辽宁' }
    ]
  },
  {
    id: 'mfa-personnel',
    name: '外交人事局',
    shortLabel: '外交',
    brandColor: '#264653',
    industry: '政府 / 外事',
    scale: '直属事业单位',
    region: '北京',
    cooperationSince: '2024',
    cooperationSummary:
      '为外派人员与短期项目招聘提供结构化、标准化的远程面试解决方案，全程留痕、安全合规。',
    cooperationHighlights: [
      '私有化部署，数据完全留在内网',
      '多语种题库（中 / 英 / 法 / 西 / 阿）评估外语能力',
      '面试录像与评分自动归档，便于审查'
    ],
    metrics: [
      { label: '覆盖语种', value: '5 种' },
      { label: '年面试量', value: '2,000+' }
    ],
    recruitmentDirections: [
      {
        title: '外派项目人员',
        description: '面向具备多语种能力、跨文化沟通能力的项目制人才。',
        positions: ['项目联络员', '翻译 / 译审', '行政事务专员']
      }
    ],
    milestones: [
      { date: '2024.07', content: '完成私有化部署与安全验收' }
    ]
  },
  {
    id: 'unicom-bj',
    name: '联通北分',
    shortLabel: '联通',
    brandColor: '#e63946',
    industry: '通信运营',
    scale: '员工 8,000+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '中国联通北京分公司将 AI 面试应用于校招、社招、外包人员入场的全流程。',
    cooperationHighlights: [
      '5G、云、AI 等新业务岗位题库由总部专家共创',
      '外包供应商人员入场前统一 AI 面试，质量可控',
      '与北京联通 HR 系统单点登录、流程闭环'
    ],
    metrics: [
      { label: '岗位题库', value: '300+' },
      { label: '人均节省时长', value: '4.5 小时 / 人' }
    ],
    recruitmentDirections: [
      {
        title: '5G 与云网技术',
        description: '面向 5G、SD-WAN、云网融合等新业务的工程师与架构师。',
        positions: ['5G 网络工程师', '云网架构师', 'SRE']
      },
      {
        title: '政企客户经理',
        description: '面向北京政企客户的销售与解决方案人才。',
        positions: ['政企客户经理', '行业解决方案专家']
      }
    ],
    milestones: [
      { date: '2023.06', content: '校招试点' },
      { date: '2024.01', content: '社招与外包全流程上线' }
    ]
  },
  {
    id: 'cul',
    name: '中华联合财险',
    shortLabel: '中华',
    brandColor: '#b5651d',
    industry: '财产保险',
    scale: '员工 5 万+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '中华联合财险通过 U-Talent 进行机构内勤与渠道代理人招募，统一全国分公司面试标准。',
    cooperationHighlights: [
      '总分公司面试官培训与考核数字化',
      '渠道与直营两条招募线全部接入',
      '面试合规留存，满足银保监合规要求'
    ],
    metrics: [
      { label: '覆盖分公司', value: '28 家' },
      { label: '面试官培训通过率', value: '↑ 40%' }
    ],
    recruitmentDirections: [
      {
        title: '机构内勤',
        description: '总部与分公司核心业务岗位。',
        positions: ['核保', '理赔', '车商业务']
      },
      {
        title: '渠道代理人',
        description: '面向银保、电网销、专业代理渠道。',
        positions: ['银保客户经理', '电网销坐席']
      }
    ],
    milestones: [
      { date: '2023.08', content: '北京、上海分公司试点' },
      { date: '2024.04', content: '推广至 28 家分公司' }
    ]
  },
  {
    id: 'boe-property',
    name: '京东方物业',
    shortLabel: '京东',
    brandColor: '#1f6feb',
    industry: '物业 / 园区运营',
    scale: '员工 1 万+',
    region: '北京',
    cooperationSince: '2024',
    cooperationSummary:
      '京东方物业在全国近 200 个园区项目中应用 AI 面试，加速基层服务岗位的快速到岗。',
    cooperationHighlights: [
      '一线员工 24 小时在线面试，T+1 入职',
      '岗位画像基于 BOE 园区运营数据训练',
      '员工流失率较行业平均下降 18%'
    ],
    metrics: [
      { label: '覆盖项目', value: '180+' },
      { label: '到岗周期', value: '↓ 50%' }
    ],
    recruitmentDirections: [
      {
        title: '园区客服与秩序',
        description: '面向园区前台、客户服务、秩序维护、保洁等基层岗位。',
        positions: ['客服专员', '秩序维护员', '园区主管']
      },
      {
        title: '工程与设备',
        description: '强弱电、暖通、消防类专业人员。',
        positions: ['工程主管', '弱电工程师']
      }
    ],
    milestones: [
      { date: '2024.02', content: '京津冀项目试点' },
      { date: '2024.10', content: '推广至全国 180+ 项目' }
    ]
  },
  {
    id: 'sino-eco',
    name: '中化学生态环境',
    shortLabel: '中化',
    brandColor: '#52b788',
    industry: '生态环境 / 工程',
    scale: '员工 5,000+',
    region: '北京',
    cooperationSince: '2024',
    cooperationSummary:
      '聚焦工程项目人员招募与项目部岗位的标准化面试，提升异地用人效率。',
    cooperationHighlights: [
      '工程项目部异地组建团队效率提升 50%',
      '环保、市政、水务专业岗位题库自建',
      '与项目管理系统对接，岗位需求自动同步'
    ],
    metrics: [
      { label: '工程项目', value: '60+' },
      { label: '异地组队周期', value: '↓ 50%' }
    ],
    recruitmentDirections: [
      {
        title: '环保工程',
        description: '面向水务、固废、土壤治理等项目的工程类人才。',
        positions: ['项目经理', '环保工程师', '现场施工员']
      },
      {
        title: '商务与造价',
        description: '面向工程项目的商务投标与造价管理。',
        positions: ['投标经理', '造价工程师']
      }
    ],
    milestones: [
      { date: '2024.06', content: '完成项目管理系统对接' }
    ]
  },
  {
    id: 'cwec',
    name: '中国水环境',
    shortLabel: '水环',
    brandColor: '#0096c7',
    industry: '水务 / 环境治理',
    scale: '员工 6,000+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '中国水环境集团通过 U-Talent 进行水务运营、设计院、研究院的多类型招聘。',
    cooperationHighlights: [
      '面向 PPP 项目落地城市的属地化招聘',
      '设计院与研究院的研发岗题库与高校联建',
      '面试视频与项目交付节点联动'
    ],
    metrics: [
      { label: '城市覆盖', value: '40+' },
      { label: '岗位类别', value: '120+' }
    ],
    recruitmentDirections: [
      {
        title: '水务运营',
        description: '面向城市污水、地下水厂运营管理。',
        positions: ['水厂厂长', '工艺工程师', '中控操作员']
      },
      {
        title: '设计 / 研究院',
        description: '研发型岗位，重点考察学术背景与项目经验。',
        positions: ['给排水设计师', '科研工程师']
      }
    ],
    milestones: [
      { date: '2023.11', content: '设计院首批接入' }
    ]
  },
  {
    id: 'sinopec-bj',
    name: '中石化北分',
    shortLabel: '中石',
    brandColor: '#d62828',
    industry: '能源 / 化工',
    scale: '员工 1 万+',
    region: '北京',
    cooperationSince: '2024',
    cooperationSummary:
      '中石化北京分公司在零售加油站与油品物流两条线引入 AI 面试。',
    cooperationHighlights: [
      '加油站站长、班长岗位结构化面试',
      '司机岗位驾驶资质审核与心理评估并行',
      '与中石化人事系统打通'
    ],
    metrics: [
      { label: '覆盖加油站', value: '500+' },
      { label: 'HR 工作量下降', value: '约 55%' }
    ],
    recruitmentDirections: [
      {
        title: '加油站运营',
        description: '加油站基层与管理岗位。',
        positions: ['加油员', '班长', '站长']
      },
      {
        title: '油品物流',
        description: '危化品运输司机与调度。',
        positions: ['危化品驾驶员', '调度员']
      }
    ],
    milestones: [
      { date: '2024.05', content: '北京区域 500+ 加油站全量上线' }
    ]
  },
  {
    id: 'modern-land',
    name: '当代置业',
    shortLabel: '当代',
    brandColor: '#7b2cbf',
    industry: '绿色地产 / 物业',
    scale: '员工 5,000+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '当代置业在物业服务与绿色科技业务板块使用 AI 面试，支撑全国项目快速复制。',
    cooperationHighlights: [
      '绿色建筑技术岗位题库定制',
      '物业服务岗位语音温度感知评估',
      '面试结果联动培训计划'
    ],
    metrics: [
      { label: '城市', value: '20+' },
      { label: '面试到 offer 转化率', value: '↑ 22%' }
    ],
    recruitmentDirections: [
      {
        title: '绿色建筑科技',
        description: '面向绿色科技、节能减排技术研发岗位。',
        positions: ['暖通工程师', '建筑节能专家']
      },
      {
        title: '物业服务',
        description: '高端社区客服与管家。',
        positions: ['物业管家', '客户服务主管']
      }
    ],
    milestones: [
      { date: '2023.12', content: '物业板块全量上线' }
    ]
  },
  {
    id: 'tuyoo',
    name: '在线途游',
    shortLabel: '途游',
    brandColor: '#06d6a0',
    industry: '互联网 / 游戏',
    scale: '员工 1,500+',
    region: '北京',
    cooperationSince: '2023',
    cooperationSummary:
      '途游游戏在产研、运营、商业化等岗位采用 AI 面试，加快互联网公司高节奏招聘。',
    cooperationHighlights: [
      '研发岗代码题、英语题双结构化',
      '运营与商业化岗 case 题智能批改',
      '招聘周期由 21 天缩短至 12 天'
    ],
    metrics: [
      { label: '岗位类别', value: '60+' },
      { label: '平均招聘周期', value: '12 天' }
    ],
    recruitmentDirections: [
      {
        title: '游戏研发',
        description: '客户端、服务端、引擎、AI 等研发岗位。',
        positions: ['Unity 客户端', '服务器开发', '游戏 AI 工程师']
      },
      {
        title: '运营与商业化',
        description: '用户增长、广告变现、社区运营等。',
        positions: ['用户增长经理', '广告变现 PM']
      }
    ],
    milestones: [
      { date: '2023.09', content: '研发与运营线全量上线' }
    ]
  },
  {
    id: 'cic-health',
    name: '中信医疗健康产业',
    shortLabel: '中信',
    brandColor: '#0077b6',
    industry: '医疗 / 大健康',
    scale: '员工 1 万+',
    region: '北京',
    cooperationSince: '2024',
    cooperationSummary:
      '中信医疗在旗下医院、健康管理、医药商业三大板块部署 U-Talent，统一招聘标准。',
    cooperationHighlights: [
      '医护岗位资质核验与情景面试结合',
      '大健康渠道商务岗位 AI 谈判演练',
      '与 HR SaaS 全链路打通'
    ],
    metrics: [
      { label: '业务板块', value: '3 个' },
      { label: '医护岗位通过率', value: '↑ 18%' }
    ],
    recruitmentDirections: [
      {
        title: '临床医护',
        description: '面向旗下综合医院与专科医院的医生、护士岗位。',
        positions: ['临床医生', '专科护士']
      },
      {
        title: '健康管理与商务',
        description: '面向健康险、健康管理中心的商务与运营岗位。',
        positions: ['健康管理师', '渠道商务']
      }
    ],
    milestones: [
      { date: '2024.06', content: '医院板块首批上线' }
    ]
  },
  {
    id: 'ulu-edu',
    name: '优路教育',
    shortLabel: '优路',
    brandColor: '#f4a261',
    industry: '职业教育',
    scale: '员工 8,000+',
    region: '北京',
    cooperationSince: '2022',
    cooperationSummary:
      '优路教育在全国 200+ 校区使用 AI 面试，做老师、班主任、销售三类岗位的批量招聘。',
    cooperationHighlights: [
      '试讲与说课环节 AI 自动评分',
      '销售岗角色扮演场景智能模拟',
      '面试合规录像支持后续培训复盘'
    ],
    metrics: [
      { label: '覆盖校区', value: '200+' },
      { label: '月均面试量', value: '5,000+' }
    ],
    recruitmentDirections: [
      {
        title: '学科与职业讲师',
        description: '建工、医卫、教师、财经等多领域讲师。',
        positions: ['一级建造师讲师', '医卫类讲师']
      },
      {
        title: '校区销售与班主任',
        description: '校区运营核心岗位。',
        positions: ['课程顾问', '班主任', '校区主任']
      }
    ],
    milestones: [
      { date: '2022.07', content: '首批 30 个校区试点' },
      { date: '2024.03', content: '覆盖全国 200+ 校区' }
    ]
  }
];

export const findPartnerById = (id: string): PartnerInfo | undefined =>
  partners.find((p) => p.id === id);
