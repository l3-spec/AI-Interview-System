-- Ensure jobs.education exists after jobs table is created (idempotent; complements 202406 when that ran as no-op on shadow DB)
SET @schema := DATABASE();

SET @tableExists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'jobs'
);

SET @colExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'education'
);

SET @stmt := IF(
  @tableExists = 1 AND @colExists = 0,
  'ALTER TABLE `jobs` ADD COLUMN `education` VARCHAR(191) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
