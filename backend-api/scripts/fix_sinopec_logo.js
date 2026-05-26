/**
 * 修复中石化北分的 Logo
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const OSS = require('ali-oss');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const region = process.env.OSS_REGION;
const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;

const ossClient = new OSS({ region, accessKeyId, accessKeySecret, bucket });

async function main() {
  console.log('修复中石化北分的 Logo...');
  
  const company = await prisma.company.findFirst({
    where: { name: '中石化北分' }
  });
  
  if (!company) {
    console.log('未找到中石化北分');
    return;
  }
  
  // 使用 UI Avatars 生成 Logo（强制使用）
  const initials = '中石';
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=256&bold=true&format=png`;
  
  console.log('下载 Logo:', url);
  
  const https = require('https');
  const buffer = await new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
  
  console.log('下载成功，大小:', buffer.length, 'bytes');
  
  // 上传到 OSS
  const objectKey = `logos/${company.id}-${Date.now()}.png`;
  await ossClient.put(objectKey, buffer);
  
  const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
  
  // 更新数据库
  await prisma.company.update({
    where: { id: company.id },
    data: { logo: ossUrl }
  });
  
  console.log('✅ 中石化北分 Logo 已更新:', ossUrl);
}

main()
  .catch(e => console.error('失败:', e))
  .finally(() => prisma.$disconnect());
