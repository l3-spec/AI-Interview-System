-- 添加 report_url 列到 ai_interview_analysis_reports 表
ALTER TABLE `ai_interview_analysis_reports`
  ADD COLUMN `report_url` VARCHAR(191) NULL;
