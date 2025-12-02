-- Add optional jobId to AI interview sessions for userId+jobId scoping
ALTER TABLE `ai_interview_sessions`
  ADD COLUMN `jobId` VARCHAR(191) NULL AFTER `userId`;

-- Index to speed up lookups by user + job
CREATE INDEX `idx_ai_interview_sessions_user_job` ON `ai_interview_sessions` (`userId`, `jobId`);
