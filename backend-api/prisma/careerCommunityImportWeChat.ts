/**
 * 从本机微信「文件」目录批量导入长文/大咖访谈/应届生帖到 MySQL（user_posts / expert_posts）
 *
 * 依赖：
 * - macOS: `textutil`（系统自带，用于 .docx → 纯文本）
 * - 已安装依赖：`xlsx`（读 .xlsx）
 *
 * 用法（在 backend-api 目录）：
 *   export CAREER_IMPORT_DIR="/path/to/2026-04"   # 含 .docx / .xlsx 的目录
 *   npx ts-node prisma/careerCommunityImportWeChat.ts
 *
 * 可选：
 *   IMPORT_ASSIGN_USER_EMAIL=circle.demo@aiinterview.com  # 非空时帖子关联该用户（需已存在或脚本内会 upsert 演示用户）
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

/**
 * 大图池：80+ 张不重复 Unsplash；另有一批来自公开 API 响应样例中的真实 photo id。
 * 选图：封面用 pickSeq 轮播 (seq % n)，再配 hash 分散图库，减少列表里“总那几张”的观感。
 */
const UNSPLASH_POOL: string[] = [
  'photo-1522071820081-009f0129c71c',
  'photo-1454165804606-c3d57bc86b40',
  'photo-1517694712202-14dd9538aa97',
  'photo-1524758631624-e2822e304c36',
  'photo-1498050108023-c5249f4df085',
  'photo-1552664730-d307ca884978',
  'photo-1542744173-8e7e53415bb0',
  'photo-1600880292203-757bb62b4baf',
  'photo-1517430816045-df4b7de11d1d',
  'photo-1523240795612-9a054b0db644',
  'photo-1486312338219-ce68d2c6f44d',
  'photo-1504384308090-c54be3855833',
  'photo-1507679799987-c73779587ccf',
  'photo-1551836022-d5d88e9218df',
  'photo-1560250099711-195a6ad471cc',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1521737604893-d14cc237f11d',
  'photo-1551434678-e076c223a692',
  'photo-1506126613408-eca07ce68773',
  'photo-1517245386807-bb43f82c33c4',
  'photo-1556761175-5973dc0f32e7',
  'photo-1522075469751-3a6694fb2f61',
  'photo-1483478550801-ceba5fe50e8e',
  'photo-1553877522-43269d4ea984',
  'photo-1529101091764-c3526daf38fe',
  'photo-1519389950473-47ba0277781c',
  'photo-1518779578993-ec3579fee39f',
  'photo-1531482615713-2afd69097998',
  'photo-1515378791036-0648a3ef77b2',
  'photo-1521791136064-7986c2920216',
  'photo-1520607162513-77705c0f0d4a',
  'photo-1524504388940-b1c1722653e1',
  'photo-1525130413817-d45c1d127c42',
  'photo-1535713875002-d1d0cf377fde',
  'photo-1520813792240-56fc4a3765a7',
  'photo-1544723795-3fb6469f5b39',
  'photo-1524253482453-3fed8d2fe12b',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1517841905240-472988babdf9',
  'photo-1500648767791-00dcc994a43e',
  'photo-1519345182560-3f2917c472ef',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1527980965255-d3b416303d12',
  'photo-1584697964190-05b1615ce285',
  'photo-1497366216548-37526070297c',
  'photo-1517248135467-4c7edcad34c4',
  'photo-1525182008055-f88b95ff7980',
  'photo-1560472354-b33f4e44a670',
  'photo-1526374965328-7f61d4dc18c5',
  'photo-1455849318743-b2233052fccd',
  'photo-1504386106331-3e4e71712b38',
  'photo-1557804506-669a67965ba0',
  'photo-1524178232363-1fb2b075b655',
  'photo-1511578314322-379afb476865',
  'photo-1529333166437-7750a6a9ac8d',
  'photo-1522202176988-66273c2fd55f',
  'photo-1448932223592-d1a7e0c4e0e2',
  'photo-1521791065364-18956b0a5c4a',
  'photo-1488190411115-7c80a7db4e01',
  'photo-1504384764586-bb4b8e0b7e0e',
  'photo-1556761175-b413da4baf72',
  'photo-1540575467063-178a50c2df87',
  'photo-1475721027785-f74eccf877e2',
  'photo-1434030216411-0b793f4b4173',
  'photo-1560179707-f14e90ef3623',
  // 经 curl/公开 API 样例校验可访问的补图（与上表去重后并入）
  'photo-1506744038136-46273834b3fb',
  'photo-1506905925346-21bda4d32df4',
  'photo-1562886877-aaaa5c0b3225',
  'photo-1572652963245-bd7fda887078',
  'photo-1572656934803-d2162b2e98bf',
  'photo-1572498134246-4dee76a1d26d',
  'photo-1572671002496-f3b19f83fff0',
  'photo-1572627788416-9859e24fe38e',
  'photo-1572629750269-384d91405a7a',
  'photo-1570868830409-229321ac8aca',
  'photo-1572630419218-9a3c24729214',
  'photo-1572634309033-e45425ec0f5b',
  'photo-1572635148687-307f8ca9b737',
  'photo-1572628252713-5f0904beb2fa',
];

