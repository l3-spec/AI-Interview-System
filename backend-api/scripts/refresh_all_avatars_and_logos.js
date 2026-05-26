/**
 * 批量刷新用户头像和企业 Logo
 * 使用无版权图片源（DiceBear + UI Avatars），上传至 OSS 并更新 MySQL
 * 
 * 使用方式：
 *   node scripts/refresh_all_avatars_and_logos.js
 * 
 * 环境变量（.env 中配置）：
 *   OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET,
 *   OSS_BUCKET（企业主桶）, OSS_USER_BUCKET（用户桶）
 */

const https = require('https');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const OSS = require('ali-oss');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ====== OSS 配置 ====== */
const region = process.env.OSS_REGION;
const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;
const userBucket = process.env.OSS_USER_BUCKET || bucket;

if (!region || !accessKeyId || !accessKeySecret || !bucket) {
  console.error('❌ OSS 配置不完整，请检查 backend-api/.env');
  process.exit(1);
}

const ossClientMain = new OSS({ region, accessKeyId, accessKeySecret, bucket });
const ossClientUser = new OSS({ region, accessKeyId, accessKeySecret, bucket: userBucket });

/* ====== 工具函数 ====== */
function buildUrl(key, isUserBucket = false) {
  const b = isUserBucket ? userBucket : bucket;
  return `https://${b}.${region}.aliyuncs.com/${key}`;
}

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('超时')); });
  });
}

async function uploadToOSS(buffer, key, isUserBucket = false) {
  const client = isUserBucket ? ossClientUser : ossClientMain;
  await client.put(key, buffer);
  return buildUrl(key, isUserBucket);
}

/* ====== 用户头像生成（多源混合，模拟真实世界） ======
 * 分配比例：
 *   ~45% 真实人像照片（randomuser.me / pravatar.cc）
 *   ~35% 卡通/插画风（DiceBear 多种风格）
 *   ~20% 艺术/抽象风（DiceBear bottts/identicon 等）
 */

// ---------- 1. 真实人像照片源 ----------
// randomuser.me 提供 AI 生成的高质量真实人像（无版权）
const REAL_MALE_IDS   = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87,89,91,93,95,97,99];
const REAL_FEMALE_IDS = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,99];

function getRealPhotoUrl(gender, index) {
  if (gender === 'MALE') {
    const id = REAL_MALE_IDS[index % REAL_MALE_IDS.length];
    return `https://randomuser.me/api/portraits/men/${id}.jpg`;
  } else if (gender === 'FEMALE') {
    const id = REAL_FEMALE_IDS[index % REAL_FEMALE_IDS.length];
    return `https://randomuser.me/api/portraits/women/${id}.jpg`;
  }
  // 随机
  const id = (index % 99) + 1;
  return `https://i.pravatar.cc/256?img=${id}`;
}

// ---------- 2. 卡通/插画风（DiceBear） ----------
const CARTOON_STYLES = [
  'avataaars',   // 真实卡通
  'adventurer',  // 冒险者
  'lorelei',     // 优雅插画
  'micah',       // 现代扁平
  'big-smile',   // 大笑脸
  'personas',    // 肖像风
  'notionists',  // Notion 风
  'open-peeps',  // 手绘风
];

function getCartoonUrl(user, index) {
  const style = CARTOON_STYLES[index % CARTOON_STYLES.length];
  const seed = encodeURIComponent(user.name || `u-${index}`) + `-${index}`;
  return `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=256`;
}

// ---------- 3. 艺术/抽象/像素风 ----------
const ART_STYLES = [
  'bottts',      // 机器人
  'identicon',   // GitHub 风
  'pixel-art',   // 像素艺术
  'shapes',      // 几何图形
  'thumbs',      // 表情拇指
];

function getArtUrl(user, index) {
  const style = ART_STYLES[index % ART_STYLES.length];
  const seed = encodeURIComponent(user.name || `a-${index}`) + `-${index}`;
  return `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=256`;
}

