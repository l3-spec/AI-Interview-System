const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        // Using real IP and minimal pool
        url: "mysql://ai_interview_db:6BiFhGL7tG4r46Dz@47.115.217.110:3306/ai_interview_db?connection_limit=1&socket_timeout=10&connect_timeout=10"
      }
    }
  });

  try {
    console.log('🔍 Testing direct IP with limit=1...');
    const res = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Success!', res);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
