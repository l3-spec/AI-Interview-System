import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const json = (value: unknown) => JSON.stringify(value);

const now = new Date();
const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

type SeedJob = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  location: string;
  salary: string;
  experience: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  highlights: string[];
  perks: string[];
  skills: string[];
  badgeColor: string;
  isRemote: boolean;
  level: string;
  type: string;
};

export async function seedTestData() {
  try {
    console.log('开始创建测试数据...');

    await prisma.jobSectionItem.deleteMany({});
    await prisma.jobSection.deleteMany({});
    await prisma.companyShowcase.deleteMany({});
    await prisma.promotedJob.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.company.deleteMany({});

    const passwordHash = await bcrypt.hash('12345678', 10);

    const companies = [
      {
        id: 'xinglian_space',
        email: 'hr@xinglian-space.com',
        password: passwordHash,
        name: '星链航天',
        description:
          '星链航天专注于星际通信与 AI 技术融合，打造面向未来的智能协同网络。团队由航天通信、AI 算法、系统工程等专家组成，致力于构建覆盖卫星与地面终端的智能连接平台。',
        industry: '航天 / AI',
        scale: '500-1000人',
        address: '北京 · 中关村 / 西安 · 航天城',
        website: 'https://starlink-space.example.com',
        contact: '010-12345678',
        tagline: '深空通信 · 探索未来互联',
        focusArea: '星际通信 · L3-L5',
        themeColors: json(['#5743F0', '#8E6CFF']),
        stats: json([
          { label: '融资阶段', value: 'C+ 轮', accent: '#6366F1' },
          { label: '团队规模', value: '600+', accent: '#FF8C42' },
          { label: '技术专利', value: '120 项', accent: '#38B2AC' },
        ]),
        highlights: json([
          '行业领先的星际通信平台，服务 18 个国家',
          '自建多模态 AI 实验室，侧重智能运维',
          '灵活办公，提供跨城市创新站点',
        ]),
        culture: json([
          '探索精神：鼓励在未知领域持续创新',
          '协作共赢：跨学科团队高效合作',
          '长期主义：关注人才成长与职业发展',
        ]),
        locations: json(['北京 · 中关村', '西安 · 航天城']),
        isVerified: true,
        isActive: true,
      },
      {
        id: 'xingtu_ai',
        email: 'talent@xingtu-ai.com',
        password: passwordHash,
        name: '星图智能',
        description:
          '星图智能聚焦大模型与职业发展场景的深度结合，构建面向企业和人才的智能决策平台。公司与多所顶尖高校合作，持续产出高水平科研成果。',
        industry: 'AI / SaaS',
        scale: '300-600人',
        address: '上海 · 张江 / 深圳 · 南山',
        website: 'https://xingtu-ai.example.com',
        contact: '021-87654321',
        tagline: 'AI 研究 · 面向未来的职业伙伴',
        focusArea: 'AI 研究 · L4-L6',
        themeColors: json(['#0F9B8E', '#3FD6AE']),
        stats: json([
          { label: '核心业务', value: 'AI 研究 + SaaS', accent: '#38B2AC' },
          { label: '研发占比', value: '68%', accent: '#6366F1' },
          { label: '合作企业', value: '320+', accent: '#FF8C42' },
        ]),
        highlights: json([
          '自研多模态大模型，月活跃用户 350 万',
          '沉浸式职业画像系统，被 120 家企业采用',
          '开放式创新文化，鼓励跨界实验',
        ]),
        culture: json([
          '开放共创：支持跨团队 idea incubator',
          '科学精神：推崇数据驱动与实验文化',
          '关注个体：提供导师制与学习账号',
        ]),
        locations: json(['上海 · 张江', '深圳 · 南山']),
        isVerified: true,
        isActive: true,
      },
      {
        id: 'xinghe_interactive',
        email: 'hr@xinghe-interactive.com',
        password: passwordHash,
        name: '星河互动',
        description:
          '星河互动以产品体验驱动增长，构建面向用户与企业的沉浸式交互平台。团队融合设计、数据、技术人才，注重体验细节与品牌调性。',
        industry: '互联网 / 互动体验',
        scale: '200-400人',
        address: '深圳 · 科技园 / 杭州 · 滨江',
        website: 'https://xinghe-interactive.example.com',
        contact: '0755-98765432',
        tagline: '产品创新中心 · 重塑互动体验',
        focusArea: '产品创新中心',
        themeColors: json(['#FF8C42', '#FFB865']),
        stats: json([
          { label: '成立年份', value: '2018', accent: '#FF8C42' },
          { label: '核心业务', value: '互动产品', accent: '#EC4899' },
          { label: '季度增长', value: '+165%', accent: '#38B2AC' },
        ]),
        highlights: json([
          '打造国内领先的交互体验实验室',
          'AI 体验设计体系已覆盖 20+ 产品线',
          '注重跨界合作，与多家创新品牌共创',
        ]),
        culture: json([
          '体验至上：关注细节，追求极致体验',
          '多元包容：团队来自 12 个国家',
          '快与稳：敏捷试验与可靠交付并行',
        ]),
        locations: json(['深圳 · 科技园', '杭州 · 滨江']),
        isVerified: true,
        isActive: true,
      },
    ];

    await prisma.company.createMany({ data: companies });

    const jobs: SeedJob[] = [
      {
        id: 'smart_pm',
        companyId: 'xinglian_space',
        title: '高级产品经理',
        category: '产品管理',
        location: '上海 · 浦东',
        salary: '25-35K · 14薪',
        experience: '5-8年经验',
        description: '负责 STAR-LINK 核心智能产品的全生命周期规划，驱动团队交付下一代智能职业服务。',
        requirements: [
          '5 年以上 ToC 产品经验，有从 0-1 推进大型项目经历',
          '熟悉 AI / SaaS 领域，具备较强的业务洞察力',
          '优秀的跨团队沟通协作能力，结果导向',
          '加分：具备团队管理经验或海外产品经验',
        ],
        responsibilities: [
          '制定产品路线图，协调业务、设计、研发对齐版本目标',
          '深入用户调研，提炼智能求职场景下的核心需求',
          '与 AI 研究团队合作，将能力转化为面向用户的体验',
          '构建数据驱动的指标体系，持续提升产品增长效率',
        ],
        highlights: [
          '核心业务线负责人，项目节奏灵活',
          '与顶级 AI 团队并肩，共建智能招聘生态',
          '远程友好，可在上海 / 深圳办公',
        ],
        perks: [
          '年度 2 次团建出境营',
          '期权激励 + 绩效奖金',
          '重视家庭友好政策，提供子女教育支持',
        ],
        skills: ['全流程产品', 'AI策略', '团队管理'],
        badgeColor: '#FF8C42',
        isRemote: true,
        level: 'SENIOR',
        type: 'FULL_TIME',
      },
      {
        id: 'smart_fe',
        companyId: 'xinghe_interactive',
        title: '资深前端工程师',
        category: '前端工程',
        location: '远程 · 北京',
        salary: '30-42K · 16薪',
        experience: '5年以上',
        description: '打造次世代跨端智能体验，连接候选人与企业的沉浸式招聘场景。',
        requirements: [
          '熟练掌握 React / TypeScript 与现代构建链路',
          '掌握 Jetpack Compose 或 Flutter 跨端技术',
          '具备前端性能优化与可视化经验',
          '加分：有大型复杂业务前端架构经验',
        ],
        responsibilities: [
          '负责 Web 与 Android Compose 组件研发，保证交互体验一致',
          '推动性能指标优化，构建可观测体系',
          '与设计 / 产品 / 后端协作，快速迭代核心功能',
          '沉淀前端工程化规范，提升研发效率',
        ],
        highlights: [
          '核心跨端框架建设者，技术影响力大',
          '双线成长：技术专家 / 技术管理',
          '远程优先，工具链完善',
        ],
        perks: [
          '远程配置补贴 + 高配设备',
          '技术大会出席支持',
          '年度健康体检及家属增益',
        ],
        skills: ['React', 'Compose', '性能优化'],
        badgeColor: '#38B2AC',
        isRemote: true,
        level: 'SENIOR',
        type: 'FULL_TIME',
      },
      {
        id: 'smart_ds',
        companyId: 'xingtu_ai',
        title: '数据科学家',
        category: '数据科学',
        location: '深圳 · 南山',
        salary: '28-45K · 15薪',
        experience: '3-5年经验',
        description: '利用大模型与数据驱动策略，为求职者构建智能匹配与成长路径。',
        requirements: [
          '熟悉机器学习 / 深度学习主流算法',
          '掌握 Python / SQL，具备良好工程能力',
          '对用户体验敏感，能将数据洞察转化为行动',
          '加分：有推荐系统或招聘领域经验',
        ],
        responsibilities: [
          '设计智能推荐与画像模型，提升匹配准确率',
          '搭建面试表现分析模型，提出优化建议',
          '与产品合作定义数据指标及实验方案',
          '沉淀可复用算法组件，推动模型上线',
        ],
        highlights: [
          '负责推荐模型 0-1 搭建，技术挑战高',
          '与海内外算法专家共事',
          '弹性办公，支持核心时段协作',
        ],
        perks: [
          '长期激励计划',
          '国际顶会投稿支持',
          '年度学习基金 2 万元',
        ],
        skills: ['机器学习', 'Python', '大模型'],
        badgeColor: '#6366F1',
        isRemote: true,
        level: 'SENIOR',
        type: 'FULL_TIME',
      },
      {
        id: 'ai_pm',
        companyId: 'xingtu_ai',
        title: 'AI 产品负责人',
        category: 'AI 产品',
        location: '北京 · 中关村',
        salary: '32-45K · 16薪',
        experience: '6年以上',
        description: '统筹智能职业助手产品线，落地多模态 AI 能力，驱动业务增长。',
        requirements: [
          '7 年以上产品经验，带领过 AI 或数据产品',
          '具备良好的战略规划与跨部门协调能力',
          '深入理解 B 端商业模式，熟悉售前流程',
          '本科及以上，计算机 / 工商管理相关专业',
        ],
        responsibilities: [
          '规划 AI 功能路线，与研究团队共建平台能力',
          '建立商业化闭环，与销售团队联动推进方案',
          '设计 A/B 实验，数据驱动优化用户体验',
          '带领团队打磨行业解决方案',
        ],
        highlights: [
          '直面管理层，影响公司战略方向',
          '资源充足，拥有独立预算',
          '年度海外学习交流',
        ],
        perks: [
          '核心骨干期权池',
          '子女教育补贴',
          '高配办公环境 + 智能实验室',
        ],
        skills: ['AI策略', '商业化', '团队管理'],
        badgeColor: '#FF8C42',
        isRemote: false,
        level: 'LEAD',
        type: 'FULL_TIME',
      },
      {
        id: 'ai_fe',
        companyId: 'xinglian_space',
        title: '全栈前端工程师',
        category: '全栈开发',
        location: '北京 · 中关村',
        salary: '28-40K · 16薪',
        experience: '5年以上',
        description: '构建一体化智能求职平台，兼顾前端体验与后端服务交付。',
        requirements: [
          '熟练掌握 React、Node.js 与数据库设计',
          '具备云原生 / Serverless 经验',
          '熟悉 CICD 流程，保障交付质量',
          '加分：有跨端或 AI 项目经验',
        ],
        responsibilities: [
          '负责候选人端与企业端核心模块研发',
          '参与 Serverless 服务设计，保障稳定性',
          '推进工程效率建设，沉淀脚手架',
          '设计监控观测体系，提升可用性',
        ],
        highlights: [
          '全链路负责，可深度参与架构设计',
          '团队氛围扁平，重视代码文化',
          '技术成长路径明确',
        ],
        perks: [
          '技术分享奖励',
          '年度体检 + 心理关怀',
          '午餐补贴与夜宵餐卡',
        ],
        skills: ['React', 'Node.js', 'Serverless'],
        badgeColor: '#38B2AC',
        isRemote: false,
        level: 'SENIOR',
        type: 'FULL_TIME',
      },
      {
        id: 'ai_ds',
        companyId: 'xinglian_space',
        title: '算法科学家',
        category: '算法研究',
        location: '北京 · 中关村',
        salary: '30-48K · 15薪',
        experience: '博士 / 3年以上',
        description: '探索人机协作的面试新范式，构建行业级 AI 交互模型。',
        requirements: [
          '博士或硕士，计算机 / 数学相关背景',
          '在顶会发表过论文或有产业化经验',
          '熟练掌握 Python、深度学习框架',
          '英语读写流利',
        ],
        responsibilities: [
          '搭建多模态理解模型，优化对话体验',
          '研究强化学习策略，实现实时反馈',
          '与产品团队协作，推动模型部署',
          '维护高质量数据集，建设评估体系',
        ],
        highlights: [
          '与空间通信实验室合作项目',
          '提供国际化科研资源',
          '专注基础研究 + 应用落地',
        ],
        perks: [
          '科研成果奖励',
          '国际会议差旅全额支持',
          '六险一金 + 丰厚补贴',
        ],
        skills: ['大模型', '强化学习', 'Python'],
        badgeColor: '#6366F1',
        isRemote: false,
        level: 'LEAD',
        type: 'FULL_TIME',
      },
      {
        id: 'op_pm',
        companyId: 'xinghe_interactive',
        title: '高级用户增长运营',
        category: '增长运营',
        location: '杭州 · 未来科技城',
        salary: '20-30K · 15薪',
        experience: '3-6年',
        description: '负责智能招聘社区增长策略，打造高活跃度的用户生态。',
        requirements: [
          '3 年以上增长运营经验，熟悉数据分析',
          '具备跨部门沟通与项目管理能力',
          '对社区生态与内容运营敏感',
          '加分：有招聘 / 教育行业经验',
        ],
        responsibilities: [
          '制定用户增长计划，搭建冷启动运营体系',
          '分析用户行为和漏斗，设计实验方案',
          '策划活动与内容合作，提升留存与转化',
          '串联产品、品牌、销售，打造运营闭环',
        ],
        highlights: [
          '覆盖用户全生命周期，挑战多',
          '核心岗位，汇报对象为运营负责人',
          '灵活福利，可申请远程办公',
        ],
        perks: [
          '年度绩效奖金',
          '专属技能培训预算',
          '弹性工时 + 下午茶',
        ],
        skills: ['用户增长', '数据分析', 'A/B测试'],
        badgeColor: '#EC4899',
        isRemote: false,
        level: 'MIDDLE',
        type: 'FULL_TIME',
      },
      {
        id: 'op_bd',
        companyId: 'xinghe_interactive',
        title: '商业化 BD 负责人',
        category: '商务拓展',
        location: '广州 · 天河',
        salary: '25-38K · 16薪',
        experience: '5年以上',
        description: '拓展企业智能招聘合作，构建行业生态与商业化闭环。',
        requirements: [
          '5 年以上 ToB 商务拓展经验',
          '具备谈判与项目推进能力',
          '熟悉人力 / 教育 / SaaS 行业生态',
          '本科及以上，具备团队管理经验',
        ],
        responsibilities: [
          '制定年度商务目标，拆解执行路径',
          '拓展重点行业客户，建立长期合作关系',
          '协同产品与交付团队，定制解决方案',
          '搭建商务团队，完善激励机制',
        ],
        highlights: [
          '一线 BD 负责人，晋升通道清晰',
          '直接对接 CEO，决策效率高',
          '可拓展全国重点客户',
        ],
        perks: [
          '高额业绩提成 + 年终',
          '商务差旅专项支持',
          '企业年金计划',
        ],
        skills: ['渠道拓展', '战略合作', '项目管理'],
        badgeColor: '#FF8C42',
        isRemote: false,
        level: 'LEAD',
        type: 'FULL_TIME',
      },
    ];

    for (const job of jobs) {
      await prisma.job.create({
        data: {
          id: job.id,
          companyId: job.companyId,
          title: job.title,
          description: job.description,
          requirements: job.requirements.join('\n'),
          salary: job.salary,
          location: job.location,
          responsibilities: job.responsibilities.join('\n'),
          level: job.level,
          skills: json(job.skills),
          benefits: job.perks.join('\n'),
          type: job.type,
          status: 'ACTIVE',
          isPublished: true,
          experience: job.experience,
          category: job.category,
          isRemote: job.isRemote,
          badgeColor: job.badgeColor,
          highlights: json(job.highlights),
        },
      });
    }

    await prisma.companyShowcase.createMany({
      data: [
        { companyId: 'xinglian_space', role: '星际通信 · L3-L5', hiringCount: 18, sortOrder: 1 },
        { companyId: 'xingtu_ai', role: 'AI 研究 · L4-L6', hiringCount: 25, sortOrder: 2 },
        { companyId: 'xinghe_interactive', role: '产品创新中心', hiringCount: 12, sortOrder: 3 },
      ],
    });

    const jobSections = [
      {
        id: 'section-featured',
        title: '为你精选',
        subtitle: '根据近期浏览行为的个性推荐',
        sortOrder: 1,
        jobIds: ['smart_pm', 'smart_fe', 'smart_ds'],
      },
      {
        id: 'section-ai-hot',
        title: 'AI/互联网热门',
        subtitle: '聚焦 AI 时代的高增长岗位',
        sortOrder: 2,
        jobIds: ['ai_pm', 'ai_fe', 'ai_ds'],
      },
      {
        id: 'section-ops-growth',
        title: '运营增长岗位',
        subtitle: '助力业务规模化的核心团队',
        sortOrder: 3,
        jobIds: ['op_pm', 'op_bd'],
      },
    ];

    for (const section of jobSections) {
      await prisma.jobSection.create({
        data: {
          id: section.id,
          title: section.title,
          subtitle: section.subtitle,
          sortOrder: section.sortOrder,
          isActive: true,
          items: {
            create: section.jobIds.map((jobId, index) => ({
              jobId,
              sortOrder: index,
            })),
          },
        },
      });
    }

    await prisma.promotedJob.createMany({
      data: [
        {
          id: 'promo-smart-pm',
          jobId: 'smart_pm',
          promotionType: 'FEATURED',
          displayFrequency: 6,
          priority: 10,
          startDate: now,
          endDate: in60Days,
          isActive: true,
          impressionCount: 1200,
          clickCount: 320,
        },
        {
          id: 'promo-smart-fe',
          jobId: 'smart_fe',
          promotionType: 'PREMIUM',
          displayFrequency: 8,
          priority: 8,
          startDate: now,
          endDate: in60Days,
          isActive: true,
          impressionCount: 980,
          clickCount: 210,
        },
        {
          id: 'promo-ai-pm',
          jobId: 'ai_pm',
          promotionType: 'NORMAL',
          displayFrequency: 10,
          priority: 6,
          startDate: now,
          endDate: in60Days,
          isActive: true,
          impressionCount: 860,
          clickCount: 156,
        },
      ],
    });

    console.log('测试数据创建完成！');
    console.log(`创建了 ${companies.length} 家企业、${jobs.length} 个职位、${jobSections.length} 个岗位分区`);

    return {
      companies: companies.length,
      jobs: jobs.length,
      jobSections: jobSections.length,
    };
  } catch (error) {
    console.error('创建测试数据失败:', error);
    throw error;
  }
}

if (require.main === module) {
  seedTestData()
    .then((result) => {
      console.log('数据插入完成:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据插入失败:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
