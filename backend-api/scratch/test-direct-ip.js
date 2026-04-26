const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "mysql://ai_interview_db:6BiFhGL7tG4r46Dz@47.115.217.110:3306/ai_interview_db?connection_limit=1"
      }
    },
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    console.log('🔍 Testing connection to 47.115.217.110 with limit 1...');
    await prisma.$connect();
    console.log('✅ Connected!');
    const res = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('📊 Result:', res);
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
