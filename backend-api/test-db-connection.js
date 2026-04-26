const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Try a simple query
    const results = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
    console.log('📊 Query result:', results);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
