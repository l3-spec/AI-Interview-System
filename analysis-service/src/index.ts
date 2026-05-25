// 必须在任何 import 之前加载环境变量，确保服务实例化时能读取到配置
require('dotenv').config();

import { initServiceLogger } from './utils/service-logger';
initServiceLogger('analysis-service');

import { prisma } from './lib/prisma';
import { analysisService } from './services/analysisService';
import express from 'express';

const POLL_INTERVAL = 10000; // 10 seconds

async function pollPendingAnalyses() {
    console.log('[AnalysisWorker] Polling for pending analyses...');
    try {
        const pendingSessions = await prisma.aIInterviewSession.findMany({
            where: {
                status: 'COMPLETED',
                OR: [
                    { analysisReport: null },
                    { analysisReport: { analysisStatus: 'PENDING' } },
                    { analysisReport: { analysisStatus: 'FAILED' } }
                ]
            },
            take: 5 // Process in small batches
        });

        if (pendingSessions.length === 0) {
            return;
        }

        console.log(`[AnalysisWorker] Found ${pendingSessions.length} pending sessions.`);

        for (const session of pendingSessions) {
            console.log(`[AnalysisWorker] Processing session: ${session.id}`);
            try {
                await prisma.aIInterviewAnalysisReport.upsert({
                    where: { sessionId: session.id },
                    update: { analysisStatus: 'PROCESSING' },
                    create: {
                        sessionId: session.id,
                        overallScore: 0,
                        communicationScore: 0,
                        technicalScore: 0,
                        problemSolvingScore: 0,
                        teamworkScore: 0,
                        adaptabilityScore: 0,
                        learningScore: 0,
                        professionalAbilityScore: 0,
                        learningGrowthScore: 0,
                        communicationCollaborationScore: 0,
                        problemSolvingNewScore: 0,
                        achievementExecutionScore: 0,
                        stressResilienceScore: 0,
                        analysisStatus: 'PROCESSING'
                    } as any
                });

                await analysisService.analyzeInterviewSession(session.id);

                await prisma.aIInterviewAnalysisReport.update({
                    where: { sessionId: session.id },
                    data: { analysisStatus: 'COMPLETED' }
                });

                console.log(`[AnalysisWorker] Successfully processed session: ${session.id}`);
            } catch (error) {
                console.error(`[AnalysisWorker] Failed to process session: ${session.id}`, error);
                await prisma.aIInterviewAnalysisReport.upsert({
                    where: { sessionId: session.id },
                    update: { 
                        analysisStatus: 'FAILED',
                        analysisError: error instanceof Error ? error.message : 'Unknown error'
                    },
                    create: {
                        sessionId: session.id,
                        overallScore: 0,
                        communicationScore: 0,
                        technicalScore: 0,
                        problemSolvingScore: 0,
                        teamworkScore: 0,
                        adaptabilityScore: 0,
                        learningScore: 0,
                        professionalAbilityScore: 0,
                        learningGrowthScore: 0,
                        communicationCollaborationScore: 0,
                        problemSolvingNewScore: 0,
                        achievementExecutionScore: 0,
                        stressResilienceScore: 0,
                        analysisStatus: 'FAILED',
                        analysisError: error instanceof Error ? error.message : 'Unknown error'
                    } as any
                });
            }
        }
    } catch (error) {
        console.error('[AnalysisWorker] Error during polling:', error);
    }
}

async function main() {
    console.log('[AnalysisWorker] Starting analysis service...');
    
    // Start Express server for health checks
    const app = express();
    const port = process.env.PORT || 3005;

    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'OK', service: 'analysis-service' });
    });

    app.listen(port, () => {
        console.log(`[AnalysisWorker] Health check server listening on port ${port}`);
    });

    // Initial poll
    await pollPendingAnalyses();
    
    // Set up polling interval
    setInterval(pollPendingAnalyses, POLL_INTERVAL);
}

main().catch(console.error);
