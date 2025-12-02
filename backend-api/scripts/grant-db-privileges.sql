-- 授予 Prisma 迁移所需的权限
-- 使用具有管理员权限的账号执行：
--   mysql -h db.ks.qfpek.com -P3306 -u root -p < backend-api/scripts/grant-db-privileges.sql

GRANT ALTER, CREATE, DROP, INDEX, INSERT, UPDATE, DELETE, REFERENCES ON `ai_interview_db`.*
    TO 'ai_interview_db'@'%';
FLUSH PRIVILEGES;
