const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA_PATH = path.join(__dirname, 'post_seed.json');
const COVER_DIR = path.join(__dirname, '..', 'uploads', 'post-covers');

const slugify = (text, fallback) => {
  const allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-';
  const slug = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .split('')
    .filter((ch) => allowed.includes(ch))
    .join('')
    .slice(0, 60);
  return slug || fallback;
};

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error('post_seed.json not found');
  }
  const seed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const item = seed[i];
    const title = (item.title || '').trim();
    if (!title) continue;
    const filename = `${slugify(title, `post-${i + 1}`)}.png`;
    const fullPath = path.join(COVER_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      console.warn('cover missing for', title, filename);
      continue;
    }
    const relPath = `/uploads/post-covers/${filename}`;
    await prisma.userPost.updateMany({ where: { title }, data: { coverImage: relPath, images: null } });
    updated++;
  }
  console.log(`cover applied to ${updated} posts`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
