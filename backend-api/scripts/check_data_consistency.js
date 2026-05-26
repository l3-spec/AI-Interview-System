/**
 * 数据一致性检查脚本
 * 检查用户、帖子、企业、职位的关联关系
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 数据一致性检查 ===\n');
  
  // 1. 检查用户
  console.log('👥 用户统计:');
  const totalUsers = await prisma.user.count();
  console.log(`  总用户数: ${totalUsers}`);
  
  // 2. 检查帖子
  console.log('\n 帖子统计:');
  const totalPosts = await prisma.userPost.count();
  const postsWithAuthor = await prisma.userPost.count({
    where: { authorId: { not: null } }
  });
  const postsWithoutAuthor = await prisma.userPost.count({
    where: { authorId: null }
  });
  console.log(`  总帖子数: ${totalPosts}`);
  console.log(`  有作者: ${postsWithAuthor}`);
  console.log(`  无作者: ${postsWithoutAuthor}`);
  
  // 查找帖子作者不在用户表中的情况
  const postsWithInvalidAuthor = await prisma.userPost.findMany({
    where: {
      authorId: {
        notIn: (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
      }
    },
    select: {
      id: true,
      title: true,
      authorId: true
    }
  });
  
  if (postsWithInvalidAuthor.length > 0) {
    console.log(`  ❌ 发现 ${postsWithInvalidAuthor.length} 个帖子的作者ID无效:`);
    postsWithInvalidAuthor.slice(0, 5).forEach(post => {
      console.log(`     - ${post.title} (authorId: ${post.authorId})`);
    });
  }
  
  // 3. 检查企业
  console.log('\n🏢 企业统计:');
  const totalCompanies = await prisma.company.count();
  console.log(`  总企业数: ${totalCompanies}`);
  
  // 4. 检查职位
  console.log('\n 职位统计:');
  const totalJobs = await prisma.job.count();
  const jobsWithCompany = await prisma.job.count({
    where: { companyId: { not: null } }
  });
  console.log(`  总职位数: ${totalJobs}`);
  console.log(`  有企业: ${jobsWithCompany}`);
  
  // 查找职位所属企业不存在的情况
  const jobsWithInvalidCompany = await prisma.job.findMany({
    where: {
      companyId: {
        notIn: (await prisma.company.findMany({ select: { id: true } })).map(c => c.id)
      }
    },
    select: {
      id: true,
      title: true,
      companyId: true
    }
  });
  
  if (jobsWithInvalidCompany.length > 0) {
    console.log(`  ❌ 发现 ${jobsWithInvalidCompany.length} 个职位的企业ID无效:`);
    jobsWithInvalidCompany.slice(0, 5).forEach(job => {
      console.log(`     - ${job.title} (companyId: ${job.companyId})`);
    });
  }
  
  // 5. 检查具体帖子作者
  console.log('\n 帖子作者详情（前20个）:');
  const samplePosts = await prisma.userPost.findMany({
    take: 20,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  samplePosts.forEach((post, i) => {
    if (post.author) {
      console.log(`  ${i+1}. ${post.title.substring(0, 20)}... -> ${post.author.name} (${post.author.email})`);
    } else {
      console.log(`  ${i+1}. ${post.title.substring(0, 20)}... -> ❌ 无作者 (authorId: ${post.authorId})`);
    }
  });
  
  // 6. 检查所有用户是否都有帖子
  console.log('\n👤 用户发帖统计:');
  const usersWithPosts = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          posts: true
        }
      }
    }
  });
  
  const usersWithoutPosts = usersWithPosts.filter(u => u._count.posts === 0);
  const usersWithPostsCount = usersWithPosts.filter(u => u._count.posts > 0);
  
  console.log(`  有帖子的用户: ${usersWithPostsCount.length}`);
  console.log(`  无帖子的用户: ${usersWithoutPosts.length}`);
  
  // 7. 检查企业和职位
  console.log('\n🏢 企业职位统计:');
  const companiesWithJobs = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          jobs: true
        }
      }
    }
  });
  
  companiesWithJobs.forEach(company => {
    console.log(`  ${company.name}: ${company._count.jobs} 个职位`);
  });
  
  console.log('\n=== 检查完成 ===');
}

main()
  .catch(e => console.error('检查失败:', e))
  .finally(() => prisma.$disconnect());
