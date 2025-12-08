-- 添加视频分析相关字段到 ai_interview_analysis_reports 表

ALTER TABLE `ai_interview_analysis_reports`
ADD COLUMN `video_confidence_score` DOUBLE PRECISION NULL COMMENT '综合自信度评分 0-100' AFTER `generatedAt`,
ADD COLUMN `emotion_distribution` TEXT NULL COMMENT 'JSON: 情绪分布统计' AFTER `video_confidence_score`,
ADD COLUMN `speech_quality` DOUBLE PRECISION NULL COMMENT '语音质量评分 0-100' AFTER `emotion_distribution`,
ADD COLUMN `body_language_score` DOUBLE PRECISION NULL COMMENT '肢体语言评分 0-100' AFTER `speech_quality`,
ADD COLUMN `video_insights` TEXT NULL COMMENT 'JSON: 详细视频分析结果' AFTER `body_language_score`;

-- 添加索引（如果需要）
-- ALTER TABLE `ai_interview_analysis_reports` ADD INDEX `idx_video_confidence` (`video_confidence_score`);
