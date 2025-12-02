-- Reset script for failed home content migration
-- Usage:
--   mysql -h <host> -u <user> -p<password> <database> < scripts/reset_home_content_migration.sql

-- 1. Remove the failed migration record so Prisma can reapply it
DELETE FROM `_prisma_migrations`
WHERE `migration_name` = '202405091000_add_home_content';

-- 2. Optionally remove any partially created home-content tables (uncomment if needed)
-- DROP TABLE IF EXISTS `home_banners`;
-- DROP TABLE IF EXISTS `home_featured_articles`;
-- DROP TABLE IF EXISTS `assessment_categories`;
-- DROP TABLE IF EXISTS `assessments`;
-- DROP TABLE IF EXISTS `assessment_questions`;
-- DROP TABLE IF EXISTS `user_posts`;
-- DROP TABLE IF EXISTS `expert_posts`;
-- DROP TABLE IF EXISTS `promoted_jobs`;

-- Note: leave the DROP statements commented unless the earlier migration
-- created half-finished tables that block reruns. In most cases simply
-- deleting the migration record is enough.
