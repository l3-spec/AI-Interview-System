-- 历史上该表可能由手工 SQL 创建，未包含在早期迁移中；shadow DB 重放时需要先有表，后续 ALTER 才能执行。
CREATE TABLE IF NOT EXISTS `ai_interview_analysis_reports` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `overallScore` INTEGER NOT NULL,
    `communicationScore` DOUBLE NOT NULL,
    `technicalScore` DOUBLE NOT NULL,
    `problemSolvingScore` DOUBLE NOT NULL,
    `teamworkScore` DOUBLE NOT NULL,
    `adaptabilityScore` DOUBLE NOT NULL,
    `learningScore` DOUBLE NOT NULL,
    `competenciesJson` TEXT NULL,
    `strengths` TEXT NULL,
    `improvements` TEXT NULL,
    `jobMatchTitle` VARCHAR(191) NULL,
    `jobMatchDescription` TEXT NULL,
    `jobMatchRatio` DOUBLE NULL,
    `tips` TEXT NULL,
    `report_url` VARCHAR(191) NULL,
    `analysisStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `analysis_error` TEXT NULL,
    `generatedAt` DATETIME(3) NULL,
    `video_confidence_score` DOUBLE NULL,
    `emotion_distribution` TEXT NULL,
    `speech_quality` DOUBLE NULL,
    `body_language_score` DOUBLE NULL,
    `posture_stability` FLOAT NULL,
    `gaze_focus` FLOAT NULL,
    `relevance_score` INTEGER NULL,
    `completeness_score` INTEGER NULL,
    `professional_accuracy_score` INTEGER NULL,
    `logical_coherence_score` INTEGER NULL,
    `question_analysis_details` TEXT NULL,
    `video_insights` TEXT NULL,
    `cross_validation_json` TEXT NULL,
    `recommendation_letter_json` TEXT NULL,
    `voiceprint_details_json` TEXT NULL,
    `professional_ability_score` DOUBLE NULL,
    `learning_research_score` DOUBLE NULL,
    `teamwork_score_new` DOUBLE NULL,
    `stress_tolerance_score_new` DOUBLE NULL,
    `communication_ability_score` DOUBLE NULL,
    `achievement_orientation_score` DOUBLE NULL,
    `openness_innovation_score` DOUBLE NULL,
    `learning_growth_score` DOUBLE NULL,
    `communication_collaboration_score` DOUBLE NULL,
    `problem_solving_new_score` DOUBLE NULL,
    `achievement_execution_score` DOUBLE NULL,
    `stress_resilience_score` DOUBLE NULL,
    `multimodal_scores_json` TEXT NULL,
    `question_by_question_json` TEXT NULL,
    `content_multimodal_fusion_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_interview_analysis_reports_sessionId_key`(`sessionId`),
    INDEX `ai_interview_analysis_reports_analysisStatus_idx`(`analysisStatus`),
    INDEX `ai_interview_analysis_reports_professional_ability_score_idx`(`professional_ability_score`),
    INDEX `ai_interview_analysis_reports_learning_research_score_idx`(`learning_research_score`),
    INDEX `ai_interview_analysis_reports_teamwork_score_new_idx`(`teamwork_score_new`),
    INDEX `ai_interview_analysis_reports_stress_tolerance_score_new_idx`(`stress_tolerance_score_new`),
    INDEX `ai_interview_analysis_reports_communication_ability_score_idx`(`communication_ability_score`),
    INDEX `ai_interview_analysis_reports_achievement_orientation_score_idx`(`achievement_orientation_score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 外键：若已存在则跳过（避免重复 apply 报错）
SET @schema := DATABASE();
SET @fkExists := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'ai_interview_analysis_reports'
    AND COLUMN_NAME = 'sessionId'
    AND REFERENCED_TABLE_NAME = 'ai_interview_sessions'
);
SET @fkStmt := IF(
  @fkExists = 0,
  'ALTER TABLE `ai_interview_analysis_reports` ADD CONSTRAINT `ai_interview_analysis_reports_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ai_interview_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE fkprep FROM @fkStmt;
EXECUTE fkprep;
DEALLOCATE PREPARE fkprep;
