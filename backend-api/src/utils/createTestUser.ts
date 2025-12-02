import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 创建测试用户
 */
export async function createTestUser() {
  try {
    console.log('开始创建测试用户...');

    // 创建测试用户
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'test@example.com',
        password: await bcrypt.hash('12345678', 10),
        name: '测试用户',
        phone: '13800138000',
        gender: 'MALE',
        age: 25,
        education: '本科',
        experience: '2年前端开发经验',
        skills: JSON.stringify(['JavaScript', 'React', 'Vue', 'Node.js']),
        isActive: true
      },
      {
        id: 'test-user-2',
        email: 'demo@test.com',
        password: await bcrypt.hash('password123', 10),
        name: '演示用户',
        phone: '13900139000',
        gender: 'FEMALE',
        age: 28,
        education: '硕士',
        experience: '5年后端开发经验',
        skills: JSON.stringify(['Java', 'Python', 'MySQL', 'Redis']),
        isActive: true
      }
    ];

    // 插入测试用户
    for (const user of testUsers) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (existingUser) {
        console.log(`用户 ${user.email} 已存在，跳过创建`);
        continue;
      }

      await prisma.user.create({
        data: user
      });
      console.log(`创建用户: ${user.email}`);
    }

    // 创建管理员账户
    const adminEmail = 'admin@ai-interview.com';
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      await prisma.admin.create({
        data: {
          id: 'admin-1',
          email: adminEmail,
          password: await bcrypt.hash('admin123456', 10),
          name: '系统管理员',
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });
      console.log(`创建管理员: ${adminEmail}`);
    } else {
      console.log(`管理员 ${adminEmail} 已存在，跳过创建`);
    }

    console.log('测试用户创建完成！');
    return {
      users: testUsers.length,
      admin: 1
    };
  } catch (error) {
    console.error('创建测试用户失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行用户创建
if (require.main === module) {
  createTestUser()
    .then((result) => {
      console.log('用户创建完成:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('用户创建失败:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} 