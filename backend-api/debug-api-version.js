#!/usr/bin/env node

/**
 * 调试API版本问题
 * 测试不同的API版本以找到正确的版本
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const ALIYUN_CONFIG = {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    tenantId: process.env.ALIYUN_TENANT_ID || '30497',
    appId: process.env.ALIYUN_APP_ID || '',
    endpoint: process.env.ALIYUN_ENDPOINT || 'avatar.cn-zhangjiakou.aliyuncs.com',
    region: process.env.ALIYUN_REGION || 'cn-zhangjiakou'
};

function assertConfig() {
    const missing = [];
    if (!ALIYUN_CONFIG.accessKeyId) missing.push('ALIYUN_ACCESS_KEY_ID');
    if (!ALIYUN_CONFIG.accessKeySecret) missing.push('ALIYUN_ACCESS_KEY_SECRET');
    if (!ALIYUN_CONFIG.appId) missing.push('ALIYUN_APP_ID');
    if (missing.length) {
        throw new Error(`Missing required Aliyun credentials: ${missing.join(', ')}`);
    }
}

const API_VERSIONS = [
    '2022-01-30',
    '2022-08-01',
    '2023-01-01',
    '2023-06-30',
    '2023-07-20',
    '2023-08-01',
    '2024-01-01'
];

/**
 * 生成阿里云API签名
 */
function generateSignature(method, path, params, headers, secret) {
    const timestamp = new Date().toISOString();
    const nonce = uuidv4();
    
    // 构建签名字符串
    const stringToSign = [
        method.toUpperCase(),
        path,
        Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&'),
        Object.keys(headers).sort().map(key => `${key}:${headers[key]}`).join('\n'),
        timestamp,
        nonce
    ].join('\n');

    // 使用HMAC-SHA1签名
    const signature = crypto
        .createHmac('sha1', secret)
        .update(stringToSign)
        .digest('base64');

    return { signature, timestamp, nonce };
}

/**
 * 测试特定API版本
 */
async function testAPIVersion(version) {
    console.log(`🧪 测试API版本: ${version}`);
    assertConfig();
    
    try {
        const method = 'POST';
        const path = '/';
        const timestamp = new Date().toISOString();
        const nonce = uuidv4();

        const params = {
            Action: 'QueryInstance',
            Version: version,
            Format: 'JSON',
            Timestamp: timestamp,
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            AccessKeyId: ALIYUN_CONFIG.accessKeyId
        };

        const headers = {
            'Content-Type': 'application/json',
            'Host': ALIYUN_CONFIG.endpoint,
            'X-Acs-Region-Id': ALIYUN_CONFIG.region
        };

        const { signature } = generateSignature(method, path, params, headers, ALIYUN_CONFIG.accessKeySecret);
        params.Signature = signature;

        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}${path}?${queryString}`;

        const response = await axios({
            method,
            url,
            headers,
            data: JSON.stringify({
                tenantId: ALIYUN_CONFIG.tenantId,
                appId: ALIYUN_CONFIG.appId,
                userId: 'test_user',
                userName: '测试用户',
                avatarInfo: {
                    code: 'avatar_lite_001',
                    subtitleEnable: true
                },
                voiceInfo: {
                    code: 'voice_lite_001',
                    volume: 50
                },
                channelInfo: {
                    channelType: 1,
                    streamType: 1
                }
            }),
            timeout: 10000
        });

        console.log(`✅ 版本 ${version} 可用`);
        return { version, success: true, data: response.data };
    } catch (error) {
        console.log(`❌ 版本 ${version} 失败:`, error.response?.data?.Message || error.message);
        return { version, success: false, error: error.response?.data?.Message || error.message };
    }
}

/**
 * 测试所有API版本
 */
async function testAllVersions() {
    console.log('🚀 开始测试所有可能的API版本...');
    console.log('='.repeat(50));
    
    const results = [];
    
    for (const version of API_VERSIONS) {
        const result = await testAPIVersion(version);
        results.push(result);
        console.log('');
    }
    
    console.log('='.repeat(50));
    console.log('📊 测试结果汇总:');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ 成功版本: ${successful.length}`);
    console.log(`❌ 失败版本: ${failed.length}`);
    
    if (successful.length > 0) {
        console.log('🎯 推荐使用的版本:');
        successful.forEach(r => console.log(`   - ${r.version}`));
    } else {
        console.log('⚠️  所有版本均测试失败，请检查API配置');
    }
    
    return results;
}

/**
 * 测试具体API调用
 */
async function testStartInstance() {
    console.log('🧪 测试StartInstance API调用...');
    assertConfig();
    
    try {
        const method = 'POST';
        const path = '/';
        const timestamp = new Date().toISOString();
        const nonce = uuidv4();

        const params = {
            Action: 'StartInstance',
            Version: '2022-01-30',
            Format: 'JSON',
            Timestamp: timestamp,
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            AccessKeyId: ALIYUN_CONFIG.accessKeyId
        };

        const headers = {
            'Content-Type': 'application/json',
            'Host': ALIYUN_CONFIG.endpoint,
            'X-Acs-Region-Id': ALIYUN_CONFIG.region
        };

        const { signature } = generateSignature(method, path, params, headers, ALIYUN_CONFIG.accessKeySecret);
        params.Signature = signature;

        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}${path}?${queryString}`;

        const response = await axios({
            method,
            url,
            headers,
            data: JSON.stringify({
                tenantId: ALIYUN_CONFIG.tenantId,
                appId: ALIYUN_CONFIG.appId,
                userId: 'test_user',
                userName: '测试用户',
                avatarInfo: {
                    code: 'avatar_lite_001',
                    subtitleEnable: true
                },
                voiceInfo: {
                    code: 'voice_lite_001',
                    volume: 50
                },
                channelInfo: {
                    channelType: 1,
                    streamType: 1
                }
            }),
            timeout: 15000
        });

        console.log('✅ StartInstance调用成功');
        console.log('响应:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.log('❌ StartInstance调用失败:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// 主函数
async function main() {
    console.log('🔍 阿里云数字人API版本调试工具');
    console.log('='.repeat(60));
    
    // 测试所有版本
    await testAllVersions();
    
    console.log('\n' + '='.repeat(60));
    
    // 测试具体StartInstance调用
    await testStartInstance();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testAPIVersion,
    testAllVersions,
    testStartInstance
};
