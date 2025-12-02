#!/usr/bin/env node

/**
 * 测试阿里云API时间戳格式
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
 * 生成正确的时间戳格式
 */
function getAliyunTimestamp() {
    // 阿里云要求的时间戳格式：ISO8601 UTC时间，格式为：YYYY-MM-DDTHH:MM:SSZ
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
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
 * 测试时间戳格式
 */
async function testTimestamp() {
    console.log('🧪 测试阿里云时间戳格式...');
    assertConfig();
    
    const timestamp = getAliyunTimestamp();
    console.log('📅 当前时间戳:', timestamp);
    console.log('📝 时间戳格式验证:');
    console.log('   - 长度:', timestamp.length);
    console.log('   - 格式:', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(timestamp) ? '✅ 正确' : '❌ 错误');
    
    try {
        const method = 'POST';
        const nonce = uuidv4();

        // 构建公共参数
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

        // 生成签名
        const signature = generateSignature(method, params, ALIYUN_CONFIG.accessKeySecret);
        params.Signature = signature;

        // 构建查询字符串
        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        const url = `https://${ALIYUN_CONFIG.endpoint}/?${queryString}`;

        console.log('🔗 请求URL:', url);

        const response = await axios({
            method,
            url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Host': ALIYUN_CONFIG.endpoint
            },
            timeout: 30000
        });

        console.log('✅ 时间戳格式正确，API调用成功');
        console.log('响应状态:', response.status);
        return response.data;
    } catch (error) {
        console.error('❌ 时间戳格式错误:', error.response?.data || error.message);
        if (error.response?.data?.Code === 'InvalidTimeStamp.Format') {
            console.log('📝 建议时间戳格式:', getAliyunTimestamp());
        }
    }
}

if (require.main === module) {
    testTimestamp().catch(console.error);
}

module.exports = { getAliyunTimestamp, testTimestamp };
