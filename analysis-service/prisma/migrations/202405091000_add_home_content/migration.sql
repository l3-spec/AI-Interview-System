-- Create home banners table
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
  PRIMARY KEY (`id`)
);

CREATE INDEX `home_banners_is_active_idx` ON `home_banners` (`is_active`);
CREATE INDEX `home_banners_sort_order_idx` ON `home_banners` (`sort_order`);

-- Create home featured articles table
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
  PRIMARY KEY (`id`)
);

CREATE INDEX `home_featured_articles_status_idx` ON `home_featured_articles` (`status`);
CREATE INDEX `home_featured_articles_is_active_idx` ON `home_featured_articles` (`is_active`);
