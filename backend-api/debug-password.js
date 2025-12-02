const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugPassword() {
  console.log('🔍 调试密码验证问题...');
  
  try {
    // 查找企业账号
    const company = await prisma.company.findUnique({
      where: { email: 'company@aiinterview.com' }
    });
    
    if (company) {
      console.log('✅ 找到企业账号:', {
        id: company.id,
        email: company.email,
        name: company.name,
        isActive: company.isActive,
        hasPassword: !!company.password,
        passwordLength: company.password?.length
      });
      
      // 测试密码验证
      const testPassword = 'company123';
      const isMatch = await bcrypt.compare(testPassword, company.password);
      console.log('🔐 密码验证结果:', {
        testPassword,
        isMatch,
        storedHash: company.password.substring(0, 20) + '...'
      });
      
      // 重新生成密码哈希
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('🔄 新生成的哈希:', newHash.substring(0, 20) + '...');
      
      // 更新密码
      await prisma.company.update({
        where: { id: company.id },
        data: { password: newHash }
      });
      console.log('✅ 密码已更新');
      
    } else {
      console.log('❌ 未找到企业账号');
    }
    
    // 查找管理员账号
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@aiinterview.com' }
    });
    
    if (admin) {
      console.log('✅ 找到管理员账号:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        hasPassword: !!admin.password
      });
    } else {
      console.log('❌ 未找到管理员账号');
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPassword(); 