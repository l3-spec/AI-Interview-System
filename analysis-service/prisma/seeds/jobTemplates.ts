import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 职位面试模板种子数据
const jobInterviewTemplates = [
  {
    jobTitle: '高级Java开发工程师',
    category: '技术类',
    level: '高级',
    questionCount: 5,
    keywords: JSON.stringify(['Java', 'Spring', 'MySQL', 'Redis', 'Microservices']),
    promptTemplate: `
你是一个专业的技术面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业且具有真实感的技术面试问题，要求：
1. 每个问题都要有适当的背景描述，让问题更自然、更有情境感
2. 第一个问题应该是自我介绍和职位理解，要有行业背景铺垫
3. 包含Java基础知识、框架使用、数据库设计、系统架构等方面，每个方面都要有背景描述
4. 包含实际项目经验和问题解决能力，结合真实工作场景
5. 包含团队协作和技术发展规划，体现现代开发工作特点
6. 每个问题都要以问号结尾
7. 问题前要有背景铺垫，如："随着云计算技术的发展..."、"在微服务架构日益普及的今天..."等

候选人背景：{background}
目标公司：{companyTarget}

问题格式示例：
"随着企业数字化转型的加速，Java作为企业级开发的主流语言发挥着越来越重要的作用。请简单介绍一下您自己，以及您在Java开发方面的经验和对这个职位的理解？"

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '前端开发工程师',
    category: '技术类',
    level: '中级',
    questionCount: 5,
    keywords: JSON.stringify(['JavaScript', 'Vue', 'React', 'HTML', 'CSS']),
    promptTemplate: `
你是一个专业的前端技术面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业且具有真实感的前端面试问题，要求：
1. 每个问题都要有适当的背景描述，让问题更自然、更有情境感
2. 包含HTML/CSS基础、JavaScript进阶知识，要结合现代前端发展趋势
3. 包含前端框架(Vue/React)使用经验，体现当前技术栈的重要性
4. 包含性能优化、浏览器兼容性处理，结合用户体验的重要性
5. 包含项目经验和技术选型思考，体现前端工程化趋势
6. 每个问题都要以问号结尾
7. 问题前要有背景铺垫，如："随着移动互联网的快速发展..."、"在用户体验要求越来越高的今天..."等

候选人背景：{background}
目标公司：{companyTarget}

问题格式示例：
"随着移动端和响应式设计的重要性日益凸显，现代前端开发面临着更多的挑战和机遇。请简单介绍一下您的前端开发经验，以及您如何看待当前前端技术的发展趋势？"

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '产品经理',
    category: '管理类',
    level: '中级',
    questionCount: 5,
    keywords: JSON.stringify(['产品设计', '用户研究', '数据分析', '项目管理']),
    promptTemplate: `
你是一个专业的产品面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的产品经理面试问题，要求：
1. 包含产品思维和用户理解能力
2. 包含数据分析和市场洞察能力
3. 包含项目管理和跨部门协作经验
4. 包含具体的产品案例分析
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '销售经理',
    category: '销售类',
    level: '中级',
    questionCount: 5,
    keywords: JSON.stringify(['销售技巧', '客户管理', '业绩达成', '团队管理']),
    promptTemplate: `
你是一个专业的销售面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的销售面试问题，要求：
1. 包含销售技巧和客户沟通能力
2. 包含业绩达成和目标管理经验
3. 包含客户维护和开发能力
4. 包含团队管理和协作能力
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: 'UI/UX设计师',
    category: '设计类',
    level: '中级',
    questionCount: 5,
    keywords: JSON.stringify(['UI设计', 'UX设计', '用户体验', '设计工具']),
    promptTemplate: `
你是一个专业的设计面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的设计面试问题，要求：
1. 包含设计理念和创意思维能力
2. 包含用户体验和交互设计经验
3. 包含设计工具使用和工作流程
4. 包含具体的设计案例分析
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: 'HR专员',
    category: 'HR类',
    level: '初级',
    questionCount: 5,
    keywords: JSON.stringify(['招聘', '人力资源', '员工关系', '绩效管理']),
    promptTemplate: `
你是一个专业的HR面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的HR面试问题，要求：
1. 包含人力资源基础知识和法律法规
2. 包含招聘和员工关系处理经验
3. 包含沟通协调和问题解决能力
4. 包含具体的HR工作案例
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '数据分析师',
    category: '技术类',
    level: '中级',
    questionCount: 5,
    keywords: JSON.stringify(['数据分析', 'Python', 'SQL', '统计学', '机器学习']),
    promptTemplate: `
你是一个专业的数据分析面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的数据分析面试问题，要求：
1. 包含数据分析基础和统计学知识
2. 包含数据处理工具和编程语言使用
3. 包含实际的数据分析项目经验
4. 包含业务理解和数据洞察能力
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '运营专员',
    category: '运营类',
    level: '初级',
    questionCount: 5,
    keywords: JSON.stringify(['用户运营', '内容运营', '活动策划', '数据运营']),
    promptTemplate: `
你是一个专业的运营面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业的运营面试问题，要求：
1. 包含运营思维和用户理解能力
2. 包含内容创作和活动策划经验
3. 包含数据分析和效果评估能力
4. 包含具体的运营案例分析
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
  {
    jobTitle: '通用类',
    category: '通用类',
    level: '通用',
    questionCount: 5,
    keywords: JSON.stringify(['通用技能', '工作态度', '学习能力', '沟通协作']),
    promptTemplate: `
你是一个专业的HR面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个通用的面试问题，要求：
1. 第一个问题应该是自我介绍和职位理解
2. 包含工作经验、技能评估、解决问题能力
3. 包含团队协作、学习能力、职业规划
4. 问题要具体、实用，能够有效评估候选人的能力
5. 每个问题都要以问号结尾

候选人背景：{background}
目标公司：{companyTarget}

请直接输出问题列表，每行一个问题：
    `.trim(),
  },
];

export async function seedJobInterviewTemplates() {
  console.log('开始初始化职位面试模板数据...');

  try {
    // 清空现有模板（可选）
    // await prisma.jobInterviewTemplate.deleteMany();

    // 插入模板数据
    for (const template of jobInterviewTemplates) {
      // 先查找是否存在相同的职位模板
      const existingTemplate = await prisma.jobInterviewTemplate.findFirst({
        where: {
          jobTitle: template.jobTitle,
          category: template.category,
        },
      });

      if (existingTemplate) {
        // 如果存在，则更新
        await prisma.jobInterviewTemplate.update({
          where: { id: existingTemplate.id },
          data: template,
        });
        console.log(`更新职位模板: ${template.jobTitle}`);
      } else {
        // 如果不存在，则创建
        await prisma.jobInterviewTemplate.create({
          data: template,
        });
        console.log(`创建职位模板: ${template.jobTitle}`);
      }
    }

    console.log(`成功初始化 ${jobInterviewTemplates.length} 个职位面试模板`);
  } catch (error) {
    console.error('初始化职位面试模板失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行种子数据
if (require.main === module) {
  seedJobInterviewTemplates()
    .then(() => {
      console.log('职位面试模板种子数据初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('职位面试模板种子数据初始化失败:', error);
      process.exit(1);
    });
} 