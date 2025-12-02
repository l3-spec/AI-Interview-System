const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true
      }
    });
    
    console.log('数据库中的用户：');
    console.log(JSON.stringify(users, null, 2));
    
    // 检查特定的测试用户
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    console.log('\n测试用户 test@example.com:');
    console.log(testUser ? JSON.stringify(testUser, null, 2) : '不存在');
    
  } catch (error) {
    console.error('查询用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
