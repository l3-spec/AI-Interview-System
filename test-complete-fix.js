const axios = require('axios');

async function testCompleteFix() {
  console.log('🔍 完整测试修复效果...');
  
  let adminToken = null;
  let companyToken = null;
  
  try {
    // 1. 测试企业登录
    console.log('\n1. 测试企业登录...');
    const companyLoginResponse = await axios.post('http://localhost:3001/api/auth/login/company', {
      email: 'company@aiinterview.com',
      password: 'company123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (companyLoginResponse.data.success) {
      companyToken = companyLoginResponse.data.data.token;
      console.log('✅ 企业登录成功:', {
        message: companyLoginResponse.data.message,
        hasToken: !!companyToken,
        companyName: companyLoginResponse.data.data.company.name
      });
    } else {
      console.log('❌ 企业登录失败:', companyLoginResponse.data.message);
    }
    
    // 2. 测试管理员登录
    console.log('\n2. 测试管理员登录...');
    const adminLoginResponse = await axios.post('http://localhost:3001/api/auth/login/admin', {
      email: 'admin@aiinterview.com',
      password: 'admin123456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (adminLoginResponse.data.success) {
      adminToken = adminLoginResponse.data.data.token;
      console.log('✅ 管理员登录成功:', {
        message: adminLoginResponse.data.message,
        hasToken: !!adminToken,
        adminName: adminLoginResponse.data.data.admin.name
      });
    } else {
      console.log('❌ 管理员登录失败:', adminLoginResponse.data.message);
    }
    
    // 3. 测试企业Token验证
    if (companyToken) {
      console.log('\n3. 测试企业Token验证...');
      try {
        const companyVerifyResponse = await axios.get('http://localhost:3001/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${companyToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ 企业Token验证成功:', companyVerifyResponse.data);
      } catch (error) {
        console.log('❌ 企业Token验证失败:', error.response?.data?.message || error.message);
      }
    }
    
    // 4. 测试管理员Token验证
    if (adminToken) {
      console.log('\n4. 测试管理员Token验证...');
      try {
        const adminStatsResponse = await axios.get('http://localhost:3001/api/admin/dashboard/stats?timeRange=30d', {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ 管理员Token验证成功:', {
          success: adminStatsResponse.data.success,
          hasData: !!adminStatsResponse.data.data
        });
      } catch (error) {
        console.log('❌ 管理员Token验证失败:', error.response?.data?.message || error.message);
      }
    }
    
    // 5. 测试代理连接
    console.log('\n5. 测试代理连接...');
    try {
      const proxyCompanyLogin = await axios.post('http://localhost:5174/api/auth/login/company', {
        email: 'company@aiinterview.com',
        password: 'company123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ admin-dashboard代理连接成功:', {
        success: proxyCompanyLogin.data.success,
        message: proxyCompanyLogin.data.message
      });
    } catch (error) {
      console.log('❌ admin-dashboard代理连接失败:', error.response?.data?.message || error.message);
    }
    
    try {
      const proxyAdminLogin = await axios.post('http://localhost:5175/api/auth/login/admin', {
        email: 'admin@aiinterview.com',
        password: 'admin123456'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ system-admin代理连接成功:', {
        success: proxyAdminLogin.data.success,
        message: proxyAdminLogin.data.message
      });
    } catch (error) {
      console.log('❌ system-admin代理连接失败:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

testCompleteFix(); 