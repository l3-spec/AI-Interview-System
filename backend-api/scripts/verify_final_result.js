/**
 * 验证最终效果
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证最终效果 ===\n');
  
  // 1. 验证用户
  console.log('👥 用户数据验证:');
  const sampleUsers = await prisma.user.findMany({
    take: 10,
    select: {
      name: true,
      email: true,
      avatar: true,
      gender: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`\n前10个用户:`);
  sampleUsers.forEach((user, i) => {
    console.log(`  ${i+1}. ${user.name} (${user.gender === 'MALE' ? '男' : user.gender === 'FEMALE' ? '女' : '未设置'})`);
    console.log(`     Email: ${user.email}`);
    console.log(`     Avatar: ${user.avatar ? '✅ ' + user.avatar.substring(0, 60) + '...' : '❌ 无'}`);
    console.log();
  });
  
  // 统计
  const usersTotal = await prisma.user.count();
  const usersWithAvatar = await prisma.user.count({ where: { avatar: { not: null } } });
  console.log(`总计: ${usersWithAvatar}/${usersTotal} 个用户有头像\n`);
  
  // 2. 验证企业
  console.log(' 企业数据验证:');
  const sampleCompanies = await prisma.company.findMany({
    take: 10,
    select: {
      name: true,
      email: true,
      logo: true,
      description: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`\n前10个企业:`);
  sampleCompanies.forEach((company, i) => {
    console.log(`  ${i+1}. ${company.name}`);
    console.log(`     Email: ${company.email}`);
    console.log(`     Logo: ${company.logo ? '✅ ' + company.logo.substring(0, 60) + '...' : '❌ 无'}`);
    console.log();
  });
  
  // 统计
  const companiesTotal = await prisma.company.count();
  const companiesWithLogo = await prisma.company.count({ where: { logo: { not: null } } });
  console.log(`总计: ${companiesWithLogo}/${companiesTotal} 个企业有Logo\n`);
  
  // 3. 显示示例 URL（可以直接在浏览器打开验证）
  console.log('=== 示例图片 URL（可在浏览器中打开验证）===\n');
  if (sampleUsers.length > 0) {
    console.log('用户头像示例:');
    console.log(sampleUsers[0].avatar);
    console.log();
  }
  if (sampleCompanies.length > 0) {
    console.log('企业 Logo 示例:');
    console.log(sampleCompanies[0].logo);
    console.log();
  }
  
  console.log('=== 验证完成 ===');
  console.log('\n提示: 请刷新管理后台页面查看效果');
}

main()
  .catch(e => console.error('验证失败:', e))
  .finally(() => prisma.$disconnect());
