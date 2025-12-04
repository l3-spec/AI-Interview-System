import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 手动迁移脚本：添加面试分析表
 * 运行方式：npx ts-node scripts/migrate-add-analysis-tables.ts
 */

async function main() {
    console.log('🔄 开始创建面试分析相关表...');

    try {
        // 1. 创建分析报告表
        console.log('📊 创建 ai_interview_analysis_reports 表...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`ai_interview_analysis_reports\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`sessionId\` VARCHAR(191) NOT NULL,
        \`overallScore\` INT NOT NULL,
        \`communicationScore\` DOUBLE NOT NULL,
        \`technicalScore\` DOUBLE NOT NULL,
        \`problemSolvingScore\` DOUBLE NOT NULL,
        \`teamworkScore\` DOUBLE NOT NULL,
        \`adaptabilityScore\` DOUBLE NOT NULL,
        \`learningScore\` DOUBLE NOT NULL,
        \`competenciesJson\` TEXT NULL,
        \`strengths\` TEXT NULL,
        \`improvements\` TEXT NULL,
        \`jobMatchTitle\` VARCHAR(191) NULL,
        \`jobMatchDescription\` TEXT NULL,
        \`jobMatchRatio\` DOUBLE NULL,
        \`tips\` TEXT NULL,
        \`analysisStatus\` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
        \`analysisError\` TEXT NULL,
        \`reportUrl\` VARCHAR(191) NULL,
        \`generatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`ai_interview_analysis_reports_sessionId_key\` (\`sessionId\`),
        INDEX \`ai_interview_analysis_reports_sessionId_idx\` (\`sessionId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
        console.log('✅ ai_interview_analysis_reports 表创建成功');

        // 2. 创建分析任务表
        console.log('📋 创建 ai_interview_analysis_tasks 表...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`ai_interview_analysis_tasks\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`sessionId\` VARCHAR(191) NOT NULL,
        \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
        \`priority\` INT NOT NULL DEFAULT 0,
        \`retryCount\` INT NOT NULL DEFAULT 0,
        \`maxRetries\` INT NOT NULL DEFAULT 3,
        \`errorMessage\` TEXT NULL,
        \`startedAt\` DATETIME(3) NULL,
        \`completedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_analysis_tasks_status\` (\`status\`),
        INDEX \`idx_analysis_tasks_session\` (\`sessionId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
        console.log('✅ ai_interview_analysis_tasks 表创建成功');

        // 3. 添加外键约束
        console.log('🔗 添加外键约束...');

        // 检查外键是否存在，如果不存在则添加
        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE \`ai_interview_analysis_reports\`
        ADD CONSTRAINT \`ai_interview_analysis_reports_sessionId_fkey\`
        FOREIGN KEY (\`sessionId\`) REFERENCES \`ai_interview_sessions\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
            console.log('✅ ai_interview_analysis_reports 外键约束添加成功');
        } catch (error: any) {
            if (error.code === 'P2010' || error.message.includes('Duplicate')) {
                console.log('ℹ️  ai_interview_analysis_reports 外键约束已存在，跳过');
            } else {
                throw error;
            }
        }

        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE \`ai_interview_analysis_tasks\`
        ADD CONSTRAINT \`ai_interview_analysis_tasks_sessionId_fkey\`
        FOREIGN KEY (\`sessionId\`) REFERENCES \`ai_interview_sessions\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
            console.log('✅ ai_interview_analysis_tasks 外键约束添加成功');
        } catch (error: any) {
            if (error.code === 'P2010' || error.message.includes('Duplicate')) {
                console.log('ℹ️  ai_interview_analysis_tasks 外键约束已存在，跳过');
            } else {
                throw error;
            }
        }

        console.log('\n🎉 所有表创建完成！');
        console.log('\n📝 创建的表：');
        console.log('  - ai_interview_analysis_reports (分析报告表)');
        console.log('  - ai_interview_analysis_tasks (分析任务表)');

    } catch (error) {
        console.error('\n❌ 迁移失败:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => {
        console.log('\n✨ 迁移脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 迁移脚本执行失败:', error);
        process.exit(1);
    });
