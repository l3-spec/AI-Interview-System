const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED_PATH = path.join(__dirname, 'post_seed.json');

async function main() {
  if (!fs.existsSync(SEED_PATH)) {
    throw new Error(`Seed file not found: ${SEED_PATH}`);
  }
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const titleSet = new Set(seed.map((p) => (p.title || '').trim()).filter(Boolean));

  // Delete posts not in seed
  const deleteResult = await prisma.userPost.deleteMany({
    where: {
      NOT: {
        title: { in: Array.from(titleSet) },
      },
    },
  });
  console.log(`Deleted posts not in seed: ${deleteResult.count}`);

  let upserted = 0;
  for (const item of seed) {
    const title = (item.title || '').trim();
    const content = (item.content || '').trim();
    if (!title || !content) continue;
    const tags = Array.isArray(item.tags) ? item.tags.map((t) => `${t}`.trim()).filter(Boolean) : [];
    const existing = await prisma.userPost.findFirst({ where: { title } });
    if (existing) {
      await prisma.userPost.update({
        where: { id: existing.id },
        data: {
          content,
          tags: tags.length ? JSON.stringify(tags) : null,
          status: item.status?.toUpperCase?.() || 'PUBLISHED',
          isHot: Boolean(item.isHot),
        },
      });
    } else {
      await prisma.userPost.create({
        data: {
          title,
          content,
          tags: tags.length ? JSON.stringify(tags) : null,
          status: item.status?.toUpperCase?.() || 'PUBLISHED',
          isHot: Boolean(item.isHot),
        },
      });
    }
    upserted++;
  }

  const total = await prisma.userPost.count();
  console.log(`Upserted ${upserted} posts. Total posts now: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
