-- CreateTable
CREATE TABLE `ai_interview_conversation_turns` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `speaker` VARCHAR(191) NOT NULL,
    `avatarText` TEXT NULL,
    `candidateVideoUrl` TEXT NULL,
    `candidateText` TEXT NULL,
    `questionIndex` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ai_conv_session_seq`(`sessionId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_interview_conversation_turns` ADD CONSTRAINT `ai_interview_conversation_turns_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ai_interview_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
