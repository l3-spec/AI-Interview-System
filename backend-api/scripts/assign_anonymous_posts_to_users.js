/**
 * 将匿名帖子分配给现有用户，使帖子发布者与用户列表对应
 * 
 * 策略：
 * - 遍历所有 userId=null 的帖子
 * - 按轮转方式分配给 34 个用户，确保分布均匀
 * - 跳过纯测试账号（如 circle.demo@ 和 user@）以保持自然感
 * - 更新后帖子作者会显示为用户列表中的真实用户
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 匿名帖子用户分配 ===\n');

  // 1. 获取所有匿名用户帖子
  const anonymousPosts = await prisma.userPost.findMany({
    where: { userId: null },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`📝 匿名帖子数: ${anonymousPosts.length}`);

  if (anonymousPosts.length === 0) {
    console.log('没有匿名帖子需要分配');
    return;
  }

  // 2. 获取所有用户（排除纯系统账号）
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  // 排除 circle.demo 和原始 user@ 账号（它们已有帖子）
  const assignableUsers = allUsers.filter(u =>
    !u.email.includes('circle.demo') &&
    !u.email.startsWith('user@')
  );
  console.log(`👤 可分配用户数: ${assignableUsers.length} / ${allUsers.length}\n`);

  if (assignableUsers.length === 0) {
    console.error('没有可分配的用户');
    return;
  }

  // 3. 分配策略：按轮转方式，每个用户分 2-3 篇，自然分布
  let assigned = 0;
  let userIdx = 0;
  const userPostCount = {};

  for (const post of anonymousPosts) {
    const user = assignableUsers[userIdx % assignableUsers.length];
    userPostCount[user.name] = (userPostCount[user.name] || 0) + 1;

    await prisma.userPost.update({
      where: { id: post.id },
      data: { userId: user.id },
    });

    assigned++;
    userIdx++;
  }

  console.log(`✅ 已分配 ${assigned} 篇匿名帖子\n`);

  // 4. 显示分配结果
  console.log('📊 分配后各用户帖子数:');
  const sortedEntries = Object.entries(userPostCount).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedEntries) {
    console.log(`  ${name}: +${count} 篇 (本次新分配)`);
  }

  // 5. 验证
  const remaining = await prisma.userPost.count({ where: { userId: null } });
  console.log(`\n🔍 剩余匿名帖子: ${remaining}`);
  
  const totalPosts = await prisma.userPost.count();
  const withUser = await prisma.userPost.count({ where: { userId: { not: null } } });
  console.log(`📊 总帖子: ${totalPosts}, 有作者: ${withUser}, 匿名: ${remaining}`);
}

main()
  .catch(e => { console.error('💥 执行失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
