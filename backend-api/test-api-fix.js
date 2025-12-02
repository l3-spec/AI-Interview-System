#!/usr/bin/env node

/**
 * 测试API版本修复
 * 用于验证阿里云数字人API调用是否正常工作
 */

const axios = require('axios');

async function testAPIConnection() {
    console.log('🧪 测试阿里云数字人API版本修复...');
    
    try {
        const response = await axios.get('http://localhost:3001/api/dh/test-api-version', {
            timeout: 30000
        });
        
        console.log('✅ API版本测试成功');
        console.log('响应:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('❌ API版本测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        return null;
    }
}

async function testStartInstance() {
    console.log('🧪 测试启动数字人实例...');
    
    try {
        const response = await axios.post('http://localhost:3001/api/dh/sessions/start', {
            userId: 'test_user',
            userName: '测试用户'
        }, {
            timeout: 30000
        });
        
        console.log('✅ 启动实例测试成功');
        console.log('响应:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('❌ 启动实例测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        return null;
    }
}

async function main() {
    console.log('🚀 开始测试阿里云数字人API修复');
    console.log('='.repeat(50));
    
    // 测试连接
    await testAPIConnection();
    
    console.log('\n' + '='.repeat(50));
    
    // 测试启动实例
    await testStartInstance();
}

if (require.main === module) {
    main();
}

module.exports = {
    testAPIConnection,
    testStartInstance
};
