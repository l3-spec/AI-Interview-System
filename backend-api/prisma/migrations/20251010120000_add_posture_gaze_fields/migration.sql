-- 若表由 20251008141506 一次性建全，此处为 no-op；老库仅有缺列时则补齐
SET @schema := DATABASE();

SET @tableExists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
);

SET @postureExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
    AND COLUMN_NAME = 'posture_stability'
);

SET @gazeExists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
    AND COLUMN_NAME = 'gaze_focus'
);

SET @stmtPosture := IF(
  @tableExists = 1 AND @postureExists = 0,
  'ALTER TABLE `ai_interview_analysis_reports` ADD COLUMN `posture_stability` FLOAT NULL',
  'SELECT 1'
);
PREPARE p1 FROM @stmtPosture;
EXECUTE p1;
DEALLOCATE PREPARE p1;

SET @stmtGaze := IF(
  @tableExists = 1 AND @gazeExists = 0,
  'ALTER TABLE `ai_interview_analysis_reports` ADD COLUMN `gaze_focus` FLOAT NULL',
  'SELECT 1'
);
PREPARE p2 FROM @stmtGaze;
EXECUTE p2;
DEALLOCATE PREPARE p2;
