#!/usr/bin/env node

/**
 * 阿里云数字人连接测试脚本
 * 用于诊断网络连接问题
 */

const https = require('https');
const dns = require('dns');
const util = require('util');

const lookup = util.promisify(dns.lookup);

// 测试的域名列表
const testDomains = [
    'avatar.cn-zhangjiakou.aliyuncs.com',
    'avatar-vpc.cn-zhangjiakou.aliyuncs.com', 
    'avatar.aliyuncs.com',
    'aliyun.com',
    'www.aliyun.com'
];

async function testDNSResolution() {
    console.log('🔍 开始DNS解析测试...\n');
    
    for (const domain of testDomains) {
        try {
            console.log(`测试域名: ${domain}`);
            const result = await lookup(domain);
            console.log(`✅ 解析成功: ${result.address} (${result.family})`);
        } catch (error) {
            console.log(`❌ 解析失败: ${error.message}`);
        }
        console.log('');
    }
}

async function testHTTPSConnection() {
    console.log('🔗 开始HTTPS连接测试...\n');
    
    const testUrls = [
        'https://avatar.cn-zhangjiakou.aliyuncs.com',
        'https://aliyun.com'
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`测试URL: ${url}`);
            
            return new Promise((resolve) => {
                const req = https.get(url, (res) => {
                    console.log(`✅ 连接成功: ${res.statusCode} ${res.statusMessage}`);
                    resolve();
                });
                
                req.on('error', (error) => {
                    console.log(`❌ 连接失败: ${error.message}`);
                    resolve();
                });
                
                req.setTimeout(5000, () => {
                    console.log('⏱️  连接超时');
                    req.destroy();
                    resolve();
                });
            });
        } catch (error) {
            console.log(`❌ 测试异常: ${error.message}`);
        }
    }
}

async function checkNetworkSettings() {
    console.log('⚙️  网络设置检查...\n');
    
    console.log('环境变量:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || '未设置'}`);
    console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || '未设置'}`);
    console.log(`NO_PROXY: ${process.env.NO_PROXY || '未设置'}`);
    
    console.log('\nDNS服务器:');
    const { Resolver } = require('dns');
    const resolver = new Resolver();
    console.log(`默认DNS: ${resolver.getServers().join(', ')}`);
}

async function main() {
    console.log('🧪 阿里云数字人连接诊断工具');
    console.log('='.repeat(50));
    
    try {
        await checkNetworkSettings();
        await testDNSResolution();
        await testHTTPSConnection();
        
        console.log('\n📋 诊断完成！');
        console.log('如果DNS解析失败，建议:');
        console.log('1. 检查网络连接');
        console.log('2. 尝试更换DNS服务器');
        console.log('3. 检查防火墙设置');
        console.log('4. 联系阿里云客服确认服务状态');
        
    } catch (error) {
        console.error('诊断过程中出现错误:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    testDNSResolution,
    testHTTPSConnection,
    checkNetworkSettings
};