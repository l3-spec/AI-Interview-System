const axios = require('axios');

// 测试配置
const config = {
  backend: {
    baseURL: 'http://localhost:3001/api'
  }
};

// 测试数据
const testCredentials = {
  company: {
    email: 'test@company.com',
    password: '123456'
  },
  admin: {
    email: 'admin@system.com',
    password: '123456'
  }
};

async function testCorsAndToken() {
  console.log('🔍 开始测试CORS和Token问题...\n');

  try {
    // 1. 测试直接登录到后端
    console.log('1️⃣ 测试直接登录到后端...');
    
    // 测试企业登录
    console.log('   测试企业登录...');
    const companyLoginResponse = await axios.post(`${config.backend.baseURL}/auth/login/company`, testCredentials.company);
    console.log('   ✅ 企业登录成功:', {
      status: companyLoginResponse.status,
      hasToken: !!companyLoginResponse.data.token,
      tokenPrefix: companyLoginResponse.data.token?.substring(0, 20) + '...'
    });

    const companyToken = companyLoginResponse.data.token;

    // 测试管理员登录
    console.log('   测试管理员登录...');
    const adminLoginResponse = await axios.post(`${config.backend.baseURL}/auth/login/admin`, testCredentials.admin);
    console.log('   ✅ 管理员登录成功:', {
      status: adminLoginResponse.status,
      hasToken: !!adminLoginResponse.data.token,
      tokenPrefix: adminLoginResponse.data.token?.substring(0, 20) + '...'
    });

    const adminToken = adminLoginResponse.data.token;

    // 2. 测试CORS预检请求
    console.log('\n2️⃣ 测试CORS预检请求...');
    try {
      const preflightResponse = await axios.options(`${config.backend.baseURL}/candidates`, {
        headers: {
          'Origin': 'http://localhost:5174',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
      });
      console.log('✅ CORS预检请求成功:', {
        status: preflightResponse.status,
        headers: {
          'Access-Control-Allow-Origin': preflightResponse.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': preflightResponse.headers['access-control-allow-methods'],
          'Access-Control-Allow-Headers': preflightResponse.headers['access-control-allow-headers'],
          'Access-Control-Allow-Credentials': preflightResponse.headers['access-control-allow-credentials']
        }
      });
    } catch (error) {
      console.log('❌ CORS预检请求失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    // 3. 测试带Origin头的candidates请求
    console.log('\n3️⃣ 测试带Origin头的candidates请求...');
    try {
      const candidatesResponse = await axios.get(`${config.backend.baseURL}/candidates?page=1&pageSize=10`, {
        headers: {
          'Authorization': `Bearer ${companyToken}`,
          'Origin': 'http://localhost:5174'
        }
      });
      console.log('✅ candidates请求成功:', {
        status: candidatesResponse.status,
        dataLength: candidatesResponse.data?.data?.length || 0,
        headers: {
          'Access-Control-Allow-Origin': candidatesResponse.headers['access-control-allow-origin'],
          'Access-Control-Allow-Credentials': candidatesResponse.headers['access-control-allow-credentials']
        }
      });
    } catch (error) {
      console.log('❌ candidates请求失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        headers: error.response?.headers
      });
    }

    // 4. 测试带Origin头的admin dashboard stats请求
    console.log('\n4️⃣ 测试带Origin头的admin dashboard stats请求...');
    try {
      const statsResponse = await axios.get(`${config.backend.baseURL}/admin/dashboard/stats?timeRange=30d`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Origin': 'http://localhost:5175'
        }
      });
      console.log('✅ admin dashboard stats请求成功:', {
        status: statsResponse.status,
        hasData: !!statsResponse.data?.data,
        headers: {
          'Access-Control-Allow-Origin': statsResponse.headers['access-control-allow-origin'],
          'Access-Control-Allow-Credentials': statsResponse.headers['access-control-allow-credentials']
        }
      });
    } catch (error) {
      console.log('❌ admin dashboard stats请求失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        headers: error.response?.headers
      });
    }

    // 5. 测试通过代理的请求
    console.log('\n5️⃣ 测试通过代理的请求...');
    
    // 测试admin-dashboard代理
    try {
      const proxyCandidatesResponse = await axios.get('http://localhost:5174/api/candidates?page=1&pageSize=10', {
        headers: {
          'Authorization': `Bearer ${companyToken}`,
          'Origin': 'http://localhost:5174'
        }
      });
      console.log('✅ admin-dashboard代理candidates请求成功:', {
        status: proxyCandidatesResponse.status,
        dataLength: proxyCandidatesResponse.data?.data?.length || 0
      });
    } catch (error) {
      console.log('❌ admin-dashboard代理candidates请求失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    // 测试system-admin代理
    try {
      const proxyStatsResponse = await axios.get('http://localhost:5175/api/admin/dashboard/stats?timeRange=30d', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Origin': 'http://localhost:5175'
        }
      });
      console.log('✅ system-admin代理stats请求成功:', {
        status: proxyStatsResponse.status,
        hasData: !!proxyStatsResponse.data?.data
      });
    } catch (error) {
      console.log('❌ system-admin代理stats请求失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应详情:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
  }
}

// 运行测试
testCorsAndToken(); 