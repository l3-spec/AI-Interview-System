const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA_PATH = path.join(__dirname, 'post_seed.json');

const normalizeStatus = (status) => {
  const allowed = new Set(['PUBLISHED', 'DRAFT', 'HIDDEN', 'DELETED', 'PENDING', 'REJECTED', 'BANNED']);
  if (status && allowed.has(status.toUpperCase())) {
    return status.toUpperCase();
  }
  return 'PUBLISHED';
};

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Seed file not found: ${DATA_PATH}`);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const records = JSON.parse(raw);

  let created = 0;
  let skipped = 0;

  for (const item of records) {
    const title = (item.title || '').trim();
    const content = (item.content || '').trim();
    if (!title || !content) {
      console.warn(`skip empty title/content from ${item.source || 'unknown'}`);
      continue;
    }

    const existing = await prisma.userPost.findFirst({
      where: { title }
    });

    if (existing) {
      skipped++;
      continue;
    }

    const tags = Array.isArray(item.tags) ? item.tags.map((t) => `${t}`.trim()).filter(Boolean) : [];

    await prisma.userPost.create({
      data: {
        title: title.slice(0, 180),
        content,
        tags: tags.length ? JSON.stringify(tags) : null,
        status: normalizeStatus(item.status),
        isHot: Boolean(item.isHot),
        userId: null
      }
    });
    created++;
  }

  console.log(`Import completed. created=${created}, skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
