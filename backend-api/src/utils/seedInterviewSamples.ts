import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type AbilityScores = {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  teamwork: number;
  leadership: number;
  creativity: number;
  adaptability: number;
};

interface SampleInterview {
  id: string;
  candidateId: string;
  startTime: Date;
  duration: number;
  score: number;
  feedback: string;
  abilities: AbilityScores;
  strengths: string[];
  improvements: string[];
  summary?: string;
  questions: Array<{
    id: string;
    content: string;
    type: 'TECHNICAL' | 'BEHAVIOR' | 'EXPERIENCE';
    answer: string;
    score: number;
    duration: number;
  }>;
}

const abilityProfile = (
  technicalSkills: number,
  communication: number,
  problemSolving: number,
  teamwork: number,
  leadership: number,
  creativity: number,
  adaptability: number
): AbilityScores => ({
  technicalSkills,
  communication,
  problemSolving,
  teamwork,
  leadership,
  creativity,
  adaptability,
});

async function ensureDemoCompanyAndJob(passwordHash: string) {
  const company = await prisma.company.upsert({
    where: { id: 'demo_ai_company' },
    update: {
      name: '星云智聘',
      email: 'demo-company@ai-interview.local',
      description:
        '星云智聘聚焦 AI 面试与人才洞察，提供端到端的招聘创新解决方案，覆盖视频评估、智能评分与能力画像。',
      industry: 'AI / HR-Tech',
      scale: '200-500人',
      address: '上海 · 浦东新区',
      website: 'https://demo.ai-interview.local',
      contact: '021-88886666',
      tagline: 'AI 招聘加速器',
      focusArea: '智能面试 · 职业画像',
      themeColors: JSON.stringify(['#2563eb', '#7c3aed']),
      stats: JSON.stringify([
        { label: '服务企业', value: '180+', accent: '#2563eb' },
        { label: 'AI 专利', value: '42 项', accent: '#7c3aed' },
        { label: '面试成功率', value: '92%', accent: '#14b8a6' },
      ]),
      highlights: JSON.stringify([
        'AI 面试场景覆盖 30+ 职能',
        '沉浸式候选人体验，支持多语言',
        '企业级安全合规体系',
      ]),
      culture: JSON.stringify([
        '开放创新：支持跨部门实验共创',
        '精益成长：持续迭代人才评估模型',
        '关注候选人体验：打造温暖的科技产品',
      ]),
      locations: JSON.stringify(['上海 · 浦东新区', '成都 · 高新区']),
      isVerified: true,
      isActive: true,
    },
    create: {
      id: 'demo_ai_company',
      email: 'demo-company@ai-interview.local',
      password: passwordHash,
      name: '星云智聘',
      description:
        '星云智聘聚焦 AI 面试与人才洞察，提供端到端的招聘创新解决方案，覆盖视频评估、智能评分与能力画像。',
      industry: 'AI / HR-Tech',
      scale: '200-500人',
      address: '上海 · 浦东新区',
      website: 'https://demo.ai-interview.local',
      contact: '021-88886666',
      tagline: 'AI 招聘加速器',
      focusArea: '智能面试 · 职业画像',
      themeColors: JSON.stringify(['#2563eb', '#7c3aed']),
      stats: JSON.stringify([
        { label: '服务企业', value: '180+', accent: '#2563eb' },
        { label: 'AI 专利', value: '42 项', accent: '#7c3aed' },
        { label: '面试成功率', value: '92%', accent: '#14b8a6' },
      ]),
      highlights: JSON.stringify([
        'AI 面试场景覆盖 30+ 职能',
        '沉浸式候选人体验，支持多语言',
        '企业级安全合规体系',
      ]),
      culture: JSON.stringify([
        '开放创新：支持跨部门实验共创',
        '精益成长：持续迭代人才评估模型',
        '关注候选人体验：打造温暖的科技产品',
      ]),
      locations: JSON.stringify(['上海 · 浦东新区', '成都 · 高新区']),
      isVerified: true,
      isActive: true,
    },
  });

  const job = await prisma.job.upsert({
    where: { id: 'demo_fullstack_engineer' },
    update: {
      companyId: company.id,
      title: '全栈工程师（AI 面试平台）',
      description:
        '负责 AI 面试管理后台与候选人工作台的全栈研发，参与面试大模型工具链建设与能力画像组件迭代。',
      requirements:
        '5 年以上前后端开发经验；熟悉 React / Node.js 技术栈；了解微服务与云原生架构；具备良好的业务拆解能力。',
      responsibilities:
        '规划并实现 AI 面试平台核心功能；与算法、产品协作，落地候选人画像与数据看板；保障系统性能与稳定性。',
      salary: '28-36K · 15薪',
      location: '上海 · 浦东新区',
      level: 'SENIOR',
      skills: JSON.stringify(['React', 'TypeScript', 'Node.js', '微服务', '云原生']),
      benefits: '六险一金\n弹性工作\n年度技术大会',
      experience: '5-8年',
      category: '技术研发',
      type: 'FULL_TIME',
      status: 'ACTIVE',
      isPublished: true,
      isRemote: false,
      badgeColor: '#2563eb',
      highlights: JSON.stringify([
        'AI 面试核心项目核心成员',
        '接触面试大模型与音视频处理链路',
        '弹性办公 + 远程协作工具链',
      ]),
    },
    create: {
      id: 'demo_fullstack_engineer',
      companyId: company.id,
      title: '全栈工程师（AI 面试平台）',
      description:
        '负责 AI 面试管理后台与候选人工作台的全栈研发，参与面试大模型工具链建设与能力画像组件迭代。',
      requirements:
        '5 年以上前后端开发经验；熟悉 React / Node.js 技术栈；了解微服务与云原生架构；具备良好的业务拆解能力。',
      responsibilities:
        '规划并实现 AI 面试平台核心功能；与算法、产品协作，落地候选人画像与数据看板；保障系统性能与稳定性。',
      salary: '28-36K · 15薪',
      location: '上海 · 浦东新区',
      level: 'SENIOR',
      skills: JSON.stringify(['React', 'TypeScript', 'Node.js', '微服务', '云原生']),
      benefits: '六险一金\n弹性工作\n年度技术大会',
      experience: '5-8年',
      category: '技术研发',
      type: 'FULL_TIME',
      status: 'ACTIVE',
      isPublished: true,
      isRemote: false,
      badgeColor: '#2563eb',
      highlights: JSON.stringify([
        'AI 面试核心项目核心成员',
        '接触面试大模型与音视频处理链路',
        '弹性办公 + 远程协作工具链',
      ]),
    },
  });

  return { company, job };
}

