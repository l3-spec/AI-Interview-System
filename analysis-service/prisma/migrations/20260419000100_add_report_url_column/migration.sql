-- 添加 report_url 列（若表或列已存在则跳过）
SET @schema := DATABASE();

SET @tableExists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
);

SET @colExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
    AND COLUMN_NAME = 'report_url'
);

SET @stmt := IF(
  @tableExists = 1 AND @colExists = 0,
  'ALTER TABLE `ai_interview_analysis_reports` ADD COLUMN `report_url` VARCHAR(191) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
