#!/usr/bin/env node

/**
 * 阿里云数字人API正确调用测试
 * 基于实际API文档和调试结果
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

/**
 * URL编码 (遵循RFC 3986)
 */
function percentEncode(str) {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

/**
 * 生成阿里云API签名 (RPC风格)
 */
function generateSignature(method, params, secret) {
    // 构建规范化的查询字符串
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
    }, {});

    const canonicalizedQueryString = Object.keys(sortedParams)
        .map(key => `${percentEncode(key)}=${percentEncode(sortedParams[key])}`)
        .join('&');

    // 构建待签名字符串
    const stringToSign = `${method.toUpperCase()}&${percentEncode('/')}&${percentEncode(canonicalizedQueryString)}`;

    // 使用HMAC-SHA1签名
    const signature = crypto
        .createHmac('sha1', `${secret}&`)
        .update(stringToSign)
        .digest('base64');

    return signature;
}

/**
 * 通用API调用函数
 */
async function callAliyunAPI(action, params = {}) {
    assertConfig();
    try {
        const method = 'POST';
        const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const nonce = uuidv4();

        // 构建完整参数
        const fullParams = {
            Action: action,
            Version: '2022-01-30',
            Format: 'JSON',
            AccessKeyId: ALIYUN_CONFIG.accessKeyId,
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            Timestamp: timestamp,
            RegionId: ALIYUN_CONFIG.region,
            ...params
        };

        // 生成签名
        const signature = generateSignature(method, fullParams, ALIYUN_CONFIG.accessKeySecret);
        fullParams.Signature = signature;

        // 构建查询字符串
        const queryString = Object.keys(fullParams)
            .map(key => `${key}=${encodeURIComponent(fullParams[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}/?${queryString}`;

        console.log(`📤 测试 ${action}:`);
        console.log('URL:', decodeURIComponent(url));

        const response = await axios({
            method,
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': ALIYUN_CONFIG.endpoint
            },
            timeout: 30000
        });

        console.log(`✅ ${action} 响应:`);
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;

    } catch (error) {
        console.error(`❌ ${action} 失败:`);
        if (error.response) {
            console.error('状态:', error.response.status);
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('错误:', error.message);
        }
        return null;
    }
}

/**
 * 测试所有可能的参数组合
 */
async function testAllParameterCombinations() {
    console.log('🔍 开始测试所有参数组合...\n');

    // 测试1: 标准参数 (TenantId + AppId)
    console.log('=== 测试1: TenantId + AppId ===');
    await callAliyunAPI('QueryRunningInstance', {
        TenantId: ALIYUN_CONFIG.tenantId,
        AppId: ALIYUN_CONFIG.appId
    });

    // 测试2: 简写参数 (Tenant + App)
    console.log('\n=== 测试2: Tenant + App ===');
    await callAliyunAPI('QueryRunningInstance', {
        Tenant: ALIYUN_CONFIG.tenantId,
        App: ALIYUN_CONFIG.appId
    });

    // 测试3: 最小参数 StartInstance
    console.log('\n=== 测试3: 最小参数 StartInstance ===');
    await callAliyunAPI('StartInstance', {
        TenantId: ALIYUN_CONFIG.tenantId,
        AppId: ALIYUN_CONFIG.appId,
        UserId: 'test_user'
    });

    // 测试4: 完整参数 StartInstance
    console.log('\n=== 测试4: 完整参数 StartInstance ===');
    await callAliyunAPI('StartInstance', {
        TenantId: ALIYUN_CONFIG.tenantId,
        AppId: ALIYUN_CONFIG.appId,
        UserId: 'test_user',
        UserName: '测试用户',
        AvatarCode: 'avatar_lite_001',
        VoiceCode: 'voice_lite_001'
    });
}

/**
 * 检查API文档和实际差异
 */
async function diagnoseAPIIssues() {
    console.log('🩺 开始API问题诊断...\n');

    // 获取阿里云官方错误码
    const errorCodes = {
        'MissingApp': 'App参数缺失',
        'MissingTenantId': 'TenantId参数缺失',
        'MissingAppId': 'AppId参数缺失',
        'InvalidParameter': '参数格式错误',
        '10010001': 'App不能为空',
        '10009999': '参数类型转换错误'
    };

    console.log('📋 已知错误码对照表:');
    Object.entries(errorCodes).forEach(([code, desc]) => {
        console.log(`  ${code}: ${desc}`);
    });

    await testAllParameterCombinations();
}

async function main() {
    console.log('🚀 阿里云数字人API诊断工具');
    console.log('='.repeat(60));
    
    await diagnoseAPIIssues();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { callAliyunAPI, testAllParameterCombinations };
