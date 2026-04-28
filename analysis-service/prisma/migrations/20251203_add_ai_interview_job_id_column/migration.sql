-- Add optional jobId to AI interview sessions for userId+jobId scoping
-- 防重：部分环境已手动加过列/索引，MySQL 5.7 无法直接使用 IF NOT EXISTS，需要先检查 information_schema

-- 添加列 jobId（若不存在）
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'ai_interview_sessions'
    AND column_name = 'jobId'
);
SET @add_col_sql := IF(
  @col_exists = 0,
  'ALTER TABLE `ai_interview_sessions` ADD COLUMN `jobId` VARCHAR(191) NULL AFTER `userId`;',
  'SELECT 1;'
);
PREPARE stmt FROM @add_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引（若不存在）
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'ai_interview_sessions'
    AND index_name = 'idx_ai_interview_sessions_user_job'
);
SET @add_idx_sql := IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_ai_interview_sessions_user_job` ON `ai_interview_sessions` (`userId`, `jobId`);',
  'SELECT 1;'
);
PREPARE stmt FROM @add_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