// ---------- 综合分配函数 ----------
function getUserAvatarUrl(user, index, totalCount) {
  const gender = (user.gender || 'OTHER').toUpperCase();
  // 用 index 决定类别，保证分布均匀
  const bucket = index % 20;
  if (bucket < 9) {
    // 45% 真实照片
    return { url: getRealPhotoUrl(gender, index), type: '真实照片' };
  } else if (bucket < 16) {
    // 35% 卡通插画
    return { url: getCartoonUrl(user, index), type: '卡通插画' };
  } else {
    // 20% 艺术抽象
    return { url: getArtUrl(user, index), type: '艺术风格' };
  }
}

/* ====== 企业 Logo 生成 ====== */
const LOGO_COLORS = [
  '667eea', '764ba2', 'f093fb', '4facfe', '43e97b',
  'fa709a', 'fee140', '30cfd0', 'a8edea', 'ff9a9e',
  '6a11cb', '2575fc', 'ff6a00', 'ee0979', '11998e'
];

function getCompanyLogoUrl(companyName, index) {
  // 提取前两个汉字/字母作为缩写
  const initials = companyName
    .replace(/[()（）\s]/g, '')
    .split('')
    .filter(c => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(c))
    .slice(0, 2)
    .join('');
  const color = LOGO_COLORS[index % LOGO_COLORS.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=256&bold=true&font-size=0.4`;
}

/* ====== 主流程 ====== */
async function main() {
  console.log('🚀 === 批量刷新用户头像 & 企业 Logo ===\n');

  /* ----- 1. 用户头像 ----- */
  console.log('📸 开始处理用户头像...');
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, gender: true, avatar: true }
  });
  console.log(`   共找到 ${allUsers.length} 个用户`);

  let userOk = 0, userFail = 0;
  let typeStats = { '真实照片': 0, '卡通插画': 0, '艺术风格': 0 };
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    try {
      const { url, type } = getUserAvatarUrl(user, i, allUsers.length);
      const buf = await download(url);
      // 真实照片为 jpg，其他为 png
      const ext = type === '真实照片' ? 'jpg' : 'png';
      const key = `avatars/${user.id}-${Date.now()}.${ext}`;
      const ossUrl = await uploadToOSS(buf, key, true);

      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: ossUrl }
      });
      userOk++;
      typeStats[type] = (typeStats[type] || 0) + 1;
      const tag = user.avatar ? '🔄' : '✅';
      console.log(`   ${tag} [${type}] ${user.name} → ${ossUrl}`);
      await sleep(300);
    } catch (err) {
      userFail++;
      console.error(`   ❌ ${user.name} 失败: ${err.message}`);
    }
  }
  console.log(`\n✅ 用户头像完成: 成功 ${userOk}, 失败 ${userFail}`);
  console.log(`   分布: 真实照片 ${typeStats['真实照片']}, 卡通插画 ${typeStats['卡通插画']}, 艺术风格 ${typeStats['艺术风格']}\n`);

  /* ----- 2. 企业 Logo ----- */
  console.log('🏢 开始处理企业 Logo...');
  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, logo: true }
  });
  console.log(`   共找到 ${allCompanies.length} 个企业`);

  let compOk = 0, compFail = 0;
  for (let i = 0; i < allCompanies.length; i++) {
    const company = allCompanies[i];
    try {
      const url = getCompanyLogoUrl(company.name, i);
      const buf = await download(url);
      const key = `logos/${company.id}-${Date.now()}.png`;
      const ossUrl = await uploadToOSS(buf, key, false);

      await prisma.company.update({
        where: { id: company.id },
        data: { logo: ossUrl }
      });
      compOk++;
      const tag = company.logo ? '🔄 已刷新' : '✅ 新增';
      console.log(`   ${tag} ${company.name} → ${ossUrl}`);
      await sleep(250);
    } catch (err) {
      compFail++;
      console.error(`   ❌ ${company.name} 失败: ${err.message}`);
    }
  }
  console.log(`\n✅ 企业 Logo 完成: 成功 ${compOk}, 失败 ${compFail}\n`);

  /* ----- 3. 汇总 ----- */
  console.log('═══════════════════════════════════');
  console.log(`📊 汇总: 用户头像 ${userOk}/${allUsers.length}, 企业 Logo ${compOk}/${allCompanies.length}`);
  console.log(`📦 共上传 ${userOk + compOk} 张图片到 OSS`);
  console.log('═══════════════════════════════════');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main()
  .catch((e) => { console.error('💥 脚本执行失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
