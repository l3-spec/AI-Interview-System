/*
  Warnings:

  - The primary key for the `job_dictionary_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `job_dictionary_positions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_job_preferences` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `job_dictionary_positions` DROP FOREIGN KEY `job_dictionary_positions_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_dictionaryPositionId_fkey`;

-- DropForeignKey
ALTER TABLE `user_job_preferences` DROP FOREIGN KEY `user_job_preferences_position_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_job_preferences` DROP FOREIGN KEY `user_job_preferences_user_id_fkey`;

-- 不可删除 idx_ai_interview_sessions_user_job：InnoDB 用其支撑 ai_interview_sessions.userId 外键（userId 为复合索引最左列）

-- AlterTable
ALTER TABLE `ai_interview_analysis_reports` MODIFY `posture_stability` DOUBLE NULL,
    MODIFY `gaze_focus` DOUBLE NULL;

-- AlterTable
ALTER TABLE `ai_interview_questions` MODIFY `audioUrl` TEXT NULL,
    MODIFY `audioPath` TEXT NULL,
    MODIFY `answerText` TEXT NULL,
    MODIFY `answerVideoUrl` TEXT NULL,
    MODIFY `answerVideoPath` TEXT NULL,
    MODIFY `videoUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `job_dictionary_categories` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `job_dictionary_positions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `categoryId` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `jobs` MODIFY `dictionaryPositionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_job_preferences` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `user_id` VARCHAR(191) NOT NULL,
    MODIFY `position_id` VARCHAR(191) NOT NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `ai_interview_analysis_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `idx_analysis_tasks_status`(`status`),
    INDEX `idx_analysis_tasks_session`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_versions` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'ANDROID',
    `version_name` VARCHAR(191) NOT NULL,
    `version_code` INTEGER NOT NULL,
    `download_url` VARCHAR(191) NOT NULL,
    `release_notes` TEXT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_app_versions_platform_active`(`platform`, `is_active`),
    INDEX `idx_app_versions_version_code`(`version_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ai_interview_analysis_reports_sessionId_idx` ON `ai_interview_analysis_reports`(`sessionId`);

-- CreateIndex
CREATE INDEX `user_posts_user_id_idx` ON `user_posts`(`user_id`);

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_dictionaryPositionId_fkey` FOREIGN KEY (`dictionaryPositionId`) REFERENCES `job_dictionary_positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_dictionary_positions` ADD CONSTRAINT `job_dictionary_positions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `job_dictionary_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_job_preferences` ADD CONSTRAINT `user_job_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_job_preferences` ADD CONSTRAINT `user_job_preferences_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `job_dictionary_positions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_interview_analysis_tasks` ADD CONSTRAINT `ai_interview_analysis_tasks_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ai_interview_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_posts` ADD CONSTRAINT `user_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promoted_jobs` ADD CONSTRAINT `promoted_jobs_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
