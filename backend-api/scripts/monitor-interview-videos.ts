import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 监控脚本：查看面试会话的视频上传情况
 * 运行方式：npx ts-node scripts/monitor-interview-videos.ts [sessionId]
 */

async function main() {
    const sessionId = process.argv[2];

    if (!sessionId) {
        console.log('❌ 请提供面试会话ID');
        console.log('用法: npx ts-node scripts/monitor-interview-videos.ts <sessionId>');
        console.log('\n或查看最近的会话:');
        await showRecentSessions();
        return;
    }

    console.log(`\n🔍 查询面试会话: ${sessionId}\n`);

    try {
        const session = await prisma.aIInterviewSession.findUnique({
            where: { id: sessionId },
            include: {
                questions: {
                    orderBy: { questionIndex: 'asc' }
                }
            }
        });

        if (!session) {
            console.log('❌ 面试会话不存在');
            return;
        }

        console.log('📋 面试会话信息:');
        console.log(`  用户ID: ${session.userId}`);
        console.log(`  职位: ${session.jobTarget}`);
        console.log(`  状态: ${session.status}`);
        console.log(`  总题数: ${session.totalQuestions}`);
        console.log(`  当前题: ${session.currentQuestion}`);
        console.log(`  创建时间: ${session.createdAt.toLocaleString('zh-CN')}`);
        if (session.startedAt) {
            console.log(`  开始时间: ${session.startedAt.toLocaleString('zh-CN')}`);
        }
        if (session.completedAt) {
            console.log(`  完成时间: ${session.completedAt.toLocaleString('zh-CN')}`);
        }

        console.log(`\n📹 问题&视频详情:\n`);

        let videoUploadCount = 0;
        let answerCount = 0;

        for (const q of session.questions) {
            const hasAnswer = !!q.answerText && q.answerText.trim().length > 0;
            const hasVideo = !!q.answerVideoUrl && q.answerVideoUrl.trim().length > 0;

            if (hasAnswer) answerCount++;
            if (hasVideo) videoUploadCount++;

            const status = hasVideo ? '✅' : hasAnswer ? '⚠️ ' : '❌';

            console.log(`${status} 问题 ${q.questionIndex + 1}:`);
            console.log(`  题目: ${q.questionText.substring(0, 60)}...`);

            if (hasAnswer) {
                console.log(`  ✓ 文字答案: ${q.answerText!.substring(0, 50)}...`);
            } else {
                console.log(`  ✗ 文字答案: 未提交`);
            }

            if (hasVideo) {
                console.log(`  ✓ 视频URL: ${q.answerVideoUrl}`);
                if (q.answerDuration) {
                    console.log(`  ✓ 时长: ${q.answerDuration}秒`);
                }
            } else {
                console.log(`  ✗ 视频URL: 未上传`);
            }

            if (q.answeredAt) {
                console.log(`  回答时间: ${q.answeredAt.toLocaleString('zh-CN')}`);
            }

            console.log('');
        }

        console.log('📊 统计信息:');
        console.log(`  总题数: ${session.questions.length}`);
        console.log(`  已回答: ${answerCount}/${session.questions.length}`);
        console.log(`  已上传视频: ${videoUploadCount}/${session.questions.length}`);
        console.log(`  完成率: ${Math.round((videoUploadCount / session.questions.length) * 100)}%`);

        if (videoUploadCount === 0) {
            console.log('\n⚠️  尚未检测到任何视频上传');
            console.log('   可能原因:');
            console.log('   1. Android端录制未完成');
            console.log('   2. OSS上传失败');
            console.log('   3. 后端API未收到视频URL');
        } else if (videoUploadCount < session.questions.length) {
            console.log(`\n⚠️  还有 ${session.questions.length - videoUploadCount} 个问题未上传视频`);
        } else {
            console.log('\n✅ 所有问题的视频均已上传');
        }

    } catch (error) {
        console.error('❌ 查询失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function showRecentSessions() {
    try {
        const recentSessions = await prisma.aIInterviewSession.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                userId: true,
                jobTarget: true,
                status: true,
                totalQuestions: true,
                currentQuestion: true,
                createdAt: true,
            }
        });

        if (recentSessions.length === 0) {
            console.log('📭 暂无面试会话记录');
            return;
        }

        console.log('\n📋 最近10个面试会话:\n');

        for (const session of recentSessions) {
            console.log(`ID: ${session.id}`);
            console.log(`  职位: ${session.jobTarget}`);
            console.log(`  状态: ${session.status}`);
            console.log(`  进度: ${session.currentQuestion}/${session.totalQuestions}`);
            console.log(`  创建: ${session.createdAt.toLocaleString('zh-CN')}`);
            console.log('');
        }

    } catch (error) {
        console.error('查询失败:', error);
    }
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });
