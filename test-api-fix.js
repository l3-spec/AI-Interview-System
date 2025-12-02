const axios = require('axios');

// 测试配置
const API_BASE = 'http://localhost:3001/api';

// 测试函数
async function testAdminLogin() {
  console.log('🔧 测试管理员登录...');
  try {
    const response = await axios.post(`${API_BASE}/admin/login`, {
      email: 'superadmin@aiinterview.com',
      password: 'superadmin123'
    });
    
    console.log('✅ 管理员登录成功:', response.data);
    return response.data.token;
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.response?.data || error.message);
    return null;
  }
}

async function testCompanyLogin() {
  console.log('🏢 测试企业登录...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login/company`, {
      email: 'company@example.com',
      password: 'company123'
    });
    
    console.log('✅ 企业登录成功:', response.data);
    return response.data.token;
  } catch (error) {
    console.error('❌ 企业登录失败:', error.response?.data || error.message);
    return null;
  }
}

async function testTokenVerification(token) {
  console.log('🔐 测试Token验证...');
  try {
    const response = await axios.get(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token验证成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Token验证失败:', error.response?.data || error.message);
    return false;
  }
}

async function testAdminDashboard(token) {
  console.log('📊 测试管理员仪表盘...');
  try {
    const response = await axios.get(`${API_BASE}/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 管理员仪表盘成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 管理员仪表盘失败:', error.response?.data || error.message);
    return false;
  }
}

async function testCORS() {
  console.log('🌐 测试CORS配置...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ CORS配置正常:', response.data);
    return true;
  } catch (error) {
    console.error('❌ CORS配置问题:', error.response?.data || error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  // 测试CORS
  await testCORS();
  console.log('');
  
  // 测试管理员登录
  const adminToken = await testAdminLogin();
  console.log('');
  
  if (adminToken) {
    // 测试Token验证
    await testTokenVerification(adminToken);
    console.log('');
    
    // 测试管理员仪表盘
    await testAdminDashboard(adminToken);
    console.log('');
  }
  
  // 测试企业登录
  const companyToken = await testCompanyLogin();
  console.log('');
  
  if (companyToken) {
    // 测试企业Token验证
    await testTokenVerification(companyToken);
    console.log('');
  }
  
  console.log('✅ 所有测试完成！');
}

// 运行测试
runTests().catch(console.error); 