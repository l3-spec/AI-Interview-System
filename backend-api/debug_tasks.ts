
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing AIInterviewAnalysisTask query with include...');
        const tasks = await prisma.aIInterviewAnalysisTask.findMany({
            take: 1,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                session: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        },
                        jobTarget: true
                    }
                }
            }
        });
        console.log('Success:', tasks);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
