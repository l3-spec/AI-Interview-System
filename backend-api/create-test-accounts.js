const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestAccounts() {
  console.log('🔧 创建测试账号...');
  
  try {
    // 创建企业测试账号
    const companyPassword = await bcrypt.hash('company123', 12);
    const company = await prisma.company.upsert({
      where: { email: 'company@aiinterview.com' },
      update: {},
      create: {
        email: 'company@aiinterview.com',
        password: companyPassword,
        name: '测试企业',
        description: '测试企业账号',
        isVerified: true,
        isActive: true,
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年
      }
    });
    console.log('✅ 企业测试账号创建成功:', company.email);
    
    // 创建管理员测试账号
    const adminPassword = await bcrypt.hash('admin123456', 12);
    const admin = await prisma.admin.upsert({
      where: { email: 'admin@aiinterview.com' },
      update: {},
      create: {
        email: 'admin@aiinterview.com',
        password: adminPassword,
        name: '超级管理员',
        role: 'super_admin',
        isActive: true,
        permissions: 'all' // 修复：permissions是字符串类型
      }
    });
    console.log('✅ 管理员测试账号创建成功:', admin.email);
    
    // 创建普通用户测试账号
    const userPassword = await bcrypt.hash('user123', 12);
    const user = await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        password: userPassword,
        name: '测试用户',
        phone: '13800138000',
        isActive: true
      }
    });
    console.log('✅ 用户测试账号创建成功:', user.email);
    
    console.log('\n📋 测试账号信息:');
    console.log('企业账号: company@aiinterview.com / company123');
    console.log('管理员账号: admin@aiinterview.com / admin123456');
    console.log('用户账号: user@test.com / user123');
    
  } catch (error) {
    console.error('❌ 创建测试账号失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts(); 