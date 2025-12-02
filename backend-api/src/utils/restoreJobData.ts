import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 恢复职岗数据 - 创建示例职位
 */
export async function restoreJobData() {
  try {
    console.log('🔄 开始恢复职岗数据...');

    // 确保企业存在
    const company = await prisma.company.findFirst({
      where: { email: 'admin@aiinterview.com' }
    });

    if (!company) {
      console.log('❌ 找不到企业账户，请先运行初始化脚本');
      return;
    }

    // 示例职位数据
    const jobsData = [
      {
        id: 'job-frontend-1',
        title: '前端开发工程师',
        description: `我们正在寻找一位经验丰富的前端开发工程师加入我们的团队。您将负责：

• 开发和维护用户界面组件
• 与后端API集成
• 优化前端性能
• 参与产品设计讨论
• 确保跨浏览器兼容性

要求：
• 3年以上前端开发经验
• 精通React/Vue.js等现代前端框架
• 熟悉TypeScript、HTML5、CSS3
• 了解Webpack、Vite等构建工具
• 具备良好的团队协作能力`,
        requirements: JSON.stringify([
          '本科及以上学历，计算机相关专业',
          '3年以上前端开发经验',
          '精通React/Vue.js框架',
          '熟悉TypeScript开发',
          '了解前端工程化工具',
          '具备良好的代码规范意识'
        ]),
        skills: JSON.stringify([
          'React', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 
          'Webpack', 'Git', 'REST API', 'Responsive Design'
        ]),
        salary: '15K-25K',
        location: '北京市海淀区',
        type: 'FULL_TIME',
        level: 'MIDDLE',
        status: 'ACTIVE',
        companyId: company.id
      },
      {
        id: 'job-backend-1',
        title: 'Java后端开发工程师',
        description: `我们寻找一位资深的Java后端开发工程师，负责核心业务系统的开发和维护：

• 设计和开发高性能的后端服务
• 参与系统架构设计
• 数据库设计和优化
• API接口开发和文档编写
• 代码审查和技术分享

技术栈：
• Java 8+、Spring Boot、Spring Cloud
• MySQL、Redis、MongoDB
• RabbitMQ、Kafka
• Docker、Kubernetes
• 微服务架构`,
        requirements: JSON.stringify([
          '本科及以上学历',
          '5年以上Java开发经验',
          '熟悉Spring生态体系',
          '有微服务架构经验',
          '了解分布式系统设计',
          '具备性能调优能力'
        ]),
        skills: JSON.stringify([
          'Java', 'Spring Boot', 'Spring Cloud', 'MySQL', 'Redis',
          'Docker', 'Kubernetes', 'Microservices', 'RabbitMQ'
        ]),
        salary: '20K-35K',
        location: '北京市朝阳区',
        type: 'FULL_TIME',
        level: 'SENIOR',
        status: 'ACTIVE',
        companyId: company.id
      },
      {
        id: 'job-product-1',
        title: '产品经理',
        description: `我们正在寻找一位充满激情的产品经理，负责AI面试产品的规划和优化：

• 产品需求分析和功能规划
• 用户体验设计和优化
• 跨部门协调和沟通
• 竞品分析和市场调研
• 产品数据分析和迭代

我们希望您：
• 有2-3年产品管理经验
• 熟悉B2B产品设计
• 具备数据分析能力
• 有AI或SaaS产品经验优先
• 优秀的沟通和协调能力`,
        requirements: JSON.stringify([
          '本科及以上学历',
          '2-3年产品经理经验',
          '熟悉B2B产品设计流程',
          '具备数据分析能力',
          '有AI产品经验优先',
          '优秀的沟通协调能力'
        ]),
        skills: JSON.stringify([
          'Product Management', 'User Experience', 'Data Analysis',
          'Agile', 'Prototyping', 'Market Research', 'B2B'
        ]),
        salary: '18K-30K',
        location: '上海市浦东新区',
        type: 'FULL_TIME',
        level: 'MIDDLE',
        status: 'ACTIVE',
        companyId: company.id
      },
      {
        id: 'job-ai-1',
        title: 'AI算法工程师',
        description: `加入我们的AI团队，参与智能面试算法的研发：

• 自然语言处理模型开发
• 语音识别和语义分析
• 机器学习模型训练和优化
• AI模型部署和性能优化
• 算法效果评估和改进

技术要求：
• 深度学习框架：TensorFlow/PyTorch
• 自然语言处理技术
• 计算机视觉基础
• Python编程能力
• 云平台部署经验`,
        requirements: JSON.stringify([
          '硕士及以上学历，AI相关专业',
          '3年以上AI算法经验',
          '熟悉深度学习框架',
          '有NLP项目经验',
          '强化学习经验优先',
          '发表过相关论文优先'
        ]),
        skills: JSON.stringify([
          'Python', 'TensorFlow', 'PyTorch', 'NLP', 'Machine Learning',
          'Deep Learning', 'Computer Vision', 'Data Science'
        ]),
        salary: '25K-45K',
        location: '深圳市南山区',
        type: 'FULL_TIME',
        level: 'SENIOR',
        status: 'ACTIVE',
        companyId: company.id
      },
      {
        id: 'job-ui-1',
        title: 'UI/UX设计师',
        description: `我们需要一位富有创意的UI/UX设计师，负责产品界面和用户体验设计：

• 产品界面设计和交互设计
• 用户体验研究和优化
• 设计规范和组件库维护
• 与产品和开发团队协作
• 用户测试和反馈收集

设计能力：
• 精通Figma、Sketch等设计工具
• 具备良好的视觉设计能力
• 理解用户体验设计原则
• 有移动端设计经验
• 了解前端开发基础知识`,
        requirements: JSON.stringify([
          '本科及以上学历，设计相关专业',
          '2年以上UI/UX设计经验',
          '精通主流设计工具',
          '有B2B产品设计经验',
          '具备用户研究能力',
          '良好的沟通表达能力'
        ]),
        skills: JSON.stringify([
          'Figma', 'Sketch', 'Adobe Creative Suite', 'Prototyping',
          'User Research', 'Interaction Design', 'Visual Design'
        ]),
        salary: '12K-20K',
        location: '杭州市西湖区',
        type: 'FULL_TIME',
        level: 'MIDDLE',
        status: 'ACTIVE',
        companyId: company.id
      },
      {
        id: 'job-intern-1',
        title: '前端开发实习生',
        description: `我们为即将毕业的同学提供前端开发实习机会：

• 参与真实项目开发
• 学习现代前端技术栈
• 接受资深工程师指导
• 参与团队技术分享
• 有转正机会

实习收获：
• 完整的项目开发经验
• 前端工程化实践
• 团队协作经验
• 技术能力提升
• 职业发展指导`,
        requirements: JSON.stringify([
          '计算机相关专业在读',
          '有前端开发基础',
          '了解React或Vue',
          '实习期3个月以上',
          '学习能力强',
          '有责任心和团队精神'
        ]),
        skills: JSON.stringify([
          'JavaScript', 'HTML', 'CSS', 'React', 'Git', 'npm'
        ]),
        salary: '3K-5K',
        location: '北京市海淀区',
        type: 'INTERNSHIP',
        level: 'INTERN',
        status: 'ACTIVE',
        companyId: company.id
      }
    ];

    // 创建职位
    for (const jobData of jobsData) {
      const existingJob = await prisma.job.findUnique({
        where: { id: jobData.id }
      });

      if (!existingJob) {
        await prisma.job.create({
          data: jobData
        });
        console.log(`✅ 创建职位: ${jobData.title}`);
      } else {
        console.log(`ℹ️  职位已存在: ${jobData.title}`);
      }
    }

    // 创建一些模拟申请记录
    const users = await prisma.user.findMany();
    if (users.length > 0) {
      const jobs = await prisma.job.findMany();
      let applicationCount = 0;

      for (const job of jobs.slice(0, 3)) { // 只为前3个职位创建申请
        for (const user of users.slice(0, 1)) { // 只用第一个用户
          const existingApplication = await prisma.jobApplication.findFirst({
            where: {
              jobId: job.id,
              userId: user.id
            }
          });

          if (!existingApplication) {
            await prisma.jobApplication.create({
              data: {
                id: `application-${job.id}-${user.id}`,
                jobId: job.id,
                userId: user.id,
                status: 'PENDING',
                message: '我对这个职位很感兴趣，希望能有机会面试。我有相关的工作经验和技能，相信能够胜任这个岗位。'
              }
            });
            applicationCount++;
          }
        }
      }
      console.log(`✅ 创建了 ${applicationCount} 个申请记录`);
    }

    console.log('🎉 职岗数据恢复完成！');
    console.log('');
    console.log('📊 统计信息:');
    
    const stats = {
      totalJobs: await prisma.job.count(),
      activeJobs: await prisma.job.count({ where: { status: 'ACTIVE' } }),
      totalApplications: await prisma.jobApplication.count()
    };

    console.log(`   📝 总职位数: ${stats.totalJobs}`);
    console.log(`   ✅ 活跃职位: ${stats.activeJobs}`);
    console.log(`   📋 总申请数: ${stats.totalApplications}`);
    console.log('');

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('❌ 恢复职岗数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件，则执行恢复
if (require.main === module) {
  restoreJobData()
    .then((result) => {
      console.log('职岗数据恢复完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('职岗数据恢复失败:', error);
      process.exit(1);
    });
} 