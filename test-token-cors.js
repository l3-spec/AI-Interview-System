const axios = require('axios');

async function testTokenCors() {
  console.log('🔍 测试Token传递和CORS问题...');
  
  try {
    // 1. 先登录获取Token
    console.log('\n1. 获取企业Token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login/company', {
      email: 'company@aiinterview.com',
      password: 'company123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 获取Token成功:', token.substring(0, 50) + '...');
    
    // 2. 测试候选人接口
    console.log('\n2. 测试候选人接口...');
    try {
      const candidatesResponse = await axios.get('http://localhost:3001/api/candidates?page=1&pageSize=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5174'
        }
      });
      console.log('✅ 候选人接口成功:', {
        status: candidatesResponse.status,
        success: candidatesResponse.data.success,
        hasData: !!candidatesResponse.data.data
      });
    } catch (error) {
      console.log('❌ 候选人接口失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        headers: error.response?.headers
      });
    }
    
    // 3. 测试代理连接
    console.log('\n3. 测试代理连接...');
    try {
      const proxyResponse = await axios.get('http://localhost:5174/api/candidates?page=1&pageSize=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 代理连接成功:', {
        status: proxyResponse.status,
        success: proxyResponse.data.success
      });
    } catch (error) {
      console.log('❌ 代理连接失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
    
    // 4. 测试CORS预检请求
    console.log('\n4. 测试CORS预检请求...');
    try {
      const optionsResponse = await axios.options('http://localhost:3001/api/candidates', {
        headers: {
          'Origin': 'http://localhost:5174',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
      });
      console.log('✅ CORS预检请求成功:', {
        status: optionsResponse.status,
        headers: {
          'Access-Control-Allow-Origin': optionsResponse.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': optionsResponse.headers['access-control-allow-methods'],
          'Access-Control-Allow-Headers': optionsResponse.headers['access-control-allow-headers'],
          'Access-Control-Allow-Credentials': optionsResponse.headers['access-control-allow-credentials']
        }
      });
    } catch (error) {
      console.log('❌ CORS预检请求失败:', {
        status: error.response?.status,
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testTokenCors(); 