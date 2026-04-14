import { prisma } from '../lib/prisma';
import { analysisQueue } from '../jobs/analysisQueue';

async function startAnalysisWorker() {
  try {
    await prisma.$connect();
    console.log('📊 Analysis worker connected to database');
    analysisQueue.start();
    console.log('📊 Analysis worker started');
  } catch (error) {
    console.error('❌ Analysis worker failed to start:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n🛑 Analysis worker received ${signal}, shutting down...`);
  try {
    analysisQueue.stop();
    await prisma.$disconnect();
  } catch (error) {
    console.error('⚠️  Analysis worker shutdown error:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startAnalysisWorker();
