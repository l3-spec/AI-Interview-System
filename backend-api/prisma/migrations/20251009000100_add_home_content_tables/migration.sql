-- Ensure home page related tables exist for Prisma models

CREATE TABLE IF NOT EXISTS `home_banners` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `link_type` VARCHAR(64) NULL,
  `link_id` VARCHAR(64) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `home_banners_is_active_idx` (`is_active`),
  INDEX `home_banners_sort_order_idx` (`sort_order`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `home_featured_articles` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `author` VARCHAR(128) NULL,
  `tags` TEXT NULL,
  `view_count` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(128) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `home_featured_articles_status_idx` (`status`),
  INDEX `home_featured_articles_is_active_idx` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `assessment_categories` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `assessments` (
  `id` CHAR(36) NOT NULL,
  `category_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `cover_image` VARCHAR(512) NULL,
  `duration_minutes` INT NOT NULL DEFAULT 15,
  `difficulty` VARCHAR(32) NOT NULL DEFAULT 'BEGINNER',
  `participant_count` INT NOT NULL DEFAULT 0,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `tags` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  `is_hot` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `assessments_category_idx` (`category_id`),
  INDEX `assessments_is_hot_idx` (`is_hot`),
  CONSTRAINT `assessments_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `assessment_categories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `user_posts` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `cover_image` VARCHAR(512) NULL,
  `images` TEXT NULL,
  `tags` TEXT NULL,
  `view_count` INT NOT NULL DEFAULT 0,
  `like_count` INT NOT NULL DEFAULT 0,
  `comment_count` INT NOT NULL DEFAULT 0,
  `share_count` INT NOT NULL DEFAULT 0,
  `is_hot` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `user_posts_is_hot_idx` (`is_hot`),
  INDEX `user_posts_status_idx` (`status`),
  INDEX `user_posts_created_at_idx` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `expert_posts` (
  `id` CHAR(36) NOT NULL,
  `expert_name` VARCHAR(128) NOT NULL,
  `expert_title` VARCHAR(128) NOT NULL,
  `expert_company` VARCHAR(128) NOT NULL,
  `expert_avatar` VARCHAR(512) NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `cover_image` VARCHAR(512) NULL,
  `tags` TEXT NULL,
  `view_count` INT NOT NULL DEFAULT 0,
  `like_count` INT NOT NULL DEFAULT 0,
  `comment_count` INT NOT NULL DEFAULT 0,
  `is_top` TINYINT(1) NOT NULL DEFAULT 0,
  `published_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `expert_posts_is_top_idx` (`is_top`),
  INDEX `expert_posts_published_at_idx` (`published_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `promoted_jobs` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `promotion_type` VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `display_frequency` INT NOT NULL DEFAULT 10,
  `priority` INT NOT NULL DEFAULT 0,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `impression_count` INT NOT NULL DEFAULT 0,
  `click_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `promoted_jobs_job_id_idx` (`job_id`),
  INDEX `promoted_jobs_active_idx` (`is_active`),
  INDEX `promoted_jobs_date_range_idx` (`start_date`, `end_date`),
  CONSTRAINT `promoted_jobs_job_id_fkey`
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
