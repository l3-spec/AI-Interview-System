const { PrismaClient } = require('@prisma/client');

// Mocking withRetry since we are in a standalone script
async function withRetry(operation, retries = 3, delay = 500) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[TestRetry] Attempt ${i + 1} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  throw lastError;
}

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "mysql://ai_interview_db:6BiFhGL7tG4r46Dz@db.ks.qfpek.com:3306/ai_interview_db?connection_limit=1"
      }
    }
  });

  try {
    console.log('🔍 Testing connection with retry...');
    const res = await withRetry(() => prisma.$queryRaw`SELECT 1 as result`);
    console.log('✅ Success!', res);
  } catch (err) {
    console.error('❌ Failed even after retries:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
