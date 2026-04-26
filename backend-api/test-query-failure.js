const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Testing specific query: promotedJob.findMany()...');
    const now = new Date();
    const promotedJobs = await prisma.promotedJob.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        job: {
          status: 'ACTIVE',
          isPublished: true,
          company: {
            isActive: true,
          },
        },
      },
      take: 10,
    });
    console.log('✅ Query successful! Found:', promotedJobs.length, 'jobs');
  } catch (error) {
    console.error('❌ Query failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
