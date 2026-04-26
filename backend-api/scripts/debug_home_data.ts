import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Home Feed Data ---');
  
  const userPostCount = await prisma.userPost.count();
  const expertPostCount = await prisma.expertPost.count();
  const companyCount = await prisma.company.count();
  const jobCount = await prisma.job.count();
  const promotedJobCount = await prisma.promotedJob.count();
  const showcaseCount = await prisma.companyShowcase.count();

  console.log(`UserPosts: ${userPostCount}`);
  console.log(`ExpertPosts: ${expertPostCount}`);
  console.log(`Companies: ${companyCount}`);
  console.log(`Jobs: ${jobCount}`);
  console.log(`PromotedJobs: ${promotedJobCount}`);
  console.log(`CompanyShowcases: ${showcaseCount}`);

  if (userPostCount === 0) {
    console.log('Creating demo UserPosts...');
    await prisma.userPost.create({
      data: {
        title: '2024届校招：大厂面试归来，这些坑你不要踩',
        content: '今天刚结束某互联网大厂的三轮技术面试，整体流程非常硬核。第一轮主要考察基础，包括JVM调优、多线程并发等；第二轮偏重系统设计；第三轮是交叉面。建议大家在准备时多关注基础底层原理，而不仅仅是API的使用。',
        isHot: true,
        tags: JSON.stringify(['校招', '大厂', '面试经验']),
        viewCount: 1250,
        likeCount: 88,
        status: 'PUBLISHED'
      }
    });
  }

  if (expertPostCount === 0) {
    console.log('Creating demo ExpertPosts...');
    await prisma.expertPost.create({
      data: {
        expertName: '张建军',
        expertTitle: '阿里巴巴 资深架构师',
        expertCompany: '阿里巴巴集团',
        title: '架构师之路：如何从零构建高可用分布式系统',
        content: '高可用系统不是一蹴而就的，而是伴随业务增长逐步演进的。在初期，我们应该关注代码的清晰度和可维护性；中期引入中间件进行解耦；后期则需要全链路压测和精细化运维。',
        isTop: true,
        tags: JSON.stringify(['架构设计', '后端', '分布式']),
        viewCount: 3500,
        publishedAt: new Date(),
      }
    });
  }

  console.log('--- Data Check Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
