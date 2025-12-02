const axios = require('axios');

async function testLoginFix() {
  console.log('🔍 测试登录修复效果...');
  
  try {
    // 测试admin-dashboard登录
    console.log('\n1. 测试admin-dashboard企业登录...');
    const adminLoginResponse = await axios.post('http://localhost:5174/api/auth/login/company', {
      email: 'company@aiinterview.com',
      password: 'company123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ admin-dashboard登录成功:', {
      success: adminLoginResponse.data.success,
      message: adminLoginResponse.data.message,
      hasToken: !!adminLoginResponse.data.data?.token
    });
    
    // 测试system-admin登录
    console.log('\n2. 测试system-admin管理员登录...');
    const systemLoginResponse = await axios.post('http://localhost:5175/api/auth/login/admin', {
      email: 'admin@aiinterview.com',
      password: 'admin123456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ system-admin登录成功:', {
      success: systemLoginResponse.data.success,
      message: systemLoginResponse.data.message,
      hasToken: !!systemLoginResponse.data.data?.token
    });
    
    // 测试token验证
    if (adminLoginResponse.data.data?.token) {
      console.log('\n3. 测试token验证...');
      const token = adminLoginResponse.data.data.token;
      
      const statsResponse = await axios.get('http://localhost:5174/api/admin/dashboard/stats?timeRange=30d', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token验证成功:', {
        status: statsResponse.status,
        hasData: !!statsResponse.data
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
  }
}

testLoginFix(); 