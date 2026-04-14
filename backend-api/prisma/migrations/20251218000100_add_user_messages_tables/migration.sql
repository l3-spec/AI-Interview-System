-- Create user_messages table for message center
CREATE TABLE `user_messages` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `status` VARCHAR(191) NOT NULL DEFAULT 'UNREAD',
    `unread_count` INTEGER NOT NULL DEFAULT 0,
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_messages_user_id_idx`(`user_id`),
    INDEX `user_messages_type_idx`(`type`),
    INDEX `user_messages_status_idx`(`status`),
    INDEX `user_messages_last_activity_at_idx`(`last_activity_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user_message_entries table to store conversation records
CREATE TABLE `user_message_entries` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `senderType` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `sender_id` VARCHAR(191) NULL,
    `sender_name` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_message_entries_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `user_messages` ADD CONSTRAINT `user_messages_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_message_entries` ADD CONSTRAINT `user_message_entries_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `user_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
