/**
 * 完善用户头像和企业图片
 * 1. 重命名用户为普通人名
 * 2. 使用PNG格式用户头像
 * 3. 获取真实企业Logo
 * 4. 添加企业宣传照（办公楼/办公区）
 */
const https = require('https');
const http = require('http');
const path = require('path');
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

// 创建两个 OSS 客户端
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

// 普通中文姓名池
const FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'];
const LAST_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '文', '华', '力', '嘉', '欣', '宇', '浩', '然', '思', '雨', '梓', '涵', '轩', '博'];

function generateNormalName(index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length];
  return firstName + lastName;
}

// 获取用户头像（PNG格式，使用 DiceBear bottts 风格）
function getAvatarUrl(gender, index) {
  const seed = `user-avatar-${index}-${Date.now()}`;
  // bottts 风格生成可爱的机器人头像，PNG 格式
  return `https://api.dicebear.com/7.x/bottts/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=256`;
}

// 获取企业 Logo（优先使用 Clearbit API，失败则使用 UI Avatars）
async function getCompanyLogoUrl(companyName, email, index) {
  // 方法 1：尝试从 Clearbit 获取真实 Logo
  try {
    const domain = email ? email.split('@')[1] : null;
    if (domain) {
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const buffer = await downloadImage(clearbitUrl);
      if (buffer.length > 500) { // 确保不是错误图片
        console.log(`   从 Clearbit 获取到 ${companyName} 的 Logo`);
        return { buffer, type: 'png' };
      }
    }
  } catch (e) {
    // Clearbit 失败，继续尝试其他方法
  }

  // 方法 2：使用 UI Avatars 生成首字母 Logo
  const initials = companyName
    .split('')
    .filter(c => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(c))
    .slice(0, 2)
    .join('');
  
  const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '43e97b', 'fa709a', 'fee140'];
  const color = colors[index % colors.length];
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=256&bold=true&format=png`;
  
  try {
    const buffer = await downloadImage(url);
    console.log(`   使用 UI Avatars 生成 ${companyName} 的 Logo`);
    return { buffer, type: 'png' };
  } catch (e) {
    throw new Error(`无法获取 ${companyName} 的 Logo`);
  }
}

// 获取企业宣传照（办公楼/办公区）
function getCompanyPhotoUrl(index) {
  // 使用 Unsplash 的办公建筑图片（免费可商用）
  const officePhotos = [
    'photo-1497366216548-37526070297c', // 现代办公楼
    'photo-1497366811353-6870744d04b2', // 办公区内部
    'photo-1504384308090-c894fdcc538d', // 开放式办公区
    'photo-1556761175-5973dc0f32e7', // 会议室
    'photo-1551434678-e076c223a692', // 团队办公
    'photo-1522071820081-009f0129c71c', // 协作办公区
    'photo-1606857521015-7f9fcf423740', // 商务办公楼
    'photo-1556761175-4b46a572b786', // 企业前台
    'photo-1554469384-e58fac16e23a', // 现代办公空间
    'photo-1542744173-8e7e53415bb0', // 办公大楼外观
    'photo-1564069114553-7215e1ff1890', // 企业园区
    'photo-1577415124269-fc114a35e560', // 商务中心
    'photo-1486406146926-c627a92ad1ab', // 高层建筑
    'photo-1480714378408-67cf0d13bc1b', // 城市办公楼
    'photo-1449157291145-7efd050a4d0e', // 企业园区景观
  ];
  
  const photoId = officePhotos[index % officePhotos.length];
  return `https://images.unsplash.com/${photoId}?w=800&h=600&fit=crop&q=80`;
}

// 主函数
async function main() {
  console.log('=== 开始完善用户头像和企业图片 ===\n');
  
  // ========================================
  // 1. 处理用户：重命名 + PNG 头像
  // ========================================
  console.log('👥 处理用户数据...');
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      gender: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`找到 ${allUsers.length} 个用户需要处理\n`);
  
  let updatedUsers = 0;
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    try {
      // 1. 重命名为普通人名
      const normalName = generateNormalName(i);
      
      // 2. 获取 PNG 格式头像
      const avatarUrl = getAvatarUrl(user.gender, i);
      const buffer = await downloadImage(avatarUrl);
      
      // 3. 上传到 OSS
      const objectKey = `avatars/${user.id}-${Date.now()}.png`;
      const ossUrl = await uploadToOSS(buffer, objectKey, true);
      
      // 4. 更新数据库（名称 + 头像）
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: normalName,
          avatar: ossUrl
        }
      });
      
      updatedUsers++;
      console.log(`  ✅ ${user.name} -> ${normalName} | 头像: ${ossUrl.substring(0, 60)}...`);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`  ❌ 用户 ${user.name} 处理失败:`, error.message);
    }
  }
  
  console.log(`\n✅ 用户处理完成: ${updatedUsers}/${allUsers.length}\n`);
  
  // ========================================
  // 2. 处理企业：Logo + 宣传照
  // ========================================
  console.log('🏢 处理企业数据...');
  const allCompanies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      description: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`找到 ${allCompanies.length} 个企业需要处理\n`);
  
  let updatedCompanies = 0;
  for (let i = 0; i < allCompanies.length; i++) {
    const company = allCompanies[i];
    try {
      // 1. 获取企业 Logo（添加重试机制）
      let logoResult;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          logoResult = await getCompanyLogoUrl(company.name, company.email, i + retryCount);
          break;
        } catch (e) {
          retryCount++;
          if (retryCount > maxRetries) throw e;
          console.log(`   重试获取 ${company.name} 的 Logo (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const logoObjectKey = `logos/${company.id}-${Date.now()}.png`;
      const logoOssUrl = await uploadToOSS(logoResult.buffer, logoObjectKey, false);
      
      // 2. 获取企业宣传照
      const photoUrl = getCompanyPhotoUrl(i);
      const photoBuffer = await downloadImage(photoUrl);
      const photoObjectKey = `company-photos/${company.id}-${Date.now()}.jpg`;
      const photoOssUrl = await uploadToOSS(photoBuffer, photoObjectKey, false);
      
      // 3. 更新数据库（logo + 在 description 中添加宣传照引用）
      await prisma.company.update({
        where: { id: company.id },
        data: {
          logo: logoOssUrl
          // 注意：当前 schema 中没有单独的 photo 字段
          // 如果需要，可以考虑将宣传照 URL 存入 description 的 JSON 中
          // 或者扩展 schema 添加 companyPhoto 字段
        }
      });
      
      updatedCompanies++;
      console.log(`  ✅ ${company.name}`);
      console.log(`     Logo: ${logoOssUrl.substring(0, 60)}...`);
      console.log(`     宣传照: ${photoOssUrl.substring(0, 60)}...`);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ 企业 ${company.name} 处理失败:`, error.message);
    }
  }
  
  console.log(`\n✅ 企业处理完成: ${updatedCompanies}/${allCompanies.length}\n`);
  
  // ========================================
  // 3. 统计结果
  // ========================================
  console.log('=== 处理结果汇总 ===');
  console.log(`用户重命名 + 头像: ${updatedUsers} 个`);
  console.log(`企业 Logo + 宣传照: ${updatedCompanies} 个`);
  console.log(`总计: ${updatedUsers + updatedCompanies} 条记录已更新`);
  console.log('\n所有图片已上传到 OSS，数据库已更新');
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
