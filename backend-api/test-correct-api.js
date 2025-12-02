#!/usr/bin/env node

/**
 * 测试正确的阿里云API调用
 * 使用标准的RPC风格和正确的签名方法
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
 * 将嵌套对象扁平化为参数
 */
function flattenParams(params, data, prefix = '') {
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            const paramKey = prefix ? `${prefix}.${key}` : key;
            
            if (value === null || value === undefined) {
                continue;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                flattenParams(params, value, paramKey);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        flattenParams(params, item, `${paramKey}.${index + 1}`);
                    } else {
                        params[`${paramKey}.${index + 1}`] = String(item);
                    }
                });
            } else {
                params[paramKey] = String(value);
            }
        }
    }
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
 * 测试StartInstance API调用
 */
async function testStartInstance() {
    console.log('🧪 测试StartInstance API调用...');
    assertConfig();
    
    try {
        const method = 'POST';
        const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const nonce = uuidv4();

        // 构建公共参数
        const params = {
            Action: 'StartInstance',
            Version: '2022-01-30',
            Format: 'JSON',
            AccessKeyId: ALIYUN_CONFIG.accessKeyId,
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            Timestamp: timestamp,
            RegionId: ALIYUN_CONFIG.region,
            tenantId: ALIYUN_CONFIG.tenantId,
            appId: ALIYUN_CONFIG.appId,
            userId: 'test_user',
            userName: '测试用户',
            'avatarInfo.code': 'avatar_lite_001',
            'avatarInfo.subtitleEnable': 'true',
            'voiceInfo.code': 'voice_lite_001',
            'voiceInfo.volume': '50',
            'channelInfo.channelType': '1',
            'channelInfo.streamType': '1'
        };

        // 生成签名
        const signature = generateSignature(method, params, ALIYUN_CONFIG.accessKeySecret);
        params.Signature = signature;

        // 构建查询字符串
        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}/?${queryString}`;

        console.log('📤 请求URL:', url);
        console.log('📤 请求参数:', params);

        const response = await axios({
            method,
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': ALIYUN_CONFIG.endpoint
            },
            timeout: 30000
        });

        console.log('✅ StartInstance调用成功');
        console.log('响应:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ StartInstance调用失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

/**
 * 测试QueryInstance API调用
 */
async function testQueryInstance() {
    console.log('🧪 测试QueryInstance API调用...');
    assertConfig();
    
    try {
        const method = 'POST';
        const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const nonce = uuidv4();

        const params = {
            Action: 'QueryInstance',
            Version: '2022-01-30',
            Format: 'JSON',
            AccessKeyId: ALIYUN_CONFIG.accessKeyId,
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            Timestamp: timestamp,
            RegionId: ALIYUN_CONFIG.region,
            tenantId: ALIYUN_CONFIG.tenantId,
            appId: ALIYUN_CONFIG.appId,
            userId: 'test_user'
        };

        const signature = generateSignature(method, params, ALIYUN_CONFIG.accessKeySecret);
        params.Signature = signature;

        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}/?${queryString}`;

        const response = await axios({
            method,
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': ALIYUN_CONFIG.endpoint
            },
            timeout: 30000
        });

        console.log('✅ QueryInstance调用成功');
        console.log('响应:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ QueryInstance调用失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

async function main() {
    console.log('🚀 开始测试阿里云数字人API');
    console.log('='.repeat(60));
    
    // 先测试查询实例
    await testQueryInstance();
    
    console.log('\n' + '='.repeat(60));
    
    // 再测试启动实例
    await testStartInstance();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testStartInstance,
    testQueryInstance
};
