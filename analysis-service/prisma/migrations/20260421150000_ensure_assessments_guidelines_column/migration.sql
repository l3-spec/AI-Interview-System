-- Ensure assessments.guidelines exists after assessments table is created (idempotent)
SET @schema := DATABASE();

SET @tableExists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'assessments'
);

SET @colExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'assessments'
    AND COLUMN_NAME = 'guidelines'
);

SET @stmt := IF(
  @tableExists = 1 AND @colExists = 0,
  'ALTER TABLE `assessments` ADD COLUMN `guidelines` TEXT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
