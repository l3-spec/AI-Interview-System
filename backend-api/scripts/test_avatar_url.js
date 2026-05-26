/**
 * 测试用户头像 URL 是否正确转换
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

async function main() {
  console.log('=== 测试用户头像 URL ===\n');
  
  try {
    // 1. 登录获取 token
    console.log('1. 登录获取 token...');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login/admin', {
      email: 'superadmin@aiinterview.com',
      password: 'superadmin123'
    });
    
    if (!loginRes.data.success) {
      console.error('登录失败:', loginRes.data);
      return;
    }
    
    const token = loginRes.data.data.token;
    console.log('✅ Token 获取成功\n');
    
    // 2. 获取用户列表
    console.log('2. 获取用户列表...');
    const usersRes = await axios.get('http://localhost:3001/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 5
      }
    });
    
    if (!usersRes.data.success) {
      console.error('获取用户列表失败:', usersRes.data);
      return;
    }
    
    console.log('✅ 用户列表获取成功\n');
    console.log(`总计 ${usersRes.data.total} 个用户\n`);
    
    // 3. 显示头像 URL
    console.log('3. 用户头像 URL:');
    usersRes.data.data.forEach((user, i) => {
      console.log(`\n${i+1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Avatar: ${user.avatar || '❌ 无'}`);
    });
    
    // 4. 验证 URL 格式
    console.log('\n\n=== URL 格式验证 ===');
    const firstUser = usersRes.data.data[0];
    if (firstUser.avatar) {
      if (firstUser.avatar.startsWith('/api/oss/proxy')) {
        console.log('✅ Avatar URL 已正确转换为代理路径');
        console.log(`   格式: ${firstUser.avatar}`);
      } else if (firstUser.avatar.startsWith('https://')) {
        console.log('⚠️ Avatar URL 仍是完整 OSS URL（可能需要前端支持跨域）');
        console.log(`   格式: ${firstUser.avatar}`);
      } else {
        console.log('❌ Avatar URL 格式未知');
        console.log(`   格式: ${firstUser.avatar}`);
      }
    } else {
      console.log('❌ 用户没有头像');
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

main();
