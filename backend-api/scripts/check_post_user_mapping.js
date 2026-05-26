/**
 * 检查帖子发布者与用户列表的对应关系
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 帖子发布者 vs 用户列表 对照检查 ===\n');

  // 1. 所有帖子及其作者
  const posts = await prisma.userPost.findMany({
    select: {
      id: true,
      title: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📝 帖子总数: ${posts.length}\n`);
  console.log('帖子 → 作者映射:');
  const authorIds = new Set();
  posts.forEach(p => {
    const authorInfo = p.user
      ? `${p.user.name} (${p.user.email}) [${p.user.id}]`
      : '匿名 (userId=null)';
    if (p.user) authorIds.add(p.user.id);
    console.log(`  ${p.title.slice(0, 35).padEnd(38)} → ${authorInfo}`);
  });

  // 2. 大咖帖子
  const expertPosts = await prisma.expertPost.findMany({
    select: { id: true, title: true, expertName: true, expertAvatar: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n🎙 大咖帖子总数: ${expertPosts.length}`);
  expertPosts.forEach(p => {
    console.log(`  ${p.title.slice(0, 35).padEnd(38)} → ${p.expertName} (独立表，无 user 关联)`);
  });

  // 3. 全部用户
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n👤 用户总数: ${allUsers.length}`);
  console.log('\n用户列表:');
  allUsers.forEach(u => {
    const isAuthor = authorIds.has(u.id) ? ' 📝帖子作者' : '';
    console.log(`  ${u.name.padEnd(10)} ${u.email.padEnd(50)} [${u.id}]${isAuthor}`);
  });

  // 4. 找出帖子引用但不存在的用户
  const postUserIds = [...new Set(posts.filter(p => p.userId).map(p => p.userId))];
  const existingUserIds = new Set(allUsers.map(u => u.id));
  const orphans = postUserIds.filter(id => !existingUserIds.has(id));
  console.log(`\n⚠️  帖子引用但不存在的用户ID: ${orphans.length}`);
  orphans.forEach(id => console.log(`  ❌ ${id}`));

  // 5. 汇总帖子作者分布
  const authorMap = {};
  posts.forEach(p => {
    const key = p.user ? p.user.name : '匿名';
    authorMap[key] = (authorMap[key] || 0) + 1;
  });
  console.log('\n📊 帖子作者分布:');
  Object.entries(authorMap).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} 篇`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
