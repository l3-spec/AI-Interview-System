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
  const files = fs.existsSync(localDir) ? fs.readdirSync(localDir).filter((f) => f.endsWith('.png')) : [];
  if (!files.length) {
    console.log('本地未找到封面文件');
    return;
  }
  let uploaded = 0;
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const objectKey = `post-covers/${file}`;
    try {
      await client.put(objectKey, localPath, {
        headers: { 'x-oss-object-acl': 'public-read' },
      });
      // 再次显式设置ACL为public-read，避免默认私有
      await client.putACL(objectKey, 'public-read');
      const url = fileUrl(objectKey);
      await prisma.userPost.updateMany({ where: { coverImage: { contains: file } }, data: { coverImage: url } });
      uploaded++;
      console.log(`uploaded ${file} -> ${url}`);
    } catch (err) {
      console.error(`上传失败 ${file}:`, err.message || err);
    }
  }
  console.log(`完成，上传 ${uploaded} 张封面`);
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
