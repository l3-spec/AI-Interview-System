-- Add guidelines column for assessments (stores JSON array of guideline strings)
ALTER TABLE `assessments`
ADD COLUMN `guidelines` TEXT NULL AFTER `tags`;
