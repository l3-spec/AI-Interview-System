import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 创建管理员账户
 */
export async function createAdmin() {
  try {
    console.log('开始创建管理员账户...');

    const adminData = {
      id: 'admin-1',
      email: 'admin@ai-interview.com',
      password: await bcrypt.hash('admin123456', 10),
      name: '系统管理员',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify([
        'user:read', 'user:write',
        'company:read', 'company:write',
        'job:read', 'job:write', 'job:delete',
        'log:read',
        'admin:read', 'admin:write'
      ]),
      isActive: true
    };

    // 使用upsert确保不会重复创建
    const admin = await prisma.admin.upsert({
      where: { id: adminData.id },
      update: adminData,
      create: adminData
    });

    console.log('管理员账户创建成功！');
    console.log('邮箱:', admin.email);
    console.log('密码: admin123456');
    console.log('角色:', admin.role);

    return admin;
  } catch (error) {
    console.error('创建管理员账户失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行管理员创建
if (require.main === module) {
  createAdmin()
    .then((admin) => {
      console.log('管理员创建完成:', admin.email);
      process.exit(0);
    })
    .catch((error) => {
      console.error('管理员创建失败:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} 