async function ensureCandidates(passwordHash: string) {
  const candidates = [
    {
      id: 'candidate_henry',
      name: 'Henry Zhang',
      email: 'henry.zhang@talent.ai',
      phone: '13800000001',
      gender: 'MALE',
      age: 28,
      education: '本科',
      experience: '5年',
      skills: ['React', 'TypeScript', 'Node.js', '微服务', 'CI/CD'],
    },
    {
      id: 'candidate_sarah',
      name: 'Sarah Li',
      email: 'sarah.li@talent.ai',
      phone: '13800000002',
      gender: 'FEMALE',
      age: 26,
      education: '硕士',
      experience: '3年',
      skills: ['Vue.js', 'Java', 'Spring Boot', 'MySQL', 'Redis'],
    },
    {
      id: 'candidate_mike',
      name: 'Mike Wang',
      email: 'mike.wang@talent.ai',
      phone: '13800000003',
      gender: 'MALE',
      age: 30,
      education: '本科',
      experience: '7年',
      skills: ['Angular', '.NET Core', 'Azure', 'SQL Server', 'System Design'],
    },
  ];

  for (const candidate of candidates) {
    await prisma.user.upsert({
      where: { id: candidate.id },
      update: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        gender: candidate.gender,
        age: candidate.age,
        education: candidate.education,
        experience: candidate.experience,
        skills: JSON.stringify(candidate.skills),
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        id: candidate.id,
        email: candidate.email,
        password: passwordHash,
        name: candidate.name,
        phone: candidate.phone,
        gender: candidate.gender,
        age: candidate.age,
        education: candidate.education,
        experience: candidate.experience,
        skills: JSON.stringify(candidate.skills),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidate.name)}`,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 120 + 30)),
      },
    });
  }
}

function buildSummaryPayload(sample: SampleInterview) {
  return JSON.stringify({
    overallScore: sample.score,
    feedback: sample.feedback,
    strengths: sample.strengths,
    improvements: sample.improvements,
    abilities: sample.abilities,
    summary: sample.summary ?? sample.feedback,
  });
}

async function seedSampleInterviews(companyId: string, jobId: string) {
  const interviews: SampleInterview[] = [
    {
      id: 'demo_interview_henry',
      candidateId: 'candidate_henry',
      startTime: new Date('2024-05-18T01:00:00Z'),
      duration: 50,
      score: 8.6,
      feedback: '具备扎实的全栈能力，沟通与业务拆解表现突出，适合带领小型项目团队。',
      abilities: abilityProfile(8.8, 8.4, 8.6, 8.2, 8.0, 7.8, 7.9),
      strengths: ['技术深度与代码质量高', '沟通表达清晰', '能快速定位问题并提出解决方案'],
      improvements: ['可以更主动提出跨职能协作方案'],
      questions: [
        {
          id: 'demo_interview_henry_q1',
          content: '请介绍一个你主导的全栈项目，并说明最大的技术挑战。',
          type: 'TECHNICAL',
          answer: '介绍了智能面试平台的微前端改造与 BFF 层设计。',
          score: 8.5,
          duration: 320,
        },
        {
          id: 'demo_interview_henry_q2',
          content: '当业务需求与技术实现冲突时，你会如何处理？',
          type: 'BEHAVIOR',
          answer: '强调数据驱动的方案评估、快速原型以及与产品深度沟通。',
          score: 8.8,
          duration: 260,
        },
        {
          id: 'demo_interview_henry_q3',
          content: '对于团队新人，你会如何帮助他快速融入并承担任务？',
          type: 'EXPERIENCE',
          answer: '描述了 Pair Programming、任务拆解与定期 Sync 的实践。',
          score: 8.2,
          duration: 220,
        },
      ],
    },
    {
      id: 'demo_interview_sarah',
      candidateId: 'candidate_sarah',
      startTime: new Date('2024-05-20T05:30:00Z'),
      duration: 45,
      score: 7.9,
      feedback: '具备扎实的后端基础与学习能力，推荐继续观察大型系统设计经验。',
      abilities: abilityProfile(7.8, 7.6, 7.9, 7.4, 7.2, 7.5, 8.1),
      strengths: ['代码结构清晰', '学习能力强', '对分布式系统有基础理解'],
      improvements: ['多参与复杂系统设计', '强化业务沟通的引导能力'],
      questions: [
        {
          id: 'demo_interview_sarah_q1',
          content: '谈谈你在高并发订单系统中的经验，以及如何保证一致性。',
          type: 'TECHNICAL',
          answer: '介绍消息队列、重试机制与数据库分表策略。',
          score: 7.8,
          duration: 280,
        },
        {
          id: 'demo_interview_sarah_q2',
          content: '遇到跨团队沟通不顺畅时，你是如何推进项目落地的？',
          type: 'BEHAVIOR',
          answer: '分享了建立统一需求文档与明确交付节点的做法。',
          score: 7.6,
          duration: 210,
        },
        {
          id: 'demo_interview_sarah_q3',
          content: 'AI 能力落地给你当前团队带来了什么变化？',
          type: 'EXPERIENCE',
          answer: '提到自动化测试覆盖率提升与日志智能分析。',
          score: 8.2,
          duration: 230,
        },
      ],
    },
    {
      id: 'demo_interview_mike',
      candidateId: 'candidate_mike',
      startTime: new Date('2024-05-22T02:15:00Z'),
      duration: 55,
      score: 8.2,
      feedback: '在云原生与平台工程方面经验丰富，沟通稳健，适合作为技术骨干。',
      abilities: abilityProfile(8.4, 7.8, 8.3, 7.6, 8.0, 7.2, 7.5),
      strengths: ['熟悉云平台治理', '风险意识强', '擅长培训与指导新人'],
      improvements: ['可以进一步提升跨地域协作效率'],
      questions: [
        {
          id: 'demo_interview_mike_q1',
          content: '如何设计一套可扩展的日志采集与告警系统？',
          type: 'TECHNICAL',
          answer: '介绍了 ELK + Prometheus + 自适应阈值的组合方案。',
          score: 8.5,
          duration: 310,
        },
        {
          id: 'demo_interview_mike_q2',
          content: '面对突发的线上事故，你会如何组织协同与复盘？',
          type: 'BEHAVIOR',
          answer: '强调 Runbook、冷静分工与事后 blame-free 复盘。',
          score: 8.1,
          duration: 260,
        },
        {
          id: 'demo_interview_mike_q3',
          content: '谈谈你在多云环境下保证成本可控的实践。',
          type: 'EXPERIENCE',
          answer: '提到了资源标签、自动化关停策略与 FinOps 协作模式。',
          score: 8.0,
          duration: 240,
        },
      ],
    },
  ];

  for (const sample of interviews) {
    const endTime = new Date(sample.startTime.getTime() + sample.duration * 60 * 1000);

    await prisma.interview.upsert({
      where: { id: sample.id },
      update: {
        status: 'COMPLETED',
        startTime: sample.startTime,
        endTime,
        duration: sample.duration,
        score: sample.score,
        feedback: sample.feedback,
        userId: sample.candidateId,
        jobId,
        companyId,
        updatedAt: new Date(),
      },
      create: {
        id: sample.id,
        status: 'COMPLETED',
        startTime: sample.startTime,
        endTime,
        duration: sample.duration,
        score: sample.score,
        feedback: sample.feedback,
        userId: sample.candidateId,
        jobId,
        companyId,
      },
    });

    await prisma.interviewReport.upsert({
      where: { interviewId: sample.id },
      update: {
        overallScore: sample.score,
        summary: buildSummaryPayload(sample),
      },
      create: {
        id: `${sample.id}-report`,
        interviewId: sample.id,
        overallScore: sample.score,
        summary: buildSummaryPayload(sample),
      },
    });

    await prisma.question.deleteMany({ where: { interviewId: sample.id } });

    if (sample.questions.length) {
      await prisma.question.createMany({
        data: sample.questions.map((question) => ({
          id: question.id,
          interviewId: sample.id,
          content: question.content,
          type: question.type,
          answer: question.answer,
          score: question.score,
          duration: question.duration,
        })),
      });
    }
  }
}

export async function seedInterviewSamples() {
  try {
    console.log('开始写入示例面试数据...');

    const passwordHash = await bcrypt.hash('Demo@123456', 10);
    const { company, job } = await ensureDemoCompanyAndJob(passwordHash);

    await ensureCandidates(passwordHash);

    await seedSampleInterviews(company.id, job.id);

    console.log('示例面试数据写入完成 ✅');
  } catch (error) {
    console.error('写入示例面试数据失败:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedInterviewSamples();
}
