import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 开始初始化数据库...');

    // 创建超级管理员账号
    const superAdminEmail = 'superadmin@aiinterview.com';
    const existingSuperAdmin = await prisma.admin.findUnique({
      where: { email: superAdminEmail }
    });

    if (!existingSuperAdmin) {
      const superAdmin = await prisma.admin.create({
        data: {
          email: superAdminEmail,
          password: await bcrypt.hash('superadmin123', 12),
          name: '超级管理员',
          role: 'SUPER_ADMIN',
          permissions: JSON.stringify([
            'user:*',
            'company:*',
            'job:*',
            'interview:*',
            'admin:*',
            'system:*'
          ]),
          isActive: true
        }
      });
      console.log('✅ 超级管理员账号创建成功:', superAdmin.email);
    }

    // 创建普通管理员账号
    const adminEmail = 'admin@aiinterview.com';
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const admin = await prisma.admin.create({
        data: {
          email: adminEmail,
          password: await bcrypt.hash('admin123456', 12),
          name: '管理员',
          role: 'ADMIN',
          permissions: JSON.stringify([
            'user:read',
            'company:read',
            'job:read',
            'interview:read'
          ]),
          isActive: true
        }
      });
      console.log('✅ 管理员账号创建成功:', admin.email);
    }

    // 创建测试企业账号
    const companyEmail = 'company@aiinterview.com';
    const existingCompany = await prisma.company.findUnique({
      where: { email: companyEmail }
    });

    if (!existingCompany) {
      const company = await prisma.company.create({
        data: {
          email: companyEmail,
          password: await bcrypt.hash('company123456', 12),
          name: '测试企业',
          description: '这是一个用于测试的企业账号',
          industry: '互联网/IT',
          scale: '100-500',
          address: '北京市海淀区',
          website: 'https://www.example.com',
          isVerified: true,
          isActive: true
        }
      });
      console.log('✅ 测试企业账号创建成功:', company.email);
    }

    // 创建测试用户账号
    const userEmail = 'user@aiinterview.com';
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          email: userEmail,
          password: await bcrypt.hash('user123456', 12),
          name: '测试用户',
          phone: '13800138000',
          gender: 'MALE',
          age: 25,
          education: '本科',
          experience: '3年工作经验',
          skills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
          isActive: true,
          isVerified: true
        }
      });
      console.log('✅ 测试用户账号创建成功:', user.email);
    }

    console.log('');
    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('📋 账号信息:');
    console.log('👑 超级管理员: superadmin@aiinterview.com / superadmin123');
    console.log('👨‍💼 管理员: admin@aiinterview.com / admin123456');
    console.log('🏢 企业账号: company@aiinterview.com / company123456');
    console.log('👤 用户账号: user@aiinterview.com / user123456');
    console.log('');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 