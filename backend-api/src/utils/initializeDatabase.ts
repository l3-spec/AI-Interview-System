import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

/**
 * 初始化数据库 - 创建默认管理员账户
 */
export async function initializeDatabase() {
  try {
    console.log('🔄 开始初始化数据库...');

    // 创建企业管理端管理员账户
    const companyAdminEmail = 'admin@aiinterview.com';
    const existingCompanyAdmin = await prisma.company.findUnique({
      where: { email: companyAdminEmail }
    });

    if (!existingCompanyAdmin) {
      const companyAdmin = await prisma.company.create({
        data: {
          id: 'company-admin-1',
          email: companyAdminEmail,
          password: await bcrypt.hash('admin123456', 12),
          name: '演示企业',
          description: '这是一个演示企业账户，用于测试系统功能',
          industry: '科技/互联网',
          scale: '100-500人',
          address: '北京市海淀区',
          website: 'https://aiinterview.com',
          contact: '400-123-4567',
          isVerified: true,
          isActive: true
        }
      });
      console.log('✅ 企业管理员账户创建成功:', companyAdmin.email);
    } else {
      console.log('ℹ️  企业管理员账户已存在:', companyAdminEmail);
    }

    // 创建系统超级管理员账户
    const superAdminEmail = 'superadmin@aiinterview.com';
    const existingSuperAdmin = await prisma.admin.findUnique({
      where: { email: superAdminEmail }
    });

    if (!existingSuperAdmin) {
      const superAdmin = await prisma.admin.create({
        data: {
          id: 'super-admin-1',
          email: superAdminEmail,
          password: await bcrypt.hash('superadmin123', 12),
          name: '超级管理员',
          role: 'SUPER_ADMIN',
          permissions: JSON.stringify([
            'user:read', 'user:write',
            'company:read', 'company:write', 'company:verify',
            'job:read', 'job:write', 'job:delete',
            'admin:read', 'admin:write', 'admin:delete',
            'log:read',
            'system:manage'
          ]),
          isActive: true
        }
      });
      console.log('✅ 超级管理员账户创建成功:', superAdmin.email);
    } else {
      console.log('ℹ️  超级管理员账户已存在:', superAdminEmail);
    }

    // 创建一些测试用户（可选）
    const testUserEmail = 'test@user.com';
    const existingTestUser = await prisma.user.findUnique({
      where: { email: testUserEmail }
    });

    if (!existingTestUser) {
      const testUser = await prisma.user.create({
        data: {
          id: 'test-user-1',
          email: testUserEmail,
          password: await bcrypt.hash('test123456', 12),
          name: '测试用户',
          phone: '13800138000',
          gender: 'MALE',
          age: 28,
          education: '本科',
          experience: '3年前端开发经验',
          skills: JSON.stringify(['JavaScript', 'React', 'TypeScript', 'Node.js']),
          isActive: true,
          isVerified: true
        }
      });
      console.log('✅ 测试用户创建成功:', testUser.email);
    } else {
      console.log('ℹ️  测试用户已存在:', testUserEmail);
    }

    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('📋 账户信息:');
    console.log('   🏢 企业管理端: admin@aiinterview.com / admin123456');
    console.log('   ⚙️  系统管理端: superadmin@aiinterview.com / superadmin123');
    console.log('   👤 测试用户: test@user.com / test123456');
    console.log('');

    return {
      success: true,
      message: '数据库初始化成功'
    };
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('数据库初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
} 