let pickSeq = 0;

const UNSPLASH_POOL_DEDUPED: string[] = [...new Set(UNSPLASH_POOL)];

const img = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=82`;

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 从 [a,b,c] 得到三个不重复的下标（模 n） */
function distinctIndices(a: number, b: number, c: number, n: number): [number, number, number] {
  const seen = new Set<number>();
  const pick = (x: number) => {
    let v = ((x % n) + n) % n;
    let guard = 0;
    while (seen.has(v) && guard < n) {
      v = (v + 1) % n;
      guard += 1;
    }
    seen.add(v);
    return v;
  };
  return [pick(a), pick(b), pick(c)];
}

function pickImages(key: string): { cover: string; gallery: string[] } {
  const pool = UNSPLASH_POOL_DEDUPED;
  const n = pool.length;
  if (n === 0) {
    throw new Error('UNSPLASH_POOL 为空');
  }
  const seq = pickSeq++;
  const h = strHash(key);
  // 封面：顺序轮播，使连续导入的帖子先遍历不同图
  const coverIdx = seq % n;
  const a = coverIdx;
  const b = (seq * 17 + (h % 97) + 3) % n;
  const c = (seq * 31 + (h % 53) + 7) % n;
  const [i0, i1, i2] = distinctIndices(a, b, c, n);
  const g = [i0, i1, i2]
    .map((i) => img(pool[i]))
    .filter((u, j, arr) => arr.indexOf(u) === j);
  return {
    cover: g[0] ?? img(pool[0]),
    gallery: g,
  };
}

function engagementSeed(k: string) {
  const h = strHash(k);
  return {
    viewCount: 400 + (h % 12000),
    likeCount: 12 + (h % 500),
    commentCount: 2 + (h % 120),
    shareCount: 1 + (h % 80),
  };
}

const DEFAULT_DIR =
  process.env.CAREER_IMPORT_DIR ||
  path.join(
    process.env.HOME || '',
    'Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_h5q2jvq71r3o12_f2c1/msg/file/2026-04'
  );

function readDocxAsPlainText(filePath: string): string {
  if (process.platform !== 'darwin') {
    throw new Error('当前导入脚本在 macOS 上通过 textutil 转换 .docx。若在 Linux/Windows，请先将 .docx 另存为 .txt 或自行接入 mammoth。');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

const EXPERT_META: Array<{ name: string; title: string; company: string; avatar: string }> = [
  {
    name: '李薇',
    title: '首席营销官 (CMO)',
    company: '莉莉丝科技',
    avatar: img('photo-1572627788416-9859e24fe38e', 400),
  },
  {
    name: '张薇',
    title: 'CEO',
    company: '领臻科技',
    avatar: img('photo-1506905925346-21bda4d32df4', 400),
  },
  {
    name: '李睿',
    title: '合伙人',
    company: '星瀚资本',
    avatar: img('photo-1506744038136-46273834b3fb', 400),
  },
  {
    name: '陈璐',
    title: '职业发展导师 / 前世界 500 强 HRD',
    company: '（职业咨询）',
    avatar: img('photo-1572498134246-4dee76a1d26d', 400),
  },
  {
    name: '王瀚',
    title: '副总经理、党委委员',
    company: '某特大型央企集团',
    avatar: img('photo-1572630419218-9a3c24729214', 400),
  },
];

function splitExpertDoc(full: string): string[] {
  const parts = full.split(/(?=【(?:职场|HR|国企)大咖访谈】)/g).map((p) => p.trim());
  return parts.filter((p) => p.length > 10);
}

function firstMatchTitle(content: string): string {
  const m = content.match(/标题[：:]\s*([^\r\n]+)/);
  const raw = m ? m[1] : content.split(/\r?\n/)[0];
  return raw.replace(/[\s\u200b\u00a0]+/g, ' ').trim().slice(0, 200);
}

const ARTICLE_FILES: Array<{ file: string; id: string; tags: string[] }> = [
  { file: '回国求职：国内招聘渠道解读.docx', id: 'career-wx-article-01', tags: ['回国求职', '招聘渠道', '校招社招'] },
  { file: '回国求职：海归求职时间线规划.docx', id: 'career-wx-article-02', tags: ['回国求职', '时间线', '海归'] },
  { file: '回国求职：留学生专属招聘项目介绍.docx', id: 'career-wx-article-03', tags: ['回国求职', '留学生', '管培生'] },
  { file: '回国求职：如何体现海外求学优势.docx', id: 'career-wx-article-04', tags: ['回国求职', '优势', '面试'] },
  { file: '回国求职：如何应对\u201c海待\u201d期.docx', id: 'career-wx-article-05', tags: ['回国求职', '空窗期', '心态'] },
  { file: '求职攻略：简历撰写技巧.docx', id: 'career-wx-article-06', tags: ['求职攻略', '简历', '干货'] },
  { file: '求职攻略：面试高频问题破解.docx', id: 'career-wx-article-07', tags: ['求职攻略', '面试', '面经'] },
  { file: '求职攻略：名企笔试经验.docx', id: 'career-wx-article-08', tags: ['求职攻略', '笔试', '名企'] },
  { file: '求职攻略：薪资谈判技巧.docx', id: 'career-wx-article-09', tags: ['求职攻略', '薪资', '谈薪'] },
  { file: '求职攻略：Offer选择.docx', id: 'career-wx-article-10', tags: ['求职攻略', 'Offer', '选择'] },
  { file: '热门行业解析.docx', id: 'career-wx-article-11', tags: ['行业', 'AI', '新能源', '求职'] },
  { file: '学长学姐说.docx', id: 'career-wx-article-12', tags: ['职场成长', '学长学姐', '避坑'] },
  { file: '职场适应：如何做好本职工作.docx', id: 'career-wx-article-13', tags: ['职场适应', '执行', '新人'] },
  { file: '职场适应：学生到职场人的心态转变.docx', id: 'career-wx-article-14', tags: ['职场适应', '心态', '成长'] },
  { file: '职场适应：与领导、同事的相处之道.docx', id: 'career-wx-article-15', tags: ['职场适应', '沟通', '人际'] },
  { file: '职场适应：职场沟通技巧.docx', id: 'career-wx-article-16', tags: ['职场适应', '沟通', '协作'] },
  { file: '职场心理健康：保持积极心态.docx', id: 'career-wx-article-17', tags: ['心理健康', '积极心态', '自我调节'] },
  { file: '职场心理健康：如何应对求职焦虑.docx', id: 'career-wx-article-18', tags: ['心理健康', '焦虑', '求职'] },
];

function parseTitleBody(cell: string): { title: string; body: string } {
  const t = cell.replace(/\r\n/g, '\n').trim();
  const m = t.match(/标题[：:]\s*([\s\S]+?)\s*内容[：:]\s*([\s\S]+)/i);
  if (m) {
    return { title: m[1].replace(/\s+/g, ' ').trim().slice(0, 200), body: m[2].trim() };
  }
  return { title: t.slice(0, 60), body: t };
}

function pickLongestCell(row: unknown[]): string {
  const cells = [0, 1, 2].map((i) => (row[i] != null ? String(row[i]).trim() : ''));
  return cells.sort((a, b) => b.length - a.length)[0] || '';
}

async function ensureDemoUserId(): Promise<string | null> {
  const email = process.env.IMPORT_ASSIGN_USER_EMAIL?.trim();
  if (!email) return null;
  const pwd = await bcrypt.hash('user123456', 12);
  const u = await prisma.user.upsert({
    where: { email },
    update: { isActive: true, isVerified: true },
    create: {
      email,
      password: pwd,
      name: '职场内容库',
      phone: '13900001099',
      gender: 'FEMALE',
      age: 27,
      education: '硕士',
      experience: '官方 / 合作内容',
      skills: JSON.stringify(['求职指导', '职场成长']),
      isActive: true,
      isVerified: true,
    },
  });
  return u.id;
}

async function importExpert(dir: string) {
  const p = path.join(dir, '大咖访谈5篇.docx');
  const raw = readDocxAsPlainText(p);
  const segs = splitExpertDoc(raw);
  if (segs.length !== EXPERT_META.length) {
    console.warn(`⚠️ 大咖访谈分段数 ${segs.length}，与元数据 ${EXPERT_META.length} 不一致，将按取短边对齐。`);
  }
  const n = Math.min(segs.length, EXPERT_META.length);
  for (let i = 0; i < n; i++) {
    const content = segs[i].trim();
    const title = firstMatchTitle(content);
    const meta = EXPERT_META[i];
    const { cover, gallery } = pickImages(`expert-${i}-${title}`);
    const e = engagementSeed(`expert-${i}`);
    const id = `career-wx-expert-0${i + 1}`;
    const tags = JSON.stringify(['大咖访谈', '职场', '深度']);
    await prisma.expertPost.upsert({
      where: { id },
      create: {
        id,
        expertName: meta.name,
        expertTitle: meta.title,
        expertCompany: meta.company,
        expertAvatar: meta.avatar,
        title,
        content,
        coverImage: cover,
        tags,
        viewCount: e.viewCount,
        likeCount: e.likeCount,
        commentCount: e.commentCount,
        isTop: i === 0,
        publishedAt: new Date(),
      },
      update: {
        expertName: meta.name,
        expertTitle: meta.title,
        expertCompany: meta.company,
        expertAvatar: meta.avatar,
        title,
        content,
        coverImage: cover,
        tags,
        viewCount: e.viewCount,
        likeCount: e.likeCount,
        commentCount: e.commentCount,
        isTop: i === 0,
        publishedAt: new Date(),
      },
    });
    console.log(`  ✅ expert_posts ${id} — ${title.slice(0, 40)}…`);
  }
}

async function importArticles(dir: string, userId: string | null) {
  for (const a of ARTICLE_FILES) {
    const fp = path.join(dir, a.file);
    const text = readDocxAsPlainText(fp);
    const title = firstMatchTitle(text);
    const { cover, gallery } = pickImages(a.id + title);
    const eng = engagementSeed(a.id);
    await prisma.userPost.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        userId,
        title,
        content: text.trim(),
        coverImage: cover,
        images: JSON.stringify(gallery),
        tags: JSON.stringify(a.tags),
        viewCount: eng.viewCount,
        likeCount: eng.likeCount,
        commentCount: eng.commentCount,
        shareCount: eng.shareCount,
        isHot: strHash(a.id) % 4 === 0,
        status: 'PUBLISHED',
      },
      update: {
        userId,
        title,
        content: text.trim(),
        coverImage: cover,
        images: JSON.stringify(gallery),
        tags: JSON.stringify(a.tags),
        viewCount: eng.viewCount,
        likeCount: eng.likeCount,
        commentCount: eng.commentCount,
        shareCount: eng.shareCount,
        isHot: strHash(a.id) % 4 === 0,
        status: 'PUBLISHED',
      },
    });
    console.log(`  ✅ user_posts ${a.id} — ${title.slice(0, 40)}…`);
  }
}

async function importBbsXlsx(dir: string, userId: string | null) {
  const p = path.join(dir, '应届毕业生发帖70篇.xlsx');
  const wb = XLSX.readFile(p);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
  let idx = 0;
  for (const row of rows) {
    if (!Array.isArray(row) || !row.length) continue;
    const cell = pickLongestCell(row);
    if (cell.length < 15) continue;
    const { title, body } = parseTitleBody(cell);
    if (!body || body.length < 10) continue;
    idx += 1;
    const id = `career-wx-bbs-${String(idx).padStart(3, '0')}`;
    const rowTags: string[] = ['应届毕业生', 'BBS', '树洞'];
    const s0 = row[0] != null ? String(row[0]).trim() : '';
    const s1 = row[1] != null ? String(row[1]).trim() : '';
    if (s0 && s0.length < 24 && !s0.includes('标题') && !s0.includes('内容：')) rowTags.push(s0);
    if (s1 && s1.length < 48 && !s1.includes('标题：') && !s1.includes('内容：')) rowTags.push(s1);
    const { cover, gallery } = pickImages(id + title);
    const eng = engagementSeed(id);
    await prisma.userPost.upsert({
      where: { id },
      create: {
        id,
        userId,
        title,
        content: body,
        coverImage: cover,
        images: JSON.stringify(gallery),
        tags: JSON.stringify(rowTags),
        viewCount: eng.viewCount,
        likeCount: eng.likeCount,
        commentCount: eng.commentCount,
        shareCount: eng.shareCount,
        isHot: false,
        status: 'PUBLISHED',
      },
      update: {
        userId,
        title,
        content: body,
        coverImage: cover,
        images: JSON.stringify(gallery),
        tags: JSON.stringify(rowTags),
        viewCount: eng.viewCount,
        likeCount: eng.likeCount,
        commentCount: eng.commentCount,
        shareCount: eng.shareCount,
        isHot: false,
        status: 'PUBLISHED',
      },
    });
  }
  console.log(`  ✅ user_posts 应届毕业生帖 ${idx} 条`);
}

async function main() {
  const dir = path.resolve(DEFAULT_DIR);
  if (!fs.existsSync(dir)) {
    console.error(
      `未找到目录: ${dir}\n请设置 CAREER_IMPORT_DIR 指向放有 .docx / .xlsx 的文件夹（或把微信文件复制到项目内再指定路径）。`
    );
    process.exit(1);
  }
  console.log(`📂 导入源目录: ${dir}`);

  const userId = await ensureDemoUserId();
  if (userId) console.log(`👤 帖子关联 userId: ${userId} (${process.env.IMPORT_ASSIGN_USER_EMAIL})`);
  else console.log('👤 帖子为匿名 (userId = null)');

  console.log('— 大咖访谈 (expert_posts) —');
  await importExpert(dir);
  console.log('— 攻略长文 (user_posts) —');
  await importArticles(dir, userId);
  console.log('— 应届生 BBS (user_posts) —');
  await importBbsXlsx(dir, userId);

  console.log('🎉 导入完成。');
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
