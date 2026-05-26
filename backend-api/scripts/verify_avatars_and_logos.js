/**
 * 验证用户头像和企业 Logo 是否已全部更新
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(false); return; }
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 8000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  console.log('🔍 === 验证头像和 Logo 更新结果 ===\n');

  // 用户头像验证
  const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });
  const usersWithout = users.filter(u => !u.avatar);
  const usersWith = users.filter(u => u.avatar);
  console.log(`👤 用户总数: ${users.length}`);
  console.log(`   有头像: ${usersWith.length}`);
  console.log(`   无头像: ${usersWithout.length}`);

  // 抽样验证 OSS 链接可用性（前3个）
  console.log('\n   抽样检查 OSS 链接（前3个用户）:');
  for (const u of usersWith.slice(0, 3)) {
    const ok = await checkUrl(u.avatar);
    console.log(`   ${ok ? '✅' : '❌'} ${u.name}: ${ok ? '可访问' : '不可访问'} → ${u.avatar}`);
  }

  // 企业 Logo 验证
  const companies = await prisma.company.findMany({ select: { id: true, name: true, logo: true } });
  const compWithout = companies.filter(c => !c.logo);
  const compWith = companies.filter(c => c.logo);
  console.log(`\n🏢 企业总数: ${companies.length}`);
  console.log(`   有 Logo: ${compWith.length}`);
  console.log(`   无 Logo: ${compWithout.length}`);

  console.log('\n   抽样检查 OSS 链接（前3个企业）:');
  for (const c of compWith.slice(0, 3)) {
    const ok = await checkUrl(c.logo);
    console.log(`   ${ok ? '✅' : '❌'} ${c.name}: ${ok ? '可访问' : '不可访问'} → ${c.logo}`);
  }

  // 汇总
  console.log('\n═══════════════════════════════════');
  if (usersWithout.length === 0 && compWithout.length === 0) {
    console.log('🎉 所有用户和企业均已有头像/Logo！');
  } else {
    if (usersWithout.length > 0) console.log(`⚠️  仍有 ${usersWithout.length} 个用户缺少头像`);
    if (compWithout.length > 0) console.log(`⚠️  仍有 ${compWithout.length} 个企业缺少 Logo`);
  }
  console.log('═══════════════════════════════════');
}

main()
  .catch(e => { console.error('验证失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
