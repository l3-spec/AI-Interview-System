const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fakeUsers = [
  { name: '张晨', email: 'chen.zhang@example.com', gender: 'MALE' },
  { name: '李欣', email: 'xin.li@example.com', gender: 'FEMALE' },
  { name: '王宇航', email: 'yuhang.wang@example.com', gender: 'MALE' },
  { name: '周婉莹', email: 'wanying.zhou@example.com', gender: 'FEMALE' },
  { name: '赵一鸣', email: 'yiming.zhao@example.com', gender: 'MALE' },
  { name: '孙可心', email: 'kexin.sun@example.com', gender: 'FEMALE' },
  { name: '刘浩然', email: 'haoran.liu@example.com', gender: 'MALE' },
  { name: '陈雨琪', email: 'yuqi.chen@example.com', gender: 'FEMALE' },
  { name: '杨睿', email: 'rui.yang@example.com', gender: 'MALE' },
  { name: '林澜', email: 'lan.lin@example.com', gender: 'FEMALE' },
  { name: '郝文杰', email: 'wenjie.hao@example.com', gender: 'MALE' },
  { name: '彭思思', email: 'sisi.peng@example.com', gender: 'FEMALE' },
];

async function main() {
  // ensure fake users exist (skip existing emails)
  const createdIds = [];
  for (const user of fakeUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      createdIds.push(existing.id);
      continue;
    }
    const newUser = await prisma.user.create({
      data: {
        email: user.email,
        password: 'temp123456',
        name: user.name,
        gender: user.gender,
        isActive: true,
        isVerified: true,
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
      },
      select: { id: true },
    });
    createdIds.push(newUser.id);
  }

  if (!createdIds.length) {
    console.log('No users created or found.');
    return;
  }

  const posts = await prisma.userPost.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true },
  });

  let assigned = 0;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    if (post.userId) continue;
    const userId = createdIds[i % createdIds.length];
    await prisma.userPost.update({ where: { id: post.id }, data: { userId } });
    assigned++;
  }

  console.log(`Users ready: ${createdIds.length}. Posts assigned: ${assigned}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
