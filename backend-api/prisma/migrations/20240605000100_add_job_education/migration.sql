-- Add education column to jobs table
ALTER TABLE `jobs`
  ADD COLUMN `education` VARCHAR(191) NULL;
