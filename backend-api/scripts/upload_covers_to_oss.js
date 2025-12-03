const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const OSS = require('ali-oss');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const region = process.env.OSS_REGION;
const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;
const cdnDomain = process.env.OSS_CDN_DOMAIN;

if (!region || !accessKeyId || !accessKeySecret || !bucket) {
  console.error('OSS 配置不完整，请检查 .env');
  process.exit(1);
}

const client = new OSS({ region, accessKeyId, accessKeySecret, bucket });

const localDir = path.join(__dirname, '..', 'uploads', 'post-covers');

const fileUrl = (key) => {
  if (cdnDomain) return `https://${cdnDomain}/${key}`;
  return `https://${bucket}.${region}.aliyuncs.com/${key}`;
};

(async () => {
  const files = fs.existsSync(localDir)
    ? fs
        .readdirSync(localDir)
        .filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()))
        .sort()
    : [];
  if (!files.length) {
    console.log('本地未找到封面文件');
    return;
  }

  const posts = await prisma.userPost.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!posts.length) {
    console.log('无帖子记录可更新');
    return;
  }

  let uploaded = 0;
  for (let i = 0; i < files.length && i < posts.length; i++) {
    const file = files[i];
    const post = posts[i];
    const localPath = path.join(localDir, file);
    const objectKey = `post-covers/${file}`;
    try {
      await client.put(objectKey, localPath, { headers: { 'x-oss-object-acl': 'public-read' } });
      await client.putACL(objectKey, 'public-read');
      const url = fileUrl(objectKey);
      await prisma.userPost.update({ where: { id: post.id }, data: { coverImage: url } });
      uploaded++;
      console.log(`uploaded ${file} -> ${url} | post: ${post.title}`);
    } catch (err) {
      console.error(`上传失败 ${file}:`, err.message || err);
    }
  }
  console.log(`完成，上传并更新 ${uploaded} 张封面`);
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
