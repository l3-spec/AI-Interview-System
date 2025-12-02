-- 添加新表的 SQL 脚本（不影响现有数据）

-- 测评分类表
CREATE TABLE IF NOT EXISTS `assessment_categories` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(191) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 测评表
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `cover_image` VARCHAR(191) NULL,
  `duration_minutes` INTEGER NOT NULL DEFAULT 15,
  `difficulty` VARCHAR(191) NOT NULL DEFAULT 'BEGINNER',
  `participant_count` INTEGER NOT NULL DEFAULT 0,
  `rating` DOUBLE NOT NULL DEFAULT 0.0,
  `tags` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PUBLISHED',
  `is_hot` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `assessments_category_id_idx`(`category_id`),
  INDEX `assessments_is_hot_idx`(`is_hot`),
  CONSTRAINT `assessments_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `assessment_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 测评题目表
CREATE TABLE IF NOT EXISTS `assessment_questions` (
  `id` VARCHAR(191) NOT NULL,
  `assessment_id` VARCHAR(191) NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` VARCHAR(191) NOT NULL DEFAULT 'SINGLE_CHOICE',
  `options` TEXT NULL,
  `correct_answer` VARCHAR(191) NULL,
  `score` INTEGER NOT NULL DEFAULT 0,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `assessment_questions_assessment_id_idx`(`assessment_id`),
  CONSTRAINT `assessment_questions_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户测评记录表
CREATE TABLE IF NOT EXISTS `user_assessment_records` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `assessment_id` VARCHAR(191) NOT NULL,
  `answers` TEXT NOT NULL,
  `total_score` INTEGER NOT NULL DEFAULT 0,
  `result_level` VARCHAR(191) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) NULL,
  `duration` INTEGER NULL,
  PRIMARY KEY (`id`),
  INDEX `user_assessment_records_user_id_idx`(`user_id`),
  INDEX `user_assessment_records_assessment_id_idx`(`assessment_id`),
  CONSTRAINT `user_assessment_records_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户帖子表（热门分享）
CREATE TABLE IF NOT EXISTS `user_posts` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `cover_image` VARCHAR(191) NULL,
  `images` VARCHAR(191) NULL,
  `tags` VARCHAR(191) NULL,
  `view_count` INTEGER NOT NULL DEFAULT 0,
  `like_count` INTEGER NOT NULL DEFAULT 0,
  `comment_count` INTEGER NOT NULL DEFAULT 0,
  `share_count` INTEGER NOT NULL DEFAULT 0,
  `is_hot` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PUBLISHED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `user_posts_is_hot_idx`(`is_hot`),
  INDEX `user_posts_status_idx`(`status`),
  INDEX `user_posts_created_at_idx`(`created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 大咖分享表
CREATE TABLE IF NOT EXISTS `expert_posts` (
  `id` VARCHAR(191) NOT NULL,
  `expert_name` VARCHAR(191) NOT NULL,
  `expert_title` VARCHAR(191) NOT NULL,
  `expert_company` VARCHAR(191) NOT NULL,
  `expert_avatar` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `cover_image` VARCHAR(191) NULL,
  `tags` VARCHAR(191) NULL,
  `view_count` INTEGER NOT NULL DEFAULT 0,
  `like_count` INTEGER NOT NULL DEFAULT 0,
  `comment_count` INTEGER NOT NULL DEFAULT 0,
  `is_top` BOOLEAN NOT NULL DEFAULT false,
  `published_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `expert_posts_is_top_idx`(`is_top`),
  INDEX `expert_posts_published_at_idx`(`published_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 热门职岗推广表
CREATE TABLE IF NOT EXISTS `promoted_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `job_id` VARCHAR(191) NOT NULL,
  `promotion_type` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
  `display_frequency` INTEGER NOT NULL DEFAULT 10,
  `priority` INTEGER NOT NULL DEFAULT 0,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `impression_count` INTEGER NOT NULL DEFAULT 0,
  `click_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `promoted_jobs_job_id_idx`(`job_id`),
  INDEX `promoted_jobs_is_active_idx`(`is_active`),
  INDEX `promoted_jobs_start_date_end_date_idx`(`start_date`, `end_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入测试数据

-- 测评分类
INSERT INTO `assessment_categories` (`id`, `name`, `description`, `sort_order`) VALUES
('cat-001', '自我评测', '个人能力自我评估', 1),
('cat-002', '360度评测', '多维度全方位评估', 2),
('cat-003', '职业素养评测', '职场软技能评估', 3);

-- 测评（示例）
INSERT INTO `assessments` (`id`, `category_id`, `title`, `description`, `cover_image`, `duration_minutes`, `difficulty`, `participant_count`, `rating`, `tags`, `is_hot`) VALUES
('assess-001', 'cat-001', '职业素养自我评测', '全面评估您的职业素养，包括沟通能力、团队协作、问题解决等', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', 15, 'BEGINNER', 12500, 4.8, '["沟通能力","团队协作","职业素养"]', true),
('assess-002', 'cat-002', '360度领导力评测', '通过多维度评估您的领导能力，包括决策力、影响力、执行力等', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 20, 'INTERMEDIATE', 8300, 4.9, '["领导力","决策能力","影响力"]', true);

-- 用户帖子（示例）
INSERT INTO `user_posts` (`id`, `title`, `content`, `cover_image`, `tags`, `view_count`, `like_count`, `comment_count`, `is_hot`) VALUES
('post-001', '2024年互联网大厂面试真题汇总', '最新整理的字节、阿里、腾讯等大厂面试题...', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', '["面试技巧","大厂"]', 25600, 1200, 456, true),
('post-002', '从0到1：产品经理成长路径详解', '分享我从初级到高级产品经理的成长经验...', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', '["产品经理","职业规划"]', 18900, 890, 234, true);

-- 大咖分享（示例）
INSERT INTO `expert_posts` (`id`, `expert_name`, `expert_title`, `expert_company`, `title`, `content`, `cover_image`, `tags`, `view_count`, `like_count`, `published_at`) VALUES
('expert-001', '张三', '阿里巴巴P9架构师', '阿里巴巴', '如何在大厂快速晋升', '分享我在阿里10年的晋升经验...', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', '["职业发展","大厂"]', 35000, 2100, NOW()),
('expert-002', '李四', '字节跳动产品总监', '字节跳动', '抖音产品设计背后的思考', '揭秘抖音产品设计的核心逻辑...', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400', '["产品设计","抖音"]', 28000, 1800, NOW());

