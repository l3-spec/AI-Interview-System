-- Mock interview dataset schema and seed data
-- Run this script against the backend-api database to materialize the
-- interview dashboard sample records.

-- =========================================
-- Table definitions
-- =========================================

CREATE TABLE IF NOT EXISTS `mock_candidates` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `avatar` VARCHAR(255) NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `age` INT NULL,
  `gender` VARCHAR(16) NULL,
  `education` VARCHAR(50) NULL,
  `major` VARCHAR(120) NULL,
  `experience` INT NULL,
  `skills` TEXT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mock_jobs` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `department` VARCHAR(80) NULL,
  `location` VARCHAR(120) NULL,
  `work_type` VARCHAR(40) NULL,
  `level` VARCHAR(40) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mock_interviews` (
  `id` VARCHAR(36) NOT NULL,
  `candidate_id` VARCHAR(36) NOT NULL,
  `job_id` VARCHAR(36) NOT NULL,
  `job_title` VARCHAR(150) NOT NULL,
  `department` VARCHAR(80) NULL,
  `status` VARCHAR(20) NOT NULL,
  `result` VARCHAR(20) NOT NULL,
  `interview_date` DATETIME NULL,
  `duration` INT NOT NULL DEFAULT 0,
  `video_url` VARCHAR(255) NULL,
  `score` DECIMAL(4,1) NOT NULL DEFAULT 0.0,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mock_interviews_candidate` (`candidate_id`),
  INDEX `idx_mock_interviews_job` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mock_interview_assessments` (
  `id` VARCHAR(48) NOT NULL,
  `interview_id` VARCHAR(36) NOT NULL,
  `technical_skills` DECIMAL(4,1) NOT NULL,
  `communication` DECIMAL(4,1) NOT NULL,
  `problem_solving` DECIMAL(4,1) NOT NULL,
  `teamwork` DECIMAL(4,1) NOT NULL,
  `leadership` DECIMAL(4,1) NOT NULL,
  `creativity` DECIMAL(4,1) NOT NULL,
  `adaptability` DECIMAL(4,1) NOT NULL,
  `overall_score` DECIMAL(4,1) NOT NULL,
  `feedback` TEXT NULL,
  `strengths` TEXT NULL,
  `improvements` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mock_assessment_interview` (`interview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mock_interview_questions` (
  `id` VARCHAR(48) NOT NULL,
  `interview_id` VARCHAR(36) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `question` TEXT NOT NULL,
  `answer` LONGTEXT NULL,
  `score` DECIMAL(4,1) NULL,
  `feedback` TEXT NULL,
  `duration` INT NULL,
  `category` VARCHAR(20) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mock_questions_interview` (`interview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- Seed data
-- =========================================

DELETE FROM `mock_interview_questions`;
DELETE FROM `mock_interview_assessments`;
DELETE FROM `mock_interviews`;
DELETE FROM `mock_jobs`;
DELETE FROM `mock_candidates`;

INSERT INTO `mock_candidates` (`id`, `name`, `avatar`, `email`, `phone`, `age`, `gender`, `education`, `major`, `experience`, `skills`, `created_at`) VALUES
('1', 'Henry Zhang', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry', 'henry.zhang@email.com', '138-0000-1234', 28, 'male', '本科', '计算机科学与技术', 5, '["React","JavaScript","TypeScript","Node.js","Python"]', '2024-01-15 10:00:00'),
('2', 'Sarah Li', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 'sarah.li@email.com', '138-0000-5678', 26, 'female', '硕士', '软件工程', 3, '["Vue.js","Java","Spring Boot","MySQL","Redis"]', '2024-01-16 14:30:00'),
('3', 'Mike Wang', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', 'mike.wang@email.com', '138-0000-9012', 30, 'male', '本科', '信息管理与信息系统', 7, '["Angular","C#",".NET Core","SQL Server","Azure"]', '2024-01-17 09:15:00'),
('4', 'Lisa Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa', 'lisa.chen@email.com', '138-0000-3456', 24, 'female', '本科', '数据科学', 1, '["Python","Machine Learning","TensorFlow","Pandas","SQL"]', '2024-01-18 16:45:00'),
('5', 'David Zhou', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 'david.zhou@email.com', '138-0000-7890', 32, 'male', '硕士', '计算机应用技术', 8, '["Go","Kubernetes","Docker","AWS","DevOps"]', '2024-01-19 11:20:00'),
('6', 'Amy Wu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy', 'amy.wu@email.com', '138-0000-2468', 27, 'female', '硕士', '人机交互设计', 4, '["UI设计","Figma","Sketch","用户研究","Prototyping"]', '2024-01-20 13:30:00'),
('7', 'Tom Liu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom', 'tom.liu@email.com', '138-0000-1357', 29, 'male', '本科', '市场营销', 6, '["数字营销","SEM","SEO","数据分析","内容策划"]', '2024-01-21 08:45:00'),
('8', 'Jenny Yang', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jenny', 'jenny.yang@email.com', '138-0000-9753', 25, 'female', '本科', '产品设计', 2, '["产品设计","Axure","需求分析","用户体验","Agile"]', '2024-01-22 15:20:00');

INSERT INTO `mock_jobs` (`id`, `title`, `department`, `location`, `work_type`, `level`) VALUES
('job-1', '前端开发工程师', '技术部', '上海', '全职', '中级'),
('job-2', '后端开发工程师', '技术部', '上海', '全职', '中级'),
('job-3', '全栈开发工程师', '技术部', '上海', '全职', '高级'),
('job-4', '数据分析师', '产品部', '深圳', '全职', '初级'),
('job-5', 'DevOps工程师', '技术部', '北京', '全职', '高级'),
('job-6', 'UI/UX设计师', '设计部', '杭州', '全职', '高级'),
('job-7', '数字营销专员', '市场部', '广州', '全职', '中级'),
('job-8', '产品经理', '产品部', '上海', '全职', '中级');

INSERT INTO `mock_interviews` (`id`, `candidate_id`, `job_id`, `job_title`, `department`, `status`, `result`, `interview_date`, `duration`, `video_url`, `score`, `created_at`, `updated_at`) VALUES
('1', '1', 'job-1', '前端开发工程师', '技术部', 'completed', 'passed', '2024-01-20 10:00:00', 45, 'https://example.com/video1.mp4', 8.5, '2024-01-15 10:00:00', '2024-01-20 11:00:00'),
('2', '2', 'job-2', '后端开发工程师', '技术部', 'completed', 'passed', '2024-01-21 14:00:00', 50, 'https://example.com/video2.mp4', 7.8, '2024-01-16 14:30:00', '2024-01-21 15:00:00'),
('3', '3', 'job-3', '全栈开发工程师', '技术部', 'completed', 'reviewing', '2024-01-22 09:00:00', 60, NULL, 6.5, '2024-01-17 09:15:00', '2024-01-22 10:30:00'),
('4', '4', 'job-4', '数据分析师', '产品部', 'scheduled', 'pending', '2024-01-25 15:00:00', 0, NULL, 0.0, '2024-01-18 16:45:00', '2024-01-18 16:45:00'),
('5', '5', 'job-5', 'DevOps工程师', '技术部', 'pending', 'pending', '2024-01-26 11:00:00', 0, NULL, 0.0, '2024-01-19 11:20:00', '2024-01-19 11:20:00'),
('6', '6', 'job-6', 'UI/UX设计师', '设计部', 'completed', 'passed', '2024-01-23 16:00:00', 40, 'https://example.com/video6.mp4', 9.2, '2024-01-20 13:30:00', '2024-01-23 17:00:00'),
('7', '7', 'job-7', '数字营销专员', '市场部', 'completed', 'failed', '2024-01-24 10:30:00', 35, NULL, 7.2, '2024-01-21 08:45:00', '2024-01-24 11:30:00'),
('8', '8', 'job-8', '产品经理', '产品部', 'scheduled', 'pending', '2024-01-27 14:00:00', 0, NULL, 0.0, '2024-01-22 15:20:00', '2024-01-22 15:20:00');

INSERT INTO `mock_interview_assessments` (`id`, `interview_id`, `technical_skills`, `communication`, `problem_solving`, `teamwork`, `leadership`, `creativity`, `adaptability`, `overall_score`, `feedback`, `strengths`, `improvements`) VALUES
('assessment-1', '1', 9.0, 8.5, 8.8, 8.2, 7.5, 8.0, 8.3, 8.5,
 'Henry在技术能力方面表现出色，特别是在React和TypeScript的使用上非常熟练。沟通能力强，能够清晰表达技术观点。问题解决能力突出，在面试中的算法题目完成得很好。团队协作意识强，有一定的领导潜力。',
 '["技术功底扎实，React技术栈精通","沟通表达能力强，逻辑清晰","学习能力强，对新技术有敏锐的嗅觉","有良好的编程习惯和代码规范意识"]',
 '["可以加强对系统架构设计的理解","项目管理经验有待提升","可以多参与开源项目提升影响力"]'),
('assessment-2', '2', 8.2, 7.8, 8.0, 8.5, 7.0, 7.5, 8.0, 7.8,
 'Sarah的Java技术栈很扎实，Spring Boot框架使用熟练。在数据库设计和优化方面有一定经验。团队协作能力强，有良好的沟通技巧。',
 '["Java后端技术扎实","数据库设计和优化经验丰富","团队协作能力强","工作态度认真负责"]',
 '["可以学习更多微服务架构知识","前端技术栈可以补强","英语口语能力有待提升"]'),
('assessment-3', '3', 7.0, 6.8, 6.5, 7.2, 6.0, 6.8, 6.5, 6.5,
 'Mike有丰富的工作经验，对.NET技术栈比较熟悉。但在面试中表现不够突出，一些技术细节回答不够深入。',
 '["工作经验丰富",".NET技术栈熟练","项目经验多样化"]',
 '["需要加强对新技术的学习","沟通表达能力有待提升","代码质量意识需要加强"]'),
('assessment-6', '6', 8.8, 9.0, 9.2, 9.5, 8.5, 9.8, 9.0, 9.2,
 'Amy在设计能力方面表现非常优秀，对用户体验有深刻理解。创意思维突出，能够提出创新的设计解决方案。沟通能力强，能够很好地阐述设计理念。',
 '["设计能力出众，作品质量高","用户体验理解深刻","创意思维活跃，解决方案创新","跨团队协作能力强"]',
 '["可以加强前端开发技能","数据分析能力有待提升","项目管理经验需要积累"]'),
('assessment-7', '7', 6.5, 7.8, 6.8, 7.5, 7.2, 7.8, 7.0, 7.2,
 'Tom在市场营销方面有一定经验，但在数字化营销和数据分析方面还需要加强。沟通能力不错，有一定的团队管理经验。',
 '["营销推广经验丰富","客户沟通能力强","市场敏感度高"]',
 '["数字化营销技能需要提升","数据分析能力有待加强","创新营销策略思考不够"]');

INSERT INTO `mock_interview_questions` (`id`, `interview_id`, `order_index`, `question`, `answer`, `score`, `feedback`, `duration`, `category`) VALUES
('qa-1-1', '1', 1, '请介绍一下React的生命周期方法，以及在函数组件中如何实现类似的功能？', 'React类组件有三个主要阶段的生命周期：挂载、更新和卸载。主要方法包括componentDidMount、componentDidUpdate、componentWillUnmount等。在函数组件中，我们使用useEffect Hook来模拟这些生命周期。useEffect可以通过不同的依赖数组来控制执行时机...', 9.0, '回答非常完整，对React生命周期理解深刻，并且能够很好地对比类组件和函数组件的区别。', 180, 'technical'),
('qa-1-2', '1', 2, '如何处理一个性能瓶颈问题？请描述你的分析和解决过程。', '首先我会使用开发者工具进行性能分析，识别瓶颈所在。然后根据具体情况采用不同的优化策略，比如代码分割、懒加载、缓存优化、图片压缩等。对于React应用，还会考虑使用React.memo、useMemo、useCallback等优化手段...', 8.0, '分析思路清晰，提到了多种优化方法，实际经验丰富。', 240, 'technical'),
('qa-1-3', '1', 3, '描述一次你遇到的最具挑战性的项目经历。', '在上一个项目中，我们需要在紧急情况下重构整个前端架构。当时系统性能问题严重，用户体验很差。我主导了技术选型，选择了React+TypeScript的技术栈，并设计了组件库和状态管理方案。通过团队协作，我们在一个月内完成了重构...', 8.0, '项目经验丰富，能够在压力下保持冷静并找到解决方案。领导能力有所体现。', 300, 'behavioral'),
('qa-2-1', '2', 1, '请解释一下Spring Boot的自动配置原理。', 'Spring Boot的自动配置基于@EnableAutoConfiguration注解和spring.factories文件。当应用启动时，Spring Boot会扫描classpath下的所有spring.factories文件，加载其中定义的自动配置类。这些配置类通过@ConditionalOn*注解来判断是否需要生效...', 8.0, '对Spring Boot自动配置原理理解正确，能够说出关键组件和流程。', 200, 'technical'),
('qa-2-2', '2', 2, '如何设计一个高并发的数据库架构？', '高并发数据库架构需要考虑多个方面：首先是读写分离，通过主从复制来分担读压力；其次是分库分表，水平拆分数据；还要考虑缓存策略，使用Redis等缓存热点数据；连接池优化也很重要...', 7.0, '对高并发架构有基本理解，但在具体实现细节上还可以更深入。', 220, 'technical');

