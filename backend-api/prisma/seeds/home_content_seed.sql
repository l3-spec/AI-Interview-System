-- 初始首页内容数据

INSERT INTO `home_banners` (`id`, `title`, `subtitle`, `description`, `image_url`, `link_type`, `link_id`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('7f07e9f8-8b7d-4b4d-9fa9-2e1c8f4a1aa1', '如何在AI时代提升职场竞争力', '最受欢迎的帖子', '探索人工智能时代下的职业发展新趋势', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600', 'post', NULL, 1, NOW(), NOW()),
  ('caa95863-4e43-4309-9f9f-8f4d7e5b6124', '2025年最具潜力的职业方向', '热门推荐', '大数据分析师、AI工程师等热门岗位解析', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1600', 'post', NULL, 2, NOW(), NOW()),
  ('5d4716e4-54bd-4da7-817f-8f95a8a6654c', '产品经理面试全攻略', '面试技巧', '从简历准备到offer收割的完整指南', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600', 'assessment', NULL, 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `subtitle` = VALUES(`subtitle`),
  `description` = VALUES(`description`),
  `image_url` = VALUES(`image_url`),
  `link_type` = VALUES(`link_type`),
  `link_id` = VALUES(`link_id`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;

INSERT INTO `home_featured_articles` (`id`, `title`, `summary`, `image_url`, `author`, `tags`, `view_count`, `category`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('a4c3f1de-2c6a-4d4a-92b5-3f9386e0c6e1', 'AI时代下的职业转型指南', '探索人工智能时代下的职业升级路径', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400', '未来职场', '["#AI", "#职业转型"]', 729, '未来职场', 1, NOW(), NOW()),
  ('b92502cb-9d75-4a9a-9712-5d9a35b3e22c', '从0到1：产品经理成长路径', '拆解产品经理的核心能力模型与成长路线', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400', '产品老司机', '["#产品经理", "#职业规划"]', 856, '产品成长', 2, NOW(), NOW()),
  ('cad8f1e8-2570-47a0-9234-0d9e74f3168f', '技术面试高频题解析', '覆盖前端、后端、算法的高频面试题详解', 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400', '技术大牛', '["#面试技巧", "#技术"]', 1200, '面试技巧', 3, NOW(), NOW()),
  ('d6d1fb11-5e66-4c0a-8a6c-5126502c8f51', 'HR最看重的简历要点', '从招聘官视角解析高分简历的写法', 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400', 'HR小姐姐', '["#简历", "#求职"]', 945, '求职指南', 4, NOW(), NOW()),
  ('e3a2dd67-28f5-4bb4-84ce-6dce8f348c0f', '职场沟通的艺术', '掌握高效沟通技巧，提升团队协作力', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', '职场达人', '["#沟通", "#软技能"]', 678, '软技能', 5, NOW(), NOW()),
  ('f4d4c67b-70ea-4f8a-b012-98f94a606d19', '5年职业规划实战经验', '如何制定行动计划，实现可持续成长', 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400', '生涯导师', '["#规划", "#成长"]', 892, '职业规划', 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `summary` = VALUES(`summary`),
  `image_url` = VALUES(`image_url`),
  `author` = VALUES(`author`),
  `tags` = VALUES(`tags`),
  `view_count` = VALUES(`view_count`),
  `category` = VALUES(`category`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1,
  `status` = 'PUBLISHED';

-- 测评分类与热门测评
INSERT INTO `assessment_categories` (`id`, `name`, `description`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`)
VALUES
  ('cat-career-soft-001', '职业素养测评', '评估职场沟通、执行力等软实力', 'https://cdn.example.com/icons/softskill.svg', 1, 1, NOW(), NOW()),
  ('cat-career-tech-001', '专业技能测评', '衡量候选人的专业知识与技术能力', 'https://cdn.example.com/icons/techskill.svg', 2, 1, NOW(), NOW()),
  ('cat-career-mgmt-001', '管理潜力测评', '判断管理能力与领导潜质', 'https://cdn.example.com/icons/management.svg', 3, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `icon` = VALUES(`icon`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);

INSERT INTO `assessments` (`id`, `category_id`, `title`, `description`, `cover_image`, `duration_minutes`, `difficulty`, `participant_count`, `rating`, `tags`, `status`, `is_hot`, `created_at`, `updated_at`)
VALUES
  ('assess-softskill-01', 'cat-career-soft-001', '新晋职场人软实力测评', '测评沟通表达、执行力、抗压能力等核心素质', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800', 12, 'BEGINNER', 2356, 4.6, '["沟通","执行力","抗压"]', 'PUBLISHED', 1, NOW(), NOW()),
  ('assess-tech-frontend-01', 'cat-career-tech-001', '前端工程师技能体检', '涵盖JavaScript、工程化、性能优化等核心能力的综合评估', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800', 18, 'INTERMEDIATE', 1894, 4.7, '["JavaScript","前端工程化","性能优化"]', 'PUBLISHED', 1, NOW(), NOW()),
  ('assess-manager-01', 'cat-career-mgmt-001', '项目经理领导力测评', '从组织协调、风险控制、团队管理等维度评估管理潜力', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 20, 'ADVANCED', 1568, 4.5, '["团队管理","风险控制","沟通"]', 'PUBLISHED', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `cover_image` = VALUES(`cover_image`),
  `duration_minutes` = VALUES(`duration_minutes`),
  `difficulty` = VALUES(`difficulty`),
  `participant_count` = VALUES(`participant_count`),
  `rating` = VALUES(`rating`),
  `tags` = VALUES(`tags`),
  `status` = VALUES(`status`),
  `is_hot` = VALUES(`is_hot`);

-- 用户热门分享
INSERT INTO `user_posts` (
  `id`, `title`, `content`, `cover_image`, `images`, `tags`, `view_count`, `like_count`, `comment_count`, `share_count`, `is_hot`, `status`, `created_at`, `updated_at`
)
VALUES
  ('post-frontend-career', '我如何在一年内拿下三家大厂前端offer', '分享个人的刷题、项目和面试准备经验，帮助更多前端同学少走弯路。', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800', '["https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=800"]', '["前端","跳槽","面经"]', 12678, 1834, 245, 362, 1, 'PUBLISHED', NOW() - INTERVAL 6 DAY, NOW()),
  ('post-ai-prompt', 'AI提示工程师的真实工作日常', '记录我作为提示工程师在业务中落地AI的心得、踩坑经历和工具清单。', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800', NULL, '["Prompt","AI应用","经验分享"]', 9823, 1240, 186, 298, 1, 'PUBLISHED', NOW() - INTERVAL 3 DAY, NOW()),
  ('post-ux-growth', '0到1搭建企业设计体系的实践', '总结过去一年在B端产品上搭建设计体系的流程、方法论与团队协作模式。', 'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=800', NULL, '["设计体系","B端产品","团队协作"]', 8640, 956, 142, 203, 1, 'PUBLISHED', NOW() - INTERVAL 1 DAY, NOW())
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `cover_image` = VALUES(`cover_image`),
  `images` = VALUES(`images`),
  `tags` = VALUES(`tags`),
  `view_count` = VALUES(`view_count`),
  `like_count` = VALUES(`like_count`),
  `comment_count` = VALUES(`comment_count`),
  `share_count` = VALUES(`share_count`),
  `is_hot` = VALUES(`is_hot`),
  `status` = VALUES(`status`);

-- 大咖分享
INSERT INTO `expert_posts` (
  `id`, `expert_name`, `expert_title`, `expert_company`, `expert_avatar`, `title`, `content`, `cover_image`, `tags`, `view_count`, `like_count`, `comment_count`, `is_top`, `published_at`, `created_at`, `updated_at`
)
VALUES
  ('expert-product-lin', '林晨', '字节跳动 · 高级产品总监', '字节跳动', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400', '打造跨部门协作的产品中台', '从组织架构、流程机制、数据沉淀三个层面拆解中台建设的关键步骤。', 'https://images.unsplash.com/photo-1584697964190-05b1615ce285?w=800', '["产品中台","组织协同"]', 14230, 2109, 318, 1, NOW() - INTERVAL 12 DAY, NOW(), NOW()),
  ('expert-hr-zhang', '张亦凡', '阿里云 · HRD', '阿里云', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400', '判断候选人潜力的五个信号', '总结多年招聘经验中识别高潜候选人的标志与高频追问。', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800', '["招聘","人才评估"]', 11896, 1750, 265, 0, NOW() - INTERVAL 8 DAY, NOW(), NOW()),
  ('expert-tech-liu', '刘思雨', '谷歌 · 资深工程师', 'Google', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400', '从0到1建设AI平台团队', '分享在大型组织中落地AI平台的人员搭配、技术栈选择与治理实践。', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', '["AI平台","工程管理"]', 13452, 1981, 287, 0, NOW() - INTERVAL 5 DAY, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `expert_name` = VALUES(`expert_name`),
  `expert_title` = VALUES(`expert_title`),
  `expert_company` = VALUES(`expert_company`),
  `expert_avatar` = VALUES(`expert_avatar`),
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `cover_image` = VALUES(`cover_image`),
  `tags` = VALUES(`tags`),
  `view_count` = VALUES(`view_count`),
  `like_count` = VALUES(`like_count`),
  `comment_count` = VALUES(`comment_count`),
  `is_top` = VALUES(`is_top`),
  `published_at` = VALUES(`published_at`);

-- 企业与职位、推广位
INSERT INTO `companies` (`id`, `email`, `password`, `name`, `description`, `industry`, `scale`, `address`, `website`, `logo`, `contact`, `isVerified`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('comp-ai-career-lab', 'hr@careerlab.cn', '$2a$10$MockHashedPassCareer', 'CareerLab 科技', '专注于AI招聘与智能面试的创新企业', 'AI/互联网', '201-500', '上海市浦东新区张江高科路88号', 'https://careerlab.cn', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400', '400-800-1888', 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `email` = VALUES(`email`),
  `password` = VALUES(`password`),
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `industry` = VALUES(`industry`),
  `scale` = VALUES(`scale`),
  `address` = VALUES(`address`),
  `website` = VALUES(`website`),
  `logo` = VALUES(`logo`),
  `contact` = VALUES(`contact`),
  `isVerified` = VALUES(`isVerified`),
  `isActive` = VALUES(`isActive`),
  `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `jobs` (
  `id`, `title`, `description`, `requirements`, `salary`, `location`, `responsibilities`, `level`, `skills`, `benefits`, `type`, `status`, `isPublished`, `companyId`, `createdAt`, `updatedAt`
)
VALUES
  ('job-ai-platform-lead', 'AI平台产品经理', '负责AI平台的规划、落地与跨部门协同，打造支撑业务的智能能力。', '5年以上产品经验，深入理解AI技术与平台架构，熟悉跨部门项目推进。', '35K-45K CNY', '上海', '牵头平台规划，协调研发、算法、运营团队推进项目。', 'SENIOR', '["AI平台","产品规划","跨部门协作"]', '年度体检, 股票期权, 弹性办公', 'FULL_TIME', 'ACTIVE', 1, 'comp-ai-career-lab', NOW() - INTERVAL 15 DAY, NOW()),
  ('job-frontend-architect', '资深前端架构师', '构建大型Web应用的前端架构，带领团队优化性能与工程效率。', '7年以上前端经验，熟悉React体系及工程化、Node.js。', '40K-50K CNY', '杭州', '负责前端架构设计、关键技术攻关与团队培养。', 'SENIOR', '["React","工程化","Node.js"]', '技术成长计划, 海外交流机会', 'FULL_TIME', 'ACTIVE', 1, 'comp-ai-career-lab', NOW() - INTERVAL 20 DAY, NOW())
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `requirements` = VALUES(`requirements`),
  `salary` = VALUES(`salary`),
  `location` = VALUES(`location`),
  `responsibilities` = VALUES(`responsibilities`),
  `level` = VALUES(`level`),
  `skills` = VALUES(`skills`),
  `benefits` = VALUES(`benefits`),
  `type` = VALUES(`type`),
  `status` = VALUES(`status`),
  `isPublished` = VALUES(`isPublished`),
  `companyId` = VALUES(`companyId`),
  `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `promoted_jobs` (
  `id`, `job_id`, `promotion_type`, `display_frequency`, `priority`, `start_date`, `end_date`, `is_active`, `impression_count`, `click_count`, `created_at`, `updated_at`
)
VALUES
  ('promo-ai-platform-2024', 'job-ai-platform-lead', 'FEATURED', 8, 5, NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 30 DAY, 1, 2350, 340, NOW(), NOW()),
  ('promo-fe-architect-2024', 'job-frontend-architect', 'PREMIUM', 10, 4, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 25 DAY, 1, 1890, 280, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `promotion_type` = VALUES(`promotion_type`),
  `display_frequency` = VALUES(`display_frequency`),
  `priority` = VALUES(`priority`),
  `start_date` = VALUES(`start_date`),
  `end_date` = VALUES(`end_date`),
  `is_active` = VALUES(`is_active`),
  `impression_count` = VALUES(`impression_count`),
  `click_count` = VALUES(`click_count`);
