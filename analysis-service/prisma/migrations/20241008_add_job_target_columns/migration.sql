-- Ensure AI interview session table has required columns for new session flow
SET @schema := DATABASE();

SET @tableExists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_sessions'
);

SET @jobTargetExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_sessions'
    AND COLUMN_NAME = 'jobTarget'
);

SET @jobCategoryExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_sessions'
    AND COLUMN_NAME = 'jobCategory'
);

SET @jobSubCategoryExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_sessions'
    AND COLUMN_NAME = 'jobSubCategory'
);

SET @plannedDurationExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_sessions'
    AND COLUMN_NAME = 'plannedDuration'
);

SET @jobTargetStatement := IF(
  @tableExists = 1 AND @jobTargetExists = 0,
  'ALTER TABLE `ai_interview_sessions` ADD COLUMN `jobTarget` VARCHAR(191) NULL AFTER `userId`',
  'SELECT 1'
);

PREPARE stmt FROM @jobTargetStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @jobCategoryStatement := IF(
  @tableExists = 1 AND @jobCategoryExists = 0,
  'ALTER TABLE `ai_interview_sessions` ADD COLUMN `jobCategory` VARCHAR(191) NULL AFTER `jobTarget`',
  'SELECT 1'
);

PREPARE stmt FROM @jobCategoryStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @jobSubCategoryStatement := IF(
  @tableExists = 1 AND @jobSubCategoryExists = 0,
  'ALTER TABLE `ai_interview_sessions` ADD COLUMN `jobSubCategory` VARCHAR(191) NULL AFTER `jobCategory`',
  'SELECT 1'
);

PREPARE stmt FROM @jobSubCategoryStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @plannedDurationStatement := IF(
  @tableExists = 1 AND @plannedDurationExists = 0,
  'ALTER TABLE `ai_interview_sessions` ADD COLUMN `plannedDuration` INT NULL AFTER `duration`',
  'SELECT 1'
);

PREPARE stmt FROM @plannedDurationStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @updateStatement := IF(
  @tableExists = 1,
  'UPDATE `ai_interview_sessions` SET `jobTarget` = COALESCE(`jobTarget`, CASE WHEN COALESCE(CHAR_LENGTH(`jobSubCategory`), 0) = 0 THEN NULL ELSE `jobSubCategory` END, ''未指定职位'') WHERE `jobTarget` IS NULL',
  'SELECT 1'
);

PREPARE stmt FROM @updateStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @jobTargetNotNull := IF(
  @tableExists = 1,
  'ALTER TABLE `ai_interview_sessions` MODIFY COLUMN `jobTarget` VARCHAR(191) NOT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @jobTargetNotNull;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
