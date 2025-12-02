-- CreateTable
CREATE TABLE `user_job_preferences` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `position_id` CHAR(36) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uniq_user_job_preferences_user_position`(`user_id`, `position_id`),
    INDEX `idx_user_job_preferences_user`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_job_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `user_job_preferences_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `job_dictionary_positions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
