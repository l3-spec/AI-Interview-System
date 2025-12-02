-- Add job dictionary tables and link jobs to dictionary positions
CREATE TABLE `job_dictionary_categories` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `job_dictionary_categories_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_dictionary_positions` (
  `id` CHAR(36) NOT NULL,
  `categoryId` CHAR(36) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `tags` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `job_dictionary_positions_code_key` (`code`),
  INDEX `idx_job_dictionary_positions_category` (`categoryId`),
  CONSTRAINT `job_dictionary_positions_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `job_dictionary_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `jobs`
  ADD COLUMN `dictionaryPositionId` CHAR(36) NULL,
  ADD INDEX `idx_jobs_dictionary_position` (`dictionaryPositionId`),
  ADD CONSTRAINT `jobs_dictionaryPositionId_fkey`
    FOREIGN KEY (`dictionaryPositionId`) REFERENCES `job_dictionary_positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
