-- Align with Prisma: AIInterviewSession.jobId -> jobs.id (optional relation used by company AI interview list API)
-- Clear orphan jobIds so FK can be created safely
UPDATE `ai_interview_sessions` s
LEFT JOIN `jobs` j ON j.`id` = s.`jobId`
SET s.`jobId` = NULL
WHERE s.`jobId` IS NOT NULL AND j.`id` IS NULL;

-- Foreign key: SET NULL on job delete (session remains; company filter uses jobId NOT NULL)
ALTER TABLE `ai_interview_sessions`
  ADD CONSTRAINT `ai_interview_sessions_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
