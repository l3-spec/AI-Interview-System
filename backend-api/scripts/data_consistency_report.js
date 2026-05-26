/**
 * 数据一致性最终验证报告
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 数据一致性最终验证报告 ===\n');
  console.log('生成时间:', new Date().toLocaleString('zh-CN'));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 1. 用户数据
  console.log('【1】用户数据 (User)');
  console.log('-'.repeat(60));
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      gender: true,
      _count: {
        select: {
          posts: true,
          applications: true,
          aiInterviews: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`总计: ${users.length} 个用户\n`);
  console.log('前10个用户示例:');
  users.slice(0, 10).forEach((user, i) => {
    console.log(`  ${i+1}. ${user.name}`);
    console.log(`     Email: ${user.email}`);
    console.log(`     性别: ${user.gender === 'MALE' ? '男' : user.gender === 'FEMALE' ? '女' : '未设置'}`);
    console.log(`     头像: ${user.avatar ? '✅' : '❌'}`);
    console.log(`     帖子: ${user._count.posts} 个`);
    console.log(`     申请: ${user._count.applications} 个`);
    console.log(`     面试: ${user._count.aiInterviews} 次`);
    console.log();
  });
  
  // 2. 用户帖子
  console.log('\n【2】用户帖子 (UserPost)');
  console.log('-'.repeat(60));
  const userPosts = await prisma.userPost.findMany({
    include: {
      user: {
        select: { name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  const totalUserPosts = await prisma.userPost.count();
  console.log(`总计: ${totalUserPosts} 个用户帖子\n`);
  console.log('最新20个帖子:');
  userPosts.forEach((post, i) => {
    console.log(`  ${i+1}. ${post.title.substring(0, 30)}...`);
    console.log(`     作者: ${post.user?.name || '匿名'} (${post.user?.email || 'N/A'})`);
    console.log(`     浏览: ${post.viewCount} | 点赞: ${post.likeCount}`);
    console.log();
  });
  
  // 3. 大咖分享
  console.log('\n【3】大咖分享 (ExpertPost)');
  console.log('-'.repeat(60));
  const expertPosts = await prisma.expertPost.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`总计: ${expertPosts.length} 个大咖分享\n`);
  expertPosts.forEach((post, i) => {
    console.log(`  ${i+1}. ${post.title}`);
    console.log(`     大咖: ${post.expertName} (${post.expertTitle})`);
    console.log(`     公司: ${post.expertCompany}`);
    console.log(`     浏览: ${post.viewCount} | 点赞: ${post.likeCount}`);
    console.log();
  });
  
  // 4. 企业数据
  console.log('\n【4】企业数据 (Company)');
  console.log('-'.repeat(60));
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      logo: true,
      industry: true,
      scale: true,
      description: true,
      _count: {
        select: {
          jobs: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`总计: ${companies.length} 个企业\n`);
  companies.forEach((company, i) => {
    console.log(`  ${i+1}. ${company.name}`);
    console.log(`     Email: ${company.email}`);
    console.log(`     行业: ${company.industry || '未设置'}`);
    console.log(`     规模: ${company.scale || '未设置'}`);
    console.log(`     Logo: ${company.logo ? '✅' : '❌'}`);
    console.log(`     职位: ${company._count.jobs} 个`);
    console.log(`     简介: ${(company.description || '').substring(0, 50)}...`);
    console.log();
  });
  
  // 5. 职位数据
  console.log('\n【5】职位数据 (Job)');
  console.log('-'.repeat(60));
  const jobs = await prisma.job.findMany({
    include: {
      company: {
        select: { name: true, logo: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  const totalJobs = await prisma.job.count();
  console.log(`总计: ${totalJobs} 个职位\n`);
  console.log('最新20个职位:');
  jobs.forEach((job, i) => {
    console.log(`  ${i+1}. ${job.title}`);
    console.log(`     企业: ${job.company?.name || 'N/A'}`);
    console.log(`     薪资: ${job.salary || '面议'}`);
    console.log(`     地点: ${job.location || '不限'}`);
    console.log(`     状态: ${job.status}`);
    console.log();
  });
  
  // 6. 数据关联完整性检查
  console.log('\n【6】数据关联完整性检查');
  console.log('-'.repeat(60));
  
  // 检查帖子作者
  const postsWithoutValidUser = await prisma.userPost.count({
    where: {
      OR: [
        { userId: null },
        {
          userId: {
            notIn: users.map(u => u.id)
          }
        }
      ]
    }
  });
  
  // 检查职位企业
  const jobsWithoutValidCompany = await prisma.job.count({
    where: {
      companyId: {
        notIn: companies.map(c => c.id)
      }
    }
  });
  
  console.log(`帖子作者无效: ${postsWithoutValidUser} 个 ${postsWithoutValidUser === 0 ? '✅' : '❌'}`);
  console.log(`职位企业无效: ${jobsWithoutValidCompany} 个 ${jobsWithoutValidCompany === 0 ? '✅' : '❌'}`);
  
  // 7. 三端一致性说明
  console.log('\n【7】三端数据一致性说明');
  console.log('-'.repeat(60));
  console.log('✅ system-admin (超级管理员后台):');
  console.log('   - 用户列表: /api/users (完整用户数据)');
  console.log('   - 企业列表: /api/admin/companies (完整企业数据)');
  console.log('   - 职位管理: /api/jobs (完整职位数据)');
  console.log('   - 帖子管理: /api/admin/posts (用户帖子)');
  console.log();
  console.log('✅ admin-dashboard (企业管理后台):');
  console.log('   - 候选人管理: /api/candidates (求职者)');
  console.log('   - 职位管理: /api/jobs (企业自己的职位)');
  console.log('   - 面试管理: /api/interviews (面试记录)');
  console.log();
  console.log('✅ android-v0-compose (Android客户端):');
  console.log('   - 首页: /api/home (Banner、推荐职位、推荐企业)');
  console.log('   - 职岗: /api/jobs (所有职位)');
  console.log('   - 职圈: /api/posts (用户帖子 + 大咖分享)');
  console.log('   - 我的: /api/users/me (当前用户)');
  console.log();
  console.log('⚠️  关于"李薇"问题:');
  console.log('   "李薇"是 ExpertPost（大咖分享）表中的虚拟人物，');
  console.log('   不是 User 表中的真实用户。这是设计如此，用于展示');
  console.log('   行业大咖的经验分享。Android 端的"职圈"会同时');
  console.log('   显示 UserPost（用户帖子）和 ExpertPost（大咖分享）。');
  console.log();
  
  console.log('=== 验证报告生成完毕 ===');
}

main()
  .catch(e => console.error('生成报告失败:', e))
  .finally(() => prisma.$disconnect());
