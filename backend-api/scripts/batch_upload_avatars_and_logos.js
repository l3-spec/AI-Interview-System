/**
 * 批量为用户和企业添加头像/Logo
 * 使用无版权图片源（DiceBear 头像 + 品牌 Logo 生成）
 */
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const OSS = require('ali-oss');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// OSS 配置
const region = process.env.OSS_REGION;
const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;
const userBucket = process.env.OSS_USER_BUCKET;
const cdnDomain = process.env.OSS_CDN_DOMAIN;

if (!region || !accessKeyId || !accessKeySecret || !bucket) {
  console.error('OSS 配置不完整，请检查 .env');
  process.exit(1);
}

// 创建两个 OSS 客户端（用户头像和企业 logo 使用不同 bucket）
const ossClientMain = new OSS({ region, accessKeyId, accessKeySecret, bucket });
const ossClientUser = new OSS({ region, accessKeyId, accessKeySecret, bucket: userBucket || bucket });

// 生成 URL 的辅助函数
const fileUrl = (key, isUserBucket = false) => {
  const actualBucket = isUserBucket ? (userBucket || bucket) : bucket;
  if (cdnDomain) return `https://${cdnDomain}/${key}`;
  return `https://${actualBucket}.${region}.aliyuncs.com/${key}`;
};

// 下载图片的辅助函数
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

// 上传到 OSS
async function uploadToOSS(buffer, objectKey, isUserBucket = false) {
  const client = isUserBucket ? ossClientUser : ossClientMain;
  await client.put(objectKey, buffer);
  return fileUrl(objectKey, isUserBucket);
}

// 从 DiceBear 生成用户头像（无版权）
// 使用 "avataaars" 风格，适合不同性别和特征
function getAvatarUrl(gender, index) {
  const styles = {
    'MALE': ['avataaars', 'adventurer', 'bottts'],
    'FEMALE': ['avataaars', 'adventurer', 'bottts'],
    'OTHER': ['avataaars', 'adventurer', 'bottts']
  };
  
  const genderKey = gender || 'OTHER';
  const styleList = styles[genderKey] || styles['OTHER'];
  const style = styleList[index % styleList.length];
  
  // 使用不同的 seed 确保头像多样化
  const seed = `user-${index}-${Date.now()}`;
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

// 获取企业 Logo（使用 UI Avatars API 生成首字母 Logo）
function getCompanyLogoUrl(companyName, index) {
  // 提取公司名称的首字母
  const initials = companyName
    .split('')
    .filter(c => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(c))
    .slice(0, 2)
    .join('');
  
  // 使用不同的背景色
  const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '43e97b', 'fa709a', 'fee140'];
  const color = colors[index % colors.length];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=256&bold=true`;
}

// 主函数
async function main() {
  console.log('=== 开始批量添加用户头像和企业 Logo ===\n');
  
  // 1. 处理用户头像
  console.log('📸 处理用户头像...');
  const usersWithoutAvatar = await prisma.user.findMany({
    where: {
      avatar: null
    },
    select: {
      id: true,
      name: true,
      gender: true
    }
  });
  
  console.log(`找到 ${usersWithoutAvatar.length} 个没有头像的用户`);
  
  let uploadedUsers = 0;
  for (let i = 0; i < usersWithoutAvatar.length; i++) {
    const user = usersWithoutAvatar[i];
    try {
      // 从 DiceBear 获取头像 SVG
      const avatarUrl = getAvatarUrl(user.gender, i);
      const buffer = await downloadImage(avatarUrl);
      
      // 上传到 OSS（使用用户 bucket）
      const objectKey = `avatars/${user.id}-${Date.now()}.svg`;
      const ossUrl = await uploadToOSS(buffer, objectKey, true);
      
      // 更新数据库
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: ossUrl }
      });
      
      uploadedUsers++;
      console.log(`  ✅ ${user.name} -> ${ossUrl}`);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ 用户 ${user.name} 处理失败:`, error.message);
    }
  }
  
  console.log(`\n✅ 用户头像处理完成: ${uploadedUsers}/${usersWithoutAvatar.length}\n`);
  
  // 2. 处理企业 Logo
  console.log('🏢 处理企业 Logo...');
  const companiesWithoutLogo = await prisma.company.findMany({
    where: {
      logo: null
    },
    select: {
      id: true,
      name: true
    }
  });
  
  console.log(`找到 ${companiesWithoutLogo.length} 个没有 Logo 的企业`);
  
  let uploadedCompanies = 0;
  for (let i = 0; i < companiesWithoutLogo.length; i++) {
    const company = companiesWithoutLogo[i];
    try {
      // 从 UI Avatars 获取 Logo
      const logoUrl = getCompanyLogoUrl(company.name, i);
      const buffer = await downloadImage(logoUrl);
      
      // 上传到 OSS
      const objectKey = `logos/${company.id}-${Date.now()}.png`;
      const ossUrl = await uploadToOSS(buffer, objectKey, false);
      
      // 更新数据库
      await prisma.company.update({
        where: { id: company.id },
        data: { logo: ossUrl }
      });
      
      uploadedCompanies++;
      console.log(`  ✅ ${company.name} -> ${ossUrl}`);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ 企业 ${company.name} 处理失败:`, error.message);
    }
  }
  
  console.log(`\n✅ 企业 Logo 处理完成: ${uploadedCompanies}/${companiesWithoutLogo.length}\n`);
  
  // 3. 统计结果
  console.log('=== 处理结果汇总 ===');
  console.log(`用户头像: ${uploadedUsers} 个`);
  console.log(`企业 Logo: ${uploadedCompanies} 个`);
  console.log(`总计: ${uploadedUsers + uploadedCompanies} 张图片已上传到 OSS`);
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
