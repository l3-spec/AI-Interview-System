/*
  Warnings:

  - The primary key for the `home_banners` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `title` on the `home_banners` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `subtitle` on the `home_banners` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `image_url` on the `home_banners` table. The data in that column could be lost. The data in that column will be cast from `VarChar(512)` to `VarChar(191)`.
  - The primary key for the `home_featured_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `title` on the `home_featured_articles` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `image_url` on the `home_featured_articles` table. The data in that column could be lost. The data in that column will be cast from `VarChar(512)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `companies` ADD COLUMN `culture` TEXT NULL,
    ADD COLUMN `focusArea` VARCHAR(191) NULL,
    ADD COLUMN `highlights` TEXT NULL,
    ADD COLUMN `locations` TEXT NULL,
    ADD COLUMN `stats` TEXT NULL,
    ADD COLUMN `tagline` TEXT NULL,
    ADD COLUMN `themeColors` TEXT NULL;

-- AlterTable
ALTER TABLE `home_banners` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `subtitle` VARCHAR(191) NOT NULL,
    MODIFY `image_url` VARCHAR(191) NOT NULL,
    MODIFY `link_type` VARCHAR(191) NULL,
    MODIFY `link_id` VARCHAR(191) NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `home_featured_articles` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `image_url` VARCHAR(191) NOT NULL,
    MODIFY `author` VARCHAR(191) NULL,
    MODIFY `category` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PUBLISHED',
    ALTER COLUMN `updated_at` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `badgeColor` VARCHAR(191) NULL,
    ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `experience` VARCHAR(191) NULL,
    ADD COLUMN `highlights` TEXT NULL,
    ADD COLUMN `isRemote` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `company_showcases` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `hiring_count` INTEGER NOT NULL DEFAULT 0,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_showcases_company_id_key`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_sections` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_section_items` (
    `id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_section_items_job_id_idx`(`job_id`),
    UNIQUE INDEX `job_section_items_section_id_job_id_key`(`section_id`, `job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_showcases` ADD CONSTRAINT `company_showcases_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_section_items` ADD CONSTRAINT `job_section_items_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `job_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_section_items` ADD CONSTRAINT `job_section_items_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
